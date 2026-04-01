/**
 * li18n - main programmatic API.
 *
 * External consumers can call `compile()` directly; the CLI (bin/li18n)
 * calls it for build/watch/check commands.
 */

import path from "node:path";
import { loadConfig } from "./config.ts";
import { parseLocaleFile } from "./parser.ts";
import { analyzeTree } from "./analyzer.ts";
import { writeOutput } from "./writer.ts";
import type { CompiledLocales } from "./types.ts";

export { loadConfig } from "./config.ts";
export type { Li18nConfig } from "./schemas.ts";
export type { CompiledLocales, MessageNode, MessageTree } from "./types.ts";

// Main compile pipeline

export interface CompileOptions {
  /** Absolute path to li18n.config.json */
  configPath: string;
  /** Override the outputDir from the config file */
  outputDir?: string;
  /** Delete the messages/ directory before writing (removes stale key files). Overrides the config value. */
  clean?: boolean;
}

export interface CompileResult {
  /** Number of message keys compiled */
  keyCount: number;
  /** Any non-fatal analyzer errors (missing keys, type mismatches, …) */
  errors: { locale: string; key: string; message: string }[];
}

export async function compile(options: CompileOptions): Promise<CompileResult> {
  const config = await loadConfig(options.configPath);
  const projectRoot = path.dirname(options.configPath);
  config.outputDir = path.resolve(projectRoot, options.outputDir ?? config.outputDir);
  const messagesDir = path.resolve(projectRoot, config.messagesDir);

  const allErrors: CompileResult["errors"] = [];
  const compiledLocales: CompiledLocales = {};

  for (const locale of config.locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      allErrors.push({
        locale,
        key: "*",
        message: `Locale file not found: ${filePath}`,
      });
      continue;
    }

    const jsonText = await file.text();
    const rawTree = parseLocaleFile(jsonText, filePath);
    const { tree, errors } = analyzeTree(rawTree, filePath);

    for (const e of errors) {
      allErrors.push({ locale, key: e.key, message: e.message });
    }

    compiledLocales[locale] = tree;
  }

  if (Object.keys(compiledLocales).length > 0) {
    const shouldClean = options.clean ?? config.clean ?? true;
    await writeOutput(compiledLocales, config, shouldClean);
  }

  const keyCount = Object.keys(compiledLocales[config.defaultLocale] ?? {}).length;
  return { keyCount, errors: allErrors };
}
