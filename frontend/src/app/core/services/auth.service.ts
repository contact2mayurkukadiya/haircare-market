import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface User {
    _id: string;
    name: string;
    email: string;
    is_verified: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private api = inject(ApiService);
    private router = inject(Router);

    private _user = signal<User | null>(this.loadUserFromStorage());
    readonly user = this._user.asReadonly();
    readonly isLoggedIn = computed(() => this._user() !== null);

    private loadUserFromStorage(): User | null {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch { return null; }
    }

    register(data: { name: string; email: string; password: string }): Observable<{ message: string }> {
        return this.api.post<{ message: string }>('/users', data);
    }

    sendOtp(email: string): Observable<{ message: string }> {
        return this.api.post<{ message: string }>('/users/send-otp', { email });
    }

    verifyOtp(email: string, otp: string): Observable<{ message: string }> {
        return this.api.post<{ message: string }>('/users/verify-otp', { email, otp });
    }

    login(email: string, password: string): Observable<{ access_token: string; user: User }> {
        return this.api.post<{ access_token: string; user: User }>('/auth/login', { email, password }).pipe(
            tap(res => {
                localStorage.setItem('access_token', res.access_token);
                localStorage.setItem('user', JSON.stringify(res.user));
                this._user.set(res.user);
            })
        );
    }

    logout(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        this._user.set(null);
        this.router.navigate(['/']);
    }
}
