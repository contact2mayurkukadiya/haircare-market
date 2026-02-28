import { Injectable, signal, computed } from '@angular/core';
import { Product } from './product.service';

export interface CartItem {
    product: Product;
    quantity: number;
}

const CART_KEY = 'hc_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
    private _items = signal<CartItem[]>(this.loadFromStorage());

    readonly items = this._items.asReadonly();
    readonly count = computed(() => this._items().reduce((sum, i) => sum + i.quantity, 0));
    readonly total = computed(() =>
        this._items().reduce((sum, i) => sum + i.product.price * i.quantity, 0)
    );

    private loadFromStorage(): CartItem[] {
        try {
            const raw = localStorage.getItem(CART_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    private saveToStorage(): void {
        localStorage.setItem(CART_KEY, JSON.stringify(this._items()));
    }

    add(product: Product, qty = 1): void {
        const current = this._items();
        const idx = current.findIndex(i => i.product._id === product._id);
        if (idx >= 0) {
            const updated = [...current];
            updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
            this._items.set(updated);
        } else {
            this._items.set([...current, { product, quantity: qty }]);
        }
        this.saveToStorage();
    }

    updateQty(productId: string, qty: number): void {
        if (qty <= 0) { this.remove(productId); return; }
        this._items.update(items =>
            items.map(i => i.product._id === productId ? { ...i, quantity: qty } : i)
        );
        this.saveToStorage();
    }

    remove(productId: string): void {
        this._items.update(items => items.filter(i => i.product._id !== productId));
        this.saveToStorage();
    }

    clear(): void {
        this._items.set([]);
        localStorage.removeItem(CART_KEY);
    }

    isInCart(productId: string): boolean {
        return this._items().some(i => i.product._id === productId);
    }

    getQty(productId: string): number {
        return this._items().find(i => i.product._id === productId)?.quantity ?? 0;
    }
}
