import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  encodeFactoryDraftSelectionOperation,
  factoryDraftSelectionEngine,
  tsFactoryDraftSelectionEngine,
  type FactoryDraftSelectionEngine,
  type FactoryDraftSelectionOperation,
} from "../core-rs/adapter/factoryDraftSelectionEngine.ts";
import { loadFactoryWasm, type FactoryWasmExports } from "../core-rs/adapter/loadFactoryWasm.ts";
import { resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";
import type { FactoryCorpusPartyInstance } from "../src/engine/factoryCorpusParty.ts";
import type { DraftScreenState } from "../src/engine/factoryDraftScreen.ts";

const MAX_U32 = 0xffff_ffff;
const SPECIES = ["", "Ω空", `LONG_${"é".repeat(300)}`, "BAYLEEF", "HAUNTER", "SIX"] as const;
const RENTALS: readonly FactoryCorpusPartyInstance[] = [
  { setId: 0, personality: MAX_U32, fixedIv: 0, abilitySlot: 0 },
  { setId: 1, personality: 0, fixedIv: MAX_U32, abilitySlot: 1, otId: 0 },
  { setId: MAX_U32, personality: 0x8000_0000, fixedIv: 31, abilitySlot: 0 },
  { setId: 0x8000_0000, personality: 1, fixedIv: 0x8000_0000, abilitySlot: 1, otId: MAX_U32 },
  { setId: MAX_U32 - 1, personality: MAX_U32 - 1, fixedIv: 1, abilitySlot: 0 },
  { setId: 2, personality: 3, fixedIv: 4, abilitySlot: 1, otId: 0x8000_0000 },
];

type Case = Readonly<{ category: string; operation: FactoryDraftSelectionOperation }>;

function draftState(
  selectedIds: readonly number[],
  species: readonly string[] = SPECIES,
  rentals: readonly FactoryCorpusPartyInstance[] = RENTALS,
): DraftScreenState {
  return {
    selectedIds: [...selectedIds],
    slots: species.map((value) => ({ species: value })),
    rentals: rentals.map((source) => ({ source })),
  } as unknown as DraftScreenState;
}

function execute(engine: FactoryDraftSelectionEngine, operation: FactoryDraftSelectionOperation): unknown {
  try {
    switch (operation.kind) {
      case "select-mon-message": return engine.selectMonMessage(operation.selectingMonsState);
      case "apply-select": return engine.applySelect(operation.selectedIds, operation.selectingMonsState, operation.slotIndex);
      case "apply-deselect": return engine.applyDeselect(operation.selectedIds, operation.selectingMonsState, operation.slotIndex);
      case "is-mons-confirmed": return engine.isMonsConfirmed(operation.selectingMonsState);
      case "chosen-mon-species": return engine.chosenMonSpecies(draftState(operation.selectedIds, operation.species));
      case "selected-rental-party": return engine.selectedRentalParty(draftState(operation.selectedIds, SPECIES, operation.rentals));
      case "cursor-move-stalls-balls": return engine.cursorMoveStallsBalls(operation.enteringSpecies);
      case "move-cursor": return engine.moveCursor(operation.cursorPos, operation.direction);
      case "move-menu-cursor": return engine.moveMenuCursor(operation.menuCursorPos, operation.direction);
      case "advance-cursor-redraw": return engine.advanceCursorRedraw(operation.state);
      case "advance-menu-highlight-redraw": return engine.advanceMenuHighlightRedraw(operation.state);
      case "advance-rent-confirm-redraw": return engine.advanceRentConfirmRedraw(operation.state);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function permutation(values: readonly number[]): number[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) => permutation(values.filter((_, i) => i !== index)).map((tail) => [value, ...tail]));
}

function buildCases(): Case[] {
  const cases: Case[] = [];
  const add = (category: string, operation: FactoryDraftSelectionOperation): void => { cases.push({ category, operation }); };

  for (let state = 1; state <= 4; state += 1) add("select-message", { kind: "select-mon-message", selectingMonsState: state });
  for (let slot = 0; slot < 6; slot += 1) {
    for (let rank = 1; rank <= 3; rank += 1) {
      const ids = [0, 0, 0, 0, 0, 0];
      for (let prior = 1, index = 0; prior < rank; prior += 1, index += 1) {
        if (index === slot) index += 1;
        ids[index] = prior;
      }
      add("apply-select", { kind: "apply-select", selectedIds: ids, selectingMonsState: rank, slotIndex: slot });
    }
  }
  for (let slot = 0; slot < 6; slot += 1) {
    for (const state of [2, 3, 4]) {
      const ids = [0, 0, 0, 0, 0, 0]; ids[slot] = state - 1;
      add("apply-deselect-standard", { kind: "apply-deselect", selectedIds: ids, selectingMonsState: state, slotIndex: slot });
    }
    for (const state of [3, 4]) {
      const ids = [0, 0, 0, 0, 0, 0]; ids[slot] = state - 1;
      add("apply-deselect-standard", { kind: "apply-deselect", selectedIds: ids, selectingMonsState: state, slotIndex: slot });
    }
    const peer = (slot + 1) % 6;
    const found = [0, 0, 0, 0, 0, 0]; found[slot] = 1; found[peer] = 2;
    add("apply-deselect-renumber-found", { kind: "apply-deselect", selectedIds: found, selectingMonsState: 3, slotIndex: slot });
    const sparse = [0, 0, 0, 0, 0, 0]; sparse[slot] = 1;
    add("apply-deselect-renumber-no-found", { kind: "apply-deselect", selectedIds: sparse, selectingMonsState: 3, slotIndex: slot });
  }
  for (let state = 1; state <= 4; state += 1) add("confirmation", { kind: "is-mons-confirmed", selectingMonsState: state });
  for (const enteringSpecies of ["BAYLEEF", "HAUNTER", "", `unsafe_${"界".repeat(300)}`]) {
    add("cursor-stall-species", { kind: "cursor-move-stalls-balls", enteringSpecies });
  }
  for (let cursorPos = 0; cursorPos < 6; cursorPos += 1) for (const direction of [1, -1] as const) add("cursor-wrap", { kind: "move-cursor", cursorPos, direction });
  for (let menuCursorPos = 0; menuCursorPos < 3; menuCursorPos += 1) for (const direction of [1, -1] as const) add("menu-wrap", { kind: "move-menu-cursor", menuCursorPos, direction });
  for (const state of [null, { fromCursorPos: 0, elapsed: 0, fast: false }, { fromCursorPos: 5, elapsed: 1, fast: false }, { fromCursorPos: 2, elapsed: 2, fast: false }, { fromCursorPos: 1, elapsed: 0, fast: true }, { fromCursorPos: 4, elapsed: 1, fast: true }]) {
    add("cursor-redraw", { kind: "advance-cursor-redraw", state });
  }
  for (const state of [null, { fromMenuCursorPos: 0, elapsed: 0 }, { fromMenuCursorPos: 2, elapsed: 1 }]) add("menu-highlight-redraw", { kind: "advance-menu-highlight-redraw", state });
  for (const state of [null, { fromMessage: "", fromSelected: false, elapsed: 0 }, { fromMessage: `メッセージ_${"é".repeat(300)}`, fromSelected: true, elapsed: 1 }]) add("rent-confirm-redraw", { kind: "advance-rent-confirm-redraw", state });

  for (let slot = 0; slot < 6; slot += 1) for (let rank = 1; rank <= 3; rank += 1) {
    const ids = [0, 0, 0, 0, 0, 0]; ids[slot] = rank;
    add("chosen-slot-rank", { kind: "chosen-mon-species", selectedIds: ids, species: SPECIES });
  }
  for (const ranks of permutation([1, 2, 3])) add("chosen-permutation", { kind: "chosen-mon-species", selectedIds: [...ranks, 0, 0, 0], species: SPECIES });
  for (const ids of [[0, 0, 0, 0, 0, 0], [1, 0, 3, 0, 0, 0], [0, 2, 0, 0, 0, 0], [3, 0, 0, 1, 0, 0]]) add("chosen-sparse", { kind: "chosen-mon-species", selectedIds: ids, species: SPECIES });
  for (const ids of [[1, 1, 2, 3, 0, 0], [1, 2, 2, 3, 0, 0], [1, 2, 3, 3, 0, 0]]) add("chosen-duplicate-overwrite", { kind: "chosen-mon-species", selectedIds: ids, species: SPECIES });
  for (const ids of [[4, 1, 2, 3, 0, 0], [200, 3, 2, 1, 0, 0]]) add("chosen-above-three", { kind: "chosen-mon-species", selectedIds: ids, species: SPECIES });

  for (let slot = 0; slot < 6; slot += 1) for (let rank = 1; rank <= 3; rank += 1) {
    const ids = [0, 0, 0, 0, 0, 0]; ids[slot] = rank;
    add("rental-slot-rank", { kind: "selected-rental-party", selectedIds: ids, rentals: RENTALS });
  }
  for (const ranks of permutation([1, 2, 3])) add("rental-permutation", { kind: "selected-rental-party", selectedIds: [...ranks, 0, 0, 0], rentals: RENTALS });
  for (const ids of [[0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0], [1, 2, 0, 0, 0, 0], [1, 0, 3, 0, 0, 0]]) add("rental-missing", { kind: "selected-rental-party", selectedIds: ids, rentals: RENTALS });
  for (const ids of [[1, 1, 2, 3, 0, 0], [1, 2, 2, 3, 0, 0], [1, 2, 3, 3, 0, 0]]) add("rental-duplicate", { kind: "selected-rental-party", selectedIds: ids, rentals: RENTALS });
  for (let slot = 0; slot < 6; slot += 1) for (const rank of [4, 200]) {
    const ids = [1, 2, 3, 0, 0, 0]; ids[slot] = rank;
    add("rental-invalid", { kind: "selected-rental-party", selectedIds: ids, rentals: RENTALS });
  }
  add("rental-error-order", { kind: "selected-rental-party", selectedIds: [1, 1, 200, 3, 0, 0], rentals: RENTALS });
  add("rental-error-order", { kind: "selected-rental-party", selectedIds: [1, 4, 1, 3, 0, 0], rentals: RENTALS });
  return cases;
}

const CASES = buildCases();
const EXPECTED_CATEGORY_COUNTS = new Map<string, number>([
  ["select-message", 4], ["apply-select", 18], ["apply-deselect-standard", 30],
  ["apply-deselect-renumber-found", 6], ["apply-deselect-renumber-no-found", 6],
  ["confirmation", 4], ["cursor-stall-species", 4], ["cursor-wrap", 12], ["menu-wrap", 6],
  ["cursor-redraw", 6], ["menu-highlight-redraw", 3], ["rent-confirm-redraw", 3],
  ["chosen-slot-rank", 18], ["chosen-permutation", 6], ["chosen-sparse", 4],
  ["chosen-duplicate-overwrite", 3], ["chosen-above-three", 2], ["rental-slot-rank", 18],
  ["rental-permutation", 6], ["rental-missing", 4], ["rental-duplicate", 3],
  ["rental-invalid", 12], ["rental-error-order", 2],
]);

describe("Factory draft-selection adapter parity", () => {
  it("matches all 180 coherent canonical cases across 23 categories", async () => {
    expect(CASES).toHaveLength(180);
    const observed = new Map<string, number>();
    const canonical = tsFactoryDraftSelectionEngine();
    const selected = await factoryDraftSelectionEngine();
    for (const testCase of CASES) {
      observed.set(testCase.category, (observed.get(testCase.category) ?? 0) + 1);
      expect(execute(selected, testCase.operation), `${selected.id}:${testCase.category}`).toEqual(execute(canonical, testCase.operation));
    }
    expect(observed).toEqual(EXPECTED_CATEGORY_COUNTS);
    expect(selected.id).toBe(process.env.POKEBENCH_ENGINE === "wasm" ? "wasm" : "ts");
  });
});

async function rawBoundaryResult(wasm: FactoryWasmExports, packet: Uint8Array): Promise<Uint8Array> {
  const inputPtr = wasm.fw_alloc(packet.byteLength);
  let outputPtr = 0;
  try {
    new Uint8Array(wasm.memory.buffer, inputPtr, packet.byteLength).set(packet);
    outputPtr = wasm.fw_apply_factory_draft_selection_operation(inputPtr, packet.byteLength);
  } finally {
    wasm.fw_free(inputPtr, packet.byteLength);
  }
  const totalLength = new DataView(wasm.memory.buffer, outputPtr, 4).getUint32(0, true);
  const output = new Uint8Array(wasm.memory.buffer, outputPtr, totalLength).slice();
  wasm.fw_free(outputPtr, totalLength);
  return output;
}

function u32(bytes: Uint8Array, offset: number): number { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true); }
function status(bytes: Uint8Array): number { expect(u32(bytes, 0)).toBe(bytes.byteLength); return bytes[4]!; }
function message(bytes: Uint8Array): string { const length = u32(bytes, 5); return new TextDecoder().decode(bytes.slice(9, 9 + length)); }

const wasmAvailable = existsSync(resolveWasmArtifactPath());
const wasmRequired = process.env.POKEBENCH_ENGINE === "wasm";

describe.skipIf(!wasmAvailable && !wasmRequired)("Factory draft-selection checked packet", () => {
  it("returns one stable status-2 boundary error for all 56 malformed packets", async () => {
    const wasm = await loadFactoryWasm();
    const valid: FactoryDraftSelectionOperation[] = [
      { kind: "select-mon-message", selectingMonsState: 1 },
      { kind: "apply-select", selectedIds: [0, 0, 0, 0, 0, 0], selectingMonsState: 1, slotIndex: 0 },
      { kind: "apply-deselect", selectedIds: [1, 0, 0, 0, 0, 0], selectingMonsState: 2, slotIndex: 0 },
      { kind: "is-mons-confirmed", selectingMonsState: 4 },
      { kind: "chosen-mon-species", selectedIds: [1, 2, 3, 0, 0, 0], species: SPECIES },
      { kind: "selected-rental-party", selectedIds: [1, 2, 3, 0, 0, 0], rentals: RENTALS },
      { kind: "cursor-move-stalls-balls", enteringSpecies: "界" },
      { kind: "move-cursor", cursorPos: 5, direction: -1 },
      { kind: "move-menu-cursor", menuCursorPos: 2, direction: 1 },
      { kind: "advance-cursor-redraw", state: { fromCursorPos: 5, elapsed: 1, fast: true } },
      { kind: "advance-menu-highlight-redraw", state: { fromMenuCursorPos: 2, elapsed: 1 } },
      { kind: "advance-rent-confirm-redraw", state: { fromMessage: "é", fromSelected: true, elapsed: 1 } },
    ];
    const encoded = valid.map(encodeFactoryDraftSelectionOperation);
    const malformed: Uint8Array[] = [
      new Uint8Array(),
      ...encoded.map((packet) => packet.slice(0, -1)),
      ...encoded.map((packet) => Uint8Array.from([...packet, 0])),
      Uint8Array.of(2, 0, 1), Uint8Array.of(1, 0xff),
      Uint8Array.of(1, 0, 0), Uint8Array.of(1, 0, 5),
      Uint8Array.of(1, 3, 0), Uint8Array.of(1, 3, 5),
      Uint8Array.of(1, 1, 4, 0, 0, 0, 0, 0, 1, 0),
      Uint8Array.of(1, 2, 0, 0, 0, 0, 0, 0, 1, 0),
      Uint8Array.of(1, 1, 0, 0, 0, 0, 0, 0, 4, 0),
      Uint8Array.of(1, 2, 1, 0, 0, 0, 0, 0, 1, 0),
      Uint8Array.of(1, 1, 0, 0, 0, 0, 0, 0, 1, 6),
      Uint8Array.of(1, 7, 6, 0), Uint8Array.of(1, 7, 0, 2),
      Uint8Array.of(1, 8, 3, 0), Uint8Array.of(1, 8, 0, 2),
      Uint8Array.of(1, 9, 2), Uint8Array.of(1, 10, 2), Uint8Array.of(1, 11, 2),
      Uint8Array.of(1, 9, 1, 6, 0, 0), Uint8Array.of(1, 9, 1, 0, 3, 0), Uint8Array.of(1, 9, 1, 0, 0, 2),
      Uint8Array.of(1, 10, 1, 3, 0), Uint8Array.of(1, 10, 1, 0, 2),
      Uint8Array.of(1, 11, 1, 0, 0, 0, 2, 0), Uint8Array.of(1, 11, 1, 0, 0, 0, 0, 2),
      Uint8Array.of(1, 6, 1, 0, 0, 0, 0xff), Uint8Array.of(1, 6, 0xff, 0xff, 0xff, 0xff),
      Uint8Array.of(1, 0, 1, 0), Uint8Array.of(1, 7, 0, 0, 0),
    ];
    const badAbility = encoded[5]!.slice(); badAbility[20] = 2; malformed.push(badAbility);
    const badOtPresence = encoded[5]!.slice(); badOtPresence[21] = 2; malformed.push(badOtPresence);
    expect(malformed).toHaveLength(56);
    for (const packet of malformed) {
      const result = await rawBoundaryResult(wasm, packet);
      expect(status(result)).toBe(2);
      expect(message(result)).toBe("factory-wasm factoryDraftSelectionEngine: malformed operation packet");
    }
  });

  it("keeps all three semantic error classes at status 1 with exact ordering", async () => {
    const wasm = await loadFactoryWasm();
    const cases = [
      { ids: [4, 1, 2, 3, 0, 0], message: "invalid draft pick rank 4 at rental slot 0" },
      { ids: [1, 2, 1, 3, 0, 0], message: "invalid draft pick rank 1 at rental slot 2" },
      { ids: [1, 0, 3, 0, 0, 0], message: "draft routing requires exactly three ranked rental picks" },
      { ids: [1, 4, 1, 3, 0, 0], message: "invalid draft pick rank 4 at rental slot 1" },
    ];
    for (const semantic of cases) {
      const packet = encodeFactoryDraftSelectionOperation({ kind: "selected-rental-party", selectedIds: semantic.ids, rentals: RENTALS });
      const result = await rawBoundaryResult(wasm, packet);
      expect(status(result)).toBe(1);
      expect(message(result)).toBe(semantic.message);
    }
  });

  it("exposes and directly uses the new export in forced mode with no fallback", async () => {
    const wasm = await loadFactoryWasm();
    expect(typeof wasm.fw_apply_factory_draft_selection_operation).toBe("function");
    const packet = encodeFactoryDraftSelectionOperation({ kind: "cursor-move-stalls-balls", enteringSpecies: "BAYLEEF" });
    expect(status(await rawBoundaryResult(wasm, packet))).toBe(0);
    const selected = await factoryDraftSelectionEngine();
    expect(selected.id).toBe(wasmRequired ? "wasm" : "ts");
    if (wasmRequired) expect(selected.cursorMoveStallsBalls("BAYLEEF")).toBe(false);
  });
});
