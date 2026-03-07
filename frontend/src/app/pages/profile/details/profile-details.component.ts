import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-details',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    NzButtonModule, NzInputModule, NzFormModule, NzIconModule
  ],
  providers: [NzMessageService],
  templateUrl: './profile-details.component.html'
})
export class ProfileDetailsComponent implements OnInit {
  auth = inject(AuthService);
  fb = inject(FormBuilder);
  msg = inject(NzMessageService);

  currentUser = this.auth.user;
  isLoading = signal(false);
  addressForm: FormGroup;
  addressChanged = signal(false);

  // Phone Verification State
  phoneConfig = signal<{ isPhoneVerificationOn: boolean }>({ isPhoneVerificationOn: false });
  phoneValue = signal(this.currentUser()?.phone || '');
  otpValue = signal('');
  isVerifyingPhone = signal(false);
  isPhoneLoading = signal(false);

  constructor() {
    const addr = this.currentUser()?.address || {};
    this.addressForm = this.fb.group({
      street: [addr.street || '', Validators.required],
      city: [addr.city || '', Validators.required],
      state: [addr.state || '', Validators.required],
      zip: [addr.zip || '', Validators.required],
      country: [addr.country || '', Validators.required]
    });

    this.addressForm.valueChanges.subscribe(() => {
      if (this.addressForm.dirty) this.addressChanged.set(true);
    });
  }

  ngOnInit(): void {
    // Fetch phone config on init
    this.auth.getPhoneConfig().subscribe({
      next: (config) => {
        console.log("config", config)
        this.phoneConfig.set(config)
      },
      error: () => console.error('Failed to load phone config')
    });
  }

  triggerFileInput(): void {
    document.getElementById('avatar-input')?.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.isLoading.set(true);
      this.auth.uploadAvatar(file).subscribe({
        next: () => {
          this.msg.success('Profile image updated');
          this.isLoading.set(false);
        },
        error: (e) => {
          this.msg.error(e.error?.message || 'Upload failed');
          this.isLoading.set(false);
        }
      });
    }
  }

  saveAddress(): void {
    if (this.addressForm.valid) {
      this.isLoading.set(true);
      this.auth.updateAddress(this.addressForm.value).subscribe({
        next: () => {
          this.msg.success('Delivery details saved');
          this.addressChanged.set(false);
          this.addressForm.markAsPristine();
          this.isLoading.set(false);
        },
        error: (e) => {
          this.msg.error('Failed to update address');
          this.isLoading.set(false);
        }
      });
    }
  }

  cancelAddress(): void {
    const addr = this.currentUser()?.address || {};
    this.addressForm.reset({
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || '',
      country: addr.country || ''
    });
    this.addressChanged.set(false);
  }

  // ---- Phone Verification Methods ----

  handlePhoneAction(): void {
    const phone = this.phoneValue().trim();
    if (!phone) {
      this.msg.warning('Please enter a phone number');
      return;
    }

    if (this.phoneConfig().isPhoneVerificationOn) {
      // Setup Verification
      this.isPhoneLoading.set(true);
      this.auth.sendPhoneOtp(phone).subscribe({
        next: (res) => {
          this.msg.success(res.message);
          this.isVerifyingPhone.set(true);
          this.isPhoneLoading.set(false);
        },
        error: (err) => {
          this.msg.error(err.error?.message || 'Failed to send OTP');
          this.isPhoneLoading.set(false);
        }
      });
    } else {
      // Save directly
      this.isPhoneLoading.set(true);
      this.auth.savePhone(phone).subscribe({
        next: (res) => {
          this.msg.success(res.message);
          this.isPhoneLoading.set(false);
        },
        error: (err) => {
          this.msg.error(err.error?.message || 'Failed to save phone');
          this.isPhoneLoading.set(false);
        }
      });
    }
  }

  submitOtp(): void {
    const otp = this.otpValue().trim();
    const phone = this.phoneValue().trim();

    if (!otp) {
      this.msg.warning('Please enter the OTP');
      return;
    }

    this.isPhoneLoading.set(true);
    this.auth.verifyPhoneOtp(phone, otp).subscribe({
      next: (res) => {
        this.msg.success(res.message);
        this.isVerifyingPhone.set(false);
        this.otpValue.set('');
        this.isPhoneLoading.set(false);
      },
      error: (err) => {
        this.msg.error(err.error?.message || 'Verification failed');
        this.isPhoneLoading.set(false);
      }
    });
  }

  cancelVerification(): void {
    this.isVerifyingPhone.set(false);
    this.otpValue.set('');
    this.phoneValue.set(this.currentUser()?.phone || '');
  }
}