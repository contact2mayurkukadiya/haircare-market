import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface Category {
    _id: string;
    name: string;
    desc?: string;
    isActive: boolean;
}

export interface Product {
    _id: string;
    name: string;
    desc: string;
    price: number;
    stock: number;
    category: Category | string;
    tags?: string[];
    images: string[];
    isFeatured: boolean;
    isActive: boolean;
}

export interface PaginatedProducts {
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
    private api = inject(ApiService);

    private _products = signal<Product[]>([]);
    private _currentProduct = signal<Product | null>(null);
    private _loading = signal(false);
    private _loadingMore = signal(false);
    private _currentPage = signal(1);
    private _totalPages = signal(1);
    private _total = signal(0);

    readonly products = this._products.asReadonly();
    readonly currentProduct = this._currentProduct.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly loadingMore = this._loadingMore.asReadonly();
    readonly currentPage = this._currentPage.asReadonly();
    readonly totalPages = this._totalPages.asReadonly();
    readonly total = this._total.asReadonly();
    readonly hasMore = () => this._currentPage() < this._totalPages();

    getCategoryName(product: Product): string {
        if (product.category && typeof product.category === 'object') {
            return (product.category as Category).name;
        }
        return product.category as string ?? '';
    }

    /** Initial load — resets the list */
    loadAll(page = 1, limit = 12): Observable<PaginatedProducts> {
        this._loading.set(true);
        return this.api.get<PaginatedProducts>(`/products?page=${page}&limit=${limit}`).pipe(
            tap({
                next: (res) => {
                    this._products.set(res.data);
                    this._currentPage.set(res.page);
                    this._totalPages.set(res.totalPages);
                    this._total.set(res.total);
                    this._loading.set(false);
                },
                error: () => this._loading.set(false),
            })
        );
    }

    /** Load next page and append results */
    loadMore(limit = 12): Observable<PaginatedProducts> {
        const nextPage = this._currentPage() + 1;
        this._loadingMore.set(true);
        return this.api.get<PaginatedProducts>(`/products?page=${nextPage}&limit=${limit}`).pipe(
            tap({
                next: (res) => {
                    this._products.update(existing => {
                        const newItems = res.data.filter(newItem => !existing.some(oldItem => oldItem._id === newItem._id));
                        return [...existing, ...newItems];
                    });
                    this._currentPage.set(res.page);
                    this._totalPages.set(res.totalPages);
                    this._total.set(res.total);
                    this._loadingMore.set(false);
                },
                error: () => this._loadingMore.set(false),
            })
        );
    }

    loadById(id: string): Observable<Product> {
        this._loading.set(true);
        return this.api.get<Product>(`/products/${id}`).pipe(
            tap({
                next: (p) => { this._currentProduct.set(p); this._loading.set(false); },
                error: () => this._loading.set(false),
            })
        );
    }
}
