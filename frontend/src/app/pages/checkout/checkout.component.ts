import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CheckoutService } from '../../core/services/checkout.service';
import { CartService } from '../../core/services/cart.service';

import { ShippingStepComponent } from './shipping-step/shipping-step.component';
import { PaymentStepComponent } from './payment-step/payment-step.component';
import { StripePaymentStepComponent } from './stripe-payment-step/stripe-payment-step.component';
import { PaypalPaymentStepComponent } from './paypal-payment-step/paypal-payment-step.component';
import { CodPaymentStepComponent } from './cod-payment-step/cod-payment-step.component';
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
    PaypalPaymentStepComponent,
    CodPaymentStepComponent,
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
  selectedGateway: string | null = null;

  ngOnInit() {
    this.checkout.reset();

    if (this.cart.items().length > 0) {
      this.checkout.updateState({ orderTotal: this.cart.total() });
    } else {
      this.router.navigate(['/cart']);
      return;
    }

    this.checkout.state$.subscribe(state => {
      this.currentStep = state.step;
      this.selectedGateway = state.selectedGateway;
    });
  }

  // Derived state for the progress bar (0-indexed)
  get stepIndex(): number {
    return this.currentStep - 1;
  }
}
