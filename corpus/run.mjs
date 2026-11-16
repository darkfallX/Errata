// Run the public corpus with Errata + Kane CLI, live.
//   node corpus/run.mjs [--groups 3] [--only gh-pulse,wp-page-history]
// Writes runs/<date>/{reports,reports-md,patches,tests,recordings}/ and one log per group.
// Rate-limited on purpose: a few Kane runs at once, read-only steps, no sign-in, no forms.
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const date = arg("date", new Date().toISOString().slice(0, 10));
const groups = Number(arg("groups", 3));
const only = arg("only", "")?.split(",").filter(Boolean);
const out = join(root, "runs", date);
mkdirSync(out, { recursive: true });

let files = readdirSync(join(here, "tutorials")).filter((f) => f.endsWith(".tutorial.json")).sort();
if (only?.length) files = files.filter((f) => only.some((o) => f.startsWith(o)));
const buckets = Array.from({ length: groups }, () => []);
files.forEach((f, i) => buckets[i % groups].push(join(here, "tutorials", f)));

const cli = join(root, "packages", "cli", "dist", "cli.js");
console.log(`Public run ${date}: ${files.length} tutorials in ${groups} groups → ${out}`);
await Promise.all(
  buckets
    .filter((b) => b.length)
    .map(
      (b, g) =>
        new Promise((resolve) => {
          const log = createWriteStream(join(out, `run-group-${g + 1}.log`));
          const child = spawn(process.execPath, [cli, "check", ...b, "--out", out, "--agent", "rules", "--parallel", arg("parallel", "1"), "--fail-on", "none"], { cwd: root, env: { ...process.env, NO_COLOR: "1" } });
          child.stdout.pipe(log);
          child.stderr.pipe(log);
          child.on("close", (code) => {
            console.log(`group ${g + 1} done (exit ${code}): ${b.length} tutorials`);
            resolve();
          });
        }),
    ),
);
console.log("Public run finished.");
