import { describe, expect, it } from "vitest";
import {
  factoryAiEngine,
  tsFactoryAiEngine,
  wasmFactoryAiEngine,
} from "../core-rs/adapter/factoryAiEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";
import {
  getMostSuitableMonToSwitchInto,
  type BattleAiSwitchBench,
  type BattleAiSwitchBenchMember,
  type BattleAiSwitchDamageFallback,
  type BattleAiSwitchTypes,
} from "../src/engine/battleAiSwitchInto.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_ARENA,
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  evaluateFactoryAiSwitchPolicy,
  isFactoryAiSwitchPrecheckBlocked,
  type FactoryAiSwitchPolicyInput,
} from "../src/engine/factoryAiSwitchPolicy.ts";

const TRAINER_FACTORY = BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY;
const EMPTY: BattleScriptPartyMemberInput = Object.freeze({ species: 0, isEgg: false, hp: 0 });
const NEUTRAL = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);
const TYPES = [
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY", "TYPE_FIRE",
  "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC", "TYPE_ICE",
  "TYPE_DRAGON", "TYPE_DARK",
] as const;

function switchMember(patch: Partial<BattleAiSwitchBenchMember> = {}): BattleAiSwitchBenchMember {
  return Object.freeze({
    species: patch.species ?? 0,
    hp: patch.hp ?? 0,
    types: patch.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    moves: patch.moves ?? ([0, 0, 0, 0] as const),
  });
}

function switchBench(slots: readonly Partial<BattleAiSwitchBenchMember>[]): BattleAiSwitchBench {
  return Array.from({ length: 6 }, (_, index) => switchMember(slots[index])) as unknown as BattleAiSwitchBench;
}

type BattlerSpec = Partial<BattleScriptRulesBattler> & Pick<BattleScriptRulesBattler, "side" | "species" | "ability" | "types">;
function battler(spec: BattlerSpec): BattleScriptRulesBattler {
  return {
    side: spec.side, species: spec.species, ability: spec.ability, types: spec.types,
    hp: spec.hp ?? 100, maxHP: spec.maxHP ?? 100, moves: spec.moves ?? [33, 0, 0, 0],
    pp: spec.pp ?? [10, 10, 10, 10], status1: spec.status1 ?? 0, status2: spec.status2 ?? 0,
    status3: spec.status3 ?? 0, statStages: spec.statStages ?? NEUTRAL, substituteHP: 0,
    rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0,
    usedTauntedMove: 0, usedImprisonedMove: 0, level: 50, attack: 100, defense: 100,
    spAttack: 100, spDefense: 100, speed: 100, partyIndex: spec.partyIndex ?? 0,
    perishSongTimer: spec.perishSongTimer ?? 0, isFirstTurn: 0,
  };
}

function partyMember(species: number, moves: readonly [number, number, number, number], patch: Partial<BattleScriptPartyMemberInput> = {}): BattleScriptPartyMemberInput {
  return { species, isEgg: false, abilityNum: 0, hp: 100, maxHP: 100, moves, ...patch };
}

type RulesSpec = Readonly<{
  target?: BattlerSpec;
  active?: BattlerSpec;
  bench?: readonly BattleScriptPartyMemberInput[];
  lastLandedMove?: number;
  lastHitBy?: number;
  reservedPartyIndex?: number;
  absentBattlerFlags?: number;
  battleTypeFlags?: number;
  battlersCount?: 2 | 4;
  policyTopologyPatch?: Readonly<{ battlersCount?: 2 | 4; battleTypeFlags?: number }>;
}>;

function rules(spec: RulesSpec = {}): BattleScriptRulesContext {
  const target = battler(spec.target ?? { side: 0, species: 9, ability: 67, types: ["TYPE_WATER", "TYPE_WATER"] });
  const active = battler(spec.active ?? { side: 1, species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] });
  const empty = battler({ side: 0, species: 0, ability: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], hp: 0, maxHP: 0, moves: [0, 0, 0, 0] });
  const count: 2 | 4 = spec.battlersCount ?? 2;
  const result = createBattleScriptRulesContext({
    battlers: [target, active, empty, { ...empty, side: 1 }], scriptingBattler: 0,
    atkCancelerTracker: 0, battleOutcome: 0, currentMove: 0, currentMovePosition: 0,
    moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1, moveEffectByte: 0,
    missType: 0, hitMarker: 0, multiHitCounter: 0,
    party: {
      player: [partyMember(target.species!, target.moves), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      opponent: [partyMember(active.species!, active.moves, { hp: active.hp, maxHP: active.maxHP, status1: active.status1 }), ...(spec.bench ?? []), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY].slice(0, 6),
    },
    moveHistory: { lastLandedMoves: [0, spec.lastLandedMove ?? 0, 0, 0], lastHitBy: [0xff, spec.lastHitBy ?? 0xff, 0xff, 0xff] },
    battleTopology: { battlersCount: count, battleTypeFlags: spec.battleTypeFlags ?? TRAINER_FACTORY, battlerPositions: count === 2 ? [0, 1, 0xff, 0xff] : [0, 1, 2, 3] },
    monToSwitchIntoId: [6, spec.reservedPartyIndex ?? 6, 6, 6],
    absentBattlerFlags: spec.absentBattlerFlags ?? 0,
  });
  return spec.policyTopologyPatch === undefined ? result : Object.freeze({
    ...result,
    battleTopology: Object.freeze({ ...result.battleTopology, ...spec.policyTopologyPatch }),
  });
}

function policyInput(spec: RulesSpec, value: number, fallback?: BattleAiSwitchDamageFallback): FactoryAiSwitchPolicyInput {
  return { rules: rules(spec), rng: { value: value >>> 0, calls: value & 7 }, suitableDamageFallback: fallback };
}

const policySpecs: readonly RulesSpec[] = [
  { bench: [partyMember(132, [33, 0, 0, 0])] },
  { bench: [] },
  { active: { side: 1, species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], status2: 0xe000 }, bench: [partyMember(132, [33, 0, 0, 0])] },
  { active: { side: 1, species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], status3: 1 << 10 }, bench: [partyMember(132, [33, 0, 0, 0])] },
  { target: { side: 0, species: 9, ability: 23, types: ["TYPE_WATER", "TYPE_WATER"] }, bench: [partyMember(132, [33, 0, 0, 0])] },
  { target: { side: 0, species: 9, ability: 71, types: ["TYPE_WATER", "TYPE_WATER"] }, bench: [partyMember(132, [33, 0, 0, 0])] },
  { target: { side: 0, species: 9, ability: 42, types: ["TYPE_WATER", "TYPE_WATER"] }, active: { side: 1, species: 81, ability: 42, types: ["TYPE_ELECTRIC", "TYPE_STEEL"] }, bench: [partyMember(132, [33, 0, 0, 0])] },
  { battleTypeFlags: TRAINER_FACTORY | BATTLE_SCRIPT_BATTLE_TYPE_ARENA, bench: [partyMember(132, [33, 0, 0, 0])] },
  { target: { side: 0, species: 200, ability: 26, types: ["TYPE_GHOST", "TYPE_GHOST"] }, active: { side: 1, species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status3: 1 << 5, perishSongTimer: 0 }, bench: [partyMember(134, [44, 0, 0, 0])] },
  { target: { side: 0, species: 303, ability: 25, types: ["TYPE_BUG", "TYPE_GHOST"] }, active: { side: 1, species: 134, ability: 11, types: ["TYPE_WATER", "TYPE_WATER"], moves: [57, 58, 92, 182] }, bench: [partyMember(4, [33, 45, 10, 53])] },
  { active: { side: 1, species: 134, ability: 11, types: ["TYPE_WATER", "TYPE_WATER"], moves: [57, 0, 0, 0] }, bench: [partyMember(134, [44, 0, 0, 0])], lastLandedMove: 55, lastHitBy: 0 },
  { bench: [partyMember(134, [44, 0, 0, 0])], lastLandedMove: 55, lastHitBy: 0 },
  { target: { side: 0, species: 47, ability: 27, types: ["TYPE_BUG", "TYPE_GRASS"] }, active: { side: 1, species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status1: 7 }, bench: [partyMember(4, [53, 0, 0, 0])], lastLandedMove: 0 },
  { target: { side: 0, species: 47, ability: 27, types: ["TYPE_BUG", "TYPE_GRASS"] }, active: { side: 1, species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status1: 7 }, bench: [partyMember(4, [53, 0, 0, 0])], lastLandedMove: 147, lastHitBy: 0 },
  { target: { side: 0, species: 76, ability: 69, types: ["TYPE_ROCK", "TYPE_GROUND"] }, active: { side: 1, species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status1: 7 }, bench: [partyMember(18, [57, 0, 0, 0])], lastLandedMove: 89, lastHitBy: 0 },
  { target: { side: 0, species: 6, ability: 66, types: ["TYPE_FIRE", "TYPE_FLYING"] }, active: { side: 1, species: 134, ability: 11, types: ["TYPE_WATER", "TYPE_WATER"], moves: [57, 55, 0, 0] }, bench: [partyMember(132, [33, 0, 0, 0])] },
  { active: { side: 1, species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], statStages: [6, 8, 8, 2, 6, 6, 6, 6] }, bench: [partyMember(132, [33, 0, 0, 0])] },
  { target: { side: 0, species: 76, ability: 69, types: ["TYPE_ROCK", "TYPE_GROUND"] }, bench: [partyMember(18, [57, 0, 0, 0]), partyMember(18, [57, 0, 0, 0])], lastLandedMove: 89, lastHitBy: 0 },
  { target: { side: 0, species: 76, ability: 69, types: ["TYPE_ROCK", "TYPE_GROUND"] }, active: { side: 1, species: 135, ability: 10, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] }, bench: [partyMember(76, [57, 0, 0, 0]), partyMember(45, [57, 0, 0, 0])], lastLandedMove: 85, lastHitBy: 0 },
  { active: { side: 1, species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status3: 1 << 5, perishSongTimer: 0 }, bench: [partyMember(132, [0, 0, 0, 0])] },
];

describe("factory switch ABI-v1 parity", () => {
  it("matches the selector's focused quirks and deterministic type/move sweep in both adapters", async () => {
    const engines = [tsFactoryAiEngine(), await wasmFactoryAiEngine()];
    const focused: readonly [BattleAiSwitchBench, number, BattleAiSwitchTypes, BattleAiSwitchDamageFallback?][] = [
      [switchBench([{ species: 191, hp: 0 }, { species: 16, hp: 100, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [33, 0, 0, 0] }, { species: 66, hp: 100, types: ["TYPE_FIGHTING", "TYPE_FIGHTING"], moves: [2, 0, 0, 0] }]), 0, ["TYPE_NORMAL", "TYPE_NORMAL"]],
      [switchBench([{ species: 191, hp: 0 }, { species: 16, hp: 100, moves: [33, 0, 0, 0] }]), 0, ["TYPE_NORMAL", "TYPE_NORMAL"]],
      [switchBench([{ species: 191, hp: 0 }, { species: 16, hp: 100, moves: [55, 0, 0, 0] }, { species: 66, hp: 100, moves: [33, 0, 0, 0] }]), 0, ["TYPE_NORMAL", "TYPE_NORMAL"], { baseDamage: 200, activeTypes: ["TYPE_WATER", "TYPE_WATER"], opposingTypes: ["TYPE_NORMAL", "TYPE_NORMAL"], opposingAbility: 0, opposingStatus2: 0 }],
      [switchBench([{ species: 1, hp: 0 }, { species: 2, hp: 100, types: ["TYPE_GROUND", "TYPE_GROUND"], moves: [341, 0, 0, 0] }]), 0, ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], { baseDamage: 80, activeTypes: ["TYPE_GROUND", "TYPE_GROUND"], opposingTypes: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], opposingAbility: 26, opposingStatus2: 0 }],
    ];
    const cases = [...focused];
    for (let index = 0; index < 96; index++) {
      const opposingTypes: BattleAiSwitchTypes = [TYPES[index % TYPES.length], TYPES[(index * 7 + 3) % TYPES.length]];
      const slots = Array.from({ length: 6 }, (_, partyIndex) => ({
        species: partyIndex === 0 ? 1 : 1 + ((index * 31 + partyIndex * 53) % 411),
        hp: partyIndex === 0 || (index + partyIndex) % 11 === 0 ? 0 : 1 + ((index * 17 + partyIndex) % 300),
        types: [TYPES[(index + partyIndex) % TYPES.length], TYPES[(index * 5 + partyIndex * 3) % TYPES.length]] as BattleAiSwitchTypes,
        moves: [0, 2, 33, 1 + ((index * 13 + partyIndex * 29) % 354)] as const,
      }));
      const fallback = index % 3 === 0 ? undefined : { baseDamage: (index * 97) - 300, activeTypes: slots[0]!.types, opposingTypes, opposingAbility: index % 5 === 0 ? 26 : 0, opposingStatus2: index % 7 === 0 ? 1 << 29 : 0 };
      cases.push([switchBench(slots), 0, opposingTypes, fallback]);
    }
    for (const [bench, active, opposing, fallback] of cases) {
      const expected = getMostSuitableMonToSwitchInto(bench, active, opposing, fallback);
      for (const engine of engines) expect(engine.getMostSuitableMonToSwitchInto(bench, active, opposing, fallback)).toEqual(expected);
    }
    expect(cases).toHaveLength(100);
  });

  it("matches complete policy/precheck objects, typed errors, and the full retained census", async () => {
    const engines = [tsFactoryAiEngine(), await wasmFactoryAiEngine()];
    const choices = new Set<string>();
    const draws = new Set<string>();
    const branches = new Set<string>();
    const outcomes = new Set<string>();
    let comparisons = 0;
    for (const spec of policySpecs) {
      for (const value of [0, 1, 2, 3, 0x12345678, 0xdeadbeef, 0xf69f135c, 0xcb7bc739]) {
        const input = policyInput(spec, value);
        let expected: ReturnType<typeof evaluateFactoryAiSwitchPolicy> | Error;
        try { expected = evaluateFactoryAiSwitchPolicy(input); } catch (error) { expected = error as Error; }
        for (const engine of engines) {
          expect(engine.isFactoryAiSwitchPrecheckBlocked(input.rules)).toBe(isFactoryAiSwitchPrecheckBlocked(input.rules));
          if (expected instanceof Error) expect(() => engine.evaluateFactoryAiSwitchPolicy(input)).toThrow(expected.message);
          else expect(engine.evaluateFactoryAiSwitchPolicy(input)).toEqual(expected);
        }
        if (!(expected instanceof Error)) {
          choices.add(expected.choice.kind);
          expected.draws.forEach((draw) => draws.add(draw.kind));
          expected.branches.forEach((branch) => { branches.add(branch.branch); outcomes.add(branch.outcome); });
        }
        comparisons += 1;
      }
    }
    for (const input of [
      policyInput({ bench: [partyMember(132, [33, 0, 0, 0])], battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_FACTORY }, 0),
      policyInput({ bench: [partyMember(132, [33, 0, 0, 0])], policyTopologyPatch: { battleTypeFlags: TRAINER_FACTORY | BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE } }, 0),
      policyInput({ bench: [partyMember(132, [33, 0, 0, 0])], policyTopologyPatch: { battlersCount: 4 } }, 0),
    ]) {
      for (const engine of engines) expect(() => engine.evaluateFactoryAiSwitchPolicy(input)).toThrow("factory-ai-switch-policy supports only trainer singles");
    }
    expect({ choices: choices.size, draws: draws.size, branches: branches.size, outcomes: outcomes.size, comparisons }).toEqual({ choices: 3, draws: 10, branches: 17, outcomes: 5, comparisons: 160 });
  });

  it("selects the requested adapter mode and rejects malformed boundary lengths without trapping", async () => {
    expect((await factoryAiEngine()).id).toBe(process.env.POKEBENCH_ENGINE === "wasm" ? "wasm" : "ts");
    const wasm = await loadFactoryWasm();
    function boundaryMessage(width: number, invoke: (ptr: number, len: number) => number): string {
      const input = wasm.fw_alloc(width);
      let output: number;
      try { output = invoke(input, width); } finally { wasm.fw_free(input, width); }
      const view = new DataView(wasm.memory.buffer, output, 7);
      const total = view.getUint32(0, true);
      expect(view.getUint8(4)).toBe(2);
      const messageLength = view.getUint16(5, true);
      const message = new TextDecoder().decode(new Uint8Array(wasm.memory.buffer, output + 7, messageLength).slice());
      wasm.fw_free(output, total);
      return message;
    }
    for (const width of [1, 113, 115]) expect(boundaryMessage(width, wasm.fw_get_most_suitable_mon_to_switch_into)).toBe("factory-wasm factoryAiEngine: switch-into input must be exactly 114 bytes");
    for (const width of [1, 400, 402]) expect(boundaryMessage(width, wasm.fw_evaluate_factory_ai_switch_policy)).toBe("factory-wasm factoryAiEngine: switch-policy input must be exactly 401 bytes");
  });
});
