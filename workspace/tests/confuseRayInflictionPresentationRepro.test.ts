import { describe, it, expect } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { createBattleResolutionPresentation } from "../src/engine/battleResolutionPresentation.ts";

/**
 * ISSUES #76 repro: a same-day user report. Rental HAUNTER used CONFUSE_RAY
 * against MURKROW in a live battle and the app hard-crashed. The app computes
 * a full turn synchronously at click, so the throw window spans HAUNTER's
 * own CONFUSE_RAY execution. CONFUSE_RAY is move 109 (EFFECT_CONFUSE).
 *
 * Root cause (same class as #68, tests/murkrowTormentSubjectedPresentation
 * Repro.test.ts): `BattleScript_EffectConfuse`'s own success tail calls
 * `BattleScript_MoveEffectConfusion`, whose `printstring
 * STRINGID_PKMNWASCONFUSED` (reference/pokeemerald/data/battle_scripts_1.s:
 * 3932-3936) resolves `sText_PkmnWasConfused` (battle_message.c:116,574:
 * "{B_EFF_NAME_WITH_PREFIX} became\nconfused!"). Confusion is a STATUS2 write
 * (applyConfusionStatus2Mutation, battleScriptHitChainOpcode.ts) that emits NO
 * `set-battler-status-data` event (unlike the status1 infliction quartet, which
 * does and therefore resolve via the generic fallback's
 * pendingStatusMessageBattler bridge). So battleResolutionPresentation.ts's
 * generic fallback never supplies {B_EFF_NAME_WITH_PREFIX} and
 * battleStringResolver.ts's completeness guard throws.
 */
const SCENARIO: FactoryFullTurnConfig = Object.freeze({
  requestId: 1,
  rngSeed: 1,
  player: Object.freeze({
    species: 93, // HAUNTER
    moveId: 109, // CONFUSE_RAY
    moves: [109, 33, 0, 0] as const, // CONFUSE_RAY, TACKLE
    pp: [10, 35, 0, 0] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 50,
    defense: 55,
    spAttack: 115,
    spDefense: 55,
    speed: 100, // faster than MURKROW so the player acts first this turn
    hp: 100,
    maxHp: 100,
    types: ["TYPE_GHOST", "TYPE_POISON"] as const,
  }),
  trainer: Object.freeze({
    species: 198, // MURKROW
    moveId: 44, // PECK
    moves: [44, 44, 44, 44] as const,
    pp: [35, 35, 35, 35] as const,
    ability: 0,
    item: 0,
    friendship: 0,
    attack: 91,
    defense: 69,
    spAttack: 91,
    spDefense: 69,
    speed: 97,
    hp: 142,
    maxHp: 142,
    types: ["TYPE_DARK", "TYPE_FLYING"] as const,
  }),
});

function runConfuseRayTurn() {
  const initial = createFactoryFullTurnBattleState(SCENARIO);
  if (initial.boundary.kind !== "decision-required") {
    throw new Error("expected the player's command boundary");
  }
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected the trainer's command boundary");
  }
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  return { initial, transition };
}

describe("HAUNTER CONFUSE_RAY infliction presentation (ISSUES #76)", () => {
  it("resolves the STRINGID_PKMNWASCONFUSED banner through the production resolution presentation path instead of throwing", () => {
    const { initial, transition } = runConfuseRayTurn();
    if (initial.boundary.kind !== "decision-required") {
      throw new Error("expected the player's command boundary");
    }
    const sourceRequest = initial.boundary.request;
    if (sourceRequest.kind !== "command") {
      throw new Error("expected the player's command request");
    }

    const messageIds = transition.events
      .filter((event) => event.payload.kind === "message")
      .map((event) => (event.payload as { messageId: string }).messageId);
    expect(messageIds).toContain("STRINGID_PKMNWASCONFUSED");
    expect(transition.state.rules.rulesContext.battlers[1].status2 & 0x7).toBeGreaterThan(0);

    const command = createBattleCommandPresentation(
      sourceRequest,
      initial.rules.rulesContext,
      0,
    );

    // Throws before the fix: "battleStringResolver:
    // STRINGID_PKMNWASCONFUSED references placeholder
    // {B_EFF_NAME_WITH_PREFIX} with no resolver supplied".
    const resolution = createBattleResolutionPresentation({
      sourceRequest,
      sourceDecision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      beforeRules: initial.rules,
      transition,
      fieldBoundary: command.field,
      confirmHandoff: {
        fightDisplayCursor: command.fightDisplayCursor,
        idleBounceElapsed: command.idleBounceElapsed,
      },
      opponentTrainer: null,
    });

    const lines = resolution.segments
      .flatMap((segment) => segment.commands)
      .filter((cmd): cmd is Extract<typeof cmd, { type: "message" }> => cmd.type === "message")
      .map((cmd) => cmd.lines);

    // MURKROW (the opponent, prefixed "Foe ") is CONFUSE_RAY's target -- the
    // gEffectBattler {B_EFF_NAME_WITH_PREFIX} reads at print time.
    expect(lines).toContainEqual(["Foe MURKROW became", "confused!"]);
  });
});
