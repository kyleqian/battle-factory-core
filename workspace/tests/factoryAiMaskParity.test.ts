// Differential spec for core-rs/adapter/factoryAiEngine.ts's
// selectFactoryAiMask surface: proves the TS engine
// (src/engine/factoryAiMaskSelection.ts) and the factory-wasm engine
// (fw_select_factory_ai_mask) agree on the Battle Factory AI mask-selection
// policy for identical inputs — not just that either one individually
// looks right.
//
// Structure mirrors tests/damageCalcParity.test.ts:
//   Part A — spec-conformance: the RAM-pinned regression cases from
//     tests/factoryAiMaskSelection.test.ts (read, not edited), run against
//     whichever engine POKEBENCH_ENGINE selects (defaultEngineId()) — so
//     this same block proves both "TS mode reproduces the pinned fixtures"
//     (the default invocation) and "wasm mode reproduces the pinned
//     fixtures" (the POKEBENCH_ENGINE=wasm invocation).
//   Part B — ABI pin: fw_abi_version() === 1 through the loader.
//   Part C — differential sweeps: TS is the expected value, wasm must
//     equal it exactly (skipped when the wasm artifact is absent and no
//     opt-in was requested), plus directed cases for all four
//     FactoryAiMaskError sites compared symmetrically (same message on
//     both engines, the tests/factoryPartyMemberParity.test.ts precedent).
//
// Availability rules mirror tests/rngEngineParity.test.ts: POKEBENCH_ENGINE=wasm
// with the artifact missing is a hard failure; the artifact merely being
// absent (no opt-in) skips only the wasm-dependent Part C suites.
//
// Invocations (from the workspace root):
//   ./core-rs/build-wasm.sh
//   NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryAiMaskParity.test.ts --no-watch --pool=forks
//   POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryAiMaskParity.test.ts --no-watch --pool=forks

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultEngineId, resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";
import { tsFactoryAiEngine, wasmFactoryAiEngine, type FactoryAiEngine } from "../core-rs/adapter/factoryAiEngine.ts";
import {
  FACTORY_BATTLE_MODE_DOUBLES,
  FACTORY_BATTLE_MODE_SINGLES,
  FACTORY_LEVEL_MODE_50,
  FACTORY_LEVEL_MODE_OPEN,
  FACTORY_LEVEL_MODE_TENT,
  TRAINER_FRONTIER_BRAIN,
  type FactoryAiMaskSelectionInput,
} from "../src/engine/factoryAiMaskSelection.ts";

const requestedEngine = defaultEngineId();
const wasmArtifactPath = resolveWasmArtifactPath();
const wasmAvailable = existsSync(wasmArtifactPath);

if (requestedEngine === "wasm" && !wasmAvailable) {
  throw new Error(
    `POKEBENCH_ENGINE=wasm requires the factory-wasm artifact at ${wasmArtifactPath}, ` +
      `which does not exist. Build it with: core-rs/build-wasm.sh`,
  );
}

let currentEnginePromise: Promise<FactoryAiEngine> | undefined;
function getCurrentEngine(): Promise<FactoryAiEngine> {
  currentEnginePromise ??= requestedEngine === "wasm"
    ? wasmFactoryAiEngine()
    : Promise.resolve(tsFactoryAiEngine());
  return currentEnginePromise;
}

let wasmEnginePromise: Promise<FactoryAiEngine> | undefined;
function getWasmEngine(): Promise<FactoryAiEngine> {
  wasmEnginePromise ??= wasmFactoryAiEngine();
  return wasmEnginePromise;
}

const ts: FactoryAiEngine = tsFactoryAiEngine();
const ORDINARY_TRAINER = 299;

function input(changes: Partial<FactoryAiMaskSelectionInput> = {}): FactoryAiMaskSelectionInput {
  return {
    levelMode: FACTORY_LEVEL_MODE_50,
    battleMode: FACTORY_BATTLE_MODE_SINGLES,
    factoryWinStreak: 0,
    trainerOpponentId: ORDINARY_TRAINER,
    ...changes,
  };
}

// === Part A: spec-conformance — RAM-pinned regression cases, mirroring ====
// tests/factoryAiMaskSelection.test.ts exactly, run against the selected engine.

describe("selectFactoryAiMask - RAM-pinned regression cases, parameterized over the selected engine", () => {
  it("gives Tent precedence over the Frontier Brain and does not calculate an indexed challenge", async () => {
    const engine = await getCurrentEngine();
    const result = engine.selectFactoryAiMask(
      input({ levelMode: FACTORY_LEVEL_MODE_TENT, factoryWinStreak: 0xffff, trainerOpponentId: TRAINER_FRONTIER_BRAIN }),
    );
    expect(result).toMatchObject({
      mask: 0,
      receipt: {
        challengeNumber: null,
        inputs: { isFrontierBrain: true },
        branch: { order: 0, id: "tent", condition: "lvlMode == FRONTIER_LVL_TENT", mask: 0, flags: [] },
        evaluations: [{ order: 0, id: "tent", matched: true }],
      },
    });
  });

  it("gives the Frontier Brain precedence over every ordinary challenge band", async () => {
    const engine = await getCurrentEngine();
    for (const factoryWinStreak of [0, 7, 14, 21, 28, 0xffff]) {
      const result = engine.selectFactoryAiMask(input({ factoryWinStreak, trainerOpponentId: TRAINER_FRONTIER_BRAIN }));
      expect(result.mask, `streak=${factoryWinStreak}`).toBe(7);
      expect(result.receipt.branch.id, `streak=${factoryWinStreak}`).toBe("frontierBrain");
      expect(result.receipt.evaluations, `streak=${factoryWinStreak}`).toEqual([
        { order: 0, id: "tent", matched: false },
        { order: 1, id: "frontierBrain", matched: true },
      ]);
    }
  });

  const CHALLENGE_CASES = [
    { challenge: 0, streak: 0, mask: 0, branch: "challengeBelow2" },
    { challenge: 0, streak: 6, mask: 0, branch: "challengeBelow2" },
    { challenge: 1, streak: 7, mask: 0, branch: "challengeBelow2" },
    { challenge: 1, streak: 13, mask: 0, branch: "challengeBelow2" },
    { challenge: 2, streak: 14, mask: 1, branch: "challengeBelow4" },
    { challenge: 2, streak: 20, mask: 1, branch: "challengeBelow4" },
    { challenge: 3, streak: 21, mask: 1, branch: "challengeBelow4" },
    { challenge: 3, streak: 27, mask: 1, branch: "challengeBelow4" },
    { challenge: 4, streak: 28, mask: 7, branch: "challengeAtLeast4" },
    { challenge: 9362, streak: 0xffff, mask: 7, branch: "challengeAtLeast4" },
  ] as const;

  it("maps streak to ordinary challenge and mask across the whole band table", async () => {
    const engine = await getCurrentEngine();
    for (const { challenge, streak, mask, branch } of CHALLENGE_CASES) {
      const result = engine.selectFactoryAiMask(input({ factoryWinStreak: streak }));
      expect(result.mask, `streak=${streak}`).toBe(mask);
      expect(result.receipt.challengeNumber, `streak=${streak}`).toBe(challenge);
      expect(result.receipt.branch.id, `streak=${streak}`).toBe(branch);
      expect(result.receipt.frontierStagesPerChallenge, `streak=${streak}`).toBe(7);
    }
  });

  it("returns generated branch metadata after evaluating all five source branches in order", async () => {
    const engine = await getCurrentEngine();
    const result = engine.selectFactoryAiMask(input({ factoryWinStreak: 28 }));
    expect(result.receipt.evaluations).toEqual([
      { order: 0, id: "tent", matched: false },
      { order: 1, id: "frontierBrain", matched: false },
      { order: 2, id: "challengeBelow2", matched: false },
      { order: 3, id: "challengeBelow4", matched: false },
      { order: 4, id: "challengeAtLeast4", matched: true },
    ]);
    expect(result.receipt.branch).toMatchObject({
      order: 4,
      id: "challengeAtLeast4",
      condition: "else",
      flags: ["AI_SCRIPT_CHECK_BAD_MOVE", "AI_SCRIPT_TRY_TO_FAINT", "AI_SCRIPT_CHECK_VIABILITY"],
      mask: 7,
    });
    expect(engine.selectFactoryAiMask(input({ factoryWinStreak: 14 })).receipt.branch.flags).toEqual([
      "AI_SCRIPT_CHECK_BAD_MOVE",
    ]);
  });

  it("uses the same source bands in level mode 50 and Open", async () => {
    const engine = await getCurrentEngine();
    for (const levelMode of [FACTORY_LEVEL_MODE_50, FACTORY_LEVEL_MODE_OPEN] as const) {
      expect(engine.selectFactoryAiMask(input({ levelMode, factoryWinStreak: 0 })).mask).toBe(0);
      expect(engine.selectFactoryAiMask(input({ levelMode, factoryWinStreak: 14 })).mask).toBe(1);
      expect(engine.selectFactoryAiMask(input({ levelMode, factoryWinStreak: 28 })).mask).toBe(7);
    }
  });

  it("accepts both battle-mode indexes without using ambient streak state", async () => {
    const engine = await getCurrentEngine();
    for (const battleMode of [FACTORY_BATTLE_MODE_SINGLES, FACTORY_BATTLE_MODE_DOUBLES] as const) {
      const result = engine.selectFactoryAiMask(input({ battleMode, factoryWinStreak: 14 }));
      expect(result.mask).toBe(1);
      expect(result.receipt.inputs.battleMode).toBe(battleMode);
    }
  });
});

// === Part B: ABI pin =========================================================

describe.skipIf(!wasmAvailable)("factory-wasm ABI pin", () => {
  it("fw_abi_version() === 1 through the loader", async () => {
    const exports = await loadFactoryWasm();
    expect(exports.fw_abi_version()).toBe(1);
  });
});

// === Part C: differential sweeps — TS is the expected value, wasm must ====
// equal it exactly on every case, plus symmetric error-site parity.

describe.skipIf(!wasmAvailable)("selectFactoryAiMask differential sweeps — ts vs wasm", () => {
  it("full axis sweep: level mode x battle mode x streak x trainer id", async () => {
    const wasm = await getWasmEngine();
    const STREAKS = [0, 1, 6, 7, 13, 14, 20, 21, 27, 28, 100, 0xffff];
    const TRAINERS = [ORDINARY_TRAINER, TRAINER_FRONTIER_BRAIN, 0, 0xffff];
    let cursor = 0;
    for (const levelMode of [FACTORY_LEVEL_MODE_50, FACTORY_LEVEL_MODE_OPEN, FACTORY_LEVEL_MODE_TENT] as const) {
      for (const battleMode of [FACTORY_BATTLE_MODE_SINGLES, FACTORY_BATTLE_MODE_DOUBLES] as const) {
        for (const factoryWinStreak of STREAKS) {
          for (const trainerOpponentId of TRAINERS) {
            const i = input({ levelMode, battleMode, factoryWinStreak, trainerOpponentId });
            const expected = ts.selectFactoryAiMask(i);
            const actual = wasm.selectFactoryAiMask(i);
            expect(actual, `[${cursor}] ${JSON.stringify(i)}`).toEqual(expected);
            cursor++;
          }
        }
      }
    }
  });

  it.each([
    { field: "levelMode", value: 3 },
    { field: "levelMode", value: 255 },
    { field: "battleMode", value: 2 },
    { field: "battleMode", value: 255 },
    { field: "factoryWinStreak", value: 0x1_0000 },
    { field: "factoryWinStreak", value: 0xffff_ffff },
    { field: "trainerOpponentId", value: 0x1_0000 },
    { field: "trainerOpponentId", value: 0xffff_ffff },
  ] as const)("error site parity: $field=$value rejects on both engines with the same message", async ({ field, value }) => {
    const wasm = await getWasmEngine();
    const i = input({ [field]: value } as Partial<FactoryAiMaskSelectionInput>);
    let message: string | undefined;
    try {
      ts.selectFactoryAiMask(i);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message, `${field}=${value} must reject on ts`).toBeDefined();
    expect(() => ts.selectFactoryAiMask(i)).toThrow(message);
    expect(() => wasm.selectFactoryAiMask(i)).toThrow(message);
  });

  it("error site parity: the first offending field wins when several are simultaneously invalid", async () => {
    const wasm = await getWasmEngine();
    const cases: Partial<FactoryAiMaskSelectionInput>[] = [
      { levelMode: 3, battleMode: 2, factoryWinStreak: 0x1_0000, trainerOpponentId: 0x1_0000 },
      { levelMode: 0, battleMode: 2, factoryWinStreak: 0x1_0000, trainerOpponentId: 0x1_0000 },
      { levelMode: 0, battleMode: 0, factoryWinStreak: 0x1_0000, trainerOpponentId: 0x1_0000 },
    ];
    for (const changes of cases) {
      const i = input(changes);
      let message: string | undefined;
      try {
        ts.selectFactoryAiMask(i);
      } catch (err) {
        message = (err as Error).message;
      }
      expect(() => wasm.selectFactoryAiMask(i)).toThrow(message);
    }
  });
});
