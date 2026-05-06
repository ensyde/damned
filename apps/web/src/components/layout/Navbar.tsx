"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useTheme } from "./ThemeProvider";
import { Bell, MessageSquare, Menu, X, Shield } from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function Navbar() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-border backdrop-blur">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-text-base hover:opacity-90">
            {theme?.logoUrl ? (
              <img src={theme.logoUrl} alt="Logo" className="h-8 w-auto" />
            ) : (
              <span className="text-primary">Damned</span>
            )}
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/forum" className="text-text-muted hover:text-text-base transition-colors">Forum</Link>
            <Link href="/downloads" className="text-text-muted hover:text-text-base transition-colors">Downloads</Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <Link href="/messages" className="btn-ghost p-2" title="Messages">
                  <MessageSquare size={18} />
                </Link>
                {user.permissions && user.permissions.includes("admin.panel") && (
                  <Link href="/admin" className="btn-ghost p-2 text-yellow-500" title="Admin">
                    <Shield size={18} />
                  </Link>
                )}
                <div className="relative group">
                  <button className="flex items-center gap-2">
                    <img
                      src={user.avatar ?? `https://ui-avatars.com/api/?name=${user.username}&background=6366f1&color=fff`}
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover border border-border"
                    />
                    <span className="hidden sm:block text-sm font-medium">{user.displayName ?? user.username}</span>
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link href={`/profile/${user.username}`} className="block px-4 py-2 text-sm hover:bg-surface-2">Profile</Link>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm hover:bg-surface-2">Dashboard</Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm hover:bg-surface-2">Settings</Link>
                    <hr className="border-border" />
                    <button
                      onClick={() => void logout()}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-2"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-sm">Login</Link>
                <Link href="/register" className="btn-primary text-sm">Register</Link>
              </>
            )}
            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            <Link href="/forum" className="block px-2 py-2 text-sm hover:bg-surface-2 rounded">Forum</Link>
            <Link href="/downloads" className="block px-2 py-2 text-sm hover:bg-surface-2 rounded">Downloads</Link>
            {!user && (
              <>
                <Link href="/login" className="block px-2 py-2 text-sm hover:bg-surface-2 rounded">Login</Link>
                <Link href="/register" className="block px-2 py-2 text-sm hover:bg-surface-2 rounded">Register</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
