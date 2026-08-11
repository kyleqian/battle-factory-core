// Scratch diagnostic (turn 12 probe worktree lane): confirm the LIVE
// pressTick this dispatcher computes for turn 12's own FIGHT-submenu
// confirm, same pattern as diag-aerialace-anchor.ts/diag-quickattack-
// anchor.ts. Per the brief's own mandatory-first-step rule, do NOT assume
// turn 10's press-tick derivation carries verbatim - instrument fresh.
import { createInitialState, tick } from "../../../src/engine/core.ts";
import { normalizeButtons } from "../../../src/input.ts";
import fs from "node:fs";

const trace = JSON.parse(fs.readFileSync(new URL("../traces-groundtruth/battle1-turn12-dense.json", import.meta.url), "utf8"));

let state = createInitialState();
let frame = 0;
const watch = new Set([14338, 14345, 14360, 14376, 14380, 14384, 14400, 14420, 14620, 14630, 14650, 14700, 14780, 14790, 15374]);
for (const segment of trace.segments) {
  const buttons = new Set(normalizeButtons(segment.buttons ?? []));
  for (let i = 0; i < segment.frames; i += 1) {
    state = tick(state, buttons);
    frame += 1;
    if (watch.has(frame)) {
      const sm = (state as any).battleScene?.fightSubmenu;
      console.log(`frame=${frame} confirmElapsed=${sm?.confirmElapsed} openElapsed=${sm?.openElapsed} closeElapsed=${sm?.closeElapsed} cursor=${sm?.cursor}`);
    }
  }
}
