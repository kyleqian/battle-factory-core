import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const receipt = (): Json => JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/smog-staging-receipt.json"), "utf8")) as Json;
const verify = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifySmogStaging.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

describe("MOVE_SMOG legal bilateral Scene-ON staging checkpoint", () => {
  it("replays the deterministic source/staging verifier twice without an emulator or framebuffer fixture", () => {
    const first = verify();
    expect(verify()).toBe(first);
    expect(JSON.parse(first)).toEqual({
      schema: "smog-source-staging-verifier/v1", auditRunSha256: "06b37df68b6a10558808187ef95071b5cf5e723233a5d7e43488c4d943e8bf5f",
      runs: { "player-back": { outputSha256: "65089ba0d5a89d1f592c85a76f0637586d92ef8c4b941dbdf380146d3bf0ba50", rootObservations: 305 }, "opponent-front": { outputSha256: "38768410994637f10bf0d7b44608ef234253f35329ef4e8672b171a835b3fbb8", rootObservations: 305 } },
    });
  });

  it("keeps compact endpoint receipts unsupported while pinning real root, PP, legal outcome, and immutable benches", () => {
    const value = receipt();
    expect(value).toMatchObject({
      schema: "smog-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", move: "MOVE_SMOG", moveId: 123, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_SMOG", start: "0x082d01e5", endExclusive: "0x082d0260" } },
      factoryLegalSelection: { carrier: { setId: 149, name: "FRONTIER_MON_MAGBY", species: 240 }, partyBeforeInit: true },
      freshness: { exitCode: 2, sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py" },
      scope: { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false, entryHooksSkipped: false, noTimingOrLatchTransfer: true },
    });
    for (const [orientation, expected] of Object.entries({
      "player-back": { attacker: "player", target: "opponent", pp: [19, 20, 20, 20], battlers: [0, 1], finalHp: 141, status: "none" },
      "opponent-front": { attacker: "opponent", target: "player", pp: [20, 19, 20, 20], battlers: [1, 0], finalHp: 124, status: "poison" },
    })) {
      const run = value.runs[orientation];
      expect(run).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, sourceInitialized: true, customPartiesBuiltBeforeBattle: true, attacker: { side: expected.attacker, partyIndex: 0, species: 240, level: 50, moves: [123, 123, 123, 123] }, target: { side: expected.target, partyIndex: 0, species: 95, level: 50, initialHp: 142, maxHp: 142, finalHp: expected.finalHp }, root: { symbol: "Move_SMOG", start: "0x82d01e5", endExclusive: "0x82d0260", observations: 305, attackerBattler: expected.battlers[0], targetBattler: expected.battlers[1], moveResultFlags: 4, moveDamage: 1 }, romOutcome: { kind: "damaging-poison-hit", targetFinalPartyHp: expected.finalHp, targetFinalBattleHp: expected.finalHp, targetFinalStatus: expected.status, battleOutcome: 0 }, pp: { before: [20, 20, 20, 20], after: expected.pp, spent: 1 }, benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true }, transientFreeSetup: true });
    }
  });
});
