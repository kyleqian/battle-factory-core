// Uniform adapter for the pure planning prefix of submitLiveFactoryAiDecision.
// The TypeScript driver remains canonical/default. POKEBENCH_ENGINE=wasm calls
// fw_plan_live_factory_ai_decision directly; the forced path has no TS fallback.

import type { BattleDecisionReducer, BattleState } from "../../src/engine/battleDecisionBoundary.ts";
import {
  FACTORY_AI_ACTION_GATE,
  submitLiveFactoryAiDecision,
  type FactoryAiBattleHistory,
  type FactoryAiChallengePolicy,
  type FactoryAiLiveRules,
  type FactoryAiLiveTransition,
} from "../../src/engine/factoryAiLiveDriver.ts";
import {
  FACTORY_BATTLE_MODE_SINGLES,
  FACTORY_LEVEL_MODE_50,
} from "../../src/engine/factoryAiMaskSelection.ts";
import { decodeFactoryAiBattleHistory } from "./factoryAiBattleHistoryEngine.ts";
import {
  decodeFactoryAiPolicyChoice,
  decodeFactoryAiSwitchPolicyResult,
} from "./factoryAiEngine.ts";
import {
  decodeFactoryAiLiveView,
  encodeFactoryAiLiveViewInput,
  FactoryAiLiveViewPacketWriter,
} from "./factoryAiLiveViewEngine.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";
import { defaultEngineId } from "./rngEngine.ts";

type WithoutTransition<T> = T extends unknown ? Omit<T, "transition"> : never;
export type FactoryAiLivePlan = WithoutTransition<FactoryAiLiveTransition<FactoryAiLiveRules>>;

export type FactoryAiLivePlannerInput = Readonly<{
  state: BattleState<FactoryAiLiveRules>;
  history: FactoryAiBattleHistory;
  challenge: FactoryAiChallengePolicy;
}>;

export interface FactoryAiLivePlannerEngine {
  readonly id: "ts" | "wasm";
  planLiveFactoryAiDecision(input: FactoryAiLivePlannerInput): FactoryAiLivePlan;
}

function projectWithTs(input: FactoryAiLivePlannerInput): FactoryAiLivePlan {
  const reducer: BattleDecisionReducer<FactoryAiLiveRules> = (context) => Object.freeze({
    rules: context.rules,
    events: Object.freeze([]),
    boundary: Object.freeze({ kind: "terminal", outcome: "player-win" }),
  });
  const { transition: _transition, ...plan } = submitLiveFactoryAiDecision(
    input.state,
    input.history,
    input.challenge,
    reducer,
  );
  return plan;
}

function writePlannerSuffix(
  writer: FactoryAiLiveViewPacketWriter,
  input: FactoryAiLivePlannerInput,
): void {
  const rules = input.state.rules.rulesContext;
  for (const battler of rules.battlers) {
    writer.f64(battler.partyIndex);
    writer.f64(battler.perishSongTimer);
  }
  for (const value of rules.aiObservedAbilityIds) writer.f64(value);
  for (const value of rules.aiObservedItemEffects) writer.f64(value);
  for (const member of rules.party.opponent) {
    writer.f64(member.species);
    writer.u8(member.isEgg ? 1 : 0);
    writer.f64(member.abilityNum);
    writer.f64(member.hp);
    for (const move of member.moves) writer.f64(move);
  }
  writer.f64(rules.moveHistory.lastLandedMoves[1]);
  writer.f64(rules.moveHistory.lastHitBy[1]);
  writer.f64(rules.monToSwitchIntoId[1]);
  writer.f64(rules.absentBattlerFlags);
  writer.f64(rules.battleTopology.battlersCount);
  writer.f64(rules.battleTopology.battleTypeFlags);
  writer.f64(rules.randomTurnNumber);
  writer.u32(input.state.rng.value);
  writer.u32(input.state.rng.calls);

  if (input.state.boundary.kind !== "decision-required") {
    writer.u8(1);
    return;
  }
  writer.u8(0);
  const request = input.state.boundary.request;
  writer.u8(request.kind === "command" ? 0 : 1);
  writer.u32(request.requestId);
  writer.u8(request.side === "player" ? 0 : 1);
  writer.u8(request.battler);
  const legal = request.kind === "command" ? request.legalDecisions : [];
  if (legal.length > 0xff) {
    throw new Error("factory-wasm factoryAiLivePlannerEngine: legal decision count exceeds 255");
  }
  writer.u8(legal.length);
  for (const decision of legal) {
    if (decision.kind === "use-move") {
      writer.u8(0);
      writer.u8(decision.moveSlot);
      writer.u8(decision.targetBattler);
    } else {
      writer.u8(1);
      writer.u8(decision.partyIndex);
      writer.u8(0);
    }
  }
}

/** Encodes one canonical state/rules object; shared battler fields occur once. */
export function encodeFactoryAiLivePlannerInput(input: FactoryAiLivePlannerInput): Uint8Array {
  const prefix = encodeFactoryAiLiveViewInput({
    rulesContext: input.state.rules.rulesContext,
    history: input.history,
    challenge: input.challenge,
  });
  const suffixWriter = new FactoryAiLiveViewPacketWriter();
  writePlannerSuffix(suffixWriter, input);
  const suffix = suffixWriter.finish();
  const packet = new Uint8Array(prefix.length + suffix.length);
  packet.set(prefix);
  packet.set(suffix, prefix.length);
  return packet;
}

class PlannerReader {
  private readonly view: DataView;
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  private take(length: number): Uint8Array {
    const end = this.offset + length;
    if (!Number.isSafeInteger(length) || length < 0 || end > this.bytes.length) {
      throw new Error("factory-wasm factoryAiLivePlannerEngine: truncated output");
    }
    const value = this.bytes.subarray(this.offset, end);
    this.offset = end;
    return value;
  }

  u8(): number { return this.take(1)[0]!; }
  u32(): number {
    const offset = this.take(4).byteOffset - this.bytes.byteOffset;
    return this.view.getUint32(offset, true);
  }
  framed(): Uint8Array { return this.take(this.u32()); }
  finish(): void {
    if (this.offset !== this.bytes.length) {
      throw new Error(`factory-wasm factoryAiLivePlannerEngine: decoded ${this.offset} of ${this.bytes.length} output bytes`);
    }
  }
}

function decodePlannerMessage(bytes: Uint8Array): never {
  if (bytes.length < 9) throw new Error("factory-wasm factoryAiLivePlannerEngine: truncated output");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const messageLength = view.getUint32(5, true);
  if (9 + messageLength !== bytes.length) {
    throw new Error("factory-wasm factoryAiLivePlannerEngine: malformed error output");
  }
  const message = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(9));
  if (/^(factoryWinStreak|trainerOpponentId) must be an integer from 0 through 65535$/.test(message)) {
    throw new RangeError(message);
  }
  throw new Error(message);
}

function decodePlannerResult(
  bytes: Uint8Array,
  input: FactoryAiLivePlannerInput,
): FactoryAiLivePlan {
  const reader = new PlannerReader(bytes);
  const totalLength = reader.u32();
  if (totalLength !== bytes.length) {
    throw new Error(`factory-wasm factoryAiLivePlannerEngine: output length ${totalLength} != ${bytes.length}`);
  }
  const status = reader.u8();
  if (status !== 0) return decodePlannerMessage(bytes);
  const phase = reader.u8();
  const history = decodeFactoryAiBattleHistory(reader.framed());
  const view = decodeFactoryAiLiveView(reader.framed());
  const switchPolicy = decodeFactoryAiSwitchPolicyResult(reader.framed());
  if (phase === 0) {
    const choiceBytes = reader.framed();
    if (choiceBytes.length <= 20) {
      throw new Error("factory-wasm factoryAiLivePlannerEngine: truncated choice output");
    }
    const mask = new DataView(
      choiceBytes.buffer,
      choiceBytes.byteOffset,
      choiceBytes.byteLength,
    ).getUint8(20);
    if (mask !== 0 && mask !== 1 && mask !== 7) {
      throw new Error(`factory-wasm factoryAiLivePlannerEngine: unknown chooser mask ${mask}`);
    }
    const factory = {
      levelMode: FACTORY_LEVEL_MODE_50,
      battleMode: FACTORY_BATTLE_MODE_SINGLES,
      factoryWinStreak: input.challenge.factoryWinStreak,
      trainerOpponentId: input.challenge.trainerOpponentId,
    } as const;
    const choice = decodeFactoryAiPolicyChoice(choiceBytes, factory, mask !== 0);
    reader.finish();
    return Object.freeze({
      phase: "move",
      ...choice,
      history,
      view,
      switchPolicy,
      actionGate: FACTORY_AI_ACTION_GATE,
    }) as FactoryAiLivePlan;
  }
  if (phase === 1) {
    const requestId = reader.u32();
    const sideTag = reader.u8();
    if (sideTag > 1) throw new Error(`factory-wasm factoryAiLivePlannerEngine: unknown side ${sideTag}`);
    const partyIndex = reader.u8();
    const rng = Object.freeze({ value: reader.u32(), calls: reader.u32() });
    reader.finish();
    return Object.freeze({
      phase: "switch",
      submission: Object.freeze({
        requestId,
        side: sideTag === 0 ? "player" : "trainer",
        decision: Object.freeze({ kind: "switch", partyIndex }),
      }),
      rng,
      history,
      view,
      switchPolicy,
      actionGate: FACTORY_AI_ACTION_GATE,
    }) as FactoryAiLivePlan;
  }
  throw new Error(`factory-wasm factoryAiLivePlannerEngine: unknown phase ${phase}`);
}

type PlannerWasmExports = Awaited<ReturnType<typeof loadFactoryWasm>>;

function invoke(wasm: PlannerWasmExports, input: Uint8Array): Uint8Array {
  const inputPtr = wasm.fw_alloc(input.length);
  let outputPtr: number;
  try {
    if (input.length > 0) new Uint8Array(wasm.memory.buffer, inputPtr, input.length).set(input);
    outputPtr = wasm.fw_plan_live_factory_ai_decision(inputPtr, input.length);
  } finally {
    wasm.fw_free(inputPtr, input.length);
  }
  const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
  const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
  wasm.fw_free(outputPtr, totalLength);
  return output;
}

/** Raw hook for structural-status parity tests. */
export async function invokeFactoryAiLivePlannerPacket(input: Uint8Array): Promise<Uint8Array> {
  return invoke(await loadFactoryWasm(), input);
}

export function tsFactoryAiLivePlannerEngine(): FactoryAiLivePlannerEngine {
  return { id: "ts", planLiveFactoryAiDecision: projectWithTs };
}

export async function wasmFactoryAiLivePlannerEngine(): Promise<FactoryAiLivePlannerEngine> {
  const wasm = await loadFactoryWasm();
  return {
    id: "wasm",
    planLiveFactoryAiDecision(input): FactoryAiLivePlan {
      return decodePlannerResult(invoke(wasm, encodeFactoryAiLivePlannerInput(input)), input);
    },
  };
}

export async function factoryAiLivePlannerEngine(): Promise<FactoryAiLivePlannerEngine> {
  return defaultEngineId() === "wasm"
    ? wasmFactoryAiLivePlannerEngine()
    : tsFactoryAiLivePlannerEngine();
}
