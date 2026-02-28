import { Component, inject, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: '../auth.shared.scss',
})
export class RegisterComponent {
  auth = inject(AuthService);
  router = inject(Router);
  name = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  onSubmit(): void {
    if (!this.name || !this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.register({ name: this.name, email: this.email, password: this.password }).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/auth/verify-otp'], { queryParams: { email: this.email } }); },
      error: (err: any) => { this.loading.set(false); this.error.set(err.error?.message || 'Registration failed.'); }
    });
  }
}
