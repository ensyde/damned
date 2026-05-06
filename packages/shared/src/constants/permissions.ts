// ─── Permission Strings ──────────────────────────────────────────────────────

export const PERMISSIONS = {
  // Admin
  ADMIN_PANEL: "admin.panel",
  ADMIN_USERS: "admin.users",
  ADMIN_RANKS: "admin.ranks",
  ADMIN_REPORTS: "admin.reports",
  ADMIN_SETTINGS: "admin.settings",

  // Forum
  FORUM_POST: "forum.post",
  FORUM_MODERATE: "forum.moderate",
  FORUM_LOCK: "forum.lock",
  FORUM_PIN: "forum.pin",
  FORUM_DELETE: "forum.delete",
  FORUM_STAFF_ACCESS: "forum.staff_access",

  // Downloads
  DOWNLOADS_UPLOAD: "downloads.upload",
  DOWNLOADS_APPROVE: "downloads.approve",
  DOWNLOADS_DELETE: "downloads.delete",

  // Messaging
  MESSAGES_SEND: "messages.send",

  // Pages & Theme
  STATIC_PAGES_EDIT: "static_pages.edit",
  THEME_EDIT: "theme.edit",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
