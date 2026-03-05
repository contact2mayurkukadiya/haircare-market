import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService, Product } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NzIconModule, NzSkeletonModule, ProductCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cart = inject(CartService);

  featuredProducts = computed(() =>
    this.productService.products().filter(p => p.isFeatured && p.isActive).slice(0, 6)
  );

  reasons = [
    { icon: '🌿', title: '100% Natural', desc: 'All products are made from natural, organic ingredients.' },
    { icon: '🚚', title: 'Fast Delivery', desc: 'Quick and safe delivery right to your doorstep.' },
    { icon: '💯', title: 'Quality Assured', desc: 'Each product is dermatologist tested and approved.' },
    { icon: '🔄', title: 'Easy Returns', desc: '30-day hassle-free return policy.' },
  ];

  ngOnInit(): void {
    this.productService.loadAll().subscribe();
    this.categoryService.loadAll().subscribe();
  }

  getCatIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('shampoo')) return '🧴';
    if (n.includes('condition')) return '💧';
    if (n.includes('oil')) return '✨';
    if (n.includes('mask') || n.includes('treat')) return '🌸';
    if (n.includes('serum')) return '💫';
    if (n.includes('color')) return '🎨';
    if (n.includes('style')) return '💇';
    return '🌿';
  }

  // getCategoryName(product: Product): string {
  //   if (product.category && typeof product.category === 'object') {
  //     return (product.category as any).name ?? '';
  //   }
  //   return '';
  // }

  // formatPrice(price: number): string {
  //   return '$' + price.toFixed(2);
  // }

  // addToCart(product: Product, event: Event): void {
  //   event.preventDefault();
  //   event.stopPropagation();
  //   this.cart.add(product);
  // }
}
