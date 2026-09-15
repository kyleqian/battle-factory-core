import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const audit = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/machPunchSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
const verify = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifyMachPunchStaging.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

describe("MOVE_MACH_PUNCH source + legal bilateral Scene-ON staging", () => {
  it("pins the full pointer-owned source/ROM graph and every Level-50 legal carrier without granting credit", () => {
    const first = audit();
    expect(audit()).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe("2e6d8f35f6999849d9bef18919ce690c7ade02f272852cb7d94c34b15d94c7f0");
    const value = JSON.parse(first) as Json;
    expect(value).toMatchObject({ schema: "mach-punch-source-audit/v1", move: "MOVE_MACH_PUNCH", moveId: 183, status: "exact", coverageCredit: true, source: { pointerOwnedRoot: { symbol: "Move_MACH_PUNCH", nextDispatchLabel: "Move_FORESIGHT", rom: { start: "0x082cd565", endExclusive: "0x082cd5ed", byteLength: 136 }, branches: { directlyReachableBlocks: ["Move_MACH_PUNCH", "MachPunchAgainstPlayer", "MachPunchContinue"], targetSideVariants: ["BG_HIGHSPEED_OPPONENT", "BG_HIGHSPEED_PLAYER"], complete: true } } }, carriers: { count: 4, excludedOutsideLevel50: [15, 32] }, checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: true, latchMeasured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: false } });
    expect(value.graph.components).toHaveLength(19);
    expect(value.graph.unrepresented).toEqual([]);
    expect(value.carriers.allSourceCarriers.map((entry: Json) => entry.index)).toEqual([15, 32, 234, 236, 339, 382]);
    expect(value.carriers.level50.map((entry: Json) => entry.index)).toEqual([234, 236, 339, 382]);
    expect(value.carriers.lowestLegal).toMatchObject({ index: 234, label: "FRONTIER_MON_HITMONCHAN_1", species: "SPECIES_HITMONCHAN" });
  });

  it("hermetically replays complete party-before-init endpoints twice per orientation", () => {
    const first = verify();
    expect(verify()).toBe(first);
    expect(JSON.parse(first)).toEqual({ schema: "mach-punch-source-staging-verifier/v1", auditRunSha256: "2e6d8f35f6999849d9bef18919ce690c7ade02f272852cb7d94c34b15d94c7f0", runs: { "player-back": { outputSha256: "d183caed41ed2f37a6af710121db7b043c773473786dcf83a030e9f7ef2e7e92", rootObservations: 110 }, "opponent-front": { outputSha256: "e945c303a29b09bbe2dc4cc75d89b026835038f926f6e6fa743365655977a71b", rootObservations: 109 } } });
    const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/mach-punch-staging-receipt.json"), "utf8")) as Json;
    expect(receipt).toMatchObject({ oracleProfile: "battle-scene-on", status: "unsupported-source-staging-checkpoint", coverageCredit: false, factoryLegalSelection: { carrier: { setId: 234, name: "FRONTIER_MON_HITMONCHAN_1", species: 107 }, allSourceCarriers: [15, 32, 234, 236, 339, 382], level50Carriers: [234, 236, 339, 382], partyBeforeInit: true }, scope: { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, noTimingOrLatchTransfer: true } });
  });
});
