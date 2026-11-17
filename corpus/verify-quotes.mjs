// Check that every step quote in the corpus appears, word for word, on its source page.
//   node corpus/verify-quotes.mjs      (run from the repo root; uses the local Chrome via playwright-core in video/)
// Prints, per step: verbatim / NOT FOUND, and for misses the closest real sentence on the page.
import { createRequire } from "node:module";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("../video/node_modules/playwright-core");

const norm = (s) => s.replace(/\*\*/g, "").replace(/[“”"]/g, '"').replace(/[‘’']/g, "'").replace(/\s+/g, " ").replace(/<[^>]+>/g, "").trim().toLowerCase();
const dir = "corpus/tutorials";
const files = readdirSync(dir).filter((f) => f.endsWith(".tutorial.json"));
const bySource = new Map();
for (const f of files) {
  const t = JSON.parse(readFileSync(join(dir, f), "utf8"));
  if (!bySource.has(t.source)) bySource.set(t.source, []);
  bySource.get(t.source).push({ f, t });
}
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await browser.newPage();
const results = [];
for (const [src, list] of bySource) {
  let text = "";
  try {
    await page.goto(src, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    text = await page.evaluate(() => document.body.innerText);
  } catch (e) { text = ""; }
  const T = norm(text);
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 8);
  for (const { f, t } of list)
    for (const s of t.steps) {
      if (s.skip_reason?.startsWith("Covered by the start URL")) continue;
      const q = norm(s.quote);
      const ok = T.includes(q);
      let closest = "";
      if (!ok) {
        const words = new Set(q.split(" "));
        closest = sentences.map((x) => [x, norm(x).split(" ").filter((w) => words.has(w)).length / Math.max(words.size, 1)]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      }
      results.push({ file: f, n: s.n, ok, quote: s.quote, closest });
      console.log(`${ok ? "verbatim " : "NOT FOUND"} ${f}#${s.n}${ok ? "" : `\n    ours: ${s.quote}\n    page: ${closest}`}`);
    }
}
await browser.close();
writeFileSync("corpus/quote-check.json", JSON.stringify(results, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} verbatim`);
