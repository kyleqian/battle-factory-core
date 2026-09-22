import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/will-o-wisp-evidence.json"), "utf8")) as Json;
const sha = (path: string): string => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
const run = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/willOWispEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

describe("MOVE_WILL_O_WISP unsupported dense evidence checkpoint", () => {
  it("retains complete twice-fresh bilateral state, raw RGB, and banked maps", () => {
    expect(fixture).toMatchObject({
      schema: "will-o-wisp-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_WILL_O_WISP", moveId: 261,
      status: "unsupported-evidence-checkpoint", coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 214, "opponent-front": 213 }, totalRows: 427, firstInactiveCleanupRetained: true },
      evidenceScope: { completePointerBody: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedBankedMaps: true, twiceFreshByteIdentical: true, orbAndFireCallbacks: true, shakeMon2Literal: [4, 0, 13, 1], splitBgPriorityBothPhases: true, panning: true, oamMatrixPaletteResourceLifetimes: true, firstInactiveCleanup: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
      controls: { inheritedLatchConclusions: [], identityOnly: ["MOVE_SMOG", "MOVE_HYPER_VOICE", "MOVE_SNORE", "MOVE_SILVER_WIND"], transferCredit: false },
    });
    const expected: Record<string, Json> = {
      "player-back": { scenario: "fb3129c73121b03e5183eef20ce9464eeecedaf248305a6e07e38ed8cff17a02", dense: "577ef2c7cd9a196b03db9c137dcb7a95068b03dbd119b361aee1e53a9d828e52", probe: "3f2ecd8f20984260d3256fe8a6550f8c97105ec2e6ef5928aee04f382949131f", archive: "5f175cba5bd2e27928351f72f71768f05d23ac62fd7ad78e251734fb962743d0", rgb: "e02e1c81b629475536610c72641d866785ee3a04ce742d2708f02ea7a64e1e27", map: "5601f0dd1d8d62f581822c915d831cba3df3040625aac4f596e13bb900e75d6c", rows: 214, latch: "213/213", palette: "212/213", bank: 8, fireLast: 212, orbLast: 212, cleanup: 213 },
      "opponent-front": { scenario: "288ccbbed444f41c5d51b64fee770557a83c6daead89545b106b8c4eadf2210e", dense: "3de287538ef17d75842e6d16f7ffc519f0d5e006c0f9a57f0c69017ac2be40ab", probe: "d7c131a032e6805861d44d1005200127b15e4f1cf5436cbc1c1236c414794a81", archive: "2a7531e49a47f81ca468b0b7d89001b136dfccf146b70407379955758a83c0c4", rgb: "3977ab502a73dadbf522feb694b3d612602e30dd5e3756d55ba43bfd1d5ad5b5", map: "1d4a7f515f7e37514fe5c53a47ce3f3b1cb13ea0d99cba8ef45656e2b71d8c2e", rows: 213, latch: "212/212", palette: "211/212", bank: 9, fireLast: 211, orbLast: 211, cleanup: 212 },
    };
    for (const [side, want] of Object.entries(expected)) {
      const receipt = fixture.orientations[side];
      expect(receipt).toMatchObject({ scenarioSha256: want.scenario, denseStateSha256: want.dense, probeJsonSha256: want.probe, repeatProbeJsonSha256: want.probe, rawRgbArchiveSha256: want.archive, rawRgbSequenceSha256: want.rgb, repeatRawRgbSequenceSha256: want.rgb, changeMapSha256: want.map, summary: { frameCount: want.rows, latches: { hardwareOamEqualsPrecedingSoftware: want.latch, hardwareMatricesEqualPrecedingSoftware: want.latch, hardwarePaletteEqualsPrecedingFaded: want.palette, oamExceptions: [], matrixExceptions: [], paletteExceptions: [7], selectedMonbgBank: want.bank }, resources: { wispFire: { tag: 10232, tile: { first: 1, last: want.fireLast } }, wispOrb: { tag: 10231, tile: { first: 4, last: want.orbLast } } }, state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, rawBattleStateStable: true, gameplayRngStable: true }, cleanup: { age: want.cleanup, active: false, visualTasks: 0, soundTasks: 0, ownedTasks: 0, ownedSprites: 0, resourcesFreed: true } } });
      expect(sha(receipt.scenario)).toBe(want.scenario);
      expect(sha(receipt.denseState)).toBe(want.dense);
      expect(sha(receipt.rawRgbArchive)).toBe(want.archive);
      expect(sha(receipt.changeMap)).toBe(want.map);
      expect((JSON.parse(gunzipSync(readFileSync(resolve(root, receipt.denseState))).toString("utf8")) as Json).frames).toHaveLength(want.rows);
    }
  });

  it("replays every move-owned domain without granting production credit", () => {
    const first = run();
    expect(run()).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe("4628597f4db27dac4e89ad0278e1d9a1fe1a78c396605e7ee74f72e21e70ea77");
    expect(JSON.parse(first)).toMatchObject({ move: "MOVE_WILL_O_WISP", status: "unsupported-evidence-checkpoint", coverageCredit: false, boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } });
  });

  it("keeps Will-O-Wisp staged and its exclusive component track unfulfilled", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_WILL_O_WISP")).toMatchObject({ status: "staged" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "will-o-wisp-orb-fire")).toMatchObject({ components: ["asset:ANIM_TAG_WISP_FIRE", "asset:ANIM_TAG_WISP_ORB", "sprite:gWillOWispFireSpriteTemplate", "sprite:gWillOWispOrbSpriteTemplate"], representatives: ["MOVE_WILL_O_WISP"], fulfilled: false });
  });
});
