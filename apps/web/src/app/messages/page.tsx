"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/components/layout/AuthProvider";
import { useSocket } from "@/components/layout/SocketProvider";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface Conversation {
  id: string;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
  participants: Array<{ id: string; username: string; avatar?: string }>;
  lastMessage?: { body: string };
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; username: string; displayName?: string; avatar?: string };
}

export default function MessagesPage() {
  const { accessToken, user } = useAuth();
  const socket = useSocket();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ body: string }>();

  useEffect(() => {
    if (!accessToken) return;
    apiGet<Conversation[]>("/messages", accessToken)
      .then(setConversations)
      .catch(() => undefined);
  }, [accessToken]);

  useEffect(() => {
    if (!selected || !accessToken) return;
    apiGet<{ messages: Message[] }>(`/messages/${selected}`, accessToken)
      .then((d) => setMessages(d.messages))
      .catch(() => undefined);
  }, [selected, accessToken]);

  useEffect(() => {
    if (!socket) return;
    socket.on("message", ({ conversationId, message }) => {
      if (conversationId === selected) {
        setMessages((prev) => [...prev, message as Message]);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessageAt: new Date().toISOString(), unreadCount: c.id === selected ? 0 : c.unreadCount + 1 }
            : c
        )
      );
    });
    return () => { socket.off("message"); };
  }, [socket, selected]);

  const onReply = async (data: { body: string }) => {
    if (!accessToken || !selected) return;
    try {
      await apiPost(`/messages/${selected}/reply`, data, accessToken);
      reset();
      const updated = await apiGet<{ messages: Message[] }>(`/messages/${selected}`, accessToken);
      setMessages(updated.messages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  };

  if (!user) return <div className="text-center py-20"><Link href="/login" className="btn-primary">Sign in to view messages</Link></div>;

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-4">
      {/* Sidebar */}
      <div className="w-72 card flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border font-semibold flex items-center justify-between">
          <span>Messages</span>
          <Link href="/messages/new" className="btn-primary text-xs py-1 px-2">New</Link>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {conversations.length === 0 ? (
            <p className="p-4 text-text-muted text-sm text-center">No conversations yet.</p>
          ) : (
            conversations.map((c) => {
              const other = c.participants.find((p) => p.id !== user.id);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left p-3 hover:bg-surface-2 transition-colors ${selected === c.id ? "bg-primary/10" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={other?.avatar ?? `https://ui-avatars.com/api/?name=${other?.username}&size=32&background=6366f1&color=fff`}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      alt={other?.username}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{c.subject}</span>
                        {c.unreadCount > 0 && (
                          <span className="ml-1 bg-primary text-white text-xs rounded-full px-1.5">{c.unreadCount}</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted truncate">{c.lastMessage?.body ?? "No messages"}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 card flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            Select a conversation to read messages
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                const isMe = m.sender.id === user.id;
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <img
                      src={m.sender.avatar ?? `https://ui-avatars.com/api/?name=${m.sender.username}&size=32&background=6366f1&color=fff`}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      alt={m.sender.username}
                    />
                    <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`px-3 py-2 rounded-lg text-sm ${isMe ? "bg-primary text-white" : "bg-surface-2"}`}>
                        {m.body}
                      </div>
                      <span className="text-xs text-text-muted mt-0.5">
                        {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSubmit(onReply)} className="p-3 border-t border-border flex gap-2">
              <input
                {...register("body", { required: true })}
                className="input flex-1"
                placeholder="Type a message..."
                autoComplete="off"
              />
              <button type="submit" disabled={isSubmitting} className="btn-primary">Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
