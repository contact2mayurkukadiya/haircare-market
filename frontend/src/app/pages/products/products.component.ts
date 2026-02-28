import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, Product, Category } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NzIconModule, NzSelectModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cart = inject(CartService);
  private route = inject(ActivatedRoute);

  @ViewChild('scrollSentinel') scrollSentinel!: ElementRef;
  private intersectionObserver?: IntersectionObserver;

  viewMode: ViewMode = 'grid';
  sortOption = 'default';
  inStockOnly = false;
  selectedCat = signal<string | null>(null);
  selectedRange = signal<string | null>(null);

  private readonly PAGE_SIZE = 12;
  readonly GRID_COLUMNS = 4; // Adjust based on your design

  priceRanges = [
    { label: 'Under $20', min: 0, max: 20 },
    { label: '$20 - $50', min: 20, max: 50 },
    { label: '$50 - $100', min: 50, max: 100 },
    { label: 'Over $100', min: 100, max: Infinity },
  ];
  private selectedPriceRange: { min: number; max: number } | null = null;

  /** Client-side filter/sort applied on top of loaded pages */
  filteredProducts = computed(() => {
    let list = this.productService.products().filter(p => p.isActive);
    const cat = this.selectedCat();
    if (cat) {
      list = list.filter(p => {
        if (p.category && typeof p.category === 'object') return (p.category as Category)._id === cat;
        return p.category === cat;
      });
    }
    if (this.selectedPriceRange) {
      const { min, max } = this.selectedPriceRange;
      list = list.filter(p => p.price >= min && p.price <= max);
    }
    if (this.inStockOnly) list = list.filter(p => p.stock > 0);
    switch (this.sortOption) {
      case 'price-asc': return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'name-asc': return [...list].sort((a, b) => a.name.localeCompare(b.name));
      default: return list;
    }
  });


  ngOnInit(): void {
    this.productService.loadAll(1, this.PAGE_SIZE).subscribe();
    this.categoryService.loadAll().subscribe();
    this.route.queryParams.subscribe(params => {
      if (params['cat']) this.selectedCat.set(params['cat']);
    });
  }

  ngAfterViewInit(): void {
    this.setupInfiniteScroll();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.hoverIntervals.forEach(clearInterval);
  }

  private setupInfiniteScroll(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && this.productService.hasMore() && !this.productService.loadingMore()) {
          this.productService.loadMore(this.PAGE_SIZE).subscribe();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // Start loading a bit earlier
      }
    );

    if (this.scrollSentinel?.nativeElement) {
      this.intersectionObserver.observe(this.scrollSentinel.nativeElement);
    }
  }

  selectCat(id: string | null): void {
    this.selectedCat.set(id);
    this.productService.loadAll(1, this.PAGE_SIZE).subscribe();
  }

  selectRange(range: { label: string; min: number; max: number }): void {
    if (this.selectedRange() === range.label) {
      this.selectedRange.set(null); this.selectedPriceRange = null;
    } else {
      this.selectedRange.set(range.label); this.selectedPriceRange = range;
    }
  }

  applyFilters(): void { }

  getCatName(product: Product): string {
    if (product.category && typeof product.category === 'object') return (product.category as Category).name;
    return '';
  }

  formatPrice(price: number): string { return '$' + price.toFixed(2); }
  addToCart(product: Product): void { this.cart.add(product); }

  /* ── Hover Image Carousel ── */
  hoveredProduct: string | null = null;
  hoverIntervals = new Map<string, ReturnType<typeof setInterval>>();
  cardImageIndexes = new Map<string, number>();

  getCardImage(product: Product): string {
    if (!product.images?.length) return '';
    const idx = this.cardImageIndexes.get(product._id) ?? 0;
    return product.images[Math.min(idx, product.images.length - 1)];
  }

  onImageMouseEnter(product: Product): void {
    if (!product.images || product.images.length <= 1) return;
    this.hoveredProduct = product._id;

    // Clear potentially existing interval
    if (this.hoverIntervals.has(product._id)) {
      clearInterval(this.hoverIntervals.get(product._id));
    }

    this.cardImageIndexes.set(product._id, 0);
    const interval = setInterval(() => {
      const current = this.cardImageIndexes.get(product._id) ?? 0;
      this.cardImageIndexes.set(product._id, (current + 1) % product.images.length);
    }, 700);
    this.hoverIntervals.set(product._id, interval);
  }

  onImageMouseLeave(product: Product): void {
    this.hoveredProduct = null;
    const interval = this.hoverIntervals.get(product._id);
    if (interval) {
      clearInterval(interval);
      this.hoverIntervals.delete(product._id);
    }
    this.cardImageIndexes.set(product._id, 0);
  }

  getImageDotsCount(product: Product): number[] {
    return product.images?.length > 1 ? Array.from({ length: product.images.length }, (_, i) => i) : [];
  }


  trackByProductId(index: number, product: Product): string {
    return product._id;
  }
}
