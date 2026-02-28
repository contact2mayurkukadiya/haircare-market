import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './verify-otp.component.html',
  styleUrl: '../auth.shared.scss',
})
export class VerifyOtpComponent implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  email = '';
  otp = '';
  loading = signal(false);
  resending = signal(false);
  error = signal('');
  success = signal('');

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParams['email'] ?? '';
  }

  onSubmit(): void {
    if (!this.otp) return;
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.auth.verifyOtp(this.email, this.otp).subscribe({
      next: (res: any) => { this.loading.set(false); this.success.set(res.message); setTimeout(() => this.router.navigate(['/auth/login']), 1500); },
      error: (err: any) => { this.loading.set(false); this.error.set(err.error?.message || 'Invalid OTP. Please try again.'); }
    });
  }

  resend(): void {
    this.resending.set(true);
    this.error.set('');
    this.success.set('');
    this.auth.sendOtp(this.email).subscribe({
      next: (res: any) => { this.resending.set(false); this.success.set(res.message); },
      error: (err: any) => { this.resending.set(false); this.error.set(err.error?.message || 'Failed to resend OTP.'); }
    });
  }
}
