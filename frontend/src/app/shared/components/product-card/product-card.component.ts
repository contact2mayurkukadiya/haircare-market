import { Component, inject, Input, signal } from '@angular/core';
import { Category, Product } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-card',
  imports: [CommonModule, RouterLink, NzIconModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {
  @Input
    ({ required: true }) product!: Product;

  cart = inject(CartService);

  // State for image slider
  currentIndex = signal(0);
  isHovered = signal(false);
  imagesLoaded = signal(false); // Only load secondary images on hover/interaction
  disableTransition = signal(false); // To reset slider instantly without animation

  private intervalId: any;

  get dots(): number[] {
    return Array.from({ length: this.product.images?.length || 0 }, (_, i) => i);
  }

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
    // Always show first image. Only show others if we've hovered at least once
    if (index === 0) return this.product.images[0];
    return this.imagesLoaded() ? this.product.images[index] : null; // Lazy load logic
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

    this.isHovered.set(true);
    this.imagesLoaded.set(true); // Trigger fetch of other images
    this.currentIndex.set(0);

    // Clear existing to be safe
    if (this.intervalId) clearInterval(this.intervalId);

    const total = this.product.images.length;

    this.intervalId = setInterval(() => {
      const next = this.currentIndex() + 1;

      if (next >= total) {
        // Reset to 0 instantly (simulating infinite loop effect or just restart)
        this.disableTransition.set(true);
        this.currentIndex.set(0);

        // Re-enable transition in next frame
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.disableTransition.set(false);
          });
        });
      } else {
        this.currentIndex.set(next);
      }
    }, 1200); // 1.2s per slide
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentIndex.set(0); // Reset to cover image
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
