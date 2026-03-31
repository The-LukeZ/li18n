// Shared AST types used across parser, analyzer, codegen, and writer.
// These represent the compiler's internal output — distinct from the raw JSON
// input types, which are inferred from Zod schemas in schemas.ts.

export type MessageNode =
  | { kind: "string"; template: string; vars: string[] }
  | {
      kind: "conditional";
      condVar: string;
      condType: "boolean" | "string" | "number";
      cases: { key: string; value: string; vars: string[] }[];
    };

/** Flattened message keys → their AST node, for a single locale. */
export type MessageTree = Record<string, MessageNode>;

/** All locales compiled: locale code → MessageTree */
export type CompiledLocales = Record<string, MessageTree>;
