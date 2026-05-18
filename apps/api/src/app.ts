import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env";
import { apiRouter } from "./routes/api";

export function createApp() {
  const app = express();

  app.use((req, _res, next) => {
    if (typeof req.url === "string" && req.url.startsWith("/api/")) {
      req.url = req.url.slice("/api".length) || "/";
    }
    next();
  });

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

  app.use(apiRouter);
  return app;
}
