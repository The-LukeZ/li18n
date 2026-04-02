import { defineConfig } from "vitepress";

export default defineConfig({
  title: "li18n",
  description: "Simple, type-safe i18n for TypeScript",
  appearance: "dark",
  lang: "en",
  head: [
    ["og:title", { content: "li18n - Simple, type-safe i18n for TypeScript" }],
    [
      "og:description",
      {
        content:
          "Define your messages in JSON, get fully-typed TypeScript functions out. No runtime parsing, no stringly-typed keys.",
      },
    ],
  ],

  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/config" },
      {
        text: "npm",
        link: "https://www.npmjs.com/package/@the-lukez/li18n",
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Message Format", link: "/guide/message-format" },
          ],
        },
        {
          text: "Usage",
          items: [
            { text: "CLI", link: "/guide/cli" },
            { text: "Runtime API", link: "/guide/runtime-api" },
          ],
        },
        {
          text: "Config Reference",
          link: "/reference/config",
        },
        {
          text: "Localize your Discord Bot",
          link: "/guide/how-to-localize-your-discord-bot-in-2026",
        },
      ],
      "/reference/": [
        { text: "Reference", items: [{ text: "Config Reference", link: "/reference/config" }] },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/The-LukeZ/li18n" }],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
    },

    editLink: {
      pattern: "https://github.com/The-LukeZ/li18n/edit/main/docs/:path",
    },
  },

  markdown: {
    toc: {
      level: [2, 3],
    },
    theme: {
      dark: "github-dark",
      light: "github-light",
    },
  },

  sitemap: {
    hostname: "https://li18n.thelukez.com",
  },
});
