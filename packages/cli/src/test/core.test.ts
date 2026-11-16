import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { guardRewrite, RulesAgent, splitPath } from "../agent.js";
import { labelsMatch, literalObjective, goalObjective } from "../objectives.js";
import { chainsOf, checkTutorial } from "../engine.js";
import { clicksFromPack, nameFromSelector, pathOf, trimExploration } from "../evidence.js";
import { ReplayKane, runKey, type KaneRunner, type KaneRunOptions } from "../kane.js";
import { applyFixes, toTestMd } from "../report.js";
import type { KaneResult, Tutorial } from "../types.js";

const here = fileURLToPath(new URL(".", import.meta.url));

test("splitPath handles arrows, chevrons and quotes", () => {
  assert.deepEqual(splitPath("Developers → Tokens → New token"), ["Developers", "Tokens", "New token"]);
  assert.deepEqual(splitPath("'Settings' > 'API Keys'"), ["Settings", "API Keys"]);
});

test("labelsMatch: doc labels must appear in order in what Kane clicked", () => {
  assert.equal(labelsMatch(["Settings", "API Keys"], ["Projects", "Settings", "API Keys", "Create key"]), true, "look-around clicks allowed");
  assert.equal(labelsMatch(["Settings", "API Keys"], "Developers → Tokens"), false);
  assert.equal(labelsMatch(["API Keys", "Settings"], ["Settings", "API Keys"]), false, "order matters");
  assert.equal(labelsMatch(["Settings"], []), false, "no clicks = not followed");
});

test("guardRewrite rejects labels Kane never saw", () => {
  assert.deepEqual(guardRewrite({ text: "", labels: ["Developers", "Tokens"] }, "Developers → Tokens → New token"), []);
  assert.deepEqual(guardRewrite({ text: "", labels: ["Developers", "API Tokens"] }, "Developers → Tokens"), ["API Tokens"]);
  assert.deepEqual(guardRewrite({ text: "", labels: ["Create a new API token"] }, "Developers → Tokens", "Create a new API token"), []);
});

test("literal objective is an ordered list of single clicks, no global fail rule, no setup, no self-reported path", () => {
  const o = literalObjective({ text: "Click Settings → API Keys", labels: ["Settings", "API Keys"] });
  assert.match(o, /1\. Click the element whose visible label is exactly 'Settings'\.\n2\. Click the element whose visible label is exactly 'API Keys'\./);
  assert.doesNotMatch(o, /if any of those labels/i);
  assert.doesNotMatch(o, /clicked_path/);
  assert.doesNotMatch(o, /setup/i);
});

test("goal objective states the goal, the old words as a hint, and keeps CSV capitalised", () => {
  const o = goalObjective({ n: 1, quote: "", text: "Open Billing", goal: "CSV export is ready", labels: ["Billing"], checkable: true });
  assert.match(o, /^Goal: CSV export is ready\./);
  assert.match(o, /old tutorial said "Open Billing"/);
  assert.match(o, /'landed_on'/);
});

test("evidence: reads real clicks from a sealed Kane pack (zip)", () => {
  const clicks = clicksFromPack(join(here, "..", "..", "test-fixtures", "goal-billing.evidence"));
  assert.deepEqual(clicks.map((c) => c.label), ["Team", "Invite member", "Settings", "Account", "Billing history"]);
  assert.equal(clicks[0].y, 16);
});

test("evidence: selector names, and trimming of look-around clicks", () => {
  assert.equal(nameFromSelector('internal:role=link[name="Billing history"i]'), "Billing history");
  assert.equal(nameFromSelector('internal:text="Account"i'), "Account");
  const path = trimExploration([
    { label: "Settings", y: 16 },
    { label: "Developers", y: 16 },
    { label: "Tokens", y: 140 },
    { label: "Tokens", y: 140 },
    { label: "New token", y: 210 },
  ]);
  assert.equal(pathOf(path), "Developers → Tokens → New token");
});

test("chains: continuing steps wait for the previous step; independent ones run on their own", () => {
  const s = (n: number, continues = false, checkable = true) => ({ n, quote: "", text: "", goal: "", labels: [], checkable, continues });
  const chains = chainsOf([s(1), s(2, true), s(3, false, false), s(4), s(5, true)]);
  assert.deepEqual(chains.map((c) => c.map((x) => x.n)), [[1, 2, 3], [4, 5]]);
});

const DOC = `# Quickstart
<!-- errata:start {{app}} -->
1. Click **Settings** → **API Keys** and press **Create key**. <!-- goal: A key form is visible -->
2. Copy the key into your \`.env\` file as \`KEY\`.
3. Open **Team**.
4. Then click **Invite member**.
`;

test("rules agent extracts steps, labels, goals; marks shell/file steps; spots continuing steps", async () => {
  const t = await new RulesAgent().extract({ title: "", source: "x.md", markdown: DOC, start_url: "http://app" });
  assert.equal(t.title, "Quickstart");
  assert.equal(t.steps.length, 4);
  assert.deepEqual(t.steps[0].labels, ["Settings", "API Keys", "Create key"]);
  assert.equal(t.steps[0].goal, "A key form is visible");
  assert.equal(t.steps[1].checkable, false);
  assert.deepEqual(t.steps[1].labels, [], "code spans are not UI labels");
  assert.equal(t.steps[2].continues, false);
  assert.equal(t.steps[3].continues, true);
});

test("rules agent rewrite only uses Kane's labels and keeps the doc's verb", async () => {
  const a = new RulesAgent();
  const step = { n: 1, quote: "Click **Settings** → **API Keys** and press **Create key**.", text: "", goal: "", labels: [], checkable: true };
  const out = await a.rewrite({ step, actual_path: "Developers → Tokens → New token", failures: [] });
  assert.equal(out.text, "Open **Developers** → **Tokens** and press **New token**.");
  assert.deepEqual(guardRewrite(out, "Developers → Tokens → New token"), []);
});

/** A fake Kane that answers by matching the objective: proves the loop wiring without a browser. */
class FakeKane implements KaneRunner {
  readonly kind = "live" as const;
  calls: KaneRunOptions[] = [];
  constructor(private answer: (o: KaneRunOptions) => Partial<KaneResult>) {}
  async run(o: KaneRunOptions): Promise<KaneResult> {
    this.calls.push(o);
    const a = this.answer(o);
    // By default Kane "clicks" exactly what the objective names.
    const named = [...o.objective.matchAll(/exactly '([^']+)'/g)].map((m) => ({ label: m[1] }));
    return { status: "passed", exit_code: 0, final_state: {}, trail: [], clicks: named, objective: o.objective, mode: o.mode, source: "live", credits: 10, ...a } as KaneResult;
  }
}

const tut = (): Tutorial => ({
  title: "T",
  source: "t.md",
  start_url: "http://app",
  steps: [
    { n: 1, quote: "Open **Projects**.", text: "Open Projects.", goal: "Projects list visible", labels: ["Projects"], checkable: true },
    { n: 2, quote: "Click **Settings** → **API Keys** and press **Create key**.", text: "Click Settings → API Keys and press Create key.", goal: "Key form visible", labels: ["Settings", "API Keys", "Create key"], checkable: true },
    { n: 3, quote: "Run `npm i`.", text: "Run npm i.", goal: "", labels: [], checkable: false, skip_reason: "Shell." },
    { n: 4, quote: "Click **Export CSV**.", text: "Click Export CSV.", goal: "CSV ready", labels: ["Export CSV"], checkable: true },
  ],
});

test("engine: accurate, drifted→rewritten→proven (trimmed path first), skipped, broken", async () => {
  const kane = new FakeKane((o) => {
    if (o.mode === "action" && o.objective.includes("'API Keys'")) return { status: "failed", exit_code: 1, reason: "No API Keys", clicks: [{ label: "Settings" }] };
    if (o.mode === "testing" && o.objective.includes("Goal: key form"))
      return { clicks: [{ label: "Settings", y: 16 }, { label: "Developers", y: 16 }, { label: "Tokens", y: 140 }, { label: "New token", y: 200 }], final_state: { landed_on: "Create a token" } };
    if (o.mode === "action" && o.objective.includes("'Export CSV'")) return { status: "failed", exit_code: 1, clicks: [] };
    if (o.mode === "testing" && o.objective.includes("Goal: CSV ready")) return { status: "failed", exit_code: 1, one_liner: "Exports are gone", clicks: [{ label: "Reports" }] };
    return {};
  });
  const r = await checkTutorial(tut(), { kane, agent: new RulesAgent(), parallel: 2 });
  assert.deepEqual(r.steps.map((s) => s.status), ["accurate", "drifted", "skipped", "broken"]);
  assert.equal(r.steps[1].actual_path, "Settings → Developers → Tokens → New token");
  assert.equal(r.steps[1].trimmed_path, "Developers → Tokens → New token");
  assert.equal(r.steps[1].rewrite, "Open **Developers** → **Tokens** and press **New token**.");
  assert.equal(r.steps[1].attempts?.length, 1);
  assert.equal(r.totals.fixed, 1);
  assert.equal(r.totals.credits, 10 + 30 + 20);
  assert.ok(kane.calls.every((c) => c.url === "http://app"), "independent steps start at the tutorial start");
});

test("engine: a continuing step starts where the previous step really ended", async () => {
  const kane = new FakeKane((o) => (o.objective.includes("'Projects'") ? { end_url: "http://app/projects" } : {}));
  const t = tut();
  t.steps = [t.steps[0], { n: 2, quote: "", text: "Then click New project.", goal: "Form", labels: ["New project"], checkable: true, continues: true }];
  await checkTutorial(t, { kane, agent: new RulesAgent() });
  assert.equal(kane.calls[1].url, "http://app/projects");
});

test("engine: a lenient pass (Kane improvised) is caught from the evidence clicks", async () => {
  const kane = new FakeKane((o) => {
    if (o.mode === "action" && o.objective.includes("'API Keys'")) return { clicks: [{ label: "Developers" }, { label: "Tokens" }, { label: "New token" }] };
    if (o.mode === "testing") return { clicks: [{ label: "Developers" }, { label: "Tokens" }, { label: "New token" }] };
    return {};
  });
  const t = tut();
  t.steps = [t.steps[1]];
  const r = await checkTutorial(t, { kane, agent: new RulesAgent() });
  assert.equal(r.steps[0].status, "drifted");
  assert.match(r.steps[0].note, /improvised/);
});

test("engine: rewrite that fails proof 3 times needs a human", async () => {
  const kane = new FakeKane((o) => {
    if (o.mode === "testing") return { clicks: [{ label: "Developers" }, { label: "Tokens" }] };
    return { status: "failed", exit_code: 1, reason: "nope", clicks: [] };
  });
  const t = tut();
  t.steps = [t.steps[1]];
  const r = await checkTutorial(t, { kane, agent: new RulesAgent(), maxLoops: 3 });
  assert.equal(r.steps[0].status, "drifted");
  assert.equal(r.steps[0].rewrite, undefined);
  assert.equal(r.steps[0].attempts?.length, 3);
  assert.equal(r.totals.fixed, 0);
});

test("engine: Kane errors are 'unchecked', never a docs finding", async () => {
  const kane = new FakeKane(() => ({ status: "error", exit_code: 2, reason: "auth" }));
  const t = tut();
  t.steps = [t.steps[0]];
  const r = await checkTutorial(t, { kane, agent: new RulesAgent() });
  assert.equal(r.steps[0].status, "unchecked");
  assert.equal(r.totals.broken, 0);
});

test("engine: a Kane infrastructure failure (browser crash) is retried once, then 'unchecked' — never drift", async () => {
  let calls = 0;
  const crash = { status: "failed", exit_code: 1, reason_code: "infra_error.screenshot_failed", verdict: { family: "environment_issue" }, reason: "Screenshot failed: Target crashed", clicks: [] } as Partial<KaneResult>;
  const flaky = new FakeKane(() => (++calls === 1 ? crash : {}));
  const t = tut();
  t.steps = [t.steps[0]];
  const r1 = await checkTutorial(t, { kane: flaky, agent: new RulesAgent() });
  assert.equal(r1.steps[0].status, "accurate", "the retry succeeded");
  assert.equal(r1.steps[0].literal?.retried, true);
  const dead = new FakeKane(() => crash);
  const r2 = await checkTutorial(t, { kane: dead, agent: new RulesAgent() });
  assert.equal(r2.steps[0].status, "unchecked");
  assert.equal(r2.totals.broken + r2.totals.drifted, 0);
});

test("replay plays back a recording (with its clicks) and never invents one", async () => {
  const dir = mkdtempSync(join(tmpdir(), "errata-"));
  const opts: KaneRunOptions = { objective: "Click 'X'", mode: "action", url: "http://localhost:4177", normalise: { "http://localhost:4177": "{{app}}" } };
  const ndjson = ['{"step":2,"status":"done","remark":"click: X"}', '{"type":"run_end","status":"passed","credits_consumed":12.34,"final_state":{"url":"http://localhost:4177/x"}}'].join("\n");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${runKey(opts)}.json`), JSON.stringify({ exit_code: 0, ndjson, clicks: [{ label: "X" }], recorded_at: "2026-11-16T00:00:00Z" }));
  const k = new ReplayKane([dir]);
  const hit = await k.run(opts);
  assert.equal(hit.status, "passed");
  assert.equal(hit.credits, 12.3);
  assert.deepEqual(hit.trail, ["click: X"]);
  assert.deepEqual(hit.clicks, [{ label: "X" }], "recorded clicks travel with the replay");
  assert.equal(hit.end_url, "http://localhost:4177/x");
  assert.equal(hit.source, "replay");
  const moved = await k.run({ ...opts, url: "http://localhost:5000", normalise: { "http://localhost:5000": "{{app}}" } });
  assert.equal(moved.status, "passed", "a different port maps to the same recording");
  const miss = await k.run({ ...opts, objective: "something else" });
  assert.equal(miss.status, "error");
});

test("applyFixes applies only proven rewrites; test.md keeps proven steps", () => {
  const report: any = {
    tutorial: "T",
    start_url: "http://app",
    steps: [
      { n: 1, status: "drifted", quote: "Click **A**.", rewrite: "Click **B**.", text: "Click A.", goal: "B shown" },
      { n: 2, status: "drifted", quote: "Click **C**.", text: "Click C.", goal: "C shown" },
      { n: 3, status: "accurate", quote: "Open **D**.", text: "Open D.", goal: "D shown" },
    ],
  };
  const { text, applied } = applyFixes("1. Click **A**.\n2. Click **C**.\n3. Open **D**.", report);
  assert.equal(applied, 1);
  assert.equal(text, "1. Click **B**.\n2. Click **C**.\n3. Open **D**.");
  const md = toTestMd(report);
  // Kane's format: # title, ## step name, instruction underneath, plain-English "Verify" line.
  assert.match(md, /^---\nmode: action\n/);
  assert.match(md, /\n# T\n/);
  assert.match(md, /## Step 1: Click B\n\nClick B\.\nVerify that b shown\./);
  assert.match(md, /## Step 3: Open D\n\nGo to http:\/\/app\.\nOpen D\./, "independent steps start from the tutorial start, as Errata checked them");
  assert.doesNotMatch(md, /Click C/);
});

test("evidence: one element, three names (real GitHub activity filter); any name matches, label is what a reader sees", async () => {
  const { clickFromAction } = await import("../evidence.js");
  const c = clickFromAction({
    type: "click",
    status: "success",
    selector: 'internal:role=button[name="Filter by activity type: All"i]',
    intent: "PRIMARY: Click the element whose visible label is exactly 'All activity'.; role=button; text=\"Filter by activity type: All activity\" | HINTS: container=Activity filter bar",
    instr: "Clicking All activity button",
  })!;
  assert.equal(c.label, "All activity");
  assert.ok(c.names?.includes("Filter by activity type: All"));
  assert.equal(labelsMatch(["All activity"], [[c.label, ...(c.names ?? [])]]), true);
});
