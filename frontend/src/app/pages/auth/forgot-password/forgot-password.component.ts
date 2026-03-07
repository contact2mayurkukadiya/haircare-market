import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, NzIconModule],
    templateUrl: './forgot-password.component.html',
    styleUrl: '../auth.shared.scss',
})
export class ForgotPasswordComponent {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);
    private msg = inject(NzMessageService);

    forgotForm: FormGroup;
    isLoading = signal(false);

    constructor() {
        this.forgotForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });
    }

    onSubmit(): void {
        if (this.forgotForm.invalid) return;

        this.isLoading.set(true);
        const email = this.forgotForm.value.email;

        this.auth.forgotPassword(email).subscribe({
            next: (res) => {
                this.msg.success(res.message || 'If an account exists, an email has been sent.');
                // Navigate to reset password page and pass email via query params or state
                this.router.navigate(['/auth/reset-password'], { queryParams: { email } });
                this.isLoading.set(false);
            },
            error: (e) => {
                this.msg.error(e.error?.message || 'Something went wrong. Please try again later.');
                this.isLoading.set(false);
            }
        });
    }
}
