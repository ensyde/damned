"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/components/layout/AuthProvider";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MapPin, Globe, Calendar, MessageSquare, Download, Users } from "lucide-react";
import toast from "react-hot-toast";

interface ProfileData {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  website?: string;
  location?: string;
  socialLinks?: Record<string, string>;
  primaryRank?: { name: string; color: string; badgeIcon?: string };
  postCount: number;
  reputationPoints: number;
  createdAt: string;
  lastSeenAt?: string;
  _count: { followers: number; following: number };
  recentPosts: Array<{ id: string; thread: { title: string; slug: string }; createdAt: string }>;
  recentDownloads: Array<{ id: string; title: string; slug: string; publishedAt?: string }>;
}

export function ProfileView({ username }: { username: string }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const { user, accessToken } = useAuth();

  useEffect(() => {
    setLoading(true);
    apiGet<ProfileData>(`/users/${username}`)
      .then(setProfile)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [username]);

  const toggleFollow = async () => {
    if (!accessToken) { toast.error("Please log in to follow users"); return; }
    const res = await apiPost<{ following: boolean }>(`/users/${username}/follow`, {}, accessToken).catch(() => null);
    if (res) setIsFollowing(res.following);
  };

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-48 bg-surface-2 rounded-lg" /><div className="h-32 card" /></div>;
  if (!profile) return <div className="text-center py-20 text-text-muted">User not found.</div>;

  const isOwnProfile = user?.username === username;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover */}
      <div
        className="h-48 rounded-t-lg bg-gradient-to-br from-primary/30 to-accent/30 relative"
        style={profile.coverPhoto ? { backgroundImage: `url(${profile.coverPhoto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
      />

      {/* Avatar + actions */}
      <div className="card rounded-t-none px-6 pb-6 pt-0 relative">
        <div className="flex items-end justify-between">
          <img
            src={profile.avatar ?? `https://ui-avatars.com/api/?name=${profile.username}&size=96&background=6366f1&color=fff`}
            alt={profile.username}
            className="w-24 h-24 rounded-full border-4 border-surface -mt-12"
          />
          <div className="flex gap-2 mt-3">
            {isOwnProfile ? (
              <Link href="/settings" className="btn-secondary text-sm">Edit Profile</Link>
            ) : (
              <>
                <button onClick={() => void toggleFollow()} className={isFollowing ? "btn-secondary text-sm" : "btn-primary text-sm"}>
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
                <Link href={`/messages?recipient=${profile.id}`} className="btn-secondary text-sm">Message</Link>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{profile.displayName ?? profile.username}</h1>
            <span className="text-text-muted">@{profile.username}</span>
            {profile.primaryRank && (
              <span
                className="badge"
                style={{ backgroundColor: `${profile.primaryRank.color}20`, color: profile.primaryRank.color }}
              >
                {profile.primaryRank.name}
              </span>
            )}
          </div>

          {profile.bio && <p className="mt-2 text-text-muted">{profile.bio}</p>}

          <div className="flex flex-wrap gap-4 mt-3 text-sm text-text-muted">
            {profile.location && <span className="flex items-center gap-1"><MapPin size={14} />{profile.location}</span>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary">
                <Globe size={14} />{profile.website}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              Joined {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 text-sm">
            <div className="text-center">
              <p className="font-bold text-lg">{profile.postCount}</p>
              <p className="text-text-muted">Posts</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{profile.reputationPoints}</p>
              <p className="text-text-muted">Reputation</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{profile._count.followers}</p>
              <p className="text-text-muted">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{profile._count.following}</p>
              <p className="text-text-muted">Following</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare size={16} />Recent Posts</h2>
          {profile.recentPosts.length === 0 ? (
            <p className="text-text-muted text-sm">No recent posts.</p>
          ) : (
            <ul className="space-y-2">
              {profile.recentPosts.map((p) => (
                <li key={p.id} className="text-sm">
                  <Link href={`/forum/threads/${p.thread.slug}`} className="hover:text-primary">{p.thread.title}</Link>
                  <span className="text-text-muted ml-2 text-xs">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Download size={16} />Recent Downloads</h2>
          {profile.recentDownloads.length === 0 ? (
            <p className="text-text-muted text-sm">No downloads yet.</p>
          ) : (
            <ul className="space-y-2">
              {profile.recentDownloads.map((d) => (
                <li key={d.id} className="text-sm">
                  <Link href={`/downloads/${d.slug}`} className="hover:text-primary">{d.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
