import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

import { NzTableModule } from 'ng-zorro-antd/table';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-transactions',
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
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  private api = inject(ApiService);

  transactions: any[] = [];
  loading = true;

  ngOnInit() {
    this.fetchTransactions();
  }

  fetchTransactions() {
    this.loading = true;
    this.api.get<any[]>('/orders/admin/transactions').subscribe({
      next: (data) => {
        this.transactions = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'paid':
      case 'succeeded': return 'success';
      case 'pending': return 'processing';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  }

  getGatewayColor(gateway: string): string {
    switch (gateway) {
      case 'stripe': return 'purple';
      case 'paypal': return 'blue';
      case 'upi': return 'orange';
      case 'cod': return 'green';
      default: return 'default';
    }
  }
}
