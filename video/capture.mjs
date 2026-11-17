// Capture real pages for the video, at 1920x1080 (2x pixel density for crisp zooms).
// Also records where key text sits on each page (shots/boxes.json), so the cursor and
// highlights in the film land on the real words.
//   node capture.mjs
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
mkdirSync("shots", { recursive: true });
const boxes = {};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = (scheme = "light") =>
  browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, colorScheme: scheme, reducedMotion: "reduce", locale: "en-US" });

/** Bounding boxes (in 1920x1080 viewport px) of the first visible occurrence of each text. */
async function find(page, texts) {
  return page.evaluate((texts) => {
    const out = {};
    for (const t of texts) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const i = n.textContent.indexOf(t);
        if (i < 0) continue;
        const r = document.createRange();
        r.setStart(n, i);
        r.setEnd(n, i + t.length);
        const b = r.getBoundingClientRect();
        if (b.width && b.height && b.top >= 0 && b.bottom <= innerHeight) {
          out[t] = { x: b.left, y: b.top, w: b.width, h: b.height };
          break;
        }
      }
    }
    return out;
  }, texts);
}

async function shot(name, page, texts = []) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/${name}.png` });
  boxes[name] = await find(page, texts);
  console.log(name, Object.keys(boxes[name]).length + "/" + texts.length, "boxes");
}

async function scrollToText(page, text, offset = 300) {
  await page.evaluate(([text, offset]) => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (n.textContent.includes(text)) { const el = n.parentElement; window.scrollTo(0, el.getBoundingClientRect().top + scrollY - offset); return; }
  }, [text, offset]);
}

// ── Old tutorials ──
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto("https://www.howtogeek.com/27882/create-an-ebook-or-pdf-from-wikipedia-articles-for-offline-reading/", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  await scrollToText(p, "Print/export", 380);
  await shot("htg", p, ["Print/export", "Download as PDF", "left sidebar"]);
  await c.close();
}
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto("https://dignited.com/44778/how-to-export-a-wikipedia-page-as-a-pdf", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2500);
  await scrollToText(p, "Print/export", 380);
  await shot("dignited", p, ["Print/export", "Download as PDF", "left sidebar"]);
  await c.close();
}

// ── Wikipedia today ──
{
  const c = await ctx(); const p = await c.newPage();
  await p.goto("https://en.wikipedia.org/wiki/Ada_Lovelace", { waitUntil: "networkidle" });
  await shot("wiki", p, ["Contents", "Tools", "Ada Lovelace", "(Top)"]);
  // the Tools menu, opened the way Kane did
  const tools = p.locator("#vector-page-tools-dropdown-checkbox, #vector-page-tools-dropdown .vector-dropdown-label").first();
  await tools.click().catch(async () => { await p.getByText("Tools", { exact: true }).first().click(); });
  await shot("wiki-tools", p, ["Tools", "Download as PDF", "Print/export", "Printable version"]);
  await p.goto("https://en.wikipedia.org/w/index.php?title=Special:DownloadAsPdf&page=Ada_Lovelace&action=show-download-screen", { waitUntil: "networkidle" });
  await shot("wiki-pdf", p, ["Download as PDF", "Download"]);
  await c.close();
}

// ── Errata site (dark, cinematic) ──
for (const scheme of ["dark"]) {
  const c = await ctx(scheme); const p = await c.newPage();
  const site = "https://errata-nine.vercel.app";
  await p.goto(site + "/", { waitUntil: "networkidle" });
  await shot(`site-home`, p, ["Every doc has errata.", "npx errata-cli demo --replay"]);
  await p.evaluate(() => document.querySelector(".score").scrollIntoView({ block: "center" }));
  await shot(`site-score`, p, ["Public tutorials walked", "Confirmed wrong steps", "Fixed and proven by Kane", "False alarms, published"]);
  await p.goto(site + "/report/", { waitUntil: "networkidle" });
  await shot(`site-report`, p, ["The errata sheet", "Drifted", "False alarms"]);
  await p.evaluate(() => document.getElementById("drift-hunt").scrollIntoView());
  await p.evaluate(() => window.scrollBy(0, -40));
  await shot(`site-hunt`, p, ["The drift hunt", "Dignited (2019): Export a Wikipedia page as a PDF"]);
  await p.evaluate(() => [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("Precision")).scrollIntoView());
  await shot(`site-precision`, p, ["Precision", "False alarms, and why", "Approved by Darkfallx"]);
  await p.goto(site + "/t/dignited-com/dignited-2019-export-a-wikipedia-page-as-a-pdf/", { waitUntil: "networkidle" });
  await shot(`site-proof`, p, ["Real path", "Open Tools and click Download as PDF.", "What Kane did"]);
  await p.evaluate(() => { const d = document.querySelector("details.runs"); d.open = true; document.querySelectorAll(".run")[0].scrollIntoView(); scrollBy(0, -20); });
  await shot(`site-proof-run`, p, ["Literal", "Clicked, per the evidence pack", "failed"]);
  await p.evaluate(() => { document.querySelector(".run .shot").scrollIntoView({ block: "center" }); });
  await shot(`site-proof-shot`, p, ["Kane's screenshot at the end of this run"]);
  await p.goto(site + "/t/driftwood/quickstart/", { waitUntil: "networkidle" });
  await shot(`site-driftwood`, p, ["Real path", "Open Developers"]);
  await p.goto(site + "/how-it-works/", { waitUntil: "networkidle" });
  await shot(`site-how`, p, ["Literal", "Goal", "Rewrite", "Prove"]);
  await c.close();
}

// ── GitHub + npm ──
{
  const c = await ctx("dark"); const p = await c.newPage();
  await p.goto("https://github.com/darkfallX/Errata", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
  await shot("github", p, ["Errata", "packages"]);
  await p.goto("https://www.npmjs.com/package/errata-cli", { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3500);
  await shot("npm", p, ["errata-cli", "npx errata-cli demo"]);
  await c.close();
}

// ── Driftwood v2, the demo app ──
{
  const server = spawn(process.execPath, ["../packages/cli/demo/driftwood/server.mjs", "--version", "2", "--port", "4199"], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 1200));
  const c = await ctx(); const p = await c.newPage();
  await p.goto("http://localhost:4199/settings");
  await shot("driftwood-settings", p, ["General", "Appearance", "Settings", "Developers"]);
  await p.goto("http://localhost:4199/developers/tokens");
  await shot("driftwood-tokens", p, ["Tokens", "New token", "Developers"]);
  await p.goto("http://localhost:4199/reports");
  await shot("driftwood-reports", p, ["Exports are being rebuilt", "Reports"]);
  await c.close();
  server.kill();
}

writeFileSync("shots/boxes.json", JSON.stringify(boxes, null, 1));
await browser.close();
console.log("done");
