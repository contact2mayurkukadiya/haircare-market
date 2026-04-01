import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { FormsModule } from '@angular/forms';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CurrencyPipe,
        DatePipe,
        NzTableModule,
        NzBadgeModule,
        NzTagModule,
        NzCardModule,
        NzIconModule,
        NzButtonModule,
        NzInputModule,
    ],
    templateUrl: './orders.component.html',
    styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
    private api = inject(ApiService);
    private message = inject(NzMessageService);

    orders: any[] = [];
    loading = true;
    otpByOrderId: Record<string, string> = {};
    sendingOtpByOrderId: Record<string, boolean> = {};
    verifyingOtpByOrderId: Record<string, boolean> = {};

    ngOnInit() {
        this.fetchOrders();
    }

    fetchOrders() {
        this.loading = true;
        this.api.get<any[]>('/orders/admin/all').subscribe({
            next: (data) => {
                this.orders = data;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'paid': return 'success';
            case 'pending': return 'processing';
            case 'failed': return 'error';
            case 'cancelled': return 'default';
            default: return 'default';
        }
    }

    canSendOtp(order: any): boolean {
        return order.paymentMethod === 'cod' && order.status === 'pending';
    }

    canVerifyOtp(order: any): boolean {
        return this.canSendOtp(order) && !!order.codOtpSentAt;
    }

    sendOtp(order: any): void {
        const orderId = order._id;
        this.sendingOtpByOrderId[orderId] = true;
        this.api.post<{ message: string }>('/orders/admin/cod/send-otp', { orderId }).subscribe({
            next: (res) => {
                order.codOtpSentAt = new Date().toISOString();
                this.message.success(res.message || 'OTP sent');
                this.sendingOtpByOrderId[orderId] = false;
            },
            error: (err) => {
                this.message.error(err?.error?.message || 'Failed to send OTP');
                this.sendingOtpByOrderId[orderId] = false;
            }
        });
    }

    verifyOtp(order: any): void {
        const orderId = order._id;
        const otp = (this.otpByOrderId[orderId] || '').trim();
        if (!otp) {
            this.message.warning('Please enter OTP first');
            return;
        }
        this.verifyingOtpByOrderId[orderId] = true;
        this.api.post<{ message: string }>('/orders/admin/cod/verify-otp', { orderId, otp }).subscribe({
            next: (res) => {
                order.status = 'paid';
                this.otpByOrderId[orderId] = '';
                this.message.success(res.message || 'OTP verified');
                this.verifyingOtpByOrderId[orderId] = false;
            },
            error: (err) => {
                this.message.error(err?.error?.message || 'Failed to verify OTP');
                this.verifyingOtpByOrderId[orderId] = false;
            }
        });
    }
}
