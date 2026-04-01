# Message Format

Messages are defined as JSON files — one file per locale. li18n supports simple strings, interpolated variables, and conditional branches.

## Simple strings

```json
{
  "greeting": "Hello {name}!",
  "farewell": "Goodbye!",
  "nav": {
    "home": "Home",
    "about": "About"
  }
}
```

Nested objects become dot-separated keys: `nav.home`, `nav.about`.

Variables are wrapped in `{curly braces}`. Their types are inferred from how they're used in conditionals, or default to `string` when used in plain templates.

## Conditionals

Use an array to define a conditional message:

```json
{
  "key": [
    {
      "var": "<variableName>",
      "cases": {
        "<case>": "<output>",
        "else": "<fallback>"
      }
    }
  ]
}
```

The variable type is inferred from the cases, or you can declare it explicitly:

| Syntax                          | Type     |
| ------------------------------- | -------- |
| `{ "var": "name" }`             | inferred |
| `{ "var": { "bool": "name" } }` | boolean  |
| `{ "var": { "num": "name" } }`  | number   |
| `{ "var": { "str": "name" } }`  | string   |

### Boolean conditional

Cases: `"true"` and/or `"false"` (with optional `"else"` as an alias for `"false"`).

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

Generated signature:

```ts
export function status(pOrLocale?: Locale): string;
export function status(pOrLocale?: { isOnline: boolean }, locale?: Locale): string;
```

### String conditional

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

Generated signature:

```ts
export function role(pOrLocale?: Locale): string;
export function role(pOrLocale?: { userRole: string }, locale?: Locale): string;
```

### Number conditional (pluralization)

Cases are JS comparison expressions, evaluated top to bottom. `"else"` is required.

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

Generated signature:

```ts
export function score(pOrLocale?: Locale): string;
export function score(pOrLocale?: { points: number }, locale?: Locale): string;
```

### Interpolation in conditionals

`{var}` references in case strings are interpolated and all referenced variables are added to the function's parameter type:

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

Generated signature:

```ts
export function greeting(pOrLocale?: Locale): string;
export function greeting(
  pOrLocale?: { isLoggedIn: boolean; name: string },
  locale?: Locale,
): string;
```

## Locale override

Every generated message function accepts an optional locale argument:

```ts
// No params — locale only or nothing
m.farewell(); // uses getLocale()
m.farewell("de"); // forced to "de"

// With params — params first, locale second
m.greeting({ name: "Alice" }); // uses getLocale()
m.greeting({ name: "Alice" }, "de"); // forced to "de"
m.greeting("de"); // forced to "de", no params
```

This is useful when rendering content in a specific locale (e.g. sending emails in the recipient's language) without changing global locale state.
