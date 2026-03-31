/**
 * Integration test: runs the full compile pipeline against the fixture locale files
 * in tests/fixture/ and verifies the generated output.
 */
import { describe, test, expect, afterAll } from "bun:test";
import path from "node:path";
import { rmSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { compile } from "../src/index.ts";

const ROOT = path.resolve(import.meta.dir, "..");
const CONFIG_PATH = path.join(ROOT, "tests/fixture/li18n.config.json");
const OUTPUT_DIR = mkdtempSync(path.join(tmpdir(), "li18n-integration-"));

afterAll(() => {
  // Clean up the temp output dir
  if (existsSync(OUTPUT_DIR)) {
    rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
});

describe("compile() - full pipeline", () => {
  test("compiles without errors", async () => {
    const result = await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    expect(result.errors).toHaveLength(0);
  });

  test("reports correct key count (6 keys from both locales)", async () => {
    const result = await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    // keys: greeting, farewell, nav.home, nav.about, role, items, lang = 7
    expect(result.keyCount).toBe(7);
  });

  test("writes index.ts to outputDir", async () => {
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    const indexFile = Bun.file(path.join(OUTPUT_DIR, "index.ts"));
    expect(await indexFile.exists()).toBe(true);
    const content = await indexFile.text();
    expect(content).toContain("export * as m from");
    expect(content).toContain("getLocale");
  });

  test("writes runtime.ts to outputDir", async () => {
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    const runtimeFile = Bun.file(path.join(OUTPUT_DIR, "runtime.ts"));
    expect(await runtimeFile.exists()).toBe(true);
    const content = await runtimeFile.text();
    expect(content).toContain("getLocale");
    expect(content).toContain("withLocale");
    expect(content).toContain("AsyncLocalStorage");
    // Default locale hardcoded
    expect(content).toContain('"en"');
  });

  test("writes messages/_index.ts with all key exports", async () => {
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    const indexFile = Bun.file(path.join(OUTPUT_DIR, "messages/_index.ts"));
    expect(await indexFile.exists()).toBe(true);
    const content = await indexFile.text();
    expect(content).toContain("greeting");
    expect(content).toContain("farewell");
    expect(content).toContain("navHome");
    expect(content).toContain("navAbout");
    expect(content).toContain('"nav.home"');
    expect(content).toContain('"nav.about"');
    expect(content).toContain("role");
    expect(content).toContain("items");
    expect(content).toContain("lang");
  });

  test("writes a message file per key", async () => {
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    const keys = ["greeting", "farewell", "navHome", "navAbout", "role", "items", "lang"];
    for (const key of keys) {
      const file = Bun.file(path.join(OUTPUT_DIR, `messages/${key}.ts`));
      expect(await file.exists()).toBe(true);
    }
  });

  test("generated message file has correct dispatch structure", async () => {
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    const content = await Bun.file(path.join(OUTPUT_DIR, "messages/greeting.ts")).text();
    expect(content).toContain("// AUTO-GENERATED - do not edit");
    expect(content).toContain(`import { getLocale, type Locale } from "../runtime.ts"`);
    expect(content).toContain("const _en =");
    expect(content).toContain("const _de =");
    expect(content).toContain(`case "de":`);
    expect(content).toContain("default:");
    expect(content).toContain("export function greeting");
  });

  test("boolean conditional message file has boolean param", async () => {
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    const content = await Bun.file(path.join(OUTPUT_DIR, "messages/role.ts")).text();
    expect(content).toContain("isAdmin: boolean");
    expect(content).toContain("p.isAdmin");
  });

  test("number conditional message file has number param", async () => {
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    const content = await Bun.file(path.join(OUTPUT_DIR, "messages/items.ts")).text();
    expect(content).toContain("count: number");
    expect(content).toContain("p.count");
  });

  test("does not overwrite existing runtime.ts on second compile", async () => {
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });
    // Overwrite runtime with a sentinel value
    const runtimePath = path.join(OUTPUT_DIR, "runtime.ts");
    await Bun.write(runtimePath, "// sentinel");

    // Second compile
    await compile({ configPath: CONFIG_PATH, outputDir: OUTPUT_DIR });

    const content = await Bun.file(runtimePath).text();
    expect(content).toBe("// sentinel");
  });
});
