"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { DownloadPublic } from "@damned/shared";
import { Download, Star } from "lucide-react";

export function DownloadPreview() {
  const [downloads, setDownloads] = useState<DownloadPublic[]>([]);

  useEffect(() => {
    apiGet<{ downloads: DownloadPublic[] }>("/downloads?perPage=4")
      .then((d) => setDownloads(d.downloads ?? []))
      .catch(() => undefined);
  }, []);

  if (downloads.length === 0) {
    return (
      <div className="card p-6 text-center text-text-muted">
        <p>No downloads available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {downloads.map((dl) => (
        <Link
          key={dl.id}
          href={`/downloads/${dl.slug}`}
          className="card p-4 hover:border-primary/50 transition-colors"
        >
          {dl.screenshots[0] && (
            <img
              src={dl.screenshots[0]}
              alt={dl.title}
              className="w-full h-28 object-cover rounded mb-3"
            />
          )}
          <h4 className="font-medium truncate">{dl.title}</h4>
          <p className="text-xs text-text-muted mt-0.5">{dl.category.name}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Download size={12} />
              {dl.downloadCount}
            </span>
            {dl.averageRating && (
              <span className="flex items-center gap-1">
                <Star size={12} className="text-yellow-400" />
                {dl.averageRating.toFixed(1)}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
