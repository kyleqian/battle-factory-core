// Uniform adapter for the complete pure src/engine/keyRepeat.ts surface.
// TypeScript is canonical/default; forced WASM encodes and directly invokes
// the checked additive ABI-v1 packet with no TypeScript execution fallback.

import { GBA_BUTTONS, type GbaButton } from "../../src/input.ts";
import {
  hasButton as tsHasButton,
  INITIAL_KEY_REPEAT_STATE,
  readKeys as tsReadKeys,
  type KeyFrame,
  type KeyRepeatState,
} from "../../src/engine/keyRepeat.ts";
import { defaultEngineId } from "./rngEngine.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";

const BUTTON_MASK_BITS = (1 << GBA_BUTTONS.length) - 1;
const START_DELAY = 40;

export interface KeyRepeatEngine {
  readonly id: "ts" | "wasm";
  initialKeyRepeatState(): KeyRepeatState;
  readKeys(buttons: ReadonlySet<GbaButton>, previous: KeyRepeatState): KeyFrame;
  hasButton(keys: ReadonlySet<GbaButton>, button: GbaButton): boolean;
}

function cloneState(state: KeyRepeatState): KeyRepeatState {
  return { heldKeysRaw: new Set(state.heldKeysRaw), keyRepeatCounter: state.keyRepeatCounter };
}

function maskFromKeys(keys: ReadonlySet<GbaButton>): number {
  let mask = 0;
  for (const button of keys) {
    const index = GBA_BUTTONS.indexOf(button);
    if (index < 0) throw new Error(`factory-wasm keyRepeatEngine: invalid GBA button ${String(button)}`);
    mask |= 1 << index;
  }
  return mask;
}

function keysFromMask(mask: number): Set<GbaButton> {
  if (!Number.isInteger(mask) || mask < 0 || mask > BUTTON_MASK_BITS) {
    throw new Error("factory-wasm keyRepeatEngine: malformed result button mask");
  }
  return new Set(GBA_BUTTONS.filter((_, index) => (mask & (1 << index)) !== 0));
}

function buttonIndex(button: GbaButton): number {
  const index = GBA_BUTTONS.indexOf(button);
  if (index < 0) throw new Error(`factory-wasm keyRepeatEngine: invalid GBA button ${String(button)}`);
  return index;
}

function checkedCounter(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > START_DELAY) {
    throw new Error("factory-wasm keyRepeatEngine: malformed result repeat counter");
  }
  return value;
}

class Writer {
  private readonly chunks: Uint8Array[] = [];
  private size = 0;

  u8(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new Error("factory-wasm keyRepeatEngine: invalid u8 input");
    }
    this.raw(Uint8Array.of(value));
  }

  u16(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
      throw new Error("factory-wasm keyRepeatEngine: invalid u16 input");
    }
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    this.raw(bytes);
  }

  private raw(bytes: Uint8Array): void {
    const next = this.size + bytes.byteLength;
    if (!Number.isSafeInteger(next) || next > 0xffff_ffff) {
      throw new Error("factory-wasm keyRepeatEngine: packet length overflow");
    }
    this.chunks.push(bytes);
    this.size = next;
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

  constructor(private readonly bytes: Uint8Array) {}

  private take(length: number): Uint8Array {
    const end = this.offset + length;
    if (!Number.isSafeInteger(end) || end > this.bytes.byteLength) {
      throw new Error("factory-wasm keyRepeatEngine: malformed result");
    }
    const value = this.bytes.subarray(this.offset, end);
    this.offset = end;
    return value;
  }

  u8(): number { return this.take(1)[0]!; }

  u16(): number {
    const bytes = this.take(2);
    return new DataView(bytes.buffer, bytes.byteOffset, 2).getUint16(0, true);
  }

  u32(): number {
    const bytes = this.take(4);
    return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true);
  }

  string(): string { return this.decoder.decode(this.take(this.u32())); }

  bool(): boolean {
    const value = this.u8();
    if (value > 1) throw new Error("factory-wasm keyRepeatEngine: malformed result boolean");
    return value === 1;
  }

  finish(): void {
    if (this.offset !== this.bytes.byteLength) throw new Error("factory-wasm keyRepeatEngine: malformed result");
  }
}

export type KeyRepeatOperation =
  | { readonly kind: "read-keys"; readonly buttons: ReadonlySet<GbaButton>; readonly previous: KeyRepeatState }
  | { readonly kind: "has-button"; readonly keys: ReadonlySet<GbaButton>; readonly button: GbaButton }
  | { readonly kind: "initial-state" };

/** Encodes the exact additive ABI-v1 key-repeat operation packet. */
export function encodeKeyRepeatOperation(operation: KeyRepeatOperation): Uint8Array {
  const writer = new Writer();
  writer.u8(1);
  switch (operation.kind) {
    case "read-keys":
      writer.u8(0);
      writer.u16(maskFromKeys(operation.buttons));
      writer.u16(maskFromKeys(operation.previous.heldKeysRaw));
      writer.u8(operation.previous.keyRepeatCounter);
      break;
    case "has-button":
      writer.u8(1);
      writer.u16(maskFromKeys(operation.keys));
      writer.u8(buttonIndex(operation.button));
      break;
    case "initial-state": writer.u8(2); break;
  }
  return writer.finish();
}

export type KeyRepeatOperationResult = KeyFrame | boolean | KeyRepeatState;

/** Decodes a copied key-repeat boundary result. */
export function decodeKeyRepeatResult(bytes: Uint8Array): KeyRepeatOperationResult {
  const reader = new Reader(bytes);
  if (reader.u32() !== bytes.byteLength) throw new Error("factory-wasm keyRepeatEngine: output length mismatch");
  const status = reader.u8();
  if (status === 2) {
    const message = reader.string();
    reader.finish();
    throw new Error(message);
  }
  if (status !== 0) throw new Error(`factory-wasm keyRepeatEngine: unknown status ${status}`);
  const kind = reader.u8();
  const value: KeyRepeatOperationResult = kind === 0 ? (() => {
    const newKeys = keysFromMask(reader.u16());
    const newAndRepeatedKeys = keysFromMask(reader.u16());
    const heldKeysRaw = keysFromMask(reader.u16());
    const keyRepeatCounter = checkedCounter(reader.u8());
    return { newKeys, newAndRepeatedKeys, next: { heldKeysRaw, keyRepeatCounter } };
  })() : kind === 1 ? reader.bool()
    : kind === 2 ? {
      heldKeysRaw: keysFromMask(reader.u16()),
      keyRepeatCounter: checkedCounter(reader.u8()),
    }
      : (() => { throw new Error("factory-wasm keyRepeatEngine: unknown result kind"); })();
  reader.finish();
  return value;
}

export function tsKeyRepeatEngine(): KeyRepeatEngine {
  return {
    id: "ts",
    initialKeyRepeatState: () => cloneState(INITIAL_KEY_REPEAT_STATE),
    readKeys: tsReadKeys,
    hasButton: tsHasButton,
  };
}

async function wasmKeyRepeatEngine(): Promise<KeyRepeatEngine> {
  const wasm = await loadFactoryWasm();

  function invoke(operation: KeyRepeatOperation): KeyRepeatOperationResult {
    const input = encodeKeyRepeatOperation(operation);
    const inputPtr = wasm.fw_alloc(input.byteLength);
    let outputPtr = 0;
    try {
      new Uint8Array(wasm.memory.buffer, inputPtr, input.byteLength).set(input);
      outputPtr = wasm.fw_apply_key_repeat_operation(inputPtr, input.byteLength);
    } finally {
      wasm.fw_free(inputPtr, input.byteLength);
    }
    const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
    const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
    wasm.fw_free(outputPtr, totalLength);
    return decodeKeyRepeatResult(output);
  }

  return {
    id: "wasm",
    initialKeyRepeatState: () => invoke({ kind: "initial-state" }) as KeyRepeatState,
    readKeys: (buttons, previous) => invoke({ kind: "read-keys", buttons, previous }) as KeyFrame,
    hasButton: (keys, button) => invoke({ kind: "has-button", keys, button }) as boolean,
  };
}

export async function keyRepeatEngine(): Promise<KeyRepeatEngine> {
  return defaultEngineId() === "wasm" ? wasmKeyRepeatEngine() : tsKeyRepeatEngine();
}
