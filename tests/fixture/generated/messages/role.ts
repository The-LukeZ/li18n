// AUTO-GENERATED - do not edit
import { getLocale } from "../runtime.ts";

const _en = (p: { isAdmin: boolean }): string => p.isAdmin ? "Admin" : "User";
const _de = (p: { isAdmin: boolean }): string => p.isAdmin ? "Admin" : "Benutzer";

export const role = (p: { isAdmin: boolean }): string => {
  switch (getLocale()) {
    case "de":
      return _de(p);
    default:
      return _en(p);
  }
};
