/**
 * writer.ts - writes compiled output to disk.
 *
 * Responsibilities:
 *   - Write one messages/<exportName>.ts per message key
 *   - Write messages/_index.ts (re-exports all keys)
 *   - Write index.ts (re-exports messages + runtime)
 *   - Write runtime.ts only if content has changed (avoids unnecessary writes)
 */

import path from "node:path";
import { createHash } from "node:crypto";
import type { CompiledLocales } from "./types.ts";
import type { Li18nConfig } from "./schemas.ts";
import { generateMessageFile } from "./codegen.ts";

// Public API

export async function writeOutput(
  locales: CompiledLocales,
  config: Li18nConfig,
  clean: boolean,
): Promise<void> {
  const { outputDir, defaultLocale } = config;
  const messagesDir = path.join(outputDir, "messages");

  if (clean) {
    await Bun.$`rm -rf ${messagesDir}`.quiet();
  }

  // Collect all keys (use defaultLocale as canonical source)
  const defaultTree = locales[defaultLocale];
  if (!defaultTree) {
    throw new Error(`Default locale "${defaultLocale}" not found in compiled locales`);
  }

  const keys = Object.keys(defaultTree);

  // Write one file per key
  const exportNames: { key: string; exportName: string; fileName: string }[] = [];

  for (const key of keys) {
    const exportName = keyToExportName(key);
    const fileName = `${exportName}.ts`;
    const content = generateMessageFile(key, exportName, locales, defaultLocale);
    await writeFile(path.join(messagesDir, fileName), content);
    exportNames.push({ key, exportName, fileName });
  }

  // Write messages/_index.ts
  await writeFile(path.join(messagesDir, "_index.ts"), buildIndexFile(exportNames));

  // Write index.ts
  await writeFile(path.join(outputDir, "index.ts"), buildRootIndexFile());

  // Write runtime.ts only if content has changed
  const runtimePath = path.join(outputDir, "runtime.ts");
  const newRuntime = buildRuntimeFile(defaultLocale, config.locales);
  const existingRuntime = await Bun.file(runtimePath)
    .text()
    .catch(() => null);
  if (existingRuntime === null || hash(existingRuntime) !== hash(newRuntime)) {
    await writeFile(runtimePath, newRuntime);
  }

  // Write .gitignore to exclude all generated files from version control
  await writeFile(path.join(outputDir, ".gitignore"), "*\n");

  // ignore prettier formatting for generated files
  await writeFile(path.join(outputDir, ".prettierignore"), "*\n");
}

// File content builders

function buildIndexFile(entries: { key: string; exportName: string; fileName: string }[]): string {
  const lines = ["// AUTO-GENERATED - do not edit", ""];
  for (const { key, exportName, fileName } of entries) {
    const stem = fileName.replace(/\.ts$/, "");
    lines.push(`export { ${exportName} as "${key}" } from "./${stem}.ts";`);
  }
  lines.push("");
  return lines.join("\n");
}

function buildRootIndexFile(): string {
  return [
    "// AUTO-GENERATED - do not edit",
    `export * as m from "./messages/_index.ts";`,
    `export { getLocale, setLocale, withLocale, localeStorage, locales, baseLocale } from "./runtime.ts";`,
    `export type { Locale, MaybePromise } from "./runtime.ts";`,
    "",
  ].join("\n");
}

function buildRuntimeFile(defaultLocale: string, allLocales: string[]): string {
  const localeUnion = allLocales.map((l) => JSON.stringify(l)).join(" | ");
  const localesArray = JSON.stringify(allLocales);
  return `// AUTO-GENERATED - do not edit
import { AsyncLocalStorage } from "node:async_hooks";

export type Locale = ${localeUnion};
export type MaybePromise<T> = T | Promise<T>;

export const locales: Locale[] = ${localesArray} as const;
export const baseLocale: Locale = ${JSON.stringify(defaultLocale)} as const;

export const localeStorage = new AsyncLocalStorage<Locale>();

let _locale: Locale = baseLocale;

export function setLocale(locale: Locale): void {
  _locale = locale;
}

export function getLocale(): Locale {
  return localeStorage.getStore() ?? _locale;
}

export function withLocale<T extends unknown[], R>(
  handler: (...args: T) => MaybePromise<R>,
  getLocaleFromHandler: (...args: T) => MaybePromise<Locale | undefined>,
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    const locale = await getLocaleFromHandler(...args);
    const validLocale = locale && locales.includes(locale) ? locale : baseLocale;
    return localeStorage.run(validLocale, () => handler(...args));
  };
}
`;
}

// Utilities

/**
 * Converts a flattened key like "nav.home" or "user.settings.title"
 * to a camelCase export name: "navHome", "userSettingsTitle".
 */
export function keyToExportName(key: string): string {
  return key
    .split(/[^a-zA-Z0-9]+/)
    .map((part, i) => (i === 0 ? part : capitalize(part)))
    .join("");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function writeFile(filePath: string, content: string): Promise<void> {
  // Ensure parent directory exists
  await Bun.$`mkdir -p ${path.dirname(filePath)}`.quiet();
  await Bun.write(filePath, content);
}
