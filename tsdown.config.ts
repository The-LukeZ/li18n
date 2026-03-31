import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: "src/index.ts",
    platform: "node",
    exports: {
      packageJson: true,
      all: true,
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
