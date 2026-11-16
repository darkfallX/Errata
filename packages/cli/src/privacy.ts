// Reports and recordings get shared (PR comments, the public report, the npm package).
// Kane's output includes local paths like C:\Users\<name>\.testmuai\…, so the home folder is
// replaced with "~" in everything Errata writes to disk.
import { homedir } from "node:os";

const home = homedir();
const variants = [...new Set([home, home.replace(/\\/g, "/"), home.replace(/\\/g, "\\\\"), home.replace(/\\/g, "\\\\\\\\")])]
  .filter((v) => v.length > 3)
  .sort((a, b) => b.length - a.length);

export function redact(text: string): string {
  let out = text;
  for (const v of variants) out = out.split(v).join("~");
  return out;
}
