import path from "node:path";
import { compile } from "../../../src/index.ts";
import { loadConfig } from "../../../src/config.ts";
import { log } from "../logger.ts";
import { runBuild } from "./build.ts";

export async function runWatch(configPath: string): Promise<void> {
  log.watch("watching for changes…");
  const config = await loadConfig(configPath);
  const projectRoot = path.dirname(configPath);
  const messagesDir = path.resolve(projectRoot, config.messagesDir);

  // Initial build
  await runBuild(configPath, true);

  // Watch the messages directory via Node-compatible fs.watch
  const { watch } = await import("node:fs");
  watch(messagesDir, { persistent: true }, async (_event, filename) => {
    if (typeof filename === "string" && filename.endsWith(".json")) {
      log.change(`change detected in ${filename}, rebuilding…`);
      try {
        await compile({ configPath });
        log.success("rebuild complete");
      } catch (err) {
        log.error(`rebuild failed - ${(err as Error).message}`);
      }
    }
  });
}
