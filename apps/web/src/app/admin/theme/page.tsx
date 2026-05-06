"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/components/layout/AuthProvider";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { ThemeConfig } from "@damned/shared";

export default function AdminThemePage() {
  const { accessToken } = useAuth();
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [form, setForm] = useState<Partial<ThemeConfig>>({});
  const [creating, setCreating] = useState(false);

  const load = () => {
    if (!accessToken) return;
    apiGet<ThemeConfig[]>("/theme", accessToken).then(setThemes).catch(() => undefined);
  };

  useEffect(() => load(), [accessToken]);

  const activate = async (id: string) => {
    if (!accessToken) return;
    await apiPost(`/theme/${id}/activate`, {}, accessToken);
    toast.success("Theme activated");
    load();
  };

  const create = async () => {
    if (!accessToken) return;
    await apiPost("/theme", form, accessToken);
    toast.success("Theme created");
    setCreating(false);
    setForm({});
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-bold">Theme Editor</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {themes.map((t) => (
          <div key={t.id} className={`card p-4 ${t.isActive ? "border-primary" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t.name}</h3>
              {t.isActive && <span className="badge bg-primary/20 text-primary text-xs">Active</span>}
            </div>
            <div className="flex gap-2 mb-3">
              {[t.primaryColor, t.accentColor, t.bgColor, t.surfaceColor, t.textColor].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
            <p className="text-xs text-text-muted font-mono">{t.fontFamily}</p>
            {!t.isActive && (
              <button onClick={() => void activate(t.id)} className="btn-secondary text-sm mt-3 w-full flex items-center justify-center gap-1">
                <Check size={14} />Activate
              </button>
            )}
          </div>
        ))}

        <button
          onClick={() => setCreating(true)}
          className="card p-4 border-dashed flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-colors"
        >
          + New Theme
        </button>
      </div>

      {creating && (
        <div className="card p-6 max-w-lg">
          <h2 className="font-bold mb-4">Create Theme</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "name", label: "Name", type: "text" },
              { key: "primaryColor", label: "Primary Color", type: "color" },
              { key: "accentColor", label: "Accent Color", type: "color" },
              { key: "bgColor", label: "Background Color", type: "color" },
              { key: "surfaceColor", label: "Surface Color", type: "color" },
              { key: "textColor", label: "Text Color", type: "color" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  type={type}
                  className={type === "color" ? "input h-10 p-1 cursor-pointer" : "input"}
                  value={(form as Record<string, string>)[key] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => void create()} className="btn-primary">Create</button>
            <button onClick={() => setCreating(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
