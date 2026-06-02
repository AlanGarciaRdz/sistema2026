import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { getAuthConfig, SESSION_KEY } from '../config/authCredentials';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isAuthenticated) sessionStorage.setItem(SESSION_KEY, '1');
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated]);

  const login = useCallback((email, password) => {
    const { emails, password: expectedPassword } = getAuthConfig();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '').trim();
    const ok =
      emails.includes(normalizedEmail) &&
      normalizedPassword === String(expectedPassword).trim();
    if (ok) setIsAuthenticated(true);
    return ok;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
