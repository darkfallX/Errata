// The closed loop, per step:
//   Literal (strict) ──pass, and the evidence shows the doc's labels──▶ accurate
//        │ fail (or Kane improvised)
//        ▼
//   Goal (lenient) ──fail──▶ broken
//        │ pass: the clicks in Kane's evidence pack = the real path
//        ▼
//   Agent rewrites from that path ─▶ honesty guard ─▶ Literal proof on the rewrite
//        ▲                                                    │ fail (≤ 3 loops)
//        └──────── Kane's failure reason fed back; loop 1 tries the trimmed path, later loops the full one
//
// Scheduling: a step starts where a reader would be. Steps that continue on the previous page wait for
// the previous step's real end URL; independent steps start at the tutorial's start URL and run in parallel.
import { guardRewrite, type Agent } from "./agent.js";
import { namesOf, pathOf, trimExploration } from "./evidence.js";
import { goalObjective, labelsMatch, literalObjective } from "./objectives.js";
import { isInfraFailure, type KaneRunner, type KaneRunOptions } from "./kane.js";
import type { Attempt, KaneResult, Step, StepReport, Tutorial, TutorialReport } from "./types.js";

export type EngineEvent =
  | { type: "tutorial"; tutorial: Tutorial }
  | { type: "step"; step: Step }
  | { type: "phase"; step: Step; phase: "literal" | "goal" | "rewrite" | "proof"; loop?: number }
  | { type: "progress"; step: Step; remark: string }
  | { type: "result"; step: Step; phase: "literal" | "goal" | "proof"; result: KaneResult }
  | { type: "rewrite"; step: Step; text: string; loop: number; rejected?: string[] }
  | { type: "done"; report: StepReport };

export interface EngineOptions {
  kane: KaneRunner;
  agent: Agent;
  maxLoops?: number;
  timeout?: number;
  maxSteps?: number;
  normalise?: Record<string, string>;
  headless?: boolean;
  /** Independent chains of steps checked at once. Default 3. */
  parallel?: number;
  onEvent?: (e: EngineEvent) => void;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const cred = (...rs: (KaneResult | undefined)[]) => Math.round(rs.reduce((a, r) => a + (r?.credits ?? 0), 0) * 10) / 10;
const heading = (r?: KaneResult) => str(r?.final_state.landed_on) ?? str(Object.entries(r?.final_state ?? {}).find(([k]) => /heading|landed|title/i.test(k))?.[1]);

/** Group steps into chains: a step that `continues` joins the chain of the checkable step before it. */
export function chainsOf(steps: Step[]): Step[][] {
  const chains: Step[][] = [];
  let current: Step[] | undefined;
  for (const s of steps) {
    if (s.checkable && (!s.continues || !current)) {
      current = [s];
      chains.push(current);
    } else if (current) current.push(s);
    else {
      current = [s];
      chains.push(current);
    }
  }
  return chains;
}

export async function checkTutorial(tutorial: Tutorial, opts: EngineOptions): Promise<TutorialReport> {
  const emit = opts.onEvent ?? (() => {});
  const maxLoops = opts.maxLoops ?? 3;
  const started = Date.now();
  emit({ type: "tutorial", tutorial });

  const once = (step: Step, url: string, base: Pick<KaneRunOptions, "objective" | "mode" | "bugDetection">) =>
    opts.kane.run({
      ...base,
      url: url || undefined,
      timeout: opts.timeout ?? 240,
      maxSteps: opts.maxSteps ?? 30,
      headless: opts.headless,
      normalise: opts.normalise,
      onProgress: (remark) => emit({ type: "progress", step, remark }),
    });
  /** One Kane run; retried once if Kane reports an infrastructure failure (crash, network), which is never a docs finding. */
  const run = async (step: Step, url: string, base: Pick<KaneRunOptions, "objective" | "mode" | "bugDetection">): Promise<KaneResult> => {
    const first = await once(step, url, base);
    if (!isInfraFailure(first) || opts.kane.kind === "replay") return first;
    emit({ type: "progress", step, remark: `Kane hit an infrastructure error (${first.reason_code ?? first.status}); retrying once` });
    const second = await once(step, url, base);
    const r = { ...second, retried: true, credits: (second.credits ?? 0) + (first.credits ?? 0) };
    // Still infrastructure after a retry: report it as an error so the step is "unchecked", not drift.
    return isInfraFailure(second) && second.status === "failed" ? { ...r, status: "error" } : r;
  };

  /** Check one step starting at `url`. Returns the report and where a reader would now be. */
  const checkStep = async (step: Step, url: string): Promise<{ report: StepReport; end: string }> => {
    const done = (r: StepReport, end = url) => {
      const report = { ...r, started_at: url };
      emit({ type: "done", report });
      return { report, end };
    };
    emit({ type: "step", step });
    if (!step.checkable) return done({ ...step, status: "skipped", note: step.skip_reason ?? "Not checkable in a browser.", credits: 0 });

    // 1. Literal pass
    emit({ type: "phase", step, phase: "literal" });
    const literal = await run(step, url, { objective: literalObjective(step), mode: "action" });
    emit({ type: "result", step, phase: "literal", result: literal });

    if (literal.status === "error" || literal.status === "timeout")
      return done({ ...step, status: "unchecked", literal, note: `Kane could not run this step (${literal.status}): ${literal.reason ?? "no reason given"}. Not counted as a docs finding.`, credits: cred(literal) });

    const followed = labelsMatch(step.labels, literal.clicks.map(namesOf));
    const lenient = literal.status === "passed" && !followed && literal.clicks.length > 0;
    if (literal.status === "passed" && !lenient)
      return done({ ...step, status: "accurate", literal, landed_on: heading(literal), note: "Kane followed the doc's exact words and reached the goal.", credits: cred(literal) }, literal.end_url ?? url);

    // 2. Goal pass
    emit({ type: "phase", step, phase: "goal" });
    const goal = await run(step, url, { objective: goalObjective(step), mode: "testing", bugDetection: "continue" });
    emit({ type: "result", step, phase: "goal", result: goal });
    const full = goal.clicks;
    const trimmed = trimExploration(full);
    const actual_path = full.length ? pathOf(full) : undefined;
    const trimmed_path = trimmed.length ? pathOf(trimmed) : undefined;
    const landed_on = heading(goal);
    const end = goal.end_url ?? url;

    if (goal.status !== "passed") {
      const failed = goal.status === "failed";
      return done({
        ...step,
        status: failed ? "broken" : "unchecked",
        literal,
        goal_pass: goal,
        actual_path,
        landed_on,
        note: failed ? `The goal can't be reached by any route Kane could find.` : `Kane could not finish the goal pass (${goal.status}). Not counted as a docs finding.`,
        credits: cred(literal, goal),
      });
    }

    // The literal failure was a flake if the route Kane found IS the doc's route.
    if (!lenient && labelsMatch(step.labels, trimmed.map(namesOf)))
      return done({ ...step, status: "accurate", literal, goal_pass: goal, actual_path, landed_on, note: "The literal pass failed once, but the route Kane found is the doc's own route. Treated as a flaky run, not drift.", credits: cred(literal, goal) }, end);

    if (!actual_path)
      return done({ ...step, status: "drifted", literal, goal_pass: goal, landed_on, note: "The goal is reachable, but Kane's evidence shows no clicks to rewrite from. Needs a human.", credits: cred(literal, goal) }, end);

    // 3. Rewrite → prove. Loop 1 tries the trimmed path; later loops the full path Kane took.
    const attempts: Attempt[] = [];
    const failures: string[] = [];
    let proven: Attempt | undefined;
    for (let loop = 1; loop <= maxLoops && !proven; loop++) {
      const path = loop === 1 && trimmed_path ? trimmed_path : actual_path;
      emit({ type: "phase", step, phase: "rewrite", loop });
      let out;
      try {
        out = await opts.agent.rewrite({ step, actual_path: path, landed_on, failures });
      } catch (e: any) {
        failures.push(`Agent error: ${e?.message ?? e}`);
        continue;
      }
      const bad = guardRewrite(out, actual_path, landed_on, full.flatMap((c) => c.names ?? []));
      emit({ type: "rewrite", step, text: out.text, loop, rejected: bad.length ? bad : undefined });
      if (bad.length) {
        failures.push(`Rejected before Kane: used labels Kane never saw (${bad.join(", ")}).`);
        continue;
      }
      emit({ type: "phase", step, phase: "proof", loop });
      const proof = await run(step, url, { objective: literalObjective({ text: out.text.replace(/\*\*/g, ""), labels: out.labels }), mode: "action" });
      emit({ type: "result", step, phase: "proof", result: proof });
      const attempt: Attempt = { loop, rewrite: out.text, labels: out.labels, proof };
      attempts.push(attempt);
      const ok = proof.status === "passed" && (proof.clicks.length === 0 || labelsMatch(out.labels, proof.clicks.map(namesOf)));
      if (ok) proven = attempt;
      else failures.push(`"${out.text}" → ${proof.status}: ${proof.one_liner ?? proof.reason ?? "no reason given"}`);
    }

    return done(
      {
        ...step,
        status: "drifted",
        literal,
        goal_pass: goal,
        actual_path,
        trimmed_path: trimmed_path !== actual_path ? trimmed_path : undefined,
        landed_on,
        rewrite: proven?.rewrite,
        attempts,
        note: proven
          ? `The doc's words no longer work${lenient ? " (Kane improvised past them; Errata caught it from the clicks in the evidence pack)" : ""}. Kane found the real path; the rewrite passed a literal run in loop ${proven.loop}.`
          : `The doc's words no longer work and no rewrite passed a literal run in ${maxLoops} loops. Needs a human; evidence attached.`,
        credits: cred(literal, goal, ...attempts.map((a) => a.proof)),
      },
      proven?.proof.end_url ?? end,
    );
  };

  const chains = chainsOf(tutorial.steps);
  const results = new Map<number, StepReport>();
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(opts.parallel ?? 3, chains.length)) }, async () => {
    while (next < chains.length) {
      const chain = chains[next++];
      let url = tutorial.start_url;
      for (const step of chain) {
        const { report, end } = await checkStep(step, step.continues ? url : tutorial.start_url);
        results.set(step.n, report);
        if (step.checkable) url = end;
      }
    }
  });
  await Promise.all(workers);
  const reports = tutorial.steps.map((s) => results.get(s.n)!);

  const t = (s: StepReport["status"]) => reports.filter((r) => r.status === s).length;
  return {
    errata: "1",
    tutorial: tutorial.title,
    source: tutorial.source,
    start_url: tutorial.start_url,
    checked_at: new Date().toISOString(),
    agent: opts.agent.name,
    kane: opts.kane.kind,
    steps: reports,
    totals: {
      steps: reports.length,
      checkable: reports.filter((r) => r.checkable).length,
      accurate: t("accurate"),
      drifted: t("drifted"),
      fixed: reports.filter((r) => r.status === "drifted" && r.rewrite).length,
      broken: t("broken"),
      skipped: t("skipped"),
      unchecked: t("unchecked"),
      credits: Math.round(reports.reduce((a, r) => a + r.credits, 0) * 10) / 10,
      seconds: Math.round((Date.now() - started) / 1000),
    },
  };
}
