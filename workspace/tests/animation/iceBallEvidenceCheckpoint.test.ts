import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = new URL("../../", import.meta.url).pathname;
const readJson = (path: string): Json => JSON.parse(readFileSync(`${root}/${path}`, "utf8")) as Json;
const digest = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const sides = [
  ["player-back", "player", "player-dense.json.gz", "player-map.json"],
  ["opponent-front", "opponent", "opponent-dense.json.gz", "opponent-map.json"],
] as const;

describe("MOVE_ICE_BALL dense Scene-ON evidence checkpoint", () => {
  it("regenerates both compact maps byte-identically without production acceptance", () => {
    const run = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/iceBallEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    expect(run()).toBe(run());
  });

  it.each(sides)("pins the complete five-body %s source-relative window", (orientation, name, denseName, mapName) => {
    const denseGzip = readFileSync(`${root}/tools/compare/fixtures/ice-ball/${denseName}`);
    const probe = JSON.parse(gunzipSync(denseGzip).toString("utf8")) as Json;
    const map = readJson(`tools/compare/fixtures/ice-ball/${mapName}`);
    expect(probe).toMatchObject({ schema: "ice-ball-dense-evidence/v1", oracleProfile: "battle-scene-on", completeFiveBodyLifecycle: true });
    expect(probe.bodies).toHaveLength(5);
    expect(probe.sourceWindows.map((window: Json) => window.frameCount)).toEqual([76, 76, 76, 76, 132]);
    expect(map).toMatchObject({ schema: "ice-ball-normalized-change-map/v1", side: orientation, move: "MOVE_ICE_BALL", profile: "battle-scene-on", completeFiveBodyLifecycle: true });
    expect(map.bodies.map((body: Json) => body.counter.observed)).toEqual([0, 1, 2, 3, 4]);
    expect(map.bodies.map((body: Json) => body.shardPattern.created)).toEqual([5, 7, 9, 10, 10]);
    expect(map.bodies.map((body: Json) => body.shake.expectedDuration)).toEqual([8, 10, 14, 18, 30]);
    expect(map.bodies.every((body: Json) => body.shardPattern.allExact21 && body.shardPattern.lives.every((life: Json) => life.logicalLifetimeTicks === 21 && life.exact21))).toBe(true);
    expect(map.bodies.every((body: Json) => body.chunk.callback.includes("AnimThrowIceBall") && body.chunk.arcTicks.includes(0) && body.chunk.arcTicks.includes(29))).toBe(true);
    expect(map.bodies.every((body: Json) => body.latches.hardwareOamEqualsPrecedingSoftware === `${body.body === 5 ? 131 : (orientation === "player-back" && body.body === 4 ? 74 : 75)}/${body.body === 5 ? 131 : 75}`)).toBe(true);
    expect(map.bodies.every((body: Json) => body.latches.hardwareMatricesEqualsPrecedingSoftware === `${body.body === 5 ? 131 : 75}/${body.body === 5 ? 131 : 75}`)).toBe(true);
    expect(map.bodies.every((body: Json) => body.latches.hardwarePaletteEqualsPrecedingFaded === `${body.body === 5 ? 131 : 75}/${body.body === 5 ? 131 : 75}`)).toBe(true);
    expect(map.bodies.at(-1).background.strongestCleanup).toMatchObject({ fadeTask: true, delay45Observed: true, finalEqualsInitial: true });
    expect(map.bodies.every((body: Json) => body.cleanup.active === false && body.cleanup.visualTasks === 0 && body.cleanup.soundTasks === 0 && body.cleanup.ownedSprites === 0)).toBe(true);
    expect(map.bodies[0].topology.sprites).toEqual(["gIceBallChunkSpriteTemplate", "gIceBallImpactShardSpriteTemplate"]);
    expect(map.bodies[0].topology.callbacks).toEqual(expect.arrayContaining(["AnimThrowIceBall", "AnimIceBallParticle"]));
    for (const body of probe.bodies as Json[][]) {
      expect(body.every((row: Json) => row.scriptOwner === "Move_ICE_BALL" && row.scriptOffset >= 0 && row.scriptOffset < 463)).toBe(true);
      expect(body.every((row: Json) => typeof row.rgbFile === "string" && typeof row.sha256 === "string" && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.registers.bldcnt !== undefined && typeof row.bgVramSha256 === "string" && row.audio.SE1.songHeaderIdentity.symbol && row.audio.SE2.songHeaderIdentity.symbol && typeof row.animationRng === "number" && typeof row.immutableState.rngValue === "number" && row.allocators.tileRanges.length === 64 && row.spriteOrder.length === 64)).toBe(true);
    }
    expect(probe.bodies[0][0].parties.player[0].species).toBe(name === "player" ? 341 : 403);
    expect(probe.bodies[0][0].parties.opponent[0].species).toBe(name === "player" ? 403 : 341);
  });

  it("pins two fresh deterministic runs and keeps all production/coverage claims false", () => {
    const manifest = readJson("tools/compare/fixtures/ice-ball/evidence-manifest.json");
    expect(manifest).toMatchObject({ schema: "ice-ball-evidence-manifest/v1", move: "MOVE_ICE_BALL", profile: "battle-scene-on", status: "unsupported-evidence-checkpoint", coverageCredit: false, seed: 305420103, checkpoint: { productionReducer: false, typedSceneOnSeam: false, compositor: false, actualCoreFramebufferAcceptance: false, trackFulfilled: false } });
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const runs = manifest.freshRuns[orientation];
      expect(runs).toHaveLength(2);
      const comparable = ({ run: _run, ...rest }: Json): Json => rest;
      expect(comparable(runs[0])).toEqual(comparable(runs[1]));
      expect(runs[0].rows).toEqual([76, 76, 76, 76, 132]);
    }
    expect(manifest.bodyContract).toEqual({ counters: [0, 1, 2, 3, 4], shards: [5, 7, 9, 10, 10], shakeDurations: [8, 10, 14, 18, 30], shardLogicalLifetimeTicks: 21, arcDurationTicks: 30, strongestCleanupDelayTicks: 45 });
    expect(digest(readFileSync(`${root}/tools/compare/fixtures/ice-ball/player-map.json`))).toBe("9e6cd04193b15c2d683e82117b120c6185e73233e90521e5e4a9da2d395f29fd");
    expect(digest(readFileSync(`${root}/tools/compare/fixtures/ice-ball/opponent-map.json`))).toBe("5af2dea6e5c0a1a4e069207996d9f4915ff9a9db7dc8a2bd13485ad228e67aef");
  });
});
