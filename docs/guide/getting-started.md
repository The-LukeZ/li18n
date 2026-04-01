# Getting Started

li18n compiles your JSON locale files into TypeScript modules. Each message key becomes a typed function. No runtime parsing, no stringly-typed keys.

```ts
import { m } from "./src/i18n";

m.greeting({ name: "Alice" }); // "Hello Alice!" (active locale)
m.greeting({ name: "Alice" }, "de"); // "Hallo Alice!" (locale override)
m.userStatus({ isOnline: true }); // "Online"
m.itemCount({ count: 3 }); // "3 items"
```

## Installation

::: code-group

```bash [bun]
bun add -D @the-lukez/li18n
```

```bash [npm]
npm install -D @the-lukez/li18n
```

```bash [pnpm]
pnpm add -D @the-lukez/li18n
```

:::

## Setup

### 1. Create a config file

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

The `$schema` field enables IDE autocomplete and inline validation.

### 2. Create your locale files

Add one JSON file per locale in `messagesDir`:

```
messages/
├── en.json
└── de.json
```

`en.json`:

```json
{
  "greeting": "Hello {name}!",
  "farewell": "Goodbye!"
}
```

`de.json`:

```json
{
  "greeting": "Hallo {name}!",
  "farewell": "Auf Wiedersehen!"
}
```

### 3. Build

```bash
li18n build
```

This generates typed TypeScript files in `outputDir`.

### 4. Import and use

```ts
import { m, setLocale } from "./src/i18n";

setLocale("de");
m.greeting({ name: "Alice" }); // "Hallo Alice!"
```

## Next steps

- Learn about the full [Message Format](/guide/message-format) — conditionals and pluralization
- See all available [CLI commands](/guide/cli)
- Explore the [Runtime API](/guide/runtime-api) for locale management
