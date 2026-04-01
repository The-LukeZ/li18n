import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "src/index.ts",
    platform: "node",
    exports: {
      customExports: {
        "./li18n.schema.json": "./li18n.schema.json",
        "./messages.schema.json": "./messages.schema.json",
      },
    },
    tsconfig: "./tsconfig.json",
    dts: true,
  },
  {
    entry: "bin/li18n.ts",
    platform: "node",
    tsconfig: "./tsconfig.json",
    outDir: "dist/bin",
  },
]);
