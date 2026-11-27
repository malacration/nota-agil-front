import { Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-footer',
    template: `<div class="layout-footer">
        Nota Ágil &copy; {{ year }} — desenvolvido por
        <span class="text-primary font-bold">AR Soluções</span>
    </div>`
})
export class AppFooter {
    readonly year = new Date().getFullYear();
}
