'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { pushPresence } from '@/lib/provider-presence';

export interface UserSession {
  token: string;
  refreshToken: string;
  id: number;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  authorities: string[];
  listingMode?: string | null;
  providerType?: string | null;
  providerIntent?: string | null;
  onboardingState?: string | null;
  providerWorkspace?: boolean | null;
  isOnline?: boolean | null;
}

interface AuthContextValue {
  user: UserSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<UserSession>;
  register: (userData: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
  hasRole: (roles: string[]) => boolean;
  updateSession: (patch: Partial<UserSession>) => void;
}

const STORAGE_KEY = 'hourslot_user_session';

const AuthContext = createContext<AuthContextValue | null>(null);

function persistSession(session: UserSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const updateSession = useCallback((patch: Partial<UserSession>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persistSession(next);
      return next;
    });
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }): Promise<UserSession> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { error: err };
    }
    const session: UserSession = await res.json();
    persistSession(session);
    setUser(session);

    if (session.listingMode === 'INDIVIDUAL' || session.providerIntent === 'INDIVIDUAL') {
      void pushPresence(true, 'LOGIN').then((presence) => {
        if (presence?.isOnline != null) {
          const next = { ...session, isOnline: presence.isOnline };
          persistSession(next);
          setUser(next);
        }
      });
    }
    return session;
  }, []);

  const register = useCallback(async (userData: Record<string, unknown>): Promise<void> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { error: err };
    }
  }, []);

  const logout = useCallback(() => {
    const listingMode = user?.listingMode;
    if (listingMode === 'INDIVIDUAL') {
      void pushPresence(false, 'LOGOUT');
    }
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${STORAGE_KEY}=; path=/; max-age=0`;
    setUser(null);
  }, [user?.listingMode]);

  const getToken = useCallback((): string | null => {
    return user?.token ?? null;
  }, [user]);

  const hasRole = useCallback((roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      getToken,
      hasRole,
      updateSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
