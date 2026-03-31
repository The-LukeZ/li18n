// AUTO-GENERATED - do not edit
import { AsyncLocalStorage } from "node:async_hooks";

export const localeStorage = new AsyncLocalStorage<string>();

let _override: (() => string) | null = null;

export function getLocale(fallback?: string): string {
  if (_override) return _override();
  return localeStorage.getStore() ?? fallback ?? "en";
}

export function withLocale<T>(locale: string, fn: () => T): T {
  return localeStorage.run(locale, fn);
}

export function setGetLocale(fn: () => string): void {
  _override = fn;
}
