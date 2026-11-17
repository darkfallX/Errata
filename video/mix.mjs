// Audio: voice clips at their timeline positions + the music bed, ducked under the voice,
// normalised for YouTube (-16 LUFS integrated, -1.5 dBTP). Then muxed with the rendered video.
//   node mix.mjs   → out/errata-demo.mp4
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const FF = readFileSync("ffenv.sh", "utf8").match(/'(.+)'/)[1].replace(/^\/c\//, "C:/");
const TL = JSON.parse(readFileSync("timeline.json", "utf8"));
const inputs = ["-i", "audio/music.wav"];
const chains = [];
TL.scenes.forEach((s, i) => {
  inputs.push("-i", `audio/${s.id}.mp3`);
  const ms = Math.round(s.voice * 1000);
  chains.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${i}]`);
});
const n = TL.scenes.length;
const filter = [
  ...chains,
  `${TL.scenes.map((_, i) => `[v${i}]`).join("")}amix=inputs=${n}:normalize=0:dropout_transition=0,apad=whole_dur=${TL.total.toFixed(2)},highpass=f=70,acompressor=threshold=0.12:ratio=2.5:attack=8:release=180,asplit=2[voice][key]`,
  `[0:a]atrim=0:${TL.total.toFixed(2)},volume=-11dB[bed]`,
  `[bed][key]sidechaincompress=threshold=0.02:ratio=5:attack=60:release=700:makeup=1[duck]`,
  `[voice][duck]amix=inputs=2:normalize=0,afade=t=out:st=${(TL.total - 3).toFixed(2)}:d=3,loudnorm=I=-16:TP=-1.5:LRA=11[out]`,
].join(";");

execFileSync(`${FF}/ffmpeg`, ["-y", "-hide_banner", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[out]", "-ar", "48000", "-c:a", "pcm_s16le", "out/mix.wav"], { stdio: "inherit" });
console.log("mix.wav done");
execFileSync(`${FF}/ffmpeg`, ["-y", "-hide_banner", "-loglevel", "error", "-i", "out/video.mp4", "-i", "out/mix.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "out/errata-demo.mp4"], { stdio: "inherit" });
console.log("out/errata-demo.mp4 done");
