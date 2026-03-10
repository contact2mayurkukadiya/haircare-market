import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrdersService, Order } from '../../../core/services/orders.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@Component({
    selector: 'app-profile-orders',
    standalone: true,
    imports: [CommonModule, RouterLink, NzIconModule, NzTagModule, NzSpinModule, NzEmptyModule],
    templateUrl: './profile-orders.component.html',
    styleUrl: './profile-orders.component.scss'
})
export class ProfileOrdersComponent implements OnInit {
    private ordersService = inject(OrdersService);

    orders: Order[] = [];
    loading = true;
    error = '';

    /** Track which order cards are expanded */
    expandedOrders = new Set<string>();

    ngOnInit(): void {
        this.ordersService.getMyOrders().subscribe({
            next: (data) => {
                this.orders = data;
                // Auto-expand the most recent order
                if (data.length > 0) this.expandedOrders.add(data[0]._id);
                this.loading = false;
            },
            error: () => {
                this.error = 'Could not load your orders. Please try again later.';
                this.loading = false;
            }
        });
    }

    toggleExpand(orderId: string): void {
        if (this.expandedOrders.has(orderId)) {
            this.expandedOrders.delete(orderId);
        } else {
            this.expandedOrders.add(orderId);
        }
    }

    isExpanded(orderId: string): boolean {
        return this.expandedOrders.has(orderId);
    }

    /** Map status to an NzTag color */
    statusColor(status: string): string {
        const map: Record<string, string> = {
            paid: 'success',
            pending: 'warning',
            failed: 'error',
            cancelled: 'default',
        };
        return map[status] ?? 'default';
    }

    /** Map status to a user-friendly label */
    statusLabel(status: string): string {
        const map: Record<string, string> = {
            paid: 'Paid',
            pending: 'Pending',
            failed: 'Failed',
            cancelled: 'Cancelled',
        };
        return map[status] ?? status;
    }

    /** Map payment method to an NzTag color */
    gatewayColor(method: string): string {
        const map: Record<string, string> = {
            stripe: 'geekblue',
            paypal: 'blue',
            upi: 'orange',
            cod: 'default',
        };
        return map[method] ?? 'default';
    }

    /** Map payment method to a display label */
    gatewayLabel(method: string): string {
        const map: Record<string, string> = {
            stripe: 'Stripe',
            paypal: 'PayPal',
            upi: 'UPI',
            cod: 'COD',
        };
        return map[method] ?? method;
    }

    /** Map payment method to an icon name */
    gatewayIcon(method: string): string {
        const map: Record<string, string> = {
            stripe: 'credit-card',
            paypal: 'alipay-circle',
            upi: 'qrcode',
            cod: 'shop',
        };
        return map[method] ?? 'wallet';
    }

    /** Compute item subtotal */
    itemSubtotal(price: number, qty: number): number {
        return price * qty;
    }

    /** Short order ID for display (last 8 chars) */
    shortId(id: string): string {
        return '#' + id.slice(-8).toUpperCase();
    }

    /** Format shipping address into a single readable string */
    formatAddress(addr: { street?: string; city?: string; state?: string; zip?: string; country?: string }): string {
        return [addr.street, addr.city, addr.state, addr.zip, addr.country]
            .filter(part => part != null && part !== '')
            .join(', ');
    }
}
