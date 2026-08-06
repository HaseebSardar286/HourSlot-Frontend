import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage: string | null = null;
  loading = false;

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    const email = this.loginForm.value.email as string;
    const password = this.loginForm.value.password as string;

    this.authService.login({ email, password }).subscribe({
      next: (session) => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || this.getDashboardRoute(session.role);
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }

  private getDashboardRoute(role: string): string {
    switch (role) {
      case 'PLATFORM_ADMIN': return '/admin/dashboard';
      case 'BUSINESS_ADMIN':
      case 'BUSINESS_STAFF': return '/business/dashboard';
      default: return '/';
    }
  }
}
