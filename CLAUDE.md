
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

### Validation

- All external input is validated with **Zod** (`zod` is a runtime dependency).
- Schemas live in `src/schemas.ts`. Types are **inferred from schemas** — never define them manually alongside a Zod schema.
- `Li18nConfig` → `z.infer<typeof Li18nConfigSchema>` (from `src/schemas.ts`)
- Raw locale JSON types (`RawLocaleJson`, `RawMessageValue`, `RawConditionalElement`, `RawVarField`) → inferred from `MessageJsonSchema` (from `src/schemas.ts`)
- Compiler AST output types (`MessageNode`, `MessageTree`, `CompiledLocales`) stay as plain TS types in `src/types.ts` — they are not Zod-validated.
- Use `formatZodError(err, filePath)` from `src/schemas.ts` to produce human-readable error messages.

### Key conventions

- `src/config.ts` exports `loadConfig(configPath)` — async, throws on invalid config.
- `src/parser.ts` exports `parseLocaleFile(jsonText, filePath)` — Zod-validates structure, then builds a flat `MessageTree`.
- `src/analyzer.ts` infers/validates `condType` and collects variables — runs after the parser.
- `src/codegen.ts` generates `.ts` source per message key.
- `src/writer.ts` writes all output files; `runtime.ts` is written once and never overwritten.
- CLI entry: `bin/li18n.ts` — commands: `build`, `watch`, `check`.
- CLI is built with **`make-cli`** (`import makeCli from "make-cli"`). Commands are declared via `makeCli({ name, commands: [...] })` — each command has `name`, `description`, `options[]`, and an async `handler`.
- Shared `configOption` (`--config <path>`, default `li18n.config.json`) is defined once and spread into each command's `options` array.
- Adding a new command: add an entry to the `commands` array in `bin/li18n.ts` and implement the handler as a top-level `async function run<Name>(...)`.
