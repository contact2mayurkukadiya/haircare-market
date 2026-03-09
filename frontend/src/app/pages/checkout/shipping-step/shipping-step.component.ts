import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CheckoutService } from '../../../core/services/checkout.service';
import { AuthService } from '../../../core/services/auth.service';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzGridModule } from 'ng-zorro-antd/grid';

@Component({
  selector: 'app-shipping-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule, NzGridModule],
  templateUrl: './shipping-step.component.html',
  styleUrl: './shipping-step.component.scss'
})
export class ShippingStepComponent implements OnInit {
  checkout = inject(CheckoutService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  shippingForm!: FormGroup;

  ngOnInit() {
    // Attempt to pre-fill from user profile via auth service
    const user = this.auth.user();
    const existing = (this.checkout.state$.value.shippingAddress as any) || (user?.address as any) || {};

    this.shippingForm = this.fb.group({
      street: [existing.street || '', Validators.required],
      city: [existing.city || '', Validators.required],
      state: [existing.state || '', Validators.required],
      zip: [existing.zip || '', Validators.required],
      country: [existing.country || '', Validators.required],
    });
  }

  continue() {
    if (this.shippingForm.valid) {
      this.checkout.updateState({
        shippingAddress: this.shippingForm.value as any,
        step: 2
      });
    } else {
      Object.values(this.shippingForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }
}
