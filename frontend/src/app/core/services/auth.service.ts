import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface Address {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    phone?: string;
}


export interface User {
    _id: string;
    name: string;
    email: string;
    is_verified: boolean;
    avatar?: string;
    address?: Address;
    phone?: string;
    is_phone_verified?: boolean;
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

    /** Fetch latest profile from server and sync signal + localStorage */
    fetchProfile(): Observable<User> {
        return this.api.get<User>('/users/profile').pipe(
            tap(user => {
                this._user.set(user);
                localStorage.setItem('user', JSON.stringify(user));
            })
        );
    }

    // ---- Phone Verification API Calls ----

    getPhoneConfig(): Observable<{ isPhoneVerificationOn: boolean }> {
        return this.api.get<{ isPhoneVerificationOn: boolean }>('/users/phone/config');
    }

    sendPhoneOtp(phone: string): Observable<{ message: string }> {
        return this.api.post<{ message: string }>('/users/phone/send-otp', { phone });
    }

    verifyPhoneOtp(phone: string, otp: string): Observable<{ message: string }> {
        return this.api.post<{ message: string }>('/users/phone/verify', { phone, otp }).pipe(
            tap(() => this.fetchProfile().subscribe()) // Refresh user profile to get is_phone_verified=true
        );
    }

    savePhone(phone: string): Observable<{ message: string }> {
        return this.api.post<{ message: string }>('/users/phone/save', { phone }).pipe(
            tap(() => this.fetchProfile().subscribe()) // Refresh user profile to get is_phone_verified=true and updated phone
        );
    }

    // ---- End Phone Verification API Calls ----

    uploadAvatar(file: File): Observable<{ avatar: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return this.api.post<{ avatar: string }>('/users/avatar', formData).pipe(
            tap(res => {
                // Update local state signal
                const current = this._user();
                if (current) {
                    const updated = { ...current, avatar: res.avatar };
                    this._user.set(updated);
                    localStorage.setItem('user', JSON.stringify(updated));
                }
            })
        );
    }

    updateAddress(address: Address): Observable<User> {
        return this.api.patch<User>('/users/profile', { address }).pipe(
            tap(user => {
                // Usually API returns updated user preview. Update signal.
                this._user.set(user);
                localStorage.setItem('user', JSON.stringify(user));
            })
        );
    }

    initChangePassword(currentPassword: string): Observable<{ message: string }> {
        return this.api.post('/users/change-password/init', { currentPassword });
    }

    completeChangePassword(otp: string, newPassword: string): Observable<{ message: string }> {
        return this.api.post('/users/change-password/complete', { otp, newPassword });
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
