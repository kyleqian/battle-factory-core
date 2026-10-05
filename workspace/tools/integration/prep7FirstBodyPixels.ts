// prep7: first-body pixel checks for the order consumers on direct-mGBA lab runs where the move IS the battle's first body (the provider's only valid case):
//   FIRE_BLAST (accepted reducer = hard-coded seed shape A; first-body ROM order = provider shape B), DRAGON_DANCE (accepted allocationOrder [0..5] vs the provider-derived [1,0,2,5,4,3]), ROCK_SLIDE (opponent attacker).
// Probe: tools/probe/run-battle-lab-rgb.py; reducer age 0 = activation frame (row 0 in every case); the full frame is compared outside the HUD (opponent healthbox x<112,y<46; player healthbox x>=124,y>=86; text y>=112),
// the lab scenarios' HP/text differ from the accepted fixtures. Counts are differing pixels in that region per reducer age (0 = exact).
//   node --experimental-strip-types tools/integration/prep7FirstBodyPixels.ts > tools/integration/fixtures/prep7-firstbody-pixels.json
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { acceptedConfig as acc6 } from "./prep6Accepted.mjs";
import { acceptedConfig as acc7 } from "./prep7Accepted.mjs";
const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const FX = "tools/integration/fixtures";
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const rd = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const act = (n: string, id: number) => rd(`${FX}/prep7-activation/${n}.json`).intervals.find((i: any) => i.move === id).start as number;
const cases: any[] = [
  { key: "FIRE_BLAST player", scenario: `${FX}/prep7-scenarios/mechanic-fire-blast-player-octillery-onix-firstbody.json`, act: act("mechanic-fire-blast-player-octillery-onix-firstbody", 126), rows: 197, cfg: () => acc6("FIRE_BLAST", "player-back").config, variants: { accepted: (c: any) => c } },
  { key: "FIRE_BLAST opponent", scenario: `${FX}/prep7-scenarios/mechanic-fire-blast-opponent-octillery-onix-firstbody.json`, act: act("mechanic-fire-blast-opponent-octillery-onix-firstbody", 126), rows: 197, cfg: () => acc6("FIRE_BLAST", "opponent-front").config, variants: { accepted: (c: any) => c } },
  { key: "ROCK_SLIDE opponent", scenario: `${FX}/prep7-scenarios/mechanic-rock-slide-opponent-grovyle-onix-firstbody.json`, act: act("mechanic-rock-slide-opponent-grovyle-onix-firstbody", 157), rows: 175, cfg: () => acc7("ROCK_SLIDE", "opponent-front").config, variants: { accepted: (c: any) => c } },
  { key: "DRAGON_DANCE player", scenario: "tools/battle-lab/mechanic-dragon-dance-player-dragonair-opponent-onix.json", act: 74, rows: 142, cfg: () => acc6("DRAGON_DANCE", "player-back").config,
    variants: { accepted_0to5: (c: any) => c, derived_1_0_2_5_4_3: (c: any) => ({ ...c, animationProfile: { ...c.animationProfile, allocationOrder: [1, 0, 2, 5, 4, 3] } }) } },
  { key: "DRAGON_DANCE opponent", scenario: "tools/battle-lab/mechanic-dragon-dance-opponent-dragonair-player-onix.json", act: 78, rows: 142, cfg: () => acc6("DRAGON_DANCE", "opponent-front").config,
    variants: { accepted_0to5: (c: any) => c, derived_1_0_2_5_4_3: (c: any) => ({ ...c, animationProfile: { ...c.animationProfile, allocationOrder: [1, 0, 2, 5, 4, 3] } }) } },
];
const masked = (x: number, y: number) => (x < 112 && y < 46) || (x >= 124 && y >= 86) || y >= 112;
const out: any = { schema: "prep7-firstbody-pixels/v1", mask: "outside opponent healthbox x<112,y<46; player healthbox x>=124,y>=86; text y>=112", cases: [] };
for (const cs of cases) {
  const scratch = createScratchDir("pokebench-prep7-px-"); const rgbDir = join(scratch, "rgb"); const probeOutput = join(scratch, "probe.json");
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), probeOutput, "--", join(vendor, "mgba-venv/bin/python"), join(root, "tools/probe/run-battle-lab-rgb.py"), join(root, cs.scenario), probeOutput, rgbDir], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) { out.cases.push({ key: cs.key, error: "probe failed" }); continue; }
  const rec: any = { key: cs.key, scenario: cs.scenario, activation: cs.act, rows: cs.rows, variants: {} };
  for (const [vn, vf] of Object.entries(cs.variants) as [string, (c: any) => any][]) {
    const base = createSceneOnMovePresentation(vf(cs.cfg()) as any);
    const perAge: number[] = []; let total = 0;
    for (let age = 0; age < cs.rows; age++) {
      const state = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...base, age } } as EngineState;
      const oracle = readFileSync(join(rgbDir, `${String(cs.act + age).padStart(5, "0")}.rgb`)); const rgba = render(state);
      let d = 0;
      for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) { if (masked(x, y)) continue; const p = y * 240 + x; if (oracle[p * 3] !== rgba[p * 4] || oracle[p * 3 + 1] !== rgba[p * 4 + 1] || oracle[p * 3 + 2] !== rgba[p * 4 + 2]) d++; }
      perAge.push(d); total += d;
    }
    rec.variants[vn] = { totalDiffPixels: total, framesWithDiff: perAge.filter((v) => v).length, firstDiffAges: perAge.map((v, i) => (v ? i : -1)).filter((i) => i >= 0).slice(0, 12), perAge };
  }
  out.cases.push(rec);
}
console.log(JSON.stringify(out));
