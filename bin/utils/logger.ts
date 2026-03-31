const prefix = "li18n";

const TYPE_ICONS = {
  error: "✖",
  fatal: "✖",
  ready: "✔",
  warn: "⚠",
  info: "ℹ",
  success: "✔",
  debug: "⚙",
  trace: "→",
  fail: "✖",
  start: "◐",
  log: "",
};

export const log = {
  build: (msg: string) => console.log(TYPE_ICONS.debug, `${prefix}:`, msg),
  success: (msg: string) => console.log(TYPE_ICONS.success, `${prefix}:`, msg),
  watch: (msg: string) => console.log(TYPE_ICONS.start, `${prefix}:`, msg),
  change: (msg: string) => console.log(TYPE_ICONS.trace, `${prefix}:`, msg),
  error: (msg: string) => console.error(TYPE_ICONS.error, `${prefix}:`, msg),
  localeError: (locale: string, msg: string) => console.error(TYPE_ICONS.error, `[${locale}]`, msg),
  localeWarn: (locale: string, msg: string) => console.warn(TYPE_ICONS.warn, `[${locale}]`, msg),
};
