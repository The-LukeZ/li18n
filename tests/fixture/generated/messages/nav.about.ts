// AUTO-GENERATED - do not edit
import { getLocale } from "../runtime.ts";

const _en = (): string => "About";
const _de = (): string => "Über uns";

export const navAbout = (): string => {
  switch (getLocale()) {
    case "de":
      return _de();
    default:
      return _en();
  }
};
