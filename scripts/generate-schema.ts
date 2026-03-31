import { z } from "zod";
import { Li18nConfigSchema } from "../src/schemas.ts";

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "li18n Config",
  description: "Configuration file for the li18n locale compiler",
  ...z.toJSONSchema(Li18nConfigSchema, { target: "draft-2020-12", io: "input" }),
};

await Bun.write("li18n.schema.json", JSON.stringify(schema, null, 2) + "\n");
console.log("Generated li18n.schema.json");
