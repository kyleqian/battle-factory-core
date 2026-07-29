import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import {
  createFreshFactoryBattle,
} from "../src/engine/factoryBattleStart.ts";
import {
  createFactoryCorpusPartyMember,
} from "../src/engine/factoryCorpusParty.ts";
import {
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import type {
  BattleScriptPartyState,
} from "../src/engine/battleScriptRulesContext.ts";
import { randomU16 } from "../src/engine/opponentGen.ts";

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function member(setId: number, abilitySlot: 0 | 1 = 0) {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryCorpusPartyMember({
    setId,
    personality: natureByName.get(set.nature)!,
    fixedIv: 3,
    abilitySlot,
  });
}

function party(activeSetId: number, abilitySlot: 0 | 1 = 0): BattleScriptPartyState {
  return Object.freeze([
    member(activeSetId, abilitySlot),
    member(300),
    member(301),
    member(302),
    member(303),
    member(304),
  ]) as unknown as BattleScriptPartyState;
}

function requireStarted(result: ReturnType<typeof createFreshFactoryBattle>) {
  if ("kind" in result) throw new Error(`unexpected fresh-start barrier: ${result.sourceConstruct}`);
  return result;
}

describe("fresh Factory battle initializer (Gate-5 rung 2)", () => {
  it("publishes the first player command with source-fresh tracked state and exactly draws A then B", () => {
    const seed = 3;
    const drawA = randomU16(seed);
    const drawB = randomU16(drawA.rngValue);
    const playerParty = party(300);
    const opponentParty = party(301);
    const state = requireStarted(createFreshFactoryBattle({
      requestId: 40,
      rngSeed: seed,
      playerParty,
      opponentParty,
    }));

    expect(state.boundary).toMatchObject({
      kind: "decision-required",
      request: { kind: "command", requestId: 40, side: "player", battler: 0 },
    });
    expect(state.rng).toEqual({ value: drawB.rngValue, calls: 2 });
    const rules = state.rules.rulesContext;
    expect(rules.randomTurnNumber).toBe(drawB.value);
    expect(rules.party.player).toHaveLength(6);
    expect(rules.party.opponent).toHaveLength(6);
    expect(rules.party.player.map((mon) => mon.species)).toEqual(playerParty.map((mon) => mon.species));
    expect(rules.party.opponent.map((mon) => mon.species)).toEqual(opponentParty.map((mon) => mon.species));
    expect(rules.battlers.slice(0, 2).map((battler) => battler.partyIndex)).toEqual([0, 0]);
    expect(rules.battlers.slice(0, 2).map((battler) => battler.isFirstTurn)).toEqual([1, 1]);
    expect(rules.battlers.slice(0, 2).map((battler) => battler.statStages))
      .toEqual([[6, 6, 6, 6, 6, 6, 6, 6], [6, 6, 6, 6, 6, 6, 6, 6]]);
    expect(rules.battlers.slice(0, 2).map((battler) => [battler.status2, battler.status3]))
      .toEqual([[0, 0], [0, 0]]);
    expect(rules.weather).toBe(0);
    expect(rules.sideStatuses).toEqual([0, 0]);
    expect(rules.sideTimers).toEqual([
      { reflectTimer: 0, reflectBattlerId: 0, lightscreenTimer: 0, lightscreenBattlerId: 0,
        safeguardTimer: 0, safeguardBattlerId: 0, mistBattlerId: 0,
        followmeTimer: 0, followmeTarget: 0, spikesAmount: 0 },
      { reflectTimer: 0, reflectBattlerId: 0, lightscreenTimer: 0, lightscreenBattlerId: 0,
        safeguardTimer: 0, safeguardBattlerId: 0, mistBattlerId: 0,
        followmeTimer: 0, followmeTarget: 0, spikesAmount: 0 },
    ]);
    expect(rules.moveHistory).toEqual({
      lastPrintedMoves: [0, 0, 0, 0],
      lastMoves: [0, 0, 0, 0],
      lastResultingMoves: [0, 0, 0, 0],
      lastLandedMoves: [0, 0, 0, 0],
      lastHitByType: [0, 0, 0, 0],
      lastHitBy: [0xff, 0xff, 0xff, 0xff],
      lastTakenMove: new Array<number>(16).fill(0),
      lastTakenMoveFrom: new Array<number>(32).fill(0),
    });
  });

  it("stores draw B for turn-1 Quick Claw: slower Magcargo acts first when A misses and B procs", () => {
    // Seed 3: draw A=50515 (no proc), draw B=12646 (20% proc).
    const corpusParty = party(299);
    const quickClawParty = Object.freeze([
      Object.freeze({
        ...corpusParty[0],
        moves: Object.freeze([70, 0, 0, 0] as const), // Strength: finite shared hit chain.
        pp: Object.freeze([15, 0, 0, 0] as const),
      }),
      ...corpusParty.slice(1),
    ]) as unknown as BattleScriptPartyState;
    const state = requireStarted(createFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      playerParty: quickClawParty, // Magcargo set 299 carries Quick Claw.
      opponentParty: party(300),
    }));
    expect(state.rules.rulesContext.randomTurnNumber).toBe(12646);

    const afterPlayer = submitFactoryFullTurnDecision(state, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });
    if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer request");
    const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 2, targetBattler: 0 },
    });
    const ppOrder = afterTrainer.events.flatMap(({ payload }) =>
      payload.kind === "set-battler-pp-data" ? [payload.battler] : []
    );
    expect(ppOrder.slice(0, 2)).toEqual([0, 1]);
  });

  it("reaches the named entry-hook unsupported-branch only for an active hook carrier", () => {
    const result = createFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      playerParty: party(53, 0), // Ekans, ability slot 0 = Intimidate.
      opponentParty: party(300),
    });
    expect(result).toMatchObject({
      kind: "unsupported-branch",
      sourceConstruct: "TryDoEventsBeforeFirstTurn switch-in ability/item hook loop",
    });
  });

  it("reaches the named equal-speed unsupported-branch pending the live tie receipt", () => {
    const result = createFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      playerParty: party(300),
      opponentParty: party(300),
    });
    expect(result).toMatchObject({
      kind: "unsupported-branch",
      sourceConstruct: expect.stringContaining("equal-speed"),
    });
  });
});
