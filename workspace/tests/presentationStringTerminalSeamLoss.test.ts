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

/**
 * Terminal-seam increment (i) LOSS half
 * (`docs/terminal-seam-loss-path-ground-truth.md` §5 item 3): `messageLines`
 * (`battleResolutionPresentation.ts`) now resolves `STRINGID_TRAINER1WINTEXT`
 * off the per-round `opponentTrainer.speechWin` -- the exact mirror of
 * `presentationStringTerminalSeamWin.test.ts`'s own `STRINGID_TRAINER1LOSETEXT`
 * pin, same "direct resolver-branch" idiom
 * (`presentationStringIntro.test.ts`'s `directResolution`): a synthetic event
 * sequence carrying just the one messageId `BattleScript_LocalBattleLost`
 * emits, driven through the real `createBattleResolutionPresentation`/
 * `messageLines` machinery with a real, data-extracted `opponentTrainer` --
 * proving the resolver, not the driving event source (already covered
 * end-to-end by `factoryBattleScriptFullTurnDecision.test.ts`'s own staged
 * kill-shot LOSS pin and `battleScriptFaintedActionsOrchestration.test.ts`'s
 * LOSS-script pins).
 *
 * Red-verified via `git stash -- src/engine/battleResolutionPresentation.ts`:
 * both `it`s below throw battleStringResolver's exact placeholder-unresolved
 * error pre-fix (no case at all for STRINGID_TRAINER1WINTEXT, which routes to
 * the generic fallback and crashes on an entirely unhandled id).
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
  sourceLabel: "BattleScript_LocalBattleLost",
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
  opponentTrainer: Readonly<{ className: string; name: string; speechLose: readonly [string, string]; speechWin?: readonly [string, string] }>,
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
      event(0, { kind: "message", messageId: "STRINGID_TRAINER1WINTEXT", substitutions: [] }),
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

describe("presentation-string terminal-seam loss text (increment (i) LOSS half, docs/terminal-seam-loss-path-ground-truth.md)", () => {
  it("DESTIN fixture: STRINGID_TRAINER1WINTEXT resolves to the exact pixel-confirmed quote (docs/terminal-seam-loss-path-ground-truth.md §2(b): \"I AM ABOUT TO OVERHEAT\")", () => {
    const lines = winTextLines(CANONICAL_DESTIN_PRESENTATION);
    expect(lines).toEqual([
      ["I AM ABOUT TO", "OVERHEAT"],
    ]);
  });

  it("second-trainer generalization: JENSON's own speechWin resolves instead -- the mapping is data-driven, not DESTIN-hardcoded", () => {
    const lines = winTextLines(CANONICAL_JENSON_PRESENTATION);
    expect(lines).toEqual([
      ["YOUR POKéMON DON’T", "MAKE THE CUT"],
    ]);
  });
});
