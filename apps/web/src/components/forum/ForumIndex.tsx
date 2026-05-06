"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { ChevronRight, Lock, MessageSquare } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  subforums: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    isLocked: boolean;
    _count: { threads: number };
  }>;
}

export function ForumIndex() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Category[]>("/forum/categories")
      .then(setCategories)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="card p-4 animate-pulse h-24" />
    ))}</div>;
  }

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat.id} className="card overflow-hidden">
          <div className="px-4 py-3 bg-surface-2 border-b border-border">
            <h2 className="font-bold text-lg">{cat.name}</h2>
          </div>
          <div className="divide-y divide-border">
            {cat.subforums.map((sf) => (
              <Link
                key={sf.id}
                href={`/forum/${sf.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded text-primary">
                  <MessageSquare size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sf.name}</span>
                    {sf.isLocked && <Lock size={12} className="text-text-muted" />}
                  </div>
                  {sf.description && (
                    <p className="text-sm text-text-muted truncate">{sf.description}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium">{sf._count.threads}</p>
                  <p className="text-xs text-text-muted">threads</p>
                </div>
                <ChevronRight size={16} className="text-text-muted" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
