import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  encodeFactorySwapOperation,
  factorySwapEngine,
  tsFactorySwapEngine,
  type FactorySwapOperation,
} from "../core-rs/adapter/factorySwapEngine.ts";
import { loadFactoryWasm, type FactoryWasmExports } from "../core-rs/adapter/loadFactoryWasm.ts";
import type {
  FactoryRentalRoster,
  FactorySwapInput,
  FactorySwapMon,
  FactorySwapParty,
  FactorySwapPhase,
  FactorySwapState,
} from "../src/engine/factorySwap.ts";
import { resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";

const PHASES: readonly FactorySwapPhase[] = [
  "playerPicker", "playerOptions", "summaryFade", "summaryReturn", "playerPickerReturn",
  "enemySwitch", "playerSwitch", "enemyPicker", "acceptPrompt", "acceptReturn", "acceptExit",
  "quitPrompt", "quitReturn", "quitExit", "duplicateSpecies", "duplicateReturn", "complete",
];
const INPUTS: readonly FactorySwapInput[] = ["LEFT", "RIGHT", "UP", "DOWN", "A", "B"];
const MAX_U32 = 0xffff_ffff;

function mon(id: string, species: string, index: number): FactorySwapMon {
  return {
    id,
    species,
    maxHp: index === 0 ? MAX_U32 : 100 + index,
    hp: index === 0 ? MAX_U32 : 50 + index,
    status: (["none", "sleep", "poison", "burn", "freeze", "paralysis", "toxic"] as const)[index % 7]!,
    personality: index === 0 ? MAX_U32 : 0x0102_0304 + index,
    abilityNum: index & 1,
    friendship: index === 0 ? 0xff : 60 + index,
  };
}

function party(prefix: string): FactorySwapParty {
  const statusIndexes = prefix === "enemy" ? [3, 4, 5] : prefix === "other" ? [6, 1, 2] : [0, 1, 2];
  return [
    mon(`${prefix}-α`, `${prefix}-空`, statusIndexes[0]!),
    mon("", "", statusIndexes[1]!),
    mon(`${prefix}-${"long".repeat(80)}`, `${prefix}-species-${"Ω".repeat(80)}`, statusIndexes[2]!),
  ] as unknown as FactorySwapParty;
}

function rentals(): FactoryRentalRoster {
  return Array.from({ length: 6 }, (_, index) => ({
    monId: index === 0 ? MAX_U32 : 100 + index,
    personality: index === 0 ? MAX_U32 : 0x2000_0000 + index,
    ivs: index === 0 ? MAX_U32 : index,
    abilityNum: index & 1,
  })) as unknown as FactoryRentalRoster;
}

function state(overrides: Partial<FactorySwapState> = {}): FactorySwapState {
  return {
    phase: "enemyPicker",
    playerParty: party("player"),
    enemyParty: party("enemy"),
    rentalMons: rentals(),
    cursor: 0,
    infoCursor: 1,
    displayCursor: 2,
    arrowCursor: 3,
    cursorCopyPending: true,
    actionsCount: 5,
    playerOptionCursor: 2,
    playerOptionDisplayCursor: 1,
    playerOptionCursorCopyPending: true,
    yesNoCursor: 1,
    playerMonId: 1,
    enemyMonId: 2,
    quitReturnPhase: null,
    playerSwitchCompleted: true,
    inputReady: true,
    scriptResult: false,
    mutationCommitted: false,
    result: null,
    ...overrides,
  } as FactorySwapState;
}

function operationResult(engine: ReturnType<typeof tsFactorySwapEngine>, operation: FactorySwapOperation): unknown {
  try {
    switch (operation.kind) {
      case "create": return engine.createFactorySwapState(operation.playerParty, operation.enemyParty, operation.rentalMons);
      case "acknowledge": return engine.acknowledgeFactorySwapPresentation(operation.state);
      case "copy-cursor": return engine.copyFactorySwapCursor(operation.state);
      case "handle-input": return engine.handleFactorySwapInput(operation.state, operation.input);
      case "already-has-species": return operation.enemyMonId === undefined
        ? engine.factorySwapAlreadyHasSpecies(operation.state)
        : engine.factorySwapAlreadyHasSpecies(operation.state, operation.enemyMonId);
      case "apply-mutation": return engine.applyFactorySwapMutation(operation.state);
      case "commit-mutation": return engine.commitFactorySwapMutation(operation.state);
      case "round-decision": return engine.factorySwapRoundDecision(operation.state);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function makeCases(): FactorySwapOperation[] {
  const base = state();
  const cases: FactorySwapOperation[] = [
    { kind: "create", playerParty: base.playerParty, enemyParty: base.enemyParty, rentalMons: base.rentalMons },
  ];

  // Directly generated complete phase/input matrix: every source phase and
  // each of the six closed controller inputs, 102 full-state cases.
  for (const phase of PHASES) {
    for (const input of INPUTS) cases.push({ kind: "handle-input", state: state({ phase, inputReady: true }), input });
  }

  cases.push(
    { kind: "acknowledge", state: state({ inputReady: false }) },
    { kind: "acknowledge", state: state({ inputReady: true }) },
    { kind: "acknowledge", state: state({ phase: "complete", inputReady: false }) },
    { kind: "copy-cursor", state: state({ cursor: 4, infoCursor: 0, displayCursor: 1, arrowCursor: 2 }) },
    { kind: "copy-cursor", state: state({ cursorCopyPending: true, playerOptionCursorCopyPending: true }) },
    { kind: "copy-cursor", state: state({ cursor: 2, infoCursor: 2, displayCursor: 2, arrowCursor: 2, playerOptionCursor: 0, playerOptionDisplayCursor: 0 }) },
    { kind: "copy-cursor", state: state({ cursor: 3, displayCursor: 3, arrowCursor: 1 }) },
    { kind: "copy-cursor", state: state({ cursor: 0, infoCursor: 4, displayCursor: 4, arrowCursor: 4, cursorCopyPending: false }) },
    { kind: "copy-cursor", state: state({ playerOptionCursor: 2, playerOptionDisplayCursor: 1, playerOptionCursorCopyPending: false }) },
    { kind: "copy-cursor", state: state({ playerOptionCursor: 1, playerOptionDisplayCursor: 2, playerOptionCursorCopyPending: true }) },
    { kind: "copy-cursor", state: state({ cursor: 4, infoCursor: 4, displayCursor: 4, arrowCursor: 4, cursorCopyPending: true, playerOptionCursorCopyPending: true }) },
    { kind: "already-has-species", state: state({ playerMonId: null }) },
    { kind: "already-has-species", state: state({ playerMonId: 0, cursor: 0 }) },
    { kind: "already-has-species", state: state({ playerMonId: 0, cursor: 1 }) },
    { kind: "already-has-species", state: state({ playerMonId: 0, cursor: 2 }) },
    { kind: "already-has-species", state: state({ playerMonId: 2, cursor: 0 }), enemyMonId: 1 },
    { kind: "already-has-species", state: state({ playerMonId: 2, cursor: 1 }), enemyMonId: 0 },
    { kind: "already-has-species", state: state({ playerMonId: 2, cursor: 4 }), enemyMonId: 0 },
    { kind: "already-has-species", state: state({ playerMonId: 1, enemyParty: party("player") }), enemyMonId: 0 },
    { kind: "already-has-species", state: state({ playerMonId: 1, enemyParty: party("other") }), enemyMonId: 2 },
    { kind: "apply-mutation", state: state({ playerMonId: 0, enemyMonId: 0 }) },
    { kind: "apply-mutation", state: state({ playerMonId: 0, enemyMonId: 1 }) },
    { kind: "apply-mutation", state: state({ playerMonId: 0, enemyMonId: 2 }) },
    { kind: "apply-mutation", state: state({ playerMonId: 1, enemyMonId: 0 }) },
    { kind: "apply-mutation", state: state({ playerMonId: 1, enemyMonId: 1 }) },
    { kind: "apply-mutation", state: state({ playerMonId: 1, enemyMonId: 2 }) },
    { kind: "apply-mutation", state: state({ playerMonId: 2, enemyMonId: 0 }) },
    { kind: "apply-mutation", state: state({ playerMonId: 2, enemyMonId: 2 }) },
    { kind: "apply-mutation", state: state({ playerMonId: null, enemyMonId: 1 }) },
    { kind: "apply-mutation", state: state({ playerMonId: 1, enemyMonId: null }) },
    { kind: "commit-mutation", state: state({ playerMonId: 0, enemyMonId: 0 }) },
    { kind: "commit-mutation", state: state({ playerMonId: 1, enemyMonId: 1 }) },
    { kind: "commit-mutation", state: state({ playerMonId: 2, enemyMonId: 2 }) },
    { kind: "commit-mutation", state: state({ playerMonId: null, enemyMonId: 0 }) },
    { kind: "commit-mutation", state: state({ playerMonId: 0, enemyMonId: null }) },
    { kind: "commit-mutation", state: state({ playerMonId: null, enemyMonId: null }) },
    { kind: "commit-mutation", state: state({ playerMonId: 1, enemyMonId: 2, phase: "acceptExit" }) },
    { kind: "commit-mutation", state: state({ playerMonId: 2, enemyMonId: 1, phase: "acceptPrompt" }) },
    { kind: "round-decision", state: state({ mutationCommitted: false, result: null }) },
    { kind: "round-decision", state: state({ mutationCommitted: true, result: "accepted", playerMonId: 0, enemyMonId: 0 }) },
    { kind: "round-decision", state: state({ mutationCommitted: true, result: "accepted", playerMonId: 1, enemyMonId: 2 }) },
    { kind: "round-decision", state: state({ phase: "complete", result: "keptParty" }) },
    { kind: "round-decision", state: state({ phase: "complete", result: "accepted", mutationCommitted: true, playerMonId: 2, enemyMonId: 1 }) },
    { kind: "round-decision", state: state({ phase: "acceptExit", result: "accepted", mutationCommitted: true, playerMonId: null, enemyMonId: 1 }) },
    { kind: "round-decision", state: state({ phase: "acceptExit", result: "accepted", mutationCommitted: false, playerMonId: 0, enemyMonId: 0 }) },
    { kind: "round-decision", state: state({ phase: "complete", result: "keptParty", mutationCommitted: true, playerMonId: 2, enemyMonId: 2 }) },
    { kind: "round-decision", state: state({ phase: "acceptExit", result: "accepted", mutationCommitted: true, playerMonId: 2, enemyMonId: 2 }) },
  );

  // Additional reducer branch cases (24) plus two transition no-ops bring the
  // generated matrix to the checked-in corpus size of 176.
  cases.push(
    { kind: "handle-input", state: state({ phase: "playerPicker", cursor: 3 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "playerPicker", cursor: 3 }), input: "B" },
    { kind: "handle-input", state: state({ phase: "playerPicker", cursor: 2 }), input: "DOWN" },
    { kind: "handle-input", state: state({ phase: "enemyPicker", cursor: 3 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "enemyPicker", cursor: 4 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "enemyPicker", cursor: 4 }), input: "B" },
    { kind: "handle-input", state: state({ phase: "enemyPicker", cursor: 2 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "enemyPicker", cursor: 0, playerMonId: 0, enemyParty: party("player") }), input: "A" },
    { kind: "handle-input", state: state({ phase: "playerOptions", playerOptionCursor: 0 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "playerOptions", playerOptionCursor: 1 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "playerOptions", playerOptionCursor: 2 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "playerOptions" }), input: "B" },
    { kind: "handle-input", state: state({ phase: "playerOptions", playerOptionCursor: 0 }), input: "UP" },
    { kind: "handle-input", state: state({ phase: "playerOptions", playerOptionCursor: 2 }), input: "DOWN" },
    { kind: "handle-input", state: state({ phase: "acceptPrompt", yesNoCursor: 0 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "acceptPrompt", yesNoCursor: 1 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "acceptPrompt", yesNoCursor: 0 }), input: "B" },
    { kind: "handle-input", state: state({ phase: "acceptPrompt", yesNoCursor: 0 }), input: "UP" },
    { kind: "handle-input", state: state({ phase: "quitPrompt", yesNoCursor: 0 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "quitPrompt", yesNoCursor: 1 }), input: "A" },
    { kind: "handle-input", state: state({ phase: "quitPrompt", yesNoCursor: 0 }), input: "B" },
    { kind: "handle-input", state: state({ phase: "quitPrompt", yesNoCursor: 0 }), input: "UP" },
    { kind: "handle-input", state: state({ phase: "duplicateSpecies" }), input: "A" },
    { kind: "handle-input", state: state({ phase: "duplicateSpecies" }), input: "B" },
    { kind: "handle-input", state: state({ phase: "summaryFade" }), input: "A" },
    { kind: "handle-input", state: state({ phase: "quitReturn" }), input: "B" },
  );
  expect(cases).toHaveLength(176);
  return cases;
}

const CASES = makeCases();

async function rawBoundaryResult(wasm: FactoryWasmExports, packet: Uint8Array): Promise<Uint8Array> {
  const inputPtr = wasm.fw_alloc(packet.byteLength);
  let outputPtr = 0;
  try {
    new Uint8Array(wasm.memory.buffer, inputPtr, packet.byteLength).set(packet);
    outputPtr = wasm.fw_apply_factory_swap_operation(inputPtr, packet.byteLength);
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

describe("Factory swap adapter parity", () => {
  it("matches canonical TypeScript for all 176 generated cases", async () => {
    const canonical = tsFactorySwapEngine();
    const selected = await factorySwapEngine();
    const seenPhases = new Set<FactorySwapPhase>();
    const seenInputs = new Set<FactorySwapInput>();
    for (const operation of CASES) {
      if (operation.kind === "handle-input") {
        seenPhases.add(operation.state.phase);
        seenInputs.add(operation.input);
      }
      expect(operationResult(selected, operation), `${selected.id}:${operation.kind}`).toEqual(
        operationResult(canonical, operation),
      );
    }
    expect(seenPhases).toEqual(new Set(PHASES));
    expect(seenInputs).toEqual(new Set(INPUTS));
    expect(selected.id).toBe(process.env.POKEBENCH_ENGINE === "wasm" ? "wasm" : "ts");
  });
});

const wasmAvailable = existsSync(resolveWasmArtifactPath());
const wasmRequired = process.env.POKEBENCH_ENGINE === "wasm";

describe.skipIf(!wasmAvailable && !wasmRequired)("Factory swap malformed packet barrier", () => {
  it("returns status 2 for every structural malformed class", async () => {
    const wasm = await loadFactoryWasm();
    const base = state();
    const create = encodeFactorySwapOperation({ kind: "create", playerParty: base.playerParty, enemyParty: base.enemyParty, rentalMons: base.rentalMons });
    const acknowledge = encodeFactorySwapOperation({ kind: "acknowledge", state: base });
    const handle = encodeFactorySwapOperation({ kind: "handle-input", state: base, input: "A" });
    const duplicate = encodeFactorySwapOperation({ kind: "already-has-species", state: base });

    const firstMonStatus = create.slice();
    let offset = 2 + 4 + u32(create, 2);
    offset += 4 + u32(create, offset) + 4 + 4;
    firstMonStatus[offset] = 0xff;
    const invalidPhase = acknowledge.slice(); invalidPhase[2] = 0xff;
    const invalidInput = handle.slice(); invalidInput[invalidInput.length - 1] = 0xff;
    const invalidCursor = encodeFactorySwapOperation({ kind: "acknowledge", state: state({ cursor: 5 as never }) });
    const invalidOption = encodeFactorySwapOperation({ kind: "acknowledge", state: state({ playerOptionCursor: 3 as never }) });
    const invalidPresence = duplicate.slice(); invalidPresence[invalidPresence.length - 1] = 2;
    const invalidUtf8 = create.slice(); invalidUtf8[6] = 0xff;
    const invalidLength = create.slice(); new DataView(invalidLength.buffer, invalidLength.byteOffset, invalidLength.byteLength).setUint32(2, MAX_U32, true);

    const malformed: Uint8Array[] = [
      new Uint8Array(), create.slice(0, create.length - 1), acknowledge.slice(0, 2),
      Uint8Array.from([...create, 0]), Uint8Array.from([...acknowledge, 0]),
      Uint8Array.of(1, 0xff), invalidPhase, firstMonStatus, invalidInput,
      invalidOption, invalidCursor, invalidPresence, invalidUtf8, invalidLength,
      Uint8Array.of(1, 0), handle.slice(0, handle.length - 1),
      Uint8Array.from([...duplicate, 0]),
    ];
    for (const packet of malformed) expect(status(await rawBoundaryResult(wasm, packet))).toBe(2);
  });

  it("keeps semantic errors distinct and proves forced calls use the export", async () => {
    const wasm = await loadFactoryWasm();
    const base = state({ playerMonId: null, enemyMonId: null });
    const apply = encodeFactorySwapOperation({ kind: "apply-mutation", state: base });
    const applyResult = await rawBoundaryResult(wasm, apply);
    expect(status(applyResult)).toBe(1);
    const duplicateState = state({ cursor: 4, playerMonId: 0 });
    const duplicate = encodeFactorySwapOperation({ kind: "already-has-species", state: duplicateState });
    const duplicateResult = await rawBoundaryResult(wasm, duplicate);
    expect(status(duplicateResult)).toBe(1);
    const duplicateMessageLength = u32(duplicateResult, 5);
    expect(new TextDecoder().decode(duplicateResult.slice(9, 9 + duplicateMessageLength))).toBe(
      "Factory swap enemy cursor 4 does not identify a party mon",
    );
    const selected = await factorySwapEngine();
    expect(selected.id).toBe(wasmRequired ? "wasm" : "ts");
    // This packet is structurally invalid before canonical semantic execution;
    // a TS fallback would throw its own TypeError rather than expose status 2.
    expect(status(await rawBoundaryResult(wasm, Uint8Array.of(1, 0xff)))).toBe(2);
  });
});
