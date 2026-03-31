/**
 * analyzer.ts - type inference, variable collection, and validation.
 *
 * Takes the raw MessageTree produced by parser.ts (where condType may be an
 * unverified placeholder) and returns a validated MessageTree with correct
 * condType values and complete variable lists.
 */

import type { MessageNode, MessageTree } from "./types.ts";

// Regex that matches valid number-operator case keys, e.g. ">= 10", "=== 1", "< 0"
const NUMBER_OPERATOR_RE = /^(===|!==|>=?|<=?)\s*-?\d+(\.\d+)?$/;
// A bare number with no operator prefix (e.g. "50") - treated as "=== 50"
const BARE_NUMBER_RE = /^-?\d+(\.\d+)?$/;

export type AnalyzerError = { key: string; message: string };

export interface AnalyzeResult {
  tree: MessageTree;
  errors: AnalyzerError[];
}

// Public API

export function analyzeTree(raw: MessageTree, filePath: string): AnalyzeResult {
  const errors: AnalyzerError[] = [];
  const tree: MessageTree = {};

  for (const [key, node] of Object.entries(raw)) {
    try {
      tree[key] = analyzeNode(node, key, filePath);
    } catch (err) {
      errors.push({ key, message: (err as Error).message });
      tree[key] = node; // keep raw node so we can continue
    }
  }

  return { tree, errors };
}

// Internal

function analyzeNode(node: MessageNode, key: string, filePath: string): MessageNode {
  if (node.kind === "string") return node;

  const { condVar, cases } = node;
  const nonElseCases = cases.filter((c) => c.key !== "else");
  const hasElse = cases.some((c) => c.key === "else");

  // If the parser already set an explicit type, validate; otherwise infer.
  // Note: parser sets condType to "string" as default for implicit cases,
  // so we re-derive from the raw hint by checking the original flag stored
  // in the node. To keep things clean we re-infer here entirely.

  const condType = inferCondType(node, key, filePath);

  // --- Type-specific validation ---
  if (condType === "boolean") {
    for (const c of nonElseCases) {
      if (c.key !== "true" && c.key !== "false") {
        throw new Error(
          `${filePath}: key "${key}" - boolean conditional has invalid case key "${c.key}" (only "true", "false", "else" allowed)`,
        );
      }
    }
  }

  if (condType === "number") {
    if (!hasElse) {
      throw new Error(`${filePath}: key "${key}" - number conditional requires an "else" case`);
    }
    for (const c of nonElseCases) {
      if (!NUMBER_OPERATOR_RE.test(c.key) && !BARE_NUMBER_RE.test(c.key)) {
        throw new Error(
          `${filePath}: key "${key}" - number conditional has invalid case key "${c.key}" (expected operator expression like ">= 10" or bare number like "50")`,
        );
      }
    }
  }

  // Collect all variables across all case values (union)
  const allVars = collectAllVars(condVar, condType, cases);

  return { kind: "conditional", condVar, condType, cases, ...{ allVars } } as MessageNode;
}

/**
 * Infers (or validates explicit) condType from the node and case keys.
 *
 * The parser stored the explicit hint directly in condType when present.
 * For implicit (no hint, condType defaulted to "string" by parser), we infer.
 */
function inferCondType(
  node: Extract<MessageNode, { kind: "conditional" }>,
  key: string,
  filePath: string,
): "boolean" | "string" | "number" {
  // We distinguish explicit vs implicit by whether all non-else keys satisfy
  // the boolean/number patterns, falling back to string.
  const { condType, cases } = node;
  const nonElseKeys = cases.filter((c) => c.key !== "else").map((c) => c.key);

  // --- Explicit type hints from parser ---
  if (condType === "boolean") {
    // Already explicit; validator above will check keys
    return "boolean";
  }
  if (condType === "number") {
    return "number";
  }

  // condType === "string" may be explicit or implicit - infer to be sure.
  // Infer boolean: all non-else keys are "true" or "false"
  if (nonElseKeys.length > 0 && nonElseKeys.every((k) => k === "true" || k === "false")) {
    return "boolean";
  }

  // Infer number: all non-else keys match operator or bare-number pattern
  if (
    nonElseKeys.length > 0 &&
    nonElseKeys.every((k) => NUMBER_OPERATOR_RE.test(k) || BARE_NUMBER_RE.test(k))
  ) {
    return "number";
  }

  // Explicit "str" hint or implicit fallback → string
  void key;
  void filePath;
  return "string";
}

/** Collects the union of all vars needed by a conditional node. */
function collectAllVars(
  condVar: string,
  condType: "boolean" | "string" | "number",
  cases: { key: string; value: string; vars: string[] }[],
): string[] {
  const set = new Set<string>();

  // The condition variable itself is always a parameter
  set.add(condVar);

  for (const c of cases) {
    for (const v of c.vars) set.add(v);
  }

  void condType; // type annotation lives in the node; no extra work needed here
  return Array.from(set);
}
