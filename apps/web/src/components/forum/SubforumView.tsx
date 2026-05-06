"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/components/layout/AuthProvider";
import { formatDistanceToNow } from "date-fns";
import { Pin, Lock, MessageSquare, Plus } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  slug: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  lastPostAt: string;
  tags: string[];
  author: { username: string; avatar?: string };
  _count: { posts: number };
}

interface SubforumData {
  subforum: { id: string; name: string; description?: string; slug: string; isLocked: boolean };
  threads: Thread[];
  total: number;
  totalPages: number;
  page: number;
}

export function SubforumView({ slug }: { slug: string }) {
  const [data, setData] = useState<SubforumData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    apiGet<SubforumData>(`/forum/subforums/${slug}?page=${page}&perPage=25`)
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [slug, page]);

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card p-4 animate-pulse h-16" />)}</div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-text-muted">Subforum not found.</div>;
  }

  const { subforum, threads, totalPages } = data;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm text-text-muted mb-4">
        <Link href="/forum" className="hover:text-primary">Forum</Link>
        <span className="mx-2">/</span>
        <span>{subforum.name}</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {subforum.name}
            {subforum.isLocked && <Lock size={16} className="text-text-muted" />}
          </h1>
          {subforum.description && <p className="text-text-muted mt-1">{subforum.description}</p>}
        </div>
        {user && !subforum.isLocked && (
          <Link href={`/forum/${slug}/new`} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Thread
          </Link>
        )}
      </div>

      <div className="card divide-y divide-border">
        {threads.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p>No threads yet. Start the conversation!</p>
          </div>
        ) : (
          threads.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-surface-2 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {t.isPinned && <Pin size={12} className="text-yellow-500 flex-shrink-0" />}
                  {t.isLocked && <Lock size={12} className="text-text-muted flex-shrink-0" />}
                  <Link href={`/forum/threads/${t.slug}`} className="font-medium hover:text-primary truncate">
                    {t.title}
                  </Link>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-text-muted">by {t.author.username}</span>
                  {t.tags.map((tag) => (
                    <span key={tag} className="badge bg-primary/10 text-primary text-xs">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0 text-sm text-text-muted">
                <p className="flex items-center gap-1 justify-end">
                  <MessageSquare size={12} />
                  {t._count.posts}
                </p>
                <p className="text-xs mt-0.5">{formatDistanceToNow(new Date(t.lastPostAt), { addSuffix: true })}</p>
              </div>
            </div>
          ))
        )}
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
