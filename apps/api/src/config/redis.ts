import { createClient } from "redis";
import { logger } from "../utils/logger";

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});

client.on("error", (err) => logger.error("Redis error", err));

let connected = false;

export async function getRedis() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
  return client;
}

export { client as redisClient };
