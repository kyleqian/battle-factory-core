// prep7: first-body Double Team pixel check of frontClone "a" vs "b" (the accepted evidence is "a", read in the staged scenario AFTER an AI body; the production first-body order provider says 4,3 = "b").
// Direct mGBA (tools/probe/run-battle-lab-rgb.py on fixtures/prep7-scenarios/mechanic-double-team-onix-grovyle-firstbody.json: player ONIX Double Team first body -> opponent GROVYLE, activation frame from
// fixtures/prep7-activation/..., reducer age 0 = activation + 1 as in the accepted staged window 2337 = 2336 + 1). The full frame is compared only over the battler region x<128, y<112 (HUD/text excluded: the lab scenario's
// HP/text timing differs from the staged fixture); the SAME region metric is applied to both variants, so the comparison is relative: which variant reproduces the ROM clones.
//   node --experimental-strip-types tools/integration/prep7DoubleTeamFirstBody.ts > tools/integration/fixtures/prep7-double-team-firstbody-pixels.json
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createSceneOnMovePresentation, ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE, ONIX_TO_GROVYLE_DOUBLE_TEAM_PRESENTATION } from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const acc = JSON.parse(readFileSync(join(root, "tools/compare/fixtures/double-team-onix-grovyle.json"), "utf8"));
const scenario = "tools/integration/fixtures/prep7-scenarios/mechanic-double-team-onix-grovyle-firstbody.json";
const activation = JSON.parse(readFileSync(join(root, "tools/integration/fixtures/prep7-activation/mechanic-double-team-onix-grovyle-firstbody.json"), "utf8")).intervals.find((i: any) => i.move === 104).start as number;
const scratch = createScratchDir("pokebench-prep7-dt-"); const rgbDir = join(scratch, "rgb");
const probeOutput = join(scratch, "probe.json");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), probeOutput, "--", join(vendor, "mgba-venv/bin/python"), join(root, "tools/probe/run-battle-lab-rgb.py"), join(root, scenario), probeOutput, rgbDir], { cwd: root, encoding: "utf8" });
if (run.status !== 0) { console.error(run.stdout, run.stderr); process.exit(run.status ?? 1); }
const mk = (b: any) => ({ species: b.species, geometry: { side: b.side, spriteCorner: b.spriteCorner, animationCenter: b.animationCenter, battlePositionCenter: b.battlePositionCenter } });
const base = activation + 1; // reducer age 0
const result: any = { schema: "prep7-double-team-firstbody-pixels/v1", activation, firstClonePassFrame: base, region: "x<128,y<112", variants: {} };
for (const front of ["a", "b"] as const) {
  let total = 0, framesDiff = 0; const perAge: number[] = [];
  for (let age = 0; age <= 229; age++) {
    const state0: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: createSceneOnMovePresentation({ move: "DOUBLE_TEAM", attacker: mk(acc.geometry.attacker), target: mk(acc.geometry.target),
      ...ONIX_TO_GROVYLE_DOUBLE_TEAM_PRESENTATION, animationProfile: { ...ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE, frontClone: front } } as any) };
    const state = { ...state0, sceneOnPresentation: { ...state0.sceneOnPresentation!, age } } as EngineState;
    const oracle = readFileSync(join(rgbDir, `${String(base + age).padStart(5, "0")}.rgb`)); const rgba = render(state);
    let d = 0;
    for (let y = 0; y < 112; y++) for (let x = 0; x < 128; x++) { const p = y * 240 + x; if (oracle[p * 3] !== rgba[p * 4] || oracle[p * 3 + 1] !== rgba[p * 4 + 1] || oracle[p * 3 + 2] !== rgba[p * 4 + 2]) d++; }
    perAge.push(d); total += d; if (d) framesDiff++;
  }
  result.variants[front] = { totalDiffPixels: total, framesWithDiff: framesDiff, perAge };
}
const a = result.variants.a.perAge as number[], b = result.variants.b.perAge as number[];
result.agesWhereVariantsDiffer = a.map((v, i) => (v !== b[i] ? i : -1)).filter((i) => i >= 0).length;
result.agesAExactBNot = a.filter((v, i) => v === 0 && b[i] !== 0).length; result.agesBExactANot = b.filter((v, i) => v === 0 && a[i] !== 0).length;
console.log(JSON.stringify(result));
