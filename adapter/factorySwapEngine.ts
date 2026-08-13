// Uniform adapter for the complete pure Factory-swap surface in
// src/engine/factorySwap.ts. The TS implementation remains canonical in the
// default mode. POKEBENCH_ENGINE=wasm encodes one operation packet, invokes
// fw_apply_factory_swap_operation directly, and decodes the complete result;
// there is no TS fallback on that path.

import {
  acknowledgeFactorySwapPresentation as tsAcknowledge,
  applyFactorySwapMutation as tsApply,
  commitFactorySwapMutation as tsCommit,
  copyFactorySwapCursor as tsCopyCursor,
  createFactorySwapState as tsCreate,
  factorySwapAlreadyHasSpecies as tsAlreadyHasSpecies,
  factorySwapRoundDecision as tsRoundDecision,
  handleFactorySwapInput as tsHandleInput,
  type FactoryRentalRoster,
  type FactoryRentalMon,
  type FactorySwapInput,
  type FactorySwapMon,
  type FactorySwapParty,
  type FactorySwapState,
} from "../../src/engine/factorySwap.ts";
import { defaultEngineId } from "./rngEngine.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";

export type FactorySwapRoundDecision =
  | { readonly type: "accept"; readonly playerPartyIndex: 0 | 1 | 2; readonly opponentPartyIndex: 0 | 1 | 2 }
  | { readonly type: "decline" };

export interface FactorySwapEngine {
  readonly id: "ts" | "wasm";
  createFactorySwapState(
    playerParty: FactorySwapParty,
    enemyParty: FactorySwapParty,
    rentalMons: FactoryRentalRoster,
  ): FactorySwapState;
  acknowledgeFactorySwapPresentation(state: FactorySwapState): FactorySwapState;
  copyFactorySwapCursor(state: FactorySwapState): FactorySwapState;
  factorySwapAlreadyHasSpecies(state: FactorySwapState, enemyMonId?: 0 | 1 | 2): boolean;
  applyFactorySwapMutation(state: FactorySwapState): FactorySwapState;
  commitFactorySwapMutation(state: FactorySwapState): FactorySwapState;
  factorySwapRoundDecision(state: FactorySwapState): FactorySwapRoundDecision | null;
  handleFactorySwapInput(state: FactorySwapState, input: FactorySwapInput): FactorySwapState;
}

export function tsFactorySwapEngine(): FactorySwapEngine {
  return {
    id: "ts",
    createFactorySwapState: tsCreate,
    acknowledgeFactorySwapPresentation: tsAcknowledge,
    copyFactorySwapCursor: tsCopyCursor,
    factorySwapAlreadyHasSpecies: tsAlreadyHasSpecies,
    applyFactorySwapMutation: tsApply,
    commitFactorySwapMutation: tsCommit,
    factorySwapRoundDecision: tsRoundDecision,
    handleFactorySwapInput: tsHandleInput,
  };
}

class Writer {
  private readonly chunks: Uint8Array[] = [];
  private size = 0;
  private readonly encoder = new TextEncoder();

  u8(value: number): void {
    this.raw(Uint8Array.of(value & 0xff));
  }

  u32(value: number): void {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
    this.raw(bytes);
  }

  raw(bytes: Uint8Array): void {
    const next = this.size + bytes.byteLength;
    if (!Number.isSafeInteger(next)) {
      throw new Error("factory-wasm factorySwapEngine: packet length overflow");
    }
    this.chunks.push(bytes);
    this.size = next;
  }

  string(value: string): void {
    const bytes = this.encoder.encode(value);
    this.u32(bytes.byteLength);
    this.raw(bytes);
  }

  finish(): Uint8Array {
    const result = new Uint8Array(this.size);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }
}

class Reader {
  private offset = 0;
  private readonly decoder = new TextDecoder("utf-8", { fatal: true });
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  private take(length: number): Uint8Array {
    const end = this.offset + length;
    if (!Number.isSafeInteger(end) || end > this.bytes.byteLength) {
      throw new Error("factory-wasm factorySwapEngine: malformed result");
    }
    const result = this.bytes.subarray(this.offset, end);
    this.offset = end;
    return result;
  }

  u8(): number { return this.take(1)[0]!; }

  /* DataView access is kept after take()'s bounds check. */
  u32Checked(): number {
    const bytes = this.take(4);
    return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true);
  }

  string(): string {
    return this.decoder.decode(this.take(this.u32Checked()));
  }

  finish(): void {
    if (this.offset !== this.bytes.byteLength) {
      throw new Error("factory-wasm factorySwapEngine: malformed result");
    }
  }
}

// Keep the operation type public so the parity suite can construct and mutate
// packets for structural validation without duplicating the canonical state
// encoder. The wire itself carries only numeric tags, never these strings.
export type FactorySwapOperation =
  | {
    readonly kind: "create";
    readonly playerParty: FactorySwapParty;
    readonly enemyParty: FactorySwapParty;
    readonly rentalMons: FactoryRentalRoster;
  }
  | { readonly kind: "acknowledge"; readonly state: FactorySwapState }
  | { readonly kind: "copy-cursor"; readonly state: FactorySwapState }
  | { readonly kind: "handle-input"; readonly state: FactorySwapState; readonly input: FactorySwapInput }
  | { readonly kind: "already-has-species"; readonly state: FactorySwapState; readonly enemyMonId?: 0 | 1 | 2 }
  | { readonly kind: "apply-mutation"; readonly state: FactorySwapState }
  | { readonly kind: "commit-mutation"; readonly state: FactorySwapState }
  | { readonly kind: "round-decision"; readonly state: FactorySwapState };

const PHASES = [
  "playerPicker", "playerOptions", "summaryFade", "summaryReturn", "playerPickerReturn",
  "enemySwitch", "playerSwitch", "enemyPicker", "acceptPrompt", "acceptReturn", "acceptExit",
  "quitPrompt", "quitReturn", "quitExit", "duplicateSpecies", "duplicateReturn", "complete",
] as const;
const STATUSES = ["none", "sleep", "poison", "burn", "freeze", "paralysis", "toxic"] as const;
const INPUTS = ["LEFT", "RIGHT", "UP", "DOWN", "A", "B"] as const;

function tag<T extends string>(values: readonly T[], value: T): number {
  const result = values.indexOf(value);
  if (result < 0) throw new Error(`factory-wasm factorySwapEngine: unknown wire value ${value}`);
  return result;
}

function writeMon(writer: Writer, mon: FactorySwapMon): void {
  writer.string(mon.id);
  writer.string(mon.species);
  writer.u32(mon.maxHp);
  writer.u32(mon.hp);
  writer.u8(tag(STATUSES, mon.status));
  writer.u32(mon.personality);
  writer.u8(mon.abilityNum);
  writer.u8(mon.friendship);
}

function writeParty(writer: Writer, party: FactorySwapParty): void {
  for (const mon of party) writeMon(writer, mon);
}

function writeRentals(writer: Writer, rentals: FactoryRentalRoster): void {
  for (const rental of rentals) {
    writer.u32(rental.monId);
    writer.u32(rental.personality);
    writer.u32(rental.ivs);
    writer.u8(rental.abilityNum);
  }
}

function writeOptionalPartyIndex(writer: Writer, value: 0 | 1 | 2 | null): void {
  if (value === null) writer.u8(0);
  else { writer.u8(1); writer.u8(value); }
}

function writeOptionalBool(writer: Writer, value: boolean | null): void {
  if (value === null) writer.u8(0);
  else { writer.u8(1); writer.u8(value ? 1 : 0); }
}

function writeState(writer: Writer, state: FactorySwapState): void {
  writer.u8(tag(PHASES, state.phase));
  writeParty(writer, state.playerParty);
  writeParty(writer, state.enemyParty);
  writeRentals(writer, state.rentalMons);
  writer.u8(state.cursor);
  writer.u8(state.infoCursor);
  writer.u8(state.displayCursor);
  writer.u8(state.arrowCursor);
  writer.u8(state.cursorCopyPending ? 1 : 0);
  writer.u8(state.actionsCount);
  writer.u8(state.playerOptionCursor);
  writer.u8(state.playerOptionDisplayCursor);
  writer.u8(state.playerOptionCursorCopyPending ? 1 : 0);
  writer.u8(state.yesNoCursor);
  writeOptionalPartyIndex(writer, state.playerMonId);
  writeOptionalPartyIndex(writer, state.enemyMonId);
  if (state.quitReturnPhase === null) writer.u8(0);
  else { writer.u8(1); writer.u8(state.quitReturnPhase === "playerPicker" ? 0 : 1); }
  writer.u8(state.playerSwitchCompleted ? 1 : 0);
  writer.u8(state.inputReady ? 1 : 0);
  writeOptionalBool(writer, state.scriptResult);
  writer.u8(state.mutationCommitted ? 1 : 0);
  writer.u8(state.result === null ? 0 : state.result === "accepted" ? 1 : 2);
}

function writeOperation(writer: Writer, operation: FactorySwapOperation): void {
  writer.u8(1); // packet version
  switch (operation.kind) {
    case "create":
      writer.u8(0); writeParty(writer, operation.playerParty); writeParty(writer, operation.enemyParty); writeRentals(writer, operation.rentalMons); break;
    case "acknowledge": writer.u8(1); writeState(writer, operation.state); break;
    case "copy-cursor": writer.u8(2); writeState(writer, operation.state); break;
    case "handle-input": writer.u8(3); writeState(writer, operation.state); writer.u8(tag(INPUTS, operation.input)); break;
    case "already-has-species":
      writer.u8(4); writeState(writer, operation.state);
      if (operation.enemyMonId === undefined) writer.u8(0);
      else { writer.u8(1); writer.u8(operation.enemyMonId); }
      break;
    case "apply-mutation": writer.u8(5); writeState(writer, operation.state); break;
    case "commit-mutation": writer.u8(6); writeState(writer, operation.state); break;
    case "round-decision": writer.u8(7); writeState(writer, operation.state); break;
  }
}

/** Encodes the exact versioned packet accepted by fw_apply_factory_swap_operation. */
export function encodeFactorySwapOperation(operation: FactorySwapOperation): Uint8Array {
  const writer = new Writer();
  writeOperation(writer, operation);
  return writer.finish();
}

function phase(value: number): FactorySwapState["phase"] {
  const result = PHASES[value];
  if (result === undefined) throw new Error("factory-wasm factorySwapEngine: malformed result phase");
  return result;
}

function status(value: number): FactorySwapMon["status"] {
  const result = STATUSES[value];
  if (result === undefined) throw new Error("factory-wasm factorySwapEngine: malformed result status");
  return result;
}

function input(value: number): FactorySwapInput {
  const result = INPUTS[value];
  if (result === undefined) throw new Error("factory-wasm factorySwapEngine: malformed result input");
  return result;
}

function readBool(reader: Reader): boolean {
  const value = reader.u8();
  if (value > 1) throw new Error("factory-wasm factorySwapEngine: malformed result boolean");
  return value === 1;
}

function readOptionalPartyIndex(reader: Reader): 0 | 1 | 2 | null {
  const present = reader.u8();
  if (present === 0) return null;
  if (present !== 1) throw new Error("factory-wasm factorySwapEngine: malformed result optional index");
  const value = reader.u8();
  if (value > 2) throw new Error("factory-wasm factorySwapEngine: malformed result party index");
  return value as 0 | 1 | 2;
}

function readOptionalBool(reader: Reader): boolean | null {
  const present = reader.u8();
  if (present === 0) return null;
  if (present !== 1) throw new Error("factory-wasm factorySwapEngine: malformed result optional bool");
  return readBool(reader);
}

function readMon(reader: Reader): FactorySwapMon {
  return {
    id: reader.string(),
    species: reader.string(),
    maxHp: reader.u32Checked(),
    hp: reader.u32Checked(),
    status: status(reader.u8()),
    personality: reader.u32Checked(),
    abilityNum: reader.u8(),
    friendship: reader.u8(),
  };
}

function readParty(reader: Reader): FactorySwapParty {
  return [readMon(reader), readMon(reader), readMon(reader)] as unknown as FactorySwapParty;
}

function readRentals(reader: Reader): FactoryRentalRoster {
  return Array.from({ length: 6 }, (): FactoryRentalMon => ({
    monId: reader.u32Checked(),
    personality: reader.u32Checked(),
    ivs: reader.u32Checked(),
    abilityNum: reader.u8(),
  })) as unknown as FactoryRentalRoster;
}

function readState(reader: Reader): FactorySwapState {
  const result = {
    phase: phase(reader.u8()),
    playerParty: readParty(reader),
    enemyParty: readParty(reader),
    rentalMons: readRentals(reader),
    cursor: reader.u8(),
    infoCursor: reader.u8(),
    displayCursor: reader.u8(),
    arrowCursor: reader.u8(),
    cursorCopyPending: readBool(reader),
    actionsCount: reader.u8(),
    playerOptionCursor: reader.u8(),
    playerOptionDisplayCursor: reader.u8(),
    playerOptionCursorCopyPending: readBool(reader),
    yesNoCursor: reader.u8(),
    playerMonId: readOptionalPartyIndex(reader),
    enemyMonId: readOptionalPartyIndex(reader),
    quitReturnPhase: (() => {
      const present = reader.u8();
      if (present === 0) return null;
      if (present !== 1) throw new Error("factory-wasm factorySwapEngine: malformed result quit phase");
      const value = reader.u8();
      if (value > 1) throw new Error("factory-wasm factorySwapEngine: malformed result quit phase");
      return value === 0 ? "playerPicker" : "enemyPicker";
    })(),
    playerSwitchCompleted: readBool(reader),
    inputReady: readBool(reader),
    scriptResult: readOptionalBool(reader),
    mutationCommitted: readBool(reader),
    result: (() => {
      const value = reader.u8();
      if (value === 0) return null;
      if (value === 1) return "accepted";
      if (value === 2) return "keptParty";
      throw new Error("factory-wasm factorySwapEngine: malformed result result tag");
    })(),
  };
  if (result.cursor > 4 || result.infoCursor > 4 || result.displayCursor > 4 || result.arrowCursor > 4) {
    throw new Error("factory-wasm factorySwapEngine: malformed result cursor");
  }
  if (result.actionsCount !== 4 && result.actionsCount !== 5) {
    throw new Error("factory-wasm factorySwapEngine: malformed result action count");
  }
  if (result.playerOptionCursor > 2 || result.playerOptionDisplayCursor > 2 || result.yesNoCursor > 1) {
    throw new Error("factory-wasm factorySwapEngine: malformed result option cursor");
  }
  return result as FactorySwapState;
}

/** Decodes a copied fw_apply_factory_swap_operation result. */
export function decodeFactorySwapResult(bytes: Uint8Array): FactorySwapState | boolean | FactorySwapRoundDecision | null {
  const reader = new Reader(bytes);
  const totalLength = reader.u32Checked();
  if (totalLength !== bytes.byteLength) throw new Error("factory-wasm factorySwapEngine: output length mismatch");
  const boundaryStatus = reader.u8();
  if (boundaryStatus === 1 || boundaryStatus === 2) {
    const message = reader.string();
    reader.finish();
    throw new Error(message);
  }
  if (boundaryStatus !== 0) throw new Error(`factory-wasm factorySwapEngine: unknown status ${boundaryStatus}`);
  const kind = reader.u8();
  const value = kind === 0
    ? readState(reader)
    : kind === 1
      ? readBool(reader)
      : kind === 2
        ? (() => {
          const decision = reader.u8();
          if (decision === 0) return null;
          if (decision === 2) return { type: "decline" as const };
          if (decision === 1) {
            const playerPartyIndex = reader.u8();
            const opponentPartyIndex = reader.u8();
            if (playerPartyIndex > 2 || opponentPartyIndex > 2) {
              throw new Error("factory-wasm factorySwapEngine: malformed result decision index");
            }
            return { type: "accept" as const, playerPartyIndex: playerPartyIndex as 0 | 1 | 2, opponentPartyIndex: opponentPartyIndex as 0 | 1 | 2 };
          }
          throw new Error("factory-wasm factorySwapEngine: malformed result decision tag");
        })()
        : (() => { throw new Error("factory-wasm factorySwapEngine: unknown result kind"); })();
  reader.finish();
  return value;
}

async function wasmFactorySwapEngine(): Promise<FactorySwapEngine> {
  const wasm = await loadFactoryWasm();

  function invoke(operation: FactorySwapOperation): FactorySwapState | boolean | FactorySwapRoundDecision | null {
    const input = encodeFactorySwapOperation(operation);
    const inputPtr = wasm.fw_alloc(input.byteLength);
    let outputPtr = 0;
    try {
      new Uint8Array(wasm.memory.buffer, inputPtr, input.byteLength).set(input);
      outputPtr = wasm.fw_apply_factory_swap_operation(inputPtr, input.byteLength);
    } finally {
      wasm.fw_free(inputPtr, input.byteLength);
    }
    const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
    const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
    wasm.fw_free(outputPtr, totalLength);
    return decodeFactorySwapResult(output);
  }

  function stateValue(value: FactorySwapState | boolean | FactorySwapRoundDecision | null): FactorySwapState {
    if (value === null || typeof value === "boolean" || "type" in value) {
      throw new Error("factory-wasm factorySwapEngine: unexpected non-state result");
    }
    return value;
  }

  return {
    id: "wasm",
    createFactorySwapState: (playerParty, enemyParty, rentalMons) => stateValue(invoke({ kind: "create", playerParty, enemyParty, rentalMons })),
    acknowledgeFactorySwapPresentation: (state) => stateValue(invoke({ kind: "acknowledge", state })),
    copyFactorySwapCursor: (state) => stateValue(invoke({ kind: "copy-cursor", state })),
    factorySwapAlreadyHasSpecies: (state, enemyMonId) => {
      const value = invoke(enemyMonId === undefined ? { kind: "already-has-species", state } : { kind: "already-has-species", state, enemyMonId });
      if (typeof value !== "boolean") throw new Error("factory-wasm factorySwapEngine: unexpected non-boolean result");
      return value;
    },
    applyFactorySwapMutation: (state) => stateValue(invoke({ kind: "apply-mutation", state })),
    commitFactorySwapMutation: (state) => stateValue(invoke({ kind: "commit-mutation", state })),
    factorySwapRoundDecision: (state) => {
      const value = invoke({ kind: "round-decision", state });
      if (value === null || (typeof value === "object" && "type" in value)) return value;
      throw new Error("factory-wasm factorySwapEngine: unexpected decision result");
    },
    handleFactorySwapInput: (state, input) => stateValue(invoke({ kind: "handle-input", state, input })),
  };
}

export async function factorySwapEngine(): Promise<FactorySwapEngine> {
  return defaultEngineId() === "wasm" ? wasmFactorySwapEngine() : tsFactorySwapEngine();
}
