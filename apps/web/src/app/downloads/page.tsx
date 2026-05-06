import type { Metadata } from "next";
import { DownloadsList } from "@/components/downloads/DownloadsList";

export const metadata: Metadata = { title: "Downloads" };

export default function DownloadsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Downloads</h1>
          <p className="text-text-muted mt-1">Browse community uploads</p>
        </div>
      </div>
      <DownloadsList />
    </div>
  );
}
