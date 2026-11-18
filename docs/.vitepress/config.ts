import path from "node:path";
import { defineConfig } from "vitepress";
import { generateSidebar } from "./sidebar.ts";

const srcDir = path.resolve(import.meta.dirname, "../src");

export default defineConfig({
  title: "li18n",
  description: "Simple, type-safe i18n for TypeScript",
  lang: "en",
  srcDir: "src",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["meta", { property: "og:title", content: "li18n - Simple, type-safe i18n for TypeScript" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Define your messages in JSON, get fully-typed TypeScript functions out. No runtime parsing, no stringly-typed keys.",
      },
    ],
  ],

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/config" },
      { text: "npm", link: "https://www.npmjs.com/package/@the-lukez/li18n" },
    ],

    sidebar: generateSidebar(srcDir),

    socialLinks: [{ icon: "github", link: "https://github.com/The-LukeZ/li18n" }],

    search: { provider: "local" },

    footer: { message: "Released under the MIT License." },

    editLink: {
      pattern: "https://github.com/The-LukeZ/li18n/edit/main/docs/src/:path",
    },

    outline: { level: [2, 3] },
  },

  markdown: {
    theme: { light: "github-light", dark: "github-dark" },
  },

  sitemap: { hostname: "https://li18n.thelukez.com" },
});
