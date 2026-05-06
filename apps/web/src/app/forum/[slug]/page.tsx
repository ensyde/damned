import { SubforumView } from "@/components/forum/SubforumView";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SubforumPage({ params }: Props) {
  const { slug } = await params;
  return <SubforumView slug={slug} />;
}
