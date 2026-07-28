import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY } from "../src/engine/battleScriptSourceConstants.ts";
import { GbaRng } from "../src/engine/rng.ts";

const FOCUS_ENERGY = 116;
const TACKLE = 33;
const SPLASH = 150;

const PLAYER_FOCUS = Object.freeze({
  kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const,
});
const PLAYER_TACKLE = Object.freeze({
  kind: "use-move" as const, moveSlot: 1 as const, targetBattler: 1 as const,
});
const TRAINER_SPLASH = Object.freeze({
  kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const,
});

function config(status2 = 0): FactoryFullTurnConfig {
  return {
    requestId: 1,
    // Accuracy=1817 hits; the following crit roll=62472 is divisible by 4
    // but not 16, distinguishing Focus Energy stage 2 from stage 0.
    rngSeed: 4,
    player: {
      species: 66, moveId: FOCUS_ENERGY,
      moves: [FOCUS_ENERGY, TACKLE, 0, 0], pp: [30, 35, 0, 0],
      attack: 100, defense: 500, spAttack: 50, spDefense: 500,
      speed: 100, hp: 1000, status2,
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"],
    },
    trainer: {
      species: 113, moveId: SPLASH,
      moves: [SPLASH, SPLASH, SPLASH, SPLASH], pp: [40, 40, 40, 40],
      attack: 10, defense: 100, spAttack: 10, spDefense: 100,
      speed: 50, hp: 1000,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    },
  };
}

type Result = ReturnType<typeof submitFactoryFullTurnDecision>;
type Pending = Extract<Result, { kind: "decision-required" }>;

function turn(
  state: Pending["state"],
  requestId: number,
  playerDecision: typeof PLAYER_FOCUS | typeof PLAYER_TACKLE,
): Pending {
  const afterPlayer = submitFactoryFullTurnDecision(state, {
    requestId, side: "player", decision: playerDecision,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected trainer command request");
  }
  const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: requestId + 1, side: "trainer", decision: TRAINER_SPLASH,
  });
  if (afterTrainer.kind !== "decision-required") {
    throw new Error(`expected next player command request, got ${JSON.stringify(afterTrainer)}`);
  }
  return afterTrainer;
}

function messageIds(result: Pending): string[] {
  return result.events.flatMap(({ payload }) =>
    payload.kind === "message" ? [payload.messageId] : []
  );
}

describe("Factory full-turn Focus Energy shared-script receipt", () => {
  it("orders used-message, PP, and status message; duplicate spends PP and takes BattleScript_ButItFailed before the opcode", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const first = turn(initial, 1, PLAYER_FOCUS);
    const firstRules = first.state.rules.rulesContext;
    expect(firstRules.battlers[0].pp).toEqual([29, 35, 0, 0]);
    expect(firstRules.battlers[0].status2 & BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY)
      .toBe(BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY);
    expect(firstRules.battlers[1].status2).toBe(0);
    const firstKinds = first.events.map(({ payload }) =>
      payload.kind === "message"
        ? `message:${payload.messageId}`
        : payload.kind
    );
    expect(firstKinds.indexOf("set-battler-pp-data"))
      .toBeGreaterThan(firstKinds.indexOf("message:STRINGID_USEDMOVE"));
    expect(firstKinds.indexOf("message:STRINGID_PKMNGETTINGPUMPED"))
      .toBeGreaterThan(firstKinds.indexOf("set-battler-pp-data"));
    expect(first.state.rng.calls).toBe(0);

    const repeated = turn(first.state, 3, PLAYER_FOCUS);
    const repeatedRules = repeated.state.rules.rulesContext;
    expect(repeatedRules.battlers[0].pp).toEqual([28, 35, 0, 0]);
    expect(repeatedRules.battlers[0].status2)
      .toBe(firstRules.battlers[0].status2);
    expect(repeatedRules.multistringChooser).toBe(0);
    expect(messageIds(repeated)).not.toContain("STRINGID_PKMNGETTINGPUMPED");
    expect(messageIds(repeated)).toContain("STRINGID_BUTITFAILED");
    expect(repeated.state.rng.calls).toBe(0);
  });

  it("a subsequent ordinary hit consumes the persisted bit through shared critcalc's +2 stage", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const focused = turn(initial, 1, PLAYER_FOCUS);
    const hit = turn(focused.state, 3, PLAYER_TACKLE);
    const expected = new GbaRng(4);
    expect([expected.next(), expected.next()]).toEqual([1817, 62472]);
    expect(messageIds(hit)).toContain("STRINGID_CRITICALHIT");

    const plainInitial = createFactoryFullTurnBattleState(config(0));
    const plainHit = turn(plainInitial, 1, PLAYER_TACKLE);
    expect(messageIds(plainHit)).not.toContain("STRINGID_CRITICALHIT");
    expect(hit.state.rng).toEqual(plainHit.state.rng);
  });
});
