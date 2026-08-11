import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_ARENA,
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
  BATTLE_SCRIPT_STATUS3_PERISH_SONG,
  BATTLE_SCRIPT_STATUS3_ROOTED,
} from "../src/engine/battleScriptSourceConstants.ts";
import {
  evaluateFactoryAiSwitchPolicy,
  type FactoryAiSwitchPolicyResult,
} from "../src/engine/factoryAiSwitchPolicy.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const TRAINER_FACTORY =
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY;
const NEUTRAL_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);
const EMPTY: BattleScriptPartyMemberInput = Object.freeze({
  species: 0,
  isEgg: false,
  hp: 0,
});

type BattlerPatch = Partial<BattleScriptRulesBattler> & Readonly<{
  side: 0 | 1;
  species: number;
  ability: number;
  types: readonly [string, string];
}>;

function battler(patch: BattlerPatch): BattleScriptRulesBattler {
  return {
    side: patch.side,
    species: patch.species,
    ability: patch.ability,
    types: patch.types,
    hp: patch.hp ?? 100,
    maxHP: patch.maxHP ?? 100,
    moves: patch.moves ?? [33, 0, 0, 0],
    pp: patch.pp ?? [10, 0, 0, 0],
    status1: patch.status1 ?? 0,
    status2: patch.status2 ?? 0,
    status3: patch.status3 ?? 0,
    statStages: patch.statStages ?? NEUTRAL_STAGES,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    level: 50,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    partyIndex: patch.partyIndex ?? 0,
    perishSongTimer: patch.perishSongTimer ?? 0,
    isFirstTurn: 0,
  };
}

function partyMember(
  species: number,
  moves: readonly [number, number, number, number],
  patch: Partial<BattleScriptPartyMemberInput> = {},
): BattleScriptPartyMemberInput {
  return {
    species,
    isEgg: false,
    abilityNum: 0,
    hp: 100,
    maxHP: 100,
    moves,
    ...patch,
  };
}

function rules(input: Readonly<{
  target?: BattlerPatch;
  active?: BattlerPatch;
  bench?: readonly [BattleScriptPartyMemberInput?, BattleScriptPartyMemberInput?];
  lastLandedMove?: number;
  lastHitBy?: number;
  battleTypeFlags?: number;
}> = {}): BattleScriptRulesContext {
  const target = battler(input.target ?? {
    side: 0,
    species: 9,
    ability: 67,
    types: ["TYPE_WATER", "TYPE_WATER"],
  });
  const active = battler(input.active ?? {
    side: 1,
    species: 26,
    ability: 9,
    types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
  });
  const emptyBattler = battler({
    side: 0,
    species: 0,
    ability: 0,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    hp: 0,
    maxHP: 0,
    moves: [0, 0, 0, 0],
    pp: [0, 0, 0, 0],
  });
  const activeParty = partyMember(active.species!, active.moves, {
    hp: active.hp,
    maxHP: active.maxHP,
    status1: active.status1,
  });
  return createBattleScriptRulesContext({
    battlers: [target, active, emptyBattler, { ...emptyBattler, side: 1 }],
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: {
      player: [
        partyMember(target.species!, target.moves),
        EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
      ],
      opponent: [
        activeParty,
        input.bench?.[0] ?? EMPTY,
        input.bench?.[1] ?? EMPTY,
        EMPTY, EMPTY, EMPTY,
      ],
    },
    moveHistory: {
      lastLandedMoves: [0, input.lastLandedMove ?? 0, 0, 0],
      lastHitBy: [0xff, input.lastHitBy ?? 0xff, 0xff, 0xff],
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: input.battleTypeFlags ?? TRAINER_FACTORY,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
  });
}

function seedFor(sequence: readonly Readonly<{ modulus: number; remainder: number }>[]): number {
  for (let seed = 0; seed < 1_000_000; seed += 1) {
    let cursor = seed;
    let matches = true;
    for (const wanted of sequence) {
      cursor = advanceRngValue(cursor);
      if ((((cursor >>> 16) & 0xffff) % wanted.modulus) !== wanted.remainder) {
        matches = false;
        break;
      }
    }
    if (matches) return seed;
  }
  throw new Error(`no seed found for ${JSON.stringify(sequence)}`);
}

function evaluate(
  source: BattleScriptRulesContext,
  sequence: readonly Readonly<{ modulus: number; remainder: number }>[] = [],
): FactoryAiSwitchPolicyResult {
  return evaluateFactoryAiSwitchPolicy({
    rules: source,
    rng: { value: seedFor(sequence), calls: 0 },
  });
}

describe("Factory AI ShouldSwitch policy", () => {
  it("emits the Perish Song sentinel and resolves suitable-mon scoring with zero draws", () => {
    const result = evaluate(rules({
      target: {
        side: 0,
        species: 200,
        ability: 26,
        types: ["TYPE_GHOST", "TYPE_GHOST"],
      },
      active: {
        side: 1,
        species: 358,
        ability: 30,
        types: ["TYPE_NORMAL", "TYPE_FLYING"],
        status3: BATTLE_SCRIPT_STATUS3_PERISH_SONG,
        perishSongTimer: 0,
      },
      bench: [partyMember(134, [44, 0, 0, 0])],
    }));

    expect(result.choice).toEqual({ kind: "sentinel" });
    expect(result.selectedPartyIndex).toBe(1);
    expect(result.draws).toEqual([]);
    expect(result.branches.slice(-2)).toEqual([
      { ordinal: 7, branch: "perish-song", outcome: "selected", partyIndex: null },
      { ordinal: 8, branch: "suitable-selector", outcome: "selected", partyIndex: 1 },
    ]);
  });

  it("selects the first Wonder Guard candidate in party-major/move-major order with one draw", () => {
    const result = evaluate(rules({
      target: {
        side: 0,
        species: 303,
        ability: 25,
        types: ["TYPE_BUG", "TYPE_GHOST"],
      },
      active: {
        side: 1,
        species: 134,
        ability: 11,
        types: ["TYPE_WATER", "TYPE_WATER"],
        moves: [57, 58, 92, 182],
      },
      bench: [partyMember(4, [33, 45, 10, 53])],
    }), [{ modulus: 3, remainder: 1 }]);

    expect(result.choice).toEqual({ kind: "chosen", partyIndex: 1 });
    expect(result.selectedPartyIndex).toBe(1);
    expect(result.draws.map(({ kind, partyIndex, moveSlot, remainder }) =>
      ({ kind, partyIndex, moveSlot, remainder }))).toEqual([
      {
        kind: "wonder-guard-candidate",
        partyIndex: 1,
        moveSlot: 3,
        remainder: 1,
      },
    ]);
  });

  it("selects a landed-Water-move absorber with one odd &1 draw", () => {
    const result = evaluate(rules({
      active: {
        side: 1,
        species: 26,
        ability: 9,
        types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
        moves: [33, 0, 0, 0],
      },
      bench: [
        partyMember(134, [44, 0, 0, 0]),
        partyMember(132, [33, 0, 0, 0]),
      ],
      lastLandedMove: 55,
      lastHitBy: 0,
    }), [{ modulus: 2, remainder: 1 }]);

    expect(result.choice).toEqual({ kind: "chosen", partyIndex: 1 });
    expect(result.selectedPartyIndex).toBe(1);
    expect(result.draws.map(({ kind, modulus, remainder, partyIndex }) =>
      ({ kind, modulus, remainder, partyIndex }))).toEqual([
      { kind: "absorber-candidate", modulus: 2, remainder: 1, partyIndex: 1 },
    ]);
  });

  it("pins Natural Cure's one-draw success and two-draw failure/final-success paths", () => {
    const source = rules({
      target: {
        side: 0,
        species: 47,
        ability: 27,
        types: ["TYPE_BUG", "TYPE_GRASS"],
      },
      active: {
        side: 1,
        species: 358,
        ability: 30,
        types: ["TYPE_NORMAL", "TYPE_FLYING"],
        status1: BATTLE_SCRIPT_STATUS1_SLEEP,
      },
      bench: [partyMember(4, [53, 0, 0, 0])],
      lastLandedMove: 147,
      lastHitBy: 0,
    });

    const oneDraw = evaluate(source, [{ modulus: 2, remainder: 1 }]);
    expect(oneDraw.choice).toEqual({ kind: "sentinel" });
    expect(oneDraw.selectedPartyIndex).toBe(1);
    expect(oneDraw.draws.map(({ kind, remainder }) => ({ kind, remainder }))).toEqual([
      { kind: "natural-cure-status-move", remainder: 1 },
    ]);

    const twoDraw = evaluate(source, [
      { modulus: 2, remainder: 0 },
      { modulus: 2, remainder: 1 },
    ]);
    expect(twoDraw.choice).toEqual({ kind: "sentinel" });
    expect(twoDraw.selectedPartyIndex).toBe(1);
    expect(twoDraw.draws.map(({ kind, remainder }) => ({ kind, remainder }))).toEqual([
      { kind: "natural-cure-status-move", remainder: 0 },
      { kind: "natural-cure-final", remainder: 1 },
    ]);
  });

  it("consumes Natural Cure's modulo-1 defensive draw before guaranteed success", () => {
    const result = evaluate(rules({
      target: {
        side: 0,
        species: 76,
        ability: 69,
        types: ["TYPE_ROCK", "TYPE_GROUND"],
      },
      active: {
        side: 1,
        species: 358,
        ability: 30,
        types: ["TYPE_NORMAL", "TYPE_FLYING"],
        status1: BATTLE_SCRIPT_STATUS1_SLEEP,
      },
      bench: [partyMember(18, [57, 0, 0, 0])],
      lastLandedMove: 89,
      lastHitBy: 0,
    }), [{ modulus: 1, remainder: 0 }]);

    expect(result.choice).toEqual({ kind: "chosen", partyIndex: 1 });
    expect(result.selectedPartyIndex).toBe(1);
    expect(result.draws.map(({ kind, modulus, remainder, succeeded }) =>
      ({ kind, modulus, remainder, succeeded }))).toEqual([
      {
        kind: "natural-cure-defensive",
        modulus: 1,
        remainder: 0,
        succeeded: true,
      },
    ]);
  });

  it("continues active SE scans after zero and suppresses on the next nonzero roll", () => {
    const result = evaluate(rules({
      target: {
        side: 0,
        species: 6,
        ability: 66,
        types: ["TYPE_FIRE", "TYPE_FLYING"],
      },
      active: {
        side: 1,
        species: 134,
        ability: 11,
        types: ["TYPE_WATER", "TYPE_WATER"],
        moves: [57, 55, 0, 0],
      },
      bench: [partyMember(132, [33, 0, 0, 0])],
    }), [
      { modulus: 3, remainder: 1 },
      { modulus: 10, remainder: 0 },
      { modulus: 10, remainder: 1 },
    ]);

    expect(result.choice).toEqual({ kind: "no-switch" });
    expect(result.selectedPartyIndex).toBeNull();
    expect(result.draws.map(({ kind, moveSlot, remainder }) =>
      ({ kind, moveSlot, remainder }))).toEqual([
      { kind: "absorber-active-super-effective", moveSlot: null, remainder: 1 },
      { kind: "active-super-effective", moveSlot: 0, remainder: 0 },
      { kind: "active-super-effective", moveSlot: 1, remainder: 1 },
    ]);
    expect(result.branches.at(-1)).toMatchObject({
      branch: "active-super-effective",
      outcome: "suppressed",
    });
  });

  it("continues the immunity fallback across candidates and selects the second", () => {
    const result = evaluate(rules({
      target: {
        side: 0,
        species: 76,
        ability: 69,
        types: ["TYPE_ROCK", "TYPE_GROUND"],
      },
      active: {
        side: 1,
        species: 26,
        ability: 9,
        types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
        moves: [33, 0, 0, 0],
      },
      bench: [
        partyMember(18, [57, 0, 0, 0]),
        partyMember(18, [57, 0, 0, 0]),
      ],
      lastLandedMove: 89,
      lastHitBy: 0,
    }), [
      { modulus: 2, remainder: 1 },
      { modulus: 2, remainder: 0 },
    ]);

    expect(result.choice).toEqual({ kind: "chosen", partyIndex: 2 });
    expect(result.selectedPartyIndex).toBe(2);
    expect(result.draws.map(({ kind, partyIndex, moveSlot, remainder }) =>
      ({ kind, partyIndex, moveSlot, remainder }))).toEqual([
      { kind: "immunity-fallback", partyIndex: 1, moveSlot: 0, remainder: 1 },
      { kind: "immunity-fallback", partyIndex: 2, moveSlot: 0, remainder: 0 },
    ]);
  });

  it("exhausts immunity before reaching the not-very-effective modulo-3 fallback", () => {
    const result = evaluate(rules({
      target: {
        side: 0,
        species: 76,
        ability: 69,
        types: ["TYPE_ROCK", "TYPE_GROUND"],
      },
      active: {
        side: 1,
        species: 135,
        ability: 10,
        types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
        moves: [33, 0, 0, 0],
      },
      bench: [
        partyMember(76, [57, 0, 0, 0]),
        partyMember(45, [57, 0, 0, 0]),
      ],
      lastLandedMove: 85,
      lastHitBy: 0,
    }), [
      { modulus: 2, remainder: 1 },
      { modulus: 3, remainder: 0 },
    ]);

    expect(result.choice).toEqual({ kind: "chosen", partyIndex: 2 });
    expect(result.draws.map(({ kind, partyIndex, modulus, remainder }) =>
      ({ kind, partyIndex, modulus, remainder }))).toEqual([
      { kind: "immunity-fallback", partyIndex: 1, modulus: 2, remainder: 1 },
      {
        kind: "not-very-effective-fallback",
        partyIndex: 2,
        modulus: 3,
        remainder: 0,
      },
    ]);
    expect(result.branches.slice(-2).map(({ branch, outcome }) => ({ branch, outcome }))).toEqual([
      { branch: "immunity-fallback", outcome: "none" },
      { branch: "not-very-effective-fallback", outcome: "selected" },
    ]);
  });

  it.each([
    {
      name: "wrapped",
      active: { status2: BATTLE_SCRIPT_STATUS2_WRAPPED_MASK },
      target: {},
      flags: TRAINER_FACTORY,
      blocked: "wrapped-or-escape-prevented",
    },
    {
      name: "rooted",
      active: { status3: BATTLE_SCRIPT_STATUS3_ROOTED },
      target: {},
      flags: TRAINER_FACTORY,
      blocked: "rooted",
    },
    {
      name: "Shadow Tag",
      active: {},
      target: { ability: 23 },
      flags: TRAINER_FACTORY,
      blocked: "shadow-tag",
    },
    {
      name: "Arena Trap even for a Flying active",
      active: { species: 18, ability: 51, types: ["TYPE_NORMAL", "TYPE_FLYING"] as const },
      target: { ability: 71 },
      flags: TRAINER_FACTORY,
      blocked: "arena-trap",
    },
    {
      name: "Magnet Pull on Steel",
      active: { species: 81, ability: 42, types: ["TYPE_ELECTRIC", "TYPE_STEEL"] as const },
      target: {},
      flags: TRAINER_FACTORY,
      blocked: "magnet-pull-steel",
    },
    {
      name: "Battle Arena",
      active: {},
      target: {},
      flags: TRAINER_FACTORY | BATTLE_SCRIPT_BATTLE_TYPE_ARENA,
      blocked: "battle-arena",
    },
  ])("applies the source-ordered $name hard gate without a draw", (fixture) => {
    const result = evaluate(rules({
      active: {
        side: 1,
        species: 26,
        ability: 9,
        types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
        ...fixture.active,
      },
      target: {
        side: 0,
        species: 9,
        ability: 67,
        types: ["TYPE_WATER", "TYPE_WATER"],
        ...fixture.target,
      },
      bench: [partyMember(132, [33, 0, 0, 0])],
      battleTypeFlags: fixture.flags,
    }));

    expect(result.choice).toEqual({ kind: "no-switch" });
    expect(result.draws).toEqual([]);
    expect(result.branches.at(-1)).toMatchObject({
      branch: fixture.blocked,
      outcome: "blocked",
    });
  });

  it("suppresses switching when positive stage distance exceeds three", () => {
    const result = evaluate(rules({
      active: {
        side: 1,
        species: 26,
        ability: 9,
        types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
        statStages: [6, 8, 8, 2, 6, 6, 6, 6],
      },
      bench: [partyMember(132, [33, 0, 0, 0])],
    }));

    expect(result.choice).toEqual({ kind: "no-switch" });
    expect(result.draws).toEqual([]);
    expect(result.branches.at(-1)).toMatchObject({
      branch: "stats-raised",
      outcome: "suppressed",
    });
  });
});
