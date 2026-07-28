import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const TAUNT = 269;
const SPLASH = 150;
const TACKLE = 33;
const SLEEP_TALK = 214;

const PLAYER_TAUNT = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const PLAYER_SLEEP_TALK = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 1 as const,
  targetBattler: 1 as const,
});
const TRAINER_SPLASH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const TRAINER_TACKLE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 1 as const,
  targetBattler: 0 as const,
});

function config(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 1,
    player: {
      species: 198,
      moveId: TAUNT,
      moves: [TAUNT, SLEEP_TALK, 0, 0],
      pp: [20, 10, 0, 0],
      attack: 50,
      defense: 500,
      spAttack: 50,
      spDefense: 500,
      speed: 100,
      hp: 1000,
      types: ["TYPE_DARK", "TYPE_FLYING"],
    },
    trainer: {
      species: 242,
      moveId: SPLASH,
      moves: [SPLASH, TACKLE, 0, 0],
      pp: [40, 35, 0, 0],
      attack: 10,
      defense: 500,
      spAttack: 10,
      spDefense: 500,
      speed: 50,
      hp: 1000,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    },
  };
}

function commandDecisions(
  request: Extract<
    ReturnType<typeof submitFactoryFullTurnDecision>,
    { kind: "decision-required" }
  >["nextRequest"],
) {
  if (request.kind !== "command") {
    throw new Error("expected command request");
  }
  return request.legalDecisions;
}

describe("Factory full-turn Taunt admission and expiry", () => {
  it(
    "orders Taunt PP/message work, rejects the target's already-collected status action through the "
      + "shared canceler, masks status selection while timer=1, and restores it after 1->0",
    () => {
      const initial = createFactoryFullTurnBattleState(config());
      const afterPlayerTaunt = submitFactoryFullTurnDecision(initial, {
        requestId: 1,
        side: "player",
        decision: PLAYER_TAUNT,
      });
      if (afterPlayerTaunt.kind !== "decision-required") {
        throw new Error("expected trainer command after Taunt selection");
      }
      // Source collects both actions before either executes, so Splash is
      // legal here; the faster Taunt then activates before Splash's action.
      expect(commandDecisions(afterPlayerTaunt.nextRequest)).toEqual([
        TRAINER_SPLASH,
        TRAINER_TACKLE,
      ]);

      const afterTauntTurn = submitFactoryFullTurnDecision(
        afterPlayerTaunt.state,
        {
          requestId: 2,
          side: "trainer",
          decision: TRAINER_SPLASH,
        },
      );
      if (afterTauntTurn.kind !== "decision-required") {
        throw new Error("expected fresh player command after Taunt turn");
      }
      const firstRules = afterTauntTurn.state.rules.rulesContext;
      expect(firstRules.battlers[0].pp).toEqual([19, 10, 0, 0]);
      // The target's attack-canceler fires before ppreduce.
      expect(firstRules.battlers[1].pp).toEqual([40, 35, 0, 0]);
      // Cmd_settaunt wrote 2; the same turn's ENDTURN_TAUNT pass made it 1.
      expect(firstRules.battlers[1].tauntTimer).toBe(1);

      const eventKinds = afterTauntTurn.events.map(({ payload }) =>
        payload.kind === "message"
          ? `${payload.kind}:${payload.messageId}`
          : payload.kind
      );
      expect(eventKinds).toEqual([
        "message:STRINGID_USEDMOVE",
        "set-battler-pp-data",
        "animation",
        "message:STRINGID_PKMNFELLFORTAUNT",
        "set-battler-sprite-visibility",
        "set-battler-sprite-visibility",
        "message:STRINGID_PKMNCANTUSEMOVETAUNT",
        "set-battler-sprite-visibility",
      ]);
      const blockedMessage = afterTauntTurn.events.find(({ payload }) =>
        payload.kind === "message"
        && payload.messageId === "STRINGID_PKMNCANTUSEMOVETAUNT"
      );
      expect(blockedMessage).toMatchObject({
        provenance: { sourceLabel: "BattleScript_MoveUsedIsTaunted" },
      });
      expect(afterTauntTurn.events.some(({ payload }) =>
        payload.kind === "set-battler-pp-data"
        && payload.battler === 1
      )).toBe(false);

      const afterPlayerSecondTurn = submitFactoryFullTurnDecision(
        afterTauntTurn.state,
        {
          requestId: 3,
          side: "player",
          decision: PLAYER_SLEEP_TALK,
        },
      );
      if (afterPlayerSecondTurn.kind !== "decision-required") {
        throw new Error("expected trainer command while Taunt remains active");
      }
      // `legalMoveDecisions` delegates to the shared
      // CheckMoveLimitations-equivalent: power-0 Splash is masked while
      // damaging Tackle remains selectable.
      expect(commandDecisions(afterPlayerSecondTurn.nextRequest)).toEqual([
        TRAINER_TACKLE,
      ]);
      expect(() => submitFactoryFullTurnDecision(
        afterPlayerSecondTurn.state,
        {
          requestId: 4,
          side: "trainer",
          decision: TRAINER_SPLASH,
        },
      )).toThrow(/not legal for current command request/);

      const afterExpiryTurn = submitFactoryFullTurnDecision(
        afterPlayerSecondTurn.state,
        {
          requestId: 4,
          side: "trainer",
          decision: TRAINER_TACKLE,
        },
      );
      if (afterExpiryTurn.kind !== "decision-required") {
        throw new Error("expected fresh player command after Taunt expiry");
      }
      expect(afterExpiryTurn.state.rules.rulesContext.battlers[1].tauntTimer)
        .toBe(0);

      const afterPlayerPostExpiry = submitFactoryFullTurnDecision(
        afterExpiryTurn.state,
        {
          requestId: 5,
          side: "player",
          decision: PLAYER_SLEEP_TALK,
        },
      );
      if (afterPlayerPostExpiry.kind !== "decision-required") {
        throw new Error("expected trainer command after Taunt expiry");
      }
      expect(commandDecisions(afterPlayerPostExpiry.nextRequest)).toEqual([
        TRAINER_SPLASH,
        TRAINER_TACKLE,
      ]);
    },
  );
});
