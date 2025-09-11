import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { CompanysComponent } from '@/pages/companys/companys.component';
import { TasksComponent } from '@/pages/tasks/tasks.component';
import { Jobs as JobsComponent } from '@/pages/jobs/jobs.component';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            { path: '', component: JobsComponent },
            { path: 'companys', component: CompanysComponent },
            { path: 'tasks', component: TasksComponent },
        ]
    },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
