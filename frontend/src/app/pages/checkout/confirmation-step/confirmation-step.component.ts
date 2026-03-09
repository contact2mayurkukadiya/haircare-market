import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../../core/services/checkout.service';
import { RouterLink } from '@angular/router';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-confirmation-step',
  standalone: true,
  imports: [CommonModule, RouterLink, NzResultModule, NzButtonModule, NzIconModule],
  templateUrl: './confirmation-step.component.html',
  styleUrl: './confirmation-step.component.scss'
})
export class ConfirmationStepComponent {
  checkout = inject(CheckoutService);

  get orderId(): string {
    return (this.checkout.state$.value.orderId as string) || 'UNKNOWN';
  }
}
