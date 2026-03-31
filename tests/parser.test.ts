import { describe, test, expect } from "bun:test";
import { extractVars, parseLocaleFile } from "../src/parser.ts";

describe("extractVars", () => {
  test("returns empty array for string with no placeholders", () => {
    expect(extractVars("Hello world")).toEqual([]);
  });

  test("extracts a single placeholder", () => {
    expect(extractVars("Hello {name}")).toEqual(["name"]);
  });

  test("extracts multiple placeholders in order", () => {
    expect(extractVars("{greeting}, {name}! You have {count} items.")).toEqual([
      "greeting",
      "name",
      "count",
    ]);
  });

  test("deduplicates repeated placeholders", () => {
    expect(extractVars("{name} and {name} again")).toEqual(["name"]);
  });

  test("preserves first-occurrence order when deduplicating", () => {
    expect(extractVars("{b} then {a} then {b} then {c}")).toEqual(["b", "a", "c"]);
  });

  test("ignores non-word characters inside braces", () => {
    expect(extractVars("{ } and {hello world}")).toEqual([]);
  });

  test("handles empty string", () => {
    expect(extractVars("")).toEqual([]);
  });
});

describe("parseLocaleFile", () => {
  test("throws on invalid JSON with filename in message", () => {
    expect(() => parseLocaleFile("not json", "messages/en.json")).toThrow(
      /messages\/en\.json.*invalid JSON/i,
    );
  });

  test("throws Zod error on schema violation", () => {
    // Numbers are not valid message values
    expect(() => parseLocaleFile(JSON.stringify({ greeting: 42 }), "en.json")).toThrow();
  });

  test("parses a flat string message", () => {
    const tree = parseLocaleFile(JSON.stringify({ greeting: "Hello" }), "en.json");
    expect(tree["greeting"]).toEqual({ kind: "string", template: "Hello", vars: [] });
  });

  test("parses a string message and extracts vars", () => {
    const tree = parseLocaleFile(JSON.stringify({ msg: "Hi {name}" }), "en.json");
    expect(tree["msg"]).toEqual({ kind: "string", template: "Hi {name}", vars: ["name"] });
  });

  test("stores the original template string alongside vars", () => {
    const tree = parseLocaleFile(JSON.stringify({ msg: "Hello {name}!" }), "en.json");
    const node = tree["msg"]!;
    expect(node.kind).toBe("string");
    if (node.kind === "string") {
      expect(node.template).toBe("Hello {name}!");
      expect(node.vars).toEqual(["name"]);
    }
  });

  test("flattens nested objects with dot keys", () => {
    const tree = parseLocaleFile(
      JSON.stringify({ nav: { home: "Home", about: "About" } }),
      "en.json",
    );
    expect(tree["nav.home"]).toEqual({ kind: "string", template: "Home", vars: [] });
    expect(tree["nav.about"]).toEqual({ kind: "string", template: "About", vars: [] });
    expect("nav" in tree).toBe(false);
  });

  test("flattens deeply nested objects", () => {
    const tree = parseLocaleFile(
      JSON.stringify({ user: { settings: { title: "Settings" } } }),
      "en.json",
    );
    expect(tree["user.settings.title"]).toEqual({ kind: "string", template: "Settings", vars: [] });
  });

  test("parses a plain string conditional", () => {
    const tree = parseLocaleFile(
      JSON.stringify({
        role: [{ var: "isAdmin", cases: { true: "Admin", false: "User" } }],
      }),
      "en.json",
    );
    const node = tree["role"]!;
    expect(node.kind).toBe("conditional");
    if (node.kind === "conditional") {
      expect(node.condVar).toBe("isAdmin");
      expect(node.cases).toHaveLength(2);
      expect(node.cases.find((c) => c.key === "true")?.value).toBe("Admin");
    }
  });

  test("parses a conditional and extracts vars from case values", () => {
    const tree = parseLocaleFile(
      JSON.stringify({
        msg: [{ var: "isAdmin", cases: { true: "Hi {name}", false: "Hello" } }],
      }),
      "en.json",
    );
    const node = tree["msg"]!;
    expect(node.kind).toBe("conditional");
    if (node.kind === "conditional") {
      expect(node.cases.find((c) => c.key === "true")?.vars).toEqual(["name"]);
      expect(node.cases.find((c) => c.key === "false")?.vars).toEqual([]);
    }
  });

  test("explicit bool hint sets condType to boolean", () => {
    const tree = parseLocaleFile(
      JSON.stringify({
        active: [{ var: { bool: "active" }, cases: { true: "Yes", false: "No" } }],
      }),
      "en.json",
    );
    const node = tree["active"]!;
    expect(node.kind).toBe("conditional");
    if (node.kind === "conditional") {
      expect(node.condVar).toBe("active");
      expect(node.condType).toBe("boolean");
    }
  });

  test("explicit num hint sets condType to number", () => {
    const tree = parseLocaleFile(
      JSON.stringify({
        count: [{ var: { num: "count" }, cases: { "1": "one", else: "{count} items" } }],
      }),
      "en.json",
    );
    const node = tree["count"]!;
    expect(node.kind).toBe("conditional");
    if (node.kind === "conditional") {
      expect(node.condVar).toBe("count");
      expect(node.condType).toBe("number");
    }
  });

  test("explicit str hint sets condType to string", () => {
    const tree = parseLocaleFile(
      JSON.stringify({
        lang: [{ var: { str: "lang" }, cases: { en: "English", de: "German" } }],
      }),
      "en.json",
    );
    const node = tree["lang"]!;
    expect(node.kind).toBe("conditional");
    if (node.kind === "conditional") {
      expect(node.condVar).toBe("lang");
      expect(node.condType).toBe("string");
    }
  });

  test("parses multiple top-level keys", () => {
    const tree = parseLocaleFile(JSON.stringify({ a: "A", b: "B", c: "C" }), "en.json");
    expect(Object.keys(tree).sort()).toEqual(["a", "b", "c"]);
  });

  test("handles empty object", () => {
    const tree = parseLocaleFile(JSON.stringify({}), "en.json");
    expect(tree).toEqual({});
  });
});
