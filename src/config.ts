/**
 * config.ts - reads and validates li18n.config.json from the project root.
 */

import { ZodError } from "zod";
import { Li18nConfigSchema, formatZodError } from "./schemas.ts";

export type { Li18nConfig } from "./schemas.ts";
import type { Li18nConfig } from "./schemas.ts";

export async function loadConfig(configPath: string): Promise<Li18nConfig> {
  const file = Bun.file(configPath);

  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch (err) {
    throw new Error(`${configPath}: invalid JSON - ${(err as Error).message}`);
  }

  try {
    return Li18nConfigSchema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) throw new Error(formatZodError(err, configPath));
    throw err;
  }
}
