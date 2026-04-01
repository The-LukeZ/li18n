/**
 * schemas.ts - Zod schemas for all external inputs (config file + locale JSON files).
 *
 * Types are inferred directly from these schemas. No manual interface duplication.
 */

import { z } from "zod";

// Config schema  (li18n.config.json)

export const Li18nConfigSchema = z
  .object({
    // $schema can be present, but ignored here
    locales: z.array(z.string()).min(1),
    defaultLocale: z.string(),
    messagesDir: z.string(),
    outputDir: z.string(),
    clean: z.boolean().default(true),
  })
  .superRefine((c, ctx) => {
    if (!c.locales.includes(c.defaultLocale)) {
      ctx.addIssue({
        code: "invalid_value",
        values: [c.defaultLocale],
        message: `"${c.defaultLocale}" must be one of the declared locales`,
        path: ["defaultLocale"],
      });
    }
  });

export type Li18nConfig = z.input<typeof Li18nConfigSchema>;

// Message JSON schemas  (messages/<locale>.json)

/** The "var" field inside a conditional: plain name or explicit type hint. */
const VarFieldSchema = z.union([
  z.string(),
  z.strictObject({ bool: z.string() }),
  z.strictObject({ num: z.string() }),
  z.strictObject({ str: z.string() }),
]);

export type RawVarField = z.infer<typeof VarFieldSchema>;

/** The single element inside a conditional array. */
const ConditionalElementSchema = z
  .object({
    var: VarFieldSchema,
    cases: z.record(z.string(), z.string()),
  })
  .strict();

export type RawConditionalElement = z.infer<typeof ConditionalElementSchema>;

/**
 * A single value in a locale JSON file.
 * Recursive via z.lazy to support arbitrarily nested namespaces.
 */
export type RawMessageValue = string | [RawConditionalElement] | { [key: string]: RawMessageValue };

const MessageValueSchema: z.ZodType<RawMessageValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.tuple([ConditionalElementSchema]),
    z.record(z.string(), MessageValueSchema),
  ]),
);

/** Schema for a whole locale JSON file (root must be an object). */
export const MessageJsonSchema = z.record(z.string(), MessageValueSchema);

export type RawLocaleJson = z.infer<typeof MessageJsonSchema>;

// Error formatter

/**
 * Converts a ZodError into a human-readable string prefixed with the file path.
 *
 * Example output:
 *   li18n.config.json → defaultLocale: "defaultLocale" ("xx") must be one of the declared locales
 *   messages/en.json → greeting[0].cases: Expected string, received number
 */
export function formatZodError(err: z.ZodError, filePath: string): string {
  return err.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${filePath} → ${path}: ${issue.message}`;
    })
    .join("\n");
}
