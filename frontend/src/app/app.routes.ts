import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { ProfileLayoutComponent } from './pages/profile/layout/profile-layout.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'products', loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent) },
    { path: 'products/:id', loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent) },
    { path: 'cart', loadComponent: () => import('./pages/cart/cart.component').then(m => m.CartComponent) },
    { path: 'auth/login', loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
    { path: 'auth/register', loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent) },
    { path: 'auth/verify-otp', loadComponent: () => import('./pages/auth/verify-otp/verify-otp.component').then(m => m.VerifyOtpComponent) },
    { path: 'auth/forgot-password', loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
    { path: 'auth/reset-password', loadComponent: () => import('./pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
    { path: 'about', loadComponent: () => import('./pages/info/about/about.component').then(m => m.AboutComponent) },
    { path: 'contact', loadComponent: () => import('./pages/info/contact/contact.component').then(m => m.ContactComponent) },
    { path: 'privacy-policy', loadComponent: () => import('./pages/info/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent) },
    {
        path: 'profile',
        component: ProfileLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'details', pathMatch: 'full' },
            {
                path: 'details',
                loadComponent: () => import('./pages/profile/details/profile-details.component').then(m => m.ProfileDetailsComponent)
            },
            {
                path: 'security',
                loadComponent: () => import('./pages/profile/security/profile-security.component').then(m => m.ProfileSecurityComponent)
            },
            {
                path: 'payments',
                loadComponent: () => import('./pages/profile/payments/profile-payments.component').then(m => m.ProfilePaymentsComponent)
            }
        ]
    },
    { path: '**', redirectTo: '' },
];

