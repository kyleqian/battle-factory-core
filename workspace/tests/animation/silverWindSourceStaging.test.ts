import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const json = (path: string): Json => JSON.parse(read(path)) as Json;
const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
const run = (path: string): string => execFileSync(process.execPath, ["--experimental-strip-types", path], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });

describe("MOVE_SILVER_WIND authoritative source classification and legal bilateral Scene-ON staging", () => {
  it("pins the complete pointer-owned root, direct task/callback/resource/audio/cleanup graph, and all Factory carriers", () => {
    const text = run("tools/compare/silverWindSourceAudit.ts");
    expect(run("tools/compare/silverWindSourceAudit.ts")).toBe(text);
    const audit = JSON.parse(text) as Json;
    expect(sha(text)).toBe("5e4ca54ba6f1db909f0a5f9c7df821879491a295c9c75c830d163889929d8d0d");
    expect(audit).toMatchObject({
      schema: "silver-wind-source-audit/v1", move: "MOVE_SILVER_WIND", moveId: 318, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_SILVER_WIND", nextDispatchLabel: "Move_SNATCH", blocks: ["Move_SILVER_WIND", "SilverWindOnPlayer", "SilverWindContinue"], rom: { start: "0x082d630b", endExclusive: "0x082d6523", byteLength: 536, romSha256: "0c814127f77e551907c127660aea24c6d26e3fc368f20d88cc967fda7de9a2ee" } } },
      resources: { tag: { name: "ANIM_TAG_SPARKLE_6", value: 271 }, audio: { SE_M_GUST: 132, SE_M_GUST2: 133, SE_M_MORNING_SUN: 228 } },
      carriers: { factoryCount: 12, level50Count: 11, excludedOutsideLevel50: [21], inventory: { frontierMonCount: 11, speciesCount: 9 } },
      checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directTaskCallbackResourceBodies: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, rawRgbRetained: false, latchMeasured: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, queueChanged: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
    });
    expect(audit.source.commands).toHaveLength(53);
    expect(audit.source.commandSummary).toMatchObject({ sparkSprites: { total: 18, big: 6, medium: 6, small: 6 }, backgrounds: ["BG_BUG_OPPONENT", "BG_BUG_PLAYER"] });
    expect(audit.source.commandSummary.taskCommands).toHaveLength(6);
    expect(audit.source.commandSummary.audio).toEqual(["panse SE_M_GUST, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, +2, 0", "playsewithpan SE_M_MORNING_SUN, 0", "playsewithpan SE_M_GUST2, SOUND_PAN_TARGET"]);
    expect(audit.graph.components).toEqual(["asset:ANIM_TAG_SPARKLE_6", "sprite:gSilverWindBigSparkSpriteTemplate", "sprite:gSilverWindMediumSparkSpriteTemplate", "sprite:gSilverWindSmallSparkSpriteTemplate", "subroutine:SilverWindContinue", "subroutine:SilverWindOnPlayer", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_BlendBattleAnimPalExclude", "task:AnimTask_GetTargetSide", "task:AnimTask_StartSlidingBg", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:panse", "visualCommand:restorebg", "visualCommand:setarg", "visualCommand:splitbgprio_all", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"]);
    expect(audit.carriers.allFactory.map((entry: Json) => entry.index)).toEqual([21, 153, 157, 158, 172, 173, 198, 226, 278, 368, 519, 711]);
    expect(audit.carriers.level50.map((entry: Json) => entry.index)).toEqual([153, 157, 158, 172, 173, 198, 226, 278, 368, 519, 711]);
  });

  it("keeps twice-fresh legal party-before-init endpoints unsupported, compact, and outside the animation boundary", () => {
    const receipt = json("tools/compare/fixtures/silver-wind-staging-receipt.json");
    const coverage = json("ANIMATION_COVERAGE.json");
    expect(receipt).toMatchObject({
      schema: "silver-wind-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", move: "MOVE_SILVER_WIND", moveId: 318, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      factoryLegalSelection: { lowestLevel50Carrier: { setId: 153, name: "FRONTIER_MON_BUTTERFREE", species: 12 }, partyBeforeInit: true, excludedOutsideLevel50: [21] },
      freshness: { sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py", runsPerOrientation: 2 },
      scope: { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, battleStateInjected: false, transientOverrides: [], boundaryOrBarrierChanged: false, noTimingOrLatchTransfer: true },
    });
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SILVER_WIND")).toMatchObject({ status: "exact" });
    expect(coverage.queue).not.toContain("MOVE_SILVER_WIND");
    expect(read("tools/compare/silverWindSourceAudit.ts")).not.toContain("../../src/");
    expect(read("tools/compare/silverWindStagingProbe.py")).not.toContain("src/");
    for (const [orientation, expected] of Object.entries({
      "player-back": { attacker: "player", target: "opponent", sha: "6f67295907bbb3247529c66ee8d0bf75bdcff8844e224923d2a046a03a45c4c4", observations: 192, battlers: [0, 1], pp: [4, 5, 5, 5] },
      "opponent-front": { attacker: "opponent", target: "player", sha: "80a40dcaad79e20c8a36eaf3d6e5a60169a8e33c6ec471485c3e894025bfe885", observations: 195, battlers: [1, 0], pp: [5, 4, 5, 5] },
    })) {
      const runReceipt = receipt.runs[orientation];
      expect(runReceipt).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, outputSha256: expected.sha, output: { attacker: { side: expected.attacker, species: 12, moves: [318, 318, 318, 318] }, target: { side: expected.target, species: 95, finalHp: 96 }, root: { symbol: "Move_SILVER_WIND", observations: expected.observations, attackerBattler: expected.battlers[0], targetBattler: expected.battlers[1] }, pp: { after: expected.pp, spent: 1 }, cleanup: { visualTasks: 0, soundTasks: 0 }, benches: { unchanged: true, checksumValid: true }, sourceInitialized: true, customPartiesBuiltBeforeBattle: true, transientFreeSetup: true } });
    }
    const first = run("tools/compare/verifySilverWindStaging.ts");
    expect(run("tools/compare/verifySilverWindStaging.ts")).toBe(first);
    expect(JSON.parse(first)).toEqual({ schema: "silver-wind-source-staging-verifier/v1", auditRunSha256: receipt.source.auditRunSha256, runs: { "player-back": { outputSha256: "6f67295907bbb3247529c66ee8d0bf75bdcff8844e224923d2a046a03a45c4c4", rootObservations: 192, ppSpent: 1 }, "opponent-front": { outputSha256: "80a40dcaad79e20c8a36eaf3d6e5a60169a8e33c6ec471485c3e894025bfe885", rootObservations: 195, ppSpent: 1 } } });
  });
});
