// AUTO-GENERATED - do not edit
import { getLocale } from "../runtime.ts";

const _en = (p: { count: number }): string => p.count === 1
    ? "One item"
    : p.count >= 10
    ? "Many items"
    : `${p.count} items`;
const _de = (p: { count: number }): string => p.count === 1
    ? "Ein Artikel"
    : p.count >= 10
    ? "Viele Artikel"
    : `${p.count} Artikel`;

export const items = (p: { count: number }): string => {
  switch (getLocale()) {
    case "de":
      return _de(p);
    default:
      return _en(p);
  }
};
