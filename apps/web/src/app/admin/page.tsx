"use client";

import { useAuth } from "@/components/layout/AuthProvider";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { Users, MessageSquare, Download, Flag, Settings, Palette, FileText, ShieldCheck } from "lucide-react";

interface Stats {
  userCount: number;
  activeUserCount: number;
  threadCount: number;
  postCount: number;
  pendingDownloads: number;
  openReports: number;
  newUsersToday: number;
}

export default function AdminPage() {
  const { user, accessToken, permissions } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiGet<Stats>("/admin/stats", accessToken)
      .then(setStats)
      .catch(() => undefined);
  }, [accessToken]);

  if (!user || !permissions.includes("admin.panel")) {
    return (
      <div className="text-center py-20">
        <ShieldCheck size={48} className="mx-auto mb-4 text-text-muted" />
        <p className="text-text-muted">You do not have access to the admin panel.</p>
      </div>
    );
  }

  const sections = [
    { href: "/admin/users", icon: <Users size={20} />, label: "Users", desc: "Manage user accounts and ranks", perm: "admin.users" },
    { href: "/admin/ranks", icon: <ShieldCheck size={20} />, label: "Ranks & Permissions", desc: "Create and configure ranks", perm: "admin.ranks" },
    { href: "/admin/downloads", icon: <Download size={20} />, label: "Downloads", desc: `${stats?.pendingDownloads ?? 0} pending approvals`, perm: "downloads.approve" },
    { href: "/admin/reports", icon: <Flag size={20} />, label: "Reports", desc: `${stats?.openReports ?? 0} open reports`, perm: "admin.reports" },
    { href: "/admin/pages", icon: <FileText size={20} />, label: "Static Pages", desc: "Manage content pages", perm: "static_pages.edit" },
    { href: "/admin/theme", icon: <Palette size={20} />, label: "Theme", desc: "Customize site appearance", perm: "theme.edit" },
    { href: "/admin/settings", icon: <Settings size={20} />, label: "Settings", desc: "Site-wide configuration", perm: "admin.settings" },
  ].filter((s) => permissions.includes(s.perm));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: stats.userCount },
            { label: "New Today", value: stats.newUsersToday },
            { label: "Threads", value: stats.threadCount },
            { label: "Posts", value: stats.postCount },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-text-muted text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="card p-5 hover:border-primary/50 transition-colors flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg flex-shrink-0">{s.icon}</div>
            <div>
              <h3 className="font-semibold">{s.label}</h3>
              <p className="text-text-muted text-sm mt-0.5">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
