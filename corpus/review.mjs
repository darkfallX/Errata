// List every flag (drifted / broken step) in a public run, with what's needed to review it,
// and keep runs/<date>/review.json in sync (existing verdicts are never overwritten).
//   node corpus/review.mjs [--date 2026-11-16]
// A verdict: { "verdict": "confirmed" | "false_alarm", "why": "one sentence", "reviewer": "name" }
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf("--date");
const runs = join(here, "..", "runs");
const date = i > 0 ? process.argv[i + 1] : readdirSync(runs).filter((d) => /^\d{4}-/.test(d)).sort().at(-1);
const dir = join(runs, date);
const slug = (s) => String(s).toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
const host = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return "local"; } };

const reviewFile = join(dir, "review.json");
const review = existsSync(reviewFile) ? JSON.parse(readFileSync(reviewFile, "utf8")) : {};
let open = 0;
for (const f of readdirSync(join(dir, "reports")).sort()) {
  const r = JSON.parse(readFileSync(join(dir, "reports", f), "utf8"));
  for (const s of r.steps.filter((s) => s.status === "drifted" || s.status === "broken")) {
    const key = `${slug(host(r.source))}/${slug(r.tutorial)}#${s.n}`;
    const v = review[key];
    if (!v?.verdict) open++;
    review[key] = v ?? { verdict: "", why: "", reviewer: "" };
    console.log(`\n${v?.verdict ? `[${v.verdict}]` : "[to review]"} ${key}`);
    console.log(`  doc:        ${s.text}`);
    console.log(`  start:      ${s.started_at ?? r.start_url}`);
    console.log(`  status:     ${s.status}${s.rewrite ? " (fixed and proven)" : ""}`);
    if (s.literal) console.log(`  literal:    ${s.literal.status} · ${s.literal.one_liner ?? s.literal.reason ?? ""}`);
    if (s.goal_pass) console.log(`  goal:       ${s.goal_pass.status} · ${s.goal_pass.one_liner ?? s.goal_pass.reason ?? ""}`);
    if (s.actual_path) console.log(`  kane route: ${s.actual_path}`);
    if (s.rewrite) console.log(`  rewrite:    ${s.rewrite}`);
    for (const k of [s.literal, s.goal_pass, ...(s.attempts ?? []).map((a) => a.proof)]) if (k?.test_url) console.log(`  run:        ${k.test_url}`);
  }
}
writeFileSync(reviewFile, JSON.stringify(review, null, 2) + "\n");
console.log(`\n${Object.keys(review).length} flags · ${open} still to review → ${reviewFile}`);
