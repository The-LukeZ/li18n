---
layout: home

hero:
  name: li18n
  text: Your translations, compiled to typed functions
  tagline: Write messages in JSON. li18n turns every key into a plain TypeScript function, with typed params and locale dispatch already baked in. Built for bots, CLIs and handler-style code.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Message Format
      link: /guide/message-format
    - theme: alt
      text: GitHub
      link: https://github.com/The-LukeZ/li18n

features:
  - title: Params inferred from JSON
    details: "{name} becomes a string, {count:num} a number, a bool conditional a boolean. Forget a param or misspell a key and tsc tells you before anything ships."
    link: /guide/message-format
    linkText: Message format
  - title: Plurals without a DSL
    details: Number cases are plain comparisons like "=== 1" or ">= 10", evaluated top to bottom. No ICU syntax to learn, no runtime parser.
    link: /guide/message-format#number-conditional-pluralization
    linkText: Conditionals
  - title: Locale per handler, not per process
    details: withLocale() scopes the locale with AsyncLocalStorage, so two Discord interactions in different languages never leak into each other. Or just pass the locale as the last argument.
    link: /guide/runtime-api
    linkText: Runtime API
  - title: Missing keys fail the build
    details: li18n check validates every locale against your default locale, so a forgotten German string shows up in CI, not in a user's DMs.
    link: /guide/cli#check
    linkText: CLI
  - title: Machine-translate the gaps
    details: li18n translate fills missing keys via DeepL or Google Translate. {var} placeholders are masked first, so the provider can't mangle them.
    link: /guide/cli#translate
    linkText: Translate command
  - title: Nothing to ship at runtime
    details: The output is plain .ts with no dependencies beyond node:async_hooks. No JSON loaded at startup, no key lookups, no format strings parsed per call.
    link: /guide/getting-started
    linkText: See the output
---

## From JSON to function

Write one file per locale. Keys can nest, and placeholders carry their own type hints.

::: code-group

```json [messages/en.json]
{
  "greeting": "Hello {name}!",
  "unread": "You have {count:num} unread messages",
  "items": [
    {
      "var": { "num": "count" },
      "cases": { "=== 1": "One item", ">= 10": "Many items", "else": "{count} items" }
    }
  ]
}
```

```json [messages/de.json]
{
  "greeting": "Hallo {name}!",
  "unread": "Du hast {count:num} ungelesene Nachrichten",
  "items": [
    {
      "var": { "num": "count" },
      "cases": { "=== 1": "Ein Artikel", ">= 10": "Viele Artikel", "else": "{count} Artikel" }
    }
  ]
}
```

:::

Run `li18n build` and every key becomes a function with a real signature:

```ts
m.greeting({ name: "Alice" }); // "Hello Alice!"
m.greeting({ name: "Alice" }, "de"); // "Hallo Alice!"
m.items({ count: 12 }); // "Many items"

m.items({ count: "12" }); // error: Type 'string' is not assignable to type 'number'
m.greting({ name: "Alice" }); // error: Property 'greting' does not exist
```

Under the hood, `items` compiles to a ternary chain and a `switch` on the locale. That's it, nothing is interpreted at runtime.

## One locale per interaction

Wrap a handler once. Every message called inside it, however deep, uses that handler's locale.

```ts
import { m, withLocale } from "./i18n";

export const execute = withLocale(
  async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply(m.greeting({ name: interaction.user.username }));
  },
  (interaction) => resolveLocale(interaction.locale),
);
```

The [Discord bot guide](/guide/how-to-localize-your-discord-bot-in-2026) walks through a full bot.

## Is li18n a good fit?

**Yes**, if your code runs as handlers that each know their locale: Discord and chat bots, CLIs, scripts, queue workers, serverless functions. And if you want translation mistakes caught by `tsc` and CI rather than by users.

**Probably not**, if you need ICU MessageFormat, translations loaded at runtime from a CMS, or a framework integration with routing and SSR. Use a framework-specific library for that.

<div style="margin-top: 2rem">

::: code-group

```sh [bun]
bun add -D @the-lukez/li18n && bunx li18n init
```

```sh [npm]
npm i -D @the-lukez/li18n && npx li18n init
```

```sh [pnpm]
pnpm add -D @the-lukez/li18n && pnpm li18n init
```

```sh [yarn]
yarn add -D @the-lukez/li18n && yarn li18n init
```

:::

</div>
