# CLI

li18n ships a CLI for compiling and validating your locale files.

## Commands

### `build`

Compile locale files once and write output to `outputDir`.

```bash
li18n build
```

#### Params

| Param             | Description                                                                       | Default             |
| ----------------- | --------------------------------------------------------------------------------- | ------------------- |
| `--config <path>` | Absolute path to the config file                                                  | `li18n.config.json` |
| `--no-clean`      | Skip cleaning the output dir before building (overrides the `clean` config field) | -                   |

### `watch`

Recompile whenever files in `messagesDir` change.

```bash
li18n watch
```

#### Params

| Param             | Description                      | Default             |
| ----------------- | -------------------------------- | ------------------- |
| `--config <path>` | Absolute path to the config file | `li18n.config.json` |

### `check`

Validate that all locales have the same keys - no output files are written.

```bash
li18n check
```

#### Params

| Param             | Description                      | Default             |
| ----------------- | -------------------------------- | ------------------- |
| `--config <path>` | Absolute path to the config file | `li18n.config.json` |

Exits with a non-zero status code if any keys are missing or extra across locales.

### `translate`

Fill in missing keys in non-default locales via machine translation (DeepL or Google Cloud Translation). Only missing keys are translated - existing values are left untouched. Variable placeholders (`{name}`) are masked before sending to the provider and restored after, so they survive translation intact.

```bash
li18n translate
li18n translate --provider google --locales de,fr
li18n translate --dry-run
```

#### Params

| Param                  | Description                                                                         | Default                 |
| ---------------------- | ----------------------------------------------------------------------------------- | ----------------------- |
| `--config <path>`      | Absolute path to the config file                                                    | `li18n.config.json`     |
| `--provider <name>`    | Machine translation provider: `deepl` or `google`                                   | `deepl`                 |
| `--api-key-env <name>` | Name of the env var holding the provider API key                                    | -                       |
| `--locales <list>`     | Comma-separated target locales to translate                                         | all non-default locales |
| `--dry-run`            | List missing keys that would be translated without calling the API or writing files | -                       |

#### API keys

If `--api-key-env` is not given, the key is read from (in order):

- **deepl**: `LI18N_DEEPL_API_KEY` or `DEEPL_API_KEY`
- **google**: `LI18N_GOOGLE_API_KEY` or `GOOGLE_TRANSLATE_API_KEY`

Free-tier DeepL keys (suffixed `:fx`) are automatically routed to the free API host.

### `init`

Create a default `li18n.config.json` in the current directory and initialize the messages directory for your translations.

```bash
li18n init
```

#### Params

| Param                   | Description                                           | Default      |
| ----------------------- | ----------------------------------------------------- | ------------ |
| `--messages-dir <path>` | Relative path to the messages directory to initialize | `./messages` |

## Usage in scripts

Add li18n to your build pipeline in `package.json`:

```json
{
  "scripts": {
    "i18n:build": "li18n build",
    "i18n:watch": "li18n watch",
    "prebuild": "li18n build"
  }
}
```
