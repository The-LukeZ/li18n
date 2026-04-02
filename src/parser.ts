/**
 * parser.ts - JSON locale file → raw MessageTree (no type inference yet).
 *
 * Rules:
 *   string  → simple string node (vars extracted from {placeholder} syntax)
 *   object  → namespace; recurse and flatten with "parent.child" keys
 *   array   → conditional node (exactly one element with "var" + "cases")
 */

import { ZodError } from "zod";
import { MessageJsonSchema, formatZodError } from "./schemas.ts";
import type {
  RawConditionalElement,
  RawLocaleJson,
  RawMessageValue,
  RawVarField,
} from "./schemas.ts";
import type { MessageNode, MessageTree, VarType } from "./types.ts";

// Public API

export function parseLocaleFile(jsonText: string, filePath: string): MessageTree {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`${filePath}: invalid JSON - ${(err as Error).message}`);
  }

  let validated: RawLocaleJson;
  try {
    validated = MessageJsonSchema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) throw new Error(formatZodError(err, filePath));
    throw err;
  }

  const tree: MessageTree = {};
  flattenObject(validated, "", tree);
  return tree;
}

// Internal helpers

function flattenObject(
  obj: Record<string, RawMessageValue>,
  prefix: string,
  out: MessageTree,
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      out[fullKey] = { kind: "string", template: value, vars: extractTypedVars(value) };
    } else if (Array.isArray(value)) {
      out[fullKey] = buildConditionalNode(value[0]!);
    } else {
      flattenObject(value, fullKey, out);
    }
  }
}

function buildConditionalNode(elem: RawConditionalElement): MessageNode {
  const { condVar, rawType } = parseVarField(elem.var);
  const cases = Object.entries(elem.cases).map(([caseKey, caseValue]) => ({
    key: caseKey,
    value: caseValue,
    vars: extractVars(caseValue),
  }));
  return {
    kind: "conditional",
    condVar,
    condType: rawType ?? "string", // placeholder - analyzer.ts will infer/validate
    cases,
  };
}

/** Decodes the "var" field into a variable name and optional explicit type hint. */
function parseVarField(varField: RawVarField): {
  condVar: string;
  rawType: "boolean" | "string" | "number" | null;
} {
  if (typeof varField === "string") return { condVar: varField, rawType: null };
  if ("bool" in varField) return { condVar: varField.bool, rawType: "boolean" };
  if ("num" in varField) return { condVar: varField.num, rawType: "number" };
  return { condVar: varField.str, rawType: "string" };
}

// Utility

/** Extracts {placeholder} names from a template string (strips any :type suffix). */
export function extractVars(template: string): string[] {
  const vars: string[] = [];
  const re = /\{(\w+)(?::\w+)?\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(template)) !== null) {
    const name = match[1];
    if (name && !vars.includes(name)) vars.push(name);
  }
  return vars;
}

/** Extracts {placeholder} names with optional :type hints from a template string. */
export function extractTypedVars(template: string): { name: string; type: VarType }[] {
  const vars: { name: string; type: VarType }[] = [];
  const re = /\{(\w+)(?::(\w+))?\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(template)) !== null) {
    const name = match[1]!;
    const hint = match[2];
    const type: VarType = hint === "num" ? "number" : hint === "bool" ? "boolean" : "string";
    if (name && !vars.some((v) => v.name === name)) vars.push({ name, type });
  }
  return vars;
}
