// hdl1 (docs/hdl1-head-lines-bike-sprite.md, docs/fcr2-catcher-round2.md finding 2): the Factory Head's end-of-battle lines.
// CopyFrontierBrainText (frontier_util.c:2607-2631) copies sFrontierBrainPlayerLostTexts / sFrontierBrainPlayerWonTexts (:774-785)
// at GetFronterBrainSymbol's tier (:2587-2604): gText_NolandWonSilver / DefeatSilver / WonGold / DefeatGold
// (data/text/frontier_brain.inc:30-44). The engine had empty tuples for him, so he slid in over an empty box. ROM, seed 2 Scene OFF
// played to battle 21 (the Head won): the first glyph of "Way to work!" on 270,814, three frames after his slide-in settles, the last
// of "That was a good lesson, eh?" on 270,852 (39 glyphs in 39 frames), then the box waits for A with no down arrow.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnBattlerConfig,
  type FactoryFullTurnConfig,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import {
  createBattleResolutionPresentation,
  messageCommandTypedRows,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  createBattleState,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  CANONICAL_NOLAND_PRESENTATION,
  factoryTrainerPresentationForOpponent,
  getFactoryTrainerPresentation,
  getFrontierBrainPresentation,
  type FactoryTrainerPresentation,
} from "../src/engine/factoryTrainerPresentation.ts";
import { frontierBrainSymbolTier, getFactoryFrontierBrainStatus } from "../src/engine/frontierBrainStatus.ts";

/** frontier_brain.inc's gText_<label>: its `.string` pieces joined, split at `\n` into the two box lines (`'` is the B4 glyph `’`). */
function romBrainText(label: string): readonly [string, string] {
  const source = readFileSync("reference/pokeemerald/data/text/frontier_brain.inc", "utf8");
  const block = new RegExp(`^gText_${label}::\\n((?:\\t\\.string "[^"]*"\\n)+)`, "m").exec(source);
  if (block === null) throw new Error(`gText_${label} not found`);
  const text = [...block[1]!.matchAll(/\.string "([^"]*)"/g)].map((m) => m[1]!).join("");
  expect(text.endsWith("$")).toBe(true);
  const lines = text.slice(0, -1).replaceAll("'", "’").split("\\n");
  expect(lines.length).toBeLessThanOrEqual(2);
  return [lines[0]!, lines[1] ?? ""];
}

const NOLAND = { id: "factory-trainer-1022", trainerName: "NOLAND" } as const;

describe("hdl1: the Factory Head's end-of-battle lines are the ROM's, by symbol tier", () => {
  it("each tier's two lines are frontier_brain.inc's, Won = his win (the player lost), Defeat = his loss", () => {
    const silver = getFrontierBrainPresentation("silver");
    const gold = getFrontierBrainPresentation("gold");
    expect(silver.speechWin).toEqual(romBrainText("NolandWonSilver"));
    expect(silver.speechLose).toEqual(romBrainText("NolandDefeatSilver"));
    expect(gold.speechWin).toEqual(romBrainText("NolandWonGold"));
    expect(gold.speechLose).toEqual(romBrainText("NolandDefeatGold"));
    // The literal lines, so a wrong parse above cannot pass both sides.
    expect(silver.speechWin).toEqual(["Way to work!", "That was a good lesson, eh?"]);
    expect(silver.speechLose).toEqual(["Good job!", "You know what you’re doing!"]);
    expect(gold.speechWin).toEqual(["Hey, hey, hey!", "You’re finished already?"]);
    expect(gold.speechLose).toEqual(["What happened here?", ""]);
    // Name, class and picture do not depend on the tier.
    const identity = ({ speechWin: _w, speechLose: _l, ...rest }: FactoryTrainerPresentation) => rest;
    expect(identity(gold)).toEqual(identity(silver));
  });

  it("the tier is GetFronterBrainSymbol's: Silver at 21 (first or return), Gold at 42 and every 21 after", () => {
    const at = (winStreak: number, symbolsCount: 0 | 1 | 2) => {
      const status = getFactoryFrontierBrainStatus({ battleMode: "singles", winStreak, symbolsCount });
      if (status === "not-ready") throw new Error(`streak ${winStreak} with ${symbolsCount} symbols is no Head battle`);
      return { status, tier: frontierBrainSymbolTier(status) };
    };
    expect(at(20, 0)).toEqual({ status: "silver", tier: "silver" });
    expect(at(41, 1)).toEqual({ status: "gold", tier: "gold" });
    expect(at(20, 2)).toEqual({ status: "streak", tier: "silver" });
    expect(at(41, 2)).toEqual({ status: "streak-long", tier: "gold" });
    expect(at(62, 2)).toEqual({ status: "streak-long", tier: "gold" });
    expect(getFrontierBrainPresentation("streak")).toBe(getFrontierBrainPresentation("silver"));
    expect(getFrontierBrainPresentation("streak-long")).toBe(getFrontierBrainPresentation("gold"));
  });

  it("a round's Head opponent takes its own battle's tier; the bare id is battle 21's Silver", () => {
    expect(factoryTrainerPresentationForOpponent({ ...NOLAND, frontierBrain: { status: "silver" } }))
      .toBe(getFrontierBrainPresentation("silver"));
    expect(factoryTrainerPresentationForOpponent({ ...NOLAND, frontierBrain: { status: "gold" } }))
      .toBe(getFrontierBrainPresentation("gold"));
    expect(factoryTrainerPresentationForOpponent({ ...NOLAND, frontierBrain: { status: "streak-long" } })!.speechWin)
      .toEqual(["Hey, hey, hey!", "You’re finished already?"]);
    expect(getFactoryTrainerPresentation(1022)).toBe(CANONICAL_NOLAND_PRESENTATION);
    expect(CANONICAL_NOLAND_PRESENTATION).toBe(getFrontierBrainPresentation("silver"));
    // A generated Head without its status (or an ordinary trainer with one) would pick a tier by accident: refused.
    expect(() => factoryTrainerPresentationForOpponent(NOLAND)).toThrow(/has no Frontier Brain status/);
    expect(() => factoryTrainerPresentationForOpponent({ id: "factory-trainer-50", trainerName: "DESTIN", frontierBrain: { status: "silver" } }))
      .toThrow(/has a Frontier Brain status/);
  });
});

// The resolver path (presentationStringTerminalSeamLoss.test.ts's idiom): one STRINGID_TRAINER1WINTEXT / TRAINER1LOSETEXT event
// through createBattleResolutionPresentation with the Head as the frozen opponent trainer.
const MOVE_TACKLE = 33;
const BATTLER: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 12,
  moveId: MOVE_TACKLE,
  moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
  pp: [35, 35, 35, 35] as const,
  ability: 0,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 60,
  spDefense: 60,
  speed: 60,
  hp: 200,
  maxHp: 200,
  types: ["TYPE_BUG", "TYPE_FLYING"] as const,
});

function terminalMessages(messageId: string, opponentTrainer: FactoryTrainerPresentation) {
  const config: FactoryFullTurnConfig = Object.freeze({ requestId: 1, rngSeed: 1, player: BATTLER, trainer: BATTLER });
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required" || initial.boundary.request.kind !== "command") {
    throw new Error("fixture has no source command");
  }
  const nextRequest = initial.boundary.request;
  const state = createBattleState({ rules: initial.rules, rngSeed: 9, request: nextRequest });
  const event: BattleKernelSemanticEvent = Object.freeze({
    sequence: 0,
    payload: Object.freeze({ kind: "message" as const, messageId, substitutions: [] }),
    provenance: Object.freeze({
      programCounter: 1,
      opcodeId: 1,
      opcodeName: "test",
      dispatcher: "test",
      sourceLabel: "BattleScript_LocalBattleLost",
      sourceStatementLine: 1,
      instructionExecution: 1,
    }),
  });
  const transition = Object.freeze({
    kind: "decision-required" as const,
    state,
    events: Object.freeze([event]),
    nextRequest,
  }) as BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>;
  const command = createBattleCommandPresentation(nextRequest, initial.rules.rulesContext, 0);
  const resolution = createBattleResolutionPresentation({
    sourceRequest: nextRequest,
    sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    beforeRules: initial.rules,
    transition,
    fieldBoundary: command.field,
    confirmHandoff: { fightDisplayCursor: 0, idleBounceElapsed: 0 },
    opponentTrainer,
  });
  return resolution.segments
    .flatMap((segment) => segment.commands)
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message");
}

describe("hdl1: the Head's line prints and waits like the ROM's", () => {
  it("Silver, the Head won: 'Way to work!' / 'That was a good lesson, eh?', 39 glyph rows, an A wait with no arrow", () => {
    const [message, ...rest] = terminalMessages("STRINGID_TRAINER1WINTEXT", getFrontierBrainPresentation("silver"));
    expect(rest).toEqual([]);
    expect(message!.lines).toEqual(["Way to work!", "That was a good lesson, eh?"]);
    // ROM 270,814 .. 270,852: one glyph a frame, the line break free.
    expect(messageCommandTypedRows(message!)).toBe(39);
    expect([message!.advance, message!.noCursor]).toEqual(["button", true]);
  });

  it("Silver, the player won: 'Good job!' / 'You know what you’re doing!'", () => {
    const [message] = terminalMessages("STRINGID_TRAINER1LOSETEXT", getFrontierBrainPresentation("silver"));
    expect(message!.lines).toEqual(["Good job!", "You know what you’re doing!"]);
    expect(messageCommandTypedRows(message!)).toBe(9 + 27);
    expect([message!.advance, message!.noCursor]).toEqual(["button", true]);
  });

  it("Gold: 'Hey, hey, hey!' / 'You’re finished already?' when he wins, 'What happened here?' alone when he loses", () => {
    const [won] = terminalMessages("STRINGID_TRAINER1WINTEXT", getFrontierBrainPresentation("gold"));
    expect(won!.lines).toEqual(["Hey, hey, hey!", "You’re finished already?"]);
    const [lost] = terminalMessages("STRINGID_TRAINER1LOSETEXT", getFrontierBrainPresentation("streak-long"));
    expect(lost!.lines).toEqual(["What happened here?", ""]);
    expect(messageCommandTypedRows(lost!)).toBe(19);
  });
});
