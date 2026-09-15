import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const receipt = (): Json => JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/signal-beam-staging-receipt.json"), "utf8")) as Json;
const verify = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifySignalBeamStaging.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

describe("MOVE_SIGNAL_BEAM legal bilateral Scene-ON staging checkpoint", () => {
  it("replays the deterministic source/staging verifier twice without an emulator or framebuffer fixture", () => {
    const first = verify();
    expect(verify()).toBe(first);
    expect(JSON.parse(first)).toEqual({
      schema: "signal-beam-source-staging-verifier/v1", auditRunSha256: "ae42e538e0b5ee4804052bad60cdaaba5570745a4c1d55d5baa44c664113a956",
      runs: { "player-back": { outputSha256: "b759a2d69780cf495b1c3243973812852cb147394531cdf2cd88eaa5de07859f", rootObservations: 145 }, "opponent-front": { outputSha256: "65cc805056f497797440a03dce2abf0d1eda3ae14a1e2f77a04c76b49aa254be", rootObservations: 144 } },
    });
  });

  it("keeps compact endpoints unsupported while pinning legal source-root execution, PP, outcomes, and benched records", () => {
    const value = receipt();
    expect(value).toMatchObject({
      schema: "signal-beam-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", move: "MOVE_SIGNAL_BEAM", moveId: 324, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_SIGNAL_BEAM", start: "0x082d0eb2", endExclusive: "0x082d0f9a" } },
      factoryLegalSelection: { carrier: { setId: 160, name: "FRONTIER_MON_ARIADOS", species: 168 }, sourceRoute: { challengeNum: 0, level50SetRange: [110, 199], trainerId: 50 }, partyBeforeInit: true },
      freshness: { exitCode: 2, sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py" },
      scope: { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false, entryHooksSkipped: false, noTimingOrLatchTransfer: true },
    });
    for (const [orientation, expected] of Object.entries({
      "player-back": { attacker: "player", target: "opponent", finalHp: 187, damage: 170, battlers: [0, 1], pp: [14, 15, 15, 15], observations: 145 },
      "opponent-front": { attacker: "opponent", target: "player", finalHp: 165, damage: 192, battlers: [1, 0], pp: [15, 15, 15, 14], observations: 144 },
    })) {
      const run = value.runs[orientation];
      expect(run).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, sourceInitialized: true, customPartiesBuiltBeforeBattle: true, attacker: { side: expected.attacker, partyIndex: 0, species: 168, level: 50, moves: [324, 324, 324, 324] }, target: { side: expected.target, partyIndex: 0, species: 113, level: 50, initialHp: 357, maxHp: 357, finalHp: expected.finalHp }, root: { symbol: "Move_SIGNAL_BEAM", start: "0x82d0eb2", endExclusive: "0x82d0f9a", observations: expected.observations, attackerBattler: expected.battlers[0], targetBattler: expected.battlers[1], moveResultFlags: 0, moveDamage: expected.damage }, romOutcome: { kind: "confuse-hit", targetFinalPartyHp: expected.finalHp, targetFinalBattleHp: expected.finalHp, targetFinalStatus: "none", battleOutcome: 0 }, pp: { before: [15, 15, 15, 15], after: expected.pp, spent: 1 }, benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true }, transientFreeSetup: true });
    }
  });
});
