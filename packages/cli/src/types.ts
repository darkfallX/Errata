// Core data model. report.json is exactly `TutorialReport` (or `RunReport` for many).

/** "unchecked" = Kane itself could not run (auth, network, Chrome). Never counted as a docs finding. */
export type Verdict = "accurate" | "drifted" | "broken" | "skipped" | "unchecked";

/** One instruction pulled out of a tutorial by the agent. */
export interface Step {
  n: number;
  /** The exact sentence(s) from the doc this step came from. Used to patch the source. */
  quote: string;
  /** The instruction, normalised to one imperative sentence. */
  text: string;
  /** What is true once the step is done, phrased as a checkable end state. */
  goal: string;
  /** UI labels the doc names, in the order a reader meets them. */
  labels: string[];
  /** false for shell commands, file edits, "check your email" and anything outside a browser. */
  checkable: boolean;
  /** true when the step continues on the page the previous step left you on ("Then click…", "In the dialog…"). */
  continues?: boolean;
  /** Why a step is not checkable (shown to the reader, never hidden). */
  skip_reason?: string;
}

export interface Tutorial {
  title: string;
  /** Where the source text came from (URL or file path). */
  source: string;
  /** Where the browser should start. */
  start_url: string;
  steps: Step[];
}

/** One click Kane made, read from its evidence pack. */
export interface Click {
  /** The name a reader sees (Kane's own description when it matches the element). */
  label: string;
  /** Other names Kane recorded for the same element (accessible name, element text). */
  names?: string[];
  /** Page the click happened on. */
  url?: string;
  /** Element's position on the page (used to spot look-around clicks in a header row or a sidebar). */
  x?: number;
  y?: number;
}

/** The parts of Kane's `run_end` event we keep. */
export interface KaneResult {
  status: "passed" | "failed" | "error" | "timeout";
  exit_code: number;
  summary?: string;
  one_liner?: string;
  reason?: string;
  /** Kane's machine-readable reason, e.g. "infra_error.screenshot_failed", "assertion_error.step_not_achievable". */
  reason_code?: string;
  /** true when Errata retried this run because Kane reported an infrastructure failure. */
  retried?: boolean;
  /** Kane's own triage of a failure, e.g. { family: "automation_bug" | "product_bug", category, root_cause }. */
  verdict?: { status?: string; family?: string; category?: string; severity?: string; root_cause?: string; confirmed?: boolean };
  /** Sealed .evidence pack on disk (open with `kane-cli evidence serve <path>`). */
  evidence?: string;
  final_state: Record<string, unknown>;
  credits?: number;
  duration?: number;
  test_url?: string;
  run_dir?: string;
  session_dir?: string;
  /** Remarks from progress events, in order: the step-by-step story of the run. */
  trail: string[];
  /** Every click, from the evidence pack (ground truth for "what did Kane click?"). */
  clicks: Click[];
  /** Where the browser ended (final_state.url). */
  end_url?: string;
  /** The objective Kane was given, verbatim. */
  objective: string;
  mode: "action" | "testing";
  /** "live" = a real Kane run now; "replay" = a recorded real Kane run played back. */
  source: "live" | "replay";
  recorded_at?: string;
}

export interface Attempt {
  loop: number;
  rewrite: string;
  labels: string[];
  proof: KaneResult;
}

export interface StepReport extends Step {
  status: Verdict;
  literal?: KaneResult;
  goal_pass?: KaneResult;
  actual_path?: string;
  landed_on?: string;
  /** actual_path with look-around clicks removed (tried first). */
  trimmed_path?: string;
  rewrite?: string;
  attempts?: Attempt[];
  /** Where this step was started (the tutorial start, or where the previous step ended). */
  started_at?: string;
  /** Clicks in a passing literal run that the step doesn't name (e.g. reopening a menu). Shown, never hidden. */
  extra_clicks?: string[];
  /** Plain-language explanation of the verdict. */
  note: string;
  credits: number;
}

export interface TutorialReport {
  errata: string; // schema version
  tutorial: string;
  source: string;
  start_url: string;
  checked_at: string;
  /** What was passed to `errata check` (file path relative to cwd, or URL), so anyone can re-run it. */
  input?: string;
  agent: string;
  /** Every agent call in this run, word for word: what it was told (incl. Kane's failures) and what it answered. */
  agent_calls?: { role: "rewrite" | "extract"; input: string; output: string; ms: number }[];
  kane: "live" | "replay";
  steps: StepReport[];
  totals: {
    steps: number;
    checkable: number;
    accurate: number;
    drifted: number;
    fixed: number;
    broken: number;
    skipped: number;
    unchecked: number;
    credits: number;
    seconds: number;
  };
  patch?: string;
  patch_target?: string;
}
