// Scratch diagnostic (S7 slice R rung (b) groundwork, mechanisms 1-3
// re-derivation): confirm the LIVE pressTick this dispatcher computes for
// turn 10's own FIGHT-submenu confirm (the anchor the AERIAL_ACE animation
// window's lunge/shake/clone tables should be expressed relative to), same
// pattern as tools/compare/scratch/diag-quickattack-anchor.ts (docs/battle-
// turn-notes.md §38) - per this session's own brief, do NOT assume the
// predecessor dossier's own anchor without instrumenting it fresh.
import { createInitialState, tick } from "../../../src/engine/core.ts";
import { normalizeButtons } from "../../../src/input.ts";
import fs from "node:fs";

const trace = JSON.parse(fs.readFileSync(new URL("../traces-groundtruth/battle1-turn10-dense.json", import.meta.url), "utf8"));

let state = createInitialState();
let frame = 0;
for (const segment of trace.segments) {
  const buttons = new Set(normalizeButtons(segment.buttons ?? []));
  for (let i = 0; i < segment.frames; i += 1) {
    state = tick(state, buttons);
    frame += 1;
    if (frame === 12345 || frame === 12360 || frame === 12380 || frame === 12400 || frame === 12439) {
      const sm = (state as any).battleScene?.fightSubmenu;
      console.log(`frame=${frame} confirmElapsed=${sm?.confirmElapsed} openElapsed=${sm?.openElapsed} closeElapsed=${sm?.closeElapsed}`);
    }
  }
}
