import { describe, expect, it } from "vitest";
import {
  createBattleCommandRequest,
  createBattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  createBattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import type {
  FactoryAiBattleHistory,
  FactoryAiChallengePolicy,
  FactoryAiLiveRules,
} from "../src/engine/factoryAiLiveDriver.ts";
import { encodeFactoryAiLiveViewInput } from "../core-rs/adapter/factoryAiLiveViewEngine.ts";
import {
  encodeFactoryAiLivePlannerInput,
  factoryAiLivePlannerEngine,
  invokeFactoryAiLivePlannerPacket,
  tsFactoryAiLivePlannerEngine,
  wasmFactoryAiLivePlannerEngine,
  type FactoryAiLivePlannerInput,
} from "../core-rs/adapter/factoryAiLivePlannerEngine.ts";

type Patch = Readonly<Record<string, unknown>>;
type Spec = Readonly<{
  label: string;
  category: string;
  factoryWinStreak?: number;
  seed?: number;
  calls?: number;
  randomTurnNumber?: number;
  battleTurnCount?: number;
  target?: Patch;
  attacker?: Patch;
  opponentParty?: readonly Patch[];
  lastLandedMove?: number;
  lastHitBy?: number;
  lastMoves?: readonly number[];
  observedAbilityIds?: readonly number[];
  observedItemEffects?: readonly number[];
  history?: Patch;
  legalDecisions?: readonly Patch[];
  boundary?: "not-decision";
}>;

const TRAINER_FACTORY = BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY;
const STAGES = [6, 6, 6, 6, 6, 6, 6, 6] as const;
const U8_BYTES = Uint8Array.BYTES_PER_ELEMENT;
const U32_BYTES = Uint32Array.BYTES_PER_ELEMENT;
const F64_BYTES = Float64Array.BYTES_PER_ELEMENT;
const PLANNER_PACKET = {
  battlerCount: 4,
  battlerExtraF64Fields: 2,
  observedSlots: 4,
  opponentPartyCount: 6,
  opponentMemberF64Fields: 7, // species, ability, HP, and four moves
  switchScalarF64Fields: 7,
  rngU32Fields: 2,
  requestIdBytes: U32_BYTES,
  legalDecisionBytes: 3, // tag, slot-or-party, target
} as const;
const MALFORMED_PLANNER_PACKET = {
  status: 2,
  message: "factory-wasm factoryAiLivePlannerEngine: malformed input",
} as const;
const UNKNOWN_ATTACKER_ABILITY = {
  status: 1,
  message: "Factory AI live view: unknown ability id 78",
} as const;

function battler(overrides: Patch = {}): Record<string, unknown> {
  const base = {
    side: 0, species: 105, ability: 69, moves: [70, 0, 0, 0],
    types: ["TYPE_GROUND", "TYPE_GROUND"], attack: 130, defense: 130,
    spAttack: 55, spDefense: 70, speed: 65, hp: 135, maxHP: 135,
    partyIndex: 0, pp: [10, 10, 10, 10], status1: 0, status2: 0, status3: 0,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0,
    rechargeTimer: 0, flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0,
    tauntTimer: 0, usedTauntedMove: 0, usedImprisonedMove: 0, level: 50,
    statStages: STAGES, isFirstTurn: 2, perishSongTimer: 0,
  };
  const value = { ...base, ...overrides };
  return {
    ...value,
    moves: [...(value.moves as readonly number[])],
    types: [...(value.types as readonly string[])],
    pp: [...(value.pp as readonly number[])],
    statStages: [...(value.statStages as readonly number[])],
  };
}

function attacker(overrides: Patch = {}): Record<string, unknown> {
  return battler({
    side: 1, species: 65, ability: 0, moves: [57, 157, 34, 85],
    types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"], attack: 55, defense: 65,
    spAttack: 135, spDefense: 105, speed: 140, partyIndex: 0,
    ...overrides,
  });
}

function empty(side: 0 | 1): Record<string, unknown> {
  return battler({
    side, species: 0, ability: 0, moves: [0, 0, 0, 0],
    types: ["TYPE_NORMAL", "TYPE_NORMAL"], attack: 0, defense: 0,
    spAttack: 0, spDefense: 0, speed: 0, hp: 0, maxHP: 0,
    partyIndex: side === 0 ? 0 : 1,
  });
}

function partyMember(overrides: Patch = {}): Record<string, unknown> {
  const base = { species: 0, isEgg: false, abilityNum: 0, hp: 0, maxHP: 0, moves: [0, 0, 0, 0] };
  const value = { ...base, ...overrides };
  return { ...value, moves: [...(value.moves as readonly number[])] };
}

function history(overrides: Patch = {}): FactoryAiBattleHistory {
  const base = {
    usedMoves: [[], [], [], []], knownAbilities: [null, null, null, null],
    knownItemEffects: [0, 0, 0, 0], partyIndexes: [0, 0, 2, 3],
  };
  const value = { ...base, ...overrides } as typeof base;
  return {
    usedMoves: value.usedMoves.map((row) => [...row]),
    knownAbilities: [...value.knownAbilities],
    knownItemEffects: [...value.knownItemEffects],
    partyIndexes: [...value.partyIndexes],
  } as unknown as FactoryAiBattleHistory;
}

function inputFor(spec: Spec): FactoryAiLivePlannerInput {
  const target = battler(spec.target);
  const active = attacker(spec.attacker);
  const opponent = Array.from({ length: 6 }, (_, index) => {
    if (spec.opponentParty?.[index] !== undefined) return partyMember(spec.opponentParty[index]);
    return index === active.partyIndex
      ? partyMember({ species: active.species, hp: active.hp, maxHP: active.maxHP, moves: active.moves })
      : partyMember();
  });
  const player = Array.from({ length: 6 }, (_, index) => index === target.partyIndex
    ? partyMember({ species: target.species, hp: target.hp, maxHP: target.maxHP, moves: target.moves })
    : partyMember());
  const rulesContext = createBattleScriptRulesContext({
    battlers: [target, active, empty(0), empty(1)],
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: 0, currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1,
    critMultiplier: 1, moveEffectByte: 0, missType: 0, hitMarker: 0, multiHitCounter: 0,
    battleTopology: { battlersCount: 2, battleTypeFlags: TRAINER_FACTORY, battlerPositions: [0, 1, 0xff, 0xff] },
    aiObservedAbilityIds: spec.observedAbilityIds ?? [0, 0, 0, 0],
    aiObservedItemEffects: spec.observedItemEffects ?? [0, 0, 0, 0],
    moveHistory: {
      lastMoves: spec.lastMoves ?? [0, 0, 0, 0],
      lastLandedMoves: [0, spec.lastLandedMove ?? 0, 0, 0],
      lastHitBy: [0xff, spec.lastHitBy ?? 0xff, 0xff, 0xff],
    },
    monToSwitchIntoId: [6, 6, 6, 6], party: { player, opponent },
    sideStatuses: [0, 0], weather: 0, randomTurnNumber: spec.randomTurnNumber ?? 0,
  } as never);
  const legalDecisions = (spec.legalDecisions ?? [0, 1, 2, 3].map((moveSlot) => ({
    kind: "use-move", moveSlot, targetBattler: 0,
  }))) as never;
  const request = createBattleCommandRequest({
    kind: "command", requestId: 91, side: "trainer", battler: 1, legalDecisions,
  });
  const initial = createBattleState({
    rules: { rulesContext } satisfies FactoryAiLiveRules,
    rngSeed: spec.seed ?? 0,
    rngCalls: spec.calls ?? 0,
    request,
  });
  const state = spec.boundary === "not-decision"
    ? Object.freeze({ ...initial, boundary: Object.freeze({ kind: "terminal" as const, outcome: "player-win" as const }) })
    : initial;
  const challenge: FactoryAiChallengePolicy = {
    factoryWinStreak: spec.factoryWinStreak ?? 28,
    trainerOpponentId: 222,
    ...(spec.battleTurnCount === undefined ? {} : { battleTurnCount: spec.battleTurnCount }),
  };
  return { state, history: history(spec.history), challenge };
}

const CASES = [
  { label: "selected_switch_bypasses_switch_only_request", category: "switch-selected", seed: 3, attacker: { moves: [34, 0, 0, 0] }, lastLandedMove: 57, lastHitBy: 0, opponentParty: [{ species: 65, hp: 135, moves: [34, 0, 0, 0] }, { species: 134, hp: 100, moves: [57, 0, 0, 0] }], legalDecisions: [{ kind: "switch", partyIndex: 1 }] },
  { label: "mask_zero_declined_switch_no_draws", category: "move-mask-0", factoryWinStreak: 0, attacker: { moves: [33, 0, 0, 0] }, legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }] },
  { label: "mask_one_no_switch_draw_prefix_seed_zero", category: "move-mask-1", factoryWinStreak: 14, opponentParty: [{ species: 65, hp: 135, moves: [57, 157, 34, 85] }, { species: 132, hp: 100, moves: [34, 0, 0, 0] }] },
  { label: "mask_one_u32_max_seed", category: "u32-rng-edge", factoryWinStreak: 14, seed: 0xffff_ffff, randomTurnNumber: 1, attacker: { moves: [33, 0, 0, 0] }, legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }] },
  { label: "mask_seven_turn_boundary_owner_zero", category: "move-mask-7-turn-owner", seed: 0x7654_3210, randomTurnNumber: 0, battleTurnCount: 7, opponentParty: [{ species: 65, hp: 135, moves: [57, 157, 34, 85] }, { species: 132, hp: 100, moves: [34, 0, 0, 0] }] },
  { label: "mask_seven_turn_boundary_owner_u16_max", category: "move-mask-7-turn-owner", seed: 0xffff_ffff, randomTurnNumber: 0xffff, battleTurnCount: 19, attacker: { status3: 1 << 10 }, legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }, { kind: "use-move", moveSlot: 2, targetBattler: 1 }] },
  { label: "history_party_change_last_move_and_observations", category: "history-sync", seed: 0x1020_3040, randomTurnNumber: 0x4321, target: { partyIndex: 1 }, lastMoves: [33, 0, 0, 0], observedAbilityIds: [9, 0, 0, 0], observedItemEffects: [44, 0, 0, 0], history: { usedMoves: [[70, 89], [57], [], []], knownAbilities: ["ABILITY_ROCK_HEAD", null, null, null], knownItemEffects: [29, 0, 0, 0], partyIndexes: [0, 0, 2, 3] }, legalDecisions: [{ kind: "use-move", moveSlot: 0, targetBattler: 0 }] },
  { label: "declined_switch_filters_mixed_authoritative_request", category: "move-request-filter", factoryWinStreak: 14, seed: 0x3141_5926, attacker: { moves: [33, 0, 0, 0] }, legalDecisions: [{ kind: "switch", partyIndex: 1 }, { kind: "use-move", moveSlot: 0, targetBattler: 1 }] },
  { label: "declined_switch_only_request_has_no_legal_move", category: "declined-switch-no-move", seed: 0xfeed_face, legalDecisions: [{ kind: "switch", partyIndex: 1 }] },
  { label: "boundary_guard_precedes_history_sync", category: "boundary-guard", boundary: "not-decision", observedAbilityIds: [79, 0, 0, 0] },
  { label: "history_ability_error_precedes_live_view", category: "ability-order", observedAbilityIds: [79, 0, 0, 0], attacker: { ability: 78 } },
  { label: "attacker_ability_error_precedes_target", category: "ability-order", attacker: { ability: 78 }, target: { ability: 79 } },
] as const satisfies readonly Spec[];

function outcome(engine: ReturnType<typeof tsFactoryAiLivePlannerEngine>, input: FactoryAiLivePlannerInput): unknown {
  try {
    return { ok: engine.planLiveFactoryAiDecision(input) };
  } catch (error) {
    return { error: error instanceof Error ? { name: error.name, message: error.message } : String(error) };
  }
}

function packetStatus(packet: Uint8Array): { status: number; message: string } {
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  return {
    status: view.getUint8(4),
    message: new TextDecoder().decode(packet.subarray(9, 9 + view.getUint32(5, true))),
  };
}

/** Derives raw suffix locations from the documented planner ABI-v1 layout. */
function plannerPacketOffsets(input: FactoryAiLivePlannerInput): Readonly<{
  firstOpponentEggTag: number;
  boundaryTag: number;
  requestKindTag: number;
  firstLegalDecisionTag: number;
  expectedLength: number;
}> {
  if (input.state.boundary.kind !== "decision-required"
    || input.state.boundary.request.kind !== "command"
    || input.state.boundary.request.legalDecisions.length === 0) {
    throw new Error("planner packet offset helper requires a command request with legal decisions");
  }
  const prefixLength = encodeFactoryAiLiveViewInput({
    rulesContext: input.state.rules.rulesContext,
    history: input.history,
    challenge: input.challenge,
  }).length;
  let offset = prefixLength;
  offset += PLANNER_PACKET.battlerCount * PLANNER_PACKET.battlerExtraF64Fields * F64_BYTES;
  offset += PLANNER_PACKET.observedSlots * F64_BYTES; // observed abilities
  offset += PLANNER_PACKET.observedSlots * F64_BYTES; // observed item effects
  const firstOpponentEggTag = offset + F64_BYTES;
  offset += PLANNER_PACKET.opponentPartyCount
    * (PLANNER_PACKET.opponentMemberF64Fields * F64_BYTES + U8_BYTES);
  offset += PLANNER_PACKET.switchScalarF64Fields * F64_BYTES;
  offset += PLANNER_PACKET.rngU32Fields * U32_BYTES;
  const boundaryTag = offset;
  const requestKindTag = boundaryTag + U8_BYTES;
  const firstLegalDecisionTag = requestKindTag
    + U8_BYTES // request kind
    + PLANNER_PACKET.requestIdBytes
    + U8_BYTES // request side
    + U8_BYTES // request battler
    + U8_BYTES; // legal decision count
  const expectedLength = firstLegalDecisionTag
    + input.state.boundary.request.legalDecisions.length * PLANNER_PACKET.legalDecisionBytes;
  return { firstOpponentEggTag, boundaryTag, requestKindTag, firstLegalDecisionTag, expectedLength };
}

function overwritePacketByte(packet: Uint8Array, offset: number, value: number): Uint8Array {
  if (offset < 0 || offset >= packet.length) {
    throw new Error(`planner packet offset ${offset} is outside ${packet.length} bytes`);
  }
  const result = packet.slice();
  result[offset] = value;
  return result;
}

async function expectMalformedPlannerPacket(packet: Uint8Array): Promise<void> {
  expect(packetStatus(await invokeFactoryAiLivePlannerPacket(packet))).toEqual(MALFORMED_PLANNER_PACKET);
}

describe("Factory AI live planner ABI-v1 parity", () => {
  it("matches the M8i 12-case / 10-category surface in both modes", async () => {
    const engines = [tsFactoryAiLivePlannerEngine(), await wasmFactoryAiLivePlannerEngine()];
    const categories = new Set<string>();
    for (const spec of CASES) {
      categories.add(spec.category);
      const input = inputFor(spec);
      expect(outcome(engines[1]!, input), spec.label).toEqual(outcome(engines[0]!, input));
    }
    expect(CASES).toHaveLength(12);
    expect(categories.size).toBe(10);
  });

  it("gives malformed structure status 2 before semantic evaluation", async () => {
    const input = inputFor(CASES[1]);
    const valid = encodeFactoryAiLivePlannerInput(input);
    const offsets = plannerPacketOffsets(input);
    expect(valid).toHaveLength(offsets.expectedLength);
    for (const packet of [
      valid.slice(0, -1),
      Uint8Array.from([...valid, 0]),
      overwritePacketByte(valid, offsets.firstOpponentEggTag, 2),
      overwritePacketByte(valid, offsets.boundaryTag, 9),
      overwritePacketByte(valid, offsets.requestKindTag, 2),
      overwritePacketByte(valid, offsets.firstLegalDecisionTag, 2),
    ]) {
      await expectMalformedPlannerPacket(packet);
    }

    const semanticFailure = inputFor({
      label: "unknown_attacker_ability_raw_precedence",
      category: "raw-structural-precedence",
      attacker: { ability: 78 },
    });
    const semanticallyInvalidPacket = encodeFactoryAiLivePlannerInput(semanticFailure);
    const semanticOffsets = plannerPacketOffsets(semanticFailure);
    expect(semanticallyInvalidPacket).toHaveLength(semanticOffsets.expectedLength);
    expect(packetStatus(await invokeFactoryAiLivePlannerPacket(semanticallyInvalidPacket)))
      .toEqual(UNKNOWN_ATTACKER_ABILITY);
    for (const packet of [
      semanticallyInvalidPacket.slice(0, -1),
      Uint8Array.from([...semanticallyInvalidPacket, 0]),
      overwritePacketByte(semanticallyInvalidPacket, semanticOffsets.requestKindTag, 2),
    ]) {
      await expectMalformedPlannerPacket(packet);
    }
  });

  it("pins default selection and forced-WASM no-fallback behavior", async () => {
    const priorEngine = process.env.POKEBENCH_ENGINE;
    const priorArtifact = process.env.POKEBENCH_WASM_ARTIFACT;
    try {
      delete process.env.POKEBENCH_ENGINE;
      expect((await factoryAiLivePlannerEngine()).id).toBe("ts");
      process.env.POKEBENCH_ENGINE = "wasm";
      expect((await factoryAiLivePlannerEngine()).id).toBe("wasm");
      process.env.POKEBENCH_WASM_ARTIFACT = "/definitely-missing/factory_wasm.wasm";
      await expect(factoryAiLivePlannerEngine()).rejects.toThrow("factory-wasm artifact not found");
    } finally {
      if (priorEngine === undefined) delete process.env.POKEBENCH_ENGINE;
      else process.env.POKEBENCH_ENGINE = priorEngine;
      if (priorArtifact === undefined) delete process.env.POKEBENCH_WASM_ARTIFACT;
      else process.env.POKEBENCH_WASM_ARTIFACT = priorArtifact;
    }
  });
});
