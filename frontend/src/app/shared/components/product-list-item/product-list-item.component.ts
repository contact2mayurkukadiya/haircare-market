import { CommonModule } from '@angular/common';
import { Component, inject, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Category, Product } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-product-list-item',
  imports: [CommonModule, RouterLink, NzIconModule],
  templateUrl: './product-list-item.component.html',
  styleUrl: './product-list-item.component.scss'
})
export class ProductListItemComponent {
  @Input({ required: true }) product!: Product;

  cart = inject(CartService);

  // State for image slider (Copied logic for consistency)
  currentIndex = signal(0);
  imagesLoaded = signal(false);
  disableTransition = signal(false);

  private intervalId: any;

  getCategoryName(): string {
    if (this.product.category && typeof this.product.category === 'object') {
      return (this.product.category as Category).name;
    }
    return '';
  }

  formatPrice(price: number): string {
    return '$' + price.toFixed(2);
  }

  addToCart(e: Event): void {
    e.stopPropagation();
    e.preventDefault();
    this.cart.add(this.product);
  }

  // --- Slider Logic ---

  getImageSrc(index: number): string | null {
    if (!this.product.images?.length) return null;
    if (index === 0) return this.product.images[0];
    return this.imagesLoaded() ? this.product.images[index] : null;
  }

  getSliderTransform(): string {
    const n = this.product.images?.length ?? 1;
    if (n <= 1) return 'translateX(0)';
    return `translateX(-${(this.currentIndex() / n) * 100}%)`;
  }

  getSliderTransition(): string {
    return this.disableTransition() ? 'none' : 'transform 0.45s ease-in-out';
  }

  onMouseEnter(): void {
    if (!this.product.images || this.product.images.length <= 1) return;
    this.imagesLoaded.set(true);
    this.currentIndex.set(0);

    if (this.intervalId) clearInterval(this.intervalId);

    const total = this.product.images.length;
    this.intervalId = setInterval(() => {
      const next = this.currentIndex() + 1;
      if (next >= total) {
        this.disableTransition.set(true);
        this.currentIndex.set(0);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.disableTransition.set(false);
          });
        });
      } else {
        this.currentIndex.set(next);
      }
    }, 1200);
  }

  onMouseLeave(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentIndex.set(0);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
