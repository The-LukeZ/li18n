import { describe, test, expect } from "bun:test";
import { generateMessageFile } from "../src/codegen.ts";
import type { CompiledLocales } from "../src/types.ts";

/**
 * Helper functions to construct message nodes for testing. These mirror the internal structure of the AST used by codegen, but with a more convenient API for test cases.
 */
function stringNode(template: string = "", vars: string[] = []) {
  return { kind: "string" as const, template, vars };
}

/**
 * Helper for constructing conditional nodes in tests. The `cases` array can specify an optional `vars` property for each case, which will be included in the param type if present.
 */
function conditionalNode(
  condVar: string,
  condType: "boolean" | "string" | "number",
  cases: { key: string; value: string; vars?: string[] }[],
) {
  return {
    kind: "conditional" as const,
    condVar,
    condType,
    cases: cases.map((c) => ({ key: c.key, value: c.value, vars: c.vars ?? [] })),
  };
}

/**
 * Helper for constructing a `CompiledLocales` object for testing. This allows test cases to define their locales using a simple nested object structure, while still providing the correct types for codegen.
 */
function locales(
  data: Record<
    string,
    Record<string, ReturnType<typeof stringNode> | ReturnType<typeof conditionalNode>>
  >,
): CompiledLocales {
  return data as unknown as CompiledLocales;
}

describe("generateMessageFile - header", () => {
  test("always emits auto-generated comment", () => {
    const output = generateMessageFile("msg", "msg", locales({ en: { msg: stringNode() } }), "en");
    expect(output).toContain("// AUTO-GENERATED - do not edit");
  });

  test("always imports getLocale and Locale from runtime", () => {
    const output = generateMessageFile("msg", "msg", locales({ en: { msg: stringNode() } }), "en");
    expect(output).toContain(`import { getLocale, type Locale } from "../runtime.ts";`);
  });
});

describe("generateMessageFile - string nodes", () => {
  test("string node with no vars produces no param arg", () => {
    const output = generateMessageFile(
      "greeting",
      "greeting",
      locales({ en: { greeting: stringNode() } }),
      "en",
    );
    expect(output).toContain("const _en = (): string =>");
    expect(output).toContain("export function greeting(locale?: Locale): string");
  });

  test("string node with no vars renders as string literal", () => {
    const output = generateMessageFile(
      "greeting",
      "greeting",
      locales({ en: { greeting: stringNode() } }),
      "en",
    );
    expect(output).toContain('""');
  });

  test("string node with vars includes params in type signature", () => {
    const output = generateMessageFile(
      "msg",
      "msg",
      locales({ en: { msg: stringNode("{name} {count}", ["name", "count"]) } }),
      "en",
    );
    expect(output).toContain("name: string");
    expect(output).toContain("count: string");
    expect(output).toContain("${p.name}");
    expect(output).toContain("${p.count}");
  });

  test("uses custom exportName for exported function", () => {
    const output = generateMessageFile(
      "nav.home",
      "navHome",
      locales({ en: { "nav.home": stringNode() } }),
      "en",
    );
    expect(output).toContain("export function navHome");
  });
});

describe("generateMessageFile - boolean conditionals", () => {
  test("renders ternary with boolean param type", () => {
    const output = generateMessageFile(
      "active",
      "active",
      locales({
        en: {
          active: conditionalNode("active", "boolean", [
            { key: "true", value: "Yes" },
            { key: "false", value: "No" },
          ]),
        },
      }),
      "en",
    );
    expect(output).toContain("active: boolean");
    expect(output).toMatch(/p\.active\s*\?\s*"Yes"\s*:\s*"No"/);
  });

  test("boolean case value with placeholder becomes template literal", () => {
    const output = generateMessageFile(
      "msg",
      "msg",
      locales({
        en: {
          msg: conditionalNode("isAdmin", "boolean", [
            { key: "true", value: "Hello {name}", vars: ["name"] },
            { key: "false", value: "Hi" },
          ]),
        },
      }),
      "en",
    );
    expect(output).toContain("name: string");
    expect(output).toContain("isAdmin: boolean");
    expect(output).toContain("p.name");
  });
});

describe("generateMessageFile - string conditionals", () => {
  test("renders ternary chain with === comparisons", () => {
    const output = generateMessageFile(
      "lang",
      "lang",
      locales({
        en: {
          lang: conditionalNode("lang", "string", [
            { key: "en", value: "English" },
            { key: "de", value: "German" },
            { key: "else", value: "Other" },
          ]),
        },
      }),
      "en",
    );
    expect(output).toContain(`p.lang === "en"`);
    expect(output).toContain(`p.lang === "de"`);
    expect(output).toContain('"English"');
    expect(output).toContain('"German"');
    expect(output).toContain('"Other"');
    expect(output).toContain("lang: string");
  });
});

describe("generateMessageFile - number conditionals", () => {
  test("operator key renders correct comparison", () => {
    const output = generateMessageFile(
      "items",
      "items",
      locales({
        en: {
          items: conditionalNode("count", "number", [
            { key: ">= 10", value: "many" },
            { key: "else", value: "some" },
          ]),
        },
      }),
      "en",
    );
    expect(output).toContain("p.count >= 10");
    expect(output).toContain("count: number");
  });

  test("bare number key normalizes to === comparison", () => {
    const output = generateMessageFile(
      "n",
      "n",
      locales({
        en: {
          n: conditionalNode("n", "number", [
            { key: "1", value: "one" },
            { key: "else", value: "many" },
          ]),
        },
      }),
      "en",
    );
    expect(output).toContain("p.n === 1");
  });

  test("negative number key works", () => {
    const output = generateMessageFile(
      "temp",
      "temp",
      locales({
        en: {
          temp: conditionalNode("temp", "number", [
            { key: "< 0", value: "freezing" },
            { key: "else", value: "warm" },
          ]),
        },
      }),
      "en",
    );
    expect(output).toContain("p.temp < 0");
  });
});

describe("generateMessageFile - multi-locale dispatch", () => {
  test("emits switch with non-default locales as cases", () => {
    const output = generateMessageFile(
      "greeting",
      "greeting",
      locales({
        en: { greeting: stringNode() },
        de: { greeting: stringNode() },
        fr: { greeting: stringNode() },
      }),
      "en",
    );
    expect(output).toContain(`case "de":`);
    expect(output).toContain(`case "fr":`);
    expect(output).toContain("return _de");
    expect(output).toContain("return _fr");
    expect(output).toContain("default:");
    expect(output).toContain("return _en");
    expect(output).not.toContain(`case "en":`);
  });

  test("emits a private function per locale", () => {
    const output = generateMessageFile(
      "msg",
      "msg",
      locales({ en: { msg: stringNode() }, de: { msg: stringNode() } }),
      "en",
    );
    expect(output).toContain("const _en =");
    expect(output).toContain("const _de =");
  });

  test("single locale has only the default branch", () => {
    const output = generateMessageFile("msg", "msg", locales({ en: { msg: stringNode() } }), "en");
    expect(output).toContain("default:");
    expect(output).toContain("return _en");
    expect(output).not.toContain(`case "`);
  });
});

describe("generateMessageFile - param union across locales", () => {
  test("unions params from all locales", () => {
    const output = generateMessageFile(
      "msg",
      "msg",
      locales({
        en: { msg: stringNode("{name}", ["name"]) },
        de: { msg: stringNode("{count}", ["count"]) },
      }),
      "en",
    );
    expect(output).toContain("name: string");
    expect(output).toContain("count: string");
  });

  test("boolean type from conditional wins for condVar", () => {
    const node = conditionalNode("active", "boolean", [
      { key: "true", value: "Yes" },
      { key: "false", value: "No" },
    ]);
    const output = generateMessageFile(
      "flag",
      "flag",
      locales({ en: { flag: node }, de: { flag: node } }),
      "en",
    );
    expect(output).toContain("active: boolean");
    expect(output).not.toContain("active: string");
  });
});

describe("generateMessageFile - error cases", () => {
  test("throws when key is missing in a locale", () => {
    expect(() =>
      generateMessageFile(
        "greeting",
        "greeting",
        locales({ en: { greeting: stringNode() }, de: {} }),
        "en",
      ),
    ).toThrow(/greeting/);
  });
});

describe("generateMessageFile - locale override", () => {
  test("no-params message uses function declaration with optional locale param", () => {
    const output = generateMessageFile(
      "greeting",
      "greeting",
      locales({ en: { greeting: stringNode("Hello") } }),
      "en",
    );
    expect(output).toContain("export function greeting(locale?: Locale): string");
    expect(output).toContain("const loc = locale ?? getLocale()");
    expect(output).toContain("switch (loc)");
  });

  test("with-params message emits two overloads plus implementation", () => {
    const output = generateMessageFile(
      "msg",
      "msg",
      locales({ en: { msg: stringNode("{name}", ["name"]) } }),
      "en",
    );
    expect(output).toContain("export function msg(pOrLocale?: Locale): string;");
    expect(output).toContain(
      "export function msg(pOrLocale?: { name: string }, locale?: Locale): string;",
    );
    expect(output).toContain(
      "export function msg(pOrLocale?: { name: string } | Locale, locale?: Locale): string {",
    );
    expect(output).toContain(`const p = (typeof pOrLocale === "string" ? {} : pOrLocale) as { name: string };`);
    expect(output).toContain(`const loc = typeof pOrLocale === "string" ? pOrLocale : locale ?? getLocale();`);
    expect(output).toContain("switch (loc)");
  });

  test("with-params dispatch passes p to locale functions", () => {
    const output = generateMessageFile(
      "msg",
      "msg",
      locales({ en: { msg: stringNode("{name}", ["name"]) }, de: { msg: stringNode("{name}", ["name"]) } }),
      "en",
    );
    expect(output).toContain("return _de(p)");
    expect(output).toContain("return _en(p)");
  });

  test("no-params dispatch does not pass p to locale functions", () => {
    const output = generateMessageFile(
      "greeting",
      "greeting",
      locales({ en: { greeting: stringNode() }, de: { greeting: stringNode() } }),
      "en",
    );
    expect(output).toContain("return _de()");
    expect(output).toContain("return _en()");
  });
});
