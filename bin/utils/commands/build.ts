import { compile } from "../../../src/index.ts";
import { log } from "../logger.ts";

export async function runBuild(configPath: string, noClean: boolean): Promise<void> {
  log.build("building…");
  const result = await compile({ configPath, clean: !noClean });

  if (result.errors.length > 0) {
    for (const e of result.errors) {
      log.localeError(e.locale, `${e.key}: ${e.message}`);
    }
    process.exit(1);
  }

  log.success(`done - ${result.keyCount} key(s) compiled`);
}
