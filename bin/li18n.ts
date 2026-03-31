#!/usr/bin/env bun
/**
 * bin/li18n - CLI entry point.
 *
 * Commands:
 *   li18n build   - compile once
 *   li18n watch   - recompile on changes
 *   li18n check   - validate keys across all locales (no output written)
 */

import path from "node:path";
import makeCli from "make-cli";
import { compile } from "../src/index.ts";
import { loadConfig } from "../src/config.ts";
import { parseLocaleFile } from "../src/parser.ts";
import { analyzeTree } from "../src/analyzer.ts";
import { log } from "./utils/logger.ts";

const configOption = {
  name: "--config <path>",
  description: "Path to config file",
  defaultValue: "li18n.config.json",
};

function resolveConfig(config: string): string {
  return path.resolve(config);
}

makeCli({
  name: "li18n",
  commands: [
    {
      name: "build",
      description: "Compile once",
      options: [configOption],
      handler: async (options: { config: string }) => {
        await runBuild(resolveConfig(options.config));
      },
    },
    {
      name: "watch",
      description: "Recompile on changes",
      options: [configOption],
      handler: async (options: { config: string }) => {
        await runWatch(resolveConfig(options.config));
      },
    },
    {
      name: "check",
      description: "Validate keys across all locales (no output written)",
      options: [configOption],
      handler: async (options: { config: string }) => {
        await runCheck(resolveConfig(options.config));
      },
    },
    {
      name: "init",
      description: "Initialize a new li18n config file in the current directory",
      handler: async () => {
        const configPath = path.resolve("li18n.config.json");
        if (await Bun.file(configPath).exists()) {
          log.error(`"li18n.config.json" already exists in this directory.`);
          process.exit(1);
        }
        const defaultConfig = {
          locales: ["en", "de"],
          defaultLocale: "en",
          messagesDir: "./locales",
          outputDir: "./src/i18n",
        };
        await Bun.write(configPath, JSON.stringify(defaultConfig, null, 2));
        log.success(`Created new config file at ${configPath}`);
      },
    },
  ],
});

// Commands

async function runBuild(configPath: string): Promise<void> {
  log.build("building…");
  const result = await compile({ configPath });

  if (result.errors.length > 0) {
    for (const e of result.errors) {
      log.localeError(e.locale, `${e.key}: ${e.message}`);
    }
    process.exit(1);
  }

  log.success(`done - ${result.keyCount} key(s) compiled`);
}

async function runWatch(configPath: string): Promise<void> {
  log.watch("watching for changes…");
  const config = await loadConfig(configPath);
  const projectRoot = path.dirname(configPath);
  const messagesDir = path.resolve(projectRoot, config.messagesDir);

  // Initial build
  await runBuild(configPath);

  // Watch the messages directory via Node-compatible fs.watch
  const { watch } = await import("node:fs");
  watch(messagesDir, { persistent: true }, async (_event, filename) => {
    if (typeof filename === "string" && filename.endsWith(".json")) {
      log.change(`change detected in ${filename}, rebuilding…`);
      try {
        await compile({ configPath });
        log.success("rebuild complete");
      } catch (err) {
        log.error(`rebuild failed - ${(err as Error).message}`);
      }
    }
  });
}

async function runCheck(configPath: string): Promise<void> {
  const config = await loadConfig(configPath);
  const projectRoot = path.dirname(configPath);
  const messagesDir = path.resolve(projectRoot, config.messagesDir);

  // Parse all locales
  const trees: Record<string, Record<string, unknown>> = {};
  let hasErrors = false;

  for (const locale of config.locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
      log.localeError(locale, `missing locale file: ${filePath}`);
      hasErrors = true;
      continue;
    }

    const jsonText = await file.text();
    try {
      const raw = parseLocaleFile(jsonText, filePath);
      const { errors } = analyzeTree(raw, filePath);
      trees[locale] = raw;
      for (const e of errors) {
        log.localeError(locale, `${e.key}: ${e.message}`);
        hasErrors = true;
      }
    } catch (err) {
      log.localeError(locale, `parse error: ${(err as Error).message}`);
      hasErrors = true;
    }
  }

  // Cross-locale key check
  const defaultKeys = new Set(Object.keys(trees[config.defaultLocale] ?? {}));

  for (const locale of config.locales) {
    if (locale === config.defaultLocale) continue;
    const localeKeys = new Set(Object.keys(trees[locale] ?? {}));

    for (const k of defaultKeys) {
      if (!localeKeys.has(k)) {
        log.localeError(locale, `missing key: "${k}"`);
        hasErrors = true;
      }
    }
    for (const k of localeKeys) {
      if (!defaultKeys.has(k)) {
        log.localeWarn(locale, `extra key not in default locale: "${k}"`);
      }
    }
  }

  if (!hasErrors) {
    log.success(`all locales are consistent (${defaultKeys.size} keys)`);
  } else {
    process.exit(1);
  }
}
