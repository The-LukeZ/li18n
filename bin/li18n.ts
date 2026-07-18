#!/usr/bin/env bun

/**
 * bin/li18n - CLI entry point.
 *
 * Commands:
 *   li18n init      - create a new li18n.config.json and example locale files
 *   li18n build     - compile once
 *   li18n watch     - recompile on changes
 *   li18n check     - validate keys across all locales (no output written)
 *   li18n translate - fill in missing keys in non-default locales via machine translation (DeepL or Google)
 */

import path from "node:path";
import makeCli from "make-cli";
import { runBuild } from "./utils/commands/build.ts";
import { runWatch } from "./utils/commands/watch.ts";
import { runCheck } from "./utils/commands/check.ts";
import { runTranslate, type TranslateProvider } from "./utils/commands/translate.ts";
import { runInit } from "./utils/commands/init.ts";

const configOption = {
  name: "--config <path>",
  description: "Path to config file",
  defaultValue: "li18n.config.json",
};

const cleanOption = {
  name: "--no-clean",
  description: "Skip cleaning output directory before building",
  defaultValue: false,
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
      options: [configOption, cleanOption],
      handler: async (options: { config: string; noClean: boolean }) => {
        await runBuild(resolveConfig(options.config), options.noClean ?? false);
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
      name: "translate",
      description: "Fill in missing keys in non-default locales via machine translation",
      options: [
        configOption,
        {
          name: "--provider <name>",
          description: "Machine translation provider to use: 'deepl' or 'google'",
          defaultValue: "deepl",
        },
        {
          name: "--api-key-env <name>",
          description:
            "Name of the env var holding the provider API key (default: tries LI18N_DEEPL_API_KEY/DEEPL_API_KEY for deepl, LI18N_GOOGLE_API_KEY/GOOGLE_TRANSLATE_API_KEY for google)",
          defaultValue: "",
        },
        {
          name: "--locales <list>",
          description:
            "Comma-separated target locales to translate (default: all non-default locales)",
          defaultValue: "",
        },
        {
          name: "--dry-run",
          description:
            "List missing keys that would be translated without calling the API or writing files",
          defaultValue: false,
        },
      ],
      handler: async (options: {
        config: string;
        provider: string;
        apiKeyEnv: string;
        locales: string;
        dryRun: boolean;
      }) => {
        if (options.provider !== "deepl" && options.provider !== "google") {
          throw new Error(`unknown provider "${options.provider}" - use "deepl" or "google"`);
        }
        await runTranslate(resolveConfig(options.config), {
          provider: options.provider as TranslateProvider,
          apiKeyEnv: options.apiKeyEnv || undefined,
          locales: options.locales ? options.locales.split(",").map((s) => s.trim()) : undefined,
          dryRun: options.dryRun ?? false,
        });
      },
    },
    {
      name: "init",
      description: "Initialize a new li18n config file in the current directory",
      options: [
        {
          name: "--messages-dir <path>",
          description: "Directory to create for locale message files",
          defaultValue: "./messages",
        },
      ],
      handler: async (options: { messagesDir: string }) => {
        await runInit(options.messagesDir);
      },
    },
  ],
});
