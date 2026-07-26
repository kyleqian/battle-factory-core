// Instrument rung (this session, animation lane): for each of CONFUSION's 3
// named boundary-defect frames (119, 147, 176 — window-1 creation, window-2
// creation, window-2 tail) and their two neighbors each, prints the RAM
// ground truth (task's own x2/matrix, OAM-shadow x/attr0 bits) captured by
// `dump-scale-window-oam-scanline.py` side by side with what
// `sceneOnConfusionView` (the shared view/task-model code) currently
// predicts for that exact frame — to see, per frame, whether the engine
// says "not yet visible" (0/inactive) while RAM shows the task's first
// write already partially or fully visible, or vice versa.
//
// Usage: node --experimental-strip-types tools/compare/scratch/confusion-boundary-instrument.ts /tmp/confusion-boundary-oam.json
import { readFileSync } from "node:fs";
import {
  sceneOnConfusionView,
  type SceneOnPresentationBattler,
} from "../../../src/engine/sceneOnPresentation.ts";

const path = process.argv[2];
if (!path) throw new Error("usage: confusion-boundary-instrument.ts <probe-output.json>");
const data = JSON.parse(readFileSync(path, "utf8")) as {
  ticks: Array<{
    tick: number;
    playerSprite: { x: number; x2: number; oamX: number; centerToCornerVecX: number; affineMode: number; objMode: number; invisible: boolean; matrix: { a: number } };
    opponentSprite: { x: number; x2: number; oamX: number; centerToCornerVecX: number; affineMode: number; objMode: number; invisible: boolean; matrix: { a: number } };
  }>;
};
const byTick = new Map(data.ticks.map((row) => [row.tick, row]));

const attacker: SceneOnPresentationBattler = {
  species: "KADABRA",
  geometry: { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 96 }, battlePositionCenter: { x: 72, y: 80 } },
};
const target: SceneOnPresentationBattler = {
  species: "ONIX",
  geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } },
};

const config = { move: "CONFUSION" as const, attacker, target, fieldProfile: {} as any };

function engineAt(oracleTick: number) {
  const age = oracleTick - 81; // this fixture's fadetobg-creation anchor
  const state = { config, age } as any;
  const view = sceneOnConfusionView(state);
  return view;
}

function show(label: string, ticks: number[], spriteKey: "playerSprite" | "opponentSprite", engineField: "attacker" | "target") {
  console.log(`\n=== ${label} ===`);
  for (const t of ticks) {
    const row = byTick.get(t);
    if (!row) { console.log(`tick=${t}: (no RAM data)`); continue; }
    const s = row[spriteKey];
    const baseline = s.x + s.centerToCornerVecX;
    const extra = s.oamX - baseline;
    const view = engineAt(t);
    const engineX2 = engineField === "attacker" ? view.attackerX2 : view.targetX2;
    const engineScale = engineField === "target" ? view.targetScale : null;
    console.log(
      `tick=${t} | RAM: x2=${String(s.x2).padStart(3)} oamExtra=${String(extra).padStart(3)} matrixA=${s.matrix.a} objMode=${s.objMode} affineMode=${s.affineMode} invisible=${s.invisible}` +
      ` || ENGINE: x2=${String(engineX2).padStart(3)}` +
      (engineScale ? ` scale.active=${engineScale.active} scale.xScale=${engineScale.xScale}` : ""),
    );
  }
}

show("window 1 creation boundary (attacker shake, frames 117-121)", [117, 118, 119, 120, 121], "playerSprite", "attacker");
show("window 2 creation boundary (target shake+scale, frames 144-150)", [144, 145, 146, 147, 148, 149, 150], "opponentSprite", "target");
show("window 2 tail boundary (target shake+scale, frames 172-179)", [172, 173, 174, 175, 176, 177, 178, 179], "opponentSprite", "target");
