import Link from "next/link";
import { ForumPreview } from "@/components/forum/ForumPreview";
import { DownloadPreview } from "@/components/downloads/DownloadPreview";
import { DiscordWidget } from "@/components/discord/DiscordWidget";

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Hero */}
        <div className="card p-8 text-center bg-gradient-to-br from-primary/20 to-accent/20">
          <h1 className="text-4xl font-bold mb-3">Welcome to Damned</h1>
          <p className="text-text-muted text-lg mb-6">
            An online gaming &amp; developer community. Join the conversation.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/register" className="btn-primary">
              Join Now
            </Link>
            <Link href="/forum" className="btn-secondary">
              Browse Forum
            </Link>
          </div>
        </div>

        {/* Recent Forum Posts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Discussions</h2>
            <Link href="/forum" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          <ForumPreview />
        </section>

        {/* Recent Downloads */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Latest Downloads</h2>
            <Link href="/downloads" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          <DownloadPreview />
        </section>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <DiscordWidget />

        <div className="card p-4">
          <h3 className="font-semibold mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/pages/rules">Community Rules</Link></li>
            <li><Link href="/pages/about">About Us</Link></li>
            <li><Link href="/downloads">Downloads</Link></li>
            <li><Link href="/forum">Forums</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
