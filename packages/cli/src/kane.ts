// Thin, honest wrapper around `kane-cli run --agent`.
// - Always NDJSON (--agent), headless by default.
// - Acts only on the `run_end` event; progress lines become the run's "trail".
// - Every live run is recorded verbatim so it can be replayed later (the judge path, --replay).
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Click, KaneResult } from "./types.js";
import { actionsFromPack, clicksFromActions, packInSession } from "./evidence.js";
import { redact } from "./privacy.js";

export interface KaneRunOptions {
  objective: string;
  mode: "action" | "testing";
  url?: string;
  timeout?: number;
  maxSteps?: number;
  bugDetection?: "off" | "stop" | "continue";
  headless?: boolean;
  /** Placeholder applied before hashing so recordings survive a port change, e.g. {"http://localhost:4177": "{{app}}"}. */
  normalise?: Record<string, string>;
  onProgress?: (remark: string) => void;
}

/**
 * Kane failed for reasons outside the product: the browser crashed, the machine ran out of memory,
 * the network dropped. Kane says so in reason_code ("infra_error.*") and its triage ("environment_issue").
 * These are never docs findings.
 */
export function isInfraFailure(r: KaneResult): boolean {
  if (r.status === "error" || r.status === "timeout") return true;
  if (r.status !== "failed") return false;
  return /^infra_error/.test(r.reason_code ?? "") || r.verdict?.family === "environment_issue" || /target crashed|browser has disconnected|net::err_/i.test(r.reason ?? "");
}

export interface KaneRunner {
  readonly kind: "live" | "replay";
  run(opts: KaneRunOptions): Promise<KaneResult>;
}

/** Stable key for a run: same mode + objective + start url = same recording. */
export function runKey(opts: KaneRunOptions): string {
  let text = `${opts.mode}\n${opts.url ?? ""}\n${opts.objective}`;
  for (const [from, to] of Object.entries(opts.normalise ?? {})) text = text.split(from).join(to);
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

let cachedBin: string[] | null = null;
/** Resolve how to invoke kane-cli without a shell (safe quoting on every OS). */
export function kaneCommand(): string[] {
  if (cachedBin) return cachedBin;
  if (process.env.KANE_CLI_BIN) return (cachedBin = [process.env.KANE_CLI_BIN]);
  try {
    const root = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["root", "-g"], {
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const entry = join(root, "@testmuai", "kane-cli", "bin", "kane-cli.cjs");
    if (existsSync(entry)) return (cachedBin = [process.execPath, entry]);
  } catch {
    /* fall through */
  }
  return (cachedBin = ["kane-cli"]);
}

export function kaneAvailable(): { installed: boolean; loggedIn: boolean; detail: string } {
  const [cmd, ...pre] = kaneCommand();
  try {
    const out = execFileSync(cmd, [...pre, "whoami"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
    const loggedIn = !/not logged in/i.test(out);
    return { installed: true, loggedIn, detail: loggedIn ? "signed in" : "not signed in (run: kane-cli login)" };
  } catch (e: any) {
    const out = String(e?.stdout ?? "") + String(e?.stderr ?? "");
    if (e?.code === "ENOENT") return { installed: false, loggedIn: false, detail: "kane-cli not found (npm i -g @testmuai/kane-cli)" };
    return { installed: true, loggedIn: !/not logged in/i.test(out) && out.length > 0, detail: /not logged in/i.test(out) ? "not signed in (run: kane-cli login)" : "whoami failed" };
  }
}

const round = (n: unknown) => (typeof n === "number" ? Math.round(n * 10) / 10 : undefined);

function parseEvents(ndjson: string, objective: string, mode: KaneRunOptions["mode"], exitCode: number, clicks: Click[] = []): KaneResult {
  const trail: string[] = [];
  let end: any = null;
  let evidence: string | undefined;
  for (const line of ndjson.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    let ev: any;
    try {
      ev = JSON.parse(t);
    } catch {
      continue;
    }
    if (typeof ev.pack === "string" && ev.pack.endsWith(".evidence")) evidence = ev.pack;
    if (ev.type === "run_end") {
      end = ev;
      break;
    }
    if (!ev.type && typeof ev.remark === "string" && ev.remark && (ev.status === "done" || ev.status === "failed")) {
      trail.push(ev.remark);
    }
  }
  const byExit: KaneResult["status"] = exitCode === 0 ? "passed" : exitCode === 1 ? "failed" : exitCode === 3 ? "timeout" : "error";
  const status: KaneResult["status"] = end?.status === "passed" ? "passed" : end?.status === "failed" ? "failed" : byExit;
  const fs = (end?.final_state && typeof end.final_state === "object" ? end.final_state : {}) as Record<string, unknown>;
  return {
    status,
    exit_code: exitCode,
    summary: end?.summary,
    one_liner: end?.one_liner,
    reason_code: typeof end?.reason_code === "string" ? end.reason_code : undefined,
    reason: end?.reason ?? (end ? undefined : "Kane ended without a run_end event"),
    verdict: end?.verdict && typeof end.verdict === "object" ? end.verdict : undefined,
    evidence,
    final_state: fs,
    end_url: typeof fs.url === "string" ? fs.url : undefined,
    clicks,
    credits: round(end?.credits_consumed ?? end?.credits),
    duration: typeof end?.duration === "number" ? end.duration : undefined,
    test_url: end?.test_url,
    run_dir: end?.run_dir,
    session_dir: end?.session_dir,
    trail,
    objective,
    mode,
    source: "live",
  };
}

export class LiveKane implements KaneRunner {
  readonly kind = "live" as const;
  constructor(private recordDir?: string) {}

  run(opts: KaneRunOptions): Promise<KaneResult> {
    const [cmd, ...pre] = kaneCommand();
    const args = [...pre, "run", opts.objective, "--agent", "--mode", opts.mode];
    if (opts.headless !== false) args.push("--headless");
    if (opts.url) args.push("--url", opts.url);
    if (opts.timeout) args.push("--timeout", String(opts.timeout));
    if (opts.maxSteps) args.push("--max-steps", String(opts.maxSteps));
    if (opts.bugDetection) args.push("--bug-detection", opts.bugDetection);

    return new Promise((resolve) => {
      const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: process.env });
      let out = "";
      let buf = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        out += chunk;
        buf += chunk;
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line.startsWith("{")) continue;
          try {
            const ev = JSON.parse(line);
            if (!ev.type && ev.remark && opts.onProgress) opts.onProgress(String(ev.remark));
          } catch {
            /* partial line */
          }
        }
      });
      let err = "";
      child.stderr.on("data", (c) => (err += c));
      child.on("error", (e) => {
        resolve({ ...parseEvents("", opts.objective, opts.mode, 2), reason: `Could not start kane-cli: ${e.message}` });
      });
      child.on("close", (code) => {
        const exit = code ?? 2;
        const first = parseEvents(out, opts.objective, opts.mode, exit);
        const pack = first.evidence ?? packInSession(first.session_dir);
        const actions = actionsFromPack(pack);
        const clicks = clicksFromActions(actions);
        const result = { ...first, evidence: pack, clicks };
        if (!result.reason && result.status === "error") result.reason = err.trim().split("\n").slice(-3).join(" ") || "kane-cli error";
        if (this.recordDir) {
          mkdirSync(this.recordDir, { recursive: true });
          const rec = { key: runKey(opts), recorded_at: new Date().toISOString(), exit_code: exit, mode: opts.mode, url: opts.url, objective: opts.objective, clicks, actions, ndjson: out };
          writeFileSync(join(this.recordDir, `${rec.key}.json`), redact(JSON.stringify(rec, null, 2)));
        }
        resolve(result);
      });
    });
  }
}

/** Plays back real recorded Kane runs. Never invents a result: a missing recording is reported as an error. */
export class ReplayKane implements KaneRunner {
  readonly kind = "replay" as const;
  constructor(private dirs: string[], private pace = 0) {}

  async run(opts: KaneRunOptions): Promise<KaneResult> {
    const key = runKey(opts);
    const file = this.dirs.map((d) => join(d, `${key}.json`)).find((f) => existsSync(f));
    if (!file) {
      return {
        ...parseEvents("", opts.objective, opts.mode, 2),
        reason: `No recording for this objective (key ${key}). Run live to record it.`,
        source: "replay",
      };
    }
    const rec = JSON.parse(readFileSync(file, "utf8"));
    // Re-derive clicks from the raw action log when the recording has it, so parser fixes apply to old runs.
    const clicks = Array.isArray(rec.actions) && rec.actions.length ? clicksFromActions(rec.actions) : rec.clicks ?? [];
    const result = parseEvents(rec.ndjson, opts.objective, opts.mode, rec.exit_code, clicks);
    if (this.pace > 0 && opts.onProgress) {
      for (const r of result.trail) {
        opts.onProgress(r);
        await new Promise((res) => setTimeout(res, this.pace));
      }
    }
    return { ...result, source: "replay", recorded_at: rec.recorded_at };
  }
}
