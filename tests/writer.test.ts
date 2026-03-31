import { describe, test, expect } from "bun:test";
import { keyToExportName } from "../src/writer.ts";

describe("keyToExportName", () => {
  test("key with no dots is returned unchanged", () => {
    expect(keyToExportName("greeting")).toBe("greeting");
  });

  test("single dot produces camelCase", () => {
    expect(keyToExportName("nav.home")).toBe("navHome");
  });

  test("multiple dots produce camelCase", () => {
    expect(keyToExportName("user.settings.title")).toBe("userSettingsTitle");
  });

  test("first part stays lowercase", () => {
    expect(keyToExportName("foo.bar")).toBe("fooBar");
  });

  test("subsequent parts are capitalized", () => {
    expect(keyToExportName("a.b.c.d")).toBe("aBCD");
  });

  test("single character parts", () => {
    expect(keyToExportName("a.b")).toBe("aB");
  });

  test("already camelCase part stays capitalized", () => {
    expect(keyToExportName("nav.myHome")).toBe("navMyHome");
  });
});
