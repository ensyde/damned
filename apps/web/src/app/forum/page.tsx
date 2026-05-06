import type { Metadata } from "next";
import { ForumIndex } from "@/components/forum/ForumIndex";

export const metadata: Metadata = { title: "Forum" };

export default function ForumPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Forum</h1>
        <p className="text-text-muted mt-1">Join the conversation</p>
      </div>
      <ForumIndex />
    </div>
  );
}
