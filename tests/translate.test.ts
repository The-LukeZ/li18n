import { describe, expect, test } from "bun:test";
import {
  collectLeafTexts,
  findMissingKeys,
  flattenKeys,
  maskVars,
  parseRawLocale,
  rebuildWithLeafTexts,
  setNestedKey,
  unmaskVars,
} from "../src/translate.ts";

describe("maskVars / unmaskVars", () => {
  test("masks and restores a single placeholder", () => {
    const { masked, tokens } = maskVars("Hello {name}!");
    expect(masked).toBe("Hello LI18NVAR0X!");
    expect(unmaskVars(masked, tokens)).toBe("Hello {name}!");
  });

  test("masks and restores multiple placeholders including type hints", () => {
    const { masked, tokens } = maskVars("{count:num} items for {user}");
    expect(masked).toBe("LI18NVAR0X items for LI18NVAR1X");
    expect(unmaskVars(masked, tokens)).toBe("{count:num} items for {user}");
  });

  test("no-op on text without placeholders", () => {
    const { masked, tokens } = maskVars("plain text");
    expect(masked).toBe("plain text");
    expect(tokens).toEqual([]);
  });
});

describe("collectLeafTexts / rebuildWithLeafTexts", () => {
  test("string node round-trips", () => {
    expect(collectLeafTexts("Hello {name}!")).toEqual(["Hello {name}!"]);
    expect(rebuildWithLeafTexts("Hello {name}!", ["Hallo {name}!"])).toBe("Hallo {name}!");
  });

  test("conditional node collects and rebuilds case values in order", () => {
    const value: import("../src/schemas.ts").RawMessageValue = [
      { var: { bool: "isAdmin" }, cases: { true: "Admin", false: "User" } },
    ];
    expect(collectLeafTexts(value)).toEqual(["Admin", "User"]);
    const rebuilt = rebuildWithLeafTexts(value, ["Admin-DE", "User-DE"]);
    expect(rebuilt).toEqual([
      { var: { bool: "isAdmin" }, cases: { true: "Admin-DE", false: "User-DE" } },
    ]);
  });
});

describe("flattenKeys / findMissingKeys / setNestedKey", () => {
  const raw = parseRawLocale(
    JSON.stringify({ greeting: "Hi", nav: { home: "Home", about: "About" } }),
    "en.json",
  );

  test("flattens nested namespaces into dot keys", () => {
    expect(flattenKeys(raw)).toEqual({
      greeting: "Hi",
      "nav.home": "Home",
      "nav.about": "About",
    });
  });

  test("finds keys present in default but missing in target", () => {
    const defaultFlat = flattenKeys(raw);
    const targetFlat = flattenKeys(
      parseRawLocale(JSON.stringify({ nav: { home: "Start" } }), "de.json"),
    );
    expect(findMissingKeys(defaultFlat, targetFlat)).toEqual(["greeting", "nav.about"]);
  });

  test("sets a nested key, creating namespaces as needed", () => {
    const target: Record<string, any> = { nav: { home: "Start" } };
    setNestedKey(target, "nav.about", "Über uns");
    setNestedKey(target, "greeting", "Hallo");
    expect(target).toEqual({ nav: { home: "Start", about: "Über uns" }, greeting: "Hallo" });
  });
});
