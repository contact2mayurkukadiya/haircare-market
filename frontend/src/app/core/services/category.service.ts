import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
export type { Category } from './product.service';
import { Category } from './product.service';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private api = inject(ApiService);

    private _categories = signal<Category[]>([]);
    readonly categories = this._categories.asReadonly();

    loadAll(): Observable<Category[]> {
        return this.api.get<Category[]>('/categories/getAll').pipe(
            tap(cats => this._categories.set(cats))
        );
    }
}
