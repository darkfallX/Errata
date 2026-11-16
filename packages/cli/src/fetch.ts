// Load a tutorial: a local Markdown file, or a docs URL (HTML → clean Markdown).
// For URLs we also look for the page's "Edit on GitHub" link, so a fix can be a real patch on the real source.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NodeHtmlMarkdown } from "node-html-markdown";

export interface LoadedDoc {
  title: string;
  source: string;
  markdown: string;
  /** Local path or raw URL of the Markdown source, when we have it. */
  sourceFile?: string;
  /** For docs sites with an "edit this page" link: the GitHub blob URL. */
  editUrl?: string;
  start_url: string;
}

export function isUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

export async function loadDoc(input: string, appUrl?: string): Promise<LoadedDoc> {
  if (!isUrl(input)) {
    const path = resolve(input);
    let md = readFileSync(path, "utf8");
    const startHint = md.match(/<!--\s*errata:start\s+(\S+)\s*-->/)?.[1];
    if (appUrl) md = md.split("{{app}}").join(appUrl.replace(/\/$/, ""));
    const start = appUrl ? (startHint ? startHint.replace("{{app}}", appUrl.replace(/\/$/, "")) : appUrl) : startHint ?? "";
    return { title: md.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "", source: path, markdown: md, sourceFile: path, start_url: start };
  }

  const res = await fetch(input, { headers: { "user-agent": "errata-cli (+https://github.com/errata-sh/errata)", accept: "text/html,*/*" }, redirect: "follow" });
  if (!res.ok) throw new Error(`Could not fetch ${input}: HTTP ${res.status}`);
  const html = await res.text();
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();

  const editUrl = findEditLink(html, input);
  const main = pickMain(html);
  const markdown = NodeHtmlMarkdown.translate(main, { ignore: ["script", "style", "nav", "footer", "svg", "noscript", "button"] })
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, source: input, markdown, editUrl, sourceFile: editUrl ? rawGithub(editUrl) : undefined, start_url: appUrl ?? "" };
}

function pickMain(html: string): string {
  for (const re of [/<main[\s\S]*?<\/main>/i, /<article[\s\S]*?<\/article>/i, /<div[^>]+role=["']main["'][\s\S]*?<\/div>/i]) {
    const m = html.match(re);
    if (m && m[0].length > 400) return m[0];
  }
  return html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
}

function findEditLink(html: string, base: string): string | undefined {
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (/github\.com\/[^/]+\/[^/]+\/(edit|blob)\/[^"']+\.(md|mdx|markdown)/i.test(href)) {
      try {
        return new URL(href, base).toString();
      } catch {
        /* ignore */
      }
    }
  }
  return undefined;
}

export function rawGithub(url: string): string {
  return url.replace("github.com", "raw.githubusercontent.com").replace(/\/(edit|blob)\//, "/");
}

export async function fetchText(url: string): Promise<string | undefined> {
  try {
    const r = await fetch(url);
    return r.ok ? await r.text() : undefined;
  } catch {
    return undefined;
  }
}
