// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  perPage?: number;
}

// ─── User Types ───────────────────────────────────────────────────────────────

export interface UserPublic {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  primaryRank?: RankPublic | null;
  reputationPoints: number;
  postCount: number;
  createdAt: Date;
  lastSeenAt?: Date | null;
}

export interface UserPrivate extends UserPublic {
  email: string;
  coverPhoto?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  socialLinks?: Record<string, string> | null;
  isPublicProfile: boolean;
  emailVerified: boolean;
  notifPrefs?: NotifPref[];
}

// ─── Rank Types ───────────────────────────────────────────────────────────────

export interface RankPublic {
  id: string;
  name: string;
  color: string;
  badgeIcon?: string | null;
  priority: number;
}

// ─── Forum Types ──────────────────────────────────────────────────────────────

export interface ThreadSummary {
  id: string;
  title: string;
  slug: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  viewCount: number;
  tags: string[];
  lastPostAt: Date;
  author: UserPublic;
  subforum: { id: string; name: string; slug: string };
}

export interface PostPublic {
  id: string;
  body: string;
  isFirst: boolean;
  author: UserPublic;
  reactions: ReactionSummary[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  editHistory?: PostEditHistoryPublic[];
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface PostEditHistoryPublic {
  id: string;
  editor: UserPublic;
  createdAt: Date;
}

// ─── Download Types ───────────────────────────────────────────────────────────

export interface DownloadPublic {
  id: string;
  title: string;
  slug: string;
  description: string;
  version?: string | null;
  fileSize?: bigint | null;
  screenshots: string[];
  downloadCount: number;
  status: string;
  category: { id: string; name: string; slug: string };
  uploader: UserPublic;
  averageRating?: number;
  reviewCount?: number;
  createdAt: Date;
  publishedAt?: Date | null;
}

// ─── Message Types ────────────────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  subject: string;
  lastMessageAt: Date;
  unreadCount: number;
  participants: UserPublic[];
  lastMessage?: MessagePublic;
}

export interface MessagePublic {
  id: string;
  body: string;
  sender: UserPublic;
  createdAt: Date;
}

// ─── Notification Types ───────────────────────────────────────────────────────

export interface NotificationPublic {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotifPref {
  type: string;
  inApp: boolean;
  email: boolean;
}

// ─── Discord Types ────────────────────────────────────────────────────────────

export interface DiscordMemberPresence {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  status: "online" | "idle" | "dnd";
  activity?: string | null;
}

// ─── Theme Types ──────────────────────────────────────────────────────────────

export interface ThemeConfig {
  id: string;
  name: string;
  isActive: boolean;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

// ─── Widget Types ─────────────────────────────────────────────────────────────

export type WidgetType =
  | "recent_posts"
  | "recent_downloads"
  | "unread_pms"
  | "discord_online"
  | "announcements"
  | "my_stats";

export interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  notification: (data: NotificationPublic) => void;
  message: (data: { conversationId: string; message: MessagePublic }) => void;
  discord_online: (data: DiscordMemberPresence[]) => void;
  user_online: (userId: string) => void;
  user_offline: (userId: string) => void;
}

export interface ClientToServerEvents {
  join_conversation: (conversationId: string) => void;
  leave_conversation: (conversationId: string) => void;
}
