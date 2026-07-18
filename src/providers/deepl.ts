/**
 * providers/deepl.ts - raw DeepL REST API client (no SDK dependency).
 * https://developers.deepl.com/docs/api-reference/translate
 */

const MAX_BATCH = 50;

export interface DeepLTranslateOptions {
  apiKey: string;
  texts: string[];
  targetLocale: string;
  sourceLocale?: string;
  /** Override the endpoint (used in tests). */
  endpoint?: string;
}

/** Free-tier DeepL keys are suffixed with ":fx" and use a separate host. */
function resolveEndpoint(apiKey: string): string {
  return apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";
}

export async function deeplTranslate(options: DeepLTranslateOptions): Promise<string[]> {
  const { apiKey, texts, targetLocale, sourceLocale } = options;
  const endpoint = options.endpoint ?? resolveEndpoint(apiKey);
  const results: string[] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH);
    const body: Record<string, unknown> = {
      text: batch,
      target_lang: targetLocale.toUpperCase(),
    };
    if (sourceLocale) body.source_lang = sourceLocale.toUpperCase();

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`DeepL API error (${res.status}): ${errText || res.statusText}`);
    }

    const json = (await res.json()) as { translations: { text: string }[] };
    for (const t of json.translations) results.push(t.text);
  }

  return results;
}

export function resolveDeepLApiKey(envVarName?: string): string {
  if (envVarName) {
    const val = process.env[envVarName];
    if (!val) throw new Error(`environment variable "${envVarName}" is not set`);
    return val;
  }

  const val = process.env.LI18N_DEEPL_API_KEY ?? process.env.DEEPL_API_KEY;
  if (!val) {
    throw new Error(
      "no DeepL API key found - set LI18N_DEEPL_API_KEY or DEEPL_API_KEY, or pass --api-key-env <name>",
    );
  }
  return val;
}
