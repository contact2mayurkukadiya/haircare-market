import { Directive, TemplateRef, inject } from '@angular/core';

@Directive({
    selector: 'ng-template[vsListItem]',
    standalone: true
})
export class VsListItemDirective {
    readonly template = inject(TemplateRef<{ $implicit: any }>);
}
