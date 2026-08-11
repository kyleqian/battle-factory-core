// Differential spec for core-rs/adapter/rngEngine.ts: proves the TS engine
// and the factory-wasm engine agree on the RNG numeric contract, not just
// that each individually looks right.
//
// Engine selection: POKEBENCH_ENGINE opts into the wasm engine (see
// defaultEngineId in ../core-rs/adapter/rngEngine.ts); unset/"ts" is the
// default and never requires the wasm artifact. That default keeps this
// file green in every worktree, including ones that haven't run
// core-rs/build-wasm.sh.
//
// Availability rules:
//   - POKEBENCH_ENGINE=wasm with the artifact missing is a hard failure —
//     the caller asked for wasm and can't get it, so silently skipping
//     would hide a real gap. See the throw below.
//   - The artifact being merely absent (no opt-in) skips only the
//     wasm-dependent suites via describe.skipIf; the TS half always runs.
//
// Invocations (from the workspace root):
//   ./core-rs/build-wasm.sh
//   NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/rngEngineParity.test.ts --no-watch --pool=forks
//   POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/rngEngineParity.test.ts --no-watch --pool=forks

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  defaultEngineId,
  resolveWasmArtifactPath,
  tsRngEngine,
  wasmRngEngine,
  type RngEngine,
  type RngEngineId,
} from "../core-rs/adapter/rngEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";

const requestedEngine = defaultEngineId();
const wasmArtifactPath = resolveWasmArtifactPath();
const wasmAvailable = existsSync(wasmArtifactPath);

if (requestedEngine === "wasm" && !wasmAvailable) {
  throw new Error(
    `POKEBENCH_ENGINE=wasm requires the factory-wasm artifact at ${wasmArtifactPath}, ` +
      `which does not exist. Build it with: core-rs/build-wasm.sh`,
  );
}

// Memoized per engine id so the wasm module is instantiated once for the
// whole file rather than once per test/seed.
const engineCache = new Map<RngEngineId, Promise<RngEngine>>();
function getEngine(id: RngEngineId): Promise<RngEngine> {
  let cached = engineCache.get(id);
  if (!cached) {
    cached = Promise.resolve(id === "ts" ? tsRngEngine() : wasmRngEngine());
    engineCache.set(id, cached);
  }
  return cached;
}

// --- Part A: spec conformance, parameterized over both engines ------------
//
// Pinned values sourced from tests/rng.test.ts (read, not imported — this
// file stays a black-box differential spec over the adapter's numeric
// contract, independent of the TS module it wraps):
//   - advanceRngValue(0xd2ddeec8) === 0xddeffb9b, advanceRngValue(0xddeffb9b) === 0x92b9bb72
//   - GbaRng.next()'s u16 output is the advanced value's upper 16 bits
//   - a 50-step stream via next() agrees with 50 repeated advanceRngValue calls
//   - advanceRngValue(0xffffffff) === 0xbe3a1206 (wrap case)

function defineSpecConformanceTests(engineId: RngEngineId): void {
  it("advances the anchor seed through the RAM-verified chain 0xd2ddeec8 -> 0xddeffb9b -> 0x92b9bb72", async () => {
    const engine = await getEngine(engineId);
    const first = engine.advanceRngValue(0xd2ddeec8) >>> 0;
    expect(first).toBe(0xddeffb9b);
    const second = engine.advanceRngValue(first) >>> 0;
    expect(second).toBe(0x92b9bb72);
  });

  it("wraps modulo 2^32 without producing negative or fractional values: advanceRngValue(0xffffffff) === 0xbe3a1206", async () => {
    const engine = await getEngine(engineId);
    const next = engine.advanceRngValue(0xffffffff) >>> 0;
    expect(Number.isInteger(next)).toBe(true);
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThanOrEqual(0xffffffff);
    expect(next).toBe(0xbe3a1206);
  });

  it("randomU16's u16 output equals the advanced rngValue's upper 16 bits", async () => {
    const engine = await getEngine(engineId);
    const result = engine.randomU16(0xd2ddeec8);
    expect(result.rngValue >>> 0).toBe(0xddeffb9b);
    expect(result.value).toBe(0xddef);
  });

  it("agrees with repeated advanceRngValue calls over a 50-step stream from the anchor seed", async () => {
    const engine = await getEngine(engineId);
    let expectedCursor = 0xd2ddeec8;
    let cursor = 0xd2ddeec8;
    for (let step = 0; step < 50; step++) {
      expectedCursor = engine.advanceRngValue(expectedCursor) >>> 0;
      const result = engine.randomU16(cursor);
      expect(result.rngValue >>> 0, `${engineId} step ${step}: rngValue cursor mismatch`).toBe(expectedCursor);
      expect(result.value, `${engineId} step ${step}: u16 output mismatch`).toBe((expectedCursor >>> 16) & 0xffff);
      cursor = result.rngValue;
    }
  });
}

describe("Part A — spec conformance — ts engine", () => {
  defineSpecConformanceTests("ts");
});

describe.skipIf(!wasmAvailable)("Part A — spec conformance — wasm engine", () => {
  defineSpecConformanceTests("wasm");
});

// --- Part B: differential sweep, ts vs wasm --------------------------------
//
// 64 deterministic seeds: 5 fixed boundary/anchor values plus 59 more
// generated by iterating the TS engine's advanceRngValue from the anchor
// seed (no Date/Math.random — this file must be fully deterministic).
const SEED_LIST: number[] = (() => {
  const seeds = [0x00000000, 0xffffffff, 0x7fffffff, 0x80000000, 0xd2ddeec8];
  const ts = tsRngEngine();
  let cursor = 0xd2ddeec8;
  while (seeds.length < 64) {
    cursor = ts.advanceRngValue(cursor) >>> 0;
    seeds.push(cursor);
  }
  return seeds;
})();

const DIFFERENTIAL_STEPS = 1024;

describe.skipIf(!wasmAvailable)("Part B — differential sweep — ts vs wasm", () => {
  SEED_LIST.forEach((seed, seedIndex) => {
    const seedHex = `0x${(seed >>> 0).toString(16).padStart(8, "0")}`;

    it(`seed[${seedIndex}]=${seedHex}: identical ${DIFFERENTIAL_STEPS}-step cursor and u16 streams on ts and wasm`, async () => {
      const ts = await getEngine("ts");
      const wasm = await getEngine("wasm");

      let tsCursor = seed >>> 0;
      let wasmCursor = seed >>> 0;
      for (let step = 0; step < DIFFERENTIAL_STEPS; step++) {
        const tsStep = ts.randomU16(tsCursor);
        const wasmStep = wasm.randomU16(wasmCursor);
        expect(
          wasmStep.rngValue >>> 0,
          `seed=${seedHex} (index ${seedIndex}) step=${step}: cursor mismatch (ts=0x${(tsStep.rngValue >>> 0).toString(16)}, wasm=0x${(wasmStep.rngValue >>> 0).toString(16)})`,
        ).toBe(tsStep.rngValue >>> 0);
        expect(
          wasmStep.value,
          `seed=${seedHex} (index ${seedIndex}) step=${step}: u16 output mismatch (ts=0x${tsStep.value.toString(16)}, wasm=0x${wasmStep.value.toString(16)})`,
        ).toBe(tsStep.value);
        tsCursor = tsStep.rngValue;
        wasmCursor = wasmStep.rngValue;
      }
    });
  });
});

// --- Part C: ABI version through the loader --------------------------------

describe.skipIf(!wasmAvailable)("Part C — wasm ABI", () => {
  it("fw_abi_version() === 1 through the loader", async () => {
    const exports = await loadFactoryWasm();
    expect(exports.fw_abi_version() >>> 0).toBe(1);
  });
});
