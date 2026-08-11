/**
 * S10 step (iv) part 3/3 integration proof: the WHOLE chain with zero
 * fixtures. A staged Level-50 Factory last-mon-KO scenario
 * (factoryBattleScriptTerminalDecision.ts) runs through submitBattleDecision
 * to a REAL kernel `{ kind: "terminal", outcome }` boundary -- computed by
 * checkteamslost from the staged party slice, never injected -- then
 * through the adapter, then into resolveRoundBattle on a real
 * RoundControllerState. roundController.ts itself is not touched by this
 * rung (docs/round-controller-outcome-seam.md's "what stays intact").
 */
import { describe, expect, it } from "vitest";
import type { BattleMon, BattleOpponent, BattleParty, FixtureBattleScenario } from "../src/engine/battleScenario.ts";
import {
  advanceRoundController,
  chooseRoundSwap,
  completeBattlePresentation,
  createRoundController,
  resolveRoundBattle,
  type RoundControllerState,
} from "../src/engine/roundController.ts";
import { deriveBattleResolutionFromTerminalBoundary } from "../src/engine/battleResolutionAdapter.ts";
import {
  createFactoryTerminalMoveBattleState,
  submitFactoryTerminalMoveDecision,
  type FactoryTerminalMoveConfig,
} from "../src/engine/factoryBattleScriptTerminalDecision.ts";

const STRENGTH = 70; // EFFECT_HIT, TYPE_NORMAL -- docs/hit-chain-ground-truth.md's KO scenario move.
const KO_SCENARIO_RNG_SEED = 919694434;
/** Comfortably above every hp value the staged kernel scenario ever assigns (100 attacker, 90 target). */
const PRE_BATTLE_MAX_HP = 150;

function kernelConfig(overrides: Partial<FactoryTerminalMoveConfig> = {}): FactoryTerminalMoveConfig {
  return {
    requestId: 1,
    rngSeed: KO_SCENARIO_RNG_SEED,
    attackerMoveId: STRENGTH,
    attackerAttack: 200,
    targetDefense: 50,
    targetHp: 90,
    opponentBenchHp: [0, 0],
    ...overrides,
  };
}

function mon(id: string): BattleMon {
  return { id, species: id.toUpperCase(), maxHp: PRE_BATTLE_MAX_HP, hp: PRE_BATTLE_MAX_HP, status: "none" };
}

function party(prefix: string): BattleParty {
  return [mon(`${prefix}-0`), mon(`${prefix}-1`), mon(`${prefix}-2`)];
}

function scenario(): FixtureBattleScenario {
  const opponentPool: BattleOpponent[] = Array.from({ length: 7 }, (_, index) => ({
    id: `trainer-${index}`,
    trainerName: `TRAINER ${index}`,
    party: party(`foe-${index}`),
  }));
  return {
    id: "battle-resolution-adapter-integration",
    playerParty: party("player"),
    opponentPool,
    opponentSelectionInputs: [0, 0, 0, 0, 0, 0, 0],
    initialRngValue: 0x1234,
  };
}

function acknowledgeAndAdvance(state: RoundControllerState): RoundControllerState {
  const command = state.presentation?.command;
  if (command === undefined) throw new Error("expected a presentation command");
  return advanceRoundController(
    completeBattlePresentation(state, { commandId: command.commandId }),
  );
}

/** presentingBattleStart -> battleActive, with zero battle-core involvement. */
function startBattleActive(): RoundControllerState {
  return acknowledgeAndAdvance(createRoundController(scenario()));
}

describe("battle resolution adapter -- real kernel to roundController, no fixtures", () => {
  it("win path: a real player-win terminal boundary advances the round exactly as the real game would", () => {
    const state = startBattleActive();
    expect(state.rules.phase).toBe("battleActive");

    const kernelInitial = createFactoryTerminalMoveBattleState(kernelConfig());
    const kernelResult = submitFactoryTerminalMoveDecision(kernelInitial, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    expect(kernelResult.kind).toBe("terminal");
    if (kernelResult.kind !== "terminal") throw new Error("expected terminal");
    expect(kernelResult.outcome).toBe("player-win");

    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: kernelResult.state.rng.value,
      outcome: kernelResult.outcome,
      rulesContext: kernelResult.state.rules.rulesContext,
      preBattlePlayerParty: state.rules.playerParty,
      preBattleOpponentParty: state.rules.currentOpponent.party,
    });
    expect(resolution.outcome).toBe("win");
    // The staged scenario's attacker (the player's sole modeled slot) takes no damage.
    expect(resolution.playerParty[0]).toMatchObject({ hp: 100, status: "none" });
    // All three opponent slots are down: the two pre-fainted bench slots plus the KO'd target.
    expect(resolution.opponentParty.map((member) => member.hp)).toEqual([0, 0, 0]);

    let after = resolveRoundBattle(state, resolution);
    expect(after.rules.phase).toBe("presentingBattleWin");
    expect(after.rules.lastBattle?.outcome).toBe("win");
    expect(after.rules.lastBattle?.opponentParty).toEqual(resolution.opponentParty);

    after = acknowledgeAndAdvance(after);
    expect(after.rules.phase).toBe("awaitingSwapDecision");
    expect(after.presentation?.command).toMatchObject({
      type: "swapOffer",
      battleIndex: 0,
      opponentParty: resolution.opponentParty,
    });
  });

  it("win path battle index increments after a declined swap", () => {
    const state = startBattleActive();
    const kernelInitial = createFactoryTerminalMoveBattleState(kernelConfig());
    const kernelResult = submitFactoryTerminalMoveDecision(kernelInitial, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (kernelResult.kind !== "terminal") throw new Error("expected terminal");
    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: kernelResult.state.rng.value,
      outcome: kernelResult.outcome,
      rulesContext: kernelResult.state.rules.rulesContext,
      preBattlePlayerParty: state.rules.playerParty,
      preBattleOpponentParty: state.rules.currentOpponent.party,
    });

    let after = resolveRoundBattle(state, resolution);
    after = acknowledgeAndAdvance(after);
    after = completeBattlePresentation(after, { commandId: after.presentation!.command.commandId });
    after = chooseRoundSwap(after, { type: "decline" });
    after = acknowledgeAndAdvance(after);
    expect(after.rules.phase).toBe("presentingBattleStart");
    expect(after.rules.battleIndex).toBe(1);
  });

  it("loss path: a real trainer-win terminal boundary (player's last mon KO'd) drives roundLost", () => {
    const state = startBattleActive();
    expect(state.rules.phase).toBe("battleActive");

    const kernelInitial = createFactoryTerminalMoveBattleState(
      kernelConfig({ attackingSide: "trainer" }),
    );
    const kernelResult = submitFactoryTerminalMoveDecision(kernelInitial, {
      requestId: 1,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    expect(kernelResult.kind).toBe("terminal");
    if (kernelResult.kind !== "terminal") throw new Error("expected terminal");
    expect(kernelResult.outcome).toBe("trainer-win");

    const resolution = deriveBattleResolutionFromTerminalBoundary({
      rngValue: kernelResult.state.rng.value,
      outcome: kernelResult.outcome,
      rulesContext: kernelResult.state.rules.rulesContext,
      preBattlePlayerParty: state.rules.playerParty,
      preBattleOpponentParty: state.rules.currentOpponent.party,
    });
    expect(resolution.outcome).toBe("loss");
    expect(resolution.playerParty.map((member) => member.hp)).toEqual([0, 0, 0]);

    const after = resolveRoundBattle(state, resolution);
    expect(after.rules.phase).toBe("roundLost");
    expect(after.rules.lastBattle?.outcome).toBe("loss");
    expect(after.presentation?.command).toMatchObject({
      type: "roundLost",
      battleIndex: 0,
    });
  });
});
