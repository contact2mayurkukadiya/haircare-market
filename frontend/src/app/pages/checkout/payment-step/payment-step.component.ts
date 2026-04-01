import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../../core/services/checkout.service';

import { NzRadioModule } from 'ng-zorro-antd/radio';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';

interface Gateway {
  gateway: string;
  enabled: boolean;
}

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [CommonModule, FormsModule, NzRadioModule, NzButtonModule, NzSpinModule, NzIconModule],
  templateUrl: './payment-step.component.html',
  styleUrl: './payment-step.component.scss'
})
export class PaymentStepComponent implements OnInit {
  checkout = inject(CheckoutService);

  gateways: Gateway[] = [];
  loading = true;
  selectedGateway: 'stripe' | 'paypal' | 'upi' | 'cod' | null = null;
  error = '';

  ngOnInit() {
    this.selectedGateway = this.checkout.state$.value.selectedGateway;

    this.checkout.getEnabledGateways().subscribe({
      next: (data) => {
        // Enforce the logic that only enabled gateways are shown
        this.gateways = [...data.filter(g => g.enabled), { gateway: 'cod', enabled: true }];
        this.loading = false;

        // Auto-select if only one available
        if (this.gateways.length === 1 && !this.selectedGateway) {
          this.selectedGateway = this.gateways[0].gateway as 'stripe' | 'paypal' | 'upi' | 'cod';
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load payment methods. Please try again.';
      }
    });
  }

  getGateway(gatewayName: string): boolean {
    return this.gateways.some(g => g.gateway === gatewayName);
  }

  selectGateway(gw: 'stripe' | 'paypal' | 'upi' | 'cod') {
    this.selectedGateway = gw;
  }

  goBack() {
    this.checkout.updateState({ step: 1 });
  }

  continue() {
    if (!this.selectedGateway) return;

    this.checkout.updateState({
      selectedGateway: this.selectedGateway,
      step: 3
    });
  }
}
