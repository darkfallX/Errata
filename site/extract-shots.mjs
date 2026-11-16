// Pull Kane's own screenshots out of its sealed evidence packs, for the proof pages.
//   node site/extract-shots.mjs
// For every Kane run behind the demo and behind each flagged public step, takes the last step
// screenshot in the pack and writes site/assets/shots/<pack-id>.jpg. Runs on the machine that
// holds the packs (Kane keeps them locally); the images are committed so the site can show them.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(here, "assets", "shots");
mkdirSync(outDir, { recursive: true });

export const packId = (p) => String(p).split(/[\\/]/).pop().replace(/\.evidence$/, "");
const expand = (p) => String(p).replace(/^~/, homedir());

const reports = [join(here, "data", "demo.json")];
const runs = join(root, "runs");
for (const d of existsSync(runs) ? readdirSync(runs).filter((x) => /^\d{4}-/.test(x)) : []) {
  const dir = join(runs, d, "reports");
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) reports.push(join(dir, f));
}

let wrote = 0, missing = 0;
for (const file of reports) {
  if (!existsSync(file)) continue;
  const r = JSON.parse(readFileSync(file, "utf8"));
  const isDemo = file.endsWith("demo.json");
  for (const s of r.steps) {
    if (!isDemo && !["drifted", "broken"].includes(s.status)) continue;
    for (const k of [s.literal, s.goal_pass, ...(s.attempts ?? []).map((a) => a.proof)]) {
      if (!k?.evidence) continue;
      const id = packId(k.evidence);
      const dest = join(outDir, `${id}.jpg`);
      if (existsSync(dest)) continue;
      const pack = expand(k.evidence);
      if (!existsSync(pack)) { missing++; continue; }
      let shots;
      try {
        shots = unzipSync(readFileSync(pack), { filter: (f) => /\/steps\/[^/]+\/screenshot\.jpe?g$/.test(f.name.replace(/\\/g, "/")) });
      } catch { missing++; continue; }
      // last step by ordinal (folder names look like "12-0-12")
      const last = Object.keys(shots).sort((a, b) => parseInt(a.split(/[\\/]/).at(-2)) - parseInt(b.split(/[\\/]/).at(-2))).at(-1);
      if (!last) { missing++; continue; }
      writeFileSync(dest, shots[last]);
      wrote++;
    }
  }
}
console.log(`screenshots: ${wrote} written, ${missing} packs not on this machine → ${outDir}`);
