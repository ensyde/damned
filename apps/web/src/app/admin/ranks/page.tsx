"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { useAuth } from "@/components/layout/AuthProvider";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Plus, Check } from "lucide-react";
import { ALL_PERMISSIONS } from "@damned/shared";

interface Rank {
  id: string;
  name: string;
  color: string;
  priority: number;
  isDefault: boolean;
  isStaff: boolean;
  permissions: string[];
}

export default function AdminRanksPage() {
  const { accessToken } = useAuth();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [selected, setSelected] = useState<Rank | null>(null);
  const [creating, setCreating] = useState(false);
  const { register, handleSubmit, setValue, reset } = useForm<Rank>();

  const load = () => {
    if (!accessToken) return;
    apiGet<Rank[]>("/admin/ranks", accessToken).then(setRanks).catch(() => undefined);
  };

  useEffect(() => load(), [accessToken]);

  const onSelect = (rank: Rank) => {
    setSelected(rank);
    setCreating(false);
    reset(rank);
  };

  const onSave = async (data: Rank) => {
    if (!accessToken) return;
    if (creating) {
      await apiPost("/admin/ranks", data, accessToken);
      toast.success("Rank created");
    } else if (selected) {
      await apiPatch(`/admin/ranks/${selected.id}`, data, accessToken);
      toast.success("Rank updated");
    }
    load();
    setCreating(false);
    setSelected(null);
    reset();
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-56 card p-3 flex flex-col gap-2 h-fit">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin" className="btn-ghost p-1"><ArrowLeft size={16} /></Link>
          <span className="font-semibold text-sm">Ranks</span>
        </div>
        {ranks.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className={`text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${selected?.id === r.id ? "bg-primary/10 text-primary" : "hover:bg-surface-2"}`}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
            {r.name}
          </button>
        ))}
        <button onClick={() => { setCreating(true); setSelected(null); reset({}); }} className="btn-secondary text-sm flex items-center gap-1 mt-2">
          <Plus size={14} />New Rank
        </button>
      </div>

      {/* Editor */}
      {(selected || creating) && (
        <div className="flex-1 card p-6">
          <h2 className="text-lg font-bold mb-4">{creating ? "New Rank" : `Edit: ${selected?.name}`}</h2>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input {...register("name", { required: true })} className="input" />
              </div>
              <div>
                <label className="label">Color</label>
                <input {...register("color")} type="color" className="input h-10 p-1 cursor-pointer" />
              </div>
              <div>
                <label className="label">Priority</label>
                <input {...register("priority", { valueAsNumber: true })} type="number" className="input" />
              </div>
              <div>
                <label className="label">Badge Icon URL (optional)</label>
                <input {...register("badgeIcon" as never)} className="input" placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input {...register("isDefault")} type="checkbox" />Default rank
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input {...register("isStaff")} type="checkbox" />Staff rank
              </label>
            </div>

            <div>
              <label className="label mb-2 block">Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      value={perm}
                      {...register("permissions")}
                      defaultChecked={selected?.permissions.includes(perm)}
                    />
                    <code className="text-xs text-accent">{perm}</code>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex items-center gap-2"><Check size={16} />Save</button>
              <button type="button" onClick={() => { setSelected(null); setCreating(false); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
