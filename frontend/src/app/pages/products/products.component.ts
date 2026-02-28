import {
  Component, OnInit, OnDestroy, inject, signal, computed, AfterViewInit,
  WritableSignal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, Product, Category, ProductQueryFilters } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { CartService } from '../../core/services/cart.service';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { VsViewportComponent } from '../../core/component/vs-viewport.component';
import { VsGridItemDirective } from '../../core/directive/vs-grid-item.directive';
import { VsListItemDirective } from '../../core/directive/vs-list-item.directive';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    NzIconModule, NzSelectModule,
    VsViewportComponent, VsGridItemDirective, VsListItemDirective  // ← add these
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit, OnDestroy {
  productService = inject(ProductService);
  categoryService = inject(CategoryService);
  cart = inject(CartService);
  private route = inject(ActivatedRoute);

  selectedCat = signal<string | null>(null);
  selectedRange = signal<string | null>(null);
  inStockOnly: WritableSignal<boolean> = signal<boolean>(false);
  sortOption = signal<'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | null>(null);
  searchTerm = signal<string>('');
  private searchInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  viewMode: ViewMode = 'grid';

  hoveredProduct: string | null = null;
  // Tracks which products have had their extra images unlocked (src set)
  private loadedProducts = new Set<string>();
  // Current active slide index per product
  cardImageIndexes = new Map<string, number>();
  // Products temporarily with transition:none (for instant reset to slide 0)
  private noTransitionProducts = new Set<string>();
  private hoverIntervals = new Map<string, ReturnType<typeof setInterval>>();


  private readonly PAGE_SIZE = 24; // Larger page since virtual scroll handles rendering

  priceRanges = [
    { label: 'Under $20', min: 0, max: 20 },
    { label: '$20 - $50', min: 20, max: 50 },
    { label: '$50 - $100', min: 50, max: 100 },
    { label: 'Over $100', min: 100, max: Infinity },
  ];
  selectedPriceRange = signal<{ label: string; min: number; max: number } | null>(null);

  filteredProducts = computed(() => this.productService.products());
  hasActiveFilters = computed(() => {
    const hasCategory = !!this.selectedCat();
    const hasPrice = !!this.selectedPriceRange();
    const hasStock = this.inStockOnly();
    const hasSort = !!this.sortOption();
    const hasSearch = this.searchTerm().trim().length > 0;

    return hasCategory || hasPrice || hasStock || hasSort || hasSearch;
  });


  private buildFilterPayload(): ProductQueryFilters {
    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    if (this.selectedPriceRange()) {
      minPrice = this.selectedPriceRange()!.min;
      maxPrice = this.selectedPriceRange()!.max === Infinity ? null : this.selectedPriceRange()!.max;
    }

    return {
      category: this.selectedCat(),
      minPrice,
      maxPrice,
      inStock: this.inStockOnly() ? true : null,
      search: this.searchTerm().trim() || null,
      sort: this.sortOption(),
    };
  }


  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['cat']) this.selectedCat.set(params['cat']);
      this.productService.loadAll(1, this.PAGE_SIZE, this.buildFilterPayload()).subscribe();
    });

    this.categoryService.loadAll().subscribe();

    this.searchInput$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
      )
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.productService
          .loadAll(1, this.PAGE_SIZE, this.buildFilterPayload())
          .subscribe();
      });
  }

  /** Called by vs-viewport's (loadMore) output */
  onLoadMore(): void {
    if (this.productService.hasMore() && !this.productService.loadingMore()) {
      this.productService.loadMore(this.PAGE_SIZE, this.buildFilterPayload()).subscribe();
    }
  }

  selectCat(id: string | null): void {
    this.selectedCat.set(id);
    this.productService.loadAll(1, this.PAGE_SIZE, this.buildFilterPayload()).subscribe();
  }


  selectRange(range: { label: string; min: number; max: number }): void {
    if (this.selectedRange() === range.label) {
      this.selectedRange.set(null);
      this.selectedPriceRange.set(null);
    } else {
      this.selectedRange.set(range.label);
      this.selectedPriceRange.set(range);
    }
    this.productService.loadAll(1, this.PAGE_SIZE, this.buildFilterPayload()).subscribe();
  }

  toggleInStockOnly(): void {
    this.productService.loadAll(1, this.PAGE_SIZE, this.buildFilterPayload()).subscribe();
  }

  onSortChange(value: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | null): void {
    this.sortOption.set(value);
    this.productService.loadAll(1, this.PAGE_SIZE, this.buildFilterPayload()).subscribe();
  }

  onSearchChange(value: string): void {
    this.searchInput$.next(value);
  }


  applyFilters(): void {
    // if you want a dedicated "Apply" button, call this
    this.productService.loadAll(1, this.PAGE_SIZE, this.buildFilterPayload()).subscribe();
  }

  resetFilters(): void {
    // clear UI state
    this.selectedCat.set(null);
    this.selectedRange.set(null);
    this.selectedPriceRange.set(null);
    this.inStockOnly.set(false);
    this.sortOption.set(null);
    this.searchTerm.set('');

    // reload first page with no filters
    this.productService.loadAll(1, this.PAGE_SIZE, this.buildFilterPayload()).subscribe();
  }


  getCatName(product: Product): string {
    if (product.category && typeof product.category === 'object')
      return (product.category as Category).name;
    return '';
  }

  formatPrice(price: number): string { return '$' + price.toFixed(2); }
  addToCart(product: Product): void { this.cart.add(product); }

  /* ── Hover Image Carousel (unchanged) ── */

  getImageSrc(product: Product, index: number): string | null {
    if (!product.images?.length) return null;
    if (index === 0) return product.images[0];
    return this.loadedProducts.has(product._id) ? product.images[index] : null;
  }
  /** CSS transform to slide the strip to the active index */
  getSliderTransform(product: Product): string {
    const n = product.images?.length ?? 1;
    if (n <= 1) return 'translateX(0)';
    const idx = this.cardImageIndexes.get(product._id) ?? 0;
    return `translateX(-${(idx / n) * 100}%)`;
  }

  /** Transition is disabled momentarily when resetting from last → first */
  getSliderTransition(product: Product): string {
    return this.noTransitionProducts.has(product._id)
      ? 'none'
      : 'transform 0.45s ease-in-out';
  }

  onImageMouseEnter(product: Product): void {
    if (!product.images || product.images.length <= 1) return;

    // ① Unlock src for all images of this product (browser fetches in background)
    this.loadedProducts.add(product._id);
    this.hoveredProduct = product._id;

    // ② Clear any lingering interval
    const existing = this.hoverIntervals.get(product._id);
    if (existing) clearInterval(existing);

    // ③ Reset to first slide
    this.cardImageIndexes.set(product._id, 0);

    // ④ Advance slide every 900ms (longer than 450ms transition so slides complete)
    const total = product.images.length;
    const interval = setInterval(() => {
      const current = this.cardImageIndexes.get(product._id) ?? 0;
      const next = current + 1;

      if (next >= total) {
        // Instant jump back to first: disable transition → set 0 → re-enable
        this.noTransitionProducts.add(product._id);
        this.cardImageIndexes.set(product._id, 0);

        // One rAF is enough for the browser to apply the no-transition state
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.noTransitionProducts.delete(product._id);
          });
        });
      } else {
        this.cardImageIndexes.set(product._id, next);
      }
    }, 900);

    this.hoverIntervals.set(product._id, interval);
  }

  onImageMouseLeave(product: Product): void {
    this.hoveredProduct = null;
    const interval = this.hoverIntervals.get(product._id);
    if (interval) {
      clearInterval(interval);
      this.hoverIntervals.delete(product._id);
    }
    // Slide back to first image (animated — looks like a natural rewind)
    this.cardImageIndexes.set(product._id, 0);
  }

  getImageDotsCount(product: Product): number[] {
    return product.images?.length > 1
      ? Array.from({ length: product.images.length }, (_, i) => i)
      : [];
  }

  ngOnDestroy(): void {
    this.hoverIntervals.forEach(clearInterval);
    this.destroy$.next();
    this.destroy$.complete();

  }
}
