// Uniform adapter for the twelve presentation-free rental-draft helpers in
// src/engine/factoryDraftScreen.ts. TypeScript remains canonical by default;
// forced WASM encodes and directly invokes the checked operation export.

import {
  advanceCursorRedraw as tsAdvanceCursorRedraw,
  advanceMenuHighlightRedraw as tsAdvanceMenuHighlightRedraw,
  advanceRentConfirmRedraw as tsAdvanceRentConfirmRedraw,
  applyDeselect as tsApplyDeselect,
  applySelect as tsApplySelect,
  chosenMonSpecies as tsChosenMonSpecies,
  cursorMoveStallsBalls as tsCursorMoveStallsBalls,
  isMonsConfirmed as tsIsMonsConfirmed,
  moveCursor as tsMoveCursor,
  moveMenuCursor as tsMoveMenuCursor,
  selectMonMessage as tsSelectMonMessage,
  selectedRentalParty as tsSelectedRentalParty,
  type CursorRedrawState,
  type DraftScreenState,
  type MenuHighlightRedrawState,
  type RentConfirmRedrawState,
} from "../../src/engine/factoryDraftScreen.ts";
import type { FactoryRentalParty } from "../../src/engine/battleScenario.ts";
import type { FactoryCorpusPartyInstance } from "../../src/engine/factoryCorpusParty.ts";
import { defaultEngineId } from "./rngEngine.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";

export interface FactoryDraftSelectionEngine {
  readonly id: "ts" | "wasm";
  selectMonMessage(selectingMonsState: number): string;
  applySelect(selectedIds: readonly number[], selectingMonsState: number, slotIndex: number): { selectedIds: number[]; selectingMonsState: number };
  applyDeselect(selectedIds: readonly number[], selectingMonsState: number, slotIndex: number): { selectedIds: number[]; selectingMonsState: number };
  isMonsConfirmed(selectingMonsState: number): boolean;
  chosenMonSpecies(state: DraftScreenState): string[];
  selectedRentalParty(state: DraftScreenState): FactoryRentalParty;
  cursorMoveStallsBalls(enteringSpecies: string): boolean;
  moveCursor(cursorPos: number, direction: 1 | -1): number;
  moveMenuCursor(menuCursorPos: number, direction: 1 | -1): number;
  advanceCursorRedraw(state: CursorRedrawState | null): CursorRedrawState | null;
  advanceMenuHighlightRedraw(state: MenuHighlightRedrawState | null): MenuHighlightRedrawState | null;
  advanceRentConfirmRedraw(state: RentConfirmRedrawState | null): RentConfirmRedrawState | null;
}

export function tsFactoryDraftSelectionEngine(): FactoryDraftSelectionEngine {
  return {
    id: "ts",
    selectMonMessage: tsSelectMonMessage,
    applySelect: tsApplySelect,
    applyDeselect: tsApplyDeselect,
    isMonsConfirmed: tsIsMonsConfirmed,
    chosenMonSpecies: tsChosenMonSpecies,
    selectedRentalParty: tsSelectedRentalParty,
    cursorMoveStallsBalls: tsCursorMoveStallsBalls,
    moveCursor: tsMoveCursor,
    moveMenuCursor: tsMoveMenuCursor,
    advanceCursorRedraw: tsAdvanceCursorRedraw,
    advanceMenuHighlightRedraw: tsAdvanceMenuHighlightRedraw,
    advanceRentConfirmRedraw: tsAdvanceRentConfirmRedraw,
  };
}

class Writer {
  private readonly chunks: Uint8Array[] = [];
  private readonly encoder = new TextEncoder();
  private size = 0;

  u8(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new Error("factory-wasm factoryDraftSelectionEngine: invalid u8 input");
    }
    this.raw(Uint8Array.of(value));
  }

  u32(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
      throw new Error("factory-wasm factoryDraftSelectionEngine: invalid u32 input");
    }
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value, true);
    this.raw(bytes);
  }

  raw(bytes: Uint8Array): void {
    const next = this.size + bytes.byteLength;
    if (!Number.isSafeInteger(next) || next > 0xffff_ffff) {
      throw new Error("factory-wasm factoryDraftSelectionEngine: packet length overflow");
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

  constructor(private readonly bytes: Uint8Array) {}

  private take(length: number): Uint8Array {
    const end = this.offset + length;
    if (!Number.isSafeInteger(end) || end > this.bytes.byteLength) {
      throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result");
    }
    const value = this.bytes.subarray(this.offset, end);
    this.offset = end;
    return value;
  }

  u8(): number { return this.take(1)[0]!; }

  u32(): number {
    const bytes = this.take(4);
    return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true);
  }

  string(): string { return this.decoder.decode(this.take(this.u32())); }

  bool(): boolean {
    const value = this.u8();
    if (value > 1) throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result boolean");
    return value === 1;
  }

  finish(): void {
    if (this.offset !== this.bytes.byteLength) {
      throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result");
    }
  }
}

export type FactoryDraftSelectionOperation =
  | { readonly kind: "select-mon-message"; readonly selectingMonsState: number }
  | { readonly kind: "apply-select"; readonly selectedIds: readonly number[]; readonly selectingMonsState: number; readonly slotIndex: number }
  | { readonly kind: "apply-deselect"; readonly selectedIds: readonly number[]; readonly selectingMonsState: number; readonly slotIndex: number }
  | { readonly kind: "is-mons-confirmed"; readonly selectingMonsState: number }
  | { readonly kind: "chosen-mon-species"; readonly selectedIds: readonly number[]; readonly species: readonly string[] }
  | { readonly kind: "selected-rental-party"; readonly selectedIds: readonly number[]; readonly rentals: readonly FactoryCorpusPartyInstance[] }
  | { readonly kind: "cursor-move-stalls-balls"; readonly enteringSpecies: string }
  | { readonly kind: "move-cursor"; readonly cursorPos: number; readonly direction: 1 | -1 }
  | { readonly kind: "move-menu-cursor"; readonly menuCursorPos: number; readonly direction: 1 | -1 }
  | { readonly kind: "advance-cursor-redraw"; readonly state: CursorRedrawState | null }
  | { readonly kind: "advance-menu-highlight-redraw"; readonly state: MenuHighlightRedrawState | null }
  | { readonly kind: "advance-rent-confirm-redraw"; readonly state: RentConfirmRedrawState | null };

function writeSixU8(writer: Writer, values: readonly number[]): void {
  if (values.length !== 6) throw new Error("factory-wasm factoryDraftSelectionEngine: expected six inputs");
  for (const value of values) writer.u8(value);
}

function writeRental(writer: Writer, rental: FactoryCorpusPartyInstance): void {
  writer.u32(rental.setId);
  writer.u32(rental.personality);
  writer.u32(rental.fixedIv);
  writer.u8(rental.abilitySlot);
  if (rental.otId === undefined) writer.u8(0);
  else { writer.u8(1); writer.u32(rental.otId); }
}

function writePresence(writer: Writer, present: boolean): void { writer.u8(present ? 1 : 0); }
function writeDirection(writer: Writer, direction: 1 | -1): void { writer.u8(direction === 1 ? 0 : 1); }

/** Encode the exact additive ABI-v1 draft-selection operation packet. */
export function encodeFactoryDraftSelectionOperation(operation: FactoryDraftSelectionOperation): Uint8Array {
  const writer = new Writer();
  writer.u8(1);
  switch (operation.kind) {
    case "select-mon-message": writer.u8(0); writer.u8(operation.selectingMonsState); break;
    case "apply-select": writer.u8(1); writeSixU8(writer, operation.selectedIds); writer.u8(operation.selectingMonsState); writer.u8(operation.slotIndex); break;
    case "apply-deselect": writer.u8(2); writeSixU8(writer, operation.selectedIds); writer.u8(operation.selectingMonsState); writer.u8(operation.slotIndex); break;
    case "is-mons-confirmed": writer.u8(3); writer.u8(operation.selectingMonsState); break;
    case "chosen-mon-species":
      writer.u8(4); writeSixU8(writer, operation.selectedIds);
      if (operation.species.length !== 6) throw new Error("factory-wasm factoryDraftSelectionEngine: expected six inputs");
      for (const species of operation.species) writer.string(species);
      break;
    case "selected-rental-party":
      writer.u8(5); writeSixU8(writer, operation.selectedIds);
      if (operation.rentals.length !== 6) throw new Error("factory-wasm factoryDraftSelectionEngine: expected six inputs");
      for (const rental of operation.rentals) writeRental(writer, rental);
      break;
    case "cursor-move-stalls-balls": writer.u8(6); writer.string(operation.enteringSpecies); break;
    case "move-cursor": writer.u8(7); writer.u8(operation.cursorPos); writeDirection(writer, operation.direction); break;
    case "move-menu-cursor": writer.u8(8); writer.u8(operation.menuCursorPos); writeDirection(writer, operation.direction); break;
    case "advance-cursor-redraw":
      writer.u8(9); writePresence(writer, operation.state !== null);
      if (operation.state) { writer.u8(operation.state.fromCursorPos); writer.u8(operation.state.elapsed); writer.u8(operation.state.fast ? 1 : 0); }
      break;
    case "advance-menu-highlight-redraw":
      writer.u8(10); writePresence(writer, operation.state !== null);
      if (operation.state) { writer.u8(operation.state.fromMenuCursorPos); writer.u8(operation.state.elapsed); }
      break;
    case "advance-rent-confirm-redraw":
      writer.u8(11); writePresence(writer, operation.state !== null);
      if (operation.state) { writer.string(operation.state.fromMessage); writer.u8(operation.state.fromSelected ? 1 : 0); writer.u8(operation.state.elapsed); }
      break;
  }
  return writer.finish();
}

export type FactoryDraftSelectionResult =
  | string
  | { readonly selectedIds: number[]; readonly selectingMonsState: number }
  | boolean
  | string[]
  | FactoryRentalParty
  | number
  | CursorRedrawState
  | MenuHighlightRedrawState
  | RentConfirmRedrawState
  | null;

function readRental(reader: Reader): FactoryCorpusPartyInstance {
  const setId = reader.u32();
  const personality = reader.u32();
  const fixedIv = reader.u32();
  const abilitySlot = reader.u8();
  if (abilitySlot > 1) throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result ability slot");
  const present = reader.u8();
  if (present === 0) return { setId, personality, fixedIv, abilitySlot: abilitySlot as 0 | 1 };
  if (present !== 1) throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result optional otId");
  return { setId, personality, fixedIv, abilitySlot: abilitySlot as 0 | 1, otId: reader.u32() };
}

/** Decode a copied draft-selection boundary result. */
export function decodeFactoryDraftSelectionResult(bytes: Uint8Array): FactoryDraftSelectionResult {
  const reader = new Reader(bytes);
  if (reader.u32() !== bytes.byteLength) throw new Error("factory-wasm factoryDraftSelectionEngine: output length mismatch");
  const status = reader.u8();
  if (status === 1 || status === 2) {
    const message = reader.string();
    reader.finish();
    throw new Error(message);
  }
  if (status !== 0) throw new Error(`factory-wasm factoryDraftSelectionEngine: unknown status ${status}`);
  const kind = reader.u8();
  const value: FactoryDraftSelectionResult = kind === 0 ? reader.string()
    : kind === 1 ? { selectedIds: Array.from({ length: 6 }, () => reader.u8()), selectingMonsState: reader.u8() }
      : kind === 2 ? reader.bool()
        : kind === 3 ? (() => {
          const count = reader.u8();
          if (count > 3) throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result species count");
          return Array.from({ length: count }, () => reader.string());
        })()
          : kind === 4 ? [readRental(reader), readRental(reader), readRental(reader)] as FactoryRentalParty
            : kind === 5 ? reader.u8()
              : kind === 6 ? (() => {
                const present = reader.u8();
                if (present === 0) return null;
                if (present !== 1) throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result presence");
                return { fromCursorPos: reader.u8(), elapsed: reader.u8(), fast: reader.bool() };
              })()
                : kind === 7 ? (() => {
                  const present = reader.u8();
                  if (present === 0) return null;
                  if (present !== 1) throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result presence");
                  return { fromMenuCursorPos: reader.u8(), elapsed: reader.u8() };
                })()
                  : kind === 8 ? (() => {
                    const present = reader.u8();
                    if (present === 0) return null;
                    if (present !== 1) throw new Error("factory-wasm factoryDraftSelectionEngine: malformed result presence");
                    return { fromMessage: reader.string(), fromSelected: reader.bool(), elapsed: reader.u8() };
                  })()
                    : (() => { throw new Error("factory-wasm factoryDraftSelectionEngine: unknown result kind"); })();
  reader.finish();
  return value;
}

async function wasmFactoryDraftSelectionEngine(): Promise<FactoryDraftSelectionEngine> {
  const wasm = await loadFactoryWasm();

  function invoke(operation: FactoryDraftSelectionOperation): FactoryDraftSelectionResult {
    const input = encodeFactoryDraftSelectionOperation(operation);
    const inputPtr = wasm.fw_alloc(input.byteLength);
    let outputPtr = 0;
    try {
      new Uint8Array(wasm.memory.buffer, inputPtr, input.byteLength).set(input);
      outputPtr = wasm.fw_apply_factory_draft_selection_operation(inputPtr, input.byteLength);
    } finally {
      wasm.fw_free(inputPtr, input.byteLength);
    }
    const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
    const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
    wasm.fw_free(outputPtr, totalLength);
    return decodeFactoryDraftSelectionResult(output);
  }

  return {
    id: "wasm",
    selectMonMessage: (selectingMonsState) => invoke({ kind: "select-mon-message", selectingMonsState }) as string,
    applySelect: (selectedIds, selectingMonsState, slotIndex) => invoke({ kind: "apply-select", selectedIds, selectingMonsState, slotIndex }) as { selectedIds: number[]; selectingMonsState: number },
    applyDeselect: (selectedIds, selectingMonsState, slotIndex) => invoke({ kind: "apply-deselect", selectedIds, selectingMonsState, slotIndex }) as { selectedIds: number[]; selectingMonsState: number },
    isMonsConfirmed: (selectingMonsState) => invoke({ kind: "is-mons-confirmed", selectingMonsState }) as boolean,
    chosenMonSpecies: (state) => invoke({ kind: "chosen-mon-species", selectedIds: state.selectedIds, species: state.slots.map((slot) => slot.species) }) as string[],
    selectedRentalParty: (state) => invoke({ kind: "selected-rental-party", selectedIds: state.selectedIds, rentals: state.rentals.map((rental) => rental.source) }) as FactoryRentalParty,
    cursorMoveStallsBalls: (enteringSpecies) => invoke({ kind: "cursor-move-stalls-balls", enteringSpecies }) as boolean,
    moveCursor: (cursorPos, direction) => invoke({ kind: "move-cursor", cursorPos, direction }) as number,
    moveMenuCursor: (menuCursorPos, direction) => invoke({ kind: "move-menu-cursor", menuCursorPos, direction }) as number,
    advanceCursorRedraw: (state) => invoke({ kind: "advance-cursor-redraw", state }) as CursorRedrawState | null,
    advanceMenuHighlightRedraw: (state) => invoke({ kind: "advance-menu-highlight-redraw", state }) as MenuHighlightRedrawState | null,
    advanceRentConfirmRedraw: (state) => invoke({ kind: "advance-rent-confirm-redraw", state }) as RentConfirmRedrawState | null,
  };
}

export async function factoryDraftSelectionEngine(): Promise<FactoryDraftSelectionEngine> {
  return defaultEngineId() === "wasm" ? wasmFactoryDraftSelectionEngine() : tsFactoryDraftSelectionEngine();
}
