// Lay the scenes out on one clock: pre-roll + voice + tail per scene, with absolute word times.
//   node timeline.mjs → timeline.json
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const FF = readFileSync("ffenv.sh", "utf8").match(/'(.+)'/)[1].replace(/^\/c\//, "C:/");
const script = JSON.parse(readFileSync("script.json", "utf8"));
const PRE = { "cold-open": 1.4, title: 0.5 };
const POST = { title: 1.4, hunt: 1.2, terminal: 1.6, outro: 4.0 };

let t = 0;
const scenes = [];
for (const s of script.scenes) {
  const dur = Number(execFileSync(`${FF}/ffprobe`, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `audio/${s.id}.mp3`]).toString().trim());
  const pre = PRE[s.id] ?? 0.7;
  const post = POST[s.id] ?? 0.9;
  const words = JSON.parse(readFileSync(`audio/${s.id}.words.json`, "utf8")).map((w) => ({ ...w, t: +(t + pre + w.t).toFixed(3) }));
  scenes.push({ id: s.id, start: +t.toFixed(3), voice: +(t + pre).toFixed(3), voiceDur: +dur.toFixed(3), end: +(t + pre + dur + post).toFixed(3), words });
  t += pre + dur + post;
}
writeFileSync("timeline.json", JSON.stringify({ fps: 30, total: +t.toFixed(3), scenes }, null, 1));
console.log(`total ${t.toFixed(1)}s, ${scenes.length} scenes`);
for (const s of scenes) console.log(s.id.padEnd(10), s.start.toFixed(1).padStart(6), "→", s.end.toFixed(1));
