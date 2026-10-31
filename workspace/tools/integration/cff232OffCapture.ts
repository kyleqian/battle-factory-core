// cff232: capture ROM lab frames (any profile) for a committed Castform lab; chunks of <=250 captures per oracle run.
//   node --experimental-strip-types --no-warnings tools/integration/cff232OffCapture.ts --lab=hail --from=330 --to=460 [--stride=1] [--profile=battle-scene-off] --out=/tmp/cff232/hail-off
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const lab = JSON.parse(readFileSync(`tools/integration/fixtures/castform-forms/off/labs/${arg("lab")}.json`, "utf8"));
const out = arg("out")!, from = Number(arg("from")), to = Number(arg("to")), stride = Number(arg("stride") ?? 1);
lab.profile = arg("profile") ?? lab.profile;
mkdirSync(out, { recursive: true });
const frames: number[] = []; for (let f = from; f <= to; f += stride) frames.push(f);
for (let i = 0; i < frames.length; i += 250) {
  const chunk = frames.slice(i, i + 250).filter((f) => !existsSync(`${out}/frame-${String(f).padStart(5, "0")}.png`));
  if (!chunk.length) continue;
  const l = JSON.parse(JSON.stringify(lab)); l.trace.captureFrames = chunk;
  const total = l.trace.segments.reduce((a: number, s: { frames: number }) => a + s.frames, 0);
  if (chunk.at(-1)! >= total) l.trace.segments.at(-1).frames += chunk.at(-1)! - total + 3;
  const tmp = `${out}/.chunk`; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  writeFileSync(`${tmp}/lab.json`, JSON.stringify(l));
  execFileSync("bin/oracle", ["--profile", l.profile, "lab", `${tmp}/lab.json`, "-o", `${tmp}/o`], { stdio: ["ignore", "ignore", "inherit"], timeout: 900000 });
  for (const f of readdirSync(`${tmp}/o`)) if (f.endsWith(".png")) copyFileSync(`${tmp}/o/${f}`, `${out}/${f}`);
  copyFileSync(`${tmp}/o/manifest.json`, `${out}/manifest-${chunk[0]}.json`);
}
console.log(`captured ${frames.length} frames into ${out}`);
