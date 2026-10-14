/**
 * STEP rcp154 PASS/FAIL verifier for the action-time receipts (C1: a battler
 * dragged in by Roar / Whirlwind before it acts; C2: a battler Encored
 * mid-turn before it acts).
 *
 *   node --experimental-strip-types tools/probe/verify-rcp154.ts <receipt.json> [--write]
 *
 * Same method as tools/probe/verify-rcp143.ts: the receipt's scenario is rerun
 * through the TS full-turn kernel at HEAD (`tools/probe/rcp154PortDriver.ts`, rcp143's
 * driver taking each decision from the request's legal list),
 * seeded with the ROM's own `gRngValue` just before its first turn-execution
 * draw, with the ROM's per-turn AI-selection draws injected between turns.
 * Differences from rcp143: the player's bench (party slots 1/2) and the
 * trainer's bench are staged too (C1 drags a bench mon in), the player's move
 * slot (and target) per turn comes from the receipt's `portPlayerSlots` /
 * `portPlayerTargets`, and every move the
 * port announces (`STRINGID_USEDMOVE` events are counted per turn) is
 * compared with the ROM's per-turn `HandleAction_UseMove` dispatch count.
 * Exit 0 = PASS (draws, HP and dispatch count match), exit 1 = FAIL.
 *
 * `--write` folds `port`, `comparison` and `predictedPostFix` (the ROM's own
 * turn-execution draws in the port's reason vocabulary) into the receipt.
 */
import { readFileSync, writeFileSync } from "node:fs";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import type { FactoryFullTurnBattlerConfig } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type { BattleScriptPartyMemberInput } from "../../src/engine/battleScriptRulesContext.ts";
import { runPortTurns, type PortDraw } from "./rcp154PortDriver.ts";
import { romReason as rcp143RomReason } from "./verify-rcp143.ts";

/** ROM callers this step adds to rcp143's map (function name -> port draw reason). */
export const RCP154_CALLER_TO_PORT_REASON: Readonly<Record<string, string>> = Object.freeze({
  // Cmd_forcerandomswitch's do { i = Random() % monsCount; } while (...) pick loop (battle_script_commands.c:7346).
  Cmd_forcerandomswitch: "forcerandomswitch:pick",
  // Cmd_trysetencore's encoreTimer = (Random() & 3) + 3 (battle_script_commands.c:8039).
  Cmd_trysetencore: "Encore duration ((Random() & 3) + 3)",
});

type RomDraw = Readonly<{
  frame: number; caller: string; callerFunction: string; rngBefore: number; value: number;
  script: string; battleMainFunc?: string; attacker: number; currentMove: number;
}>;
type RomAction = Readonly<{ attacker: number; activeSpecies: number; currentMove: number; currMovePos: number }>;
type RomTurn = Readonly<{
  turn: number; aiSelectionDrawCount: number; drawCount: number;
  activeHpAtTurnEnd: readonly [number, number]; draws: readonly RomDraw[]; actions: readonly RomAction[];
}>;
type PartyMon = Readonly<{
  species: number; item: number; ability: number; abilitySlot: number; moves: [number, number, number, number];
  hp: number; maxHp: number; personality: number; level: number;
  stats: Readonly<{ attack: number; defense: number; speed: number; spAttack: number; spDefense: number }>;
}>;
type Receipt = Record<string, unknown> & Readonly<{
  receipt: string;
  portPlayerSlots: readonly (0 | 1 | 2 | 3)[];
  /** Optional per-turn decision target (0 for a user-targeted move); defaults to the foe, 1. */
  portPlayerTargets?: readonly (0 | 1)[];
  parties: Readonly<{ player: readonly PartyMon[]; opponent: readonly PartyMon[] }>;
  rom: Readonly<{ turns: readonly RomTurn[] }>;
}>;

/**
 * Port events that announce one `HandleAction_UseMove` dispatch: the move's
 * attackstring, or -- for a STATUS2_RECHARGE battler, whose locked arm
 * (battle_util.c:107-110) still dispatches the Hyper Beam script -- the
 * attackcanceler's BattleScript_MoveUsedMustRecharge string (receipt
 * enc160-hbenc).
 */
const DISPATCH_MESSAGE_IDS: ReadonlySet<string | null> = new Set(["STRINGID_USEDMOVE", "STRINGID_PKMNMUSTRECHARGE"]);

const MOVE_PP = new Map(movesData.moves.map((move) => [move.id, move.pp]));
const ppOf = (moves: readonly number[]) =>
  moves.map((move) => (move === 0 ? 0 : MOVE_PP.get(move) ?? 0)) as [number, number, number, number];

export function romReason(draw: Pick<RomDraw, "caller" | "callerFunction" | "battleMainFunc">): string {
  return RCP154_CALLER_TO_PORT_REASON[draw.callerFunction] ?? rcp143RomReason(draw);
}

function active(mon: PartyMon): FactoryFullTurnBattlerConfig {
  const entry = speciesTypes.species[mon.species - 1];
  return {
    species: mon.species,
    moveId: mon.moves[0],
    moves: mon.moves,
    pp: ppOf(mon.moves),
    ability: mon.ability,
    abilityNum: mon.abilitySlot,
    item: mon.item,
    personality: mon.personality,
    level: mon.level,
    attack: mon.stats.attack,
    defense: mon.stats.defense,
    spAttack: mon.stats.spAttack,
    spDefense: mon.stats.spDefense,
    speed: mon.stats.speed,
    hp: mon.hp,
    maxHp: mon.maxHp,
    types: [entry.types[0], entry.types[1]],
  };
}

function bench(mon: PartyMon): BattleScriptPartyMemberInput {
  return {
    species: mon.species,
    isEgg: false,
    abilityNum: mon.abilitySlot,
    ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
    personality: mon.personality,
    level: mon.level,
    maxHP: mon.maxHp,
    hp: mon.hp,
    attack: mon.stats.attack,
    defense: mon.stats.defense,
    speed: mon.stats.speed,
    spAttack: mon.stats.spAttack,
    spDefense: mon.stats.spDefense,
    item: mon.item,
    moves: mon.moves,
    pp: ppOf(mon.moves),
  };
}

export function verifyReceipt(receipt: Receipt) {
  const { player, opponent } = receipt.parties;
  const turns = receipt.rom.turns;
  const run = runPortTurns(
    {
      requestId: 1,
      rngSeed: turns[0].draws[0].rngBefore,
      player: active(player[0]),
      trainer: active(opponent[0]),
      playerBenchHp: [player[1].hp, player[2].hp],
      playerBenchOverride: [bench(player[1]), bench(player[2])],
      trainerBenchHp: [opponent[1].hp, opponent[2].hp],
      trainerBenchOverride: [bench(opponent[1]), bench(opponent[2])],
    },
    turns.map((turn, index) => ({
      injectAiDraws: turn.turn === 1 ? 0 : turn.aiSelectionDrawCount,
      playerMoveSlot: receipt.portPlayerSlots[index] ?? 0,
      playerTargetBattler: receipt.portPlayerTargets?.[index] ?? 1,
    })),
  );
  const portTurns = turns.map((turn) => ({
    turn: turn.turn,
    draws: run.draws
      .filter((draw: PortDraw) => draw.turn === turn.turn && draw.kind === "port")
      .map(({ reason, rngBefore, value }) => ({ reason, rngBefore, value })),
    usedMoveMessages: run.events.filter((event) => event.turn === turn.turn && DISPATCH_MESSAGE_IDS.has(event.id)).length,
    events: run.events.filter((event) => event.turn === turn.turn).map((event) => `${event.kind}:${event.id}`),
    activeHpAtTurnEnd: run.hpAfterTurn[turn.turn - 1] ?? null,
  }));
  const predictedPostFix = turns.map((turn) => ({
    turn: turn.turn,
    draws: turn.draws.map((draw) => ({ reason: romReason(draw), rngBefore: draw.rngBefore, value: draw.value })),
    moveDispatches: turn.actions.length,
    activeHpAtTurnEnd: turn.activeHpAtTurnEnd,
  }));
  let firstDivergence: null | Record<string, unknown> = null;
  for (const [index, expected] of predictedPostFix.entries()) {
    const actual = portTurns[index];
    const length = Math.max(expected.draws.length, actual.draws.length);
    for (let position = 0; position < length && !firstDivergence; position += 1) {
      const rom = expected.draws[position] ?? null;
      const port = actual.draws[position] ?? null;
      if (!rom || !port || rom.reason !== port.reason || rom.rngBefore !== port.rngBefore) {
        firstDivergence = { turn: expected.turn, index: position, rom, port };
      }
    }
  }
  const hpMatches = predictedPostFix.every((turn, index) =>
    JSON.stringify(turn.activeHpAtTurnEnd) === JSON.stringify(portTurns[index].activeHpAtTurnEnd));
  const dispatchesMatch = predictedPostFix.every((turn, index) => turn.moveDispatches === portTurns[index].usedMoveMessages);
  const pass = firstDivergence === null && hpMatches && dispatchesMatch && run.stoppedEarly === null;
  return {
    pass,
    port: {
      kernel: "src/engine/factoryBattleScriptFullTurnDecision.ts reduceFactoryFullTurnDecision via tools/probe/rcp154PortDriver.ts (benches staged by tools/probe/verify-rcp154.ts)",
      seededFromRomRngBefore: turns[0].draws[0].rngBefore,
      injectedAiSelectionDraws: turns.map((turn) => (turn.turn === 1 ? 0 : turn.aiSelectionDrawCount)),
      playerSlots: receipt.portPlayerSlots,
      stoppedEarly: run.stoppedEarly,
      turns: portTurns,
    },
    comparison: {
      verdictToday: pass ? "PASS" : "FAIL",
      romDrawCounts: predictedPostFix.map((turn) => turn.draws.length),
      portDrawCounts: portTurns.map((turn) => turn.draws.length),
      romMoveDispatches: predictedPostFix.map((turn) => turn.moveDispatches),
      portUsedMoveMessages: portTurns.map((turn) => turn.usedMoveMessages),
      romActiveHp: predictedPostFix.map((turn) => turn.activeHpAtTurnEnd),
      portActiveHp: portTurns.map((turn) => turn.activeHpAtTurnEnd),
      firstDivergence,
    },
    predictedPostFix: {
      note: "The ROM's own turn-execution draws in the port's reason vocabulary plus its per-turn move-dispatch count: after a fix the kernel must emit exactly this (reason, rngBefore) sequence, this many USEDMOVE announcements and these HPs.",
      turns: predictedPostFix,
    },
  };
}

function format(draw: { reason: string; rngBefore: number; value: number } | null | undefined): string {
  return draw ? `${draw.reason} [${draw.value}]` : "-";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  if (!path) throw new Error("usage: verify-rcp154.ts <receipt.json> [--write]");
  const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
  const result = verifyReceipt(receipt);
  for (const [index, expected] of result.predictedPostFix.turns.entries()) {
    const actual = result.port.turns[index];
    const romActions = receipt.rom.turns[index].actions
      .map((action) => `b${action.attacker}:${action.activeSpecies}:move${action.currentMove}@${action.currMovePos}`).join(" ");
    console.log(`turn ${expected.turn}: ROM ${expected.draws.length} draws, ${expected.moveDispatches} dispatch [${romActions}]; port ${actual.draws.length} draws, ${actual.usedMoveMessages} USEDMOVE; HP ROM ${JSON.stringify(expected.activeHpAtTurnEnd)} port ${JSON.stringify(actual.activeHpAtTurnEnd)}`);
    for (let position = 0; position < Math.max(expected.draws.length, actual.draws.length); position += 1) {
      const rom = expected.draws[position];
      const port = actual.draws[position];
      const same = rom && port && rom.reason === port.reason && rom.rngBefore === port.rngBefore;
      console.log(`  ${same ? "  " : "!="} ROM ${format(rom).padEnd(64)} PORT ${format(port)}`);
    }
    if (process.argv.includes("--events")) console.log(`  port events: ${actual.events.join(" ")}`);
  }
  console.log(`port stoppedEarly: ${result.port.stoppedEarly}`);
  console.log(`first divergence: ${JSON.stringify(result.comparison.firstDivergence)}`);
  console.log(`${receipt.receipt}: ${result.pass ? "PASS" : "FAIL"} (port vs ROM)`);
  if (process.argv.includes("--write")) {
    const { pass: _pass, ...folded } = result;
    writeFileSync(path, `${JSON.stringify({ ...receipt, ...folded }, null, 1)}\n`);
    console.log(`wrote ${path}`);
  }
  process.exitCode = result.pass ? 0 : 1;
}
