import { ProfileView } from "@/components/profile/ProfileView";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  return <ProfileView username={username} />;
}
