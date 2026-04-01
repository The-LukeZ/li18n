import { describe, test, expect } from "bun:test";
import { m, withLocale, overwriteGetLocale } from "./fixture/generated";

async function handler(options: { lang: string }): Promise<string> {
  console.log("Handler called with options:", options);
  return m.greeting({ name: "Alice" });
}

const _test = withLocale(handler, (options) => {
  return options.lang as "en" | "de";
});

describe("withLocale", () => {
  test("returns the correct message based on the locale", async () => {
    const output = await _test({ lang: "en" });
    expect(output).toBe("Hello Alice!");
  });
});

describe("overwriteGetLocale", () => {
  test("overrides locale resolution within the current withLocale context", async () => {
    const localized = withLocale(
      async () => {
        overwriteGetLocale(() => "de");
        return m.greeting({ name: "Alice" });
      },
      () => "en",
    );
    const output = await localized();
    expect(output).toBe("Hallo Alice!");
  });

  test("does not bleed into other concurrent withLocale contexts", async () => {
    const slow = withLocale(
      async () => {
        overwriteGetLocale(() => "de");
        await Bun.sleep(20);
        return m.greeting({ name: "Alice" });
      },
      () => "en",
    );

    const fast = withLocale(
      async () => {
        await Bun.sleep(5);
        return m.greeting({ name: "Alice" });
      },
      () => "en",
    );

    const [slowResult, fastResult] = await Promise.all([slow(), fast()]);
    expect(slowResult).toBe("Hallo Alice!");
    expect(fastResult).toBe("Hello Alice!");
  });
});
