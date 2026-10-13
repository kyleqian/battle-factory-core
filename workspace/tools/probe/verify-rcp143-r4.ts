/**
 * STEP rcp143 R4 PASS/FAIL verifier (ISSUES #139, Focus Punch pre-pass).
 *
 *   node --experimental-strip-types tools/probe/verify-rcp143-r4.ts [receipt.json] [--write]
 *
 * Reruns both Scene OFF arms (Focus Punch, control) through the full-turn
 * kernel at HEAD, seeded with the ROM's gRngValue before its first turn-1
 * draw, and compares (a) the turn-1 message order up to the player's own
 * "used <move>!" box and (b) every Random() draw the ROM window recorded.
 * PASS iff both match on both arms. Before the #139 fix this is EXPECTED to
 * FAIL on the Focus Punch arm's messages only (the ROM spends no RNG in the
 * pre-pass, so the draw sequences already agree); the control arm must PASS
 * today and after the fix.
 *
 * `--write` folds `port`, `comparison` and `predictedPostFix` (today's port
 * event order with the pre-pass's three events in front of action 1) into
 * the receipt.
 */
import { readFileSync, writeFileSync } from "node:fs";
import speciesTypes from "../../src/data/gen/species-types.json" with { type: "json" };
import { runPortTurns, type PortEvent } from "./rcp143PortDriver.ts";
import { romReason } from "./verify-rcp143.ts";

const RECEIPT = "tools/probe/receipts/rcp143-r4-focuspunch-prepass.json";

/** Battle Scene OFF box text (gDisplayedStringBattle) -> the port's message id. */
const ROM_TEXT_TO_MESSAGE_ID: Readonly<Record<string, string>> = Object.freeze({
  "": "STRINGID_EMPTYSTRING3",
  "BRELOOM is tightening\nits focus!": "STRINGID_PKMNTIGHTENINGFOCUS",
  "Foe JOLTEON used\nSAND-ATTACK!": "STRINGID_USEDMOVE",
  "BRELOOM’s accuracy\nfell!": "STRINGID_DEFENDERSSTATFELL",
  "BRELOOM used\nFOCUS PUNCH!": "STRINGID_USEDMOVE",
  "BRELOOM used\nGIGA DRAIN!": "STRINGID_USEDMOVE",
});

/** The pre-pass's own events, in BattleScript_FocusPunchSetUp order (battle_scripts_1.s:3709-3715). */
export const PRE_PASS_EVENTS: readonly Omit<PortEvent, "turn">[] = Object.freeze([
  { kind: "message", id: "STRINGID_EMPTYSTRING3" },
  { kind: "animation", id: "FOCUS_PUNCH_SETUP" },
  { kind: "message", id: "STRINGID_PKMNTIGHTENINGFOCUS" },
]);

type Mon = Readonly<{
  species: number; item: number; ability: number; moves: [number, number, number, number]; hp: number; maxHp: number;
  personality: number; stats: Readonly<{ attack: number; defense: number; speed: number; spAttack: number; spDefense: number }>;
}>;
type Arm = Readonly<{
  arm: string; oracleProfile: string; parties: Readonly<{ player: readonly Mon[]; opponent: readonly Mon[] }>;
  messages: readonly Readonly<{ frame: number; text: string }>[];
  draws: readonly Readonly<{ frame: number; caller: string; rngBefore: number; value: number }>[];
}>;
type Receipt = Record<string, unknown> & Readonly<{ arms: readonly Arm[] }>;

function battler(mon: Mon) {
  const entry = speciesTypes.species[mon.species - 1];
  return {
    species: mon.species, moveId: mon.moves[0], moves: mon.moves, ability: mon.ability, item: mon.item,
    personality: mon.personality, attack: mon.stats.attack, defense: mon.stats.defense, spAttack: mon.stats.spAttack,
    spDefense: mon.stats.spDefense, speed: mon.stats.speed, hp: mon.hp, maxHp: mon.maxHp,
    types: [entry.types[0], entry.types[1]] as const,
  };
}

/** ROM box order through the player's own "used <move>!" box. */
function romMessageIds(arm: Arm): string[] {
  const ids: string[] = [];
  for (const message of arm.messages) {
    ids.push(ROM_TEXT_TO_MESSAGE_ID[message.text] ?? `UNMAPPED ${JSON.stringify(message.text)}`);
    if (message.text.startsWith("BRELOOM used")) break;
  }
  return ids;
}

export function verifyArm(arm: Arm, playerMoveSlot: 0 | 2) {
  const [player] = arm.parties.player;
  const [opponent] = arm.parties.opponent;
  const run = runPortTurns(
    { requestId: 1, rngSeed: arm.draws[0].rngBefore, player: battler(player), trainer: battler(opponent) },
    [{ injectAiDraws: 0, playerMoveSlot, playerTargetBattler: 1 }],
  );
  const romIds = romMessageIds(arm);
  const portEvents = run.events.filter((event) => event.kind === "message" || event.kind === "animation");
  const portIds = run.events.filter((event) => event.kind === "message").map((event) => String(event.id)).slice(0, romIds.length);
  // The kernel never runs the Factory AI (the trainer decision is its input), so
  // the ROM's next-turn AI-selection draws are not compared.
  const romDraws = arm.draws.filter((draw) => !/^(BattleAI_|ChooseMoveOrAction)/.test(draw.caller)).map((draw) => ({ reason: romReason({ caller: draw.caller, callerFunction: draw.caller.split("+")[0] }), rngBefore: draw.rngBefore }));
  const portDraws = run.draws.filter((draw) => draw.kind === "port").slice(0, romDraws.length)
    .map(({ reason, rngBefore }) => ({ reason, rngBefore }));
  const messagesMatch = JSON.stringify(romIds) === JSON.stringify(portIds);
  const drawsMatch = JSON.stringify(romDraws) === JSON.stringify(portDraws);
  const firstUsedMove = portEvents.findIndex((event) => event.id === "STRINGID_USEDMOVE");
  const predicted = playerMoveSlot === 2
    ? [...portEvents.slice(0, firstUsedMove), ...PRE_PASS_EVENTS, ...portEvents.slice(firstUsedMove)]
    : portEvents;
  return {
    arm: arm.arm,
    pass: messagesMatch && drawsMatch,
    romMessageIds: romIds,
    portMessageIds: portIds,
    messagesMatch,
    romDraws,
    portDraws,
    drawsMatch,
    portEventsToday: portEvents.map(({ kind, id }) => ({ kind, id })),
    predictedPostFixEvents: predicted.map(({ kind, id }) => ({ kind, id })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv.find((arg, index) => index >= 2 && arg.endsWith(".json")) ?? RECEIPT;
  const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
  const results = (["off-focus-punch", "off-control"] as const).map((name) => {
    const arm = receipt.arms.find((candidate) => candidate.arm === name);
    if (!arm) throw new Error(`receipt has no arm ${name}`);
    return verifyArm(arm, name === "off-focus-punch" ? 2 : 0);
  });
  for (const result of results) {
    console.log(`${result.arm}: messages ${result.messagesMatch ? "match" : "DIFFER"}, draws ${result.drawsMatch ? "match" : "DIFFER"}`);
    console.log(`  ROM : ${result.romMessageIds.join(" > ")}`);
    console.log(`  PORT: ${result.portMessageIds.join(" > ")}`);
    console.log(`  draws ROM ${result.romDraws.map((draw) => draw.reason).join(", ")}`);
    console.log(`  draws PORT ${result.portDraws.map((draw) => draw.reason).join(", ")}`);
  }
  const pass = results.every((result) => result.pass);
  console.log(`R4: ${pass ? "PASS" : "FAIL"} (port vs ROM)`);
  if (process.argv.includes("--write")) {
    const folded = {
      ...receipt,
      port: {
        kernel: "src/engine/factoryBattleScriptFullTurnDecision.ts reduceFactoryFullTurnDecision via tools/probe/rcp143PortDriver.ts",
        arms: results.map(({ arm, portMessageIds, portDraws, portEventsToday }) => ({ arm, portMessageIds, portDraws, portEventsToday })),
      },
      comparison: {
        verdictToday: pass ? "PASS" : "FAIL",
        arms: results.map(({ arm, pass: armPass, messagesMatch, drawsMatch, romMessageIds }) => ({ arm, verdictToday: armPass ? "PASS" : "FAIL", messagesMatch, drawsMatch, romMessageIds })),
      },
      predictedPostFix: {
        note: "Focus Punch arm: today's port events with BattleScript_FocusPunchSetUp's three events in front of action 1 (no RNG moves). Control arm: unchanged.",
        arms: results.map(({ arm, predictedPostFixEvents }) => ({ arm, events: predictedPostFixEvents })),
      },
    };
    writeFileSync(path, `${JSON.stringify(folded, null, 1)}\n`);
    console.log(`wrote ${path}`);
  }
  process.exitCode = pass ? 0 : 1;
}
