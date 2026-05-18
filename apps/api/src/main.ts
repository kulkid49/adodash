import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import cron from "node-cron";
import { env } from "./lib/env";
import { apiRouter } from "./routes/api";
import { ProductivityService } from "./services/productivityService";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 600,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.use("/api", apiRouter);

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  },
});

const service = new ProductivityService();

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
});

async function runScheduledSync() {
  try {
    io.emit("sync:status", { status: "RUNNING", at: new Date().toISOString() });
    const result = await service.syncNow({ initiatedByUserId: "system" });
    io.emit("sync:completed", { status: "SUCCESS", at: new Date().toISOString(), result });
  } catch (e) {
    io.emit("sync:completed", {
      status: "FAILED",
      at: new Date().toISOString(),
      error: e instanceof Error ? e.message : "unknown_error",
    });
  }
}

cron.schedule("*/5 * * * *", () => {
  void runScheduledSync();
});

server.listen(env.PORT, () => {
  console.log(`api listening on :${env.PORT}`);
});
