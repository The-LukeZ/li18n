// AUTO-GENERATED - do not edit
import { getLocale } from "../runtime.ts";

const _en = (p: { name: string }): string => `Hello ${p.name}!`;
const _de = (p: { name: string }): string => `Hallo ${p.name}!`;

export const greeting = (p: { name: string }): string => {
  switch (getLocale()) {
    case "de":
      return _de(p);
    default:
      return _en(p);
  }
};
