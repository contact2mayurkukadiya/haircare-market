import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';

export interface CheckoutState {
    step: 1 | 2 | 3 | 4;
    shippingAddress: any;
    selectedGateway: 'stripe' | 'paypal' | 'upi' | null;
    orderId: string | null;
    clientSecret: string | null;
    orderTotal: number;
}

@Injectable({
    providedIn: 'root'
})
export class CheckoutService {
    private api = inject(ApiService);

    // State
    private initialState: CheckoutState = {
        step: 1,
        shippingAddress: null,
        selectedGateway: null,
        orderId: null,
        clientSecret: null,
        orderTotal: 0,
    };

    state$ = new BehaviorSubject<CheckoutState>({ ...this.initialState });

    updateState(partial: Partial<CheckoutState>) {
        this.state$.next({ ...this.state$.value, ...partial });
    }

    reset() {
        this.state$.next({ ...this.initialState });
    }

    // APIs
    getEnabledGateways() {
        return this.api.get<Array<{ gateway: string; enabled: boolean; publicKey?: string; clientId?: string }>>('/payments/gateways');
    }

    createOrder(payload: any) {
        return this.api.post<any>('/orders', payload);
    }

    createStripeIntent(orderId: string) {
        return this.api.post<{ clientSecret: string }>('/payments/stripe/intent', { orderId });
    }

    createPayPalOrder(orderId: string) {
        return this.api.post<{ paypalOrderId: string }>('/payments/paypal/order', { orderId });
    }

    capturePayPalOrder(paypalOrderId: string, orderId: string) {
        return this.api.post<{ success: boolean }>('/payments/paypal/capture', { paypalOrderId, orderId });
    }

    failPayPalOrder(orderId: string) {
        return this.api.post<{ success: boolean }>('/payments/paypal/fail', { orderId });
    }
}
