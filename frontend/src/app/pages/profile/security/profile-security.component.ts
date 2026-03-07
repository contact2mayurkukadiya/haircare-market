import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-security',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    NzButtonModule, NzInputModule, NzFormModule, NzModalModule
  ],
  providers: [NzMessageService],
  templateUrl: './profile-security.component.html'
})
export class ProfileSecurityComponent {
  auth = inject(AuthService);
  fb = inject(FormBuilder);
  msg = inject(NzMessageService);

  isLoading = signal(false);
  pwdStep = signal(1);
  pwdForm: FormGroup;
  otpValue = '';

  constructor() {
    this.pwdForm = this.fb.group({
      current: ['', Validators.required],
      new: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]]
    });
  }

  initPasswordReset(): void {
    const { current, new: newPass, confirm } = this.pwdForm.value;
    if (newPass !== confirm) {
      this.msg.error("New passwords don't match");
      return;
    }

    this.isLoading.set(true);
    this.auth.initChangePassword(current).subscribe({
      next: (res) => {
        this.msg.success(res.message);
        this.pwdStep.set(2);
        this.isLoading.set(false);
      },
      error: (e) => {
        this.msg.error(e.error?.message || 'Failed to initiate reset');
        this.isLoading.set(false);
      }
    });
  }

  finalizePasswordReset(): void {
    if (!this.otpValue || this.otpValue.length !== 6) return;

    this.isLoading.set(true);
    const newPass = this.pwdForm.value.new;

    this.auth.completeChangePassword(this.otpValue, newPass).subscribe({
      next: (res) => {
        this.msg.success(res.message);
        this.pwdStep.set(1);
        this.pwdForm.reset();
        this.otpValue = '';
        this.isLoading.set(false);
      },
      error: (e) => {
        this.msg.error(e.error?.message || 'Failed to update password');
        this.isLoading.set(false);
      }
    });
  }
}