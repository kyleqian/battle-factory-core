// fpp150 (ISSUES #139, docs/fpp150-focus-punch-prepass.md): the R4 card's turn 1 THROUGH THE PRODUCTION PRESENTATION, per scene.
// The full-turn kernel (Scene OFF = HITMARKER_NO_ANIMATIONS staged on the fresh state, as factoryBattleStart.ts does) emits the turn's
// events; projectBattleResolutionCommands builds production's commands, battleResolutionCommandDuration times them, and
// advanceBattleResolutionConfirmHandoff runs the handoff from its stop-bounce-request stage to the first command. A message command's
// first frame shows its first glyph (sc106), the ROM row after its printstring row (the receipt's gDisplayedStringBattle change
// row). The frame map (stop-bounce-request = ROM turn-order row + STOP_BOUNCE_REQUEST_LAG) is calibrated on the control arm's first
// glyph; every arm's first four message first-glyph rows must then equal the ROM's
// (tools/probe/receipts/rcp143-r4-focuspunch-prepass.json).
//   node --experimental-strip-types --no-warnings tools/integration/fpp150Anchors.ts [--json]
import { readFileSync } from "node:fs";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  advanceBattleResolutionConfirmHandoff, battleResolutionOpensWithFocusPunchPrePass, projectBattleResolutionCommands,
} from "../../src/engine/battleResolutionPresentation.ts";
import { battleResolutionCommandDuration } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";

const RECEIPT = "tools/probe/receipts/rcp143-r4-focuspunch-prepass.json";
const receipt = JSON.parse(readFileSync(RECEIPT, "utf8"));
/** Calibrated on off-control / on-control: ROM 36 (turn order) -> first glyph 46 = stop-bounce-request + 7 handoff frames. */
export const STOP_BOUNCE_REQUEST_LAG = 3;
const speciesName = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");

function battlerConfig(mon: any) {
  const entry = speciesTypes.species[mon.species - 1]!;
  return {
    species: mon.species, moveId: mon.moves[0], moves: mon.moves, ability: mon.ability, item: mon.item, personality: mon.personality,
    attack: mon.stats.attack, defense: mon.stats.defense, spAttack: mon.stats.spAttack, spDefense: mon.stats.spDefense,
    speed: mon.stats.speed, hp: mon.hp, maxHp: mon.maxHp, types: [entry.types[0], entry.types[1]] as const,
  };
}

export function fpp150Arm(name: string) {
  const arm = receipt.arms.find((a: any) => a.arm === name);
  const off = arm.oracleProfile === "battle-scene-off";
  const [player] = arm.parties.player;
  const [opponent] = arm.parties.opponent;
  let state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: arm.draws[0].rngBefore, player: battlerConfig(player), trainer: battlerConfig(opponent),
  } as never);
  if (off) {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const beforeRules = state.rules.rulesContext;
  const slot = name.endsWith("focus-punch") ? 2 : 0;
  const a = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision: { kind: "use-move", moveSlot: slot, targetBattler: 1 } as never });
  const b = submitFactoryFullTurnDecision(a.state, { requestId: 2, side: "trainer", decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 } as never });
  const make = (battler: 0 | 1, mon: any, rules: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: battler === 0 ? "player" as const : "trainer" as const, battler,
    partyIndex: 0 as const, level: 50, hp: rules.battlers[battler].hp, maxHP: mon.maxHp, gender: mon.gender ?? "male", status: "none" as const,
    moveIds: mon.moves, currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, player, beforeRules), opponent: make(1, opponent, beforeRules) }) as never;
  const afterRules = b.state.rules.rulesContext;
  // Through the 5th print (the R4 window; the card's one-mon trainer side would otherwise need the terminal seam's trainer name).
  let printed = 0;
  const cut = (b.events as readonly any[]).findIndex((event) => event.payload.kind === "message" && ++printed === 6);
  const events = cut < 0 ? b.events : b.events.slice(0, cut);
  const commands = projectBattleResolutionCommands(events as never, beforeRules, afterRules, field, null);
  // The production handoff from stop-bounce-request to command 0 (the pre-pass turn ends it there).
  let handoff = {
    lifecycle: { phase: "confirm-handoff", phaseElapsed: 0 }, fadeTick: 0,
    confirmHandoff: { stage: "stop-bounce-request", fightDisplayCursor: slot, idleBounceElapsed: 0, bounceReset: false,
      ...(battleResolutionOpensWithFocusPunchPrePass(events as never) ? { focusPunchPrePass: true } : {}) },
  } as any;
  let handoffFrames = 0;
  while (handoff.lifecycle.phase === "confirm-handoff") { handoff = advanceBattleResolutionConfirmHandoff(handoff); handoffFrames++; }
  const commandZero = arm.turnOrderFrame + STOP_BOUNCE_REQUEST_LAG + handoffFrames;
  let t = commandZero;
  const rows = commands.map((command) => {
    const start = t;
    const frames = battleResolutionCommandDuration(command, field);
    t += frames;
    return { type: command.type, start, frames, text: command.type === "message" ? (command as any).lines.join("\\n") : (command as any).animation ?? "" };
  });
  const messages = rows.filter((row) => row.type === "message");
  const romMessages: { frame: number; text: string }[] = arm.messages;
  const n = Math.min(messages.length, romMessages.length, 4);
  const anchors = Array.from({ length: n }, (_, i) => ({
    romFirstGlyph: romMessages[i]!.frame + 1, production: messages[i]!.start,
    romText: romMessages[i]!.text.replace("\n", "\\n"), productionText: messages[i]!.text,
  }));
  const general = rows.find((row) => row.type === "general-animation");
  return {
    arm: name, handoffFrames, commandZero, generalAnimation: general ?? null, rows, anchors,
    // The pre-pass anchors (empty box, focus print, the next action's print) on the Focus Punch arms; the control arms' first glyph
    // is the calibration. Later anchors carry the control arms' own pre-existing residuals (identical on both arms of a scene).
    pass: anchors.slice(0, name.endsWith("focus-punch") ? 3 : 1).every((x) => x.romFirstGlyph === x.production),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = ["off-focus-punch", "off-control", "on-focus-punch", "on-control"].map(fpp150Arm);
  if (process.argv.includes("--json")) console.log(JSON.stringify(results, null, 1));
  for (const result of results) {
    console.log(`${result.arm}: ${result.pass ? "MATCH" : "DIFFER"}`);
    console.log(`  handoff ${result.handoffFrames}, command 0 at ${result.commandZero}${result.generalAnimation ? `, general-animation ${result.generalAnimation.start}..${result.generalAnimation.start + result.generalAnimation.frames - 1}` : ""}`);
    for (const x of result.anchors) console.log(`  ROM glyph ${x.romFirstGlyph} prod ${x.production}  ${x.romText} | ${x.productionText}`);
    if (process.argv.includes("--rows")) for (const r of result.rows.slice(0, 12)) console.log(`    ${r.start} ${r.type} ${r.frames} ${r.text}`);
  }
}
