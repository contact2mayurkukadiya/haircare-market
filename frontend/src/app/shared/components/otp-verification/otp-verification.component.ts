import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
    selector: 'app-otp-verification',
    standalone: true,
    imports: [CommonModule, FormsModule, NzModalModule, NzButtonModule, NzIconModule],
    templateUrl: './otp-verification.component.html'
})
export class OtpVerificationComponent {
    // Inputs
    visible = input.required<boolean>();
    isLoading = input<boolean>(false);
    isResending = input<boolean>(false);
    title = input<string>('Verify OTP');
    message = input<string>('Please enter the 6-digit code sent to your email');

    // Internal state
    otpValue = '';

    // Outputs
    otpSubmitted = output<string>();
    resendRequested = output<void>();
    modalClosed = output<void>();

    handleCancel() {
        this.otpValue = '';
        this.modalClosed.emit();
    }

    submit() {
        if (this.otpValue && this.otpValue.length === 6) {
            this.otpSubmitted.emit(this.otpValue);
        }
    }

    resend() {
        this.resendRequested.emit();
    }

    // Helper method for parent to clear the OTP input explicitly when needed
    reset() {
        this.otpValue = '';
    }
}
