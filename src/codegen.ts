/**
 * codegen.ts - generates TypeScript source for a single message key.
 *
 * For each key, one .ts file is emitted containing:
 *   - one `_<locale>` private function per locale
 *   - one exported dispatch function that calls `getLocale()` + switch
 */

import type { CompiledLocales, MessageNode } from "./types.ts";
import { extractVars } from "./parser.ts";

// Public API

/** Generates the full .ts file content for `key` across all locales. */
export function generateMessageFile(
  key: string,
  exportName: string,
  locales: CompiledLocales,
  defaultLocale: string,
): string {
  const lines: string[] = [
    `// AUTO-GENERATED - do not edit`,
    `import { getLocale } from "../runtime.ts";`,
    ``,
  ];

  // Collect union of all parameter names + types across all locales
  const params = resolveParams(key, locales);
  const paramType = buildParamType(params);
  const paramArg = paramType ? `p: ${paramType}` : "";
  const callArg = paramType ? "p" : "";

  // Emit one private function per locale
  for (const [locale, tree] of Object.entries(locales)) {
    const node = tree[key];
    if (!node) {
      throw new Error(
        `Key "${key}" is missing in locale "${locale}" - run \`li18n check\` to diagnose`,
      );
    }
    lines.push(`const _${locale} = (${paramArg}): string => ${renderNode(node, params)};`);
  }

  lines.push(``);

  // Emit dispatch function
  lines.push(`export const ${exportName} = (${paramArg}): string => {`);
  lines.push(`  switch (getLocale()) {`);

  for (const locale of Object.keys(locales)) {
    if (locale === defaultLocale) continue;
    lines.push(`    case "${locale}":`);
    lines.push(`      return _${locale}(${callArg});`);
  }

  lines.push(`    default:`);
  lines.push(`      return _${defaultLocale}(${callArg});`);
  lines.push(`  }`);
  lines.push(`};`);
  lines.push(``);

  return lines.join("\n");
}

// Param resolution

type ParamMap = Map<string, "string" | "number" | "boolean">;

/** Collects all parameters needed for `key` across all locales. */
function resolveParams(key: string, locales: CompiledLocales): ParamMap {
  const params: ParamMap = new Map();

  for (const tree of Object.values(locales)) {
    const node = tree[key];
    if (!node) continue;
    mergeNodeParams(node, params);
  }

  return params;
}

function mergeNodeParams(node: MessageNode, out: ParamMap): void {
  if (node.kind === "string") {
    for (const v of node.vars) out.set(v, "string");
    return;
  }

  // conditional
  const existing = out.get(node.condVar);
  if (!existing) {
    out.set(
      node.condVar,
      node.condType === "boolean" ? "boolean" : node.condType === "number" ? "number" : "string",
    );
  }

  for (const c of node.cases) {
    for (const v of c.vars) {
      if (!out.has(v)) out.set(v, "string");
    }
  }
}

function buildParamType(params: ParamMap): string {
  if (params.size === 0) return "";
  const entries = Array.from(params.entries())
    .map(([name, type]) => `${name}: ${type}`)
    .join("; ");
  return `{ ${entries} }`;
}

// Code rendering

function renderNode(node: MessageNode, _params: ParamMap): string {
  if (node.kind === "string") {
    return renderStringTemplate(node.template);
  }
  return renderConditional(node);
}

/** Renders a plain string template as a TS expression (string literal or template literal). */
function renderStringTemplate(template: string): string {
  const vars = extractVars(template);
  if (vars.length === 0) return JSON.stringify(template);
  // Build template literal, replacing {var} with ${p.var}
  const escaped = template
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${")
    .replace(/\{(\w+)\}/g, "$${p.$1}");
  return `\`${escaped}\``;
}

function renderConditional(node: Extract<MessageNode, { kind: "conditional" }>): string {
  const { condVar, condType, cases } = node;
  const nonElse = cases.filter((c) => c.key !== "else");
  const elseCaseObj = cases.find((c) => c.key === "else");
  const elseVal = elseCaseObj ? renderStringTemplate(elseCaseObj.value) : `""`;

  if (condType === "boolean") {
    const trueVal = renderStringTemplate(cases.find((c) => c.key === "true")?.value ?? "");
    const falseVal = renderStringTemplate(
      cases.find((c) => c.key === "false")?.value ?? elseCaseObj?.value ?? "",
    );
    return `p.${condVar} ? ${trueVal} : ${falseVal}`;
  }

  if (condType === "string") {
    return buildTernaryChain(
      nonElse.map((c) => ({
        condition: `p.${condVar} === ${JSON.stringify(c.key)}`,
        value: renderStringTemplate(c.value),
      })),
      elseVal,
    );
  }

  // number - order is significant
  return buildTernaryChain(
    nonElse.map((c) => {
      const op = resolveNumberOp(c.key);
      return {
        condition: `p.${condVar} ${op}`,
        value: renderStringTemplate(c.value),
      };
    }),
    elseVal,
  );
}

function buildTernaryChain(
  branches: { condition: string; value: string }[],
  fallback: string,
): string {
  if (branches.length === 0) return fallback;
  const [head, ...tail] = branches;
  return `${head!.condition}\n    ? ${head!.value}\n    : ${buildTernaryChain(tail, fallback)}`;
}

/** Normalises a number case key to a full operator expression. */
function resolveNumberOp(key: string): string {
  // Already has an operator
  if (/^(===|!==|>=?|<=?)/.test(key)) return key;
  // Bare number → exact match
  return `=== ${key}`;
}
