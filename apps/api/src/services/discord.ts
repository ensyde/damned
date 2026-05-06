import { getRedis } from "../config/redis";
import { logger } from "../utils/logger";
import { DiscordMemberPresence } from "@damned/shared";

const CACHE_KEY = "discord:online_members";
const CACHE_TTL = 60; // seconds

export const discordService = {
  async getOnlineMembers(): Promise<DiscordMemberPresence[]> {
    try {
      const redis = await getRedis();
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as DiscordMemberPresence[];
      }

      const guildId = process.env.DISCORD_GUILD_ID;
      const botToken = process.env.DISCORD_BOT_TOKEN;

      if (!guildId || !botToken) {
        return [];
      }

      // Fetch presences via Discord HTTP API
      const response = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
        {
          headers: { Authorization: `Bot ${botToken}` },
        }
      );

      if (!response.ok) {
        logger.warn(`Discord API error: ${response.status}`);
        return [];
      }

      // For presence data, use the widget API (no privileged intent required)
      const widgetResponse = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/widget.json`,
        {
          headers: { Authorization: `Bot ${botToken}` },
        }
      );

      if (!widgetResponse.ok) {
        return [];
      }

      const widget = (await widgetResponse.json()) as {
        members?: Array<{
          id: string;
          username: string;
          discriminator: string;
          avatar_url?: string;
          status: string;
          game?: { name: string };
        }>;
      };

      const validStatuses = new Set(["online", "idle", "dnd"]);
      const members: DiscordMemberPresence[] = (widget.members ?? []).map((m) => ({
        id: m.id,
        username: m.username,
        displayName: m.username,
        avatar: m.avatar_url ?? null,
        status: (validStatuses.has(m.status) ? m.status : "online") as "online" | "idle" | "dnd",
        activity: m.game?.name ?? null,
      }));

      await redis.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(members));
      return members;
    } catch (err) {
      logger.error("Failed to fetch Discord members", err);
      return [];
    }
  },

  async updateOnlineMembers(members: DiscordMemberPresence[]): Promise<void> {
    const redis = await getRedis();
    await redis.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(members));
  },
};
