import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { CategoryService, Category } from '../../../core/services/category.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-category-list',
    standalone: true,
    imports: [
        CommonModule,
        NzTableModule,
        NzButtonModule,
        NzIconModule,
        NzPopconfirmModule,
        NzTagModule,
        NzToolTipModule
    ],
    templateUrl: './category-list.component.html',
    styleUrls: ['./category-list.component.scss']
})
export class CategoryListComponent implements OnInit {
    private categoryService = inject(CategoryService);
    public api = inject(ApiService);
    private router = inject(Router);
    private message = inject(NzMessageService);

    categories = this.categoryService.categories;

    ngOnInit(): void {
        this.categoryService.loadAllCategories().subscribe({
            error: (err) => this.message.error('Failed to load categories: ' + (err.error?.message || err.message))
        });
    }

    editCategory(category: Category): void {
        this.router.navigate(['/admin/categories', category._id, 'edit']);
    }

    deleteCategory(id: string): void {
        this.categoryService.deleteCategory(id).subscribe({
            next: () => this.message.success('Category deleted successfully'),
            error: (err) => this.message.error('Failed to delete category: ' + (err.error?.message || err.message))
        });
    }

    createCategory() {
        this.router.navigate(['/admin/categories/new']);
    }
}
