import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  DEVFOLIO_HEADLESS: booleanString,
  DEVFOLIO_SCRAPE_LIMIT: z.coerce.number().int().positive().max(100).default(25),
  DEVFOLIO_REQUEST_DELAY_MS: z.coerce.number().int().min(0).max(10000).default(750),
  HACKEREARTH_HEADLESS: booleanString,
  HACKEREARTH_SCRAPE_LIMIT: z.coerce.number().int().positive().max(100).default(25),
  HACKEREARTH_REQUEST_DELAY_MS: z.coerce.number().int().min(0).max(10000).default(750),
  UNSTOP_HEADLESS: booleanString,
  UNSTOP_SCRAPE_LIMIT: z.coerce.number().int().positive().max(100).default(25),
  UNSTOP_REQUEST_DELAY_MS: z.coerce.number().int().min(0).max(10000).default(750),
  SCRAPER_USER_AGENT: z
    .string()
    .default("HackRadarBot/0.1 (+https://github.com/hackradar; respectful opportunity indexing)")
});

export const env = envSchema.parse(process.env);
