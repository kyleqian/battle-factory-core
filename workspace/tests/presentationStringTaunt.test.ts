import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnBattlerConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleCommandDecision, BattleCommandRequest } from "../src/engine/battleDecisionBoundary.ts";

/**
 * Same-day user-reported crash (live preview build 3a1e1d8b): an opponent
 * MURKROW landing TAUNT threw battleStringResolver's completeness guard --
 * "STRINGID_PKMNFELLFORTAUNT references placeholder {B_DEF_NAME_WITH_PREFIX}
 * with no resolver supplied". This is the same extractor-blind-spot class as
 * ISSUES #70's STRINGID_PKMNHURTBY: the extracted template exists
 * (src/data/gen/battle-message-templates.json), but battleResolutionPresentation.ts's
 * messageLines never had a branch for it, because the emission comes from
 * Taunt's own parsed battle-script program (BattleScript_EffectTaunt's
 * `printstring STRINGID_PKMNFELLFORTAUNT`), not a TS literal the #70 sweep
 * regex could see. Red-verified via `git stash -- src/engine/battleResolutionPresentation.ts`
 * (throws the exact guard error above pre-fix).
 *
 * MURKROW+TAUNT is a real legal Factory rental set --
 * src/data/gen/battle-frontier-mons.json FRONTIER_MON_MURKROW_1 (index 184):
 * moves FAINT_ATTACK/FLY/TORMENT/TAUNT.
 */

const MOVE_TAUNT = 269;
const MOVE_SPLASH = 150;

const PLAYER_BASE: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 12, // BUTTERFREE
  moveId: MOVE_SPLASH,
  attack: 60,
  defense: 60,
  spAttack: 80,
  spDefense: 80,
  speed: 60, // slower than MURKROW, so the taunt lands on this turn's target read
  hp: 200,
  maxHp: 200,
  types: ["TYPE_BUG", "TYPE_FLYING"] as const,
});

// FRONTIER_MON_MURKROW_1 (battle-frontier-mons.json index 184): a real
// legal opponent set carrying TAUNT.
const TRAINER_MURKROW: FactoryFullTurnBattlerConfig = Object.freeze({
  species: 198, // MURKROW
  moveId: MOVE_TAUNT,
  attack: 60,
  defense: 60,
  spAttack: 85,
  spDefense: 60,
  speed: 91,
  hp: 190,
  maxHp: 190,
  types: ["TYPE_DARK", "TYPE_FLYING"] as const,
});

const AT = (battler: 0 | 1): BattleCommandDecision =>
  Object.freeze({ kind: "use-move", moveSlot: 0, targetBattler: battler });

function runFullTurn(
  config: FactoryFullTurnConfig,
  playerDecision: BattleCommandDecision,
  trainerDecision: BattleCommandDecision,
) {
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required") {
    throw new Error("expected the player's command boundary");
  }
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: playerDecision,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected the trainer's command boundary");
  }
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: trainerDecision,
  });

  const command = createBattleCommandPresentation(
    initial.boundary.request as BattleCommandRequest,
    initial.rules.rulesContext,
    0,
  );
  const resolution = createBattleResolutionPresentation({
    sourceRequest: initial.boundary.request as BattleCommandRequest,
    sourceDecision: playerDecision,
    beforeRules: initial.rules,
    transition,
    fieldBoundary: command.field,
    confirmHandoff: {
      fightDisplayCursor: command.fightDisplayCursor,
      idleBounceElapsed: command.idleBounceElapsed,
    },
    opponentTrainer: null,
  });

  const messageIds = transition.events
    .filter((event) => event.payload.kind === "message")
    .map((event) => (event.payload as { messageId: string }).messageId);
  const lines = resolution.segments
    .flatMap((segment) => segment.commands)
    .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
    .map((cmd) => cmd.lines);

  return { messageIds, lines, field: command.field };
}

describe("presentation-string STRINGID_PKMNFELLFORTAUNT (same-day user-reported crash)", () => {
  it("an opponent MURKROW's TAUNT resolves the taunted (player) battler's own name, not the guard throw", () => {
    const config: FactoryFullTurnConfig = Object.freeze({
      requestId: 1,
      rngSeed: 1,
      player: PLAYER_BASE,
      trainer: TRAINER_MURKROW,
    });
    // Both decisions carry the ABSOLUTE target battler index (matching
    // factoryBattleScriptTauntFullTurn.test.ts's TRAINER_SPLASH precedent):
    // the player's own Splash self-targets battler 0, and MURKROW's Taunt
    // targets the player at battler 0 too.
    const { messageIds, lines, field } = runFullTurn(config, AT(0), AT(0));

    expect(messageIds).toContain("STRINGID_PKMNFELLFORTAUNT");
    expect(lines).toContainEqual([`${field.player.name} fell for`, "the TAUNT!"]);

    // MURKROW is faster (speed 91 vs. 60), so its Taunt lands before the
    // player's own Splash executes this same turn -- the player's Splash is
    // then rejected by the same attack canceler
    // (advanceBattleScriptAttackCancelerTaunted), a second, sibling
    // presentation gap (STRINGID_PKMNCANTUSEMOVETAUNT, {B_ACTIVE_NAME_WITH_
    // PREFIX}/{B_CURRENT_MOVE}) found via this exact real-world scenario.
    expect(messageIds).toContain("STRINGID_PKMNCANTUSEMOVETAUNT");
    expect(lines).toContainEqual([
      `${field.player.name} can’t use`,
      "SPLASH after the TAUNT!",
    ]);
  });
});
