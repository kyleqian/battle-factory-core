// fpc180 (copy of fpc177Compare.ts; switch cards: command 0 = the real presentation's confirm hold, the recall-after-pre-pass prediction rows are the landed order) -- fpc177 (ISSUES #139, docs/fpc177-focus-punch-edges.md): the six Focus Punch edge-route cards THROUGH THE PRODUCTION PRESENTATION, per scene,
// against the ROM rows (fixtures/fpc177/receipts/rom-r1.json).  Method as fpp150Anchors.ts: the full-turn kernel
// (Scene OFF = HITMARKER_NO_ANIMATIONS staged, as factoryBattleStart.ts does) emits the turn's events, production projects its commands
// and battleResolutionCommandDuration times them; a message command's first frame is its first glyph (ROM change row + 1).
//   b-cases: command 0 = turn-order row + STOP_BOUNCE_REQUEST_LAG (3) + the focus-punch confirm handoff frames (fpp150's calibration).
//   a-cases: createBattleResolutionPresentation (kind "switch", synthesized recall receipts); command 0 is calibrated on the control card:
//            the control's recall first glyph (ROM) - turn-order row = K, so a card's command 0 = its turn-order row + K.
//   node --experimental-strip-types --no-warnings tools/integration/fpc177Compare.ts [--json] [--rows]
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import { createBattleState } from "../../src/engine/battleDecisionBoundary.ts";
import { createFactoryFullTurnBattleState, submitFactoryFullTurnDecision } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  advanceBattleResolutionConfirmHandoff, battleResolutionOpensWithFocusPunchPrePass, createBattleResolutionPresentation,
  projectBattleResolutionCommands,
} from "../../src/engine/battleResolutionPresentation.ts";
import { PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES } from "../../src/engine/battlePartySelect.ts";
import { battleResolutionCommandDuration } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";

const RECEIPT = "tools/integration/fixtures/fpc177/receipts/rom-r1.json";
const rom = JSON.parse(readFileSync(RECEIPT, "utf8")) as { cards: Record<string, any> };
// The R4 StatDown arms (rcp143; BRELOOM Focus Punch vs JOLTEON Sand-Attack) join the cards as the pre-existing reference class.
const r4 = JSON.parse(readFileSync("tools/probe/receipts/rcp143-r4-focuspunch-prepass.json", "utf8"));
for (const arm of r4.arms.filter((x: any) => x.arm.endsWith("focus-punch"))) {
  const scene = arm.oracleProfile === "battle-scene-off" ? "off" : "on";
  rom.cards[`r4-b2-statdown-sand-attack-${scene}`] = {
    meta: { case: "b2-statdown-sand-attack-r4", scene }, oracleProfile: arm.oracleProfile, parties: arm.parties, firstDrawRngBefore: arm.draws[0].rngBefore,
    turnOrderRow: arm.turnOrderFrame, messages: arm.messages.map((m: any) => ({ firstGlyph: m.frame + 1, text: m.text })),
  };
}
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
const benchInput = (mon: any) => ({
  species: mon.species, isEgg: false, abilityNum: mon.abilitySlot, personality: mon.personality, level: 50, friendship: 70,
  hp: mon.hp, maxHP: mon.maxHp, attack: mon.stats.attack, defense: mon.stats.defense, speed: mon.stats.speed,
  spAttack: mon.stats.spAttack, spDefense: mon.stats.spDefense, status1: 0, item: mon.item, moves: mon.moves,
  pp: [35, 35, 35, 35] as const,
});

type Row = { type: string; start: number; frames: number; text: string };
type MessageRow = { glyph: number; text: string };

function cardRows(name: string, k: number | null) {
  const card = rom.cards[name];
  const off = card.oracleProfile === "battle-scene-off";
  const { player, opponent } = card.parties;
  const isSwitch = card.meta.case.startsWith("a-");
  let state = createFactoryFullTurnBattleState({
    requestId: 1, rngSeed: card.firstDrawRngBefore, player: battlerConfig(player[0]), trainer: battlerConfig(opponent[0]),
    ...(isSwitch ? { playerBenchHp: [player[1].hp, player[2].hp], playerBenchOverride: [benchInput(player[1]), benchInput(player[2])] } : {}),
  } as never);
  if (off) {
    const rulesContext = { ...state.rules.rulesContext, hitMarker: (state.rules.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) >>> 0 };
    state = { ...state, rules: { ...state.rules, rulesContext } } as typeof state;
  }
  const beforeRules = state.rules.rulesContext;
  const sourceRequest = (state.boundary as any).request;
  const decision = isSwitch ? { kind: "switch", partyIndex: 1 } : { kind: "use-move", moveSlot: 2, targetBattler: 1 };
  const a = submitFactoryFullTurnDecision(state, { requestId: 1, side: "player", decision } as never);
  const trainerDecision = (a.state.boundary as any).request.legalDecisions.find((d: any) => d.kind === "use-move" && d.moveSlot === 0);
  const b = submitFactoryFullTurnDecision(a.state, { requestId: 2, side: "trainer", decision: trainerDecision } as never);
  const make = (battler: 0 | 1, mon: any, rules: any) => Object.freeze({
    species: mon.species as number, name: speciesName(mon.species), side: battler === 0 ? "player" as const : "trainer" as const, battler,
    partyIndex: 0 as const, level: 50, hp: rules.battlers[battler].hp, maxHP: mon.maxHp, gender: "male", status: "none" as const,
    moveIds: mon.moves, currentPP: [10, 10, 10, 10] as const, ppBonuses: 0,
  });
  const field = Object.freeze({ player: make(0, player[0], beforeRules), opponent: make(1, opponent[0], beforeRules) }) as never;
  const afterRules = b.state.rules.rulesContext;
  // Cut after the first "used" print's event run: the card's one-mon trainer side cannot present a faint (no terminal seam trainer name).
  const all = b.events as readonly any[];
  const usedAt = all.findIndex((e) => e.payload.kind === "message" && e.payload.messageId === "STRINGID_USEDMOVE");
  let cutAt = all.length;
  for (let i = usedAt + 1; usedAt >= 0 && i < all.length; i++) if (all[i].payload.kind === "message") { cutAt = i; break; }
  const events = all.slice(0, cutAt);
  let commands: readonly any[];
  let commandZero: number;
  let handoffFrames = 0;
  if (isSwitch) {
    const transition = {
      kind: "decision-required", events, nextRequest: (b.state.boundary as any).request,
      state: createBattleState({ rules: b.state.rules, rngSeed: 9, request: (b.state.boundary as any).request }),
    } as never;
    const resolution = createBattleResolutionPresentation({ sourceRequest, sourceDecision: decision, beforeRules: state.rules, transition, fieldBoundary: field } as never);
    commands = resolution.segments[0]!.commands;
    let hold = resolution as any;
    while (hold.lifecycle.phase === "confirm-handoff") { hold = advanceBattleResolutionConfirmHandoff(hold); handoffFrames++; }
    commandZero = card.turnOrderRow + (k ?? 0) - PARTY_SELECT_CLOSE_FIELD_HOLD_FRAMES + handoffFrames;
  } else {
    commands = projectBattleResolutionCommands(events as never, beforeRules, afterRules, field, null);
    let handoff = {
      lifecycle: { phase: "confirm-handoff", phaseElapsed: 0 }, fadeTick: 0,
      confirmHandoff: { stage: "stop-bounce-request", fightDisplayCursor: 2, idleBounceElapsed: 0, bounceReset: false,
        ...(battleResolutionOpensWithFocusPunchPrePass(events as never) ? { focusPunchPrePass: true } : {}) },
    } as any;
    while (handoff.lifecycle.phase === "confirm-handoff") { handoff = advanceBattleResolutionConfirmHandoff(handoff); handoffFrames++; }
    commandZero = card.turnOrderRow + STOP_BOUNCE_REQUEST_LAG + handoffFrames;
  }
  let t = commandZero;
  const rows: Row[] = commands.map((command: any) => {
    const start = t;
    const frames = battleResolutionCommandDuration(command, field);
    t += frames;
    return { type: command.type, start, frames, text: command.type === "message" ? command.lines.join("\\n") : (command.animation ?? command.type) };
  });
  const romMessages: MessageRow[] = card.messages.map((m: any) => ({ glyph: m.firstGlyph, text: m.text.replace(/\n/g, "\\n") }));
  const prodMessages: MessageRow[] = rows.filter((r) => r.type === "message").map((r) => ({ glyph: r.start, text: r.text }));
  const used = events.filter((e: any) => e.payload.kind === "message" && e.payload.messageId === "STRINGID_USEDMOVE")
    .map((e: any) => e.provenance?.instructionExecution);
  return { events, field, beforeRules, afterRules, commands, name, case: card.meta.case, scene: card.meta.scene, turnOrderRow: card.turnOrderRow, commandZero, handoffFrames, rows, romMessages, prodMessages, usedExecution: used,
    kernelMessageIds: events.filter((e: any) => e.payload.kind === "message").map((e: any) => e.payload.messageId) };
}

/** K: the control card's recall first glyph (ROM) - its turn-order row; production's command 0 sits at turn order + K on every card of the scene. */
function calibration(scene: string): number {
  const control = rom.cards[`fpc177-a-switch-control-${scene}.json`];
  return control.messages[0].firstGlyph - control.turnOrderRow;
}

export function allResults() {
  const out: ReturnType<typeof cardRows>[] = [];
  for (const name of Object.keys(rom.cards).sort()) {
    const card = rom.cards[name];
    const isA = card.meta.case.startsWith("a-");
    out.push(cardRows(name, isA ? calibration(card.meta.scene) : null));
      }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = allResults();
  if (process.argv.includes("--json")) console.log(JSON.stringify(results.map(({ events: _e, field: _f, beforeRules: _b, afterRules: _a, commands: _c, ...rest }) => rest), null, 1));
  else for (const r of results) {
    console.log(`${r.name}  turn order ${r.turnOrderRow}, command 0 ${r.commandZero} (handoff ${r.handoffFrames}), used execution ${JSON.stringify(r.usedExecution)}`);
    console.log("  kernel messages: " + r.kernelMessageIds.join(" > "));
    const n = Math.max(r.romMessages.length, r.prodMessages.length);
    for (let i = 0; i < Math.min(n, 8); i++) {
      const x = r.romMessages[i], y = r.prodMessages[i];
      console.log(`  ROM ${String(x?.glyph ?? "-").padStart(4)} ${(x?.text ?? "").slice(0, 28).padEnd(28)} | prod ${String(y?.glyph ?? "-").padStart(4)} ${(y?.text ?? "").slice(0, 28)}`);
    }
    if (process.argv.includes("--rows")) for (const row of r.rows) console.log(`    ${row.start} +${row.frames} ${row.type} ${row.text}`);
  }
}
