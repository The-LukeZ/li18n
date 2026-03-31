/**
 * writer.ts - writes compiled output to disk.
 *
 * Responsibilities:
 *   - Write one messages/<key>.ts per message key
 *   - Write messages/_index.ts (re-exports all keys)
 *   - Write index.ts (re-exports messages + runtime)
 *   - Write runtime.ts once (never overwritten if it already exists)
 */

import path from "node:path";
import type { CompiledLocales } from "./types.ts";
import type { Li18nConfig } from "./schemas.ts";
import { generateMessageFile } from "./codegen.ts";

// Public API

export async function writeOutput(locales: CompiledLocales, config: Li18nConfig): Promise<void> {
  const { outputDir, defaultLocale } = config;
  const messagesDir = path.join(outputDir, "messages");

  // Collect all keys (use defaultLocale as canonical source)
  const defaultTree = locales[defaultLocale];
  if (!defaultTree) {
    throw new Error(`Default locale "${defaultLocale}" not found in compiled locales`);
  }

  const keys = Object.keys(defaultTree);

  // Write one file per key
  const exportNames: { key: string; exportName: string; fileName: string }[] = [];

  for (const key of keys) {
    const fileName = `${key}.ts`;
    const exportName = keyToExportName(key);
    const content = generateMessageFile(key, exportName, locales, defaultLocale);
    await writeFile(path.join(messagesDir, fileName), content);
    exportNames.push({ key, exportName, fileName });
  }

  // Write messages/_index.ts
  await writeFile(path.join(messagesDir, "_index.ts"), buildIndexFile(exportNames));

  // Write index.ts
  await writeFile(path.join(outputDir, "index.ts"), buildRootIndexFile());

  // Write messages.ts (re-exporting all messages)
  await writeFile(path.join(outputDir, "messages.ts"), buildMessagesFile());

  // Write runtime.ts (only if it doesn't already exist)
  const runtimePath = path.join(outputDir, "runtime.ts");
  const runtimeFile = Bun.file(runtimePath);
  if (!(await runtimeFile.exists())) {
    await writeFile(runtimePath, buildRuntimeFile(defaultLocale, config.locales));
  }

  // Write .gitignore to exclude all generated files from version control
  await writeFile(path.join(outputDir, ".gitignore"), "*\n");
}

// File content builders

function buildIndexFile(entries: { key: string; exportName: string; fileName: string }[]): string {
  const lines = ["// AUTO-GENERATED - do not edit", ""];
  for (const { key, exportName, fileName } of entries) {
    const stem = fileName.replace(/\.ts$/, "");
    if (key === exportName) {
      lines.push(`export { ${exportName} } from "./${stem}.ts";`);
    } else {
      // key has dots → the export is already camelCase; use named re-export
      lines.push(`export { ${exportName} } from "./${stem}.ts";`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function buildRootIndexFile(): string {
  return [
    "// AUTO-GENERATED - do not edit",
    `export { getLocale, setLocale, withLocale, localeStorage, locales, baseLocale } from "./runtime.ts";`,
    `export type { Locale, MaybePromise } from "./runtime.ts";`,
    "",
  ].join("\n");
}

function buildMessagesFile(): string {
  return `// AUTO-GENERATED - do not edit
export * from "./messages/_index.ts";

export * as m from "./messages/_index.ts";
`;
}

function buildRuntimeFile(defaultLocale: string, allLocales: string[]): string {
  const localeUnion = allLocales.map((l) => JSON.stringify(l)).join(" | ");
  const localesArray = JSON.stringify(allLocales);
  return `// AUTO-GENERATED - do not edit
import { AsyncLocalStorage } from "node:async_hooks";

export type Locale = ${localeUnion};
export type MaybePromise<T> = T | Promise<T>;

export const locales: Locale[] = ${localesArray};
export const baseLocale: Locale = ${JSON.stringify(defaultLocale)};

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
    .split(".")
    .map((part, i) => (i === 0 ? part : capitalize(part)))
    .join("");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function writeFile(filePath: string, content: string): Promise<void> {
  // Ensure parent directory exists
  await Bun.$`mkdir -p ${path.dirname(filePath)}`.quiet();
  await Bun.write(filePath, content);
}
