// AUTO-GENERATED - do not edit
import { getLocale } from "../runtime.ts";

const _en = (): string => "Goodbye";
const _de = (): string => "Auf Wiedersehen";

export const farewell = (): string => {
  switch (getLocale()) {
    case "de":
      return _de();
    default:
      return _en();
  }
};
