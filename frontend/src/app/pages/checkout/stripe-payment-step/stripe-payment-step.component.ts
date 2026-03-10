import { Component, OnInit, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../../core/services/checkout.service';
import { CartService } from '../../../core/services/cart.service';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-stripe-payment-step',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzSpinModule],
  templateUrl: './stripe-payment-step.component.html',
  styleUrl: './stripe-payment-step.component.scss'
})
export class StripePaymentStepComponent implements OnInit, AfterViewInit {
  checkout = inject(CheckoutService);
  cart = inject(CartService);
  private message = inject(NzMessageService);

  @ViewChild('paymentElement') paymentElementRef!: ElementRef;

  loading = true;
  processing = false;
  error = '';

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  paymentElement: StripePaymentElement | null = null;

  async ngOnInit() {
    try {
      // 1. Get enabled gateways to fetch Stripe public key
      const gateways: any[] = await this.checkout.getEnabledGateways().toPromise() as any;
      const stripeConfig = gateways.find(g => g.gateway === 'stripe');

      if (!stripeConfig || !stripeConfig.publicKey) {
        throw new Error('Stripe is not securely configured. Missing public key.');
      }

      // 2. Load Stripe.js
      this.stripe = await loadStripe(stripeConfig.publicKey);
      if (!this.stripe) throw new Error('Failed to load Stripe SDK');

      // 3. Create the Order on the backend to get an Order ID
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
        paymentMethod: state.selectedGateway
      };

      const order = await this.checkout.createOrder(orderPayload).toPromise();
      this.checkout.updateState({ orderId: order._id });

      // 4. Create Stripe Payment Intent on Backend using Order ID
      const intentRes = await this.checkout.createStripeIntent(order._id).toPromise();
      const clientSecret = intentRes?.clientSecret;

      if (!clientSecret) throw new Error('Failed to create payment intent');
      this.checkout.updateState({ clientSecret });

      // 5. Initialize Elements with the client secret
      this.elements = this.stripe.elements({ clientSecret, appearance: { theme: 'stripe' } });
      this.paymentElement = this.elements.create('payment', { layout: 'tabs' });

      // Wait for DOM
      setTimeout(() => {
        if (this.paymentElementRef) {
          this.paymentElement?.mount(this.paymentElementRef.nativeElement);
          this.loading = false;
        }
      }, 0);

    } catch (e: any) {
      console.error('Stripe Init Error', e);
      this.error = e.message || 'An error occurred while initializing payment.';
      this.loading = false;
      this.message.error(this.error);
    }
  }

  ngAfterViewInit() {
    // Handled in setTimeout above to ensure DOM is ready
  }

  goBack() {
    this.checkout.updateState({ step: 2 });
  }

  async payNow() {
    if (!this.stripe || !this.elements || !this.paymentElement) return;

    this.processing = true;
    this.error = '';

    // Let Stripe confirm the payment using the Elements UI
    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: window.location.origin + '/checkout?completed=true', // not strictly needed since we prevent default redirect
      },
      redirect: 'if_required',
    });

    if (error) {
      this.processing = false;
      this.error = error.message || 'Payment failed.';
      this.message.error(this.error);
    } else {
      // Payment succeeded!
      this.message.success('Payment successful!');
      this.processing = false;
      this.cart.clear();
      this.checkout.updateState({ step: 4 });
    }
  }
}
