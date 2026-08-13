// Uniform adapter for the source-shaped live Factory AI move chooser.
// The TS implementation is the canonical/default path. POKEBENCH_ENGINE=wasm
// invokes fw_choose_factory_ai_live_decision directly; there is no TS fallback
// in that path.

import {
  createBattleCommandRequest,
  type BattleCommandRequest,
  type BattleRngState,
} from "../../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryAiViewFromLiveRules as tsCreateLiveView,
  type FactoryAiBattleHistory,
  type FactoryAiChallengePolicy,
} from "../../src/engine/factoryAiLiveDriver.ts";
import {
  chooseFactoryAiMaskZeroDecision,
  chooseFactoryAiScoredDecision,
  type FactoryAiDecisionChoice,
  type FactoryAiScoredChoice,
  type FactoryAiTurnStartRandomNumber,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import {
  FACTORY_BATTLE_MODE_SINGLES,
  FACTORY_LEVEL_MODE_50,
  selectFactoryAiMask,
} from "../../src/engine/factoryAiMaskSelection.ts";
import type { BattleScriptRulesContext } from "../../src/engine/battleScriptRulesContext.ts";
import {
  encodeFactoryAiLiveViewInput,
  FactoryAiLiveViewPacketWriter,
} from "./factoryAiLiveViewEngine.ts";
import {
  decodeFactoryAiPolicyChoice,
  type MaskZeroDecisionInput,
  type ScoredDecisionInput,
} from "./factoryAiEngine.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";
import { defaultEngineId } from "./rngEngine.ts";

export type FactoryAiLiveDecisionInput = Readonly<{
  rulesContext: BattleScriptRulesContext;
  history: FactoryAiBattleHistory;
  challenge: FactoryAiChallengePolicy;
  /** The kernel-owned command request; its legal choices remain authoritative. */
  request: BattleCommandRequest;
  rng: BattleRngState;
  turnStartRandomNumber?: FactoryAiTurnStartRandomNumber;
}>;

export type FactoryAiLiveDecisionChoice = FactoryAiDecisionChoice | FactoryAiScoredChoice;

export interface FactoryAiLiveDecisionEngine {
  readonly id: "ts" | "wasm";
  chooseFactoryAiLiveDecision(input: FactoryAiLiveDecisionInput): FactoryAiLiveDecisionChoice;
}

function chooseWithTs(input: FactoryAiLiveDecisionInput): FactoryAiLiveDecisionChoice {
  const view = tsCreateLiveView({
    rulesContext: input.rulesContext,
    history: input.history,
    challenge: input.challenge,
  });
  const request = createBattleCommandRequest(input.request);
  const mask = selectFactoryAiMask(view.factory).mask;
  if (mask === 0) {
    const maskZeroView: MaskZeroDecisionInput["view"] = {
      schema: "factory-ai-view/v1",
      mode: "factory-level-50-singles",
      active: view.active,
      factory: view.factory,
      moves: view.moves,
    };
    return chooseFactoryAiMaskZeroDecision({
      view: maskZeroView,
      request,
      rng: input.rng,
    });
  }
  const scoredInput: ScoredDecisionInput = input.turnStartRandomNumber === undefined
    ? { view, request, rng: input.rng }
    : { view, request, rng: input.rng, turnStartRandomNumber: input.turnStartRandomNumber };
  return chooseFactoryAiScoredDecision(scoredInput);
}

function encodeRequestSuffix(input: FactoryAiLiveDecisionInput): Uint8Array {
  const writer = new FactoryAiLiveViewPacketWriter();
  writer.u32(input.rng.value);
  writer.u32(input.rng.calls);
  writer.u8(input.request.kind === "command" ? 0 : 1);
  writer.u32(input.request.requestId);
  writer.u8(input.request.side === "player" ? 0 : 1);
  writer.u8(input.request.battler);
  if (input.request.legalDecisions.length > 0xff) {
    throw new Error("factory-wasm factoryAiLiveDecisionEngine: legal decision count exceeds 255");
  }
  writer.u8(input.request.legalDecisions.length);
  for (const decision of input.request.legalDecisions) {
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
  const turnStart = input.turnStartRandomNumber;
  if (turnStart === undefined) {
    writer.u8(0);
    writer.u16(0);
  } else if (turnStart.owner === "decision") {
    writer.u8(1);
    writer.u16(0);
  } else {
    writer.u8(2);
    writer.u16(turnStart.value);
  }
  return writer.finish();
}

/** Encodes the M8h packet: the exact M8e live prefix plus the request suffix. */
export function encodeFactoryAiLiveDecisionInput(input: FactoryAiLiveDecisionInput): Uint8Array {
  const prefix = encodeFactoryAiLiveViewInput(input);
  const suffix = encodeRequestSuffix(input);
  const packet = new Uint8Array(prefix.length + suffix.length);
  packet.set(prefix);
  packet.set(suffix, prefix.length);
  return packet;
}

function decodeMessage(bytes: Uint8Array): { status: number; message: string } {
  if (bytes.length < 9) {
    throw new Error("factory-wasm factoryAiLiveDecisionEngine: truncated output");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalLength = view.getUint32(0, true);
  if (totalLength !== bytes.length) {
    throw new Error(`factory-wasm factoryAiLiveDecisionEngine: output length ${totalLength} != ${bytes.length}`);
  }
  const status = view.getUint8(4);
  const messageLength = view.getUint32(5, true);
  if (9 + messageLength !== bytes.length) {
    throw new Error("factory-wasm factoryAiLiveDecisionEngine: malformed error output");
  }
  return {
    status,
    message: new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(9)),
  };
}

function decodeChoice(
  bytes: Uint8Array,
  input: FactoryAiLiveDecisionInput,
): FactoryAiLiveDecisionChoice {
  if (bytes.length < 5) {
    throw new Error("factory-wasm factoryAiLiveDecisionEngine: truncated output");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalLength = view.getUint32(0, true);
  if (totalLength !== bytes.length) {
    throw new Error(`factory-wasm factoryAiLiveDecisionEngine: output length ${totalLength} != ${bytes.length}`);
  }
  const status = view.getUint8(4);
  if (status !== 0) {
    const result = decodeMessage(bytes);
    if (/^(factoryWinStreak|trainerOpponentId) must be an integer from 0 through 65535$/.test(result.message)) {
      throw new RangeError(result.message);
    }
    throw new Error(result.message);
  }
  if (bytes.length <= 20) {
    throw new Error("factory-wasm factoryAiLiveDecisionEngine: truncated choice output");
  }
  const mask = view.getUint8(20);
  if (mask !== 0 && mask !== 1 && mask !== 7) {
    throw new Error(`factory-wasm factoryAiLiveDecisionEngine: unknown chooser mask ${mask}`);
  }
  const factory = {
    levelMode: FACTORY_LEVEL_MODE_50,
    battleMode: FACTORY_BATTLE_MODE_SINGLES,
    factoryWinStreak: input.challenge.factoryWinStreak,
    trainerOpponentId: input.challenge.trainerOpponentId,
  } as const;
  return decodeFactoryAiPolicyChoice(bytes, factory, mask !== 0) as FactoryAiLiveDecisionChoice;
}

type LiveDecisionWasmExports = Awaited<ReturnType<typeof loadFactoryWasm>>;

function invoke(
  wasm: LiveDecisionWasmExports,
  input: Uint8Array,
): Uint8Array {
  const inputPtr = wasm.fw_alloc(input.length);
  let outputPtr: number;
  try {
    if (input.length > 0) {
      new Uint8Array(wasm.memory.buffer, inputPtr, input.length).set(input);
    }
    outputPtr = wasm.fw_choose_factory_ai_live_decision(inputPtr, input.length);
  } finally {
    wasm.fw_free(inputPtr, input.length);
  }
  const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
  const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
  wasm.fw_free(outputPtr, totalLength);
  return output;
}

/** Raw boundary hook used by the focused parity suite for malformed packets. */
export async function invokeFactoryAiLiveDecisionPacket(input: Uint8Array): Promise<Uint8Array> {
  const wasm = await loadFactoryWasm() as LiveDecisionWasmExports;
  return invoke(wasm, input);
}

export function tsFactoryAiLiveDecisionEngine(): FactoryAiLiveDecisionEngine {
  return { id: "ts", chooseFactoryAiLiveDecision: chooseWithTs };
}

export async function wasmFactoryAiLiveDecisionEngine(): Promise<FactoryAiLiveDecisionEngine> {
  const wasm = await loadFactoryWasm() as LiveDecisionWasmExports;
  return {
    id: "wasm",
    chooseFactoryAiLiveDecision(input): FactoryAiLiveDecisionChoice {
      return decodeChoice(invoke(wasm, encodeFactoryAiLiveDecisionInput(input)), input);
    },
  };
}

export async function factoryAiLiveDecisionEngine(): Promise<FactoryAiLiveDecisionEngine> {
  return defaultEngineId() === "wasm"
    ? wasmFactoryAiLiveDecisionEngine()
    : tsFactoryAiLiveDecisionEngine();
}
