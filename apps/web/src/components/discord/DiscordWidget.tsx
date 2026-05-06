"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { DiscordMemberPresence } from "@damned/shared";
import { useSocket } from "@/components/layout/SocketProvider";

export function DiscordWidget() {
  const [members, setMembers] = useState<DiscordMemberPresence[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const socket = useSocket();

  useEffect(() => {
    apiGet<DiscordMemberPresence[]>("/discord/online")
      .then(setMembers)
      .catch(() => undefined);

    apiGet<{ inviteUrl?: string }>("/discord/guild")
      .then((d) => setInviteUrl(d.inviteUrl ?? null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("discord_online", setMembers);
    return () => {
      socket.off("discord_online");
    };
  }, [socket]);

  const statusColor = (status: string) => {
    if (status === "online") return "bg-green-500";
    if (status === "idle") return "bg-yellow-500";
    if (status === "dnd") return "bg-red-500";
    return "bg-gray-500";
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515..." />
        </svg>
        <h3 className="font-semibold">Discord</h3>
        <span className="ml-auto text-xs text-green-400">{members.length} online</span>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-text-muted">No members currently online</p>
      ) : (
        <ul className="space-y-2">
          {members.slice(0, 15).map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <img
                  src={
                    m.avatar ??
                    `https://ui-avatars.com/api/?name=${m.username}&size=32&background=6366f1&color=fff`
                  }
                  alt={m.username}
                  className="w-7 h-7 rounded-full"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface ${statusColor(m.status)}`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm truncate">{m.displayName}</p>
                {m.activity && (
                  <p className="text-xs text-text-muted truncate">{m.activity}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {inviteUrl && (
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 btn-primary w-full text-center text-sm block"
        >
          Join Discord
        </a>
      )}
    </div>
  );
}
