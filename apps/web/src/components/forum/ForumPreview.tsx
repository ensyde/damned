"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { ThreadSummary } from "@damned/shared";
import { MessageSquare, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ForumPreview() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  useEffect(() => {
    // Get recent threads across all subforums
    apiGet<{ threads: ThreadSummary[] }>("/forum/search?q=a&page=1&perPage=5")
      .then((d) => setThreads(d.threads ?? []))
      .catch(() => undefined);
  }, []);

  if (threads.length === 0) {
    return (
      <div className="card p-6 text-center text-text-muted">
        <p>No discussions yet. Be the first to post!</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-border">
      {threads.map((thread) => (
        <div key={thread.id} className="flex items-start gap-3 p-4 hover:bg-surface-2 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {thread.isPinned && <Pin size={12} className="text-yellow-500 flex-shrink-0" />}
              <Link
                href={`/forum/threads/${thread.slug}`}
                className="font-medium hover:text-primary truncate"
              >
                {thread.title}
              </Link>
            </div>
            <p className="text-xs text-text-muted">
              by {thread.author.username} ·{" "}
              {formatDistanceToNow(new Date(thread.lastPostAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-1 text-text-muted text-sm flex-shrink-0">
            <MessageSquare size={14} />
            <span>{thread.replyCount}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
