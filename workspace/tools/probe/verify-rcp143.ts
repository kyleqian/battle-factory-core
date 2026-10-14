/**
 * STEP rcp143 PASS/FAIL verifier for the RNG receipts (R1 THRASH lock-in,
 * R2 Covet into Sticky Hold; ISSUES #141).
 *
 *   node --experimental-strip-types tools/probe/verify-rcp143.ts <receipt.json> [--write]
 *
 * Reruns the receipt's scenario through the TS full-turn kernel at HEAD
 * (`tools/probe/rcp143PortDriver.ts`), seeded with the ROM's own `gRngValue`
 * just before its first turn-execution draw and with the ROM's per-turn AI
 * selection draws injected (the kernel takes the trainer decision as input),
 * then compares every turn-execution draw -- mapped reason AND pre-draw LCG
 * state -- against the ROM's single-step attribution. Exit 0 = PASS (port
 * matches the ROM draw-for-draw), exit 1 = FAIL. Before the #141 fix this is
 * EXPECTED to FAIL; that failure is the receipt.
 *
 * `--write` folds `port` (today's sequence), `comparison` and
 * `predictedPostFix` (the ROM sequence in the port's own reason vocabulary --
 * what the fixed kernel must emit) into the receipt JSON.
 */
import { readFileSync, writeFileSync } from "node:fs";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import type { FactoryFullTurnBattlerConfig } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { runPortTurns, type PortDraw } from "./rcp143PortDriver.ts";

/** ROM caller (function, or function+offset when one function owns two draw sites) -> port draw reason. */
export const ROM_CALLER_TO_PORT_REASON: Readonly<Record<string, string>> = Object.freeze({
  Cmd_accuracycheck: "accuracycheck",
  Cmd_critcalc: "critcalc",
  Cmd_adjustnormaldamage: "adjustnormaldamage",
  Cmd_adjustnormaldamage2: "adjustnormaldamage2",
  Cmd_seteffectwithchance: "seteffectwithchance",
  AtkCanceler_UnableToUseMove: "attackcanceler:unable-to-use-move",
  BattleTurnPassed: "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)",
  // GetMoveTarget's MOVE_TARGET_SELECTED do/while (battle_util.c:3850-3853), the issue140 reason.
  GetMoveTarget: "GetMoveTarget(MOVE_TARGET_SELECTED)",
  // SetMoveEffect owns three draw sites here: MOVE_EFFECT_THRASH's (Random() & 1) + 2
  // (battle_script_commands.c:2859), MOVE_EFFECT_CONFUSION's (Random() % 4) + 2 and
  // the sleep arm's (Random() & 3) + 2.
  "SetMoveEffect+0x113c": "SetMoveEffect Thrash-family lock-in duration ((Random() & 1) + 2)",
  "SetMoveEffect+0x92e": "SetMoveEffect confusion duration ((Random() % 4) + 2)",
  "SetMoveEffect+0x6ba": "SetMoveEffect sleep duration ((Random() & 3) + 2)",
  // MOVE_EFFECT_UPROAR's STATUS2_UPROAR_TURN((Random() & 3) + 2) (battle_script_commands.c:2573); ROM +0xa32.
  "SetMoveEffect+0xa32": "SetMoveEffect Uproar duration ((Random() & 3) + 2)",
});

const ABILITY_INTIMIDATE = 22;
const INTIMIDATE_BLOCKERS = new Set([29, 52, 73]); // CLEAR_BODY, HYPER_CUTTER, WHITE_SMOKE

type RomDraw = Readonly<{
  frame: number; caller: string; callerFunction: string; rngBefore: number; value: number;
  script: string; battleMainFunc?: string; attacker: number; currentMove: number;
}>;
type RomTurn = Readonly<{
  turn: number; aiSelectionDrawCount: number; drawCount: number;
  activeHpAtTurnEnd: readonly [number, number]; draws: readonly RomDraw[];
}>;
type PartyMon = Readonly<{
  species: number; item: number; ability: number; moves: [number, number, number, number];
  hp: number; maxHp: number; personality: number;
  stats: Readonly<{ attack: number; defense: number; speed: number; spAttack: number; spDefense: number }>;
}>;
type Receipt = Record<string, unknown> & Readonly<{
  receipt: string;
  parties: Readonly<{ player: readonly PartyMon[]; opponent: readonly PartyMon[] }>;
  rom: Readonly<{ turns: readonly RomTurn[] }>;
}>;

export function romReason(draw: Pick<RomDraw, "caller" | "callerFunction" | "battleMainFunc">): string {
  // GetWhoStrikesFirst's speed-tie Random() & 1 serves two callers: turn order
  // (SetActionsAndBattlersTurnOrder, battle_main.c:4728/4745) and the
  // ENDTURN_ORDER re-sort run from BattleTurnPassed's end-turn pass.
  if (draw.callerFunction === "GetWhoStrikesFirst") {
    return draw.battleMainFunc === "SetActionsAndBattlersTurnOrder"
      ? "turn order speed tie (Random() & 1)"
      : "ENDTURN_ORDER GetWhoStrikesFirst speed tie (Random() & 1)";
  }
  return ROM_CALLER_TO_PORT_REASON[draw.caller]
    ?? ROM_CALLER_TO_PORT_REASON[draw.callerFunction]
    ?? `UNMAPPED ${draw.caller}`;
}

function battler(mon: PartyMon, foe: PartyMon): FactoryFullTurnBattlerConfig {
  const entry = speciesTypes.species[mon.species - 1];
  // The ROM ran the foe's Intimidate as a real entry hook before frame 0.
  const intimidated = foe.ability === ABILITY_INTIMIDATE && !INTIMIDATE_BLOCKERS.has(mon.ability);
  return {
    species: mon.species,
    moveId: mon.moves[0],
    moves: mon.moves,
    ability: mon.ability,
    item: mon.item,
    personality: mon.personality,
    attack: mon.stats.attack,
    defense: mon.stats.defense,
    spAttack: mon.stats.spAttack,
    spDefense: mon.stats.spDefense,
    speed: mon.stats.speed,
    hp: mon.hp,
    maxHp: mon.maxHp,
    types: [entry.types[0], entry.types[1]],
    ...(intimidated ? { statStages: [6, 5, 6, 6, 6, 6, 6, 6] as const } : {}),
  };
}

export function verifyReceipt(receipt: Receipt) {
  const [player] = receipt.parties.player;
  const [opponent] = receipt.parties.opponent;
  const turns = receipt.rom.turns;
  const run = runPortTurns(
    {
      requestId: 1,
      rngSeed: turns[0].draws[0].rngBefore,
      player: battler(player, opponent),
      trainer: battler(opponent, player),
    },
    turns.map((turn) => ({
      injectAiDraws: turn.turn === 1 ? 0 : turn.aiSelectionDrawCount,
      playerMoveSlot: 0,
      playerTargetBattler: 1,
    })),
  );
  const portTurns = turns.map((turn) => ({
    turn: turn.turn,
    draws: run.draws
      .filter((draw: PortDraw) => draw.turn === turn.turn && draw.kind === "port")
      .map(({ reason, rngBefore, value }) => ({ reason, rngBefore, value })),
    activeHpAtTurnEnd: run.hpAfterTurn[turn.turn - 1] ?? null,
  }));
  const predictedPostFix = turns.map((turn) => ({
    turn: turn.turn,
    draws: turn.draws.map((draw) => ({ reason: romReason(draw), rngBefore: draw.rngBefore, value: draw.value })),
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
  const pass = firstDivergence === null && hpMatches && run.stoppedEarly === null;
  return {
    pass,
    port: {
      kernel: "src/engine/factoryBattleScriptFullTurnDecision.ts reduceFactoryFullTurnDecision via tools/probe/rcp143PortDriver.ts",
      seededFromRomRngBefore: turns[0].draws[0].rngBefore,
      injectedAiSelectionDraws: turns.map((turn) => (turn.turn === 1 ? 0 : turn.aiSelectionDrawCount)),
      stoppedEarly: run.stoppedEarly,
      turns: portTurns,
    },
    comparison: {
      verdictToday: pass ? "PASS" : "FAIL",
      romDrawCounts: predictedPostFix.map((turn) => turn.draws.length),
      portDrawCounts: portTurns.map((turn) => turn.draws.length),
      romActiveHp: predictedPostFix.map((turn) => turn.activeHpAtTurnEnd),
      portActiveHp: portTurns.map((turn) => turn.activeHpAtTurnEnd),
      firstDivergence,
    },
    predictedPostFix: {
      note: "The ROM's own turn-execution draws in the port's reason vocabulary: after the fix the kernel must emit exactly this (reason, rngBefore) sequence and these HPs.",
      turns: predictedPostFix,
    },
  };
}

function format(draw: { reason: string; rngBefore: number; value: number } | null | undefined): string {
  return draw ? `${draw.reason} [${draw.value}]` : "-";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  if (!path) throw new Error("usage: verify-rcp143.ts <receipt.json> [--write]");
  const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
  const result = verifyReceipt(receipt);
  for (const [index, expected] of result.predictedPostFix.turns.entries()) {
    const actual = result.port.turns[index];
    console.log(`turn ${expected.turn}: ROM ${expected.draws.length} draws, port ${actual.draws.length}; HP ROM ${JSON.stringify(expected.activeHpAtTurnEnd)} port ${JSON.stringify(actual.activeHpAtTurnEnd)}`);
    for (let position = 0; position < Math.max(expected.draws.length, actual.draws.length); position += 1) {
      const rom = expected.draws[position];
      const port = actual.draws[position];
      const same = rom && port && rom.reason === port.reason && rom.rngBefore === port.rngBefore;
      console.log(`  ${same ? "  " : "!="} ROM ${format(rom).padEnd(72)} PORT ${format(port)}`);
    }
  }
  console.log(`first divergence: ${JSON.stringify(result.comparison.firstDivergence)}`);
  console.log(`${receipt.receipt}: ${result.pass ? "PASS" : "FAIL"} (port vs ROM)`);
  if (process.argv.includes("--write")) {
    const { pass: _pass, ...folded } = result;
    writeFileSync(path, `${JSON.stringify({ ...receipt, ...folded }, null, 1)}\n`);
    console.log(`wrote ${path}`);
  }
  process.exitCode = result.pass ? 0 : 1;
}
