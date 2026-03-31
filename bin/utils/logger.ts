const prefix = "li18n";

export const log = {
  build: (msg: string) => console.log(`⚙️  ${prefix}: ${msg}`),
  success: (msg: string) => console.log(`✅  ${prefix}: ${msg}`),
  watch: (msg: string) => console.log(`👀  ${prefix}: ${msg}`),
  change: (msg: string) => console.log(`🔄  ${prefix}: ${msg}`),
  error: (msg: string) => console.error(`❌  ${prefix}: ${msg}`),
  localeError: (locale: string, msg: string) => console.error(`❌  [${locale}] ${msg}`),
  localeWarn: (locale: string, msg: string) => console.warn(`⚠️  [${locale}] ${msg}`),
};
