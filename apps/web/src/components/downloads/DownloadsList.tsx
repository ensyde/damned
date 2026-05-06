"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { DownloadPublic } from "@damned/shared";
import { Download, Star } from "lucide-react";

export function DownloadsList() {
  const [downloads, setDownloads] = useState<DownloadPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    apiGet<{ downloads: DownloadPublic[]; totalPages: number }>(`/downloads?page=${page}&perPage=12`)
      .then((d) => {
        setDownloads(d.downloads ?? []);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-48" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {downloads.map((dl) => (
          <Link
            key={dl.id}
            href={`/downloads/${dl.slug}`}
            className="card hover:border-primary/50 transition-colors overflow-hidden"
          >
            {dl.screenshots[0] ? (
              <img src={dl.screenshots[0]} alt={dl.title} className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 bg-surface-2 flex items-center justify-center text-text-muted">
                <Download size={32} />
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold truncate">{dl.title}</h3>
              <p className="text-xs text-text-muted mt-0.5">{dl.category.name}</p>
              <p className="text-sm text-text-muted mt-2 line-clamp-2">{dl.description}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Download size={12} />
                  {dl.downloadCount}
                </span>
                {dl.averageRating != null && (
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400" />
                    {dl.averageRating.toFixed(1)}
                  </span>
                )}
                {dl.version && <span>v{dl.version}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
