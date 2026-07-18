import { afterEach, describe, expect, test } from "bun:test";
import { googleTranslate, resolveGoogleApiKey } from "../../src/providers/google.ts";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

describe("googleTranslate", () => {
  test("sends batched requests and returns translated texts in order", async () => {
    const calls: {
      url: string;
      body: { q: string[]; target: string; source?: string; format: string };
    }[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      calls.push({ url, body });
      return new Response(
        JSON.stringify({
          data: { translations: body.q.map((t: string) => ({ translatedText: `DE:${t}` })) },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await googleTranslate({
      apiKey: "fake-key",
      texts: ["Hello", "World"],
      targetLocale: "de",
      sourceLocale: "en",
    });

    expect(result).toEqual(["DE:Hello", "DE:World"]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain("key=fake-key");
    expect(calls[0]!.body).toEqual({
      q: ["Hello", "World"],
      target: "de",
      format: "text",
      source: "en",
    });
  });

  test("chunks requests larger than the 128-text batch limit", async () => {
    const batchSizes: number[] = [];
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      batchSizes.push(body.q.length);
      return new Response(
        JSON.stringify({
          data: { translations: body.q.map((t: string) => ({ translatedText: t })) },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const texts = Array.from({ length: 300 }, (_, i) => `text-${i}`);
    const result = await googleTranslate({ apiKey: "fake-key", texts, targetLocale: "de" });

    expect(batchSizes).toEqual([128, 128, 44]);
    expect(result).toHaveLength(300);
  });

  test("throws with status and body text on a non-ok response", async () => {
    globalThis.fetch = (async () =>
      new Response("quota exceeded", { status: 456 })) as unknown as typeof fetch;

    expect(
      googleTranslate({ apiKey: "fake-key", texts: ["hi"], targetLocale: "de" }),
    ).rejects.toThrow(/Google Translate API error \(456\): quota exceeded/);
  });
});

describe("resolveGoogleApiKey", () => {
  test("prefers LI18N_GOOGLE_API_KEY over GOOGLE_TRANSLATE_API_KEY", () => {
    process.env.LI18N_GOOGLE_API_KEY = "primary";
    process.env.GOOGLE_TRANSLATE_API_KEY = "fallback";
    expect(resolveGoogleApiKey()).toBe("primary");
  });

  test("falls back to GOOGLE_TRANSLATE_API_KEY", () => {
    delete process.env.LI18N_GOOGLE_API_KEY;
    process.env.GOOGLE_TRANSLATE_API_KEY = "fallback";
    expect(resolveGoogleApiKey()).toBe("fallback");
  });

  test("uses a named env var when given", () => {
    process.env.CUSTOM_KEY = "custom-value";
    expect(resolveGoogleApiKey("CUSTOM_KEY")).toBe("custom-value");
  });

  test("throws when the named env var is unset", () => {
    delete process.env.CUSTOM_KEY;
    expect(() => resolveGoogleApiKey("CUSTOM_KEY")).toThrow(/CUSTOM_KEY/);
  });

  test("throws when no key is found anywhere", () => {
    delete process.env.LI18N_GOOGLE_API_KEY;
    delete process.env.GOOGLE_TRANSLATE_API_KEY;
    expect(() => resolveGoogleApiKey()).toThrow(/no Google Translate API key found/);
  });
});
