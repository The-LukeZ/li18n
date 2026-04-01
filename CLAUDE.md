
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Project: li18n

Compilation pipeline: `src/parser.ts` → `src/analyzer.ts` → `src/codegen.ts` → `src/writer.ts`

### Project Name

On npm the package is named `@the-lukez/li18n` (not just `li18n`) to avoid conflicts with existing packages. The CLI command is still `li18n` for simplicity.

### Validation

- All external input is validated with **Zod** (`zod` is a runtime dependency).
- Schemas live in `src/schemas.ts`. Types are **inferred from schemas** — never define them manually alongside a Zod schema.
- `Li18nConfig` → `z.infer<typeof Li18nConfigSchema>` (from `src/schemas.ts`)
- Raw locale JSON types (`RawLocaleJson`, `RawMessageValue`, `RawConditionalElement`, `RawVarField`) → inferred from `MessageJsonSchema` (from `src/schemas.ts`)
- Compiler AST output types (`MessageNode`, `MessageTree`, `CompiledLocales`) stay as plain TS types in `src/types.ts` — they are not Zod-validated.
- Use `formatZodError(err, filePath)` from `src/schemas.ts` to produce human-readable error messages.

### Key conventions

- `src/config.ts` exports `loadConfig(configPath)` — async, throws on invalid config.
- `src/parser.ts` exports `parseLocaleFile(jsonText, filePath)` — Zod-validates structure, then builds a flat `MessageTree`. Also exports `extractVars(template)`.
- `src/analyzer.ts` infers/validates `condType` and collects variables — runs after the parser. Exports `analyzeTree(raw, filePath): AnalyzeResult`.
- `src/codegen.ts` exports `generateMessageFile(key, exportName, locales, defaultLocale)` — generates `.ts` source per message key.
- `src/writer.ts` writes all output files; exports `keyToExportName(key)` (dot-keys → camelCase). `runtime.ts` is only overwritten if its content has changed.
- `src/index.ts` exports `compile(options: CompileOptions): Promise<CompileResult>` — orchestrates the full pipeline.
- CLI entry: `bin/li18n.ts` — commands: `build`, `watch`, `check`, `init`.
- CLI is built with **`make-cli`** (`import makeCli from "make-cli"`). Commands are declared via `makeCli({ name, commands: [...] })` — each command has `name`, `description`, `options[]`, and an async `handler`.
- Shared `configOption` (`--config <path>`, default `li18n.config.json`) is defined once and spread into each command's `options` array.
- Adding a new command: add an entry to the `commands` array in `bin/li18n.ts` and implement the handler as a top-level `async function run<Name>(...)`.

### CLI commands

| Command | Description | Options |
|---------|-------------|---------|
| `build` | Compile locale files once | `--config` |
| `watch` | Recompile on changes to messagesDir | `--config` |
| `check` | Validate keys across all locales, no output written | `--config` |
| `init` | Create a default `li18n.config.json` in the current directory | — |

### Runtime output (generated files)

`writer.ts` produces these files in `outputDir`:

- `messages/<key>.ts` — one per key; imports `getLocale` and `type Locale` from runtime, has private per-locale functions, and an exported dispatch function. No-params messages export `function name(locale?: Locale): string`; messages with params export two overloads (`(pOrLocale?: Locale)` and `(pOrLocale?: ParamType, locale?: Locale)`) plus an implementation that extracts `p` and `loc` before the `switch`.
- `messages/_index.ts` — re-exports all message functions.
- `index.ts` — root re-export of messages and runtime functions.
- `runtime.ts` — overwritten only if content has changed. Contains: `Locale` union type, `MaybePromise<T>`, `locales`, `baseLocale`, `localeStorage` (AsyncLocalStorage), `setLocale`, `getLocale`, and `withLocale`.
- `.gitignore` — marks the output dir as auto-generated.

### Runtime API

- **`setLocale(locale)`** — sets a global `_locale` variable.
- **`getLocale()`** — returns `localeStorage.getStore() ?? _locale` (async context takes priority).
- **`withLocale(handler, getLocaleFromHandler)`** — wraps a handler to run in an isolated `AsyncLocalStorage` scope; `getLocaleFromHandler(args)` resolves the locale per-call (can be `MaybePromise<Locale>`). Always returns a `Promise`.

### Testing

Tests live in `tests/`. Run with `bun test` (the `test` script also runs a fixture compile first).

| File | Covers |
|------|--------|
| `schemas.test.ts` | Zod schemas, `formatZodError` |
| `parser.test.ts` | `parseLocaleFile`, `extractVars`, flattening, conditional parsing |
| `analyzer.test.ts` | Type inference (bool/number/string), validation errors, `allVars` |
| `codegen.test.ts` | Code generation for all node types, multi-locale dispatch |
| `writer.test.ts` | `keyToExportName` |
| `config.test.ts` | `loadConfig` validation and error cases |
| `index.test.ts` | `withLocale` runtime helper |
| `integration.test.ts` | Full `compile()` pipeline against `tests/fixture/` |

Helpers like `stringNode()`, `conditionalNode()`, `locales()` are defined inside test files to construct AST test data. Fixture files live in `tests/fixture/`.
