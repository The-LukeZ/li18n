import path from "node:path";
import { mkdir } from "node:fs/promises";
import { log } from "../logger.ts";
import type { Li18nConfig } from "../../../src/schemas.ts";

export async function runInit(messagesDir: string): Promise<void> {
  const configPath = path.resolve("li18n.config.json");
  if (await Bun.file(configPath).exists()) {
    log.error(`"li18n.config.json" already exists in this directory.`);
    process.exit(1);
  }

  const messagesDirAbsolute = path.resolve(messagesDir);
  await mkdir(messagesDirAbsolute, { recursive: true });

  const defaultConfig = {
    $schema: "./node_modules/@the-lukez/li18n/li18n.schema.json",
    locales: ["en", "de"],
    defaultLocale: "en",
    messagesDir: messagesDir,
    outputDir: "./src/i18n",
    clean: true,
  } satisfies Li18nConfig & { $schema?: string };

  await Bun.write(configPath, JSON.stringify(defaultConfig, null, 2));
  log.success(`Created new config file at ${configPath}`);

  const exampleContent: Record<string, string> = {
    en: JSON.stringify({ hello: "Hello!" }, null, 2),
    de: JSON.stringify({ hello: "Hallo!" }, null, 2),
  };

  for (const locale of defaultConfig.locales) {
    const localePath = path.join(messagesDirAbsolute, `${locale}.json`);
    if (await Bun.file(localePath).exists()) {
      log.error(`Skipped ${localePath} (already exists)`);
      continue;
    }
    const content = exampleContent[locale] ?? JSON.stringify({ hello: "Hello!" }, null, 2);
    await Bun.write(localePath, content);
    log.success(
      [
        `Created ${localePath}`,
        "",
        "If you want, you can add the following key to your message files to get type safety:",
        "    $schema: ../node_modules/@the-lukez/li18n/messages.schema.json",
        "",
        "Note, that you like need to adjust the path to the schema file depending on your directory structure.",
      ].join("\n"),
    );
  }
}
