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

Validate that all locales have the same keys — no output files are written.

```bash
li18n check
```

#### Params

| Param             | Description                      | Default             |
| ----------------- | -------------------------------- | ------------------- |
| `--config <path>` | Absolute path to the config file | `li18n.config.json` |

Exits with a non-zero status code if any keys are missing or extra across locales.

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
