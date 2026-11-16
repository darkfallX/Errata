// Outputs: report.json (the record), report.md (for PR comments), patch.diff (the fix), _test.md (replayable test).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { createTwoFilesPatch } from "diff";
import type { StepReport, TutorialReport } from "./types.js";
import { fetchText, isUrl } from "./fetch.js";
import { redact } from "./privacy.js";

export function slug(s: string): string {
  return s.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "tutorial";
}

const ICON: Record<StepReport["status"], string> = { accurate: "🟢", drifted: "🟡", broken: "🔴", skipped: "⚪", unchecked: "⚫" };

/** Apply proven rewrites to the source text. Only proven fixes are ever applied. */
export function applyFixes(source: string, report: TutorialReport): { text: string; applied: number; missed: number[] } {
  let text = source;
  let applied = 0;
  const missed: number[] = [];
  for (const s of report.steps) {
    if (s.status !== "drifted" || !s.rewrite) continue;
    if (text.includes(s.quote)) {
      text = text.replace(s.quote, s.rewrite);
      applied++;
    } else missed.push(s.n);
  }
  return { text, applied, missed };
}

export async function buildPatch(report: TutorialReport, sourceFile?: string): Promise<{ patch?: string; target?: string; note?: string }> {
  if (!report.steps.some((s) => s.status === "drifted" && s.rewrite)) return {};
  if (!sourceFile) return { note: "No Markdown source found for this page; see the suggested edits in report.md." };
  const original = isUrl(sourceFile) ? await fetchText(sourceFile) : existsSync(sourceFile) ? readFileSync(sourceFile, "utf8") : undefined;
  if (!original) return { note: `Could not read ${sourceFile}.` };
  const { text, missed } = applyFixes(original, report);
  if (text === original) return { note: "The doc text was rendered from source differently; see suggested edits in report.md." };
  const name = isUrl(sourceFile) ? new URL(sourceFile).pathname.split("/").slice(4).join("/") || basename(sourceFile) : relative(process.cwd(), sourceFile).replace(/\\/g, "/");
  const patch = createTwoFilesPatch(`a/${name}`, `b/${name}`, original, text, "", "", { context: 2 });
  return { patch, target: sourceFile, note: missed.length ? `Steps ${missed.join(", ")} could not be placed in the source automatically.` : undefined };
}

export function toMarkdown(r: TutorialReport): string {
  const t = r.totals;
  const lines = [
    `### Errata · ${r.tutorial}`,
    ``,
    `\`${r.source}\` · checked ${r.checked_at.slice(0, 10)} · Kane ${r.kane === "replay" ? "**replay of recorded runs**" : "live"} · agent: ${r.agent}`,
    ``,
    `| | Step | Result |`,
    `|---|---|---|`,
  ];
  for (const s of r.steps) {
    let res = `${s.status}`;
    if (s.status === "drifted") res = s.rewrite ? `drifted · fixed, proven in ${s.attempts?.length ?? 1} loop(s)` : "drifted · needs a human";
    if (s.status === "skipped") res = `not checkable: ${s.note}`;
    lines.push(`| ${ICON[s.status]} | ${s.n}. ${s.text.replace(/\|/g, "\\|")} | ${res} |`);
  }
  lines.push("", `**${t.accurate} of ${t.checkable} checkable steps accurate** · ${t.drifted} drifted (${t.fixed} fixed and proven) · ${t.broken} broken · ${t.credits} Kane credits`, "");
  const drifted = r.steps.filter((s) => s.status === "drifted" || s.status === "broken");
  if (drifted.length) {
    lines.push("<details><summary>What changed</summary>", "");
    for (const s of drifted) {
      lines.push(`**Step ${s.n}** ${ICON[s.status]}`, "");
      lines.push(`- Docs say: ${s.labels.join(" → ") || s.text}`);
      if (s.actual_path) lines.push(`- Real path (found by Kane): ${s.actual_path}`);
      if (s.rewrite) lines.push(`- Proven rewrite: ${s.rewrite}`);
      lines.push(`- ${s.note}`);
      const links = [s.literal?.test_url && `[literal run](${s.literal.test_url})`, s.goal_pass?.test_url && `[goal run](${s.goal_pass.test_url})`, s.attempts?.at(-1)?.proof.test_url && `[proof run](${s.attempts!.at(-1)!.proof.test_url})`].filter(Boolean);
      if (links.length) lines.push(`- Evidence: ${links.join(" · ")}`);
      lines.push("");
    }
    lines.push("</details>");
  }
  if (r.patch) lines.push("", "```diff", r.patch.trim(), "```");
  return lines.join("\n");
}

/**
 * A Kane test.md of the (fixed) tutorial, to re-run with `kane-cli testmd run` (e.g. in CI).
 * Kane's format: `# title`, then one `## step name` per step; the text under it is the instruction,
 * with the expected result as a plain-English "Verify …" line.
 */
export function toTestMd(r: TutorialReport): string {
  const steps = r.steps.filter((s) => s.status === "accurate" || (s.status === "drifted" && s.rewrite));
  const plainText = (t: string) => t.replace(/\*\*/g, "").replace(/`/g, "").replace(/<!--.*?-->/g, "").trim();
  const body = steps
    .map((s, i) => {
      const words = plainText(s.rewrite ?? s.text);
      const start = i > 0 && !s.continues && r.start_url ? `Go to ${r.start_url}.\n` : "";
      const goal = (/^[A-Z][A-Z]/.test(s.goal) ? s.goal : s.goal.charAt(0).toLowerCase() + s.goal.slice(1)).replace(/\.$/, "");
      const verify = s.goal ? `\nVerify that ${goal}.` : "";
      return `## Step ${s.n}: ${words.replace(/\.$/, "")}\n\n${start}${words}${verify}`;
    })
    .join("\n\n");
  return `---\nmode: action\ntags: [errata, ${slug(r.tutorial)}]\nurl: ${r.start_url}\n---\n\n# ${r.tutorial}\n\n${body}\n`;
}

export function writeOutputs(report: TutorialReport, outDir: string): Record<string, string> {
  const name = slug(report.tutorial || report.source);
  const files: Record<string, string> = {};
  const put = (sub: string, file: string, content: string) => {
    mkdirSync(join(outDir, sub), { recursive: true });
    const p = join(outDir, sub, file);
    writeFileSync(p, redact(content));
    files[sub] = p;
  };
  put("reports", `${name}.json`, JSON.stringify(report, null, 2));
  put("reports-md", `${name}.md`, toMarkdown(report));
  if (report.patch) put("patches", `${name}.diff`, report.patch);
  if (report.steps.some((s) => s.status === "accurate" || s.rewrite)) put("tests", `${name}_test.md`, toTestMd(report));
  return files;
}
