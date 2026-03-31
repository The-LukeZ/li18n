# li18n

<!-- The ?<num> is added because of caching. Caching time is very long it seems. -->

[![npm version](https://badgen.net/npm/v/@the-lukez/li18n?2)](https://www.npmjs.com/package/@the-lukez/li18n)
[![License](https://badgen.net/badge/license/MIT/blue?2)](https://www.npmjs.com/package/@the-lukez/li18n)
[![Open Issues](https://badgen.net/github/issues/The-LukeZ/li18n?2)](https://github.com/The-LukeZ/li18n/issues?q=is%3Aissue+is%3Aopen)
[![Closed Issues](https://badgen.net/github/closed-issues/The-LukeZ/li18n?2)](https://github.com/The-LukeZ/li18n/issues?q=is%3Aissue+is%3Aclosed)

<!-- [![Coverage](https://badgen.net/codecov/c/github/The-LukeZ/li18n)](https://codecov.io/gh/The-LukeZ/li18n) -->

A simple, type-safe i18n library for TypeScript. Define your messages in JSON, get fully-typed TypeScript functions out.

**Key features:**

- Full variable types (string, number, boolean)
- Conditionals
- Pluralization

— all defined directly in JSON, all type-checked at compile time.

> [!IMPORTANT]
> This is a beta project. As of now, it should work but don't be surprised if you encounter bugs or rough edges. Feedback and contributions are very welcome!

---

## How it works

li18n compiles your JSON locale files into TypeScript modules. Each message key becomes a typed function. No runtime parsing, no stringly-typed keys.

```ts
import { m } from "./src/i18n";

m.greeting({ name: "Alice" }); // → "Hello Alice!" (uses active locale)
m.greeting({ name: "Alice" }, "de"); // → "Hallo Alice!" (locale override)
m.greeting("de"); // → "Hallo !" (locale override, no params)
m.userStatus({ isOnline: true }); // → "Online"
m.itemCount({ count: 3 }); // → "3 items"
```

---

## Setup

### 1. Install

```bash
bun add -D @the-lukez/li18n
# or
npm install -D @the-lukez/li18n
```

### 2. Create a config file

Add `li18n.config.json` to your project root:

```json
{
  "$schema": "./node_modules/@the-lukez/li18n/li18n.schema.json",
  "locales": ["en", "de"],
  "defaultLocale": "en",
  "messagesDir": "./messages",
  "outputDir": "./src/i18n"
}
```

The `$schema` field enables IDE autocomplete and inline validation. `clean` is optional and defaults to `true`.

### 3. Create your locale files

Add one JSON file per locale in `messagesDir`:

```
messages/
├── en.json
└── de.json
```

### 4. Build

```bash
npm li18n build
bun li18n build
```

This generates typed TypeScript files in `outputDir`. Import and use:

```ts
import { m, getLocale, withLocale } from "./src/i18n";
```

---

## Message format

### Simple strings

```json
{
  "greeting": "Hello {name}!",
  "nav": {
    "home": "Home",
    "about": "About"
  }
}
```

Nested objects become dot-separated keys: `nav.home`, `nav.about`.

### Conditionals

Use an array to define a conditional message:

```json
{
  "key": [
    {
      "var": "variableName",
      "cases": {
        "<case>": "<output>",
        "else": "<fallback>"
      }
    }
  ]
}
```

The variable type is inferred from the cases, or you can be explicit:

```json
{ "var": "isOnline" }               // inferred
{ "var": { "bool": "isOnline" } }   // explicit boolean
{ "var": { "num": "count" } }       // explicit number
{ "var": { "str": "role" } }        // explicit string
```

#### Boolean conditional

Cases: `"true"` and/or `"false"` (+ optional `"else"` as alias for `"false"`).

```json
{
  "status": [
    {
      "var": { "bool": "isOnline" },
      "cases": {
        "true": "Online",
        "false": "Offline"
      }
    }
  ]
}
```

Generated:

```ts
export function status(pOrLocale?: Locale): string;
export function status(pOrLocale?: { isOnline: boolean }, locale?: Locale): string;
export function status(pOrLocale?: { isOnline: boolean } | Locale, locale?: Locale): string {
  // ...
}
```

#### String conditional

Cases: any string values. `"else"` is the fallback.

```json
{
  "role": [
    {
      "var": { "str": "userRole" },
      "cases": {
        "admin": "Administrator",
        "moderator": "Moderator",
        "else": "User"
      }
    }
  ]
}
```

Generated:

```ts
export function role(pOrLocale?: Locale): string;
export function role(pOrLocale?: { userRole: string }, locale?: Locale): string;
export function role(pOrLocale?: { userRole: string } | Locale, locale?: Locale): string {
  // ...
}
```

#### Number conditional (pluralization)

Cases: JS comparison expressions. Order matters — evaluated top to bottom. `"else"` is required.

Supported operators: `===`, `!==`, `>`, `>=`, `<`, `<=`. A bare number (e.g. `"1"`) is treated as `=== 1`.

```json
{
  "itemCount": [
    {
      "var": { "num": "count" },
      "cases": {
        "=== 1": "1 item",
        "else": "{count} items"
      }
    }
  ]
}
```

```json
{
  "score": [
    {
      "var": { "num": "points" },
      "cases": {
        ">= 100": "Expert: {points} pts",
        "50": "Advanced: exactly {points} pts",
        "else": "Beginner: {points} pts"
      }
    }
  ]
}
```

Generated:

```ts
export function score(pOrLocale?: Locale): string;
export function score(pOrLocale?: { points: number }, locale?: Locale): string;
export function score(pOrLocale?: { points: number } | Locale, locale?: Locale): string {
  // ...
}
```

#### Interpolation in conditionals

Any `{var}` references in case strings are interpolated normally. All referenced variables become required parameters.

```json
{
  "greeting": [
    {
      "var": { "bool": "isLoggedIn" },
      "cases": {
        "true": "Hello {name}!",
        "false": "Hello Guest!"
      }
    }
  ]
}
```

```ts
export function greeting(pOrLocale?: Locale): string;
export function greeting(
  pOrLocale?: { isLoggedIn: boolean; name: string },
  locale?: Locale,
): string;
export function greeting(
  pOrLocale?: { isLoggedIn: boolean; name: string } | Locale,
  locale?: Locale,
): string {
  // ...
}
```

---

## Locale override

Every generated message function accepts an optional locale argument, letting you bypass the active locale on a per-call basis.

```ts
// No params — locale only or nothing
m.farewell(); // uses getLocale()
m.farewell("de"); // forced to "de"

// With params — params first, locale second
m.greeting({ name: "Alice" }); // uses getLocale()
m.greeting({ name: "Alice" }, "de"); // forced to "de"
m.greeting("de"); // forced to "de", no params
```

This is useful when you need a specific locale without changing the global locale state — for example, rendering an email in the recipient's language while your server's locale is set to something else.

---

## CLI

```bash
npm li18n build    # compile once
npm li18n watch    # recompile on changes
npm li18n check    # check all locales for missing or extra keys
```

All commands accept `--config <path>` (default: `li18n.config.json`).

The `build` command also accepts `--no-clean` to skip deleting the `messages/` output directory before building (overrides the `clean` config field).

Run any command with `--help` for more info.

---

## Runtime API

The generated `src/i18n/runtime.ts` exposes locale management:

```ts
import { getLocale, setLocale, withLocale, localeStorage } from "./src/i18n";

// Set a global locale (e.g. in a client-side app)
setLocale("de");
m.greeting({ name: "Alice" }); // → "Hallo Alice!"

// Wrap a handler so its locale is resolved per-call (e.g. per command execution in a Discord bot or per request in a server)
const myHandler = withLocale(
  async (req: Request) => {
    return new Response(m.greeting({ name: "Alice" }));
  },
  async (req: Request) => req.headers.get("Accept-Language") ?? undefined,
);

// The wrapped handler runs each call in its own async locale scope
await myHandler(req); // locale is resolved from each individual request
```

---

## Config reference

| Field           | Type       | Default | Description                                                                         |
| --------------- | ---------- | ------- | ----------------------------------------------------------------------------------- |
| `locales`       | `string[]` | —       | Supported locale codes (e.g. ISO 639-1)                                             |
| `defaultLocale` | `string`   | —       | Fallback locale — must be one of `locales`                                          |
| `messagesDir`   | `string`   | —       | Path to the folder containing locale JSON files                                     |
| `outputDir`     | `string`   | —       | Path where generated TypeScript files will be written                               |
| `clean`         | `boolean`  | `true`  | Delete the `messages/` output directory before each build to remove stale key files |

---

## Backlog

- Support subfolders in `messagesDir`  
  Message keys are then joined with dots (e.g. `errors/en.json` → `errors.someKey`) OR generate named exports for subfolders (e.g. `import { m } from "./i18n/errors"`).
- YAML support (e.g. `en.yaml` instead of `en.json`). However that could be a separate package that uses the same core compiler, so maybe not a priority right now.
- Support custom variable types (e.g. dates, currencies) with custom formatting options. This would require a way to define custom variable types and their corresponding TypeScript types and runtime formatting logic.
- if value is string[], then let config file decide what to do: "newline" (join with `\n`), "space" (join with space), "array" (keep as array and generate a function that returns string[] instead of string).
