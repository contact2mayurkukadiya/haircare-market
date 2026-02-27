import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Router } from '@angular/router';

export interface AdminUser {
    _id: string;
    name: string;
    email: string;
}

export interface LoginResponse {
    access_token: string;
    admin: AdminUser;
}

const TOKEN_KEY = 'admin_access_token';
const USER_KEY = 'admin_user';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    // Signal to hold the current admin user state
    public currentUser = signal<AdminUser | null>(this.loadUserFromStorage());

    // Computed signal: logged in when we have a token AND a user
    public isLoggedIn = computed(() => this.currentUser() !== null && !!this.getToken());

    constructor(private api: ApiService, private router: Router) { }

    // ─── Token helpers ───────────────────────────────────────────────────────

    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    }

    private saveSession(token: string, user: AdminUser): void {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
    }

    private clearSession(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        this.currentUser.set(null);
    }

    private loadUserFromStorage(): AdminUser | null {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? (JSON.parse(raw) as AdminUser) : null;
        } catch {
            return null;
        }
    }

    // ─── Auth actions ─────────────────────────────────────────────────────────

    login(credentials: { email: string; password: string }) {
        return this.api.post<LoginResponse>('/admin/login', credentials).pipe(
            tap(res => {
                this.saveSession(res.access_token, res.admin);
                this.router.navigate(['/admin']);
            })
        );
    }

    logout(): void {
        this.clearSession();
        this.router.navigate(['/login']);
    }

    getCurrentUser() {
        return this.api.get<AdminUser>('/admin/me').pipe(
            tap(user => this.currentUser.set(user)),
            catchError(() => {
                this.clearSession();
                return of(null);
            })
        );
    }
}
