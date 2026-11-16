// The agent: reads a tutorial into steps, and rewrites a drifted step from what Kane found.
// Two implementations behind one interface:
//   ClaudeAgent  - Claude API, structured outputs (used when ANTHROPIC_API_KEY or an `ant` profile is present)
//   RulesAgent   - deterministic, offline; good for numbered "Click X → Y" docs and for reproducible demos
// Both obey the same honesty rule, enforced in code (see guardRewrite): a rewrite may only use labels Kane saw.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Step, Tutorial } from "./types.js";

export interface RewriteInput {
  step: Step;
  actual_path: string;
  landed_on?: string;
  /** Feedback from failed proof loops, newest last. */
  failures: string[];
}
export interface RewriteOutput {
  text: string;
  labels: string[];
}

export interface Agent {
  readonly name: string;
  extract(doc: { title: string; source: string; markdown: string; start_url: string }): Promise<Tutorial>;
  rewrite(input: RewriteInput): Promise<RewriteOutput>;
}

const here = dirname(fileURLToPath(import.meta.url));
export function prompt(name: string): string {
  return readFileSync(join(here, "..", "prompts", `${name}.md`), "utf8");
}

export const ARROW = " → ";
export function splitPath(path: string): string[] {
  return path
    .split(/\s*(?:→|->|>|›|»|\|)\s*/)
    .map((s) => s.trim().replace(/^["'“”‘’]+|["'“”‘’.]+$/g, ""))
    .filter(Boolean);
}
export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Honesty guard: every label in a rewrite must come from Kane's actual_path or landed_on.
 * Returns the offending labels (empty = clean).
 */
export function guardRewrite(out: RewriteOutput, actual_path: string, landed_on?: string, aliases: string[] = []): string[] {
  const seen = new Set([...splitPath(actual_path), ...(landed_on ? [landed_on] : []), ...aliases].map(norm));
  // Check the labels the agent reports AND every **bold** or "quoted" label in the sentence it wrote,
  // so a label slipped into the text but left out of `labels` is still caught.
  const claimed = [...new Set([...out.labels, ...labelsIn(out.text)])];
  return claimed.filter((l) => !seen.has(norm(l)));
}

// ---------------------------------------------------------------- Rules agent

// UI labels are **bold** or "quoted". `Code spans` are code (env vars, commands), never UI labels.
const UI_LABEL = /\*\*([^*]+)\*\*|"([^"]+)"|“([^”]+)”/g;

function labelsIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(UI_LABEL)) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    // "Settings → API Keys" inside one bold run counts as two labels
    for (const part of splitPath(raw)) if (part && !out.includes(part)) out.push(part);
  }
  return out;
}

// A step that carries on from where the last one left you, rather than starting from the app's nav.
const CONTINUES = /^(then|next|now|after that|on (this|that|the) (page|screen)|in the (dialog|panel|modal|form|window|menu|page that opens)|from (this|that|the) (page|list|menu)|optionally)\b/i;

const NOT_BROWSER = /(\bterminal\b|\bshell\b|command line|\brun `|\b(npm|npx|pip|yarn|brew|curl) |\.env\b|edit the file|in your editor|check your (e-?mail|inbox)|restart your)/i;

export class RulesAgent implements Agent {
  readonly name = "rules (offline, deterministic)";

  async extract(doc: { title: string; source: string; markdown: string; start_url: string }): Promise<Tutorial> {
    const lines = doc.markdown.split(/\r?\n/);
    const steps: Step[] = [];
    let title = doc.title;
    let start = doc.start_url;
    for (const line of lines) {
      const h = line.match(/^#\s+(.+)/);
      if (h && !title) title = h[1].trim();
      const s = line.match(/<!--\s*errata:start\s+(\S+)\s*-->/);
      if (s && !start) start = s[1];
      const m = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
      if (!m) continue;
      const quote = m[2].trim();
      const goalHint = quote.match(/<!--\s*goal:\s*(.+?)\s*-->/);
      const clean = quote.replace(/<!--.*?-->/g, "").trim();
      const labels = labelsIn(clean);
      const checkable = !NOT_BROWSER.test(clean) && labels.length > 0;
      steps.push({
        n: steps.length + 1,
        quote: clean,
        text: clean.replace(/\*\*/g, "").replace(/`/g, ""),
        goal: goalHint ? goalHint[1] : `The result of this step is visible: ${clean.replace(/\*\*/g, "")}`,
        labels,
        checkable,
        continues: steps.length > 0 && CONTINUES.test(clean.replace(/\*\*/g, "")),
        skip_reason: checkable ? undefined : NOT_BROWSER.test(clean) ? "Happens outside the browser (terminal, files or email)." : "Names no UI label to follow.",
      });
    }
    return { title: title || "Untitled tutorial", source: doc.source, start_url: start, steps };
  }

  async rewrite({ step, actual_path, failures }: RewriteInput): Promise<RewriteOutput> {
    const path = splitPath(actual_path);
    if (path.length === 0) return { text: step.text, labels: [] };
    // Mirror the doc's verb: the last label is usually a button ("press"/"click"), the rest are navigation.
    const lastVerb = /\b(press|click|select|choose|toggle|tap)\b[^*]*\*\*[^*]+\*\*\s*\.?\s*$/i.exec(step.quote)?.[1]?.toLowerCase() ?? "click";
    const nav = path.slice(0, -1);
    const last = path[path.length - 1];
    const bold = (l: string) => `**${l}**`;
    let text: string;
    if (nav.length === 0) text = `${cap(lastVerb)} ${bold(last)}.`;
    else if (failures.length > 0) text = `Open ${nav.map(bold).join(", then ")}, and ${lastVerb} ${bold(last)}.`;
    else text = `Open ${nav.map(bold).join(ARROW)} and ${lastVerb} ${bold(last)}.`;
    return { text, labels: path };
  }
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- Claude agent

export class ClaudeAgent implements Agent {
  readonly name: string;
  private clientP: Promise<any>;
  constructor(private model = process.env.ERRATA_MODEL || "claude-opus-5-5") {
    this.name = `claude (${model})`;
    this.clientP = import("@anthropic-ai/sdk").then((m) => new m.default());
  }

  private async json<T>(system: string, user: string, schema: any, zodSchema: { parse(v: unknown): T }): Promise<T> {
    const client = await this.clientP;
    const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
    const res = await client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") throw new Error("Claude declined this request.");
    const text = res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    return zodSchema.parse(JSON.parse(text));
  }

  async extract(doc: { title: string; source: string; markdown: string; start_url: string }): Promise<Tutorial> {
    const { z } = await import("zod/v4");
    const Schema = z.object({
      title: z.string(),
      start_url: z.string(),
      steps: z.array(
        z.object({
          quote: z.string(),
          text: z.string(),
          goal: z.string(),
          labels: z.array(z.string()),
          checkable: z.boolean(),
          continues: z.boolean(),
          skip_reason: z.string(),
        }),
      ),
    });
    const out = await this.json(
      prompt("extract"),
      `Tutorial source: ${doc.source}\nKnown start URL (may be empty): ${doc.start_url}\nTitle hint: ${doc.title}\n\n<doc>\n${doc.markdown}\n</doc>`,
      Schema,
      Schema,
    );
    return {
      title: out.title || doc.title,
      source: doc.source,
      start_url: doc.start_url || out.start_url,
      steps: out.steps.map((s, i) => ({ ...s, n: i + 1, skip_reason: s.checkable ? undefined : s.skip_reason || "Not checkable in a browser." })),
    };
  }

  async rewrite(input: RewriteInput): Promise<RewriteOutput> {
    const { z } = await import("zod/v4");
    const Schema = z.object({ text: z.string(), labels: z.array(z.string()) });
    const user = [
      `Original doc sentence: ${input.step.quote}`,
      `Goal of the step: ${input.step.goal}`,
      `Path Kane actually clicked (goal pass): ${input.actual_path}`,
      `Heading Kane landed on: ${input.landed_on ?? "(not captured)"}`,
      input.failures.length ? `Earlier rewrites failed Kane's literal proof:\n- ${input.failures.join("\n- ")}` : "",
    ].join("\n");
    return this.json(prompt("rewrite"), user, Schema, Schema);
  }
}

export async function pickAgent(pref?: string): Promise<Agent> {
  const want = pref ?? process.env.ERRATA_AGENT ?? "auto";
  if (want === "rules") return new RulesAgent();
  if (want === "claude") return new ClaudeAgent();
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return new ClaudeAgent();
  return new RulesAgent();
}
