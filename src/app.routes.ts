import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { CompanysComponent } from '@/pages/companys/companys.component';
import { TasksComponent } from '@/pages/tasks/tasks.component';
import { NotasErpComponent } from '@/pages/notas-erp/notas-erp.component';
import { Jobs as JobsComponent } from '@/pages/jobs/jobs.component';
import { canActivateAuth } from '@/core/keycloak/auth.guard';
import { perfilGuard } from '@/core/perfil.guard';
import { CacheFiliaisComponent } from '@/pages/cache-filiais/cache-filiais.component';
import { SemPerfilComponent } from '@/pages/sem-perfil/sem-perfil.component';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [canActivateAuth],
        children: [
            // Perfis: admin ve tudo; operador so Notas ERP (o back tambem recusa com 403).
            { path: '', component: JobsComponent, canActivate: [perfilGuard('ADMIN')] },
            { path: 'companys', component: CompanysComponent, canActivate: [perfilGuard('ADMIN')] },
            { path: 'tasks', component: TasksComponent, canActivate: [perfilGuard('ADMIN')] },
            { path: 'cache-filiais', component: CacheFiliaisComponent, canActivate: [perfilGuard('ADMIN')] },
            { path: 'notas-erp', component: NotasErpComponent, canActivate: [perfilGuard('ADMIN', 'OPERADOR')] },
            { path: 'sem-perfil', component: SemPerfilComponent },
        ]
    },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
