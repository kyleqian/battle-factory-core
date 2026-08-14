import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GBA_BUTTONS, type GbaButton } from "../src/input.ts";
import type { KeyRepeatState } from "../src/engine/keyRepeat.ts";
import {
  encodeKeyRepeatOperation,
  keyRepeatEngine,
  tsKeyRepeatEngine,
  type KeyRepeatEngine,
  type KeyRepeatOperation,
} from "../core-rs/adapter/keyRepeatEngine.ts";
import { loadFactoryWasm, type FactoryWasmExports } from "../core-rs/adapter/loadFactoryWasm.ts";
import { resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";

const BUTTON_MASK_BITS = (1 << GBA_BUTTONS.length) - 1;

function keysFromMask(mask: number): Set<GbaButton> {
  return new Set(GBA_BUTTONS.filter((_, index) => (mask & (1 << index)) !== 0));
}

function state(mask: number, keyRepeatCounter: number): KeyRepeatState {
  return { heldKeysRaw: keysFromMask(mask), keyRepeatCounter };
}

function expectSameFrame(
  selected: KeyRepeatEngine,
  canonical: KeyRepeatEngine,
  buttons: ReadonlySet<GbaButton>,
  previous: KeyRepeatState,
  label: string,
): KeyRepeatState {
  const actual = selected.readKeys(buttons, previous);
  const expected = canonical.readKeys(buttons, previous);
  expect(actual, `${selected.id}:${label}`).toEqual(expected);
  return actual.next;
}

describe("keyRepeat adapter parity", () => {
  it("matches the complete 1,580-case readKeys corpus, initial state, and every hasButton presence side", async () => {
    const canonical = tsKeyRepeatEngine();
    const selected = await keyRepeatEngine();
    expect(selected.initialKeyRepeatState()).toEqual(canonical.initialKeyRepeatState());

    let reads = 0;
    // Every canonical ten-button combination as current input from empty.
    for (let currentMask = 0; currentMask <= BUTTON_MASK_BITS; currentMask += 1) {
      expectSameFrame(selected, canonical, keysFromMask(currentMask), state(0, 40), `all-current-${currentMask}`);
      reads += 1;
    }

    // Every reachable shared-counter value on one unchanged nonempty set.
    const counterMask = (1 << 0) | (1 << 4); // A + RIGHT
    for (let counter = 1; counter <= 40; counter += 1) {
      expectSameFrame(selected, canonical, keysFromMask(counterMask), state(counterMask, counter), `counter-${counter}`);
      reads += 1;
    }

    // Each singleton through immediate press, first repeat, and two continue
    // repeats (frames 1, 41, 46, 51), retaining the complete next state.
    for (let buttonIndex = 0; buttonIndex < GBA_BUTTONS.length; buttonIndex += 1) {
      const singletonMask = 1 << buttonIndex;
      let selectedState = selected.initialKeyRepeatState();
      let canonicalState = canonical.initialKeyRepeatState();
      for (let frame = 1; frame <= 51; frame += 1) {
        const buttons = keysFromMask(singletonMask);
        const actual = selected.readKeys(buttons, selectedState);
        const expected = canonical.readKeys(buttons, canonicalState);
        expect(actual, `${selected.id}:singleton-${buttonIndex}-${frame}`).toEqual(expected);
        selectedState = actual.next;
        canonicalState = expected.next;
        reads += 1;
      }
    }

    const A = 1 << 0;
    const B = 1 << 1;
    const RIGHT = 1 << 4;
    const LEFT = 1 << 5;
    for (const [label, currentMask, previousMask, counter] of [
      ["combination-add", A | RIGHT, A, 12],
      ["combination-remove", A, A | RIGHT, 12],
      ["combination-change", B | LEFT, A | RIGHT, 12],
      ["release", 0, BUTTON_MASK_BITS, 1],
      ["empty", 0, 0, 1],
      ["all-buttons", BUTTON_MASK_BITS, RIGHT, 1],
    ] as const) {
      expectSameFrame(selected, canonical, keysFromMask(currentMask), state(previousMask, counter), label);
      reads += 1;
    }
    expect(reads).toBe(1580);

    let hasButtonCases = 0;
    for (let buttonIndex = 0; buttonIndex < GBA_BUTTONS.length; buttonIndex += 1) {
      const button = GBA_BUTTONS[buttonIndex]!;
      for (const present of [false, true]) {
        const keys = keysFromMask(present ? (1 << buttonIndex) : (BUTTON_MASK_BITS & ~(1 << buttonIndex)));
        expect(selected.hasButton(keys, button), `${selected.id}:has-${button}-${present}`).toBe(canonical.hasButton(keys, button));
        hasButtonCases += 1;
      }
    }
    expect(hasButtonCases).toBe(20);
    expect(selected.id).toBe(process.env.POKEBENCH_ENGINE === "wasm" ? "wasm" : "ts");
  });
});

async function rawBoundaryResult(wasm: FactoryWasmExports, packet: Uint8Array): Promise<Uint8Array> {
  if (packet.byteLength === 0) {
    const outputPtr = wasm.fw_apply_key_repeat_operation(0, 0);
    const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
    const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
    wasm.fw_free(outputPtr, totalLength);
    return output;
  }
  const inputPtr = wasm.fw_alloc(packet.byteLength);
  let outputPtr = 0;
  try {
    new Uint8Array(wasm.memory.buffer, inputPtr, packet.byteLength).set(packet);
    outputPtr = wasm.fw_apply_key_repeat_operation(inputPtr, packet.byteLength);
  } finally {
    wasm.fw_free(inputPtr, packet.byteLength);
  }
  const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
  const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
  wasm.fw_free(outputPtr, totalLength);
  return output;
}

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function status(bytes: Uint8Array): number {
  expect(u32(bytes, 0)).toBe(bytes.byteLength);
  return bytes[4]!;
}

function message(bytes: Uint8Array): string {
  const length = u32(bytes, 5);
  expect(bytes.byteLength).toBe(9 + length);
  return new TextDecoder().decode(bytes.slice(9, 9 + length));
}

const wasmAvailable = existsSync(resolveWasmArtifactPath());
const wasmRequired = process.env.POKEBENCH_ENGINE === "wasm";

describe.skipIf(!wasmAvailable && !wasmRequired)("keyRepeat checked packet", () => {
  it("returns one stable status-2 error for bad version/op/mask/counter, truncation, append, and suffix", async () => {
    const wasm = await loadFactoryWasm();
    const valid: KeyRepeatOperation[] = [
      { kind: "read-keys", buttons: keysFromMask(1 << 4), previous: state(1 << 4, 1) },
      { kind: "has-button", keys: keysFromMask(1 << 9), button: "L" },
      { kind: "initial-state" },
    ];
    const encoded = valid.map(encodeKeyRepeatOperation);
    const malformed: Uint8Array[] = [
      new Uint8Array(),
      ...encoded.map((packet) => packet.slice(0, -1)),
      ...encoded.map((packet) => Uint8Array.from([...packet, 0])),
      Uint8Array.of(2, 2), // version
      Uint8Array.of(1, 3), // operation
      Uint8Array.of(1, 0, 0, 4, 0, 0, 1), // current unused mask bit
      Uint8Array.of(1, 0, 0, 0, 0, 4, 1), // previous unused mask bit
      Uint8Array.of(1, 0, 0, 0, 0, 0, 0), // counter zero
      Uint8Array.of(1, 0, 0, 0, 0, 0, 41), // counter above 40
      Uint8Array.of(1, 1, 0, 4, 0), // hasButton unused mask bit
      Uint8Array.of(1, 1, 0, 0, 10), // button outside canonical order
      Uint8Array.of(1, 2, 0), // initial operation suffix
    ];
    expect(malformed).toHaveLength(16);
    for (const packet of malformed) {
      const result = await rawBoundaryResult(wasm, packet);
      expect(status(result)).toBe(2);
      expect(message(result)).toBe("factory-wasm keyRepeatEngine: malformed operation packet");
    }

    const nullOutputPtr = wasm.fw_apply_key_repeat_operation(0, 1);
    const nullLength = new DataView(wasm.memory.buffer, nullOutputPtr, 4).getUint32(0, true);
    const nullOutput = new Uint8Array(wasm.memory.buffer, nullOutputPtr, nullLength).slice();
    wasm.fw_free(nullOutputPtr, nullLength);
    expect(status(nullOutput)).toBe(2);
    expect(message(nullOutput)).toBe("factory-wasm keyRepeatEngine: malformed operation packet");
  });

  it("exposes and directly uses the export in forced mode with no fallback", async () => {
    const wasm = await loadFactoryWasm();
    expect(typeof wasm.fw_apply_key_repeat_operation).toBe("function");
    for (const operation of [
      { kind: "initial-state" },
      { kind: "read-keys", buttons: keysFromMask((1 << 0) | (1 << 4)), previous: state(0, 40) },
      { kind: "has-button", keys: keysFromMask(1 << 9), button: "L" },
    ] as const) {
      expect(status(await rawBoundaryResult(wasm, encodeKeyRepeatOperation(operation)))).toBe(0);
    }
    const selected = await keyRepeatEngine();
    expect(selected.id).toBe(wasmRequired ? "wasm" : "ts");
    if (wasmRequired) {
      expect(selected.initialKeyRepeatState()).toEqual({ heldKeysRaw: new Set(), keyRepeatCounter: 40 });
      expect(selected.hasButton(new Set(["L"]), "L")).toBe(true);
    }
  });
});
