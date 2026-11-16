// Live progress of a public run: how many tutorials are done, what they found, and a rough ETA.
//   node corpus/status.mjs            one snapshot
//   node corpus/status.mjs --watch    refresh every 15 s until every tutorial has a report
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const runs = join(here, "..", "runs");
const date = readdirSync(runs).filter((d) => /^\d{4}-/.test(d)).sort().at(-1);
const dir = join(runs, date);
const titles = readdirSync(join(here, "tutorials")).filter((f) => f.endsWith(".tutorial.json")).map((f) => JSON.parse(readFileSync(join(here, "tutorials", f), "utf8")).title);
const c = (n, s) => (process.stdout.isTTY ? `\x1b[${n}m${s}\x1b[0m` : s);

function snapshot() {
  const repDir = join(dir, "reports");
  const reports = existsSync(repDir) ? readdirSync(repDir).filter((f) => f.endsWith(".json")).map((f) => ({ f, r: JSON.parse(readFileSync(join(repDir, f), "utf8")), t: statSync(join(repDir, f)).mtimeMs })) : [];
  const done = new Set(reports.map((x) => x.r.tutorial));
  const recDir = join(dir, "recordings");
  const recs = existsSync(recDir) ? readdirSync(recDir).map((f) => statSync(join(recDir, f)).mtimeMs) : [];
  const start = Math.min(...recs, Date.now());
  const elapsed = (Date.now() - start) / 60000;
  const perTut = done.size ? elapsed / done.size : 0;
  const left = titles.length - done.size;
  const tot = reports.reduce((a, { r }) => ({ acc: a.acc + r.totals.accurate, dr: a.dr + r.totals.drifted, br: a.br + r.totals.broken, un: a.un + r.totals.unchecked, cr: a.cr + r.totals.credits }), { acc: 0, dr: 0, br: 0, un: 0, cr: 0 });

  const lines = [];
  lines.push(c(1, `Errata public run · ${date}`));
  const bar = 30, fill = Math.round((done.size / titles.length) * bar);
  lines.push(`[${"█".repeat(fill)}${"░".repeat(bar - fill)}] ${done.size}/${titles.length} tutorials · ${recs.length} Kane runs · ${Math.round(tot.cr)} credits · ${Math.round(elapsed)} min so far`);
  lines.push(
    left === 0
      ? c(32, "DONE. Every tutorial has a report. You can send your next message.")
      : `About ${Math.max(1, Math.round(perTut * left))} min left (rough estimate from the pace so far). Kane runs take 1–4 min each.`,
  );
  lines.push(`${c(32, `${tot.acc} accurate`)} · ${c(33, `${tot.dr} drifted`)} · ${c(31, `${tot.br} broken`)} · ${tot.un} unchecked (Kane errors, not findings)`);
  lines.push("");
  for (const t of titles) {
    const x = reports.find((y) => y.r.tutorial === t);
    if (!x) { lines.push(`  ${c(2, "…  " + t)}`); continue; }
    const T = x.r.totals;
    const mark = T.broken ? c(31, "●") : T.drifted ? c(33, "●") : T.unchecked ? c(2, "○") : c(32, "●");
    lines.push(`  ${mark}  ${t}  ${c(2, `${T.accurate}/${T.checkable} ok${T.drifted ? ` · ${T.drifted} drifted` : ""}${T.broken ? ` · ${T.broken} broken` : ""}${T.unchecked ? ` · ${T.unchecked} unchecked` : ""}`)}`);
  }
  return { text: lines.join("\n"), left };
}

if (process.argv.includes("--watch")) {
  const tick = () => {
    const { text, left } = snapshot();
    process.stdout.write("\x1b[2J\x1b[H" + text + "\n\n" + c(2, `updated ${new Date().toLocaleTimeString()} · Ctrl+C to stop watching (the run keeps going)`) + "\n");
    if (left === 0) process.exit(0);
  };
  tick();
  setInterval(tick, 15000);
} else console.log(snapshot().text);
