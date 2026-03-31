// AUTO-GENERATED - do not edit
import { getLocale } from "../runtime.ts";

const _en = (p: { locale: string }): string => p.locale === "en"
    ? "English"
    : p.locale === "de"
    ? "German"
    : "Other";
const _de = (p: { locale: string }): string => p.locale === "en"
    ? "Englisch"
    : p.locale === "de"
    ? "Deutsch"
    : "Andere";

export const lang = (p: { locale: string }): string => {
  switch (getLocale()) {
    case "de":
      return _de(p);
    default:
      return _en(p);
  }
};
