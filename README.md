# li18n

[![npm version](https://badgen.net/npm/v/@the-lukez/li18n)](https://www.npmjs.com/package/@the-lukez/li18n)
[![License](https://badgen.net/badge/license/MIT/blue)](https://www.npmjs.com/package/@the-lukez/li18n)
[![Open Issues](https://badgen.net/github/issues/The-LukeZ/li18n)](https://github.com/The-LukeZ/li18n/issues?q=is%3Aissue+is%3Aopen)
[![Closed Issues](https://badgen.net/github/closed-issues/The-LukeZ/li18n)](https://github.com/The-LukeZ/li18n/issues?q=is%3Aissue+is%3Aclosed)

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

m.greeting({ name: "Alice" }); // → "Hello Alice!"
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
  "locales": ["en", "de"],
  "defaultLocale": "en",
  "messagesDir": "./messages",
  "outputDir": "./src/i18n"
}
```

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
const status = (p: { isOnline: boolean }): string => (p.isOnline ? "Online" : "Offline");
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
const role = (p: { userRole: string }): string =>
  p.userRole === "admin" ? "Administrator" : p.userRole === "moderator" ? "Moderator" : "User";
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
const score = (p: { points: number }): string =>
  p.points >= 100
    ? `Expert: ${p.points} pts`
    : p.points === 50
      ? `Advanced: ${p.points} pts`
      : `Beginner: ${p.points} pts`;
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
const greeting = (p: { isLoggedIn: boolean; name: string }): string =>
  p.isLoggedIn ? `Hello ${p.name}!` : "Hello Guest!";
```

---

## CLI

```bash
npm li18n build    # compile once
npm li18n watch    # recompile on changes
npm li18n check    # check all locales for missing or extra keys
```

All commands accept `--config <path>` (default: `li18n.config.json`).

---

## Runtime API

The generated `src/i18n/runtime.ts` exposes locale management:

```ts
import { getLocale, withLocale, setGetLocale, localeStorage } from "./src/i18n";

// Set locale for an async scope (e.g. per request in SSR)
withLocale("de", () => {
  m.greeting({ name: "Alice" }); // → "Hallo Alice!"
});

// Override the locale source entirely
setGetLocale(() => myApp.currentLocale());
```

---

## Config reference

| Field           | Type       | Description                                           |
| --------------- | ---------- | ----------------------------------------------------- |
| `locales`       | `string[]` | Supported locale codes (e.g. ISO 639-1)               |
| `defaultLocale` | `string`   | Fallback locale — must be one of `locales`            |
| `messagesDir`   | `string`   | Path to the folder containing locale JSON files       |
| `outputDir`     | `string`   | Path where generated TypeScript files will be written |

---

## Backlog

- Support subfolders in `messagesDir`  
  Message keys are then joined with dots (e.g. `errors/en.json` → `errors.someKey`) OR generate named exports for subfolders (e.g. `import { m } from "./i18n/errors"`).
- Add a CLI command to check for missing/extra keys across locales (find keys which are present in some locales but not others and then give a structured report).
- YAML support (e.g. `en.yaml` instead of `en.json`). However that could be a separate package that uses the same core compiler, so maybe not a priority right now.
- Support custom variable types (e.g. dates, currencies) with custom formatting options. This would require a way to define custom variable types and their corresponding TypeScript types and runtime formatting logic.
