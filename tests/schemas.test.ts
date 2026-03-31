import { describe, test, expect } from "bun:test";
import { z } from "zod";
import { Li18nConfigSchema, MessageJsonSchema, formatZodError } from "../src/schemas.ts";

describe("Li18nConfigSchema", () => {
  const valid = {
    locales: ["en", "de"],
    defaultLocale: "en",
    messagesDir: "messages",
    outputDir: "src/generated",
  };

  test("accepts a valid config", () => {
    const result = Li18nConfigSchema.parse(valid);
    expect(result).toEqual(valid);
  });

  test("rejects empty locales array", () => {
    expect(() => Li18nConfigSchema.parse({ ...valid, locales: [] })).toThrow();
  });

  test("rejects defaultLocale not in locales", () => {
    expect(() => Li18nConfigSchema.parse({ ...valid, defaultLocale: "fr" })).toThrow();
  });

  test("rejects missing messagesDir", () => {
    const { messagesDir: _, ...rest } = valid;
    expect(() => Li18nConfigSchema.parse(rest)).toThrow();
  });

  test("rejects missing outputDir", () => {
    const { outputDir: _, ...rest } = valid;
    expect(() => Li18nConfigSchema.parse(rest)).toThrow();
  });

  test("accepts single locale where defaultLocale matches", () => {
    const result = Li18nConfigSchema.parse({ ...valid, locales: ["en"], defaultLocale: "en" });
    expect(result.locales).toEqual(["en"]);
  });
});

describe("MessageJsonSchema", () => {
  test("validates flat string values", () => {
    const result = MessageJsonSchema.parse({ greeting: "Hello", farewell: "Goodbye" });
    expect(result).toEqual({ greeting: "Hello", farewell: "Goodbye" });
  });

  test("validates nested objects", () => {
    const result = MessageJsonSchema.parse({ nav: { home: "Home", about: "About" } });
    expect(result).toEqual({ nav: { home: "Home", about: "About" } });
  });

  test("validates deeply nested objects", () => {
    const input = { user: { settings: { title: "Settings" } } };
    expect(MessageJsonSchema.parse(input)).toEqual(input);
  });

  test("validates conditional with plain string var", () => {
    const result = MessageJsonSchema.parse({
      role: [{ var: "isAdmin", cases: { true: "Admin", false: "User" } }],
    });
    expect(Array.isArray(result.role)).toBe(true);
  });

  test("validates conditional with bool type hint", () => {
    expect(() =>
      MessageJsonSchema.parse({
        active: [{ var: { bool: "active" }, cases: { true: "Yes", false: "No" } }],
      }),
    ).not.toThrow();
  });

  test("validates conditional with num type hint", () => {
    expect(() =>
      MessageJsonSchema.parse({
        count: [{ var: { num: "count" }, cases: { "1": "one", else: "{count} items" } }],
      }),
    ).not.toThrow();
  });

  test("validates conditional with str type hint", () => {
    expect(() =>
      MessageJsonSchema.parse({
        lang: [{ var: { str: "lang" }, cases: { en: "English", else: "Other" } }],
      }),
    ).not.toThrow();
  });

  test("rejects conditional with extra fields on element", () => {
    expect(() =>
      MessageJsonSchema.parse({
        test: [{ var: "x", cases: { a: "b" }, extra: "bad" }],
      }),
    ).toThrow();
  });

  test("rejects non-string case values", () => {
    expect(() =>
      MessageJsonSchema.parse({
        test: [{ var: "x", cases: { a: 42 } }],
      }),
    ).toThrow();
  });

  test("rejects array with zero elements", () => {
    expect(() => MessageJsonSchema.parse({ test: [] })).toThrow();
  });

  test("rejects array with two elements", () => {
    expect(() =>
      MessageJsonSchema.parse({
        test: [
          { var: "x", cases: { a: "b" } },
          { var: "y", cases: { c: "d" } },
        ],
      }),
    ).toThrow();
  });

  test("string with template placeholders is valid", () => {
    const result = MessageJsonSchema.parse({ msg: "Hello {name}, you have {count} items" });
    expect(result.msg).toBe("Hello {name}, you have {count} items");
  });
});

describe("formatZodError", () => {
  test("formats a single error with a path", () => {
    const schema = z.object({ name: z.string() });
    let err: z.ZodError | null = null;
    try {
      schema.parse({ name: 123 });
    } catch (e) {
      err = e as z.ZodError;
    }
    const msg = formatZodError(err!, "config.json");
    expect(msg).toContain("config.json → name:");
  });

  test("formats a root-level error as (root)", () => {
    const schema = z.string().refine(() => false, { message: "root problem" });
    let err: z.ZodError | null = null;
    try {
      schema.parse("x");
    } catch (e) {
      err = e as z.ZodError;
    }
    const msg = formatZodError(err!, "file.json");
    expect(msg).toContain("file.json → (root): root problem");
  });

  test("joins multiple issues with newlines", () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    let err: z.ZodError | null = null;
    try {
      schema.parse({ a: 1, b: "x" });
    } catch (e) {
      err = e as z.ZodError;
    }
    const msg = formatZodError(err!, "test.json");
    const lines = msg.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(line).toStartWith("test.json →");
    }
  });

  test("formats Li18nConfigSchema cross-field error", () => {
    let err: z.ZodError | null = null;
    try {
      Li18nConfigSchema.parse({
        locales: ["en"],
        defaultLocale: "de",
        messagesDir: "m",
        outputDir: "o",
      });
    } catch (e) {
      err = e as z.ZodError;
    }
    const msg = formatZodError(err!, "li18n.config.json");
    expect(msg).toContain("li18n.config.json → defaultLocale:");
  });
});
