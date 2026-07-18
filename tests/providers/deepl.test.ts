import { afterEach, describe, expect, test } from "bun:test";
import { deeplTranslate, resolveDeepLApiKey } from "../../src/providers/deepl.ts";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

describe("deeplTranslate", () => {
  test("sends batched requests and returns translated texts in order", async () => {
    const calls: {
      text: string[];
      target_lang: string;
      source_lang?: string;
      preserve_formatting: boolean;
    }[] = [];
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      calls.push(body);
      return new Response(
        JSON.stringify({ translations: body.text.map((t: string) => ({ text: `DE:${t}` })) }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await deeplTranslate({
      apiKey: "fake-key:fx",
      texts: ["Hello", "World"],
      targetLocale: "de",
      sourceLocale: "en",
    });

    expect(result).toEqual(["DE:Hello", "DE:World"]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      text: ["Hello", "World"],
      target_lang: "DE",
      source_lang: "EN",
      preserve_formatting: true,
    });
  });

  test("chunks requests larger than the 50-text batch limit", async () => {
    const batchSizes: number[] = [];
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      batchSizes.push(body.text.length);
      return new Response(
        JSON.stringify({ translations: body.text.map((t: string) => ({ text: t })) }),
        { status: 200 },
      );
    }) as typeof fetch;

    const texts = Array.from({ length: 120 }, (_, i) => `text-${i}`);
    const result = await deeplTranslate({ apiKey: "fake-key:fx", texts, targetLocale: "de" });

    expect(batchSizes).toEqual([50, 50, 20]);
    expect(result).toHaveLength(120);
  });

  test("throws with status and body text on a non-ok response", async () => {
    globalThis.fetch = (async () =>
      new Response("quota exceeded", { status: 456 })) as unknown as typeof fetch;

    // idk why we dont have to await this B but it works
    expect(
      deeplTranslate({ apiKey: "fake-key:fx", texts: ["hi"], targetLocale: "de" }),
    ).rejects.toThrow(/DeepL API error \(456\): quota exceeded/);
  });
});

describe("resolveDeepLApiKey", () => {
  test("prefers LI18N_DEEPL_API_KEY over DEEPL_API_KEY", () => {
    process.env.LI18N_DEEPL_API_KEY = "primary";
    process.env.DEEPL_API_KEY = "fallback";
    expect(resolveDeepLApiKey()).toBe("primary");
  });

  test("falls back to DEEPL_API_KEY", () => {
    delete process.env.LI18N_DEEPL_API_KEY;
    process.env.DEEPL_API_KEY = "fallback";
    expect(resolveDeepLApiKey()).toBe("fallback");
  });

  test("uses a named env var when given", () => {
    process.env.CUSTOM_KEY = "custom-value";
    expect(resolveDeepLApiKey("CUSTOM_KEY")).toBe("custom-value");
  });

  test("throws when the named env var is unset", () => {
    delete process.env.CUSTOM_KEY;
    expect(() => resolveDeepLApiKey("CUSTOM_KEY")).toThrow(/CUSTOM_KEY/);
  });

  test("throws when no key is found anywhere", () => {
    delete process.env.LI18N_DEEPL_API_KEY;
    delete process.env.DEEPL_API_KEY;
    expect(() => resolveDeepLApiKey()).toThrow(/no DeepL API key found/);
  });
});
