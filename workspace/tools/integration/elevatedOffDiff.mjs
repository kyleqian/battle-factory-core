// usage: node elevatedOffDiff.mjs <baseDir> <patchedDir> -> JSON {trace: {profile, changedFrames, first, last}} for changed traces
import { readdirSync, readFileSync } from "node:fs";
const [a, b] = process.argv.slice(2);
const out = {};
for (const f of readdirSync(a)) {
  const x = JSON.parse(readFileSync(`${a}/${f}`, "utf8")), y = JSON.parse(readFileSync(`${b}/${f}`, "utf8"));
  if (x.error || y.error) { out[f.replace(/\.json\.json$/, "")] = { error: x.error ?? y.error }; continue; }
  const ch = Object.keys(x.frames).filter((k) => x.frames[k] !== y.frames[k]).map(Number).sort((p, q) => p - q);
  if (ch.length) out[f.replace(/\.json\.json$/, "")] = { profile: x.profile, total: Object.keys(x.frames).length, changed: ch.length, first: ch[0], last: ch[ch.length - 1], frames: ch };
}
console.log(JSON.stringify(out, null, 1));
