import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface UserSession {
  token: String;
  refreshToken: String;
  id: number;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  authorities: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly storageKey = 'hourslot_user_session';
  private readonly apiUrl = '/api/auth';

  // Signals for modern Angular reactive state
  currentUserSignal = signal<UserSession | null>(this.getStoredSession());

  currentUser = computed(() => this.currentUserSignal());
  isAuthenticated = computed(() => !!this.currentUserSignal());
  userRole = computed(() => this.currentUserSignal()?.role || null);

  private getStoredSession(): UserSession | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  login(credentials: { email: string; password: String }): Observable<UserSession> {
    return this.http.post<UserSession>(`${this.apiUrl}/login`, credentials).pipe(
      tap(session => {
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.currentUserSignal.set(session);
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, userData);
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.currentUserSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  getAccessToken(): string | null {
    return this.currentUserSignal()?.token as string || null;
  }

  hasRole(requiredRoles: string[]): boolean {
    const role = this.userRole();
    return role ? requiredRoles.includes(role) : false;
  }
}
