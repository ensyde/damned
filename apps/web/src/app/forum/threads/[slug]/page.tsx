import { ThreadView } from "@/components/forum/ThreadView";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ThreadPage({ params }: Props) {
  const { slug } = await params;
  return <ThreadView slug={slug} />;
}
