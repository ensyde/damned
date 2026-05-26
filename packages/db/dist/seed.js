"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const ALL_PERMISSIONS = [
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
];
async function main() {
    console.log("🌱 Seeding database...");
    // Initial ranks: admin only
    const adminRank = await prisma.rank.upsert({
        where: { name: "Admin" },
        update: {
            color: "#ef4444",
            priority: 100,
            isStaff: true,
            isDefault: false,
            permissions: ALL_PERMISSIONS,
        },
        create: {
            name: "Admin",
            color: "#ef4444",
            priority: 100,
            isStaff: true,
            isDefault: false,
            permissions: ALL_PERMISSIONS,
        },
    });
    await prisma.user.updateMany({
        where: { primaryRankId: { not: adminRank.id } },
        data: { primaryRankId: null },
    });
    await prisma.userSecondaryRank.deleteMany({
        where: { rankId: { not: adminRank.id } },
    });
    await prisma.rank.deleteMany({
        where: { id: { not: adminRank.id } },
    });
    // Admin user
    const adminPassword = process.env.ADMIN_SEED_PASSWORD;
    if (!adminPassword) {
        console.warn("⚠️  ADMIN_SEED_PASSWORD env var not set — skipping admin account creation. Set it in .env and re-run seed.");
    }
    else {
        const adminUser = await prisma.user.upsert({
            where: { email: "admin@damned.gg" },
            update: {
                primaryRankId: adminRank.id,
                emailVerified: true,
                status: "ACTIVE",
            },
            create: {
                username: "admin",
                email: "admin@damned.gg",
                displayName: "Administrator",
                passwordHash: await bcryptjs_1.default.hash(adminPassword, 12),
                emailVerified: true,
                status: "ACTIVE",
                primaryRankId: adminRank.id,
            },
        });
        console.log(`✅ Admin user: ${adminUser.email}`);
    }
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
//# sourceMappingURL=seed.js.map