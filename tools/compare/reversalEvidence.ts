import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
for (let pass = 0; pass < 2; pass += 1) for (const path of process.argv.slice(2)) {
  const f = JSON.parse(readFileSync(resolve(path), "utf8")); const scratch = mkdtempSync(join(tmpdir(), "pokebench-reversal-")); const output = join(scratch, "probe.json"), rgb = join(scratch, "rgb"); const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root,"tools/run-mgba-probe.py"),output,"--",join(vendor,"mgba-venv/bin/python"),join(root,f.probe),join(root,f.scenario),output,rgb], {cwd:root,encoding:"utf8"}); if(run.status) throw new Error(run.stderr || run.stdout);
  const bytes=readFileSync(output), p=JSON.parse(bytes.toString()), raw=createHash("sha256"); for(const row of p.frames) raw.update(readFileSync(join(rgb,`${String(row.frame).padStart(5,"0")}.rgb`)));
  const evidence=createHash("sha256").update(bytes).digest("hex"), rawDigest=raw.digest("hex");
  if(p.schema!=="reversal-dense-evidence/v1" || JSON.stringify(p.sourceWindow)!==JSON.stringify(f.sourceWindow) || p.frames.length!==174 || p.frames[0].scriptOffset!==0 || p.frames.at(-1).gAnimScriptActive!==0 || evidence!==f.evidenceSha256 || rawDigest!==f.rawRgbSha256) throw new Error(`${f.orientation}: incomplete receipt ${evidence} ${rawDigest}`);
  for(const row of p.frames) if(row.hardwareOam.length!==128 || row.hardwareMatrices.length!==32 || row.fadedPalette.length!==512 || row.hardwarePalette.length!==512 || row.paletteTags.length!==16 || row.se1.tracks.length!==3 || row.se2.tracks.length!==3) throw new Error(`${f.orientation}: missing hardware/audio receipt`);
  for(const name of ["gReversalOrbSpriteTemplate","gHorizontalLungeSpriteTemplate","gFistFootSpriteTemplate","gBasicHitSplatSpriteTemplate"]) if(!p.topology.templates.includes(name)) throw new Error(`${f.orientation}: missing ${name}`);
  if(!p.topology.callbacks.includes("AnimReversalOrb_Step") || !p.topology.tasks.includes("AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step")) throw new Error(`${f.orientation}: incomplete callback/task topology`);
  console.log(`${f.orientation} pass ${pass+1}: ${evidence} ${rawDigest}`);
}
