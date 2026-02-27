import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CategoryService } from '../../../core/services/category.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
    selector: 'app-category-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        NzFormModule,
        NzInputModule,
        NzButtonModule,
        NzSwitchModule,
        NzIconModule
    ],
    templateUrl: './category-form.component.html',
    styleUrls: ['./category-form.component.scss']
})
export class CategoryFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private categoryService = inject(CategoryService);
    private message = inject(NzMessageService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    public api = inject(ApiService);

    form: FormGroup;
    categoryId: string | null = null;
    isEditMode = false;

    constructor() {
        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(100)]],
            desc: ['', [Validators.maxLength(1000)]],
            isActive: [true]
        });
    }

    ngOnInit(): void {
        this.categoryId = this.route.snapshot.paramMap.get('id');
        if (this.categoryId) {
            this.isEditMode = true;
            this.loadCategory(this.categoryId);
        }
    }

    loadCategory(id: string): void {
        this.categoryService.loadCategoryById(id).subscribe({
            next: (category) => {
                this.form.patchValue(category);
            },
            error: (err) => {
                this.message.error('Failed to load category details');
                this.router.navigate(['/admin/categories']);
            }
        });
    }

    submitForm(): void {
        if (this.form.valid) {
            if (this.isEditMode && this.categoryId) {
                const updateData = {
                    new_name: this.form.value.name,
                    new_desc: this.form.value.desc,
                    new_isActive: this.form.value.isActive
                };
                this.categoryService.updateCategory(this.categoryId, updateData).subscribe({
                    next: () => {
                        this.message.success('Category updated successfully');
                        this.router.navigate(['/admin/categories']);
                    },
                    error: (err) => this.message.error('Failed to update category: ' + (err.error?.message || err.message))
                });
            } else {
                this.categoryService.createCategory(this.form.value).subscribe({
                    next: () => {
                        this.message.success('Category created successfully');
                        this.router.navigate(['/admin/categories']);
                    },
                    error: (err) => this.message.error('Failed to create category: ' + (err.error?.message || err.message))
                });
            }
        } else {
            Object.values(this.form.controls).forEach(control => {
                if (control.invalid) {
                    control.markAsDirty();
                    control.updateValueAndValidity({ onlySelf: true });
                }
            });
        }
    }

    cancel(): void {
        this.router.navigate(['/admin/categories']);
    }
}
