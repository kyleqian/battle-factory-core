import { describe, expect, it } from "vitest";
import {
  advanceFactoryRoundBattleStartIntro, beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { createPlayer, mirrorRulesContext, PLAYER_POLICIES, type PlayerMenu } from "../tools/integration/romReplayPlayers.ts";

// docs/parity-mac/replay-players.md. The test players of the real-ROM replay are decision policies with their own dice: the same battle seed and the same menus
// give the same choices, the choices are among what the engine offers, and neither the mirrored AI nor the mirror itself changes the state it is handed.

function firstMenu(seed: number, factoryWinStreak: number) {
  let state: any = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `players-${seed}`, rngValue: seed, battleScene: "off", factoryWinStreak, playerTrainerId: 416049562, factorySymbolsCount: 0,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  for (let frame = 1; state.battleCommandPresentation?.lifecycle.phase !== "action-menu"; frame += 1) {
    if (frame > 5000) throw new Error("no action menu");
    state = advanceFactoryRoundBattleStartIntro(state, new Set(frame % 16 === 0 ? ["A"] : []) as never);
  }
  const menu = state.battleCommandPresentation; const rules = state.battle.rules.rulesContext;
  const playerMenu: PlayerMenu = {
    rules,
    legalSlots: [0, 1, 2, 3].filter((s) => menu.legalMoveBySlot[s] !== null),
    legalSwitches: menu.request.legalDecisions.filter((d: any) => d.kind === "switch").map((d: any) => d.partyIndex),
    forcedMove: false,
  };
  return { state, rules, playerMenu };
}

describe("real-ROM replay test players", () => {
  it("mirrorRulesContext swaps the two sides, is its own inverse, and leaves its input alone", () => {
    const { rules } = firstMenu(7, 28);
    const before = JSON.stringify(rules);
    const mirrored = mirrorRulesContext(rules);
    expect(mirrored.battlers[1].species).toBe(rules.battlers[0].species);
    expect(mirrored.battlers[1].side).toBe(1);
    expect(mirrored.battlers[0].side).toBe(0);
    expect(mirrored.party.opponent).toBe(rules.party.player);
    // side timers swap sides, and the battler numbers they hold are flipped with them
    expect(mirrored.sideTimers[0].spikesAmount).toBe(rules.sideTimers[1].spikesAmount);
    expect(mirrored.sideTimers[0].reflectBattlerId).toBe(rules.sideTimers[1].reflectBattlerId === 0 ? 1 : 0);
    expect(mirrorRulesContext(mirrored)).toEqual(rules);
    expect(JSON.stringify(rules)).toBe(before);
  });

  it("every player picks an action the engine offers, the same one for the same seed, and none touches the battle state or its RNG", () => {
    for (const seed of [7, 10, 33]) {
      const { state, rules, playerMenu } = firstMenu(seed, (seed * 11) % 49);
      const rulesBefore = JSON.stringify(rules); const rngBefore = JSON.stringify(state.battle.rng); const historyBefore = JSON.stringify(state.aiHistory);
      for (const name of PLAYER_POLICIES) {
        const turns = [0, 1].map(() => {
          const player = createPlayer(name, seed);
          return [player.chooseTurn(playerMenu), player.chooseTurn(playerMenu), player.chooseTurn(playerMenu)];
        });
        expect(turns[0], `${name} seed ${seed}`).toEqual(turns[1]);
        for (const turn of turns[0]!) {
          if (turn.action.kind === "move") expect(playerMenu.legalSlots).toContain(turn.action.slot);
          else expect(playerMenu.legalSwitches).toContain(turn.action.partyIndex);
          // nothing is trapped or locked on the first turn: no refusal probe
          expect(turn.probes).toEqual([]);
        }
      }
      expect(JSON.stringify(rules)).toBe(rulesBefore);
      expect(JSON.stringify(state.battle.rng)).toBe(rngBefore);
      expect(JSON.stringify(state.aiHistory)).toBe(historyBefore);
    }
  });

  it("ai-v1 really runs the mirrored AI (no fallback) and census keeps its least-used rule", () => {
    const { playerMenu } = firstMenu(7, 28);
    const ai = createPlayer("ai-v1", 7);
    expect(ai.chooseTurn(playerMenu).source).toMatch(/^ai-(move|switch)/);
    expect(ai.stats.fallbacks ?? 0).toBe(0);
    const census = createPlayer("census", 7);
    expect([0, 1, 2, 3, 4].map(() => (census.chooseTurn(playerMenu).action as any).slot)).toEqual([0, 1, 2, 3, 0]);
    // a forced replacement: census takes the lowest legal slot; the others one of the legal slots
    expect(census.chooseReplacement(playerMenu.rules, [2, 1])).toBe(1);
    for (const name of ["ai-v1", "random-v1"] as const) expect([1, 2]).toContain(createPlayer(name, 7).chooseReplacement(playerMenu.rules, [1, 2]));
  });
});
