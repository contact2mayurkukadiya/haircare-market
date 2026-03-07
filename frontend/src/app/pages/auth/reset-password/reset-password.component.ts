import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AuthService } from '../../../core/services/auth.service';
import { OtpVerificationComponent } from '../../../shared/components/otp-verification/otp-verification.component';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NzIconModule, OtpVerificationComponent],
    templateUrl: './reset-password.component.html',
    styleUrl: '../auth.shared.scss',
})
export class ResetPasswordComponent implements OnInit {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private msg = inject(NzMessageService);

    resetForm: FormGroup;
    email = '';

    showPassword = signal(false);
    showConfirmPassword = signal(false);

    isLoading = signal(false);
    isResending = signal(false);
    showOtpModal = signal(false);

    constructor() {
        this.resetForm = this.fb.group({
            new: ['', [Validators.required, Validators.minLength(8)]],
            confirm: ['', [Validators.required]]
        });
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            if (params['email']) {
                this.email = params['email'];
            } else {
                // If no email in URL, push back to forgot password
                this.router.navigate(['/auth/forgot-password']);
            }
        });
    }

    onSubmit(): void {
        if (this.resetForm.invalid) return;

        if (this.resetForm.value.new !== this.resetForm.value.confirm) {
            this.msg.error("Passwords do not match");
            return;
        }

        // Instead of directly calling the backend, we now show the OTP verification dialog.
        // The OTP was already sent when they submitted their email on the previous page.
        this.showOtpModal.set(true);
    }

    resendOtp(): void {
        this.isResending.set(true);
        // Re-trigger the forgotPassword request which generates and sends a new OTP
        this.auth.forgotPassword(this.email).subscribe({
            next: (res) => {
                this.msg.success('A new OTP has been sent to your email.');
                this.isResending.set(false);
            },
            error: (e) => {
                this.msg.error(e.error?.message || 'Failed to resend OTP');
                this.isResending.set(false);
            }
        });
    }

    finalizeReset(otpValue: string): void {
        if (!otpValue || otpValue.length !== 6) return;

        this.isLoading.set(true);
        const newPass = this.resetForm.value.new;

        this.auth.resetPassword(this.email, otpValue, newPass).subscribe({
            next: (res) => {
                this.msg.success(res.message || 'Password updated successfully');
                this.showOtpModal.set(false);
                this.isLoading.set(false);
                this.router.navigate(['/auth/login']);
            },
            error: (e) => {
                this.msg.error(e.error?.message || 'Invalid OTP. Please try again.');
                this.isLoading.set(false);
            }
        });
    }
}
