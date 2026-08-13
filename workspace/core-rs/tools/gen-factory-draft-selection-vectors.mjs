#!/usr/bin/env node
// Differential corpus for the presentation-free Battle Factory draft helpers.
// Expected values come exclusively from executing the canonical exported
// helpers in src/engine/factoryDraftScreen.ts.  This generator owns only the
// bounded, source-controller-shaped input matrix and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-draft-selection-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "factory_draft_selection_vectors_gen.rs",
);
const canonicalDraft = await import(pathToFileURL(path.join(
  workspaceRoot,
  "src",
  "engine",
  "factoryDraftScreen.ts",
)).href);

const SLOT_COUNT = 6;
const PARTY_SIZE = 3;
const MENU_OPTION_COUNT = 3;
const SELECTING_STATE_MIN = 1;
const SELECTING_STATE_MAX = 4;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-factory-draft-selection-vectors: ${message}`);
}

assert(canonicalDraft.FRONTIER_PARTY_SIZE === PARTY_SIZE, "canonical party size drifted");
assert(canonicalDraft.MENU_OPTION_COUNT === MENU_OPTION_COUNT, "canonical menu option count drifted");

function assertSlot(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value < SLOT_COUNT, `${label} must be 0..5`);
}

function assertMenuCursor(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value < MENU_OPTION_COUNT, `${label} must be 0..2`);
}

function assertSelectingState(value, label) {
  assert(
    Number.isInteger(value) && value >= SELECTING_STATE_MIN && value <= SELECTING_STATE_MAX,
    `${label} must be 1..4`,
  );
}

function assertSelectedIds(value, label) {
  assert(Array.isArray(value) && value.length === SLOT_COUNT, `${label} must have six cells`);
  value.forEach((rank, index) => {
    assert(Number.isInteger(rank) && rank >= 0 && rank <= PARTY_SIZE, `${label}[${index}] must be 0..3`);
  });
}

function frozenSelectedIds(value) {
  assertSelectedIds(value, "selectedIds");
  return Object.freeze([...value]);
}

function cloneSelectionChange(value) {
  assert(value !== null && typeof value === "object", "selection helper must return an object");
  assertSelectedIds(value.selectedIds, "selection result selectedIds");
  assertSelectingState(value.selectingMonsState, "selection result selectingMonsState");
  return Object.freeze({
    selectedIds: [...value.selectedIds],
    selectingMonsState: value.selectingMonsState,
  });
}

function cloneCursorRedraw(value) {
  if (value === null) return null;
  assert(value !== null && typeof value === "object", "cursor redraw must be object/null");
  assertSlot(value.fromCursorPos, "cursor redraw fromCursorPos");
  assert(Number.isInteger(value.elapsed) && value.elapsed >= 0 && value.elapsed <= 2, "cursor redraw elapsed must be 0..2");
  assert(typeof value.fast === "boolean", "cursor redraw fast must be boolean");
  return Object.freeze({ fromCursorPos: value.fromCursorPos, elapsed: value.elapsed, fast: value.fast });
}

function cloneMenuHighlightRedraw(value) {
  if (value === null) return null;
  assert(value !== null && typeof value === "object", "menu redraw must be object/null");
  assertMenuCursor(value.fromMenuCursorPos, "menu redraw fromMenuCursorPos");
  assert(Number.isInteger(value.elapsed) && value.elapsed >= 0 && value.elapsed <= 1, "menu redraw elapsed must be 0..1");
  return Object.freeze({ fromMenuCursorPos: value.fromMenuCursorPos, elapsed: value.elapsed });
}

function cloneRentConfirmRedraw(value) {
  if (value === null) return null;
  assert(value !== null && typeof value === "object", "rent redraw must be object/null");
  assert(typeof value.fromMessage === "string", "rent redraw fromMessage must be string");
  assert(typeof value.fromSelected === "boolean", "rent redraw fromSelected must be boolean");
  assert(Number.isInteger(value.elapsed) && value.elapsed >= 0 && value.elapsed <= 1, "rent redraw elapsed must be 0..1");
  return Object.freeze({
    fromMessage: value.fromMessage,
    fromSelected: value.fromSelected,
    elapsed: value.elapsed,
  });
}

const SLOT_SPECIES = Object.freeze([
  "SPECIES_ZERO",
  "SPECIES_ONE",
  "SPECIES_TWO",
  "SPECIES_THREE",
  "SPECIES_FOUR",
  "SPECIES_FIVE",
]);

const RENTAL_SOURCES = Object.freeze([
  { recordId: 0, boundaryValue: 4_294_967_295, optionalValue: null, marker: "source-zero" },
  { recordId: 1, boundaryValue: 4_294_967_294, optionalValue: 0, marker: "source-one" },
  { recordId: 2_147_483_647, boundaryValue: 2_147_483_648, optionalValue: null, marker: "source-two" },
  { recordId: 2_147_483_648, boundaryValue: 2_147_483_647, optionalValue: 4_294_967_295, marker: "source-three" },
  { recordId: 4_294_967_294, boundaryValue: 1, optionalValue: null, marker: "source-four" },
  { recordId: 4_294_967_295, boundaryValue: 0, optionalValue: 2_147_483_648, marker: "source-five" },
].map((record) => Object.freeze(record)));

function cloneSourceRecord(record) {
  assert(record !== null && typeof record === "object", "rental source must be an object");
  for (const key of ["recordId", "boundaryValue"]) {
    assert(Number.isInteger(record[key]) && record[key] >= 0 && record[key] <= 0xffff_ffff, `${key} must be u32`);
  }
  assert(
    record.optionalValue === null
      || (Number.isInteger(record.optionalValue) && record.optionalValue >= 0 && record.optionalValue <= 0xffff_ffff),
    "optionalValue must be null/u32",
  );
  assert(typeof record.marker === "string", "rental source marker must be a string");
  return Object.freeze({ ...record });
}

function projectionState(selectedIds) {
  assert(Array.isArray(selectedIds) && selectedIds.length === SLOT_COUNT, "projection selectedIds must have six cells");
  selectedIds.forEach((rank, slot) => {
    assert(Number.isInteger(rank) && rank >= 0 && rank <= 0xff, `projection selectedIds[${slot}] must be u8`);
  });
  const frozenIds = Object.freeze([...selectedIds]);
  const slots = Object.freeze(SLOT_SPECIES.map((species) => Object.freeze({ species })));
  const rentals = Object.freeze(RENTAL_SOURCES.map((source) => Object.freeze({ source })));
  return Object.freeze({ selectedIds: frozenIds, slots, rentals });
}

function canonicalChosenSpecies(selectedIds) {
  const state = projectionState(selectedIds);
  const beforeIds = [...state.selectedIds];
  const result = canonicalDraft.chosenMonSpecies(state);
  assert(Array.isArray(result) && result.every((species) => typeof species === "string"), "chosenMonSpecies result shape");
  assert(JSON.stringify(state.selectedIds) === JSON.stringify(beforeIds), "canonical chosenMonSpecies mutated selectedIds");
  assert(state.slots.every((slot, index) => slot.species === SLOT_SPECIES[index]), "canonical chosenMonSpecies mutated slots");
  return Object.freeze([...result]);
}

function canonicalSelectedRentalParty(selectedIds) {
  const state = projectionState(selectedIds);
  const beforeIds = [...state.selectedIds];
  const beforeSources = state.rentals.map(({ source }) => cloneSourceRecord(source));
  let expected;
  try {
    const result = canonicalDraft.selectedRentalParty(state);
    assert(Object.isFrozen(result), "canonical selectedRentalParty result must be frozen");
    expected = Object.freeze({ ok: true, records: Object.freeze(result.map(cloneSourceRecord)) });
  } catch (error) {
    assert(error instanceof Error, "canonical selectedRentalParty threw a non-Error");
    expected = Object.freeze({ ok: false, error: error.message });
  }
  assert(JSON.stringify(state.selectedIds) === JSON.stringify(beforeIds), "canonical selectedRentalParty mutated selectedIds");
  assert(
    JSON.stringify(state.rentals.map(({ source }) => source)) === JSON.stringify(beforeSources),
    "canonical selectedRentalParty mutated rental sources",
  );
  return expected;
}

function chosenBranches(selectedIds) {
  const branches = new Set();
  const seen = new Set();
  for (const rank of selectedIds) {
    if (rank === 0) {
      branches.add("chosen-zero-skip");
      continue;
    }
    branches.add("chosen-positive-write");
    if (seen.has(rank)) branches.add("chosen-later-duplicate-overwrite");
    seen.add(rank);
    if (rank > PARTY_SIZE) branches.add("chosen-above-three-not-emitted");
  }
  for (let rank = 1; rank <= PARTY_SIZE; rank += 1) {
    branches.add(seen.has(rank) ? "chosen-present-rank-emit" : "chosen-missing-rank-skip");
  }
  return Object.freeze([...branches].sort());
}

function rentalBranches(selectedIds, expected) {
  const branches = new Set();
  const occupied = new Set();
  for (const rank of selectedIds) {
    if (rank === 0) {
      branches.add("rental-zero-skip");
      continue;
    }
    if (rank > PARTY_SIZE) {
      branches.add("rental-invalid-rank-error");
      break;
    }
    if (occupied.has(rank)) {
      branches.add("rental-duplicate-rank-error");
      break;
    }
    occupied.add(rank);
    branches.add("rental-valid-rank-store");
  }
  branches.add(expected.ok ? "rental-complete-success" : (
    expected.error === "draft routing requires exactly three ranked rental picks"
      ? "rental-missing-ranks-error"
      : "rental-first-validation-error"
  ));
  return Object.freeze([...branches].sort());
}

const categoryCounts = new Map();
const labels = new Set();
function addCase(collection, value) {
  assert(/^[a-z0-9_]+$/.test(value.label), `invalid label ${value.label}`);
  assert(!labels.has(value.label), `duplicate label ${value.label}`);
  labels.add(value.label);
  assert(typeof value.category === "string" && value.category.length > 0, `bad category ${value.label}`);
  categoryCounts.set(value.category, (categoryCounts.get(value.category) ?? 0) + 1);
  collection.push(Object.freeze(value));
}

const selectMonMessageCases = [];
for (const selectingMonsState of [1, 2, 3, 4]) {
  const expectedMessage = canonicalDraft.selectMonMessage(selectingMonsState);
  assert(typeof expectedMessage === "string", "selectMonMessage must return a string");
  addCase(selectMonMessageCases, {
    label: selectingMonsState === 4 ? "select_message_confirm_fallback" : `select_message_state_${selectingMonsState}`,
    category: "select-message",
    selectingMonsState,
    expectedMessage,
  });
}

function freeSlots(slotIndex) {
  assertSlot(slotIndex, "slotIndex");
  return Array.from({ length: SLOT_COUNT }, (_, index) => index).filter((index) => index !== slotIndex);
}

function selectedIdsForSelect(slotIndex, selectingMonsState) {
  assertSlot(slotIndex, "select slotIndex");
  assert(
    Number.isInteger(selectingMonsState) && selectingMonsState >= 1 && selectingMonsState <= PARTY_SIZE,
    "select state must be 1..3",
  );
  const selectedIds = Array(SLOT_COUNT).fill(0);
  const available = freeSlots(slotIndex);
  for (let rank = 1; rank < selectingMonsState; rank += 1) selectedIds[available[rank - 1]] = rank;
  return selectedIds;
}

const applySelectCases = [];
for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
  for (let selectingMonsState = 1; selectingMonsState <= PARTY_SIZE; selectingMonsState += 1) {
    const selectedIds = frozenSelectedIds(selectedIdsForSelect(slotIndex, selectingMonsState));
    const before = [...selectedIds];
    const expected = cloneSelectionChange(canonicalDraft.applySelect(selectedIds, selectingMonsState, slotIndex));
    assert(JSON.stringify(selectedIds) === JSON.stringify(before), "canonical applySelect mutated selectedIds");
    addCase(applySelectCases, {
      label: `apply_select_slot_${slotIndex}_rank_${selectingMonsState}`,
      category: "apply-select",
      selectedIds,
      selectingMonsState,
      slotIndex,
      expected,
    });
  }
}

function selectedIdsForDeselect(slotIndex, selectedRank, selectingMonsState) {
  assertSlot(slotIndex, "deselect slotIndex");
  assert(Number.isInteger(selectedRank) && selectedRank >= 1 && selectedRank <= PARTY_SIZE, "deselect rank must be 1..3");
  assertSelectingState(selectingMonsState, "deselect selectingMonsState");
  assert(selectedRank < selectingMonsState, "deselect rank must be selected");
  const selectedIds = Array(SLOT_COUNT).fill(0);
  selectedIds[slotIndex] = selectedRank;
  const available = freeSlots(slotIndex);
  let availableIndex = 0;
  for (let rank = 1; rank < selectingMonsState; rank += 1) {
    if (rank === selectedRank) continue;
    selectedIds[available[availableIndex]] = rank;
    availableIndex += 1;
  }
  return selectedIds;
}

const applyDeselectCases = [];
for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
  for (let selectedRank = 1; selectedRank <= PARTY_SIZE; selectedRank += 1) {
    for (let selectingMonsState = selectedRank + 1; selectingMonsState <= SELECTING_STATE_MAX; selectingMonsState += 1) {
      const selectedIds = frozenSelectedIds(selectedIdsForDeselect(slotIndex, selectedRank, selectingMonsState));
      const before = [...selectedIds];
      const expected = cloneSelectionChange(canonicalDraft.applyDeselect(selectedIds, selectingMonsState, slotIndex));
      assert(JSON.stringify(selectedIds) === JSON.stringify(before), "canonical applyDeselect mutated selectedIds");
      const category = selectedRank === 1 && selectingMonsState === PARTY_SIZE
        ? "apply-deselect-renumber-found"
        : "apply-deselect-standard";
      addCase(applyDeselectCases, {
        label: `apply_deselect_slot_${slotIndex}_rank_${selectedRank}_state_${selectingMonsState}`,
        category,
        selectedIds,
        selectingMonsState,
        slotIndex,
        expected,
      });
    }
  }
}

// The helper's `findIndex` can legally return -1 for a bounded six-cell
// record even though the reducer never emits this sparse tuple.  Keep one
// case per slot so the exact no-op path remains an executable differential.
for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
  const selectedIds = Array(SLOT_COUNT).fill(0);
  selectedIds[slotIndex] = 1;
  const frozen = frozenSelectedIds(selectedIds);
  const expected = cloneSelectionChange(canonicalDraft.applyDeselect(frozen, PARTY_SIZE, slotIndex));
  addCase(applyDeselectCases, {
    label: `apply_deselect_renumber_no_found_slot_${slotIndex}`,
    category: "apply-deselect-renumber-no-found",
    selectedIds: frozen,
    selectingMonsState: PARTY_SIZE,
    slotIndex,
    expected,
  });
}

const confirmationCases = [];
for (const selectingMonsState of [1, 2, 3, 4]) {
  addCase(confirmationCases, {
    label: `is_mons_confirmed_state_${selectingMonsState}`,
    category: "confirmation",
    selectingMonsState,
    expectedConfirmed: canonicalDraft.isMonsConfirmed(selectingMonsState),
  });
}

const cursorMoveStallCases = [];
for (const { label, enteringSpecies } of [
  { label: "bayleef_exact", enteringSpecies: "BAYLEEF" },
  { label: "haunter_exact", enteringSpecies: "HAUNTER" },
  { label: "magby_unsafe", enteringSpecies: "MAGBY" },
  { label: "bayleef_mixed_case_unsafe", enteringSpecies: "Bayleef" },
]) {
  addCase(cursorMoveStallCases, {
    label: `cursor_stalls_${label}`,
    category: "cursor-stall-species",
    enteringSpecies,
    expectedStalls: canonicalDraft.cursorMoveStallsBalls(enteringSpecies),
  });
}

const moveCursorCases = [];
for (let cursorPos = 0; cursorPos < SLOT_COUNT; cursorPos += 1) {
  for (const direction of [1, -1]) {
    addCase(moveCursorCases, {
      label: `move_cursor_slot_${cursorPos}_${direction === 1 ? "forward" : "backward"}`,
      category: "cursor-wrap",
      cursorPos,
      direction,
      expectedCursorPos: canonicalDraft.moveCursor(cursorPos, direction),
    });
  }
}

const moveMenuCursorCases = [];
for (let menuCursorPos = 0; menuCursorPos < MENU_OPTION_COUNT; menuCursorPos += 1) {
  for (const direction of [1, -1]) {
    addCase(moveMenuCursorCases, {
      label: `move_menu_cursor_row_${menuCursorPos}_${direction === 1 ? "forward" : "backward"}`,
      category: "menu-wrap",
      menuCursorPos,
      direction,
      expectedMenuCursorPos: canonicalDraft.moveMenuCursor(menuCursorPos, direction),
    });
  }
}

const cursorRedrawCases = [];
addCase(cursorRedrawCases, {
  label: "advance_cursor_redraw_null",
  category: "cursor-redraw",
  state: null,
  expected: cloneCursorRedraw(canonicalDraft.advanceCursorRedraw(null)),
});
for (const { fast, elapsed, fromCursorPos } of [
  { fast: false, elapsed: 0, fromCursorPos: 0 },
  { fast: false, elapsed: 1, fromCursorPos: 1 },
  { fast: false, elapsed: 2, fromCursorPos: 2 },
  { fast: true, elapsed: 0, fromCursorPos: 4 },
  { fast: true, elapsed: 1, fromCursorPos: 5 },
]) {
  const state = Object.freeze({ fromCursorPos, elapsed, fast });
  addCase(cursorRedrawCases, {
    label: `advance_cursor_redraw_${fast ? "fast" : "slow"}_elapsed_${elapsed}`,
    category: "cursor-redraw",
    state: cloneCursorRedraw(state),
    expected: cloneCursorRedraw(canonicalDraft.advanceCursorRedraw(state)),
  });
}

const menuHighlightRedrawCases = [];
addCase(menuHighlightRedrawCases, {
  label: "advance_menu_highlight_redraw_null",
  category: "menu-highlight-redraw",
  state: null,
  expected: cloneMenuHighlightRedraw(canonicalDraft.advanceMenuHighlightRedraw(null)),
});
for (const { elapsed, fromMenuCursorPos } of [
  { elapsed: 0, fromMenuCursorPos: 0 },
  { elapsed: 1, fromMenuCursorPos: 2 },
]) {
  const state = Object.freeze({ fromMenuCursorPos, elapsed });
  addCase(menuHighlightRedrawCases, {
    label: `advance_menu_highlight_redraw_elapsed_${elapsed}`,
    category: "menu-highlight-redraw",
    state: cloneMenuHighlightRedraw(state),
    expected: cloneMenuHighlightRedraw(canonicalDraft.advanceMenuHighlightRedraw(state)),
  });
}

const rentConfirmRedrawCases = [];
addCase(rentConfirmRedrawCases, {
  label: "advance_rent_confirm_redraw_null",
  category: "rent-confirm-redraw",
  state: null,
  expected: cloneRentConfirmRedraw(canonicalDraft.advanceRentConfirmRedraw(null)),
});
for (const { elapsed, fromMessage, fromSelected } of [
  { elapsed: 0, fromMessage: "Select the second POKéMON.", fromSelected: false },
  { elapsed: 1, fromMessage: "Are these three POKéMON OK?", fromSelected: true },
]) {
  const state = Object.freeze({ fromMessage, fromSelected, elapsed });
  addCase(rentConfirmRedrawCases, {
    label: `advance_rent_confirm_redraw_elapsed_${elapsed}`,
    category: "rent-confirm-redraw",
    state: cloneRentConfirmRedraw(state),
    expected: cloneRentConfirmRedraw(canonicalDraft.advanceRentConfirmRedraw(state)),
  });
}

const chosenSpeciesCases = [];
function addChosenSpeciesCase(label, category, selectedIds) {
  const frozenIds = Object.freeze([...selectedIds]);
  const expectedSpecies = canonicalChosenSpecies(frozenIds);
  addCase(chosenSpeciesCases, {
    label,
    category,
    selectedIds: frozenIds,
    expectedSpecies,
    branches: chosenBranches(frozenIds),
  });
}

// Every one of the six slots is observed in every emitted rank position.
for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
  for (let rank = 1; rank <= PARTY_SIZE; rank += 1) {
    const selectedIds = Array(SLOT_COUNT).fill(0);
    selectedIds[slot] = rank;
    addChosenSpeciesCase(`chosen_slot_${slot}_rank_${rank}`, "chosen-slot-rank", selectedIds);
  }
}

const RANK_PERMUTATIONS = Object.freeze([
  [1, 2, 3],
  [1, 3, 2],
  [2, 1, 3],
  [2, 3, 1],
  [3, 1, 2],
  [3, 2, 1],
].map((permutation) => Object.freeze(permutation)));
for (const permutation of RANK_PERMUTATIONS) {
  addChosenSpeciesCase(
    `chosen_permutation_${permutation.join("_")}`,
    "chosen-permutation",
    [...permutation, 0, 0, 0],
  );
}
for (const [label, selectedIds] of [
  ["all_zero", [0, 0, 0, 0, 0, 0]],
  ["rank_one_only", [0, 0, 1, 0, 0, 0]],
  ["ranks_one_three", [3, 0, 0, 1, 0, 0]],
  ["rank_two_only", [0, 2, 0, 0, 0, 0]],
]) {
  addChosenSpeciesCase(`chosen_sparse_${label}`, "chosen-sparse", selectedIds);
}
for (const [rank, selectedIds] of [
  [1, [1, 1, 2, 3, 0, 0]],
  [2, [2, 1, 0, 2, 3, 0]],
  [3, [3, 1, 2, 0, 0, 3]],
]) {
  addChosenSpeciesCase(`chosen_duplicate_rank_${rank}`, "chosen-duplicate-overwrite", selectedIds);
}
addChosenSpeciesCase("chosen_rank_4_ignored", "chosen-above-three", [4, 1, 2, 3, 0, 0]);
addChosenSpeciesCase("chosen_rank_200_ignored", "chosen-above-three", [200, 3, 0, 2, 0, 1]);

const selectedRentalPartyCases = [];
function addSelectedRentalPartyCase(label, category, selectedIds) {
  const frozenIds = Object.freeze([...selectedIds]);
  const expected = canonicalSelectedRentalParty(frozenIds);
  addCase(selectedRentalPartyCases, {
    label,
    category,
    selectedIds: frozenIds,
    expected,
    branches: rentalBranches(frozenIds, expected),
  });
}

function completeSelectionWith(slot, rank) {
  const selectedIds = Array(SLOT_COUNT).fill(0);
  selectedIds[slot] = rank;
  const openSlots = freeSlots(slot);
  let openIndex = 0;
  for (let otherRank = 1; otherRank <= PARTY_SIZE; otherRank += 1) {
    if (otherRank === rank) continue;
    selectedIds[openSlots[openIndex]] = otherRank;
    openIndex += 1;
  }
  return selectedIds;
}

// Complete parties prove all six source records can occupy every result rank.
for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
  for (let rank = 1; rank <= PARTY_SIZE; rank += 1) {
    addSelectedRentalPartyCase(
      `rental_slot_${slot}_rank_${rank}`,
      "rental-slot-rank",
      completeSelectionWith(slot, rank),
    );
  }
}
for (const permutation of RANK_PERMUTATIONS) {
  addSelectedRentalPartyCase(
    `rental_permutation_${permutation.join("_")}`,
    "rental-permutation",
    [...permutation, 0, 0, 0],
  );
}
for (const [label, selectedIds] of [
  ["all_zero", [0, 0, 0, 0, 0, 0]],
  ["rank_one_only", [1, 0, 0, 0, 0, 0]],
  ["ranks_one_three", [1, 0, 3, 0, 0, 0]],
  ["ranks_two_three", [0, 2, 0, 3, 0, 0]],
]) {
  addSelectedRentalPartyCase(`rental_missing_${label}`, "rental-missing", selectedIds);
}
for (const [rank, selectedIds] of [
  [1, [1, 0, 1, 2, 3, 0]],
  [2, [2, 1, 0, 2, 3, 0]],
  [3, [3, 1, 2, 0, 0, 3]],
]) {
  addSelectedRentalPartyCase(`rental_duplicate_rank_${rank}`, "rental-duplicate", selectedIds);
}
for (const invalidRank of [4, 200]) {
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    const selectedIds = Array(SLOT_COUNT).fill(0);
    selectedIds[slot] = invalidRank;
    addSelectedRentalPartyCase(
      `rental_invalid_rank_${invalidRank}_slot_${slot}`,
      "rental-invalid",
      selectedIds,
    );
  }
}
addSelectedRentalPartyCase(
  "rental_duplicate_precedes_later_invalid",
  "rental-error-order",
  [1, 1, 4, 2, 3, 0],
);
addSelectedRentalPartyCase(
  "rental_invalid_precedes_later_duplicate",
  "rental-error-order",
  [4, 1, 1, 2, 3, 0],
);

const allCaseCount = [
  selectMonMessageCases,
  applySelectCases,
  applyDeselectCases,
  confirmationCases,
  cursorMoveStallCases,
  moveCursorCases,
  moveMenuCursorCases,
  cursorRedrawCases,
  menuHighlightRedrawCases,
  rentConfirmRedrawCases,
  chosenSpeciesCases,
  selectedRentalPartyCases,
].reduce((total, cases) => total + cases.length, 0);

assert(selectMonMessageCases.length === 4, "message matrix drifted");
assert(applySelectCases.length === SLOT_COUNT * PARTY_SIZE, "select matrix drifted");
assert(applyDeselectCases.length === 42, "deselect matrix drifted");
assert(confirmationCases.length === 4, "confirmation matrix drifted");
assert(cursorMoveStallCases.length === 4, "species matrix drifted");
assert(moveCursorCases.length === SLOT_COUNT * 2, "cursor matrix drifted");
assert(moveMenuCursorCases.length === MENU_OPTION_COUNT * 2, "menu matrix drifted");
assert(cursorRedrawCases.length === 6, "cursor redraw matrix drifted");
assert(menuHighlightRedrawCases.length === 3, "menu redraw matrix drifted");
assert(rentConfirmRedrawCases.length === 3, "rent redraw matrix drifted");
assert(chosenSpeciesCases.length === 33, "chosen-species matrix drifted");
assert(selectedRentalPartyCases.length === 45, "selected-rental matrix drifted");
assert(allCaseCount === 180, `total matrix drifted to ${allCaseCount}`);

function rustString(value) {
  assert(typeof value === "string", "rust string must receive a string");
  return JSON.stringify(value);
}

function rustSelectedIds(value) {
  assertSelectedIds(value, "rust selectedIds");
  return `[${value.join(", ")}]`;
}

function rustProjectionSelectedIds(value) {
  assert(Array.isArray(value) && value.length === SLOT_COUNT, "rust projection selectedIds must have six cells");
  value.forEach((rank) => assert(Number.isInteger(rank) && rank >= 0 && rank <= 0xff, "rust projection rank must be u8"));
  return `[${value.join(", ")}]`;
}

function rustBranches(value) {
  assert(Array.isArray(value) && value.every((branch) => typeof branch === "string"), "branches must be strings");
  return `&[${value.map(rustString).join(", ")}]`;
}

function rustOptionalU32(value) {
  if (value === null) return "None";
  assert(Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff, "optional u32 out of range");
  return `Some(${value})`;
}

function rustSourceRecord(value) {
  const record = cloneSourceRecord(value);
  return `FactoryDraftVectorSourceRecord {
            record_id: ${record.recordId},
            boundary_value: ${record.boundaryValue},
            optional_value: ${rustOptionalU32(record.optionalValue)},
            marker: ${rustString(record.marker)},
        }`;
}

function rustRentalExpected(value) {
  if (value.ok) {
    assert(value.records.length === PARTY_SIZE, "successful rental result must have three records");
    return `FactoryDraftRentalVectorExpected::Ok([
            ${value.records.map(rustSourceRecord).join(",\n            ")},
        ])`;
  }
  return `FactoryDraftRentalVectorExpected::Err(${rustString(value.error)})`;
}

function rustDirection(value) {
  assert(value === 1 || value === -1, "direction must be 1 or -1");
  return value === 1 ? "FactoryDraftDirection::Forward" : "FactoryDraftDirection::Backward";
}

function rustSelectionChange(value) {
  return `FactoryDraftSelectionChange {
            selected_ids: ${rustSelectedIds(value.selectedIds)},
            selecting_mons_state: ${value.selectingMonsState},
        }`;
}

function rustCursorRedraw(value) {
  if (value === null) return "None";
  return `Some(FactoryDraftCursorRedrawState {
            from_cursor_pos: ${value.fromCursorPos},
            elapsed: ${value.elapsed},
            fast: ${value.fast},
        })`;
}

function rustMenuHighlightRedraw(value) {
  if (value === null) return "None";
  return `Some(FactoryDraftMenuHighlightRedrawState {
            from_menu_cursor_pos: ${value.fromMenuCursorPos},
            elapsed: ${value.elapsed},
        })`;
}

function rustRentConfirmRedraw(value) {
  if (value === null) return "None";
  return `Some(FactoryDraftRentConfirmRedrawState {
            from_message: ${rustString(value.fromMessage)},
            from_selected: ${value.fromSelected},
            elapsed: ${value.elapsed},
        })`;
}

function renderSelectMonMessageCase(value) {
  return `    FactoryDraftSelectMonMessageVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        selecting_mons_state: ${value.selectingMonsState},
        expected_message: ${rustString(value.expectedMessage)},
    },`;
}

function renderSelectionCase(value) {
  return `    FactoryDraftSelectionVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        selected_ids: ${rustSelectedIds(value.selectedIds)},
        selecting_mons_state: ${value.selectingMonsState},
        slot_index: ${value.slotIndex},
        expected: ${rustSelectionChange(value.expected)},
    },`;
}

function renderConfirmationCase(value) {
  return `    FactoryDraftConfirmationVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        selecting_mons_state: ${value.selectingMonsState},
        expected_confirmed: ${value.expectedConfirmed},
    },`;
}

function renderCursorMoveStallCase(value) {
  return `    FactoryDraftCursorMoveStallVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        entering_species: ${rustString(value.enteringSpecies)},
        expected_stalls: ${value.expectedStalls},
    },`;
}

function renderMoveCursorCase(value) {
  return `    FactoryDraftMoveCursorVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        cursor_pos: ${value.cursorPos},
        direction: ${rustDirection(value.direction)},
        expected_cursor_pos: ${value.expectedCursorPos},
    },`;
}

function renderMoveMenuCursorCase(value) {
  return `    FactoryDraftMoveMenuCursorVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        menu_cursor_pos: ${value.menuCursorPos},
        direction: ${rustDirection(value.direction)},
        expected_menu_cursor_pos: ${value.expectedMenuCursorPos},
    },`;
}

function renderCursorRedrawCase(value) {
  return `    FactoryDraftCursorRedrawVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        state: ${rustCursorRedraw(value.state)},
        expected: ${rustCursorRedraw(value.expected)},
    },`;
}

function renderMenuHighlightRedrawCase(value) {
  return `    FactoryDraftMenuHighlightRedrawVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        state: ${rustMenuHighlightRedraw(value.state)},
        expected: ${rustMenuHighlightRedraw(value.expected)},
    },`;
}

function renderRentConfirmRedrawCase(value) {
  return `    FactoryDraftRentConfirmRedrawVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        state: ${rustRentConfirmRedraw(value.state)},
        expected: ${rustRentConfirmRedraw(value.expected)},
    },`;
}

function renderChosenSpeciesCase(value) {
  return `    FactoryDraftChosenSpeciesVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        selected_ids: ${rustProjectionSelectedIds(value.selectedIds)},
        expected_species: &[${value.expectedSpecies.map(rustString).join(", ")}],
        branches: ${rustBranches(value.branches)},
    },`;
}

function renderSelectedRentalPartyCase(value) {
  return `    FactoryDraftSelectedRentalPartyVectorCase {
        label: ${rustString(value.label)},
        category: ${rustString(value.category)},
        selected_ids: ${rustProjectionSelectedIds(value.selectedIds)},
        expected: ${rustRentalExpected(value.expected)},
        branches: ${rustBranches(value.branches)},
    },`;
}

const projectionBranches = [...new Set([
  ...chosenSpeciesCases.flatMap((value) => value.branches),
  ...selectedRentalPartyCases.flatMap((value) => value.branches),
])].sort();
const expectedProjectionBranches = [
  "chosen-above-three-not-emitted",
  "chosen-later-duplicate-overwrite",
  "chosen-missing-rank-skip",
  "chosen-positive-write",
  "chosen-present-rank-emit",
  "chosen-zero-skip",
  "rental-complete-success",
  "rental-duplicate-rank-error",
  "rental-first-validation-error",
  "rental-invalid-rank-error",
  "rental-missing-ranks-error",
  "rental-valid-rank-store",
  "rental-zero-skip",
];
assert(
  JSON.stringify(projectionBranches) === JSON.stringify(expectedProjectionBranches),
  `projection branch coverage drifted: ${projectionBranches.join(", ")}`,
);

const categoryLines = [...categoryCounts]
  .map(([category, count]) => `    (${rustString(category)}, ${count}),`)
  .join("\n");

const rust = `// GENERATED by core-rs/tools/gen-factory-draft-selection-vectors.mjs.
// Expected values come only from executing src/engine/factoryDraftScreen.ts.
// Regenerate: node --experimental-strip-types core-rs/tools/gen-factory-draft-selection-vectors.mjs
// Deterministic bounded controller-domain corpus; do not hand-edit.

use crate::factory_draft_selection::{
    FactoryDraftCursorRedrawState, FactoryDraftDirection, FactoryDraftMenuHighlightRedrawState,
    FactoryDraftRentConfirmRedrawState, FactoryDraftSelectionChange,
};

/// Stored-cell bounds exercised by this canonical helper corpus.
pub const FACTORY_DRAFT_SELECTION_VECTOR_DOMAIN: &str =
    "six selectedIds cells 0..=3 for controller helpers and 0..=255 for projections; slots 0..=5; menu rows 0..=2; selectingMonsState 1..=4; elapsed only through each controller settle tick";

/// Complete semantic branch census for the two M10b projections.
pub static FACTORY_DRAFT_PROJECTION_BRANCHES: [&str; ${projectionBranches.length}] = [
${projectionBranches.map((branch) => `    ${rustString(branch)},`).join("\n")}
];

/// Synthetic generic source record used only by the differential corpus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FactoryDraftVectorSourceRecord {
    pub record_id: u32,
    pub boundary_value: u32,
    pub optional_value: Option<u32>,
    pub marker: &'static str,
}

pub static FACTORY_DRAFT_VECTOR_SOURCE_RECORDS: [FactoryDraftVectorSourceRecord; 6] = [
${RENTAL_SOURCES.map((record) => `    ${rustSourceRecord(record)},`).join("\n")}
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryDraftRentalVectorExpected {
    Ok([FactoryDraftVectorSourceRecord; 3]),
    Err(&'static str),
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftChosenSpeciesVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub selected_ids: [u8; 6],
    pub expected_species: &'static [&'static str],
    pub branches: &'static [&'static str],
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftSelectedRentalPartyVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub selected_ids: [u8; 6],
    pub expected: FactoryDraftRentalVectorExpected,
    pub branches: &'static [&'static str],
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftSelectMonMessageVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub selecting_mons_state: u8,
    pub expected_message: &'static str,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftSelectionVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub selected_ids: [u8; 6],
    pub selecting_mons_state: u8,
    pub slot_index: u8,
    pub expected: FactoryDraftSelectionChange,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftConfirmationVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub selecting_mons_state: u8,
    pub expected_confirmed: bool,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftCursorMoveStallVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub entering_species: &'static str,
    pub expected_stalls: bool,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftMoveCursorVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub cursor_pos: u8,
    pub direction: FactoryDraftDirection,
    pub expected_cursor_pos: u8,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftMoveMenuCursorVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub menu_cursor_pos: u8,
    pub direction: FactoryDraftDirection,
    pub expected_menu_cursor_pos: u8,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftCursorRedrawVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub state: Option<FactoryDraftCursorRedrawState>,
    pub expected: Option<FactoryDraftCursorRedrawState>,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftMenuHighlightRedrawVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub state: Option<FactoryDraftMenuHighlightRedrawState>,
    pub expected: Option<FactoryDraftMenuHighlightRedrawState>,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryDraftRentConfirmRedrawVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub state: Option<FactoryDraftRentConfirmRedrawState<'static>>,
    pub expected: Option<FactoryDraftRentConfirmRedrawState<'static>>,
}

pub const FACTORY_DRAFT_SELECTION_VECTOR_CATEGORY_COUNTS: [(&str, usize); ${categoryCounts.size}] = [
${categoryLines}
];

pub const FACTORY_DRAFT_SELECTION_VECTOR_CASE_COUNT: usize = ${allCaseCount};

pub static FACTORY_DRAFT_SELECT_MON_MESSAGE_CASES: [FactoryDraftSelectMonMessageVectorCase; ${selectMonMessageCases.length}] = [
${selectMonMessageCases.map(renderSelectMonMessageCase).join("\n")}
];

pub static FACTORY_DRAFT_APPLY_SELECT_CASES: [FactoryDraftSelectionVectorCase; ${applySelectCases.length}] = [
${applySelectCases.map(renderSelectionCase).join("\n")}
];

pub static FACTORY_DRAFT_APPLY_DESELECT_CASES: [FactoryDraftSelectionVectorCase; ${applyDeselectCases.length}] = [
${applyDeselectCases.map(renderSelectionCase).join("\n")}
];

pub static FACTORY_DRAFT_CONFIRMATION_CASES: [FactoryDraftConfirmationVectorCase; ${confirmationCases.length}] = [
${confirmationCases.map(renderConfirmationCase).join("\n")}
];

pub static FACTORY_DRAFT_CURSOR_MOVE_STALL_CASES: [FactoryDraftCursorMoveStallVectorCase; ${cursorMoveStallCases.length}] = [
${cursorMoveStallCases.map(renderCursorMoveStallCase).join("\n")}
];

pub static FACTORY_DRAFT_MOVE_CURSOR_CASES: [FactoryDraftMoveCursorVectorCase; ${moveCursorCases.length}] = [
${moveCursorCases.map(renderMoveCursorCase).join("\n")}
];

pub static FACTORY_DRAFT_MOVE_MENU_CURSOR_CASES: [FactoryDraftMoveMenuCursorVectorCase; ${moveMenuCursorCases.length}] = [
${moveMenuCursorCases.map(renderMoveMenuCursorCase).join("\n")}
];

pub static FACTORY_DRAFT_CURSOR_REDRAW_CASES: [FactoryDraftCursorRedrawVectorCase; ${cursorRedrawCases.length}] = [
${cursorRedrawCases.map(renderCursorRedrawCase).join("\n")}
];

pub static FACTORY_DRAFT_MENU_HIGHLIGHT_REDRAW_CASES: [FactoryDraftMenuHighlightRedrawVectorCase; ${menuHighlightRedrawCases.length}] = [
${menuHighlightRedrawCases.map(renderMenuHighlightRedrawCase).join("\n")}
];

pub static FACTORY_DRAFT_RENT_CONFIRM_REDRAW_CASES: [FactoryDraftRentConfirmRedrawVectorCase; ${rentConfirmRedrawCases.length}] = [
${rentConfirmRedrawCases.map(renderRentConfirmRedrawCase).join("\n")}
];

pub static FACTORY_DRAFT_CHOSEN_SPECIES_CASES: [FactoryDraftChosenSpeciesVectorCase; ${chosenSpeciesCases.length}] = [
${chosenSpeciesCases.map(renderChosenSpeciesCase).join("\n")}
];

pub static FACTORY_DRAFT_SELECTED_RENTAL_PARTY_CASES: [FactoryDraftSelectedRentalPartyVectorCase; ${selectedRentalPartyCases.length}] = [
${selectedRentalPartyCases.map(renderSelectedRentalPartyCase).join("\n")}
];
`;

fs.writeFileSync(outPath, rust, "utf8");
const rustupBin = path.join(
  process.env.HOME ?? "",
  ".rustup",
  "toolchains",
  "stable-aarch64-apple-darwin",
  "bin",
);
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-factory-draft-selection-vectors: could not find rustfmt");
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-draft-selection-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-factory-draft-selection-vectors: ${allCaseCount} cases; ${[...categoryCounts]
    .map(([category, count]) => `${category}=${count}`)
    .join(", ")}`,
);
console.log(`gen-factory-draft-selection-vectors: sha256 ${digest}`);
