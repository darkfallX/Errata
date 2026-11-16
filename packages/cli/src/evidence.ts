// What Kane actually clicked, read from its sealed evidence pack, not from a value Kane wrote down.
//
// Learned on day 1: "store the labels you clicked as 'x'" makes Kane read a value off the *screen*,
// so a stored path can be wrong (we saw "Settings→General" for a run that clicked Team → Invite member).
// The sealed pack (a zip) has the truth in tests/<flow>/logs/<n>-actions.ndjson: one record per action
// with action_type, status, the Playwright selector (internal:role=link[name="Invite member"i]),
// Kane's intent (… text="…" …) and its own description ("Clicking All activity button").
//
// Learned on day 2: one element can have three names. GitHub's activity filter is
//   selector  role=button[name="Filter by activity type: All"]   (accessible name, aria-label)
//   intent    text="Filter by activity type: All activity"
//   Kane      "Clicking All activity button"                       (what a reader sees)
// So each click keeps every name as an alias for matching, and its label is the visible short form.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import type { Click } from "./types.js";

/** The raw fields we keep from one action record (stored in recordings so parsing can improve later). */
export interface RawAction {
  type: string;
  status?: string;
  selector?: string;
  intent?: string;
  instr?: string;
  y?: number;
}

export function nameFromSelector(sel: string): string | undefined {
  const m =
    sel.match(/\[name=(?:"([^"]+)"|'([^']+)')[is]?\]/) ??
    sel.match(/internal:(?:text|label)=(?:"([^"]+)"|'([^']+)')[is]?/) ??
    sel.match(/text=(?:"([^"]+)"|'([^']+)')/) ??
    sel.match(/has-text\((?:"([^"]+)"|'([^']+)')\)/);
  return m ? (m[1] ?? m[2])?.replace(/\\"/g, '"').trim() : undefined;
}

export function nameFromSummary(summary: string): string | undefined {
  // "click: Clicking Billing history in the account dropdown menu" → "Billing history"
  const m = summary.match(/^(?:click:\s*)?Clicking\s+(?:the\s+|on\s+)?(.+?)(?:\s+(?:link|button|tab|item|option|menu item|navigation link|nav link|toggle|dropdown|menu))?(?:\s+(?:in|on|to|from|under|within|inside|at|for|of)\b.*)?$/i);
  return m?.[1]?.replace(/^['"“‘]|['"”’]$/g, "").trim() || undefined;
}

function textFromIntent(intent: string): string | undefined {
  return intent.match(/\btext="([^"]+)"/)?.[1]?.trim();
}

const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Turn one raw click into a Click: a human label plus every alias Kane recorded. */
export function clickFromAction(a: RawAction): Click | undefined {
  const sel = a.selector ? nameFromSelector(a.selector) : undefined;
  const text = a.intent ? textFromIntent(a.intent) : undefined;
  const said = a.instr ? nameFromSummary(a.instr) : undefined;
  const names = [said, text, sel].filter((x): x is string => Boolean(x && x.length <= 80));
  if (!names.length) return undefined;
  // Prefer Kane's description when it is part of the element's own text/name (the visible short form).
  const label = said && [text, sel].some((x) => x && n(x).includes(n(said))) ? said : (text ?? sel ?? said)!;
  const aliases = [...new Set(names.filter((x) => x !== label))];
  return { label, ...(aliases.length ? { names: aliases } : {}), y: a.y };
}

export function clicksFromActions(actions: RawAction[]): Click[] {
  return actions
    .filter((a) => a.type === "click" && (!a.status || a.status === "success" || a.status === "passed"))
    .map(clickFromAction)
    .filter((c): c is Click => Boolean(c));
}

/** Read the small text files of a pack (zip or folder): { "tests/x/logs/0-actions.ndjson": "..." }. */
function readPack(pack: string): Record<string, string> {
  const want = (p: string) => /\/logs\/\d+-actions\.ndjson$|\/v16-trajectory\/\d+-dag_diagram\.md$|\/steps\/[^/]+\/step\.json$/.test("/" + p.replace(/\\/g, "/"));
  const files: Record<string, string> = {};
  if (statSync(pack).isDirectory()) {
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f);
        if (statSync(p).isDirectory()) walk(p);
        else {
          const rel = relative(pack, p).replace(/\\/g, "/");
          if (want(rel)) files[rel] = readFileSync(p, "utf8");
        }
      }
    };
    walk(pack);
    return files;
  }
  // Zips written on Windows may use backslashes in entry names.
  const entries = unzipSync(readFileSync(pack), { filter: (f) => want(f.name.replace(/\\/g, "/")) });
  for (const [name, data] of Object.entries(entries)) files[name.replace(/\\/g, "/")] = strFromU8(data);
  return files;
}

/** Every action in an evidence pack, in order (raw, for recordings). */
export function actionsFromPack(pack: string | undefined): RawAction[] {
  if (!pack || !existsSync(pack)) return [];
  let files: Record<string, string>;
  try {
    files = readPack(pack);
  } catch {
    return [];
  }
  const flows = [...new Set(Object.keys(files).map((k) => k.split("/").slice(0, 2).join("/")))].sort();
  const out: RawAction[] = [];
  for (const flow of flows) {
    const actionFiles = Object.keys(files).filter((k) => k.startsWith(flow + "/logs/") && k.endsWith("-actions.ndjson")).sort();
    if (actionFiles.length) {
      for (const f of actionFiles)
        for (const line of files[f].split(/\r?\n/)) {
          if (!line.trim()) continue;
          try {
            const a = JSON.parse(line);
            out.push({
              type: String(a.action_type ?? ""),
              status: a.status,
              selector: Array.isArray(a.selectors) ? a.selectors[0]?.selector : undefined,
              intent: typeof a.intent === "string" ? a.intent.slice(0, 400) : undefined,
              instr: typeof a.action_instruction === "string" ? a.action_instruction.slice(0, 200) : undefined,
              y: a.visual_data?.bbox?.y,
            });
          } catch {
            /* skip */
          }
        }
      continue;
    }
    // Fallback for packs without an action log: DAG legend names + step.json order.
    const names = new Map<number, string>();
    const dag = Object.keys(files).find((k) => k.startsWith(flow + "/v16-trajectory/") && k.endsWith("dag_diagram.md"));
    if (dag)
      for (const line of files[dag].split(/\r?\n/)) {
        const row = line.match(/^\|\s*N\d+\s*\|\s*`(.+)`\s*\|\s*step\s+(\d+)\s*\|/);
        if (!row) continue;
        const sig = row[1].replace(/\\\|/g, "\u0000").split("|").map((s) => s.replace(/\u0000/g, "|"));
        if (sig[1] === "click") names.set(Number(row[2]), sig.slice(3).join("|"));
      }
    const steps = Object.keys(files)
      .filter((k) => k.startsWith(flow + "/steps/"))
      .map((k) => {
        try {
          return JSON.parse(files[k]);
        } catch {
          return null;
        }
      })
      .filter((s) => s && s.kind === "click")
      .sort((a, b) => a.ordinal - b.ordinal);
    for (const s of steps) out.push({ type: "click", status: s.status, selector: names.get(s.ordinal), instr: String(s.summary ?? "").replace(/^click:\s*/, ""), y: s.element_rect?.y });
  }
  return out;
}

/** Every successful click in an evidence pack, in order. */
export function clicksFromPack(pack: string | undefined): Click[] {
  return clicksFromActions(actionsFromPack(pack));
}

/** Newest .evidence pack in a Kane session dir (fallback when no event named it). */
export function packInSession(sessionDir: string | undefined): string | undefined {
  if (!sessionDir) return undefined;
  const dir = join(sessionDir, "evidence");
  if (!existsSync(dir)) return undefined;
  const packs = readdirSync(dir)
    .filter((f) => f.endsWith(".evidence"))
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return packs[0];
}

/** All names of a click (label first). */
export const namesOf = (c: Click) => [c.label, ...(c.names ?? [])];

/**
 * Drop exploration: when Kane clicks two items in the same header row one after the other
 * (e.g. "Settings" then "Developers" in the top nav), the first was a look-around. Keep the last.
 * Repeated clicks on the same label collapse too. The proof loop decides whether trimming was right.
 */
export function trimExploration(clicks: Click[]): Click[] {
  const out: Click[] = [];
  for (const c of clicks) {
    const prev = out.at(-1);
    if (prev && prev.label.toLowerCase() === c.label.toLowerCase()) continue;
    if (prev && prev.y !== undefined && c.y !== undefined && prev.y < 120 && c.y < 120 && Math.abs(prev.y - c.y) <= 8) out.pop();
    out.push(c);
  }
  return out;
}

export const pathOf = (clicks: Click[]) => clicks.map((c) => c.label).join(" → ");
