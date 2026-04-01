# Config Reference

li18n is configured via `li18n.config.json` in your project root.

## Example

```json
{
  "$schema": "./node_modules/@the-lukez/li18n/li18n.schema.json",
  "locales": ["en", "de", "fr"],
  "defaultLocale": "en",
  "messagesDir": "./messages",
  "outputDir": "./src/i18n",
  "clean": true
}
```

## Fields

| Field           | Type       | Required | Default | Description                                                                                                  |
| --------------- | ---------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `locales`       | `string[]` | Yes      | -       | Supported locale codes (e.g. ISO 639-1: `"en"`, `"de"`, `"fr"`)                                              |
| `defaultLocale` | `string`   | Yes      | -       | Fallback locale - must be one of the values in `locales`                                                     |
| `messagesDir`   | `string`   | Yes      | -       | Path to the folder containing locale JSON files (one file per locale)                                        |
| `outputDir`     | `string`   | Yes      | -       | Path where generated TypeScript files will be written                                                        |
| `clean`         | `boolean`  | No       | `true`  | Delete the `messages/` subdirectory inside `outputDir` before each build to remove stale generated key files |

## Schema validation

The `$schema` field points to the bundled JSON Schema and enables IDE autocomplete and inline error highlighting. It has no effect at runtime.

```json
{
  "$schema": "./node_modules/@the-lukez/li18n/li18n.schema.json"
}
```

## Custom config path

All CLI commands accept a `--config` flag to use a non-default config location:

```bash
li18n build --config ./config/li18n.config.json
```
