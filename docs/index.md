---
layout: home

hero:
  name: li18n
  text: Type-safe i18n for TypeScript
  tagline: Define your messages in JSON, get fully-typed TypeScript functions out. No runtime parsing, no stringly-typed keys.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/The-LukeZ/li18n

features:
  - title: Fully Typed
    details: Every message key becomes a typed TypeScript function. Variables and conditionals are reflected in the function signature - caught at compile time, not runtime.
  - title: Conditionals & Pluralization
    details: Boolean, string, and number conditionals with case-based dispatch. Number cases support JS comparison operators for pluralization.
  - title: Async-Safe Locale Scoping
    details: Built-in AsyncLocalStorage support via withLocale() - isolate locale per-request in servers and Discord bots without global state collisions.
---

<!--
GitHub-flavored Alerts:

> [!NOTE]

> [!TIP]

> [!IMPORTANT]

> [!WARNING]

> [!CAUTION]
-->
