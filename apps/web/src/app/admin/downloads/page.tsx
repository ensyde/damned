"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuth } from "@/components/layout/AuthProvider";
import toast from "react-hot-toast";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";

interface PendingDownload {
  id: string;
  title: string;
  description: string;
  version?: string;
  fileUrl: string;
  fileName?: string;
  category: { name: string };
  uploader: { username: string; email: string };
  createdAt: string;
}

export default function AdminDownloadsPage() {
  const { accessToken } = useAuth();
  const [downloads, setDownloads] = useState<PendingDownload[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!accessToken) return;
    apiGet<PendingDownload[]>("/admin/downloads/pending", accessToken)
      .then(setDownloads)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [accessToken]);

  const approve = async (id: string) => {
    if (!accessToken) return;
    await apiPatch(`/admin/downloads/${id}/approve`, {}, accessToken);
    toast.success("Download approved!");
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (!reason || !accessToken) return;
    await apiPatch(`/admin/downloads/${id}/reject`, { reason }, accessToken);
    toast.success("Download rejected");
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-bold">Pending Downloads</h1>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}</div>
      ) : downloads.length === 0 ? (
        <div className="card p-10 text-center text-text-muted">No pending downloads. 🎉</div>
      ) : (
        <div className="space-y-3">
          {downloads.map((d) => (
            <div key={d.id} className="card p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{d.title}</h3>
                <p className="text-text-muted text-sm mt-0.5 line-clamp-2">{d.description}</p>
                <div className="flex gap-3 mt-2 text-xs text-text-muted">
                  <span>by {d.uploader.username}</span>
                  <span>{d.category.name}</span>
                  {d.version && <span>v{d.version}</span>}
                  {d.fileName && <span className="truncate max-w-[200px]">{d.fileName}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => void approve(d.id)} className="btn-primary text-sm flex items-center gap-1">
                  <Check size={14} />Approve
                </button>
                <button onClick={() => void reject(d.id)} className="btn-danger text-sm flex items-center gap-1">
                  <X size={14} />Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
