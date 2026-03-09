import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CheckoutService } from '../../core/services/checkout.service';
import { CartService } from '../../core/services/cart.service';

import { ShippingStepComponent } from './shipping-step/shipping-step.component';
import { PaymentStepComponent } from './payment-step/payment-step.component';
import { StripePaymentStepComponent } from './stripe-payment-step/stripe-payment-step.component';
import { ConfirmationStepComponent } from './confirmation-step/confirmation-step.component';

import { NzStepsModule } from 'ng-zorro-antd/steps';
import { Router } from '@angular/router';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    NzStepsModule,
    ShippingStepComponent,
    PaymentStepComponent,
    StripePaymentStepComponent,
    ConfirmationStepComponent
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit {
  checkout = inject(CheckoutService);
  cart = inject(CartService);
  private router = inject(Router);

  currentStep = 1;

  ngOnInit() {
    this.checkout.reset();

    // Auto-calculate order total based on cart items
    if (this.cart.items().length > 0) {
      this.checkout.updateState({ orderTotal: this.cart.total() });
    } else {
      // If cart is empty, redirect back to cart or products
      this.router.navigate(['/cart']);
      return;
    }

    this.checkout.state$.subscribe(state => {
      this.currentStep = state.step;
    });
  }

  // Derived state for the progress bar (0-indexed)
  get stepIndex(): number {
    return this.currentStep - 1;
  }
}
