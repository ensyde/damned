"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { apiPost } from "@/lib/api";
import { UserPrivate } from "@damned/shared";

interface AuthState {
  user: UserPrivate | null;
  accessToken: string | null;
  permissions: string[];
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPrivate | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const refreshToken = Cookies.get("refresh_token");
    if (!refreshToken) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiPost<{
        accessToken: string;
        refreshToken: string;
        user: UserPrivate & { permissions: string[] };
      }>("/auth/refresh", { refreshToken });
      setAccessToken(data.accessToken);
      setUser(data.user);
      setPermissions(data.user.permissions ?? []);
      Cookies.set("refresh_token", data.refreshToken, { expires: 7, sameSite: "lax" });
    } catch {
      Cookies.remove("refresh_token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (login: string, password: string) => {
    const data = await apiPost<{
      accessToken: string;
      refreshToken: string;
      user: UserPrivate & { permissions: string[] };
    }>("/auth/login", { login, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setPermissions(data.user.permissions ?? []);
    Cookies.set("refresh_token", data.refreshToken, { expires: 7, sameSite: "lax" });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = Cookies.get("refresh_token");
    try {
      await apiPost("/auth/logout", { refreshToken }, accessToken ?? undefined);
    } catch {
      // ignore
    }
    setUser(null);
    setAccessToken(null);
    setPermissions([]);
    Cookies.remove("refresh_token");
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ user, accessToken, permissions, isLoading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useHasPermission(...perms: string[]): boolean {
  const { permissions } = useAuth();
  return perms.every((p) => permissions.includes(p));
}
