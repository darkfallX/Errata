// Builds the Errata site from real report.json files. No framework, no backend.
//   node site/build.mjs            → site/out/
// Inputs:
//   site/data/demo.json                  the Driftwood demo report (hero slip + /t/driftwood/quickstart)
//   runs/<date>/reports/*.json           the public "State of Tutorials" run
//   runs/<date>/review.json              review of every flag:
//       { "<host>/<tutorial>#<n>": { "verdict": "confirmed"|"false_alarm", "why": "...", "reviewer": "..." } }
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(here, "out");
const REPO = "https://github.com/darkfallX/Errata";
const SITE = process.env.SITE_URL || "https://errata.sh";

// ───────────────────────────────────────── data
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const demo = existsSync(join(here, "data", "demo.json")) ? readJson(join(here, "data", "demo.json")) : null;

const runsDir = join(root, "runs");
const runDates = existsSync(runsDir) ? readdirSync(runsDir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort() : [];
const runDate = runDates.at(-1);
const publicReports = [];
let review = {};
if (runDate) {
  const dir = join(runsDir, runDate, "reports");
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) publicReports.push(readJson(join(dir, f)));
  const rv = join(runsDir, runDate, "review.json");
  if (existsSync(rv)) review = readJson(rv);
}

// ───────────────────────────────────────── helpers
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const plain = (s) => String(s ?? "").replace(/\*\*/g, "").replace(/`/g, "");
/** Doc text with **bold** UI labels kept as <b>. */
const rich = (s) => esc(String(s ?? "").replace(/`/g, "")).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const host = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return "local file"; } };
const slugify = (s) => String(s).toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
const pageSlug = (r) => (r === demo ? "driftwood/quickstart" : `${slugify(host(r.source))}/${slugify(r.tutorial)}`);
const date = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const n = (x) => new Intl.NumberFormat("en-US").format(Math.round(x));

const ICON = {
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  gh: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
  sun: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  moon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  sys: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  tickW: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  chev: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};
const LOGO = (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3.5" width="16" height="17" rx="3.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 9.5h8M7 14h4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 14.2h7.5" stroke="#e0245e" stroke-width="1.6" stroke-linecap="round"/><circle cx="19.5" cy="5" r="3" fill="#e0245e"/></svg>`;
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>.i{stroke:#0f1419}@media(prefers-color-scheme:dark){.i{stroke:#e7e9ea}}</style><rect class="i" x="3" y="3.5" width="16" height="17" rx="3.5" fill="none" stroke-width="2"/><path class="i" d="M7 9.5h8M7 14h4.5" stroke-width="2" stroke-linecap="round"/><path d="M6 14.2h7.5" stroke="#e0245e" stroke-width="1.6" stroke-linecap="round"/><circle cx="19.5" cy="5" r="3" fill="#e0245e"/></svg>`;

const STATUS_PILL = {
  false_alarm: '<span class="pill neutral">false alarm</span>', accurate: '<span class="pill ok">accurate</span>', drifted: '<span class="pill warn">drifted</span>', broken: '<span class="pill no">broken</span>', skipped: '<span class="pill neutral">not checkable</span>', unchecked: '<span class="pill neutral">unchecked</span>' };

/** The route the proven rewrite used (trimmed of look-around clicks), else Kane's full route. */
const usedPath = (s) => {
  const a = s.attempts?.find((x) => x.rewrite === s.rewrite);
  return a ? a.labels.join(" → ") : s.trimmed_path ?? s.actual_path ?? "";
};
const agentLabel = (a) => {
  const t = String(a ?? "");
  if (/Claude Code/.test(t)) return "Claude Code + rules";
  return t.replace(/\s*\(offline, deterministic\)/, " agent");
};
/** Corpus files by tutorial title, for reports made before `input` was recorded. */
const corpusDir = join(root, "corpus", "tutorials");
const corpusByTitle = new Map(
  existsSync(corpusDir) ? readdirSync(corpusDir).filter((f) => f.endsWith(".tutorial.json")).map((f) => [readJson(join(corpusDir, f)).title, `corpus/tutorials/${f}`]) : [],
);
/** The exact command that reproduces a report from this repo. */
const rerun = (r) => {
  if (r === demo) return "npx errata-cli demo --replay";
  const file = r.input && !/^https?:/.test(r.input) ? r.input : corpusByTitle.get(r.tutorial);
  return `npx errata-cli check ${file ?? r.source}`;
};

const reviewKey = (r, s) => `${slugify(host(r.source))}/${slugify(r.tutorial)}#${s.n}`;
/** A flag a reviewer marked as a false alarm is shown and counted as one, never as a docs finding. */
const falseAlarm = (r, s) => r !== demo && review[reviewKey(r, s)]?.verdict === "false_alarm";
/** Totals with reviewed false alarms taken out of drifted/broken. */
function confirmedTotals(r) {
  const t = { ...r.totals, false_alarms: 0 };
  for (const s of r.steps) {
    if (!falseAlarm(r, s)) continue;
    t.false_alarms++;
    if (s.status === "drifted") { t.drifted--; if (s.rewrite) t.fixed--; }
    if (s.status === "broken") t.broken--;
  }
  return t;
}
function overall(r) {
  const t = confirmedTotals(r);
  if (t.broken) return "broken";
  if (t.drifted) return "drifted";
  if (t.false_alarms) return "false_alarm";
  if (t.accurate) return "accurate";
  return "unchecked";
}

function tbar(t) {
  const total = Math.max(1, t.accurate + t.drifted + t.broken + t.skipped + (t.unchecked || 0));
  const seg = (cls, v) => (v ? `<i class="${cls}" style="width:${(v / total) * 100}%"></i>` : "");
  return `<span class="tbar" role="img" aria-label="${t.accurate} accurate, ${t.drifted} drifted, ${t.broken} broken, ${t.skipped} not checkable">${seg("a", t.accurate)}${seg("d", t.drifted)}${seg("b", t.broken)}${seg("s", t.skipped + (t.unchecked || 0))}</span>`;
}

// ───────────────────────────────────────── layout
function layout({ title, description, path, active, body }) {
  const tab = (href, label, key, cls = "") => `<a class="tab ${cls}" href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${SITE}${path}"><meta property="og:image" content="${SITE}/assets/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}/assets/og.png">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<script>try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/tokens.css"><link rel="stylesheet" href="/assets/errata.css">
</head><body>
<header class="bar"><div class="bar-in">
<a class="logo" href="/" aria-label="Errata home">${LOGO()}<span>Errata</span></a>
<nav aria-label="Main">${tab("/report/", "Report", "report")}${tab("/how-it-works/", "How it works", "how")}${tab("/judges/", "Judges", "judges", "hide-sm")}</nav>
<div class="end"><div class="theme" role="group" aria-label="Theme"><button data-t="light" aria-label="Light theme">${ICON.sun}</button><button data-t="system" aria-label="System theme">${ICON.sys}</button><button data-t="dark" aria-label="Dark theme">${ICON.moon}</button></div>
<a class="gh" href="${REPO}" aria-label="Errata on GitHub">${ICON.gh}</a></div>
</div></header>
<main>${body}</main>
<footer class="foot"><span>Errata · built on <a href="https://www.testmuai.com/kane-cli/" style="text-decoration:underline;text-underline-offset:3px">Kane CLI</a> for the KaneCLI hackathon</span><span><a href="${REPO}">GitHub</a> · <a href="/judges/">Judges</a> · MIT</span></footer>
<script src="/assets/app.js" defer></script>
</body></html>`;
}

// ───────────────────────────────────────── the slip (hero object)
function slipData(r) {
  return {
    title: r.tutorial,
    totals: r.totals,
    steps: r.steps.map((s) => ({
      n: s.n,
      status: s.status,
      literal: s.literal?.trail ?? [],
      goal: s.goal_pass?.trail ?? [],
      proof: s.attempts?.at(-1)?.proof?.trail ?? [],
    })),
  };
}

function slip(r, { live = true } = {}) {
  const rows = r.steps
    .map((s) => {
      const text = s.status === "drifted" || s.status === "broken" ? `<s>${rich(s.text)}</s>` : rich(s.text);
      let fix = "";
      if (s.status === "drifted")
        fix = `<div class="fix"><div><div class="found">Kane found <b>${esc(usedPath(s))}</b></div>${s.rewrite ? `<div class="read"><i>Read</i>${esc(plain(s.rewrite))}</div>` : `<div class="why">No rewrite passed a literal run. Needs a human.</div>`}</div></div>`;
      if (s.status === "broken") fix = `<div class="fix"><div><div class="why">${esc(s.goal_pass?.one_liner || s.goal_pass?.reason || s.note)}</div></div></div>`;
      if (s.status === "skipped") fix = `<div class="skipnote">${esc(s.note)}</div>`;
      const final = live ? '<span class="tick" aria-hidden="true"></span>' : STATUS_PILL[s.status];
      return `<div class="erratum ${s.status === "skipped" ? "skip" : ""} ${!live && (s.status === "drifted" || s.status === "broken") ? "struck open" : ""}"><span class="n">${s.n}</span><span class="t">${text}</span><span class="st">${final}</span>${fix}</div>`;
    })
    .join("");
  return `<div class="slip card hero-card" ${live ? "data-slip" : ""}>
<div class="slip-head"><div class="slip-title"><b>${esc(r.tutorial)}</b><span>${esc(r === demo ? "driftwood v2 · docs written for v1" : host(r.source))}</span></div><span class="live">${r.kane === "replay" ? "Replay" : "Recorded run"}</span></div>
<div class="slip-body">${rows}</div>
<div class="slip-foot"><span class="trail" aria-hidden="true"></span><span class="tally"></span><span class="sr" aria-live="polite"></span></div>
</div>`;
}

// ───────────────────────────────────────── pages
function home() {
  const t = publicReports.reduce((a, r) => { const c = confirmedTotals(r); return { tut: a.tut + 1, steps: a.steps + c.checkable, acc: a.acc + c.accurate, dr: a.dr + c.drifted, br: a.br + c.broken, fa: a.fa + c.false_alarms, cr: a.cr + c.credits }; }, { tut: 0, steps: 0, acc: 0, dr: 0, br: 0, fa: 0, cr: 0 });
  const install = `npx errata-cli check https://docs.your-product.com/quickstart`;
  const body = `
<div class="wrap">
<section class="hero">
  <div>
    <h1 class="h-hero">Every doc has errata.<span class="o">Find <i>yours</i>.</span></h1>
    <p class="lede">Errata follows your tutorials word for word in a real browser. When a step no longer matches the product, it finds the real path, rewrites the step, and proves the fix before anyone reads it.</p>
    <div class="ctas"><a class="x-btn lg" href="/report/">See the report</a><a class="x-btn ghost lg" href="#install">Try it on your docs</a></div>
    <div class="cmd"><span>$</span> npx errata-cli demo <button class="copy" data-copy="npx errata-cli demo" aria-label="Copy command">${ICON.copy}</button></div>
  </div>
  <div>
    ${demo ? slip(demo) : `<div class="slip card hero-card"><div class="empty"><b>No demo report yet</b>Run <span class="inline">errata demo</span> to create one.</div></div>`}
    ${demo ? `<p class="honest">${demo.kane === "live" ? "A real Kane CLI run on the bundled Driftwood app, recorded " + esc(date(demo.checked_at)) + "." : "Replay of recorded Kane CLI runs."} <a href="/t/driftwood/quickstart/" style="text-decoration:underline;text-underline-offset:3px">Open the full proof</a></p>${`<script type="application/json" id="slip-data">${JSON.stringify(slipData(demo)).replace(/</g, "\\u003c")}</script>`}` : ""}
  </div>
</section>

<section class="sec" style="padding-top:24px">
  <div class="sec-head"><p class="quote">A smart test agent hides docs drift. Errata makes Kane follow <em>the words</em> first, then the goal. The gap between them is the bug.</p></div>
  <div class="method">
    <div style="--i:0"><div class="k"><b>Literal</b><span class="step-no">01</span></div><p>Kane clicks exactly the labels the doc names, in order. No searching, no detours.</p><code>--mode action</code></div>
    <div style="--i:1"><div class="k"><b>Goal</b><span class="step-no">02</span></div><p>If the words fail, Kane reaches the step's goal by any route and reports the path it took.</p><code>--mode testing · actual_path</code></div>
    <div style="--i:2"><div class="k"><b>Rewrite</b><span class="step-no">03</span></div><p>The agent rewrites the step using only labels Kane actually saw. Anything else is rejected.</p><code>guard: labels ⊆ actual_path</code></div>
    <div style="--i:3"><div class="k"><b>Prove</b><span class="step-no">04</span></div><p>Kane follows the rewrite literally. A fix ships only when it passes, in up to three loops.</p><code>--mode action · loop ≤ 3</code></div>
  </div>
</section>

<section class="sec">
  <div class="sec-head"><h2 class="h-sec">State of Tutorials</h2><a class="x-btn ghost sm" href="/report/">Full report ${ICON.arrow}</a></div>
  ${
    publicReports.length
      ? `<div class="score">
    <div style="--i:0"><span>Tutorials walked</span><b class="num">${n(t.tut)}</b></div>
    <div style="--i:1"><span>Steps walked</span><b class="num">${n(t.steps)}</b></div>
    <div style="--i:2"><span>Confirmed wrong steps</span><b class="num" style="color:${t.dr + t.br ? "var(--amber)" : "var(--ink)"}">${n(t.dr + t.br)}</b></div>
    <div style="--i:3"><span>False alarms, published</span><b class="num">${n(t.fa)}</b></div>
  </div>`
      : `<div class="list"><div class="empty"><b>The public run hasn't been published yet</b>Real docs, walked word for word, every evidence pack and every false alarm. It lands here, dated.</div></div>`
  }
</section>

<section class="sec" id="install">
  <div class="install">
    <div>
      <h2 class="h-sec">Run it on your docs</h2>
      <ul>
        <li>${ICON.check}<span>One command for a docs URL or a Markdown file.</span></li>
        <li>${ICON.check}<span>A report, a sealed evidence pack per run, and a patch you can merge.</span></li>
        <li>${ICON.check}<span>A CI check that fails when a UI change breaks a tutorial.</span></li>
        <li>${ICON.check}<span>Proven tutorials are saved as Kane tests you can re-run in CI.</span></li>
      </ul>
    </div>
    <div>
      <div class="seg" role="group" aria-label="Install method" data-target="#panes" data-mode="panes"><button data-v="cli" aria-pressed="true">CLI</button><button data-v="action" aria-pressed="false">GitHub Action</button><button data-v="skill" aria-pressed="false">Agent skill</button></div>
      <div id="panes" style="margin-top:12px">
<div class="code" data-pane="cli"><span class="tok-c"># needs Kane CLI, signed in</span>
npm i -g @testmuai/kane-cli && kane-cli login

<span class="tok-k">npx errata-cli check</span> https://docs.your-product.com/quickstart
<span class="tok-k">npx errata-cli check</span> ./docs/quickstart.md --app http://localhost:3000
<span class="tok-k">npx errata-cli fix</span> .errata/reports/quickstart.json --pr</div>
<div class="code" data-pane="action" hidden><span class="tok-c"># .github/workflows/docs.yml</span>
- uses: darkfallX/Errata/packages/action@main
  with:
    docs: docs/**/*.md
    app-url: \${{ steps.preview.outputs.url }}
    fail-on: broken
  env:
    KANE_USERNAME: \${{ secrets.KANE_USERNAME }}
    KANE_ACCESS_KEY: \${{ secrets.KANE_ACCESS_KEY }}</div>
<div class="code" data-pane="skill" hidden><span class="tok-c"># Claude Code: copy the skill, then ask</span>
cp -r skill/errata ~/.claude/skills/

<span class="tok-k">/errata</span> I renamed the Billing menu. Check the docs.</div>
      </div>
    </div>
  </div>
</section>
</div>`;
  return layout({ title: "Errata · Every doc has errata", description: "Errata follows your tutorials word for word in a real browser with Kane CLI, rewrites drifted steps, and proves every fix.", path: "/", active: "", body });
}

function reportPage() {
  const all = [...(demo ? [demo] : []), ...publicReports];
  const flagged = publicReports.flatMap((r) => r.steps.filter((s) => s.status === "drifted" || s.status === "broken").map((s) => ({ r, s, key: `${slugify(host(r.source))}/${slugify(r.tutorial)}#${s.n}` })));
  const confirmed = flagged.filter((f) => review[f.key]?.verdict === "confirmed").length;
  const falseAlarms = flagged.filter((f) => review[f.key]?.verdict === "false_alarm");
  const reviewed = confirmed + falseAlarms.length;
  const reviewers = [...new Set(flagged.map((f) => review[f.key]?.reviewer).filter(Boolean))];
  const T = publicReports.reduce((a, r) => { const c = confirmedTotals(r); for (const k of Object.keys(a)) a[k] += c[k] || 0; return a; }, { checkable: 0, accurate: 0, drifted: 0, fixed: 0, broken: 0, false_alarms: 0, credits: 0 });

  const row = (r, i) => {
    const st = overall(r);
    const flags = [st, r === demo ? "demo" : "public"].join(" ");
    return `<a class="row" href="/t/${pageSlug(r)}/" data-status="${flags}" style="--i:${i}">
<div style="min-width:0"><div class="row-title">${esc(r.tutorial)}</div><div class="row-meta"><span class="host">${esc(r === demo ? "demo · driftwood v2" : host(r.source))}</span></div></div>
<div class="tb">${tbar(r.totals)}</div>
<div class="counts">${r.totals.accurate}/${r.totals.checkable} ok</div>
<div class="pillcell">${STATUS_PILL[st]}</div></a>`;
  };

  const body = `<div class="wrap">
<div class="page-head"><div><h1 class="h-page">The errata sheet</h1><p>Every tutorial Errata walked, word for word, with the date, the evidence and the false alarms.</p></div>
${runDate && publicReports.length ? `<span class="pill neutral">Run of ${esc(date(runDate))}</span>` : ""}</div>
${
  publicReports.length
    ? `<div class="score">
<div style="--i:0"><span>Tutorials</span><b class="num">${publicReports.length}</b></div>
<div style="--i:1"><span>Steps checked</span><b class="num">${n(T.checkable)}</b></div>
<div style="--i:2"><span>Confirmed drifted · broken</span><b class="num"><span style="color:var(--amber)">${T.drifted}</span> · <span style="color:var(--red-ink)">${T.broken}</span></b></div>
<div style="--i:3"><span>False alarms</span><b class="num">${T.false_alarms}</b></div>
</div>`
    : ""
}
<div class="filters">
  <div class="seg" role="group" aria-label="Filter" data-target="#rows"><button data-v="all" aria-pressed="true">All</button><button data-v="drifted" aria-pressed="false">Drifted</button><button data-v="broken" aria-pressed="false">Broken</button><button data-v="accurate" aria-pressed="false">Accurate</button><button data-v="false_alarm" aria-pressed="false">False alarms</button></div>
  <div class="legend"><span><i style="background:var(--green)"></i>accurate</span><span><i style="background:var(--amber)"></i>drifted</span><span><i style="background:var(--red)"></i>broken</span><span><i style="background:var(--line)"></i>not checkable</span></div>
</div>
<div class="list rows" id="rows">
${all.length ? all.map(row).join("") : ""}
<div class="empty empty-filter" ${all.length ? "hidden" : ""}><b>Nothing here</b>No tutorial matches this filter.</div>
</div>

<section class="sec">
<div class="sec-head"><h2 class="h-sec">Precision</h2><span class="mute" style="font-size:13.5px">${reviewers.length ? `Reviewed by ${esc(reviewers.join(", "))}` : "Every flag gets reviewed"}</span></div>
${
  flagged.length
    ? `<div class="list"><table class="table"><thead><tr><th>Flag</th><th>Count</th></tr></thead><tbody>
<tr><td>Flagged by Errata (drifted or broken)</td><td>${flagged.length}</td></tr>
<tr><td>Reviewed</td><td>${reviewed}</td></tr>
<tr><td>Confirmed real</td><td style="color:var(--green-ink)">${confirmed}</td></tr>
<tr><td>False alarms</td><td style="color:var(--red-ink)">${falseAlarms.length}</td></tr>
</tbody></table></div>
${falseAlarms.length ? `<div class="list" style="margin-top:12px"><div class="list-head">False alarms, and why</div>${falseAlarms.map((f, i) => `<a class="row" href="/t/${pageSlug(f.r)}/" style="grid-template-columns:minmax(0,1fr);--i:${i}"><div style="min-width:0"><div class="row-title">${esc(f.r.tutorial)} · step ${f.s.n}</div><div class="row-meta">${esc(review[f.key].why)}</div></div></a>`).join("")}</div>` : ""}`
    : `<div class="list"><div class="empty"><b>No public flags yet</b>Once the public run lands, each drifted or broken step is reviewed against the live page, the reviewer is named, and false alarms are listed here.</div></div>`
}
</section>
</div>`;
  return layout({ title: "The errata sheet · Errata", description: "Every tutorial Errata walked, word for word, with evidence and false alarms.", path: "/report/", active: "report", body });
}

function runBlock(label, k) {
  if (!k) return "";
  const pill = k.status === "passed" ? '<span class="pill ok">passed</span>' : k.status === "failed" ? '<span class="pill no">failed</span>' : `<span class="pill neutral">${esc(k.status)}</span>`;
  const retried = k.retried ? ' <span class="mute" style="font-weight:500">· retried after a Kane infrastructure error</span>' : "";
  const links = [k.test_url && `<a href="${esc(k.test_url)}" target="_blank" rel="noopener">Kane test run</a>`].filter(Boolean).join("");
  return `<div class="run"><div class="run-h"><span>${label} ${pill}${retried}</span><code>${esc(k.mode)} · ${k.credits ?? "?"} cr · ${k.duration ? Math.round(k.duration) + "s" : ""}</code></div>
${k.trail?.length ? `<ol>${k.trail.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>` : ""}
${k.one_liner || k.reason ? `<div class="why2">${esc(k.one_liner || k.reason)}</div>` : ""}
${k.clicks?.length ? `<div class="obj"><span style="color:var(--ink-2);font-weight:600">Clicked, per the evidence pack:</span> ${esc(k.clicks.map((c) => c.label).join(" → "))}</div>` : ""}
<div class="obj">${esc(k.objective)}</div>
${links ? `<div class="lnk">${links}</div>` : ""}</div>`;
}

function tutorialPage(r) {
  const steps = r.steps
    .map((s) => {
      const fa = falseAlarm(r, s);
      const struck = !fa && (s.status === "drifted" || s.status === "broken");
      let margin = "";
      if (s.status === "drifted")
        margin = `<div class="margin">
<div class="kv"><span>Real path</span><span class="path">${esc(usedPath(s) || "not reported")}</span></div>
${s.actual_path && s.actual_path !== usedPath(s) ? `<div class="kv"><span>Kane's route</span><span class="path mute">${esc(s.actual_path)}</span></div>` : ""}
${s.rewrite ? `<div class="read"><i>Read</i>${esc(plain(s.rewrite))}</div>` : `<div class="why">No rewrite passed a literal run in ${s.attempts?.length ?? 0} loops. Needs a human.</div>`}
<div class="kv"><span>Verdict</span><span>${esc(s.note)}</span></div></div>`;
      if (s.status === "broken") {
        const tried = s.goal_pass?.clicks ?? [];
        margin = `<div class="margin"><div class="why">${esc(s.goal_pass?.one_liner || s.goal_pass?.reason || s.note)}</div>
${tried.length ? `<div class="kv"><span>Kane tried</span><span class="path mute">${tried.length} clicks: ${esc(tried.map((c) => c.label).join(" → "))}</span></div>` : ""}
<div class="kv"><span>Verdict</span><span>${esc(s.note)}</span></div></div>`;
      }
      if (s.status === "accurate") margin = `<div class="margin"><div class="kv"><span>Verdict</span><span>${esc(s.note)}</span></div></div>`;
      if (s.status === "skipped" || s.status === "unchecked") margin = `<div class="skipnote">${esc(s.note)}</div>`;
      if (fa) {
        const v = review[reviewKey(r, s)];
        margin = `<div class="margin"><div class="kv"><span>Errata said</span><span>${esc(s.status)}${s.rewrite ? `, with a rewrite: “${esc(plain(s.rewrite))}”` : ""}</span></div>
<div class="kv"><span>Review</span><span><b>False alarm.</b> ${esc(v.why)}</span></div>
<div class="kv"><span>Reviewer</span><span class="mute">${esc(v.reviewer || "not named")}</span></div></div>`;
      }
      const runs = [runBlock("Literal", s.literal), runBlock("Goal", s.goal_pass), ...(s.attempts ?? []).map((a) => runBlock(`Proof · loop ${a.loop}`, a.proof))].join("");
      return `<div class="erratum ${struck ? "struck open" : ""} ${s.status === "skipped" ? "skip" : ""}"><span class="n">${s.n}</span><span class="t">${struck ? `<s>${rich(s.text)}</s>` : rich(s.text)}</span><span class="st">${fa ? STATUS_PILL.false_alarm : STATUS_PILL[s.status]}</span>${margin}
${runs ? `<details class="runs"><summary>${ICON.chev} What Kane did</summary>${runs}</details>` : ""}</div>`;
    })
    .join("");

  const diff = r.patch
    ? `<div class="diff">${r.patch
        .split("\n")
        .filter((l) => !/^(=+|Index:)/.test(l))
        .map((l) => `<span class="${l.startsWith("+") && !l.startsWith("+++") ? "add" : l.startsWith("-") && !l.startsWith("---") ? "del" : l.startsWith("@@") || l.startsWith("---") || l.startsWith("+++") ? "hd" : ""}">${esc(l) || " "}</span>`)
        .join("")}</div>`
    : "";
  const t = r.totals;
  const packs = r.steps.flatMap((s) => [s.literal, s.goal_pass, ...(s.attempts ?? []).map((a) => a.proof)]).filter((k) => k?.test_url).length;
  const body = `<div class="wrap">
<div class="page-head" style="padding-bottom:20px"><div style="min-width:0"><div class="crumbs"><a href="/report/">Errata sheet</a><span>/</span><span>${esc(r === demo ? "demo" : host(r.source))}</span></div>
<h1 class="h-page" style="margin-top:8px">${esc(r.tutorial)}</h1>
<p style="font:500 13px var(--mono);word-break:break-all">${/^https?:/.test(r.source) ? `<a href="${esc(r.source)}" target="_blank" rel="noopener" style="text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--line)">${esc(r.source)}</a>` : esc("packages/cli/demo/driftwood/docs/quickstart.md")}</p></div>
<div style="width:min(260px,100%)">${tbar(t)}</div></div>
<div class="sheet">
<div>
  <div class="proof">${steps}</div>
  ${diff ? `<section class="sec" style="padding-top:36px"><div class="sec-head"><h2 class="h-sec">The patch</h2><span class="mute" style="font-size:13.5px">Only proven rewrites</span></div>${diff}</section>` : ""}
</div>
<aside class="side">
  <div class="facts"><div class="card-head">The record</div><dl>
    <dt>Checked</dt><dd>${esc(date(r.checked_at))}</dd>
    <dt>Kane</dt><dd>${r.kane === "replay" ? "replay of recorded runs" : "live run"}</dd>
    <dt>Agent</dt><dd title="${esc(r.agent)}">${esc(agentLabel(r.agent))}</dd>
    <dt>Accurate</dt><dd style="color:var(--green-ink)">${t.accurate} of ${t.checkable}</dd>
    <dt>Drifted</dt><dd style="color:var(--amber)">${t.drifted}${t.fixed ? ` · ${t.fixed} fixed` : ""}</dd>
    <dt>Broken</dt><dd style="color:var(--red-ink)">${t.broken}</dd>
    <dt>Not checkable</dt><dd>${t.skipped}</dd>
    <dt>Kane credits</dt><dd>${n(t.credits)}</dd>
    <dt>Kane runs</dt><dd>${packs}</dd>
  </dl></div>
  <div class="facts"><div class="card-head">Check it yourself</div><div style="padding:12px 14px;font-size:13.5px;color:var(--ink-2);display:flex;flex-direction:column;gap:10px">
    <span>Each step lists Kane's own trail and objective. Run links open the recorded session in Kane's Test Manager.</span>
    <div class="code" style="padding:10px 12px;font-size:12px;white-space:pre-wrap;word-break:break-all">${esc(rerun(r))}</div>
  </div></div>
</aside>
</div></div>`;
  return layout({ title: `${r.tutorial} · Errata`, description: `${t.accurate} of ${t.checkable} steps accurate, ${t.drifted} drifted, ${t.broken} broken. Walked word for word with Kane CLI.`, path: `/t/${pageSlug(r)}/`, active: "report", body });
}

function howPage() {
  const W = 920;
  const box = (x, y, w, title, sub, color) => `<g><rect x="${x}" y="${y}" width="${w}" height="74" rx="12" fill="var(--bg)" stroke="${color || "var(--line)"}" stroke-width="1.2"/><text x="${x + 16}" y="${y + 30}" font-size="16" font-weight="800" fill="var(--ink)">${title}</text><text x="${x + 16}" y="${y + 52}" font-size="12.5" fill="var(--mute)" font-family="JetBrains Mono, monospace">${sub}</text></g>`;
  const arrow = (x1, y1, x2, y2, label, color = "var(--mute)") => `<g><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="1.4" fill="none" marker-end="url(#ah)"/>${label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" font-size="12" text-anchor="middle" fill="${color}" font-weight="600">${label}</text>` : ""}</g>`;
  const svg = `<svg viewBox="0 -6 ${W} 336" width="${W}" role="img" aria-label="Literal pass, then goal pass, then rewrite, then proof, looping up to three times">
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="var(--mute)"/></marker></defs>
${box(10, 40, 190, "Literal", "--mode action")}
${box(260, 40, 190, "Goal", "--mode testing")}
${box(510, 40, 190, "Rewrite", "agent · guard")}
${box(730, 40, 180, "Prove", "--mode action")}
${arrow(200, 77, 258, 77, "fails")}
${arrow(450, 77, 508, 77, "actual_path")}
${arrow(700, 77, 728, 77, "")}
${arrow(105, 114, 105, 196, "")}<text x="117" y="160" font-size="12" fill="var(--green-ink)" font-weight="600">passes</text>
<rect x="10" y="198" width="190" height="46" rx="999" fill="var(--green-bg)"/><text x="105" y="226" font-size="14" font-weight="700" text-anchor="middle" fill="var(--green-ink)">accurate</text>
${arrow(355, 114, 355, 196, "")}<text x="367" y="160" font-size="12" fill="var(--red-ink)" font-weight="600">fails</text>
<rect x="260" y="198" width="190" height="46" rx="999" fill="var(--red-bg)"/><text x="355" y="226" font-size="14" font-weight="700" text-anchor="middle" fill="var(--red-ink)">broken</text>
${arrow(820, 114, 820, 196, "")}<text x="832" y="160" font-size="12" fill="var(--green-ink)" font-weight="600">passes</text>
<rect x="730" y="198" width="180" height="46" rx="999" fill="var(--amber-bg)"/><text x="820" y="226" font-size="14" font-weight="700" text-anchor="middle" fill="var(--amber)">drifted · fixed</text>
<path d="M800 40 C 800 22, 610 22, 610 38" stroke="var(--amber)" stroke-width="1.4" fill="none" stroke-dasharray="4 4" marker-end="url(#ah)"/><text x="705" y="12" font-size="12" text-anchor="middle" fill="var(--amber)" font-weight="600">proof fails · Kane's reason goes back to the agent · ≤ 3 loops</text>
<text x="10" y="300" font-size="13" fill="var(--mute)">Every arrow is a real kane-cli run or a check in code. Nothing is shown to a reader until the last box passes.</text>
</svg>`;
  const body = `<div class="wrap">
<div class="page-head"><div><h1 class="h-page">How it works</h1><p>Two passes per step. The gap between them is the bug.</p></div></div>
<div class="flow">${svg}</div>
<section class="sec"><div class="sec-head"><h2 class="h-sec">What we learned building it</h2></div>
<div class="notes">
<div><b>One rule per click, not one rule for all.</b><p>"Fail if any label is missing" made Kane check every label on the first page, before clicking anything. The literal pass is now an ordered list of single clicks, and strict mode stops on the first one that's missing.</p></div>
<div><b>Strict mode still explores.</b><p>Asked to click "API Keys", Kane opened Settings, then Account, then Developers, then Tokens, looking for it. It failed correctly here, but it shows how a single lenient pass hides drift.</p></div>
<div><b>"Store what you clicked" reads the screen.</b><p>Asked to store its own click path, Kane read a value off the page instead: "Settings→General" for a run that clicked Team → Invite member. Errata reads the clicks from Kane's sealed evidence pack.</p></div>
<div><b>One button, three names.</b><p>GitHub's activity filter shows "All activity", but its accessible name is "Filter by activity type: All". Errata keeps every name Kane recorded, so a passing step is never flagged over an aria-label.</p></div>
<div><b>A crash is not a broken doc.</b><p>Kane reports <code>infra_error.*</code> when the browser crashes or the machine runs out of memory. Errata retries once, then marks the step unchecked, never broken.</p></div>
<div><b>Kane's triage is a signal, not a verdict.</b><p>On a moved menu Kane calls its literal failure an "agent misstep", because from its side the label simply isn't there. Errata decides drift from the goal pass, not the triage.</p></div>
<div><b>The same label, twice.</b><p>GitHub's file view has a "Code" toggle, and the repository has a "Code" tab. Given only the label, Kane clicked the tab, and the next step started on the wrong page. Kane now also gets the doc's own sentence ("above the file content") as context.</p></div>
<div><b>Not every page has a heading.</b><p>Errata asked Kane to note the page heading after each step. A raw text file has none, so a correct click failed. The heading is optional now. Both bugs came from the public run and are listed there as false alarms.</p></div>
<div><b>Well-kept docs stay accurate.</b><p>24 published tutorials from GitHub Docs, Wikipedia, Grafana, Plausible and OpenStreetMap: no confirmed drift. That's a real result too. The demo app shows what drift looks like when it's there.</p></div>
</div></section>
<section class="sec"><div class="sec-head"><h2 class="h-sec">The honesty rules</h2></div>
<div class="prose">
<p>A rewrite may only use UI labels that appear in Kane's <code>actual_path</code> or the heading it landed on. The check is in code, so a rewrite that invents a label is rejected before Kane ever runs it.</p>
<p>Shell commands, file edits and "check your email" steps are marked <b>not checkable</b> and shown as such, never counted as passed. When Kane itself can't run (sign-in, network, Chrome), the step is <b>unchecked</b> and not counted as a finding.</p>
<p>Recorded runs are labelled as replays everywhere they appear. Every flag in the public run is reviewed against the live page and the evidence, with the reviewer named, and false alarms are published.</p>
</div></section>
</div>`;
  return layout({ title: "How it works · Errata", description: "Literal pass, goal pass, rewrite, proof. How Errata uses Kane CLI to find and fix docs drift.", path: "/how-it-works/", active: "how", body });
}

function judgesPage() {
  const rows = [
    ["A", "npx errata-cli demo", "Driftwood: accurate, drifted and broken steps, fixes proven by Kane. Add <span class='inline'>--replay</span> to play back recorded real runs, no credits.", "20 s"],
    ["B", '<a href="/report/" style="text-decoration:underline;text-underline-offset:3px">The errata sheet</a>', "Real public tutorials walked word for word, each with Kane's trail, objective and run link.", "2 min"],
    ["C", `<a href="/t/driftwood/quickstart/" style="text-decoration:underline;text-underline-offset:3px">One proof sheet</a>`, "The demo tutorial step by step: the literal run, the goal run, the rewrite, the proof and the patch.", "1 min"],
  ];
  const body = `<div class="wrap">
<div class="page-head"><div><h1 class="h-page">Judges, start here</h1><p>No sign-in needed for any of these.</p></div></div>
<div class="list paths">${rows.map((r, i) => `<div class="row" style="--i:${i}"><span class="letter">${r[0]}</span><div style="min-width:0"><div class="row-title" style="white-space:normal">${r[1].startsWith("npx") ? `<span class="inline">${r[1]}</span>` : r[1]}</div><div class="row-meta" style="white-space:normal">${r[2]}</div></div><span class="mute hide-sm" style="font-size:13px">No sign-in</span><span class="num" style="font-weight:700;text-align:right">${r[3]}</span></div>`).join("")}</div>
<section class="sec"><div class="sec-head"><h2 class="h-sec">The three bars</h2></div>
<div class="list"><table class="table wrap"><thead><tr><th>Bar</th><th style="text-align:left">Where to see it</th></tr></thead><tbody>
<tr><td>Works end to end</td><td style="text-align:left;white-space:normal">One command: doc in, report + evidence + patch out</td></tr>
<tr><td>Kane caught or proved something</td><td style="text-align:left;white-space:normal">Drifted and broken steps caught; every fix proven by a literal Kane run</td></tr>
<tr><td>Agent and Kane talked</td><td style="text-align:left;white-space:normal">Agent writes Kane's steps → Kane's <span class="inline">actual_path</span> returns → agent rewrites → Kane proves, with failure reasons fed back</td></tr>
</tbody></table></div></section>
</div>`;
  return layout({ title: "Judges · Errata", description: "Three ways to see Errata work, no sign-in.", path: "/judges/", active: "judges", body });
}

// ───────────────────────────────────────── write
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets"), { recursive: true });
cpSync(join(here, "assets"), join(out, "assets"), { recursive: true });
writeFileSync(join(out, "assets", "favicon.svg"), FAVICON);
const put = (p, html) => { mkdirSync(join(out, p), { recursive: true }); writeFileSync(join(out, p, "index.html"), html); };
put("", home());
put("report", reportPage());
put("how-it-works", howPage());
put("judges", judgesPage());
for (const r of [...(demo ? [demo] : []), ...publicReports]) put(join("t", pageSlug(r)), tutorialPage(r));
writeFileSync(join(out, "404.html"), layout({ title: "Not found · Errata", description: "Page not found", path: "/404", active: "", body: `<div class="wrap"><div class="page-head"><div><h1 class="h-page">This page has errata</h1><p>Nothing lives here. <a href="/" style="text-decoration:underline">Back to the start</a>.</p></div></div></div>` }));
console.log(`site → ${out}  (${publicReports.length} public reports${demo ? " + demo" : ""})`);
