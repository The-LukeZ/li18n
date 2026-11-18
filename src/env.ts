/**
 * Minimal `.env` file loading used by the `translate` command to pick up
 * provider API keys.
 *
 * Parsed values are returned as a plain map and never written to
 * `process.env`. A `.env` in an untrusted checkout therefore cannot change
 * runtime behaviour (e.g. `HTTPS_PROXY`, `NODE_TLS_REJECT_UNAUTHORIZED`);
 * callers only look up the API key names they need.
 */

import path from "node:path";

/** Env files tried (in order) when no explicit `--env-file` is given. */
export const DEFAULT_ENV_FILES = [
  ".env.local",
  ".env.development.local",
  ".env.development",
  ".env",
] as const;

// Same line grammar as dotenv: `KEY=value`, optional `export ` prefix,
// single/double/backtick quoted values (may span lines), `#` comments.
const LINE =
  /^[ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`(?:\\`|[^`])*`|[^#\r\n]*)?[ \t]*(?:#.*)?$/gm;

/** Parses the contents of a `.env` file into a key/value map. */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const src = text.replace(/\r\n?/g, "\n");

  for (const match of src.matchAll(LINE)) {
    const key = match[1]!;
    let value = (match[2] ?? "").trim();
    const quote = value[0];

    if ((quote === '"' || quote === "'" || quote === "`") && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    }

    out[key] = value;
  }

  return out;
}

export interface LoadEnvOptions {
  /** Explicit env file. When set, only this file is loaded and it must exist. */
  envFile?: string;
  /** Directories searched for {@link DEFAULT_ENV_FILES} when `envFile` is not set. */
  searchDirs: string[];
}

export interface LoadEnvResult {
  /** Merged values. Earlier files win over later ones. */
  values: Record<string, string>;
  /** Absolute paths of the files that were loaded. */
  files: string[];
}

/**
 * Reads env files into a new map. Does not touch `process.env`.
 *
 * Throws if an explicit `envFile` does not exist.
 */
export async function loadEnvFiles(opts: LoadEnvOptions): Promise<LoadEnvResult> {
  const values: Record<string, string> = {};

  const candidates = opts.envFile
    ? [path.resolve(opts.envFile)]
    : [...new Set(opts.searchDirs.map((d) => path.resolve(d)))].flatMap((dir) =>
        DEFAULT_ENV_FILES.map((name) => path.join(dir, name)),
      );

  const files: string[] = [];

  for (const file of candidates) {
    const handle = Bun.file(file);
    if (!(await handle.exists())) {
      if (opts.envFile) throw new Error(`env file "${opts.envFile}" not found`);
      continue;
    }

    for (const [key, value] of Object.entries(parseEnv(await handle.text()))) {
      if (!(key in values)) values[key] = value;
    }
    files.push(file);
  }

  return { values, files };
}
