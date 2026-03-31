// AUTO-GENERATED - do not edit
import { getLocale } from "../runtime.ts";

const _en = (): string => "Home";
const _de = (): string => "Startseite";

export const navHome = (): string => {
  switch (getLocale()) {
    case "de":
      return _de();
    default:
      return _en();
  }
};
