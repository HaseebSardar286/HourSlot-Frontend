import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/customer/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'business/register',
    loadComponent: () => import('./features/business/register-business/register-business.component').then(m => m.RegisterBusinessComponent),
    canActivate: [authGuard],
    data: { roles: ['BUSINESS_ADMIN'] }
  },
  {
    path: 'business/dashboard',
    loadComponent: () => import('./features/business/dashboard/dashboard.component').then(m => m.BusinessDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['BUSINESS_ADMIN', 'BUSINESS_STAFF'] }
  },
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
