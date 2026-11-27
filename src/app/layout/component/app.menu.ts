import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { PerfilService } from '@/_service/perfil.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];
    private readonly destroyRef = inject(DestroyRef);

    constructor(private perfil: PerfilService) {}

    /** Menu por perfil: admin ve tudo; operador so Notas ERP; sem perfil, nada. */
    ngOnInit() {
        // Dispara o /me (falha transitoria e tratada pelo guard); o menu segue o ultimo perfil obtido.
        this.perfil.usuario().subscribe({ error: () => {} });
        this.perfil.usuarioCarregado$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((u) => {
            const notasErp = { label: 'Notas ERP', icon: 'pi pi-fw pi-file-import', routerLink: ['/notas-erp'] };
            if (u?.perfil === 'ADMIN') {
                this.model = [
                    {
                        label: 'Home',
                        items: [
                            { label: 'Jobs',     icon: 'pi pi-fw pi-calendar-clock', routerLink: ['/'] },
                            { label: 'Companys', icon: 'pi pi-fw pi-building',       routerLink: ['/companys'] },
                            { label: 'Tasks',    icon: 'pi pi-fw pi-list-check',     routerLink: ['/tasks'] },
                            notasErp
                        ]
                    },
                    {
                        label: 'Administração',
                        items: [{ label: 'Cache de filiais', icon: 'pi pi-fw pi-database', routerLink: ['/cache-filiais'] }]
                    }
                ];
            } else if (u?.perfil === 'OPERADOR') {
                this.model = [{ label: 'Home', items: [notasErp] }];
            } else {
                this.model = [];
            }
        });
    }
}
