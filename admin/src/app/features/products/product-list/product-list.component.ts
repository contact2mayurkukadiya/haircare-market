import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { ProductService, Product } from '../../../core/services/product.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-product-list',
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
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  public api = inject(ApiService);
  private router = inject(Router);
  private message = inject(NzMessageService);

  // Expose the signal to the template
  products = this.productService.products;

  // Tracks the currently visible image index per product id
  activeImageIndex = new Map<string, number>();

  // Tracks whether the slide-out animation is in progress per product id
  sliding = new Map<string, boolean>();

  // Holds the interval reference per product id
  private hoverTimers = new Map<string, ReturnType<typeof setInterval>>();

  ngOnInit(): void {
    this.productService.loadAllProducts().subscribe({
      error: (err) => this.message.error('Failed to load products: ' + (err.error?.message || err.message))
    });
  }

  ngOnDestroy(): void {
    this.hoverTimers.forEach(timer => clearInterval(timer));
  }

  // ─── Image hover cycling ──────────────────────────────────────────────────

  onImageHoverStart(product: Product): void {
    if (!product.images || product.images.length <= 1) return;

    // Initialise index if not already tracked
    if (!this.activeImageIndex.has(product._id)) {
      this.activeImageIndex.set(product._id, 0);
    }

    const timer = setInterval(() => {
      // Trigger slide-out animation
      this.sliding.set(product._id, true);

      setTimeout(() => {
        // Advance index (wrap around infinitely)
        const current = this.activeImageIndex.get(product._id) ?? 0;
        this.activeImageIndex.set(product._id, (current + 1) % product.images.length);

        // Remove sliding class so next image slides in
        this.sliding.set(product._id, false);
      }, 300); // half of the CSS transition duration

    }, 1400); // total time per image (visible + transition)

    this.hoverTimers.set(product._id, timer);
  }

  onImageHoverEnd(product: Product): void {
    const timer = this.hoverTimers.get(product._id);
    if (timer) {
      clearInterval(timer);
      this.hoverTimers.delete(product._id);
    }
    // Reset to first image and clear sliding state for performance
    this.sliding.set(product._id, false);
    this.activeImageIndex.set(product._id, 0);
  }

  getActiveImage(product: Product): string {
    if (!product.images || product.images.length === 0) return '/placeholder.webp';
    const idx = this.activeImageIndex.get(product._id) ?? 0;
    return product.images[idx];
  }

  isSliding(productId: string): boolean {
    return this.sliding.get(productId) ?? false;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  editProduct(product: Product): void {
    this.router.navigate(['/admin/products', product._id, 'edit']);
  }

  deleteProduct(id: string): void {
    this.productService.deleteProduct(id).subscribe({
      next: () => this.message.success('Product deleted successfully'),
      error: (err) => this.message.error('Failed to delete product: ' + (err.error?.message || err.message))
    });
  }

  createProduct() {
    this.router.navigate(['/admin/products/new']);
  }
}
