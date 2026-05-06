import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = {
  ADMIN: [
    "admin.panel",
    "admin.users",
    "admin.ranks",
    "admin.reports",
    "admin.settings",
    "forum.post",
    "forum.moderate",
    "forum.lock",
    "forum.pin",
    "forum.delete",
    "downloads.upload",
    "downloads.approve",
    "downloads.delete",
    "messages.send",
    "static_pages.edit",
    "theme.edit",
    "forum.staff_access",
  ],
  MODERATOR: [
    "forum.post",
    "forum.moderate",
    "forum.lock",
    "forum.pin",
    "forum.delete",
    "downloads.upload",
    "downloads.approve",
    "messages.send",
    "admin.reports",
    "forum.staff_access",
  ],
  VETERAN: ["forum.post", "downloads.upload", "messages.send"],
  MEMBER: ["forum.post", "messages.send"],
};

async function main() {
  console.log("🌱 Seeding database...");

  // Ranks
  const adminRank = await prisma.rank.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      color: "#ef4444",
      priority: 100,
      isStaff: true,
      permissions: PERMISSIONS.ADMIN,
    },
  });

  const modRank = await prisma.rank.upsert({
    where: { name: "Moderator" },
    update: {},
    create: {
      name: "Moderator",
      color: "#f59e0b",
      priority: 50,
      isStaff: true,
      permissions: PERMISSIONS.MODERATOR,
    },
  });

  await prisma.rank.upsert({
    where: { name: "Veteran" },
    update: {},
    create: {
      name: "Veteran",
      color: "#6366f1",
      priority: 20,
      isStaff: false,
      permissions: PERMISSIONS.VETERAN,
    },
  });

  await prisma.rank.upsert({
    where: { name: "Member" },
    update: {},
    create: {
      name: "Member",
      color: "#94a3b8",
      priority: 10,
      isDefault: true,
      isStaff: false,
      permissions: PERMISSIONS.MEMBER,
    },
  });

  // Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@damned.gg" },
    update: {},
    create: {
      username: "admin",
      email: "admin@damned.gg",
      displayName: "Administrator",
      passwordHash: await bcrypt.hash("change_me_admin_password", 12),
      emailVerified: true,
      status: "ACTIVE",
      primaryRankId: adminRank.id,
    },
  });

  console.log(`✅ Admin user: ${adminUser.email}`);

  // Default theme
  await prisma.theme.upsert({
    where: { name: "Default Dark" },
    update: {},
    create: {
      name: "Default Dark",
      isActive: true,
      primaryColor: "#6366f1",
      accentColor: "#8b5cf6",
      bgColor: "#0f172a",
      surfaceColor: "#1e293b",
      textColor: "#f8fafc",
    },
  });

  // Forum structure
  const generalCategory = await prisma.forumCategory.upsert({
    where: { slug: "general" },
    update: {},
    create: { name: "General", slug: "general", sortOrder: 1 },
  });

  const gamingCategory = await prisma.forumCategory.upsert({
    where: { slug: "gaming" },
    update: {},
    create: { name: "Gaming", slug: "gaming", sortOrder: 2 },
  });

  await prisma.subforum.upsert({
    where: { slug: "announcements" },
    update: {},
    create: {
      name: "Announcements",
      slug: "announcements",
      description: "Official announcements from the staff team.",
      categoryId: generalCategory.id,
      sortOrder: 1,
      isLocked: false,
    },
  });

  await prisma.subforum.upsert({
    where: { slug: "introductions" },
    update: {},
    create: {
      name: "Introductions",
      slug: "introductions",
      description: "Introduce yourself to the community.",
      categoryId: generalCategory.id,
      sortOrder: 2,
    },
  });

  await prisma.subforum.upsert({
    where: { slug: "off-topic" },
    update: {},
    create: {
      name: "Off Topic",
      slug: "off-topic",
      description: "Talk about anything.",
      categoryId: generalCategory.id,
      sortOrder: 3,
    },
  });

  await prisma.subforum.upsert({
    where: { slug: "game-releases" },
    update: {},
    create: {
      name: "Game Releases",
      slug: "game-releases",
      description: "Discuss latest game releases.",
      categoryId: gamingCategory.id,
      sortOrder: 1,
    },
  });

  // Download categories
  await prisma.downloadCategory.upsert({
    where: { slug: "mods" },
    update: {},
    create: { name: "Mods", slug: "mods", sortOrder: 1 },
  });

  await prisma.downloadCategory.upsert({
    where: { slug: "tools" },
    update: {},
    create: { name: "Tools", slug: "tools", sortOrder: 2 },
  });

  await prisma.downloadCategory.upsert({
    where: { slug: "maps" },
    update: {},
    create: { name: "Maps", slug: "maps", sortOrder: 3 },
  });

  // Static pages
  await prisma.staticPage.upsert({
    where: { slug: "rules" },
    update: {},
    create: {
      title: "Community Rules",
      slug: "rules",
      content: "<h1>Community Rules</h1><p>Be respectful. Have fun.</p>",
      status: "PUBLISHED",
      showInNav: true,
      navLabel: "Rules",
      navOrder: 1,
      publishedAt: new Date(),
    },
  });

  await prisma.staticPage.upsert({
    where: { slug: "about" },
    update: {},
    create: {
      title: "About Us",
      slug: "about",
      content: "<h1>About Damned</h1><p>Welcome to Damned Community.</p>",
      status: "PUBLISHED",
      showInNav: true,
      navLabel: "About",
      navOrder: 2,
      publishedAt: new Date(),
    },
  });

  // Site settings
  const settings = [
    { key: "site.name", value: "Damned Community" },
    { key: "site.description", value: "An online gaming & developer community" },
    { key: "discord.guild_id", value: "" },
    { key: "discord.invite_url", value: "" },
    { key: "discord.widget_limit", value: "20" },
    { key: "registration.enabled", value: "true" },
    { key: "registration.require_approval", value: "false" },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
