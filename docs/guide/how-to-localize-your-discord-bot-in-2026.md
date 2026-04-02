# How to Localize your Discord Bot in 2026

Discord bots reach users across the globe. If your bot replies in English-only (or whatever language you choose), you're leaving a huge portion of your audience with a worse experience.
Discord even provides a `locale` field on every interaction, so you already know what language each user prefers - you just need to use it.

This guide walks through building a localized Discord bot using **li18n**, a compile-time i18n library for TypeScript that turns your JSON message files into fully type-safe functions with zero runtime overhead.

_I've already wrote a guide on this some months ago, but that was with a different package - which is not designed for such stuff and also had some bugs._

## Why li18n?

Most i18n libraries follow the same pattern: load a big JSON file at runtime, look up a string by key, interpolate variables. This works, but it has downsides:

- No type safety - mistyped keys and missing variables are silent bugs
- Runtime parsing cost on every message lookup
- Locale switching requires extra plumbing per request

li18n takes a different approach. You define your messages in JSON, run `li18n build`, and get plain TypeScript functions - one per message key.
The generated code is just functions and `switch` statements. There's nothing to parse at runtime, and your editor knows exactly which parameters each message requires.

## Installing

```bash
bun add @the-lukez/li18n
```

The CLI is `li18n`. Run `li18n init` to scaffold your project:

```bash
bun li18n init
```

This creates a `li18n.config.json` and a `messages/` directory with example locale files.

## Project layout

```
my-bot/
├── messages/
│   ├── en.json
│   └── de.json
├── src/
│   ├── i18n/          ← generated, don't edit
│   ├── commands/
│   └── index.ts
├── li18n.config.json
└── index.ts
```

## Configuration

`li18n.config.json` tells the compiler where your messages live and where to write the output:

```json
{
  "locales": ["en", "de"],
  "defaultLocale": "en",
  "messagesDir": "./messages",
  "outputDir": "./src/i18n"
}
```

## Defining messages

Messages live in `messages/<locale>.json`. Every locale file must have the same keys - li18n will tell you if anything is missing or mismatched when you run `li18n check`.

<details>
  <summary>messages/en.json (expand)</summary>

```json
{
  "ping": {
    "reply": "Pong! Latency: {latency}ms",
    "error": "Could not measure latency."
  },

  "role": {
    "assigned": "You've been given the {role} role.",
    "removed": "The {role} role has been removed from you.",
    "adminOnly": "This command is only available to admins."
  },

  "remind": {
    "set": "Got it! I'll remind you in {minutes} minutes.",
    "fire": "Hey {username}, here's your reminder:\n> {message}",
    "tooShort": [
      {
        "var": { "num": "minutes" },
        "cases": {
          "=== 0": "You need to give me at least 1 minute.",
          "else": "That's too short - minimum is 1 minute."
        }
      }
    ]
  },

  "status": {
    "online": "Bot is online.",
    "version": "Running version {version}.",
    "shards": [
      {
        "var": { "num": "count" },
        "cases": {
          "=== 1": "1 shard connected.",
          "else": "{count} shards connected."
        }
      }
    ]
  }
}
```

</details>

<details>
  <summary>messages/de.json (expand)</summary>

```json
{
  "ping": {
    "reply": "Pong! Latenz: {latency}ms",
    "error": "Latenz konnte nicht gemessen werden."
  },

  "role": {
    "assigned": "Du hast die Rolle {role} erhalten.",
    "removed": "Die Rolle {role} wurde dir entfernt.",
    "adminOnly": "Dieser Befehl ist nur für Admins verfügbar."
  },

  "remind": {
    "set": "Verstanden! Ich erinnere dich in {minutes} Minuten.",
    "fire": "Hey {username}, hier ist deine Erinnerung:\n> {message}",
    "tooShort": [
      {
        "var": { "num": "minutes" },
        "cases": {
          "=== 0": "Du brauchst mindestens 1 Minute.",
          "else": "Das ist zu kurz - Minimum ist 1 Minute."
        }
      }
    ]
  },

  "status": {
    "online": "Bot ist Online.",
    "version": "Version: {version}.",
    "shards": [
      {
        "var": { "num": "count" },
        "cases": {
          "=== 1": "1 Shards verbunden.",
          "else": "{count} Shards verbunden."
        }
      }
    ]
  }
}
```

</details>

A few things to notice:

- **Nested keys** - messages can be nested arbitrarily deep. The compiler flattens them into dot-separated keys (`ping.reply`, `role.assigned`, etc).
- **Variables** - `{latency}` becomes a required typed parameter `latency: string` (or `number`/`boolean` when you use the typed syntax).
- **Conditionals** - the `remind.tooShort` and `status.shards` keys use numeric conditionals. The compiler turns these into ternary expressions, not runtime lookups.

See the [message format reference](/guide/message-format) for more details on the syntax and features available in message files.

## Compiling

```bash
bun li18n build
```

The `src/i18n/` directory is now populated with generated TypeScript. You can also run `li18n watch` during development to recompile on every save.

To validate that all locales are consistent without writing any files:

```bash
bun li18n check
```

## The generated API

After compilation, your entry point is `src/i18n/index.ts`:

```typescript
export * as m from "./messages/_index.ts";
export { getLocale, overwriteGetLocale, withLocale, locales, baseLocale } from "./runtime.ts";
export type { Locale, MaybePromise } from "./runtime.ts";
```

Import `m` for messages and `withLocale` for locale-scoped handlers. Every message function accepts an optional explicit locale as its last argument - but when you use `withLocale`, you rarely need to pass it manually.

```typescript
import { m, withLocale } from "./src/index.ts";

m.pingReply({ latency: 42 }); // uses current locale
m.pingReply({ latency: 42 }, "de"); // explicit override
m.statusShards({ count: 3 }); // number conditional, no locale arg needed
```

TypeScript will catch you if you forget a required parameter or pass the wrong type.

## Wiring it into Discord.js

Here's where li18n really shines. Discord sends a `locale` string with every interaction (e.g. `"en-US"`, `"de"`, `"fr"`). We want each interaction handler to automatically use the right locale without passing it around everywhere.

`withLocale` wraps any async function and stores the locale in `AsyncLocalStorage`. Every `m.*` call inside the handler reads it automatically.

### Resolving the locale

Discord uses IETF language tags like `en-US`, but your locales are likely `en`, `de`, etc. - So you need to write a small resolver:

```typescript
import { locales, type Locale } from "./i18n/index.ts";
import type { Interaction } from "discord.js";

export function resolveLocale(interaction: Interaction): Locale {
  const tag = interaction.locale; // e.g. "en-US", "de", "pt-BR"
  const lang = tag.split("-")[0] as Locale;
  return (locales as readonly string[]).includes(lang) ? lang : "en";
}
```

<details>
  <summary>Ping Command</summary>

`src/commands/ping.ts`

```typescript
import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { m, withLocale } from "../i18n/index.ts";
import { resolveLocale } from "../i18n/locale.ts";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check the bot latency");

const execute = withLocale(async (interaction: ChatInputCommandInteraction) => {
  const sent = await interaction.reply({ content: "Pinging…", fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;

  await interaction.editReply(m.pingReply({ latency }));
}, resolveLocale);

export { execute };
```

No locale argument anywhere in the handler body - `m.pingReply` calls `getLocale()` internally and gets the right value from the `AsyncLocalStorage` context that `withLocale` set up.

</details>

<details>
  <summary>Role Command</summary>

`src/commands/role.ts`

```typescript
import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { m, withLocale } from "../i18n/index.ts";
import { resolveLocale } from "../i18n/locale.ts";

export const data = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Toggle a role")
  .addRoleOption((option) =>
    option.setName("role").setDescription("The role to toggle").setRequired(true),
  );

const execute = withLocale(async (interaction: ChatInputCommandInteraction) => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: m.roleAdminOnly(), ephemeral: true });
    return;
  }

  const role = interaction.options.getRole("role", true);
  const member = await interaction.guild!.members.fetch(interaction.user.id);
  const hasRole = member.roles.cache.has(role.id);

  if (hasRole) {
    await member.roles.remove(role.id);
    await interaction.reply(m.roleRemoved({ role: role.name }));
  } else {
    await member.roles.add(role.id);
    await interaction.reply(m.roleAssigned({ role: role.name }));
  }
}, resolveLocale);

export { execute };
```

</details>

<details>
  <summary>Reminder Command</summary>

`src/commands/remind.ts`

```typescript
import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { m, withLocale } from "../i18n/index.ts";
import { resolveLocale } from "../i18n/locale.ts";

export const data = new SlashCommandBuilder()
  .setName("remind")
  .setDescription("Set a reminder")
  .addIntegerOption((o) =>
    o.setName("minutes").setDescription("Minutes from now").setRequired(true),
  )
  .addStringOption((o) =>
    o.setName("message").setDescription("What to remind you of").setRequired(true),
  );

const execute = withLocale(async (interaction: ChatInputCommandInteraction) => {
  const minutes = interaction.options.getInteger("minutes", true);
  const message = interaction.options.getString("message", true);

  if (minutes < 1) {
    // The conditional picks the right case based on the value of `minutes`
    await interaction.reply({ content: m.remindTooShort({ minutes }), ephemeral: true });
    return;
  }

  await interaction.reply(m.remindSet({ minutes }));

  setTimeout(async () => {
    await interaction.followUp(m.remindFire({ username: interaction.user.username, message }));
  }, minutes * 60_000);
}, resolveLocale);

export { execute };
```

</details>

`src/index.ts` - the main bot file

```typescript
import { Client, GatewayIntentBits, Collection } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import * as ping from "./src/commands/ping.ts";
import * as role from "./src/commands/role.ts";
import * as remind from "./src/commands/remind.ts";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = new Collection([
  [ping.data.name, ping],
  [role.data.name, role],
  [remind.data.name, remind],
]);

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return; // We only got slash commands in this example, so ignore other interactions

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction as ChatInputCommandInteraction); // type inference on withLocale ensures the function has the same params as the handler
  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.DISCORD_TOKEN);
```

> [!TIP]
> If you got a lot of commands with the same locale resolver, you can create a helper class that wraps `withLocale` and hardcodes the resolver, so you don't have to repeat it everywhere.

<details>
  <summary>Example interaction handler class</summary>

```typescript
import { withLocale } from "./src/i18n/index.ts";
import { resolveLocale } from "./src/locale.ts";
import type { Client, Collection, ClientEvents } from "discord.js";

export class InteractionHandler {
  #client: Client;
  #commands: Collection<string, { execute: (...args: any[]) => Promise<void> }>;
  #components: Collection<string, { execute: (...args: any[]) => Promise<void> }>;

  constructor(
    client: Client,
    commands: Collection<string, { execute: (...args: any[]) => Promise<void> }>,
    components: Collection<string, { execute: (...args: any[]) => Promise<void> }>,
  ) {
    this.#client = client;
    this.#commands = commands;
    this.#components = components;
  }

  handler(): (...args: ClientEvents["interactionCreate"]) => void {
    return withLocale(async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const command = this.#commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
      } else if (interaction.isButton()) {
        const component = this.#components.get(interaction.customId);
        if (component) await component.execute(interaction);
      }
    }, resolveLocale); // All interactions go through the same locale resolver
  }
}

// In your index.ts

const handler = new InteractionHandler(client, commands, components);

client.on("interactionCreate", handler.handler());
```

In your command handlers, you can now use `m.*` without worrying about `withLocale` or the resolver - it's all handled by the `InteractionHandler` class.

```typescript
import type { ChatInputCommandInteraction } from "discord.js";
import { m } from "../i18n/index.ts";

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply(m.pingReply({ latency: 42 }));
}
```

</details>

## How concurrent requests stay isolated

Because `withLocale` uses `AsyncLocalStorage` under the hood, two simultaneous interactions never see each other's locale. If a German user and an English user both trigger `/ping` at the same moment, each `withLocale` call creates its own isolated storage slot. There's no global state to race on.

This also means you can override the locale mid-handler if needed. Say you want to log something in English regardless of the user's locale:

```typescript
import { overwriteGetLocale } from "../i18n/index.ts";

const execute = withLocale(async (interaction) => {
  // Responds in the user's language
  await interaction.reply(m.pingReply({ latency: 42 }));

  // Switch to English just for this log message
  overwriteGetLocale(() => "en");
  console.log(m.pingReply({ latency: 42 })); // always in English
}, resolveLocale);
```

`overwriteGetLocale` only affects the current `withLocale` context - other concurrent handlers are unaffected.

## Development workflow

```bash
# Watch for changes and recompile as you edit message files
bunx li18n watch

# Verify all locales are in sync before committing
bunx li18n check

# One-shot compile for CI/CD
bunx li18n build
```

Since the output directory is auto-generated, add it to `.gitignore` (li18n does this automatically) and rebuild as part of your deployment step.

> [!TIP]
> With watch mode, it is recommended to change your save behavior in your editor to "save on focus change" or increase the debounce delay, to avoid triggering a build on every keystroke (this could result in bugs).

## What you get

- **Full type safety** - every message function's parameters are inferred from the JSON. Forget `{ latency }` and TypeScript tells you before you ship.
- **Zero runtime parsing** - compiled messages are plain functions. No JSON loaded, no key lookups, no format-string parsing per call.
- **Per-interaction locale isolation** - `withLocale` handles the plumbing via `AsyncLocalStorage`. No locale prop-drilling. This should even work in serverless environments where multiple requests share the same instance - however you might need to enable `nodejs_compat` for example, if you're on Couldflare Workers.
- **Numeric and boolean conditionals** - pluralization and conditional text compile to ternary chains, not runtime switch tables.
