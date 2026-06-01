import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.routes.js";
import { opportunitiesRouter } from "./routes/opportunities.routes.js";
import { sourceRegistry } from "./sources/registry.js";

function getCorsOrigin() {
  if (env.CORS_ORIGIN === "*") {
    return true;
  }

  return env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: getCorsOrigin(),
      credentials: true
    })
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "HackRadar API",
      version: "0.1.0",
      sources: sourceRegistry
    });
  });

  app.use("/health", healthRouter);
  app.use("/api/opportunities", opportunitiesRouter);

  app.use((req, res) => {
    res.status(404).json({
      error: "Route not found",
      path: req.path
    });
  });

  return app;
}
