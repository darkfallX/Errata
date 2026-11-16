// Terminal output. Calm, aligned, colour carries meaning only (green / amber / red).
// A live board: one row per step, resolving in place as Kane works (steps run in parallel).
import type { EngineEvent } from "./engine.js";
import type { Step, StepReport, Tutorial, TutorialReport } from "./types.js";

const tty = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && !process.env.CI;
const c = (code: string) => (s: string) => (tty || process.env.FORCE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
export const dim = c("2");
export const bold = c("1");
export const green = c("32");
export const amber = c("33");
export const red = c("31");
const strike = c("9");

const cols = () => Math.max(72, Math.min(process.stdout.columns || 100, 120));
const trunc = (s: string, n: number) => (n <= 1 ? "" : s.length > n ? s.slice(0, n - 1) + "…" : s);
const plain = (s: string) => s.replace(/\*\*/g, "").replace(/`/g, "");
const TEXT_W = 44;

export const MARK: Record<StepReport["status"], string> = {
  accurate: green("● accurate"),
  drifted: amber("● drifted"),
  broken: red("● broken"),
  skipped: dim("○ not checkable"),
  unchecked: dim("○ unchecked"),
};

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface Row {
  step: Step;
  state: "waiting" | "running" | "done";
  phase: string;
  remark: string;
  report?: StepReport;
}

export class LiveUI {
  private rows: Row[] = [];
  private timer?: NodeJS.Timeout;
  private frame = 0;
  private drawn = 0;

  handle = (e: EngineEvent) => {
    const row = "step" in e ? this.rows.find((r) => r.step.n === e.step.n) : undefined;
    switch (e.type) {
      case "tutorial":
        this.begin(e.tutorial);
        break;
      case "step":
        if (row) Object.assign(row, { state: "running", phase: "reading", remark: "" });
        break;
      case "phase":
        if (row) {
          row.phase =
            e.phase === "literal" ? "following the words" : e.phase === "goal" ? amber("words failed") + " · finding the real path" : e.phase === "rewrite" ? `rewriting · loop ${e.loop}` : `proving the rewrite · loop ${e.loop}`;
          row.remark = "";
        }
        if (!tty && row) console.log(dim(`  ${row.step.n}  ${plain(row.phase)}`));
        break;
      case "progress":
        if (row) row.remark = e.remark;
        break;
      case "rewrite":
        if (row) row.remark = e.rejected ? `rewrite rejected: labels Kane never saw (${e.rejected.join(", ")})` : `"${plain(e.text)}"`;
        break;
      case "done":
        if (row) Object.assign(row, { state: "done", report: e.report });
        if (!tty) this.printDetail(e.report);
        if (this.rows.every((r) => r.state === "done")) this.finish();
        break;
    }
  };

  private begin(t: Tutorial) {
    console.log();
    console.log(`  ${bold("Errata")} ${dim("·")} ${bold(t.title)}`);
    console.log(dim(`  ${t.source}`));
    console.log(dim(`  start ${t.start_url || "(none)"} · ${t.steps.length} steps`));
    console.log();
    this.rows = t.steps.map((step) => ({ step, state: "waiting", phase: "", remark: "" }));
    if (tty) {
      process.stdout.write("\x1b[?25l");
      this.timer = setInterval(() => this.draw(), 90);
      this.draw();
    }
  }

  private line(r: Row): string {
    const head = `  ${String(r.step.n).padStart(2)}  ${trunc(plain(r.step.text), TEXT_W).padEnd(TEXT_W)}  `;
    if (r.state === "done" && r.report) return head + MARK[r.report.status];
    if (r.state === "waiting") return head + dim("· queued");
    const f = FRAMES[this.frame % FRAMES.length];
    const lead = `${f} ${r.phase}`;
    const room = cols() - head.length - plain(lead).replace(/\x1b\[[0-9;]*m/g, "").length - 4;
    return head + lead + (r.remark ? dim(`  ${trunc(r.remark, room)}`) : "");
  }

  private draw() {
    this.frame++;
    let out = this.drawn ? `\x1b[${this.drawn}A` : "";
    for (const r of this.rows) out += `\r\x1b[2K${this.line(r)}\n`;
    this.drawn = this.rows.length;
    process.stdout.write(out);
  }

  private finish() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (tty) {
      // Replace the board with the final, detailed list.
      process.stdout.write(this.drawn ? `\x1b[${this.drawn}A\x1b[0J` : "");
      process.stdout.write("\x1b[?25h");
      for (const r of this.rows) if (r.report) this.printDetail(r.report);
    }
  }

  printDetail(s: StepReport) {
    console.log(`  ${String(s.n).padStart(2)}  ${trunc(plain(s.text), TEXT_W).padEnd(TEXT_W)}  ${MARK[s.status]}`);
    const pad = "        ";
    if (s.status === "drifted") {
      console.log(`${pad}${dim("docs say  ")} ${strike(s.labels.join(" → "))}`);
      const proven = s.attempts?.find((a) => a.rewrite === s.rewrite);
      const used = proven ? proven.labels.join(" → ") : s.trimmed_path ?? s.actual_path;
      if (used) console.log(`${pad}${dim("real path ")} ${used}  ${dim("found by Kane")}`);
      if (s.actual_path && used !== s.actual_path) console.log(`${pad}${dim("           Kane's full route: " + s.actual_path)}`);
      if (s.rewrite) {
        console.log(`${pad}${dim("rewritten ")} ${plain(s.rewrite)}`);
        const loops = s.attempts?.length ?? 1;
        console.log(`${pad}${dim("re-proven ")} ${green("● literal pass on the rewrite")}  ${dim(`${loops} loop${loops > 1 ? "s" : ""}`)}`);
      } else console.log(`${pad}${red("no rewrite passed a literal run · needs a human")}`);
    } else if (s.status === "broken") {
      console.log(`${pad}${dim("docs say  ")} ${s.labels.join(" → ") || plain(s.text)}`);
      console.log(`${pad}${red("unreachable")} ${trunc(s.goal_pass?.one_liner ?? s.goal_pass?.reason ?? s.note, 84)}`);
    } else if (s.status === "skipped" || s.status === "unchecked") {
      console.log(`${pad}${dim(trunc(s.note, 90))}`);
    }
  }
}

process.on("exit", () => tty && process.stdout.write("\x1b[?25h"));

export function printSummary(r: TutorialReport, files: Record<string, string>) {
  const t = r.totals;
  console.log();
  console.log(
    `  ${bold(`${t.accurate} of ${t.checkable} checkable steps accurate`)} ${dim("·")} ${t.drifted ? amber(`${t.drifted} drifted`) : "0 drifted"}${t.fixed ? `, ${green(`${t.fixed} fixed and proven`)}` : ""} ${dim("·")} ${t.broken ? red(`${t.broken} broken`) : "0 broken"}${t.unchecked ? dim(` · ${t.unchecked} unchecked`) : ""}`,
  );
  console.log(dim(`  ${t.credits} Kane credits${r.kane === "replay" ? " when recorded (none spent now)" : ""} · ${t.seconds}s · agent ${r.agent} · Kane ${r.kane === "replay" ? "replay of recorded real runs" : "live"}`));
  const pack = r.steps.flatMap((s) => [s.literal, s.goal_pass, ...(s.attempts ?? []).map((a) => a.proof)]).find((k) => k?.evidence)?.evidence;
  console.log();
  if (files.reports) console.log(`  ${dim("Report  ")} ${files.reports}`);
  if (files.patches) console.log(`  ${dim("Patch   ")} ${files.patches}`);
  if (files.tests) console.log(`  ${dim("Test    ")} ${files.tests}  ${dim("run it: kane-cli testmd run <file>")}`);
  if (pack && r.kane === "live") console.log(`  ${dim("Evidence")} kane-cli evidence serve "${pack}"`);
  console.log();
}
