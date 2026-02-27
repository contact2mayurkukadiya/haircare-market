import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface Product {
    _id: string;
    name: string;
    desc: string;
    price: number;
    stock: number;
    category: any;
    images: string[];
    isFeatured: boolean;
    isActive: boolean;
}
@Injectable({
    providedIn: 'root'
})
export class ProductService {
    public products = signal<Product[]>([]);
    public currentProduct = signal<Product | null>(null);

    // Computed value example (useful if filtering is needed later)
    public featuredProducts = computed(() => this.products().filter(p => p.isFeatured));

    constructor(private api: ApiService) { }

    loadAllProducts(): Observable<Product[]> {
        return this.api.get<Product[]>('/admin/products').pipe(
            tap(res => this.products.set(res))
        );
    }

    loadProductById(id: string): Observable<Product> {
        return this.api.get<Product>(`/admin/products/${id}`).pipe(
            tap(res => this.currentProduct.set(res))
        );
    }

    createProduct(productData: FormData): Observable<Product> {
        return this.api.post<Product>('/admin/products', productData).pipe(
            tap(res => {
                // Optimistically add to the signal array
                this.products.update(current => [...current, res]);
            })
        );
    }

    updateProduct(id: string, productData: FormData): Observable<Product> {
        return this.api.put<Product>(`/admin/products/${id}`, productData).pipe(
            tap(res => {
                this.products.update(current =>
                    current.map(p => p._id === id ? res : p)
                );
            })
        );
    }

    deleteProduct(id: string): Observable<any> {
        return this.api.delete(`/admin/products/${id}`).pipe(
            tap(() => {
                this.products.update(current => current.filter(p => p._id !== id));
            })
        );
    }
}
