import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const requiredRoles = route.data['roles'] as string[];
    
    // Check if route has role constraints and validates against user role
    if (!requiredRoles || authService.hasRole(requiredRoles)) {
      return true;
    }

    // Role unauthorized, redirect to base entrypoint
    router.navigate(['/']);
    return false;
  }

  // Not authenticated, redirect to login page with return redirection url
  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
