// Ad-hoc state dump for ISSUES #62's discriminating HP-bar probe.
//
// Replays a trace exactly like tools/compare/appTrace.ts (same
// createInitialState/tick/traceAdvances calls, no production code touched),
// but at chosen frames prints the app kernel's own live rulesContext HP for
// each battler (state.factoryRoundBattleOrchestrator.battle.rules
// .rulesContext.battlers[id].hp/maxHP) side by side with the currently
// *displayed* resolution field (…battleResolutionPresentation.field), so a
// mismatch between "what the kernel tracks" and "what the renderer was
// handed" would show up directly instead of being inferred from pixels.
//
// Usage: node --experimental-strip-types tools/compare/scratch/issue62-hpbar-state-dump.ts <fixture.json> <frame> [<frame> ...]

import { createInitialState, render, tick } from "../../../src/engine/core.ts";
import { traceAdvances } from "../traceReplay.ts";
import { loadCompareTrace } from "../traceFile.ts";
import { resolveCompareTracePath } from "../paths.ts";

const [, , fixtureArg, ...frameArgs] = process.argv;
if (!fixtureArg || frameArgs.length === 0) {
  console.error("usage: issue62-hpbar-state-dump.ts <fixture.json> <frame> [<frame> ...]");
  process.exit(2);
}
const targetFrames = new Set(frameArgs.map(Number));
const trace = loadCompareTrace(resolveCompareTracePath(fixtureArg));

function dump(frame: number, state: ReturnType<typeof createInitialState>): void {
  const orch = state.factoryRoundBattleOrchestrator;
  const rulesContext = orch?.battle?.rules.rulesContext;
  const resolutionField = orch?.battleResolutionPresentation?.field;
  const commandField = orch?.battleCommandPresentation?.field;
  console.log(`--- frame ${frame} ---`);
  if (!rulesContext) {
    console.log("  no factoryRoundBattleOrchestrator.battle yet");
    return;
  }
  for (const id of [0, 1] as const) {
    const b = rulesContext.battlers[id]!;
    console.log(
      `  kernel rulesContext.battlers[${id}] hp=${b.hp} maxHP=${b.maxHP} species=${b.species}`,
    );
  }
  if (resolutionField) {
    console.log(
      `  resolution field.player hp=${resolutionField.player.hp} maxHP=${resolutionField.player.maxHP} name=${resolutionField.player.name}`,
    );
    console.log(
      `  resolution field.opponent hp=${resolutionField.opponent.hp} maxHP=${resolutionField.opponent.maxHP} name=${resolutionField.opponent.name}`,
    );
  } else {
    console.log("  no battleResolutionPresentation.field active this frame");
  }
  if (commandField) {
    console.log(
      `  command field.player hp=${commandField.player.hp} maxHP=${commandField.player.maxHP} name=${commandField.player.name}`,
    );
    console.log(
      `  command field.opponent hp=${commandField.opponent.hp} maxHP=${commandField.opponent.maxHP} name=${commandField.opponent.name}`,
    );
  } else {
    console.log("  no battleCommandPresentation.field active this frame");
  }
}

let state = createInitialState({ appRoute: trace.appRoute });
let frame = 0;
if (targetFrames.has(frame)) dump(frame, state);
for (const advance of traceAdvances(trace.segments)) {
  state = tick(state, advance.buttons);
  frame = advance.frame;
  if (targetFrames.has(frame)) dump(frame, state);
}
// Touch render() so the import isn't flagged unused by a stricter TS config.
void render;
