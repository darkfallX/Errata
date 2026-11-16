#!/usr/bin/env node
// errata: every doc has errata. Find yours.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { pickAgent } from "./agent.js";
import { checkTutorial } from "./engine.js";
import { loadDoc, isUrl } from "./fetch.js";
import { kaneAvailable, LiveKane, ReplayKane, type KaneRunner } from "./kane.js";
import { applyFixes, buildPatch, slug, toMarkdown, writeOutputs } from "./report.js";
import type { Tutorial, TutorialReport } from "./types.js";
import { LiveUI, printSummary, bold, dim, green, red, amber } from "./ui.js";
import { crawl } from "./crawl.js";

const here = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));

type Flags = Record<string, string | boolean>;
function parse(argv: string[]): { cmd: string; args: string[]; flags: Flags } {
  const [cmd = "help", ...rest] = argv;
  const args: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=", 2);
      if (v !== undefined) flags[k] = v;
      else if (rest[i + 1] && !rest[i + 1].startsWith("--")) flags[k] = rest[++i];
      else flags[k] = true;
    } else args.push(a);
  }
  return { cmd, args, flags };
}

const HELP = `
${bold("errata")} ${dim(`v${PKG.version}`)}  Every doc has errata. Find yours.

Walks your tutorials word for word in a real browser (Kane CLI). When a step no longer
matches the product, Kane finds the real path, the agent rewrites the step, and Kane
proves the rewrite before anyone sees it.

${bold("Usage")}
  errata check <url|file.md|x.tutorial.json>...  Check tutorials
      --app <url>                      Where the app runs (for docs-as-code); fills {{app}}
      --crawl <n>                      With a URL: also check the first n tutorial pages it links to
      --agent <auto|claude|rules>      Who reads and rewrites (default auto: Claude if a key is set)
      --loops <n>                      Max rewrite→prove loops per drifted step (default 3)
      --fail-on <broken|drifted|none>  Exit 1 when found (CI). Default: broken
      --out <dir>                      Output folder (default .errata)
      --replay <dir>                   Play back recorded Kane runs instead of running live
      --parallel <n>                   Steps checked at once (default 3)
      --headed                         Show the browser
  errata fix <report.json>             Apply proven rewrites to the source file
      --pr                             ...on a new branch, and open a pull request (gh)
  errata demo                          Driftwood demo: accurate, drifted, broken (live ~9 min)
      --replay                         Play back the bundled real Kane runs (~20 s, no credits)
  errata doctor                        Check Kane CLI, sign-in, and the agent
  errata skill [--project]             Install the /errata skill for Claude Code

${dim("Docs: https://github.com/errata-sh/errata")}
`;

async function makeKane(flags: Flags, recordDir: string): Promise<KaneRunner> {
  if (typeof flags.replay === "string") return new ReplayKane([resolve(flags.replay)], 60);
  return new LiveKane(recordDir);
}

async function runCheck(sources: string[], flags: Flags, extra: { normalise?: Record<string, string>; kane?: KaneRunner } = {}): Promise<TutorialReport[]> {
  const out = resolve(String(flags.out ?? ".errata"));
  const agent = await pickAgent(typeof flags.agent === "string" ? flags.agent : undefined);
  const kane = extra.kane ?? (await makeKane(flags, join(out, "recordings")));
  if (kane.kind === "live") {
    const k = kaneAvailable();
    if (!k.installed || !k.loggedIn) {
      console.error(red(`\n  Kane CLI: ${k.detail}`));
      console.error(dim(`  Install: npm i -g @testmuai/kane-cli   Sign in: kane-cli login\n`));
      process.exit(2);
    }
  }
  const app = typeof flags.app === "string" ? flags.app : undefined;

  let list = sources;
  if (flags.crawl && sources.length === 1 && isUrl(sources[0])) list = await crawl(sources[0], Number(flags.crawl) || 10);

  const reports: TutorialReport[] = [];
  for (const src of list) {
    let tutorial: Tutorial;
    let sourceFile: string | undefined;
    let editUrl: string | undefined;
    let agentName = agent.name;
    if (/\.tutorial\.json$/i.test(src)) {
      // Steps already extracted by a coding agent (e.g. Claude Code via the /errata skill).
      const t = JSON.parse(readFileSync(src, "utf8")) as Tutorial & { extracted_by?: string; source_file?: string };
      tutorial = { ...t, steps: t.steps.map((s, i) => ({ ...s, n: s.n ?? i + 1 })) };
      if (app) tutorial.start_url = tutorial.start_url.replace("{{app}}", app.replace(/\/$/, ""));
      sourceFile = t.source_file;
      editUrl = t.source_file;
      agentName = `${t.extracted_by ?? "pre-extracted"} · rewrite: ${agent.name}`;
    } else {
      const doc = await loadDoc(src, app);
      tutorial = await agent.extract({ title: doc.title, source: doc.source, markdown: doc.markdown, start_url: doc.start_url });
      sourceFile = doc.sourceFile;
      editUrl = doc.editUrl;
    }
    if (!tutorial.start_url) {
      console.error(amber(`\n  ${src}: no start URL found in the doc. Pass --app <url>.`));
      continue;
    }
    const ui = new LiveUI();
    const report = await checkTutorial(tutorial, {
      kane,
      agent,
      maxLoops: Number(flags.loops ?? 3),
      parallel: Number(flags.parallel ?? 3),
      headless: !flags.headed,
      normalise: extra.normalise,
      onEvent: ui.handle,
    });
    report.agent = agentName;
    report.input = isUrl(src) ? src : relative(process.cwd(), resolve(src)).split("\\").join("/");
    const p = await buildPatch(report, sourceFile);
    if (p.patch) {
      report.patch = p.patch;
      report.patch_target = editUrl ?? p.target;
    }
    const files = writeOutputs(report, out);
    printSummary(report, files);
    if (p.note) console.log(dim(`  ${p.note}\n`));
    reports.push(report);
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, reports.map(toMarkdown).join("\n\n---\n\n"), { flag: "a" });
  }
  return reports;
}

function exitFor(reports: TutorialReport[], failOn: string) {
  const broken = reports.some((r) => r.totals.broken > 0);
  const drifted = reports.some((r) => r.totals.drifted > 0);
  if (failOn === "broken" && broken) process.exit(1);
  if (failOn === "drifted" && (broken || drifted)) process.exit(1);
}

async function demo(flags: Flags) {
  const { startDriftwood } = await import(pathToImport(join(here, "..", "demo", "driftwood", "server.mjs")));
  const port = Number(flags.port ?? 4177);
  const app = await startDriftwood({ version: 2, port });
  const docs = join(here, "..", "demo", "driftwood", "docs", "quickstart.md");
  const recordings = join(here, "..", "demo", "recordings");

  let replay = Boolean(flags.replay);
  if (!replay) {
    const k = kaneAvailable();
    if (!k.loggedIn) {
      console.log(amber(`\n  Kane CLI: ${k.detail}.`));
      console.log(dim(`  Playing back the bundled recordings of real Kane runs instead. Sign in to run it live.\n`));
      replay = true;
    }
  }
  console.log(dim(`\n  Driftwood v2 is running at ${app.url}. Its docs were written for v1.`));
  console.log(dim(`  The v2 redesign moved two menus and removed one feature. Let's see if Errata notices.`));
  const out = resolve(String(flags.out ?? ".errata"));
  // Work on a copy of the docs, so `errata fix` edits your copy and never the installed package.
  const copy = join(out, "demo", "quickstart.md");
  mkdirSync(dirname(copy), { recursive: true });
  writeFileSync(copy, readFileSync(docs, "utf8"));
  const kane: KaneRunner = replay ? new ReplayKane([recordings], 320) : new LiveKane(typeof flags.record === "string" ? resolve(flags.record) : join(out, "recordings"));
  let reports: TutorialReport[] = [];
  try {
    reports = await runCheck([copy], { ...flags, app: app.url, agent: replay ? "rules" : (flags.agent ?? "rules"), out }, { normalise: { [app.url]: "{{app}}" }, kane });
  } finally {
    await app.close();
  }
  console.log(dim(`  Next: apply the proven fixes to the demo docs with`));
  console.log(`  errata fix ${join(String(flags.out ?? ".errata"), "reports", "driftwood-quickstart.json")}\n`);
  if (flags["fail-on"]) exitFor(reports, String(flags["fail-on"]));
}

function pathToImport(p: string) {
  return process.platform === "win32" ? `file:///${p.replace(/\\/g, "/")}` : p;
}

async function fix(file: string | undefined, flags: Flags) {
  if (!file || !existsSync(file)) {
    console.error(red("  Usage: errata fix <report.json> [--pr]"));
    process.exit(2);
  }
  const report: TutorialReport = JSON.parse(readFileSync(file, "utf8"));
  const target = report.source;
  if (isUrl(target)) {
    console.error(amber(`  ${target} is a web page. Use the patch in the report${report.patch_target ? ` against ${report.patch_target}` : ""}.`));
    process.exit(2);
  }
  const original = readFileSync(target, "utf8");
  const { text, applied, missed } = applyFixes(original, report);
  if (!applied) {
    console.log(dim("  No proven rewrites to apply."));
    return;
  }
  if (flags.pr) {
    const branch = `errata/${slug(report.tutorial)}-${Date.now().toString(36)}`;
    const git = (...a: string[]) => execFileSync("git", a, { cwd: dirname(target), stdio: "inherit" });
    git("checkout", "-b", branch);
    writeFileSync(target, text);
    git("add", target);
    git("commit", "-m", `docs: fix ${applied} drifted step${applied > 1 ? "s" : ""} in ${report.tutorial}\n\nFound and proven by Errata with Kane CLI.`);
    git("push", "-u", "origin", branch);
    const body = join(resolve(".errata"), "pr-body.md");
    mkdirSync(dirname(body), { recursive: true });
    writeFileSync(body, toMarkdown(report));
    execFileSync("gh", ["pr", "create", "--title", `docs: fix drifted steps in ${report.tutorial}`, "--body-file", body], { stdio: "inherit", shell: process.platform === "win32" });
  } else {
    writeFileSync(target, text);
  }
  console.log(green(`  Applied ${applied} proven rewrite${applied > 1 ? "s" : ""} to ${target}`));
  if (missed.length) console.log(amber(`  Could not place step(s) ${missed.join(", ")} automatically.`));
}

async function doctor() {
  const k = kaneAvailable();
  const agent = await pickAgent();
  const row = (ok: boolean, label: string, detail: string) => console.log(`  ${ok ? green("●") : red("●")} ${label.padEnd(10)} ${dim(detail)}`);
  console.log();
  row(k.installed, "Kane CLI", k.installed ? "installed" : k.detail);
  row(k.loggedIn, "Sign-in", k.detail);
  row(true, "Agent", agent.name + (agent.name.startsWith("rules") ? " · set ANTHROPIC_API_KEY for Claude" : ""));
  row(Number(process.versions.node.split(".")[0]) >= 18, "Node", process.version);
  console.log();
}

/** Install the /errata skill for Claude Code (~/.claude/skills/errata, or ./.claude/skills with --project). */
function installSkill(flags: Flags) {
  const src = join(here, "..", "skill", "errata", "SKILL.md");
  const base = flags.project ? join(process.cwd(), ".claude", "skills") : join(homedir(), ".claude", "skills");
  const dest = join(base, "errata", "SKILL.md");
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, readFileSync(src, "utf8"));
  console.log(green(`\n  Installed the /errata skill → ${dest}`));
  console.log(dim(`  In Claude Code, after a UI change: /errata I renamed the Billing menu. Check the docs.\n`));
}

async function main() {
  const { cmd, args, flags } = parse(process.argv.slice(2));
  switch (cmd) {
    case "skill":
      installSkill(flags);
      break;
    case "check": {
      if (!args.length) {
        console.log(HELP);
        process.exit(2);
      }
      const reports = await runCheck(args, flags);
      exitFor(reports, String(flags["fail-on"] ?? "broken"));
      break;
    }
    case "fix":
      await fix(args[0], flags);
      break;
    case "demo":
      await demo(flags);
      break;
    case "doctor":
      await doctor();
      break;
    case "--version":
    case "-v":
      console.log(PKG.version);
      break;
    default:
      console.log(HELP);
  }
}

main().catch((e) => {
  console.error(red(`\n  ${e?.message ?? e}\n`));
  process.exit(2);
});
