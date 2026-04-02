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

> [!IMPORTANT]
> li18n is not designed for webservers with per-request state - while it may work, it is not supported officially - please make open issues on GitHub if you got it working.
>
> If you want localization for express, hono or similar, use another library. Instead, li18n is ideal for functional programming styles - like Discord bots -
> where you can pass the locale explicitly or use `withLocale()` to scope it.

```ts
import { m, withLocale } from "./src/i18n";

const handler = withLocale(
  async (req: Request) => m.greeting({ name: "Alice" }),
  (req) => req.headers.get("Accept-Language")?.split(",")[0],
);
```

Or pass the locale directly to any message function:

```ts
m.greeting({ name: "Alice" }, "de"); // "Hallo Alice!"
```

## Troubleshooting

<details>
  <summary>"No overload matches this call"</summary>

This error usually occurs if you pass variables with the wrong type, or forget to pass required variables.

For example, if you have a message with `count` variable, which is a string in the message file:

```json
{
  "itemCount": "{count} items"
}
```

Then you must pass `count` as a string:

```ts
m.itemCount({ count: "3" }); // ✅
m.itemCount({ count: 3 }); // ❌ No overload matches this call
```

<Badge type="tip" text="New in v0.5.0" /> If you want `count` to be a number, you can use the typed variable syntax in your message file:

```json
{
  "itemCount": "{count:number} items"
}
```

</details>

## Next steps

- Learn about the full [Message Format](/guide/message-format) - conditionals and pluralization
- See all available [CLI commands](/guide/cli)
- Explore the [Runtime API](/guide/runtime-api) for locale management
