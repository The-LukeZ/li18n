// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import {
  rehypeCode,
  remarkHeading,
  remarkNpm,
  remarkStructure,
} from "fumadocs-core/mdx-plugins";

/** @type {import('@astrojs/markdown-remark').RemarkPlugins} */
const remarkPlugins = [
  remarkHeading,
  remarkNpm,
  [remarkStructure, { exportAs: "structuredData" }],
];
const rehypePlugins = [rehypeCode];

export default defineConfig({
  output: "static",
  trailingSlash: "ignore",
  site: "https://li18n.thelukez.com",
  outDir: "dist",

  markdown: {
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins,
      rehypePlugins,
    }),
  },

  integrations: [
    react(),
    mdx({
      extendMarkdownConfig: true,
      syntaxHighlight: false,
    }),
    sitemap(),
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "@base-ui-components/react",
        "fumadocs-core",
        "fumadocs-ui",
      ],
    },
  },
});
