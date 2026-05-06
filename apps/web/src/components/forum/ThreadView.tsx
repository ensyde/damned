"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/components/layout/AuthProvider";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Lock, Pin, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface Post {
  id: string;
  body: string;
  isFirst: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    primaryRank?: { name: string; color: string };
    postCount: number;
    createdAt: string;
  };
  reactions: Array<{ emoji: string; count: number; userReacted: boolean }>;
}

interface ThreadData {
  thread: {
    id: string;
    title: string;
    slug: string;
    isPinned: boolean;
    isLocked: boolean;
    viewCount: number;
    replyCount: number;
    tags: string[];
    subforum: { name: string; slug: string; category: { name: string; slug: string } };
    author: { username: string };
  };
  posts: Post[];
  total: number;
  totalPages: number;
  page: number;
  isSubscribed: boolean;
}

export function ThreadView({ slug }: { slug: string }) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { user, accessToken } = useAuth();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ body: string }>();

  useEffect(() => {
    setLoading(true);
    apiGet<ThreadData>(`/forum/threads/${slug}?page=${page}`)
      .then(setData)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [slug, page]);

  const onReply = async (formData: { body: string }) => {
    if (!accessToken) return;
    try {
      await apiPost(`/forum/threads/${slug}/posts`, formData, accessToken);
      toast.success("Reply posted!");
      reset();
      // Reload to show new post
      const updated = await apiGet<ThreadData>(`/forum/threads/${slug}?page=${data?.totalPages ?? 1}`);
      setData(updated);
      setPage(updated.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post reply");
    }
  };

  const react = async (postId: string, emoji: string) => {
    if (!accessToken) return;
    await apiPost(`/forum/posts/${postId}/react`, { emoji }, accessToken).catch(() => undefined);
    const updated = await apiGet<ThreadData>(`/forum/threads/${slug}?page=${page}`);
    setData(updated);
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-6 animate-pulse h-32" />)}</div>;
  if (!data) return <div className="text-center py-20 text-text-muted">Thread not found.</div>;

  const { thread, posts, totalPages } = data;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="text-sm text-text-muted mb-4 flex items-center gap-1.5">
        <Link href="/forum" className="hover:text-primary">Forum</Link>
        <span>/</span>
        <Link href={`/forum/${thread.subforum.slug}`} className="hover:text-primary">{thread.subforum.name}</Link>
        <span>/</span>
        <span className="truncate">{thread.title}</span>
      </div>

      {/* Thread header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
          {thread.isPinned && <Pin size={18} className="text-yellow-500" />}
          {thread.isLocked && <Lock size={16} className="text-text-muted" />}
          {thread.title}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
          <span className="flex items-center gap-1"><MessageSquare size={14} />{thread.replyCount} replies</span>
          <span>{thread.viewCount} views</span>
          {thread.tags.map((tag) => (
            <span key={tag} className="badge bg-primary/10 text-primary">{tag}</span>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="card flex gap-4 p-4">
            {/* Author sidebar */}
            <div className="w-32 flex-shrink-0 text-center">
              <img
                src={post.author.avatar ?? `https://ui-avatars.com/api/?name=${post.author.username}&background=6366f1&color=fff`}
                alt={post.author.username}
                className="w-16 h-16 rounded-full mx-auto mb-1"
              />
              <Link href={`/profile/${post.author.username}`} className="text-sm font-medium hover:text-primary block truncate">
                {post.author.displayName ?? post.author.username}
              </Link>
              {post.author.primaryRank && (
                <span
                  className="badge text-xs mt-0.5"
                  style={{ backgroundColor: `${post.author.primaryRank.color}20`, color: post.author.primaryRank.color }}
                >
                  {post.author.primaryRank.name}
                </span>
              )}
              <p className="text-xs text-text-muted mt-1">{post.author.postCount} posts</p>
            </div>

            {/* Post content */}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-muted mb-3">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                {post.updatedAt !== post.createdAt && " · edited"}
              </div>
              <div
                className="prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: post.body }}
              />
              {/* Reactions */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {post.reactions.map((r) => (
                  <button
                    key={r.emoji}
                    onClick={() => void react(post.id, r.emoji)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${r.userReacted ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}
                  >
                    {r.emoji} <span className="text-xs">{r.count}</span>
                  </button>
                ))}
                {user && (
                  <button onClick={() => void react(post.id, "👍")} className="text-xs text-text-muted hover:text-text-base px-2 py-0.5 border border-dashed border-border rounded-full">
                    + React
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm">Previous</button>
          <span className="px-4 py-2 text-sm text-text-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm">Next</button>
        </div>
      )}

      {/* Reply form */}
      {user && !thread.isLocked && (
        <div className="card p-4 mt-6">
          <h3 className="font-semibold mb-3">Post a Reply</h3>
          <form onSubmit={handleSubmit(onReply)} className="space-y-3">
            <textarea
              {...register("body", { required: true, minLength: 1 })}
              rows={6}
              className="input resize-none"
              placeholder="Write your reply..."
            />
            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? "Posting..." : "Post Reply"}
              </button>
            </div>
          </form>
        </div>
      )}
      {thread.isLocked && (
        <div className="card p-4 mt-6 text-center text-text-muted">
          <Lock size={20} className="mx-auto mb-1" />
          This thread is locked.
        </div>
      )}
    </div>
  );
}
