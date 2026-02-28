import {
    Component, Input, Output, EventEmitter, ContentChild, ViewChild,
    AfterViewInit, OnChanges, OnDestroy, ElementRef,
    ChangeDetectorRef, ChangeDetectionStrategy, SimpleChanges, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { VsGridItemDirective } from '../directive/vs-grid-item.directive';
import { VsListItemDirective } from '../directive/vs-list-item.directive';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

@Component({
    selector: 'vs-viewport',
    standalone: true,
    imports: [CommonModule, ScrollingModule],
    templateUrl: './vs-viewport.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VsViewportComponent implements AfterViewInit, OnChanges, OnDestroy {

    @ContentChild(VsGridItemDirective) gridItemDir?: VsGridItemDirective;
    @ContentChild(VsListItemDirective) listItemDir?: VsListItemDirective;

    /** The flat array of products (already filtered + sorted) */
    @Input() items: any[] = [];
    @Input() mode: 'grid' | 'list' = 'grid';

    /** Height of one GRID ROW in px (card height + gap). Default suits a 420px card. */
    @Input() gridRowHeight = 460;

    /** Height of one LIST item in px (card height + gap). */
    @Input() listItemHeight = 192;

    /** Minimum card width driving auto-fill columns. */
    @Input() itemMinWidth = 280;

    /** Optional explicit viewport height in px. Defaults to window.innerHeight - 250. */
    @Input() viewportHeightPx?: number;

    /** Emits when user scrolls near the end — hook up to productService.loadMore() */
    @Output() loadMore = new EventEmitter<void>();

    // Derived state used by template
    gridRows: any[][] = [];
    vsHeight = '80vh';

    private itemsByRow = 4;
    private destroy$ = new Subject<void>();
    private _gridViewport?: CdkVirtualScrollViewport;
    private _listViewport?: CdkVirtualScrollViewport;

    constructor(
        private cdr: ChangeDetectorRef,
        private el: ElementRef,
        private zone: NgZone
    ) { }

    // ── ViewChild setters allow @if-guarded templates to register viewports ──

    @ViewChild('gridVp') set gridVpRef(vp: CdkVirtualScrollViewport) {
        if (vp && vp !== this._gridViewport) {
            this._gridViewport = vp;
            this.attachScrollListener(vp, () => this.gridRows.length);
        }
    }

    @ViewChild('listVp') set listVpRef(vp: CdkVirtualScrollViewport) {
        if (vp && vp !== this._listViewport) {
            this._listViewport = vp;
            this.attachScrollListener(vp, () => this.items.length);
        }
    }

    ngAfterViewInit() {
        this.computeHeight();
        this.recalcGrid();

        this.zone.runOutsideAngular(() => {
            fromEvent(window, 'resize').pipe(
                debounceTime(200),
                takeUntil(this.destroy$)
            ).subscribe(() => {
                this.zone.run(() => {
                    this.computeHeight();
                    this.recalcGrid();
                    this.cdr.markForCheck();
                });
            });
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['items'] || changes['mode'] || changes['itemMinWidth']) {
            this.recalcGrid();
        }
    }

    // ── Helpers ──

    private computeHeight() {
        this.vsHeight = this.viewportHeightPx
            ? `${this.viewportHeightPx}px`
            : `${window.innerHeight - 250}px`;
    }

    private recalcGrid() {
        const hostWidth = (this.el.nativeElement as HTMLElement).offsetWidth
            || window.innerWidth;
        const gap = 20;
        this.itemsByRow = Math.max(1,
            Math.floor((hostWidth + gap) / (this.itemMinWidth + gap))
        );

        const rows: any[][] = [];
        for (let i = 0; i < this.items.length; i += this.itemsByRow) {
            rows.push(this.items.slice(i, i + this.itemsByRow));
        }
        this.gridRows = rows;
    }

    /** Emit loadMore when within 4 rows / items of the end */
    private attachScrollListener(
        vp: CdkVirtualScrollViewport,
        totalFn: () => number
    ) {
        vp.scrolledIndexChange.pipe(takeUntil(this.destroy$))
            .subscribe(idx => {
                if (idx >= totalFn() - 4) {
                    this.loadMore.emit();
                }
            });
    }

    gridColStyle(): string {
        return `repeat(auto-fill, minmax(${this.itemMinWidth}px, 1fr))`;
    }

    trackByRow(_: number, row: any[]): any {
        return row[0]?._id ?? _;
    }

    trackByItem(_: number, item: any): any {
        return item?._id ?? _;
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
