import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'products', loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent) },
    { path: 'products/:id', loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent) },
    { path: 'cart', loadComponent: () => import('./pages/cart/cart.component').then(m => m.CartComponent) },
    { path: 'auth/login', loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'auth/register', loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent) },
    { path: 'auth/verify-otp', loadComponent: () => import('./pages/auth/verify-otp/verify-otp.component').then(m => m.VerifyOtpComponent) },
    { path: '**', redirectTo: '' },
];

