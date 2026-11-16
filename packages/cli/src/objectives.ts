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

export function literalObjective(step: Pick<Step, "text" | "labels">): string {
  const clicks = step.labels.length ? step.labels.map((l, i) => `${i + 1}. Click the element whose visible label is exactly '${l}'.`) : [`1. ${step.text}`];
  return (
    `Follow these steps literally, one at a time, from the current page. Click only what each step names. Never type a URL, search, or take another route.\n` +
    (step.labels.length ? `Where to find them, in the tutorial's own words: "${step.text.replace(/"/g, "'")}"\n` : "") +
    clicks.join("\n") +
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
