# li18n

<!-- The ?<num> is added because of caching. Caching time is very long it seems. -->

[![License](https://badgen.net/badge/license/MIT/blue?4)](https://www.npmjs.com/package/@the-lukez/li18n)
[![Open Issues](https://badgen.net/github/issues/The-LukeZ/li18n?4)](https://github.com/The-LukeZ/li18n/issues?q=is%3Aissue+is%3Aopen)
[![Closed Issues](https://badgen.net/github/closed-issues/The-LukeZ/li18n?4)](https://github.com/The-LukeZ/li18n/issues?q=is%3Aissue+is%3Aclosed)

A simple, type-safe i18n library for TypeScript. Define your messages in JSON, get fully-typed TypeScript functions out. No runtime parsing, no stringly-typed keys.

**→ [Full documentation at li18n.thelukez.com](https://li18n.thelukez.com)**

> [!IMPORTANT]
> This is a beta project. As of now, it should work but don't be surprised if you encounter bugs or rough edges. Feedback and contributions are very welcome!

## Features

- **Fully typed** — every message key becomes a typed TypeScript function; variables and conditionals are reflected in the signature
- **Conditionals & pluralization** — boolean, string, and number conditionals with case-based dispatch
- **Async-safe locale scoping** — built-in `AsyncLocalStorage` support via `withLocale()` for per-request isolation

## Quick start

```bash
bun add -D @the-lukez/li18n
# or: npm install -D @the-lukez/li18n
```

```json
// li18n.config.json
{
  "$schema": "./node_modules/@the-lukez/li18n/li18n.schema.json",
  "locales": ["en", "de"],
  "defaultLocale": "en",
  "messagesDir": "./messages",
  "outputDir": "./src/i18n"
}
```

```json
// messages/en.json
{
  "greeting": "Hello {name}!",
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

```bash
li18n build
```

```ts
import { m, withLocale } from "./src/i18n";

const handler = withLocale(
  async (interaction) => {
    interaction.reply(m.greeting({ name: interaction.user.username }));
  },
  (interaction) => interaction.locale,
);
```

Or pass the locale directly to any message function:

```ts
m.greeting({ name: "Alice" }, "de"); // → "Hallo Alice!"
m.itemCount({ count: 1 }, "de"); // → "1 Element"
m.itemCount({ count: 5 }, "de"); // → "5 Elemente"
```

See the [docs](https://li18n.thelukez.com) for the full message format, CLI reference, and runtime API.

## License

MIT
