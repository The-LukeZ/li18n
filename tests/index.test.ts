import { describe, test, expect } from "bun:test";
import { m, withLocale } from "./fixture/generated";

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
