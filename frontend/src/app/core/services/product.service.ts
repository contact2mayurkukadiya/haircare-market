import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';

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

export interface ProductQueryFilters {
    category?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    inStock?: boolean | null;
    search?: string | null;
    sort?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | null;
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

    private buildParams(
        page: number,
        limit: number,
        filters?: ProductQueryFilters,
    ): HttpParams {
        let params = new HttpParams()
            .set('page', page)
            .set('limit', limit);

        if (filters?.category) params = params.set('category', filters.category);
        if (filters?.minPrice != null) params = params.set('minPrice', String(filters.minPrice));
        if (filters?.maxPrice != null && filters.maxPrice !== Infinity) {
            params = params.set('maxPrice', String(filters.maxPrice));
        }
        if (filters?.inStock != null) params = params.set('inStock', String(filters.inStock));
        if (filters?.search) params = params.set('search', filters.search.trim());
        if (filters?.sort) params = params.set('sort', filters.sort);

        return params;
    }


    /** Initial load — resets the list */
    loadAll(page = 1, limit = 12, filters?: ProductQueryFilters): Observable<PaginatedProducts> {
        this._loading.set(true);
        const params = this.buildParams(page, limit, filters);

        return this.api.get<PaginatedProducts>('/products', { params }).pipe(
            tap({
                next: (res) => {
                    this._products.set(res.data);
                    this._currentPage.set(res.page);
                    this._totalPages.set(res.totalPages);
                    this._total.set(res.total);
                    this._loading.set(false);
                },
                error: () => this._loading.set(false),
            }),
        );
    }


    /** Load next page and append results */
    loadMore(limit = 12, filters?: ProductQueryFilters): Observable<PaginatedProducts> {
        const nextPage = this._currentPage() + 1;
        this._loadingMore.set(true);
        const params = this.buildParams(nextPage, limit, filters);

        return this.api.get<PaginatedProducts>('/products', { params }).pipe(
            tap({
                next: (res) => {
                    this._products.update(existing => {
                        const newItems = res.data.filter(
                            newItem => !existing.some(oldItem => oldItem._id === newItem._id),
                        );
                        return [...existing, ...newItems];
                    });
                    this._currentPage.set(res.page);
                    this._totalPages.set(res.totalPages);
                    this._total.set(res.total);
                    this._loadingMore.set(false);
                },
                error: () => this._loadingMore.set(false),
            }),
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
