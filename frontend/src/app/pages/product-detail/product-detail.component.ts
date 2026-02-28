import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ProductService, Category } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NzIconModule, NzSkeletonModule],
  providers: [NzMessageService],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  productService = inject(ProductService);
  cart = inject(CartService);
  private route = inject(ActivatedRoute);
  private message = inject(NzMessageService);
  product = this.productService.currentProduct;
  qty = signal(1);

  activeIndex = 0;
  activeImage = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.productService.loadById(id).subscribe(() => {
        const p = this.product();
        if (p?.images?.length) {
          this.activeImage = p.images[0];
          this.activeIndex = 0;
        }
      });
    }
  }

  selectImage(index: number, url: string): void {
    this.activeIndex = index;
    this.activeImage = url;
  }

  nextImage(): void {
    const imgs = this.product()?.images ?? [];
    if (this.activeIndex < imgs.length - 1) {
      this.activeIndex++;
      this.activeImage = imgs[this.activeIndex];
    }
  }

  prevImage(): void {
    const imgs = this.product()?.images ?? [];
    if (this.activeIndex > 0) {
      this.activeIndex--;
      this.activeImage = imgs[this.activeIndex];
    }
  }

  incQty(): void { if (this.qty() < (this.product()?.stock ?? 1)) this.qty.update(v => v + 1); }
  decQty(): void { if (this.qty() > 1) this.qty.update(v => v - 1); }

  addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.cart.add(p, this.qty());
    this.message.success(`${p.name} added to cart!`);
  }

  getCatName(): string {
    const p = this.product();
    if (!p) return '';
    if (p.category && typeof p.category === 'object') return (p.category as Category).name;
    return '';
  }

  formatPrice(price: number): string { return '$' + price.toFixed(2); }
}
