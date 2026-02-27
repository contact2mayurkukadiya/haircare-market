import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface Category {
    _id: string;
    name: string;
    desc?: string;
    isActive: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    public categories = signal<Category[]>([]);
    public currentCategory = signal<Category | null>(null);

    constructor(private api: ApiService) { }

    loadAllCategories(): Observable<Category[]> {
        return this.api.get<Category[]>('/categories/getAll').pipe(
            tap(res => this.categories.set(res))
        );
    }

    loadCategoryById(id: string): Observable<Category> {
        return this.api.get<Category>(`/categories/${id}`).pipe(
            tap(res => this.currentCategory.set(res))
        );
    }

    createCategory(categoryData: any): Observable<{ message: string; category: Category }> {
        return this.api.post<{ message: string; category: Category }>('/categories/create', categoryData).pipe(
            tap(res => {
                this.categories.update(current => [...current, res.category]);
            })
        );
    }

    updateCategory(id: string, categoryData: any): Observable<{ message: string; category: Category }> {
        return this.api.patch<{ message: string; category: Category }>(`/categories/${id}`, categoryData).pipe(
            tap(res => {
                this.categories.update(current =>
                    current.map(c => c._id === id ? res.category : c)
                );
            })
        );
    }

    deleteCategory(id: string): Observable<any> {
        return this.api.delete(`/categories/${id}`).pipe(
            tap(() => {
                this.categories.update(current => current.filter(c => c._id !== id));
            })
        );
    }
}
