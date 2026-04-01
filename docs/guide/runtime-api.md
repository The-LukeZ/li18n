# Runtime API

The generated `runtime.ts` (in your `outputDir`) exposes locale management utilities. It is re-exported from the root `index.ts` alongside all message functions.

```ts
import { m, getLocale, overwriteGetLocale, withLocale } from "./src/i18n";
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

**HTTP server** - resolve locale from `Accept-Language`:

```ts
const handleRequest = withLocale(
  async (req: Request) => new Response(m.welcome()),
  (req) => req.headers.get("Accept-Language")?.split(",")[0],
);
```

**Discord bot** - resolve locale from interaction data:

```ts
const handleCommand = withLocale(
  async (interaction) => {
    await interaction.reply(m.greeting({ name: interaction.user.username }));
  },
  (interaction) => interaction.locale,
);
```

## `overwriteGetLocale(fn)`

Replaces the locale resolver for the **current `withLocale` context only**. After calling this, every subsequent `getLocale()` call within the same handler invocation uses `fn` instead of the locale that was initially resolved.

`fn` must be synchronous and return a `Locale`.

```ts
const handleRequest = withLocale(
  async (req: Request) => {
    // Override the locale based on a user preference stored in a cookie
    const user = await getUser(req);
    overwriteGetLocale(() => user.preferredLocale);

    return new Response(m.greeting({ name: user.name }));
  },
  (req) => req.headers.get("Accept-Language")?.split(",")[0],
);
```

The override is fully isolated - concurrent handler calls are unaffected:

```ts
const handler = withLocale(
  async (req: Request) => {
    overwriteGetLocale(() => resolveLocaleFromSession(req));
    await someAsyncWork();
    return m.greeting(); // still uses the overridden locale for *this* request
  },
  () => "en",
);
```

Calling `overwriteGetLocale` outside of a `withLocale` context is a no-op.

## `getLocale()`

Returns the currently active locale for the current `withLocale` context. Falls back to `baseLocale` when called outside a context.

```ts
const locale = getLocale(); // e.g. "en"
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
