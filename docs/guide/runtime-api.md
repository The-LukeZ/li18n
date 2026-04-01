# Runtime API

The generated `runtime.ts` (in your `outputDir`) exposes locale management utilities. It is re-exported from the root `index.ts` alongside all message functions.

```ts
import { m, getLocale, setLocale, withLocale } from "./src/i18n";
```

## `setLocale(locale)`

Sets a global locale variable. Suitable for client-side apps where locale doesn't change per-request.

```ts
setLocale("de");
m.greeting({ name: "Alice" }); // "Hallo Alice!"

setLocale("en");
m.greeting({ name: "Alice" }); // "Hello Alice!"
```

## `getLocale()`

Returns the currently active locale. Prefers the `AsyncLocalStorage` scope (set by `withLocale`) over the global variable.

```ts
const locale = getLocale(); // e.g. "en"
```

## `withLocale(handler, getLocaleFromHandler)`

Wraps a handler function so each call runs in its own isolated `AsyncLocalStorage` scope. The locale is resolved per-call from the handler's arguments.

Always returns a `Promise`.

```ts
const myHandler = withLocale(
  async (req: Request) => {
    // getLocale() returns the locale resolved for this specific request
    return new Response(m.greeting({ name: "Alice" }));
  },
  async (req: Request) => req.headers.get("Accept-Language") ?? undefined,
);

await myHandler(req); // locale isolated per call
```

### Use cases

**HTTP server** — resolve locale from `Accept-Language`:

```ts
const handleRequest = withLocale(
  async (req: Request) => new Response(m.welcome()),
  (req) => req.headers.get("Accept-Language")?.split(",")[0],
);
```

**Discord bot** — resolve locale from interaction data:

```ts
const handleCommand = withLocale(
  async (interaction) => {
    await interaction.reply(m.greeting({ name: interaction.user.username }));
  },
  (interaction) => interaction.locale,
);
```

## `locales`

A readonly array of all configured locale codes, as defined in `li18n.config.json`.

```ts
import { locales } from "./src/i18n";
// e.g. ["en", "de"]
```

## `baseLocale`

The default locale string, as set by `defaultLocale` in `li18n.config.json`.

```ts
import { baseLocale } from "./src/i18n";
// e.g. "en"
```

## `localeStorage`

The underlying `AsyncLocalStorage<Locale>` instance. Exposed for advanced use cases where you need direct access.

```ts
import { localeStorage } from "./src/i18n";
```
