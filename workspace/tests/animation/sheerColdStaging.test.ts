import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const receipt = (): Json => JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/sheer-cold-staging-receipt.json"), "utf8")) as Json;
const verify = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifySheerColdStaging.ts"], {
  cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
});

describe("MOVE_SHEER_COLD legal bilateral Scene-ON staging checkpoint", () => {
  it("replays the deterministic source/staging verifier twice without an emulator or framebuffer fixture", () => {
    const first = verify();
    expect(verify()).toBe(first);
    expect(JSON.parse(first)).toEqual({
      schema: "sheer-cold-source-staging-verifier/v1",
      auditRunSha256: "2b46feb7282451b0cdce29fa632997a672d642071978ea87b020270a2e8f28bf",
      runs: {
        "player-back": { outputSha256: "d504215ce14a860f175985997d20d9e9585bee66cf5085b1949393a539537b1e", rootObservations: 191 },
        "opponent-front": { outputSha256: "cc6a4bd5a1a4a004ab2083e98654a25a14f0aac151ebb59525646ca3506b40d3", rootObservations: 190 },
      },
    });
  });

  it("keeps both compact endpoint receipts unsupported while pinning stock-ROM root, OHKO, PP, and bench facts", () => {
    const value = receipt();
    expect(value).toMatchObject({
      schema: "sheer-cold-compact-staging-receipt/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_SHEER_COLD", moveId: 329, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_SHEER_COLD", start: "0x082d5242", endExclusive: "0x082d5267" } },
      factoryLegalSelection: {
        carrier: { setId: 584, name: "FRONTIER_MON_DEWGONG_3", species: 87 },
        sourceRoute: { challengeNum: 5, level50SetRange: [564, 659], trainerId: 160, regularTrainerRange: [160, 199] },
        partyBeforeInit: true,
      },
      scope: {
        framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false,
        latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false,
        compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [],
        battleStateInjected: false, entryHooksSkipped: false, noTimingOrLatchTransfer: true,
      },
    });
    for (const [orientation, expected] of Object.entries({
      "player-back": { attacker: "player", target: "opponent", seed: 305420003, pp: [4, 5, 5, 5], battlers: [0, 1], observations: 191 },
      "opponent-front": { attacker: "opponent", target: "player", seed: 305420008, pp: [5, 4, 5, 5], battlers: [1, 0], observations: 190 },
    })) {
      const run = value.runs[orientation];
      expect(run).toMatchObject({
        seed: expected.seed, freshRuns: 2, outputsByteIdentical: true, sourceInitialized: true, customPartiesBuiltBeforeBattle: true,
        attacker: { side: expected.attacker, partyIndex: 0, species: 87, level: 50, moves: [329, 329, 329, 329] },
        target: { side: expected.target, partyIndex: 0, species: 113, level: 50, initialHp: 357, maxHp: 357 },
        root: { symbol: "Move_SHEER_COLD", start: "0x82d5242", endExclusive: "0x82d5267", observations: expected.observations, attackerBattler: expected.battlers[0], targetBattler: expected.battlers[1] },
        romOutcome: { kind: "one-hit-ko", moveResultFlags: 16, missedBit: 1, oneHitKoBit: 16, targetFinalPartyHp: 0, targetFinalBattleHp: 0, battleOutcome: 0 },
        pp: { before: [5, 5, 5, 5], after: expected.pp, spent: 1 },
        benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true }, transientFreeSetup: true,
      });
    }
  });
});
