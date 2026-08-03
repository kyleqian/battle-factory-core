import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  type FactoryFullTurnConfig,
  type FactoryFullTurnBattlerConfig,
  type FactoryFullTurnDecisionRules,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import {
  createBattleState,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
} from "../src/engine/battleDecisionBoundary.ts";

/**
 * ISSUES #70's `STRINGID_INTROSENDOUT` extractor gap, consumption half:
 * `messageLines` (`battleResolutionPresentation.ts`) now reads
 * `src/data/battleIntroStrings.ts`'s hand-mapped table for ids 0/1/2/5
 * (`STRINGID_INTROMSG`/`_INTROSENDOUT`/`_RETURNMON`/`_BATTLEEND`) instead of
 * the extracted stringTable, which cannot carry ids below
 * `BATTLESTRINGS_TABLE_START=12`.
 *
 * No engine path emits any of these 4 ids yet (ISSUES #71 owns the live
 * send-out seam) -- every case below uses the "direct resolver-branch"
 * idiom (synthetic event straight into `createBattleResolutionPresentation`,
 * the batch-3 row-40 zero-incidence pattern), the only idiom available for
 * an id with no live emitter to stage a full-turn repro through.
 *
 * Red-verified once via `git stash` on the two touched engine files
 * (battleResolutionPresentation.ts's 4 new messageLines branches,
 * battleScriptEvents.ts's introBattler/introHpScale/introOutcome payload
 * fields): every `it` below threw battleStringResolver's exact
 * completeness-guard error pre-fix (`unknown battle string id
 * STRINGID_...`), since none of these 4 ids exist in the extracted table's
 * BY_SYMBOL map at all.
 */

const MOVE_TACKLE = 33;

const ABILITY_NONE = 0;

const PLAYER_BASE: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 12, // BUTTERFREE
  moveId: MOVE_TACKLE,
  moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
  pp: [35, 35, 35, 35] as const,
  ability: ABILITY_NONE,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 80,
  spDefense: 80,
  speed: 120,
  hp: 200,
  maxHp: 200,
  types: ["TYPE_BUG", "TYPE_FLYING"] as const,
});

const TRAINER_BASE: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 198, // MURKROW
  moveId: MOVE_TACKLE,
  moves: [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE] as const,
  pp: [35, 35, 35, 35] as const,
  ability: ABILITY_NONE,
  item: 0,
  friendship: 0,
  attack: 60,
  defense: 60,
  spAttack: 60,
  spDefense: 60,
  speed: 60,
  hp: 200,
  maxHp: 200,
  types: ["TYPE_DARK", "TYPE_FLYING"] as const,
});

const OPPONENT_TRAINER = Object.freeze({ className: "YOUNGSTER", name: "TODD" });

const PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "test",
  dispatcher: "test",
  sourceLabel: "BattleScript_Test",
  sourceStatementLine: 1,
  instructionExecution: 1,
});

function event(
  sequence: number,
  payload: BattleKernelSemanticEvent["payload"],
): BattleKernelSemanticEvent {
  return Object.freeze({
    sequence,
    payload: Object.freeze(payload),
    provenance: Object.freeze(PROVENANCE),
  });
}

/** The "direct resolver-branch" idiom (batch 3 row 40) -- the only idiom available for these 4 never-emitted ids. */
function directResolution(
  events: readonly BattleKernelSemanticEvent[],
  opponentTrainer: Readonly<{ className: string; name: string }> | null,
) {
  const config: FactoryFullTurnConfig = Object.freeze({
    requestId: 1,
    rngSeed: 1,
    player: PLAYER_BASE,
    trainer: TRAINER_BASE,
  });
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required" || initial.boundary.request.kind !== "command") {
    throw new Error("fixture has no source command");
  }
  const nextRequest = initial.boundary.request;
  const state = createBattleState({ rules: initial.rules, rngSeed: 9, request: nextRequest });
  const transition = Object.freeze({
    kind: "decision-required" as const,
    state,
    events: Object.freeze(events),
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
  const lines = resolution.segments
    .flatMap((segment) => segment.commands)
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
    .map((cmd) => cmd.lines);
  return { lines };
}

describe("presentation-string intro (ISSUES #70 STRINGID_INTROSENDOUT extractor-gap consumption)", () => {
  it("STRINGID_INTROMSG (id 0): trainer's opening line reads opponentTrainer", () => {
    const { lines } = directResolution(
      [event(0, { kind: "message", messageId: "STRINGID_INTROMSG", substitutions: [] })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["YOUNGSTER TODD", "would like to battle!"]);
  });

  it("STRINGID_INTROSENDOUT (id 1), player branch (introBattler 0): 'Go! BUTTERFREE!'", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_INTROSENDOUT",
        substitutions: [],
        introBattler: 0,
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["Go! BUTTERFREE!"]);
  });

  it("STRINGID_INTROSENDOUT (id 1), opponent branch (introBattler 1): trainer sends out MURKROW", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_INTROSENDOUT",
        substitutions: [],
        introBattler: 1,
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["YOUNGSTER TODD sent", "out MURKROW!"]);
  });

  it("STRINGID_RETURNMON (id 2), player branch, hpScale 0: 'BUTTERFREE, that’s enough!'", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_RETURNMON",
        substitutions: [],
        introBattler: 0,
        introHpScale: 0,
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["BUTTERFREE, that’s enough!", "Come back!"]);
  });

  it("STRINGID_RETURNMON (id 2), player branch, hpScale 1: 'BUTTERFREE, come back!'", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_RETURNMON",
        substitutions: [],
        introBattler: 0,
        introHpScale: 1,
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["BUTTERFREE, come back!"]);
  });

  it("STRINGID_RETURNMON (id 2), player branch, hpScale 2: 'BUTTERFREE, OK!'", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_RETURNMON",
        substitutions: [],
        introBattler: 0,
        introHpScale: 2,
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["BUTTERFREE, OK!", "Come back!"]);
  });

  it("STRINGID_RETURNMON (id 2), player branch, hpScale 3: 'BUTTERFREE, good!'", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_RETURNMON",
        substitutions: [],
        introBattler: 0,
        introHpScale: 3,
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["BUTTERFREE, good!", "Come back!"]);
  });

  it("STRINGID_RETURNMON (id 2), opponent branch: trainer withdraws MURKROW", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_RETURNMON",
        substitutions: [],
        introBattler: 1,
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["YOUNGSTER TODD", "withdrew MURKROW!"]);
  });

  it("STRINGID_BATTLEEND (id 5), player-win outcome: 'Player defeated TODD!'", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_BATTLEEND",
        substitutions: [],
        introOutcome: "player-win",
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["Player defeated", "TODD!"]);
  });

  it("STRINGID_BATTLEEND (id 5), trainer-win outcome: 'Player lost against TODD!'", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_BATTLEEND",
        substitutions: [],
        introOutcome: "trainer-win",
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["Player lost against", "TODD!"]);
  });

  it("STRINGID_BATTLEEND (id 5), draw outcome: 'Player battled to a draw against TODD!'", () => {
    const { lines } = directResolution(
      [event(0, {
        kind: "message",
        messageId: "STRINGID_BATTLEEND",
        substitutions: [],
        introOutcome: "draw",
      })],
      OPPONENT_TRAINER,
    );
    expect(lines).toContainEqual(["Player battled to a draw against", "TODD!"]);
  });
});
