// ISSUES.md #69 evidence: how many VIDEO FRAMES the app's live presentation
// pipeline assigns to BUTTERFREE's proc'd SILVER WIND all-stats-up window,
// computed from the same production functions the real orchestrator drives
// (factoryRoundBattleOrchestrator.ts's per-frame `phaseElapsed` tick loop
// calls battleResolutionCommandDuration once per command; this script sums
// that same function's output over the same command sequence without
// needing to stand up the full orchestrator/render loop).
//
// Run: node --experimental-strip-types tools/compare/issue69OmniboostAppWindow.ts

import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../../src/engine/battleResolutionPresentationRender.ts";
import type { BattleCommandRequest } from "../../src/engine/battleDecisionBoundary.ts";

// Same repro scenario as tests/silverWindAllStatsUpRepro.test.ts
// (docs/silverwind-allstatsup-crash-scout.md): BUTTERFREE/SILVER_WIND vs
// RATTATA/TACKLE, engine rngSeed 13 -> the secondary procs.
const SCENARIO: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 13,
  player: Object.freeze({
    species: 12, // BUTTERFREE
    moveId: 318, // SILVER_WIND
    moves: [318, 0, 0, 0] as const,
    pp: [5, 0, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 45,
    defense: 50,
    spAttack: 90,
    spDefense: 80,
    speed: 70,
    hp: 120,
    maxHp: 120,
    types: ["TYPE_BUG", "TYPE_FLYING"] as const,
  }),
  trainer: Object.freeze({
    species: 19, // RATTATA
    moveId: 33, // TACKLE
    moves: [33, 0, 0, 0] as const,
    pp: [35, 0, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 56,
    defense: 35,
    spAttack: 25,
    spDefense: 35,
    speed: 72,
    hp: 100,
    maxHp: 100,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
  }),
});

const initial = createFactoryFullTurnBattleState(SCENARIO);
if (initial.boundary.kind !== "decision-required") {
  throw new Error("expected the player's command boundary");
}
const afterPlayer = submitFactoryFullTurnDecision(initial, {
  requestId: 1,
  side: "player",
  decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
});
if (afterPlayer.kind !== "decision-required") {
  throw new Error("expected the trainer's command boundary");
}
const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
  requestId: 2,
  side: "trainer",
  decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
});

const command = createBattleCommandPresentation(
  initial.boundary.request as BattleCommandRequest,
  initial.rules.rulesContext,
  0,
);

const resolution = createBattleResolutionPresentation({
  sourceRequest: initial.boundary.request as BattleCommandRequest,
  sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
  beforeRules: initial.rules,
  transition,
  fieldBoundary: command.field,
  confirmHandoff: {
    fightDisplayCursor: command.fightDisplayCursor,
    idleBounceElapsed: command.idleBounceElapsed,
  },
  opponentTrainer: null,
});

if (resolution.segments.length !== 1) {
  throw new Error(`expected exactly one presentation segment, got ${resolution.segments.length}`);
}
const segment = resolution.segments[0]!;

let totalFrames = 0;
let omniboostFrames = 0;
let omniboostStartCommandIndex = -1;
let omniboostEndCommandIndex = -1;
const rows: Array<{ index: number; type: string; frames: number; detail: string }> = [];

segment.commands.forEach((cmd, index) => {
  const frames = battleResolutionCommandDuration(cmd, segment.field);
  totalFrames += frames;
  let detail = "";
  if (cmd.type === "stat") {
    detail = `battler=${cmd.battler} stat=${cmd.stat} ${cmd.from}->${cmd.to}`;
    if (omniboostStartCommandIndex === -1) omniboostStartCommandIndex = index;
    omniboostEndCommandIndex = index;
  } else if (cmd.type === "message") {
    detail = JSON.stringify(cmd.lines);
    if (omniboostStartCommandIndex !== -1) omniboostEndCommandIndex = index;
  }
  rows.push({ index, type: cmd.type, frames, detail });
});

for (let i = omniboostStartCommandIndex; i <= omniboostEndCommandIndex; i++) {
  omniboostFrames += rows[i]!.frames;
}

console.log("command-by-command app presentation durations (production battleResolutionCommandDuration):");
for (const row of rows) {
  console.log(`  [${row.index}] ${row.type.padEnd(9)} ${String(row.frames).padStart(3)}f  ${row.detail}`);
}
console.log();
console.log(`whole-turn total: ${totalFrames} frames (one presentation segment, no inter-command handoff)`);
console.log(
  `omniboost window (first stat command [${omniboostStartCommandIndex}] through last paired message [${omniboostEndCommandIndex}]): `
  + `${omniboostFrames} frames across ${omniboostEndCommandIndex - omniboostStartCommandIndex + 1} commands`,
);

const statCommands = rows.filter((row) => row.type === "stat");
const avgPerBanner = omniboostFrames / statCommands.length;
console.log(`stat-banner count: ${statCommands.length}, average frames/banner: ${avgPerBanner.toFixed(1)}`);
