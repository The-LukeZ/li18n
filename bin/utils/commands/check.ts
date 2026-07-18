import path from "node:path";
import { loadConfig } from "../../../src/config.ts";
import { parseLocaleFile } from "../../../src/parser.ts";
import { analyzeTree } from "../../../src/analyzer.ts";
import { log } from "../logger.ts";

export async function runCheck(configPath: string): Promise<void> {
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
