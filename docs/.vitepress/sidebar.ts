/**
 * Generates the VitePress sidebar from the markdown files on disk.
 *
 * Every top-level folder in `docs/src` (e.g. `guide/`, `reference/`) becomes
 * a sidebar group. Pages inside a folder are sorted by the `order` frontmatter
 * field (lower first, pages without it go last), then by title. The page title
 * comes from the `title` frontmatter field, falling back to the file name.
 *
 * Group titles default to the capitalized folder name; override them in
 * `groupTitles` below.
 */

import fs from "node:fs";
import path from "node:path";
import type { DefaultTheme } from "vitepress";

const groupTitles: Record<string, string> = {};

interface Page {
  title: string;
  order: number;
  link: string;
}

function readFrontmatter(file: string): Record<string, string> {
  const text = fs.readFileSync(file, "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const data: Record<string, string> = {};
  if (!match) return data;
  for (const line of match[1]!.split(/\r?\n/)) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]!] = kv[2]!.replace(/^["']|["']$/g, "").trim();
  }
  return data;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}

export function generateSidebar(docsRoot: string): DefaultTheme.SidebarItem[] {
  const groups: DefaultTheme.SidebarItem[] = [];

  const dirs = fs
    .readdirSync(docsRoot, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() && !d.name.startsWith(".") && !["node_modules", "public"].includes(d.name),
    )
    .map((d) => d.name)
    .sort();

  for (const dir of dirs) {
    const pages: Page[] = fs
      .readdirSync(path.join(docsRoot, dir))
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const fm = readFrontmatter(path.join(docsRoot, dir, f));
        const slug = f.replace(/\.md$/, "");
        const order = Number(fm.order);
        return {
          title: fm.title || capitalize(slug),
          order: Number.isFinite(order) ? order : Number.POSITIVE_INFINITY,
          link: slug === "index" ? `/${dir}/` : `/${dir}/${slug}`,
        };
      })
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

    if (pages.length === 0) continue;
    groups.push({
      text: groupTitles[dir] ?? capitalize(dir),
      items: pages.map((p) => ({ text: p.title, link: p.link })),
    });
  }

  return groups;
}
