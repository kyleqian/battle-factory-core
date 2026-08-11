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
import {
  CANONICAL_DESTIN_PRESENTATION,
  CANONICAL_JENSON_PRESENTATION,
} from "../src/engine/factoryTrainerPresentation.ts";
import {
  TURN17_OUTCOME_LINE1,
  TURN17_OUTCOME_LINE2,
  TURN17_LOSS_LINE1,
  TURN17_LOSS_LINE2,
} from "../src/engine/battleScene.ts";

/**
 * Terminal-seam increments (i)+(ii) (docs/terminal-seam-round-flow-scout.md
 * §3): `messageLines` (`battleResolutionPresentation.ts`) now resolves
 * `STRINGID_PLAYERDEFEATEDTRAINER1`/`STRINGID_TRAINER1LOSETEXT` off the
 * per-round `opponentTrainer` -- the same `className`/`name`/`speechLose`
 * fields `factoryTrainerPresentationForOpponent` already threads through
 * `factoryRoundBattleOrchestrator.ts`'s `beginCommandResolution`. Uses the
 * "direct resolver-branch" idiom (`presentationStringIntro.test.ts`'s
 * `directResolution`): a synthetic event sequence carrying just the two
 * messageIds the WIN script emits, driven through the real
 * `createBattleResolutionPresentation`/`messageLines` machinery with a real,
 * data-extracted `opponentTrainer` (not a fabricated one) -- proving the
 * resolver, not the driving event source (already covered end-to-end by
 * `factoryRoundBattleOrchestrator.test.ts`'s "retains a terminal boundary"
 * and `battleScriptFaintedActionsOrchestration.test.ts`'s WIN-script pins).
 *
 * Red-verified via `git stash -- src/engine/battleResolutionPresentation.ts`:
 * both `it`s below throw battleStringResolver's exact placeholder-unresolved
 * error pre-fix (`{B_TRAINER1_CLASS}`/no case at all for
 * STRINGID_TRAINER1LOSETEXT, which routes to the generic fallback and
 * crashes on an entirely unhandled id).
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

const PROVENANCE = Object.freeze({
  programCounter: 1,
  opcodeId: 1,
  opcodeName: "test",
  dispatcher: "test",
  sourceLabel: "BattleScript_FrontierTrainerBattleWon",
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

function winTextLines(
  opponentTrainer: Readonly<{ className: string; name: string; speechLose: readonly [string, string] }>,
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
    events: Object.freeze([
      event(0, { kind: "message", messageId: "STRINGID_PLAYERDEFEATEDTRAINER1", substitutions: [] }),
      event(1, { kind: "message", messageId: "STRINGID_TRAINER1LOSETEXT", substitutions: [] }),
    ]),
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
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
    .map((cmd) => cmd.lines);
}

describe("presentation-string terminal-seam win text (increments (i)+(ii), docs/terminal-seam-round-flow-scout.md §3)", () => {
  it("DESTIN fixture: STRINGID_PLAYERDEFEATEDTRAINER1/TRAINER1LOSETEXT resolve to the exact 4 oracle-pinned lines (docs/turn17-notes.md, battleScene.ts's TURN17_* literals)", () => {
    const lines = winTextLines(CANONICAL_DESTIN_PRESENTATION);
    expect(lines).toEqual([
      [TURN17_OUTCOME_LINE1, TURN17_OUTCOME_LINE2],
      [TURN17_LOSS_LINE1, TURN17_LOSS_LINE2],
    ]);
    expect(lines).toEqual([
      ["Player defeated", "BUG CATCHER DESTIN!"],
      ["PLEASE I NEED", "SOME WATER"],
    ]);
  });

  it("second-trainer generalization: JENSON's own facility class/name/speechLose resolve instead -- the mapping is data-driven, not DESTIN-hardcoded", () => {
    const lines = winTextLines(CANONICAL_JENSON_PRESENTATION);
    expect(lines).toEqual([
      ["Player defeated", "FISHERMAN JENSON!"],
      ["I AM THE TRAINER", "WHO IS FEELING DOWNCAST"],
    ]);
  });
});
