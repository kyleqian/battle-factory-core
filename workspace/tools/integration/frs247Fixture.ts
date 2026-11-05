// frs247: builds tools/integration/fixtures/frs247/rom-frames.json from frs247RomFrames.sh dumps.  For each case it stores the ROM's
// full-frame sha256 for every confirm-relative frame e from the field return (56) through the last frame production matches exactly,
// plus the ROM's per-frame mean brightness from e17 (black begins) to e70.
//   node --experimental-strip-types --no-warnings tools/integration/frs247Fixture.ts <out.json> <romdir>:<id>:<on|off>:<faint> ...
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { frs247ProductionReturn } from "./frs247Production.ts";

const [outPath, ...specs] = process.argv.slice(2);
const FRAME = 240 * 160 * 3;
const cases: unknown[] = [];
for (const spec of specs) {
  const [romDir, id, scene, faint] = spec.split(":");
  const faintNo = Number(faint);
  const sceneOn = scene === "on";
  const scenario = JSON.parse(readFileSync(`${romDir}/${id}-${scene}.scenario.json`, "utf8"));
  const probe = JSON.parse(readFileSync(`${romDir}/${id}-${scene}.json`, "utf8"));
  const raw = readFileSync(`${romDir}/${id}-${scene}.raw${faintNo === 1 ? "" : `.f${faintNo}`}`);
  const confirm = (probe.confirms?.[faintNo - 1] ?? probe.confirmFrame) as number;
  const first = probe.rawFirsts?.[faintNo - 1] ?? probe.rawFirstFrame;
  const rom = (e: number) => { const i = confirm + e - first; return i < 0 || (i + 1) * FRAME > raw.length ? null : raw.subarray(i * FRAME, (i + 1) * FRAME); };
  const prod = frs247ProductionReturn(scenario, sceneOn, faintNo);
  const sameFrame = (e: number, r: Uint8Array) => {
    const p = prod.draw(e);
    for (let i = 0; i < 240 * 160; i += 1) if (p[i * 4] !== r[i * 3] || p[i * 4 + 1] !== r[i * 3 + 1] || p[i * 4 + 2] !== r[i * 3 + 2]) return false;
    return true;
  };
  const sha: string[] = [];
  for (let e = 56; e < prod.promptE; e += 1) {
    const r = rom(e);
    if (!r || !sameFrame(e, r)) break;
    sha.push(createHash("sha256").update(r).digest("hex"));
  }
  const mean: number[] = [];
  for (let e = 17; e <= 70; e += 1) {
    const r = rom(e)!; let s = 0;
    for (let i = 0; i < r.length; i += 1) s += r[i]!;
    mean.push(Math.round((s / r.length) * 1000) / 1000);
  }
  const m = (b: any) => ({ species: b.species, level: b.level, gender: b.gender, nature: b.nature ?? 0, ivs: { hp: b.ivs.hp }, evs: { hp: b.evs.hp } });
  const P = scenario.overrides.parties;
  cases.push({
    id: `${id}-${scene}-f${faintNo}`, scene, faint: faintNo, firstE: 56, exactFrames: sha.length, readyE: prod.readyE, promptE: prod.promptE,
    parties: { player: P.player.map(m), opponent: P.opponent.map(m) }, meanBrightnessE17to70: mean, romFrameSha256: sha,
  });
  console.log(`${id}-${scene}-f${faintNo}: exact e56..${55 + sha.length}`);
}
writeFileSync(outPath, JSON.stringify({ step: "frs247", frameBytes: FRAME, cases }, null, 1) + "\n");
