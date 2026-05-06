"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuth } from "@/components/layout/AuthProvider";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  status: string;
  emailVerified: boolean;
  postCount: number;
  createdAt: string;
  primaryRank?: { name: string; color: string };
}

export default function AdminUsersPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = (p: number, q: string) => {
    if (!accessToken) return;
    setLoading(true);
    apiGet<{ users: User[]; totalPages: number }>(`/admin/users?page=${p}&perPage=30&search=${encodeURIComponent(q)}`, accessToken)
      .then((d) => { setUsers(d.users); setTotalPages(d.totalPages); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page, search); }, [page, accessToken]);

  const updateUser = async (id: string, data: Partial<User>) => {
    if (!accessToken) return;
    await apiPatch(`/admin/users/${id}`, data, accessToken);
    toast.success("User updated");
    load(page, search);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(1, search); } }}
          className="input max-w-xs"
          placeholder="Search by username or email..."
        />
        <button onClick={() => { setPage(1); load(1, search); }} className="btn-secondary">Search</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-text-muted">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Rank</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3 animate-pulse bg-surface-2 h-10" /></tr>
              ))
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-text-muted text-xs">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : u.status === "BANNED" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.primaryRank && (
                      <span className="badge" style={{ backgroundColor: `${u.primaryRank.color}20`, color: u.primaryRank.color }}>
                        {u.primaryRank.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {u.status !== "BANNED" ? (
                        <button
                          onClick={() => void updateUser(u.id, { status: "BANNED" } as never)}
                          className="text-red-400 hover:underline text-xs"
                        >
                          Ban
                        </button>
                      ) : (
                        <button
                          onClick={() => void updateUser(u.id, { status: "ACTIVE" } as never)}
                          className="text-green-400 hover:underline text-xs"
                        >
                          Unban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-text-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm">Next</button>
        </div>
      )}
    </div>
  );
}
