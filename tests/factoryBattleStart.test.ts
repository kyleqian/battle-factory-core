import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import {
  createFreshFactoryBattle,
  initializeFreshFactoryBattle,
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
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants.ts";
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
  return result;
}

function requireInitialized(result: ReturnType<typeof initializeFreshFactoryBattle>) {
  return result;
}

describe("fresh Factory battle initializer (Gate-5 rungs 2-3)", () => {
  it("owns the Scene-OFF marker at fresh start and leaves the full-turn logical receipt unchanged", () => {
    const corpusParty = party(299);
    const quickClawParty = Object.freeze([
      Object.freeze({
        ...corpusParty[0],
        moves: Object.freeze([70, 0, 0, 0] as const),
        pp: Object.freeze([15, 0, 0, 0] as const),
      }),
      ...corpusParty.slice(1),
    ]) as unknown as BattleScriptPartyState;
    const play = (battleScene: "on" | "off") => {
      const initial = createFreshFactoryBattle({
        requestId: 1,
        rngSeed: 3,
        battleScene,
        playerParty: quickClawParty,
        opponentParty: party(300),
      });
      const afterPlayer = submitFactoryFullTurnDecision(initial, {
        requestId: 1,
        side: "player",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
      });
      if (afterPlayer.kind !== "decision-required") {
        throw new Error("expected trainer command after the player move");
      }
      return Object.freeze({
        initial,
        transition: submitFactoryFullTurnDecision(afterPlayer.state, {
          requestId: 2,
          side: "trainer",
          decision: { kind: "use-move", moveSlot: 2, targetBattler: 0 },
        }),
      });
    };

    const on = play("on");
    const off = play("off");
    expect(on.initial.rules.rulesContext.hitMarker).toBe(0);
    expect(off.initial.rules.rulesContext.hitMarker).toBe(
      BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
    );
    // BattleStartClearSetData owns the one presentation bit. The option may
    // remove MOVE_ANIMATION receipts, but cannot perturb the selection order,
    // damage/state outcome, or any random draw.
    expect(off.transition.state.rng).toEqual(on.transition.state.rng);
    expect(off.transition.state.boundary).toEqual(on.transition.state.boundary);
    expect(off.transition.state.rules.turnOrder).toEqual(on.transition.state.rules.turnOrder);
    expect({
      ...off.transition.state.rules.rulesContext,
      hitMarker: 0,
    }).toEqual(on.transition.state.rules.rulesContext);
    expect(on.transition.events.some(({ payload }) =>
      payload.kind === "animation" && payload.animationId === "MOVE_ANIMATION"
    )).toBe(true);
    expect(off.transition.events.some(({ payload }) =>
      payload.kind === "animation" && payload.animationId === "MOVE_ANIMATION"
    )).toBe(false);
  });

  it("publishes the first player command with source-fresh tracked state and exactly draws A then B", () => {
    const seed = 3;
    const drawA = randomU16(seed);
    const drawB = randomU16(drawA.rngValue);
    const playerParty = party(300);
    const opponentParty = party(301);
    const state = requireStarted(createFreshFactoryBattle({
      requestId: 40,
      rngSeed: seed,
      battleScene: "on",
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

  it("accounts for an adapter-pinned pre-command RNG span before draws A and B", () => {
    const seed = 3;
    let cursor = seed;
    for (let call = 0; call < 33; call += 1) {
      cursor = randomU16(cursor).rngValue;
    }
    const drawA = randomU16(cursor);
    const drawB = randomU16(drawA.rngValue);
    const state = createFreshFactoryBattle({
      requestId: 41,
      rngSeed: seed,
      battleScene: "on",
      preCommandRngCalls: 33,
      playerParty: party(300),
      opponentParty: party(301),
    });

    expect(state.rng).toEqual({ value: drawB.rngValue, calls: 35 });
    expect(state.rules.rulesContext.randomTurnNumber).toBe(drawB.value);
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
      battleScene: "on",
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

  it("defers Intimidate until after the ordered ON_SWITCHIN scan, publishes its visible script events, and draws no hook RNG", () => {
    const result = requireInitialized(initializeFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      battleScene: "on",
      playerParty: party(53, 0), // Ekans, ability slot 0 = Intimidate.
      opponentParty: party(300),
    }));
    expect(result.state.rng.calls).toBe(2);
    expect(result.state.rules.rulesContext.battlers[1].statStages[1]).toBe(5);
    expect(result.events.map(({ payload }) => payload.kind)).toEqual([
      "stat-stage-change", "animation", "message",
    ]);
    expect(result.events[0]?.payload).toMatchObject({
      kind: "stat-stage-change", battler: 1, stat: "attack", from: 6, to: 5,
    });
    expect(result.events[2]?.payload).toMatchObject({
      kind: "message", messageId: "STRINGID_PKMNCUTSATTACKWITH",
    });
    expect(result.state.nextEventSequence).toBe(result.events.length);
  });

  it("runs faster Drought before deferred Intimidate and reaches the same final command state after every controller-yielding hook script", () => {
    const groudonParty = Object.freeze([
      Object.freeze({
        ...member(300),
        // Groudon is not in the Level-50 Factory corpus. This complete
        // adapter-shaped member supplies its real single ability for the
        // lifecycle-only hook representative.
        species: 405,
        abilityNum: 0 as const,
        speed: 120,
      }),
      ...party(300).slice(1),
    ]) as unknown as BattleScriptPartyState;
    const first = requireInitialized(initializeFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      battleScene: "on",
      playerParty: groudonParty,
      opponentParty: party(53, 0), // Ekans: Intimidate, slower than the constructed Groudon.
    }));
    const replay = requireInitialized(initializeFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      battleScene: "on",
      playerParty: groudonParty,
      opponentParty: party(53, 0),
    }));
    expect(first.state).toEqual(replay.state);
    expect(first.state.rules.rulesContext.weather).toBe((1 << 5) | (1 << 6));
    expect(first.state.rules.rulesContext.battlers[0].statStages[1]).toBe(5);
    expect(first.events.filter(({ payload }) =>
      payload.kind === "message"
    ).map(({ payload }) => payload.kind === "message" ? payload.messageId : null)).toEqual([
      "STRINGID_PKMNSXINTENSIFIEDSUN",
      "STRINGID_PKMNCUTSATTACKWITH",
    ]);
    expect(first.state.rng.calls).toBe(2);
  });

  it("resolves a real Level-50 Porygon2 Trace carrier after ON_SWITCHIN hooks without extra draws", () => {
    const result = requireInitialized(initializeFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      battleScene: "on",
      playerParty: party(436, 0), // Porygon2 set 1, ability slot 0 = Trace.
      opponentParty: party(53, 0), // copies Intimidate only after pending Intimidate resolves.
    }));
    expect(result.state.rules.rulesContext.battlers[0].ability).toBe(22);
    expect(result.events.filter(({ payload }) =>
      payload.kind === "message"
    ).map(({ payload }) => payload.kind === "message" ? payload.messageId : null)).toEqual([
      "STRINGID_PKMNCUTSATTACKWITH",
      "STRINGID_PKMNTRACED",
    ]);
    expect(result.state.rng.calls).toBe(2);
  });

  it("runs speed-ordered switch-in items after Intimidate: White Herb restores the lowered stage and is consumed", () => {
    const result = requireInitialized(initializeFreshFactoryBattle({
      requestId: 1,
      rngSeed: 3,
      battleScene: "on",
      playerParty: party(48, 0), // Kirlia carries White Herb; slot 0 is Synchronize.
      opponentParty: party(53, 0), // Ekans Intimidate lowers Kirlia before the item pass.
    }));
    const player = result.state.rules.rulesContext.battlers[0];
    expect(player.statStages[1]).toBe(6);
    expect(player.item).toBe(0);
    expect(result.events.filter(({ payload }) =>
      payload.kind === "message"
    ).map(({ payload }) => payload.kind === "message" ? payload.messageId : null)).toEqual([
      "STRINGID_PKMNCUTSATTACKWITH",
      "STRINGID_PKMNSITEMRESTOREDSTATUS",
    ]);
    expect(result.events.at(-1)?.payload).toMatchObject({
      kind: "set-battler-item", battler: 0, item: 0,
    });
    expect(result.state.rng.calls).toBe(2);
  });

  it("matches the equal-speed receipt's exact A/tie/B draws, &1 order, and single added call", () => {
    const receiptSeed = 2_279_919_941;
    const drawA = randomU16(receiptSeed);
    const tie = randomU16(drawA.rngValue);
    const drawB = randomU16(tie.rngValue);
    expect([drawA.value, tie.value, drawB.value]).toEqual([62606, 997, 8088]);
    expect(tie.value & 1).toBe(1);

    const equalSpeedWhiteHerbLead = (): BattleScriptPartyState => {
      const base = party(53); // Ekans / Intimidate
      return Object.freeze([
        Object.freeze({
          ...base[0],
          speed: 111,
          item: 180, // White Herb exposes the speed-ordered item pass.
        }),
        ...base.slice(1),
      ]) as unknown as BattleScriptPartyState;
    };
    const result = initializeFreshFactoryBattle({
      requestId: 1,
      rngSeed: receiptSeed,
      battleScene: "on",
      playerParty: equalSpeedWhiteHerbLead(),
      opponentParty: equalSpeedWhiteHerbLead(),
    });
    expect(result.state.rng).toEqual({ calls: 3, value: drawB.rngValue });
    expect(result.state.rules.rulesContext.randomTurnNumber).toBe(8088);
    expect(result.events.flatMap(({ payload }) =>
      payload.kind === "set-battler-item" ? [payload.battler] : []
    )).toEqual([1, 0]);
  });
});
