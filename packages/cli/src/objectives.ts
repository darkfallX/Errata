// The words Errata gives Kane. This file is the heart of the method:
//   Literal pass  — follow the doc's words and nothing else  (--mode action, strict)
//   Goal pass     — reach the step's goal by any route         (--mode testing, lenient)
//   Proof         — a literal pass on the rewritten words
//
// Learned on day 1:
//  1. A single "fail if any label is missing" rule makes Kane check every label on the first page,
//     before clicking anything. So the literal pass is an ordered list of single clicks and no global
//     condition; --mode action hard-stops on a missing element.
//  2. "Store the labels you clicked as 'x'" makes Kane read a value off the screen, not its own history.
//     So Errata never asks Kane to report its path; it reads the clicks from the evidence pack.
//  3. Setup text ("first get to X by any route") pollutes the recorded path with setup clicks.
//     So there is no setup: a step starts where the previous one really ended (its end URL).
import { norm, splitPath } from "./agent.js";
import type { Step } from "./types.js";

/** Lower-case the first letter so a goal reads mid-sentence, but leave acronyms ("CSV", "API") alone. */
const lower = (s: string) => (/^[A-Z][A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1)).replace(/\.$/, "");

// Learned in the public run:
//  4. A label can appear twice on a page (GitHub has a "Code" repo tab and a "Code" file-view toggle).
//     Given only the label, Kane clicked the wrong one. So the doc's own sentence goes along as context
//     for *where* each label is. It is context, not a pass/fail rule.
//  5. "Store the main heading" failed a run on a raw text file, which has no heading. It is optional now.
const HEADING = `If the page you end on has a main heading, store it as 'landed_on'; a page without a heading is fine.`;

// Learned on 26 Nov (How-To Geek's book step): Kane's only route needed typing into Search, and a click-only literal
// run can never prove that. So a step may name exact text to type (`type **Special:Book** into **Search**`). The literal
// run types only that text, exactly, into the field the sentence names. It is still the doc's words, nothing else.

/** Text a sentence tells the reader to type: `type **X**`, `enter "X"`, `search for X`, `type X into`. */
export function typedTexts(sentence: string): string[] {
  const out: string[] = [];
  const re = /\b(?:type|enter|search for)\s+(?:\*\*([^*]+)\*\*|["“]([^"”]+)["”]|`([^`]+)`|([A-Za-z0-9:_./-]{2,})(?=\s+(?:into|in|as)\b))/gi;
  for (const m of sentence.matchAll(re)) {
    const t = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** The field each typed text goes into ("type X into **Search**" → Search), when the sentence names one. */
export function typingFields(sentence: string, typed: string[]): Map<string, string> {
  const plain = sentence.replace(/\*\*/g, "");
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const out = new Map<string, string>();
  for (const t of typed) {
    const m = plain.match(new RegExp(`${esc(t)}["\u201d'\`]?\\s+(?:into|in)\\s+(?:the\\s+)?([A-Z][\\w:/-]*(?:\\s+[A-Z][\\w:/-]*)*)`));
    if (m) out.set(t, m[1]);
  }
  return out;
}

/** The labels a reader clicks: every label except text they type and the field they type it into. */
export const clickLabels = (labels: string[], typed: string[], sentence = "") => {
  const fields = [...typingFields(sentence, typed).values()].map(norm);
  const drop = new Set<string>();
  return labels.filter((l) => {
    if (typed.some((t) => norm(t) === norm(l))) return false;
    if (fields.includes(norm(l)) && !drop.has(norm(l))) return !drop.add(norm(l));
    return true;
  });
};

// Learned from Kane on 26 Nov: "type X into **Search**" first became "type X", then "click Search", so Kane typed,
// reached the page, then clicked Search and left it, and the run still passed. The field now comes first, in the
// same instruction, and is not clicked again afterwards.
export function literalObjective(step: Pick<Step, "text" | "labels">, typed: string[] = []): string {
  const fields = typingFields(step.text, typed);
  const type = (t: string) =>
    fields.get(t)
      ? `Click the '${fields.get(t)}' field, type exactly '${t}', then submit it or choose the matching suggestion.`
      : `Type exactly '${t}' into the field the tutorial names, then submit it or choose the matching suggestion.`;
  const items: string[] = [];
  const pending = typed.filter((t) => !step.labels.some((l) => norm(l) === norm(t)));
  const at = (x: string) => step.text.toLowerCase().indexOf(x.toLowerCase());
  const fieldUsed = new Set<string>();
  for (const l of step.labels) {
    while (pending.length && at(pending[0]) >= 0 && at(pending[0]) < at(l)) items.push(type(pending.shift()!));
    // The field a text is typed into is clicked as part of the typing instruction, not again on its own.
    const isField = [...fields.values()].some((f) => norm(f) === norm(l)) && !fieldUsed.has(norm(l));
    if (isField) {
      fieldUsed.add(norm(l));
      continue;
    }
    items.push(typed.some((t) => norm(t) === norm(l)) ? type(l) : `Click the element whose visible label is exactly '${l}'.`);
  }
  items.push(...pending.map(type));
  const rule = typed.length
    ? `Follow these steps literally, one at a time, from the current page. Click only what each step names, and type only the exact text it quotes. Never type a URL, use the address bar, or take another route.\n`
    : `Follow these steps literally, one at a time, from the current page. Click only what each step names. Never type a URL, search, or take another route.\n`;
  const lines = items.length ? items.map((x, i) => `${i + 1}. ${x}`) : [`1. ${step.text}`];
  return (
    rule +
    (step.labels.length || typed.length ? `Where to find them, in the tutorial's own words: "${step.text.replace(/"/g, "'")}"\n` : "") +
    lines.join("\n") +
    `\n${HEADING}`
  );
}

export function goalObjective(step: Step): string {
  return (
    `Goal: ${lower(step.goal)}. Reach it from the current page by clicking through the visible UI, by any route. Never type a URL or use the address bar.\n` +
    `Hint: an old tutorial said "${step.text}", but those labels may have moved or been renamed.\n` +
    `When the goal is met, verify it on screen. ${HEADING}`
  );
}

/**
 * Does the click sequence contain every doc label, in order? (Extra look-around clicks are allowed.)
 * Each click may carry several names (visible text, accessible name); any of them can match.
 */
export function labelsMatch(docLabels: string[], clicked: (string | string[])[] | string | undefined): boolean {
  if (docLabels.length === 0) return true;
  const list = typeof clicked === "string" ? splitPath(clicked) : clicked ?? [];
  if (list.length === 0) return false;
  const seq = list.map((c) => (Array.isArray(c) ? c : [c]).map(norm).filter(Boolean));
  // A click name may contain the doc label ("Filter by activity type: All activity" ⊇ "All activity").
  // The reverse only counts when the click name is most of the label: "Book" must not stand in for
  // "Book Creator" (a real miss in the drift hunt, where Book Creator had been removed).
  const hit = (names: string[], want: string) => names.some((c) => c === want || c.includes(want) || (want.includes(c) && c.length >= want.length * 0.6));
  let i = 0;
  for (const want of docLabels.map(norm)) {
    const j = seq.findIndex((c, k) => k >= i && hit(c, want));
    if (j < 0) return false;
    i = j + 1;
  }
  return true;
}

/** Clicks that match none of the doc's labels: the steps Kane took that the doc doesn't name. */
export function extraClicks(docLabels: string[], clicked: (string | string[])[]): string[] {
  const wants = docLabels.map(norm).filter(Boolean);
  const hit = (names: string[], want: string) => names.some((c) => c === want || c.includes(want) || (want.includes(c) && c.length >= want.length * 0.6));
  return clicked
    .map((c) => (Array.isArray(c) ? c : [c]))
    .filter((names) => !wants.some((w) => hit(names.map(norm).filter(Boolean), w)))
    .map((names) => names.find((n) => n && n.trim()) ?? "")
    .filter(Boolean);
}
