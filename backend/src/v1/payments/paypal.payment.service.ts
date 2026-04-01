import { Injectable, BadRequestException, Logger } from '@nestjs/common';

import { PaymentGatewayConfigsService } from '../payment-gateway-configs/payment-gateway-configs.service';
import { OrdersService } from '../orders/orders.service';

interface PayPalConfig {
    clientId: string;
    clientSecret: string;
    mode: 'sandbox' | 'live';
    baseUrl: string;
}

@Injectable()
export class PaypalPaymentService {
    private readonly logger = new Logger(PaypalPaymentService.name);

    constructor(
        private readonly gatewayConfigsService: PaymentGatewayConfigsService,
        private readonly ordersService: OrdersService,
    ) { }

    /** Fetch decrypted credentials and resolve the correct PayPal API base URL. */
    private async getConfig(): Promise<PayPalConfig> {
        const config = await this.gatewayConfigsService.findOneDecrypted('paypal');
        if (!config.enabled) throw new BadRequestException('PayPal payment gateway is currently disabled');

        const clientId = config.credentials['clientId'];
        const clientSecret = config.credentials['clientSecret'];
        const mode = (config.credentials['mode'] || 'sandbox') as 'sandbox' | 'live';

        if (!clientId || !clientSecret) throw new BadRequestException('PayPal credentials are not configured');

        const baseUrl = mode === 'live'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';

        return { clientId, clientSecret, mode, baseUrl };
    }

    /** Exchange client credentials for a short-lived OAuth2 bearer token. */
    private async getAccessToken(): Promise<{ token: string; baseUrl: string }> {
        const { clientId, clientSecret, baseUrl } = await this.getConfig();
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!res.ok) {
            const err = await res.text();
            throw new BadRequestException(`Failed to get PayPal access token: ${err}`);
        }

        const data = await res.json() as { access_token: string };
        return { token: data.access_token, baseUrl };
    }

    /**
     * Create a PayPal order (intent: CAPTURE).
     * Returns the PayPal order ID and the approval URL to redirect/open the PayPal popup.
     */
    async createOrder(
        amount: number,
        currency: string,
        internalOrderId: string,
    ): Promise<{ paypalOrderId: string }> {
        const { token, baseUrl } = await this.getAccessToken();
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4300';

        const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: currency.toUpperCase(),
                        value: amount.toFixed(2),
                    },
                    custom_id: internalOrderId,
                    description: `Order ${internalOrderId}`,
                }],
                application_context: {
                    return_url: `${frontendUrl}/checkout`,
                    cancel_url: `${frontendUrl}/checkout`,
                    brand_name: 'Haircare Market',
                    user_action: 'PAY_NOW',
                    shipping_preference: 'NO_SHIPPING',
                },
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new BadRequestException(`Failed to create PayPal order: ${err}`);
        }

        const data = await res.json() as { id: string };
        return { paypalOrderId: data.id };
    }

    /**
     * Capture an approved PayPal order.
     * Updates our internal order status and records the transaction.
     */
    async captureOrder(
        paypalOrderId: string,
        internalOrderId: string,
        userId: string,
    ): Promise<void> {
        const { token, baseUrl } = await this.getAccessToken();

        const res = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await res.json() as any;

        if (!res.ok || data.status !== 'COMPLETED') {
            this.logger.error(`PayPal capture failed for ${paypalOrderId}: ${JSON.stringify(data)}`);
            await this.ordersService.updateStatus(internalOrderId, 'failed');
            await this.ordersService.recordTransaction({
                orderId: internalOrderId,
                userId,
                gateway: 'paypal',
                gatewayTxId: paypalOrderId,
                status: 'failed',
                amount: 0,
                currency: 'usd',
                metadata: { error: data },
            });
            throw new BadRequestException('PayPal capture failed or order not completed');
        }

        const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
        const capturedAmount = parseFloat(capture?.amount?.value || '0');
        const capturedCurrency = (capture?.amount?.currency_code || 'USD').toLowerCase();

        await this.ordersService.updateStatus(internalOrderId, 'paid');
        await this.ordersService.recordTransaction({
            orderId: internalOrderId,
            userId,
            gateway: 'paypal',
            gatewayTxId: capture?.id || paypalOrderId,
            status: 'succeeded',
            amount: Math.round(capturedAmount * 100),
            currency: capturedCurrency,
            metadata: data as unknown as Record<string, unknown>,
        });

        this.logger.log(`Order ${internalOrderId} marked as PAID via PayPal (capture: ${capture?.id})`);
    }

    /**
     * Mark an order as failed when the PayPal JS SDK itself errors (before or during approval).
     * Uses an atomic conditional update so a concurrent successful capture cannot be
     * overwritten — if the order is no longer 'pending' the update is a no-op.
     */
    async recordSdkFailure(internalOrderId: string, userId: string): Promise<void> {
        const updated = await this.ordersService.updateStatusIfPending(internalOrderId, 'failed');
        if (!updated) {
            this.logger.log(
                `Order ${internalOrderId} — skipped SDK failure mark (status already transitioned)`,
            );
            return;
        }
        await this.ordersService.recordTransaction({
            orderId: internalOrderId,
            userId,
            gateway: 'paypal',
            gatewayTxId: `sdk-error-${internalOrderId}`,
            status: 'failed',
            amount: 0,
            currency: 'usd',
            metadata: { reason: 'PayPal JS SDK error before capture' },
        });
        this.logger.warn(`Order ${internalOrderId} marked as FAILED due to PayPal SDK error`);
    }
}
