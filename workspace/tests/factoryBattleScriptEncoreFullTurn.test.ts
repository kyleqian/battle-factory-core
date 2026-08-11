import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";

const ENCORE = 227;
const TACKLE = 33;
const SPLASH = 150;

function config(playerMove = ENCORE, trainerMove = TACKLE): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 7,
    player: {
      species: 311, moveId: playerMove, moves: [ENCORE, SPLASH, TACKLE, 0],
      pp: [5, 40, 35, 0], attack: 20, defense: 500, spAttack: 20,
      spDefense: 500, speed: 100, hp: 1000,
    },
    trainer: {
      species: 113, moveId: trainerMove, moves: [SPLASH, TACKLE, ENCORE, 0],
      pp: [40, 35, 5, 0], attack: 20, defense: 500, spAttack: 20,
      spDefense: 500, speed: 50, hp: 1000, lastMove: TACKLE,
    },
  };
}

function messages(result: { events: readonly { payload: { kind: string; messageId?: string } }[] }) {
  return result.events.flatMap(({ payload }) =>
    payload.kind === "message" ? [payload.messageId] : []
  );
}

describe("Factory full-turn Encore shared choice/execution seams", () => {
  it("successful Encore follows real script order, spends PP, and repeat use fails after PP", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("trainer request expected");
    const first = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer",
      decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    });
    if (first.kind !== "decision-required") throw new Error("player request expected");
    expect(first.state.rules.rulesContext.battlers[0].pp[0]).toBe(4);
    expect(first.state.rules.rulesContext.battlers[1]).toMatchObject({
      encoredMove: TACKLE, encoredMovePos: 1,
    });
    const kinds = first.events.map(({ payload }) =>
      payload.kind === "message" ? `message:${payload.messageId}` : payload.kind
    );
    expect(kinds.indexOf("set-battler-pp-data"))
      .toBeGreaterThan(kinds.indexOf("message:STRINGID_USEDMOVE"));
    expect(kinds.indexOf("message:STRINGID_PKMNGOTENCORE"))
      .toBeGreaterThan(kinds.indexOf("set-battler-pp-data"));

    const secondPlayer = submitFactoryFullTurnDecision(first.state, {
      requestId: 3, side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (secondPlayer.kind !== "decision-required") throw new Error("next player request expected");
    expect(secondPlayer.state.rules.rulesContext.battlers[0].pp[0]).toBe(3);
    expect(messages(secondPlayer)).toContain("STRINGID_BUTITFAILED");
    expect(secondPlayer.state.rules.rulesContext.battlers[1].pp[1]).toBe(33);
  });

  it("auto-confirms a player Encore choice and consumes the encored slot PP", () => {
    const seeded = config(TACKLE, ENCORE);
    const initial = createFactoryFullTurnBattleState({
      ...seeded,
      trainer: { ...seeded.trainer, speed: 100 },
      player: { ...seeded.player, speed: 50, lastMove: TACKLE },
    });
    const player = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player",
      decision: { kind: "use-move", moveSlot: 2, targetBattler: 1 },
    });
    if (player.kind !== "decision-required") throw new Error("trainer request expected");
    const applied = submitFactoryFullTurnDecision(player.state, {
      requestId: 2, side: "trainer",
      decision: { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    });
    if (applied.kind !== "decision-required") throw new Error("trainer-only request expected");
    expect(applied.nextRequest).toMatchObject({ side: "trainer", requestId: 3 });
    const next = submitFactoryFullTurnDecision(applied.state, {
      requestId: 3, side: "trainer",
      decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    });
    if (next.kind !== "decision-required") throw new Error("next boundary expected");
    expect(next.state.rules.rulesContext.battlers[0].pp[2]).toBe(33);
  });

  it("an overwritten stored slot executes its live move and clears Encore instead of Struggle", () => {
    const initial = createFactoryFullTurnBattleState({
      ...config(SPLASH, TACKLE),
      trainer: {
        ...config().trainer,
        encoreTimer: 3, encoredMove: TACKLE, encoredMovePos: 0,
        encoreTimerStartValue: 4,
      },
    });
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player",
      decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("next boundary expected");
    expect(afterPlayer.state.rules.rulesContext.battlers[1]).toMatchObject({
      encoredMove: 0, encoredMovePos: 0, encoreTimer: 0,
      pp: [39, 35, 5, 0],
    });
    expect(messages(afterPlayer)).not.toContain("STRINGID_NOMOVESLEFT");
  });

  it("a multi-turn lock takes precedence over a conflicting Encore slot", () => {
    const base = config(TACKLE, SPLASH);
    const initial = createFactoryFullTurnBattleState({
      ...base,
      player: {
        ...base.player,
        status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
        lockedMove: TACKLE,
        chosenMovePosition: 2,
        encoreTimer: 3,
        encoredMove: SPLASH,
        encoredMovePos: 1,
      },
    });
    expect(initial.boundary).toMatchObject({
      request: {
        legalDecisions: [
          { kind: "use-move", moveSlot: 2, targetBattler: 1 },
        ],
      },
    });
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1, side: "player",
      decision: { kind: "use-move", moveSlot: 2, targetBattler: 1 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("trainer request expected");
    const turn = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2, side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (turn.kind !== "decision-required") throw new Error("next boundary expected");
    expect(turn.state.rules.rulesContext.battlers[0]).toMatchObject({
      pp: [5, 40, 34, 0],
      encoredMove: SPLASH,
      encoredMovePos: 1,
    });
  });
});
