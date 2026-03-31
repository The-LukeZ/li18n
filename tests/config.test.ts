import { describe, test, expect, afterEach } from "bun:test";
import { loadConfig } from "../src/config.ts";
import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";

function tmpPath() {
  return `/tmp/li18n-test-${randomUUID()}.json`;
}

const written: string[] = [];

afterEach(() => {
  for (const p of written.splice(0)) {
    try {
      unlinkSync(p);
    } catch {}
  }
});

async function writeTmp(content: string): Promise<string> {
  const path = tmpPath();
  await Bun.write(path, content);
  written.push(path);
  return path;
}

describe("loadConfig", () => {
  test("loads a valid config file", async () => {
    const path = await writeTmp(
      JSON.stringify({
        locales: ["en", "de"],
        defaultLocale: "en",
        messagesDir: "messages",
        outputDir: "out",
      }),
    );
    const config = await loadConfig(path);
    expect(config.locales).toEqual(["en", "de"]);
    expect(config.defaultLocale).toBe("en");
    expect(config.messagesDir).toBe("messages");
    expect(config.outputDir).toBe("out");
  });

  test("throws on invalid JSON", async () => {
    const path = await writeTmp("not valid json {{{");
    await expect(loadConfig(path)).rejects.toThrow();
  });

  test("throws when defaultLocale is not in locales", async () => {
    const path = await writeTmp(
      JSON.stringify({
        locales: ["en"],
        defaultLocale: "de",
        messagesDir: "messages",
        outputDir: "out",
      }),
    );
    await expect(loadConfig(path)).rejects.toThrow();
  });

  test("throws when required fields are missing", async () => {
    const path = await writeTmp(JSON.stringify({ locales: ["en"] }));
    await expect(loadConfig(path)).rejects.toThrow();
  });

  test("throws on empty locales array", async () => {
    const path = await writeTmp(
      JSON.stringify({
        locales: [],
        defaultLocale: "en",
        messagesDir: "messages",
        outputDir: "out",
      }),
    );
    await expect(loadConfig(path)).rejects.toThrow();
  });
});
