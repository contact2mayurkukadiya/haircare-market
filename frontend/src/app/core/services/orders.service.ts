import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface OrderItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

export interface ShippingAddress {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type PaymentMethodType = 'stripe' | 'paypal' | 'upi' | 'cod';

export interface Order {
    _id: string;
    userId: string;
    items: OrderItem[];
    shippingAddress: ShippingAddress;
    subtotal: number;
    total: number;
    status: OrderStatus;
    paymentMethod: PaymentMethodType;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
    private api = inject(ApiService);

    /** Fetch all orders for the currently logged-in customer. */
    getMyOrders(): Observable<Order[]> {
        return this.api.get<Order[]>('/orders/my');
    }
}
