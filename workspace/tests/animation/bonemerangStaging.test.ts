import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const receipt = (): Json => JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/bonemerang-staging-receipt.json"), "utf8")) as Json;
const verify = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifyBonemerangStaging.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

describe("MOVE_BONEMERANG legal bilateral Scene-ON staging checkpoint", () => {
  it("replays the deterministic source/staging verifier twice without an emulator or framebuffer fixture", () => {
    const first = verify();
    expect(verify()).toBe(first);
    expect(JSON.parse(first)).toEqual({
      schema: "bonemerang-source-staging-verifier/v1", auditRunSha256: "3d051550d121ee6729d7bbd5075ab5a111c625cb82f486f4104be647d003fc1f",
      runs: { "player-back": { outputSha256: "abc9bf3f271d37ef9bd47dd7feca33e5b98d17be14f6973857e853d4ba793b40", rootObservations: 142 }, "opponent-front": { outputSha256: "a2c4a9de20cf4d4dc668cf247f1619ea78c9d9bbca7552959651120a559a50de", rootObservations: 142 } },
    });
  });

  it("keeps compact endpoint receipts unsupported while pinning legal source-root execution, PP, outcomes, and benches", () => {
    const value = receipt();
    expect(value).toMatchObject({
      schema: "bonemerang-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", move: "MOVE_BONEMERANG", moveId: 155, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_BONEMERANG", start: "0x082d17cc", endExclusive: "0x082d1820" } },
      factoryLegalSelection: { carrier: { setId: 387, name: "FRONTIER_MON_MAROWAK_1", species: 105 }, sourceRoute: { challengeNum: 3, level50SetRange: [372, 467], trainerId: 140 }, partyBeforeInit: true },
      freshness: { exitCode: 2, sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py" },
      scope: { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false, entryHooksSkipped: false, noTimingOrLatchTransfer: true },
    });
    for (const [orientation, expected] of Object.entries({
      "player-back": { attacker: "player", target: "opponent", finalHp: 14, damage: 164, battlers: [0, 1], pp: [9, 10, 10, 10] },
      "opponent-front": { attacker: "opponent", target: "player", finalHp: 3, damage: 183, battlers: [1, 0], pp: [9, 10, 10, 10] },
    })) {
      const run = value.runs[orientation];
      expect(run).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, sourceInitialized: true, customPartiesBuiltBeforeBattle: true, attacker: { side: expected.attacker, partyIndex: 0, species: 105, level: 50, moves: [155, 155, 155, 155] }, target: { side: expected.target, partyIndex: 0, species: 113, level: 50, initialHp: 357, maxHp: 357, finalHp: expected.finalHp }, root: { symbol: "Move_BONEMERANG", start: "0x82d17cc", endExclusive: "0x82d1820", observations: 142, attackerBattler: expected.battlers[0], targetBattler: expected.battlers[1], moveResultFlags: 0, moveDamage: expected.damage }, romOutcome: { kind: "double-hit", targetFinalPartyHp: expected.finalHp, targetFinalBattleHp: expected.finalHp, targetFinalStatus: "none", battleOutcome: 0 }, pp: { before: [10, 10, 10, 10], after: expected.pp, spent: 1 }, benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true }, transientFreeSetup: true });
    }
  });
});
