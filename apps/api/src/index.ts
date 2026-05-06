import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { createServer } from "http";
import { initSocket } from "./services/socket";
import { logger } from "./utils/logger";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function main() {
  const app = await createApp();
  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`API server listening on port ${PORT}`);
  });

  const shutdown = () => {
    logger.info("Shutting down...");
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
