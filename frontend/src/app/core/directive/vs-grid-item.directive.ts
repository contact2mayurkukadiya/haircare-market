import { Directive, TemplateRef, inject } from '@angular/core';

@Directive({
    selector: 'ng-template[vsGridItem]',
    standalone: true
})
export class VsGridItemDirective {
    readonly template = inject(TemplateRef<{ $implicit: any }>);
}
