// Render the film frame by frame (30 fps) and encode it, or grab review stills.
//   node render.mjs --stills 5,30,120     → out/still-<t>.jpg
//   node render.mjs [--from 0 --to 272]   → out/video.mp4 (no audio; mix.sh adds it)
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FF = readFileSync("ffenv.sh", "utf8").match(/'(.+)'/)[1].replace(/^\/c\//, "C:/");
const TL = JSON.parse(readFileSync("timeline.json", "utf8"));
const BOXES = JSON.parse(readFileSync("img/boxes.json", "utf8"));
mkdirSync("out", { recursive: true });

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("console", (m) => m.type() === "warning" && console.log("page:", m.text()));
await page.addInitScript(([tl, bx]) => { window.TL = tl; window.BOXES = bx; }, [TL, BOXES]);
await page.goto(pathToFileURL(resolve("film.html")).href);
await page.waitForFunction(() => window.ready === true);
await page.evaluate(() => document.fonts.ready);
// warm every image so no frame catches one mid-decode
await page.evaluate(async () => { await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });

const stills = arg("stills");
if (stills) {
  for (const s of stills.split(",").map(Number)) {
    await page.evaluate((t) => window.render(t), s);
    await page.waitForTimeout(60);
    await page.screenshot({ path: `out/still-${String(s).padStart(6, "0")}.jpg`, type: "jpeg", quality: 85 });
  }
  await browser.close();
  console.log("stills done");
  process.exit(0);
}

const fps = TL.fps, from = Number(arg("from", 0)), to = Number(arg("to", TL.total));
const n = Math.round((to - from) * fps);
const enc = spawn(`${FF}/ffmpeg`, ["-y", "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", arg("out", "out/video.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const t = from + i / fps;
  await page.evaluate((t) => window.render(t), t);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once("drain", r));
  if (i % 300 === 0) console.log(`frame ${i}/${n} (${(t).toFixed(1)}s) · ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
}
enc.stdin.end();
await new Promise((r) => enc.on("close", r));
await browser.close();
console.log(`video done: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
