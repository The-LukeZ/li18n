/**
 * translate.ts - machine-translation helpers: diffing missing keys between
 * locales, masking {var} placeholders so MT providers don't mangle them,
 * and rebuilding raw locale JSON with translated leaf strings.
 *
 * Operates on the raw (pre-flatten-AST) JSON shape from schemas.ts, not the
 * MessageNode AST, so untouched keys round-trip byte-for-byte in structure.
 */

import { ZodError } from "zod";
import { MessageJsonSchema, formatZodError } from "./schemas.ts";
import type { RawConditionalElement, RawLocaleJson, RawMessageValue } from "./schemas.ts";

// Parsing / flattening

export function parseRawLocale(jsonText: string, filePath: string): RawLocaleJson {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`${filePath}: invalid JSON - ${(err as Error).message}`);
  }

  try {
    return MessageJsonSchema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) throw new Error(formatZodError(err, filePath));
    throw err;
  }
}

/** Flattens nested namespaces into dot-keys, same rule as parser.ts. */
export function flattenKeys(
  obj: RawLocaleJson,
  prefix = "",
  out: Record<string, RawMessageValue> = {},
): Record<string, RawMessageValue> {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" || Array.isArray(value)) {
      out[fullKey] = value;
    } else {
      flattenKeys(value, fullKey, out);
    }
  }
  return out;
}

export function findMissingKeys(
  defaultFlat: Record<string, RawMessageValue>,
  targetFlat: Record<string, RawMessageValue>,
): string[] {
  return Object.keys(defaultFlat).filter((k) => !(k in targetFlat));
}

/** Sets a dot-path key on a nested locale JSON object, creating namespaces as needed. */
export function setNestedKey(
  obj: Record<string, RawMessageValue>,
  key: string,
  value: RawMessageValue,
): void {
  const parts = key.split(".");
  let cursor: Record<string, RawMessageValue> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const existing = cursor[part];
    if (existing && typeof existing === "object" && !Array.isArray(existing)) {
      cursor = existing as Record<string, RawMessageValue>;
    } else {
      const next: Record<string, RawMessageValue> = {};
      cursor[part] = next;
      cursor = next;
    }
  }
  cursor[parts[parts.length - 1]!] = value;
}

// Leaf text extraction / rebuild
//
// A flattened key's value is either a plain string, or a single-element
// conditional array whose cases hold the translatable strings.

export function collectLeafTexts(value: RawMessageValue): string[] {
  if (typeof value === "string") return [value];
  const elem = (value as [RawConditionalElement])[0]!;
  return Object.values(elem.cases);
}

export function rebuildWithLeafTexts(value: RawMessageValue, texts: string[]): RawMessageValue {
  if (typeof value === "string") return texts[0]!;
  const elem = (value as [RawConditionalElement])[0]!;
  const cases: Record<string, string> = {};
  Object.keys(elem.cases).forEach((caseKey, i) => {
    cases[caseKey] = texts[i]!;
  });
  return [{ var: elem.var, cases }];
}

// {var} placeholder masking
//
// Replaces each {name} / {name:type} occurrence with an opaque token before
// sending text to a translation provider, then restores the original
// placeholder text afterwards. Tokens are plain alphanumerics so MT engines
// treat them as an untranslatable proper noun instead of reformatting them.

const VAR_RE = /\{(\w+)(?::\w+)?\}/g;

export function maskVars(text: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  const masked = text.replace(VAR_RE, (match) => {
    const token = `LI18NVAR${tokens.length}X`;
    tokens.push(match);
    return token;
  });
  return { masked, tokens };
}

export function unmaskVars(text: string, tokens: string[]): string {
  let result = text;
  tokens.forEach((original, i) => {
    result = result.split(`LI18NVAR${i}X`).join(original);
  });
  return result;
}
