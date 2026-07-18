import path from "node:path";
import { loadConfig } from "../../../src/config.ts";
import {
  parseRawLocale,
  flattenKeys,
  findMissingKeys,
  setNestedKey,
  collectLeafTexts,
  rebuildWithLeafTexts,
  maskVars,
  unmaskVars,
} from "../../../src/translate.ts";
import { deeplTranslate, resolveDeepLApiKey } from "../../../src/providers/deepl.ts";
import { googleTranslate, resolveGoogleApiKey } from "../../../src/providers/google.ts";
import { log } from "../logger.ts";
import type { RawLocaleJson } from "../../../src/schemas.ts";

export type TranslateProvider = "deepl" | "google";

export async function runTranslate(
  configPath: string,
  opts: {
    provider: TranslateProvider;
    apiKeyEnv?: string;
    locales?: string[];
    dryRun: boolean;
  },
): Promise<void> {
  const config = await loadConfig(configPath);
  const projectRoot = path.dirname(configPath);
  const messagesDir = path.resolve(projectRoot, config.messagesDir);

  const apiKey = opts.dryRun
    ? ""
    : opts.provider === "google"
      ? resolveGoogleApiKey(opts.apiKeyEnv)
      : resolveDeepLApiKey(opts.apiKeyEnv);

  const defaultFilePath = path.join(messagesDir, `${config.defaultLocale}.json`);
  const defaultRaw = parseRawLocale(await Bun.file(defaultFilePath).text(), defaultFilePath);
  const defaultFlat = flattenKeys(defaultRaw);

  const targetLocales = (opts.locales ?? config.locales).filter((l) => l !== config.defaultLocale);

  let totalTranslated = 0;

  for (const locale of targetLocales) {
    if (!config.locales.includes(locale)) {
      log.error(`"${locale}" is not a declared locale`);
      continue;
    }

    const filePath = path.join(messagesDir, `${locale}.json`);
    const file = Bun.file(filePath);
    const exists = await file.exists();
    const targetRawNested: RawLocaleJson = exists
      ? parseRawLocale(await file.text(), filePath)
      : {};
    const targetFlat = flattenKeys(targetRawNested);

    const missingKeys = findMissingKeys(defaultFlat, targetFlat);
    if (missingKeys.length === 0) {
      log.success(`[${locale}] no missing keys`);
      continue;
    }

    if (opts.dryRun) {
      for (const key of missingKeys) log.change(`[${locale}] would translate "${key}"`);
      continue;
    }

    log.build(`[${locale}] translating ${missingKeys.length} missing key(s)…`);

    // Flatten every missing key's leaf strings into one batch, masking {var}
    // placeholders so DeepL doesn't reformat them.
    const leafTexts: string[] = [];
    const leafTokens: string[][] = [];
    const keyLeafCounts: number[] = [];

    for (const key of missingKeys) {
      const texts = collectLeafTexts(defaultFlat[key]!);
      keyLeafCounts.push(texts.length);
      for (const t of texts) {
        const { masked, tokens } = maskVars(t);
        leafTexts.push(masked);
        leafTokens.push(tokens);
      }
    }

    const translate = opts.provider === "google" ? googleTranslate : deeplTranslate;
    const translated = await translate({
      apiKey,
      texts: leafTexts,
      targetLocale: locale,
      sourceLocale: config.defaultLocale,
    });
    const unmasked = translated.map((t, i) => unmaskVars(t, leafTokens[i]!));

    let cursor = 0;
    for (let i = 0; i < missingKeys.length; i++) {
      const key = missingKeys[i]!;
      const count = keyLeafCounts[i]!;
      const value = rebuildWithLeafTexts(defaultFlat[key]!, unmasked.slice(cursor, cursor + count));
      cursor += count;
      setNestedKey(targetRawNested, key, value);
    }

    await Bun.write(filePath, JSON.stringify(targetRawNested, null, 2) + "\n");
    log.success(`[${locale}] wrote ${missingKeys.length} translated key(s)`);
    totalTranslated += missingKeys.length;
  }

  if (!opts.dryRun) log.success(`done - ${totalTranslated} key(s) translated`);
}
