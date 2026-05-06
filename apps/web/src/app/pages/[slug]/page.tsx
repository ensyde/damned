import { apiGet } from "@/lib/api";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface StaticPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaTitle?: string;
  metaDesc?: string;
  ogImage?: string;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await apiGet<StaticPage>(`/pages/${slug}`);
    return {
      title: page.metaTitle ?? page.title,
      description: page.metaDesc,
      openGraph: page.ogImage ? { images: [page.ogImage] } : undefined,
    };
  } catch {
    return { title: "Page Not Found" };
  }
}

export default async function StaticPageView({ params }: Props) {
  const { slug } = await params;
  let page: StaticPage;
  try {
    page = await apiGet<StaticPage>(`/pages/${slug}`);
  } catch {
    notFound();
  }

  return (
    <article className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{page.title}</h1>
      <div
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </article>
  );
}
