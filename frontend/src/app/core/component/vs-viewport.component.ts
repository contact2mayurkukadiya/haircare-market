import {
    Component, Input, Output, EventEmitter, ContentChild, ViewChild,
    AfterViewInit, OnChanges, OnDestroy, ElementRef,
    ChangeDetectorRef, ChangeDetectionStrategy, SimpleChanges, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { VsGridItemDirective } from '../directive/vs-grid-item.directive';
import { VsListItemDirective } from '../directive/vs-list-item.directive';

@Component({
    selector: 'vs-viewport',
    standalone: true,
    imports: [CommonModule, ScrollingModule],   // ScrollingModule exports CdkVirtualScrollableWindow
    templateUrl: './vs-viewport.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class VsViewportComponent implements AfterViewInit, OnChanges, OnDestroy {

    @ContentChild(VsGridItemDirective) gridItemDir?: VsGridItemDirective;
    @ContentChild(VsListItemDirective) listItemDir?: VsListItemDirective;

    @Input() items: any[] = [];
    @Input() mode: 'grid' | 'list' = 'grid';
    @Input() gridRowHeight = 440;   // one grid ROW height (card + gap)
    @Input() listItemHeight = 176;  // one list item height (card + gap)
    @Input() itemMinWidth = 280;    // min card width for auto-fill columns

    /** Emits when window scroll nears the bottom — connect to productService.loadMore() */
    // @Output() loadMore = new EventEmitter<void>();

    gridRows: any[][] = [];

    private itemsByRow = 4;
    private destroy$ = new Subject<void>();

    constructor(
        private cdr: ChangeDetectorRef,
        private el: ElementRef,
        private zone: NgZone
    ) { }

    ngAfterViewInit() {
        this.recalcGrid();

        // ── Resize → recalculate columns ──────────────────────────────────────────
        this.zone.runOutsideAngular(() => {
            fromEvent(window, 'resize').pipe(
                debounceTime(200),
                takeUntil(this.destroy$)
            ).subscribe(() => {
                this.zone.run(() => {
                    this.recalcGrid();
                    this.cdr.markForCheck();
                });
            });
        });

        // ── Window scroll → emit loadMore when nearing page bottom ────────────────
        // Replaces IntersectionObserver; works because scrollWindow uses window scroll
        // this.zone.runOutsideAngular(() => {
        //     fromEvent(window, 'scroll').pipe(
        //         debounceTime(100),
        //         takeUntil(this.destroy$)
        //     ).subscribe(() => {
        //         const scrolledTo = window.scrollY + window.innerHeight;
        //         const pageHeight = document.documentElement.scrollHeight;
        //         if (scrolledTo >= pageHeight - 400) {
        //             this.zone.run(() => this.loadMore.emit());
        //         }
        //     });
        // });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['items'] || changes['mode'] || changes['itemMinWidth']) {
            this.recalcGrid();
        }
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

    gridColStyle(): string {
        return `repeat(auto-fill, minmax(${this.itemMinWidth}px, 1fr))`;
    }

    trackByRow(_: number, row: any[]): any { return row[0]?._id ?? _; }
    trackByItem(_: number, item: any): any { return item?._id ?? _; }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
