import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { forkJoin } from 'rxjs';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        BaseChartDirective,
        NzCardModule,
        NzStatisticModule,
        NzGridModule,
        NzIconModule,
        NzSpinModule
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
    private api = inject(ApiService);

    @ViewChild('lineChart') lineChart?: BaseChartDirective;
    @ViewChild('doughnutChart') doughnutChart?: BaseChartDirective;
    @ViewChild('barChart') barChart?: BaseChartDirective;

    // 1. Line Chart: Daily Revenue (Existing)
    public lineChartData: ChartData<'line'> = {
        labels: [],
        datasets: [{
            data: [],
            label: 'Revenue',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgb(59, 130, 246)',
            pointBackgroundColor: 'rgb(59, 130, 246)',
            fill: 'origin',
        }]
    };
    public lineChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        elements: { line: { tension: 0.4 } },
        plugins: { legend: { display: true } }
    };

    // 2. Doughnut Chart: Revenue by Category (New)
    public doughnutChartData: ChartData<'doughnut'> = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        }]
    };
    public doughnutChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
        }
    };

    // 3. Bar Chart: Monthly Revenue (New)
    public barChartData: ChartData<'bar'> = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            data: Array(12).fill(0),
            label: 'Monthly Revenue',
            backgroundColor: '#36A2EB',
        }]
    };
    public barChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } }
    };

    totalRevenue = 0;
    successfulTxCount = 0;
    loading = true;

    ngOnInit() {
        this.fetchAnalytics();
    }

    fetchAnalytics() {
        this.loading = true;
        forkJoin({
            orders: this.api.get<any[]>('/orders/admin/all'),
            transactions: this.api.get<any[]>('/orders/admin/transactions'),
            categoryRevenue: this.api.get<any[]>('/orders/admin/analytics/category-revenue'),
            monthlyRevenue: this.api.get<any[]>('/orders/admin/analytics/monthly-revenue')
        }).subscribe({
            next: (res) => {
                const paidOrders = res.orders.filter(o => o.status === 'paid');

                // Summary stats
                const succeeded = res.transactions.filter(t => t.status === 'succeeded');
                this.successfulTxCount = succeeded.length;
                this.totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0);

                // Daily Line Chart
                this.initDailyChart(paidOrders);

                // Category Doughnut Chart
                this.doughnutChartData.labels = res.categoryRevenue.map(c => c.category);
                this.doughnutChartData.datasets[0].data = res.categoryRevenue.map(c => c.revenue);

                // Monthly Bar Chart
                const months = Array(12).fill(0);
                res.monthlyRevenue.forEach(m => {
                    months[m.month - 1] = m.revenue;
                });
                this.barChartData.datasets[0].data = months;

                this.loading = false;

                // Trigger updates
                setTimeout(() => {
                    this.lineChart?.update();
                    this.doughnutChart?.update();
                    this.barChart?.update();
                });
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    initDailyChart(data: any[]) {
        const dailyData: Record<string, number> = {};
        data.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString();
            dailyData[date] = (dailyData[date] || 0) + (order.total || 0);
        });
        const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        this.lineChartData.labels = sortedDates;
        this.lineChartData.datasets[0].data = sortedDates.map(date => dailyData[date]);
    }
}
