import { toJSONSchema } from "zod";
import { Li18nConfigSchema, MessageJsonSchema } from "../src/schemas.ts";

const configSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "li18n Config",
  description: "Configuration file for the li18n locale compiler",
  ...toJSONSchema(Li18nConfigSchema, { target: "draft-2020-12", io: "input" }),
};

await Bun.write("li18n.schema.json", JSON.stringify(configSchema, null, 2) + "\n");
console.log("Generated li18n.schema.json");

const messagesSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "li18n Messages",
  description: "Schema for the JSON files containing localized messages",
  ...toJSONSchema(MessageJsonSchema, { target: "draft-2020-12", io: "input" }),
};

await Bun.write("messages.schema.json", JSON.stringify(messagesSchema, null, 2) + "\n");
console.log("Generated messages.schema.json");
