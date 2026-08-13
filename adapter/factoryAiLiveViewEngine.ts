// Uniform adapter for the source-shaped Factory AI live-view constructor.
// The TypeScript constructor is canonical/default. POKEBENCH_ENGINE=wasm
// invokes fw_create_factory_ai_view_from_live_rules directly; there is no
// TypeScript fallback in that path.

import {
  createFactoryAiViewFromLiveRules as tsCreate,
  type FactoryAiBattleHistory,
  type FactoryAiChallengePolicy,
} from "../../src/engine/factoryAiLiveDriver.ts";
import type { BattleScriptRulesContext } from "../../src/engine/battleScriptRulesContext.ts";
import type {
  FactoryAiScoredBattlerView,
  FactoryAiScoredTargetView,
  FactoryAiScoredView,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";
import { defaultEngineId } from "./rngEngine.ts";

export type FactoryAiLiveViewInput = Readonly<{
  rulesContext: BattleScriptRulesContext;
  history: FactoryAiBattleHistory;
  challenge: FactoryAiChallengePolicy;
}>;

export interface FactoryAiLiveViewEngine {
  readonly id: "ts" | "wasm";
  createFactoryAiViewFromLiveRules(input: FactoryAiLiveViewInput): FactoryAiScoredView;
}

/** Shared little-endian packet writer for the live-view ABI family. */
export class FactoryAiLiveViewPacketWriter {
  private readonly bytes: number[] = [];

  u8(value: number): void { this.bytes.push(value); }

  u16(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
      throw new Error(`factory-wasm factoryAiLiveViewEngine: width ${value} is not a u16`);
    }
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff);
  }

  u32(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
      throw new Error(`factory-wasm factoryAiLiveViewEngine: width ${value} is not a u32`);
    }
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  f64(value: number): void {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setFloat64(0, value, true);
    this.raw(bytes);
  }

  string(value: string): void {
    const bytes = new TextEncoder().encode(value);
    this.u32(bytes.length);
    this.raw(bytes);
  }

  raw(value: Uint8Array): void {
    for (const byte of value) this.bytes.push(byte);
  }

  finish(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

type Writer = FactoryAiLiveViewPacketWriter;

class Reader {
  private readonly view: DataView;
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  private take(width: number): Uint8Array {
    if (this.offset + width > this.bytes.length) {
      throw new Error("factory-wasm factoryAiLiveViewEngine: truncated output");
    }
    const value = this.bytes.subarray(this.offset, this.offset + width);
    this.offset += width;
    return value;
  }

  u8(): number { return this.take(1)[0]!; }
  u32(): number { return this.view.getUint32(this.take(4).byteOffset - this.bytes.byteOffset, true); }
  f64(): number { return this.view.getFloat64(this.take(8).byteOffset - this.bytes.byteOffset, true); }

  string(): string {
    const length = this.u32();
    const bytes = this.take(length);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  finish(): void {
    if (this.offset !== this.bytes.length) {
      throw new Error(`factory-wasm factoryAiLiveViewEngine: decoded ${this.offset} of ${this.bytes.length} output bytes`);
    }
  }
}

function writeHistory(writer: Writer, history: FactoryAiBattleHistory): void {
  for (const moves of history.usedMoves) {
    writer.u32(moves.length);
    for (const moveId of moves) writer.f64(moveId);
  }
  for (const ability of history.knownAbilities) {
    writer.u8(ability === null ? 0 : 1);
    if (ability !== null) writer.string(ability);
  }
  for (const itemEffect of history.knownItemEffects) writer.f64(itemEffect);
  for (const partyIndex of history.partyIndexes) writer.f64(partyIndex);
}

function writeBattler(writer: Writer, battler: BattleScriptRulesContext["battlers"][number]): void {
  writer.string(battler.types[0]);
  writer.string(battler.types[1]);
  writer.f64(battler.attack);
  writer.f64(battler.defense);
  writer.f64(battler.spAttack);
  writer.f64(battler.spDefense);
  writer.f64(battler.speed);
  writer.f64(battler.level);
  for (const stage of battler.statStages) writer.f64(stage);
  writer.f64(battler.isFirstTurn);
  writer.f64(battler.hp);
  writer.f64(battler.maxHP);
  writer.f64(battler.ability);
  writer.f64(battler.status1);
  writer.f64(battler.status2);
  writer.f64(battler.status3);
  writer.f64(battler.protectUses);
  writer.f64(battler.tauntTimer);
  writer.f64(battler.species);
  for (const moveId of battler.moves) writer.f64(moveId);
}

/** Encodes the exact packet accepted by fw_create_factory_ai_view_from_live_rules. */
export function encodeFactoryAiLiveViewInput(input: FactoryAiLiveViewInput): Uint8Array {
  const writer = new FactoryAiLiveViewPacketWriter();
  for (const battler of input.rulesContext.battlers) writeBattler(writer, battler);
  writer.f64(input.rulesContext.weather);
  for (const sideStatus of input.rulesContext.sideStatuses) writer.f64(sideStatus);
  for (const lastMove of input.rulesContext.moveHistory.lastMoves) writer.f64(lastMove);
  writeHistory(writer, input.history);
  writer.f64(input.challenge.factoryWinStreak);
  writer.f64(input.challenge.trainerOpponentId);
  if (input.challenge.battleTurnCount === undefined) {
    writer.u8(0);
  } else {
    writer.u8(1);
    writer.f64(input.challenge.battleTurnCount);
  }
  return writer.finish();
}

function optionalBool(reader: Reader): boolean | undefined {
  const present = reader.u8();
  if (present === 0) return undefined;
  if (present !== 1) throw new Error("factory-wasm factoryAiLiveViewEngine: invalid boolean presence");
  const value = reader.u8();
  if (value !== 0 && value !== 1) throw new Error("factory-wasm factoryAiLiveViewEngine: invalid boolean value");
  return value === 1;
}

function optionalWeather(reader: Reader): number | undefined {
  const present = reader.u8();
  if (present === 0) return undefined;
  if (present !== 1) throw new Error("factory-wasm factoryAiLiveViewEngine: invalid weather presence");
  const weather = reader.u8();
  if (weather > 3) throw new Error("factory-wasm factoryAiLiveViewEngine: invalid weather value");
  return weather;
}

function decodeBattler(reader: Reader): FactoryAiScoredBattlerView {
  const types = [reader.string(), reader.string()] as [string, string];
  const attack = reader.f64();
  const defense = reader.f64();
  const spAttack = reader.f64();
  const spDefense = reader.f64();
  const speed = reader.f64();
  const level = reader.f64();
  const stages = {
    atk: reader.f64(),
    def: reader.f64(),
    speed: reader.f64(),
    spAtk: reader.f64(),
    spDef: reader.f64(),
    acc: reader.f64(),
    evasion: reader.f64(),
  } as const;
  const isFirstTurn = reader.f64();
  const hp = reader.f64();
  const maxHp = reader.f64();
  const ability = reader.string();
  const battleTurnCount = reader.f64();
  const lightScreenUp = reader.u8() !== 0;
  const reflectUp = reader.u8() !== 0;
  const currentWeather = optionalWeather(reader);
  const isRooted = reader.u8() !== 0;
  const attackerFutureAttackUp = optionalBool(reader);
  const isInfatuated = optionalBool(reader);
  const safeguardUp = optionalBool(reader);
  const isAsleep = optionalBool(reader);
  const hasCurableStatus = optionalBool(reader);
  const hasSubstitute = optionalBool(reader);
  const hasFocusEnergy = optionalBool(reader);
  const isLeechSeeded = optionalBool(reader);
  const hasYawn = optionalBool(reader);
  const protectPresent = reader.u8();
  if (protectPresent !== 0 && protectPresent !== 1) {
    throw new Error("factory-wasm factoryAiLiveViewEngine: invalid protect-uses presence");
  }
  const protectUses = protectPresent === 1 ? reader.f64() : undefined;

  const result: Record<string, unknown> = {
    types,
    attack,
    defense,
    spAttack,
    spDefense,
    speed,
    level,
    statStages: stages,
    isFirstTurn,
    hp,
    maxHp,
    ability,
    battleTurnCount,
    lightScreenUp,
    reflectUp,
    isRooted,
  };
  if (currentWeather !== undefined) result.currentWeather = currentWeather;
  if (attackerFutureAttackUp !== undefined) result.attackerFutureAttackUp = attackerFutureAttackUp;
  if (isInfatuated !== undefined) result.isInfatuated = isInfatuated;
  if (safeguardUp !== undefined) result.safeguardUp = safeguardUp;
  if (isAsleep !== undefined) result.isAsleep = isAsleep;
  if (hasCurableStatus !== undefined) result.hasCurableStatus = hasCurableStatus;
  if (hasSubstitute !== undefined) result.hasSubstitute = hasSubstitute;
  if (hasFocusEnergy !== undefined) result.hasFocusEnergy = hasFocusEnergy;
  if (isLeechSeeded !== undefined) result.isLeechSeeded = isLeechSeeded;
  if (hasYawn !== undefined) result.hasYawn = hasYawn;
  if (protectUses !== undefined) result.protectUses = protectUses;
  return result as FactoryAiScoredBattlerView;
}

function decodeTarget(reader: Reader): FactoryAiScoredTargetView {
  const species = reader.f64();
  const types = [reader.string(), reader.string()] as [string, string];
  const attack = reader.f64();
  const defense = reader.f64();
  const spAttack = reader.f64();
  const spDefense = reader.f64();
  const speed = reader.f64();
  const level = reader.f64();
  const stages = {
    atk: reader.f64(),
    def: reader.f64(),
    speed: reader.f64(),
    spAtk: reader.f64(),
    spDef: reader.f64(),
    acc: reader.f64(),
    evasion: reader.f64(),
  } as const;
  const isFirstTurn = reader.f64();
  const hp = reader.f64();
  const maxHp = reader.f64();
  const lastUsedMoveId = reader.f64();
  const hasAnyStatus = optionalBool(reader);
  const isAsleep = optionalBool(reader);
  const isToxicPoisoned = reader.u8() !== 0;
  const isLeechSeeded = reader.u8() !== 0;
  const isCursed = reader.u8() !== 0;
  const isConfused = optionalBool(reader);
  const isTaunted = optionalBool(reader);
  const isInfatuated = optionalBool(reader);
  const isEscapePrevented = optionalBool(reader);
  const isTormented = optionalBool(reader);
  const isNightmared = optionalBool(reader);
  const isForesighted = optionalBool(reader);
  const hasYawn = optionalBool(reader);
  const hasPerishSong = optionalBool(reader);
  const ability = reader.string();
  const knownAbilityPresent = reader.u8();
  if (knownAbilityPresent !== 0 && knownAbilityPresent !== 1) {
    throw new Error("factory-wasm factoryAiLiveViewEngine: invalid known-ability presence");
  }
  const knownAbility = knownAbilityPresent === 1 ? reader.string() : null;
  const knownItemEffect = reader.f64();
  const knownMovePresent = reader.u8();
  if (knownMovePresent !== 0 && knownMovePresent !== 1) {
    throw new Error("factory-wasm factoryAiLiveViewEngine: invalid known-move presence");
  }
  const knownMoveIds = knownMovePresent === 1
    ? Array.from({ length: reader.u32() }, () => reader.f64())
    : undefined;
  const safeguardUp = optionalBool(reader);
  const spikesUp = optionalBool(reader);
  const targetFutureAttackUp = optionalBool(reader);

  const result: Record<string, unknown> = {
    species,
    types,
    attack,
    defense,
    spAttack,
    spDefense,
    speed,
    level,
    statStages: stages,
    isFirstTurn,
    hp,
    maxHp,
    lastUsedMoveId,
    isToxicPoisoned,
    isLeechSeeded,
    isCursed,
    ability,
    knownAbility,
    knownItemEffect,
  };
  if (hasAnyStatus !== undefined) result.hasAnyStatus = hasAnyStatus;
  if (isAsleep !== undefined) result.isAsleep = isAsleep;
  if (isConfused !== undefined) result.isConfused = isConfused;
  if (isTaunted !== undefined) result.isTaunted = isTaunted;
  if (isInfatuated !== undefined) result.isInfatuated = isInfatuated;
  if (isEscapePrevented !== undefined) result.isEscapePrevented = isEscapePrevented;
  if (isTormented !== undefined) result.isTormented = isTormented;
  if (isNightmared !== undefined) result.isNightmared = isNightmared;
  if (isForesighted !== undefined) result.isForesighted = isForesighted;
  if (hasYawn !== undefined) result.hasYawn = hasYawn;
  if (hasPerishSong !== undefined) result.hasPerishSong = hasPerishSong;
  if (knownMoveIds !== undefined) result.knownMoveIds = knownMoveIds;
  if (safeguardUp !== undefined) result.safeguardUp = safeguardUp;
  if (spikesUp !== undefined) result.spikesUp = spikesUp;
  if (targetFutureAttackUp !== undefined) result.targetFutureAttackUp = targetFutureAttackUp;
  return result as FactoryAiScoredTargetView;
}

export function decodeFactoryAiLiveView(bytes: Uint8Array): FactoryAiScoredView {
  const reader = new Reader(bytes);
  const totalLength = reader.u32();
  if (totalLength !== bytes.length) {
    throw new Error(`factory-wasm factoryAiLiveViewEngine: output length ${totalLength} != ${bytes.length}`);
  }
  const status = reader.u8();
  if (status === 1 || status === 2) {
    const message = reader.string();
    reader.finish();
    throw new Error(message);
  }
  if (status !== 0) throw new Error(`factory-wasm factoryAiLiveViewEngine: unknown status ${status}`);

  const schema = reader.string();
  const mode = reader.string();
  const active = { aiBattler: reader.f64(), targetBattler: reader.f64() };
  const factory = {
    levelMode: reader.f64(),
    battleMode: reader.f64(),
    factoryWinStreak: reader.f64(),
    trainerOpponentId: reader.f64(),
  };
  const moves = Array.from({ length: 4 }, () => reader.f64()) as [number, number, number, number];
  const attacker = decodeBattler(reader);
  const target = decodeTarget(reader);
  reader.finish();
  return { schema, mode, active, factory, moves, attacker, target } as FactoryAiScoredView;
}

type LiveViewWasmExports = Awaited<ReturnType<typeof loadFactoryWasm>> & {
  fw_create_factory_ai_view_from_live_rules(inputPtr: number, inputLen: number): number;
};

function invoke(wasm: LiveViewWasmExports, input: Uint8Array): Uint8Array {
  const inputPtr = wasm.fw_alloc(input.length);
  let outputPtr: number;
  try {
    if (input.length > 0) new Uint8Array(wasm.memory.buffer, inputPtr, input.length).set(input);
    outputPtr = wasm.fw_create_factory_ai_view_from_live_rules(inputPtr, input.length);
  } finally {
    wasm.fw_free(inputPtr, input.length);
  }
  const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
  const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
  wasm.fw_free(outputPtr, totalLength);
  return output;
}

/** Raw boundary hook used by the parity suite to inspect malformed statuses. */
export async function invokeFactoryAiLiveViewPacket(input: Uint8Array): Promise<Uint8Array> {
  const wasm = await loadFactoryWasm() as LiveViewWasmExports;
  return invoke(wasm, input);
}

export function tsFactoryAiLiveViewEngine(): FactoryAiLiveViewEngine {
  return { id: "ts", createFactoryAiViewFromLiveRules: tsCreate };
}

export async function wasmFactoryAiLiveViewEngine(): Promise<FactoryAiLiveViewEngine> {
  const wasm = await loadFactoryWasm() as LiveViewWasmExports;
  return {
    id: "wasm",
    createFactoryAiViewFromLiveRules(input): FactoryAiScoredView {
      return decodeFactoryAiLiveView(invoke(wasm, encodeFactoryAiLiveViewInput(input)));
    },
  };
}

export async function factoryAiLiveViewEngine(): Promise<FactoryAiLiveViewEngine> {
  return defaultEngineId() === "wasm"
    ? wasmFactoryAiLiveViewEngine()
    : tsFactoryAiLiveViewEngine();
}
