import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadEnvFiles, parseEnv } from "../src/env.ts";

describe("parseEnv", () => {
  test("parses plain, quoted, exported and commented lines", () => {
    const env = parseEnv(
      [
        "# comment",
        "PLAIN=value",
        "export EXPORTED=yes",
        'DOUBLE="a b # not a comment"',
        "SINGLE='x\\ny'",
        'ESCAPED="line1\\nline2"',
        "INLINE=val # trailing",
        "EMPTY=",
        "  SPACED = padded  ",
      ].join("\r\n"),
    );
    expect(env).toEqual({
      PLAIN: "value",
      EXPORTED: "yes",
      DOUBLE: "a b # not a comment",
      SINGLE: "x\\ny",
      ESCAPED: "line1\nline2",
      INLINE: "val",
      EMPTY: "",
      SPACED: "padded",
    });
  });

  test("supports multi-line quoted values", () => {
    expect(parseEnv('KEY="first\nsecond"\nNEXT=1')).toEqual({ KEY: "first\nsecond", NEXT: "1" });
  });
});

describe("loadEnvFiles", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "li18n-env-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("loads only the explicit env file", async () => {
    await Bun.write(path.join(dir, "custom.env"), "KEY=custom");
    await Bun.write(path.join(dir, ".env"), "KEY=default\nOTHER=1");
    const env: Record<string, string | undefined> = {};

    const loaded = await loadEnvFiles({
      envFile: path.join(dir, "custom.env"),
      searchDirs: [dir],
      env,
    });

    expect(loaded).toEqual([path.join(dir, "custom.env")]);
    expect(env).toEqual({ KEY: "custom" });
  });

  test("throws when the explicit env file is missing", async () => {
    expect(
      loadEnvFiles({ envFile: path.join(dir, "missing.env"), searchDirs: [dir], env: {} }),
    ).rejects.toThrow("not found");
  });

  test("tries default files in priority order without overwriting", async () => {
    await Bun.write(path.join(dir, ".env.local"), "A=local");
    await Bun.write(path.join(dir, ".env"), "A=base\nB=base");
    const env: Record<string, string | undefined> = { B: "shell" };

    const loaded = await loadEnvFiles({ searchDirs: [dir, dir], env });

    expect(loaded).toEqual([path.join(dir, ".env.local"), path.join(dir, ".env")]);
    expect(env).toEqual({ A: "local", B: "shell" });
  });

  test("returns nothing when no default files exist", async () => {
    expect(await loadEnvFiles({ searchDirs: [dir], env: {} })).toEqual([]);
  });
});
