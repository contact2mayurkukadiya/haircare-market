import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [
        CommonModule,
        CurrencyPipe,
        DatePipe,
        NzTableModule,
        NzBadgeModule,
        NzTagModule,
        NzCardModule,
        NzIconModule
    ],
    templateUrl: './orders.component.html',
    styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
    private api = inject(ApiService);

    orders: any[] = [];
    loading = true;

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
}
