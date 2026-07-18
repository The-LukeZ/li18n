/**
 * providers/google.ts - raw Google Cloud Translation API (Basic/v2) client (no SDK dependency).
 * https://cloud.google.com/translate/docs/reference/rest/v2/translate
 */

const MAX_BATCH = 128;
const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

export interface GoogleTranslateOptions {
  apiKey: string;
  texts: string[];
  targetLocale: string;
  sourceLocale?: string;
  /** Override the endpoint (used in tests). */
  endpoint?: string;
}

export async function googleTranslate(options: GoogleTranslateOptions): Promise<string[]> {
  const { apiKey, texts, targetLocale, sourceLocale } = options;
  const endpoint = options.endpoint ?? ENDPOINT;
  const results: string[] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH);
    const body: Record<string, unknown> = {
      q: batch,
      target: targetLocale,
      format: "text",
    };
    if (sourceLocale) body.source = sourceLocale;

    const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Google Translate API error (${res.status}): ${errText || res.statusText}`);
    }

    const json = (await res.json()) as { data: { translations: { translatedText: string }[] } };
    for (const t of json.data.translations) results.push(t.translatedText);
  }

  return results;
}

export function resolveGoogleApiKey(envVarName?: string): string {
  if (envVarName) {
    const val = process.env[envVarName];
    if (!val) throw new Error(`environment variable "${envVarName}" is not set`);
    return val;
  }

  const val = process.env.LI18N_GOOGLE_API_KEY ?? process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!val) {
    throw new Error(
      "no Google Translate API key found - set LI18N_GOOGLE_API_KEY or GOOGLE_TRANSLATE_API_KEY, or pass --api-key-env <name>",
    );
  }
  return val;
}
