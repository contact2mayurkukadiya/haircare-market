import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CheckoutService } from '../../../core/services/checkout.service';
import { CartService } from '../../../core/services/cart.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';

declare const paypal: any;

@Component({
  selector: 'app-paypal-payment-step',
  standalone: true,
  imports: [CommonModule, NzSpinModule, NzButtonModule],
  templateUrl: './paypal-payment-step.component.html',
  styleUrl: './paypal-payment-step.component.scss'
})
export class PaypalPaymentStepComponent implements OnInit, OnDestroy {
  checkout = inject(CheckoutService);
  cart = inject(CartService);
  private message = inject(NzMessageService);

  loading = true;
  capturing = false;
  paymentFailed = false;
  error = '';
  private sdkScript: HTMLScriptElement | null = null;

  async ngOnInit() {
    try {
      // 1. Get enabled gateways to get the PayPal clientId
      const gateways: any[] = await this.checkout.getEnabledGateways().toPromise() as any[];
      const paypalConfig = gateways.find(g => g.gateway === 'paypal');

      if (!paypalConfig?.clientId) {
        throw new Error('PayPal is not configured. Missing client ID.');
      }

      // 2. Create the internal order on the backend
      const state = this.checkout.state$.value;
      const orderPayload = {
        items: this.cart.items().map(i => ({
          productId: i.product._id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          image: i.product.images?.[0]
            ? i.product.images[0].split('/').pop()
            : undefined
        })),
        shippingAddress: state.shippingAddress,
        paymentMethod: 'paypal'
      };

      const order = await this.checkout.createOrder(orderPayload).toPromise();
      this.checkout.updateState({ orderId: order._id });

      // 3. Load PayPal JS SDK dynamically
      await this.loadPayPalSdk(paypalConfig.clientId);

      // 4. Render PayPal Buttons
      this.renderButtons(order._id);

    } catch (e: any) {
      console.error('PayPal Init Error', e);
      this.error = e.message || 'An error occurred while initializing PayPal.';
      this.loading = false;
      this.message.error(this.error);
    }
  }

  private loadPayPalSdk(clientId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof paypal !== 'undefined') {
        resolve();
        return;
      }

      this.sdkScript = document.createElement('script');
      this.sdkScript.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
      this.sdkScript.onload = () => resolve();
      this.sdkScript.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(this.sdkScript);
    });
  }

  private renderButtons(orderId: string) {
    this.loading = false;

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'pay',
        height: 45,
      },

      /**
       * Called each time the PayPal button is clicked.
       * Creates a fresh PayPal order on our backend, returns the PayPal order ID to the SDK.
       */
      createOrder: async () => {
        const res = await this.checkout.createPayPalOrder(orderId).toPromise();
        return res!.paypalOrderId;
      },

      /**
       * Called after the user approves the payment in the PayPal popup.
       * Captures the payment on our backend — which updates order status to 'paid'
       * and records the transaction in the transactions collection.
       */
      onApprove: async (data: { orderID: string }) => {
        this.capturing = true;
        this.error = '';
        try {
          await this.checkout.capturePayPalOrder(data.orderID, orderId).toPromise();
          // Backend: order.status → 'paid', transaction recorded with status 'succeeded'
          this.message.success('Payment successful!');
          this.cart.clear();
          this.checkout.updateState({ step: 4 });
        } catch (e: any) {
          // Backend already marked order.status → 'failed' and recorded a failed transaction
          this.capturing = false;
          this.paymentFailed = true;
          this.error = e?.error?.message || 'Payment capture failed. Please try a different payment method.';
          this.message.error(this.error);
        }
      },

      /**
       * Called when the PayPal JS SDK itself encounters an unrecoverable error
       * (e.g. network failure, popup blocked, SDK misconfiguration).
       * We notify our backend so the order is marked 'failed' and a failed
       * transaction is recorded — keeping the DB in sync.
       */
      onError: async (err: any) => {
        console.error('PayPal SDK error', err);
        this.paymentFailed = true;
        this.error = 'PayPal encountered an error. Please try a different payment method.';
        this.message.error(this.error);

        // Sync order status & transaction to DB
        try {
          await this.checkout.failPayPalOrder(orderId).toPromise();
          // Backend: order.status → 'failed', transaction recorded with status 'failed'
        } catch {
          // Silent — DB sync failure should not block the UI error display
        }
      },

      /**
       * Called when the user closes the PayPal popup without paying.
       * The internal order stays 'pending' so the user can click the button again
       * and retry without losing their order.
       */
      onCancel: () => {
        this.message.warning('Payment cancelled. You can try again or choose another method.');
      },
    }).render('#paypal-button-container');
  }

  tryAnotherMethod() {
    this.checkout.updateState({ step: 2 });
  }

  goBack() {
    this.checkout.updateState({ step: 2 });
  }

  ngOnDestroy() {
    if (this.sdkScript) {
      this.sdkScript.remove();
    }
  }
}
