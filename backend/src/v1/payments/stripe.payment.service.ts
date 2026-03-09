import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import Stripe from 'stripe';

import { PaymentGatewayConfigsService } from '../payment-gateway-configs/payment-gateway-configs.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class StripePaymentService {
    private readonly logger = new Logger(StripePaymentService.name);

    constructor(
        private readonly gatewayConfigsService: PaymentGatewayConfigsService,
        private readonly ordersService: OrdersService,
    ) { }

    /** Get an initialised Stripe client using the decrypted secretKey from DB. */
    private async getClient(): Promise<Stripe> {
        const config = await this.gatewayConfigsService.findOneDecrypted('stripe');
        if (!config.enabled) {
            throw new BadRequestException('Stripe payment gateway is currently disabled');
        }
        const secretKey = config.credentials['secretKey'];
        if (!secretKey) {
            throw new BadRequestException('Stripe secret key is not configured');
        }
        return new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
    }

    /**
     * Create a Stripe PaymentIntent.
     * @param amountCents  Amount in smallest currency unit (e.g. cents for USD)
     * @param currency     e.g. 'usd'
     * @param orderId      Our internal order ID; stored as PaymentIntent metadata
     * @param userId       Our user ID; stored as PaymentIntent metadata
     */
    async createPaymentIntent(
        amountCents: number,
        currency: string,
        orderId: string,
        userId: string,
    ): Promise<{ clientSecret: string; paymentIntentId: string }> {
        const stripe = await this.getClient();

        const intent = await stripe.paymentIntents.create({
            amount: amountCents,
            currency,
            metadata: { orderId, userId },
            automatic_payment_methods: { enabled: true },
        });

        return { clientSecret: intent.client_secret!, paymentIntentId: intent.id };
    }

    /**
     * Handle a raw Stripe webhook event.
     *
     * 1. Verifies the signature with the webhook secret.
     * 2. Checks that Stripe is still enabled in DB before doing anything.
     * 3. On `payment_intent.succeeded` → marks order as 'paid' and records transaction.
     * 4. On `payment_intent.payment_failed` → marks order as 'failed' and records transaction.
     */
    async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
        // Step 1: fetch config and verify gateway is enabled
        let secretKey: string;
        let webhookSecret: string;
        try {
            const config = await this.gatewayConfigsService.findOneDecrypted('stripe');
            if (!config.enabled) {
                this.logger.log('Stripe webhook received but gateway is disabled. Ignoring.');
                return; // Acknowledge to Stripe but take no action
            }
            secretKey = config.credentials['secretKey'];
            webhookSecret = config.credentials['webhookSecret'];

            if (!secretKey) {
                this.logger.warn('Stripe secret key is not configured — cannot verify webhook.');
                throw new BadRequestException('Stripe secret key is not configured');
            }
            if (!webhookSecret) {
                this.logger.warn('Stripe webhook secret is not configured — cannot verify webhook.');
                throw new BadRequestException('Stripe webhook secret is not configured');
            }
        } catch (err: unknown) {
            this.logger.warn(`Could not verify Stripe gateway status or key: ${err instanceof Error ? err.message : 'Unknown error'}`);
            return;
        }

        // Step 2: verify signature
        let event: Stripe.Event;
        try {
            // Use original secret key for verification
            const stripe = new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            this.logger.warn(`Webhook signature verification failed: ${msg}`);
            throw new BadRequestException(`Webhook signature mismatch: ${msg}`);
        }

        // Step 3: handle events
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const intent = event.data.object as Stripe.PaymentIntent;
                const orderId = intent.metadata?.orderId;
                const userId = intent.metadata?.userId;
                if (!orderId || !userId) {
                    this.logger.warn(`PaymentIntent ${intent.id} missing orderId/userId metadata`);
                    return;
                }
                await this.ordersService.updateStatus(orderId, 'paid');
                await this.ordersService.recordTransaction({
                    orderId,
                    userId,
                    gateway: 'stripe',
                    gatewayTxId: intent.id,
                    status: 'succeeded',
                    amount: intent.amount,
                    currency: intent.currency,
                    metadata: intent as unknown as Record<string, unknown>,
                });
                this.logger.log(`Order ${orderId} marked as PAID via Stripe (${intent.id})`);
                break;
            }

            case 'payment_intent.payment_failed': {
                const intent = event.data.object as Stripe.PaymentIntent;
                const orderId = intent.metadata?.orderId;
                const userId = intent.metadata?.userId;
                if (!orderId || !userId) return;
                await this.ordersService.updateStatus(orderId, 'failed');
                await this.ordersService.recordTransaction({
                    orderId,
                    userId,
                    gateway: 'stripe',
                    gatewayTxId: intent.id,
                    status: 'failed',
                    amount: intent.amount,
                    currency: intent.currency,
                    metadata: { failureMessage: intent.last_payment_error?.message },
                });
                this.logger.log(`Order ${orderId} marked as FAILED via Stripe (${intent.id})`);
                break;
            }

            default:
                this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
        }
    }
}
