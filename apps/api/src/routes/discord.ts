import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { discordService } from "../services/discord";

const router = Router();

// ─── Online Members ───────────────────────────────────────────────────────────
router.get("/online", async (_req: Request, res: Response): Promise<void> => {
  const members = await discordService.getOnlineMembers();
  res.json({ success: true, data: members });
});

// ─── Guild Info ───────────────────────────────────────────────────────────────
router.get("/guild", async (_req: Request, res: Response): Promise<void> => {
  const guildId = (await prisma.siteSetting.findUnique({ where: { key: "discord.guild_id" } }))?.value;
  const inviteUrl = (await prisma.siteSetting.findUnique({ where: { key: "discord.invite_url" } }))?.value;
  const widgetLimit = parseInt(
    (await prisma.siteSetting.findUnique({ where: { key: "discord.widget_limit" } }))?.value ?? "20"
  );

  res.json({
    success: true,
    data: { guildId, inviteUrl, widgetLimit },
  });
});

export default router;
