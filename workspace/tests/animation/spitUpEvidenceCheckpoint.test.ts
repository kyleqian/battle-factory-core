import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(".");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
const matrix = JSON.parse(readFileSync(
  "tools/compare/fixtures/spit-up-evidence-matrix.json", "utf8",
)) as { branches: Json[] };
const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/spit-up-evidence.json", "utf8",
)) as Json;

function rawFrames(archive: string, frames: readonly Json[]): Buffer[] {
  const directory = mkdtempSync(join(tmpdir(), "pokebench-spit-up-test-"));
  execFileSync("tar", ["-xzf", archive, "-C", directory]);
  return frames.map((row) => readFileSync(join(directory, `${String(row.frame).padStart(5, "0")}.rgb`)));
}

describe("MOVE_SPIT_UP dense evidence checkpoint", () => {
  it("pins all six complete windows, hashes, maps, latches, state, and cleanup", () => {
    expect(fixture).toMatchObject({
      schema: "spit-up-evidence-checkpoint/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SPIT_UP",
      status: "unsupported",
      coverageCredit: false,
      noProductionClaim: true,
      graphComponents: 10,
    });
    expect(fixture.branches).toHaveLength(6);
    expect(matrix.branches).toHaveLength(6);
    const seen = new Set<string>();
    for (const branch of matrix.branches) {
      const key = `${branch.orientation}/${branch.stockpiles}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      const denseArchive = readFileSync(branch.denseState);
      const denseJson = gunzipSync(denseArchive);
      const probe = JSON.parse(denseJson.toString("utf8")) as Json;
      const rawArchive = readFileSync(branch.rawRgbArchive);
      const maps = JSON.parse(readFileSync(branch.changeMap, "utf8")) as Json;
      const rows = probe.frames as Json[];
      const raw = rawFrames(branch.rawRgbArchive, rows);
      expect(sha(denseArchive)).toBe(branch.denseArchiveSha256);
      expect(sha(denseJson)).toBe(branch.denseJsonSha256);
      expect(sha(rawArchive)).toBe(branch.rawArchiveSha256);
      expect(sha(Buffer.concat(raw))).toBe(branch.rawRgbSequenceSha256);
      expect(branch.denseJsonSha256).toBe(branch.repeatDenseJsonSha256);
      expect(branch.rawRgbSequenceSha256).toBe(branch.repeatRawRgbSequenceSha256);
      expect(branch.twiceFreshByteIdentity).toBe(true);
      expect(sha(readFileSync(branch.changeMap))).toBe(branch.changeMapSha256);
      expect(probe).toMatchObject({
        schema: "spit-up-dense-evidence/v1",
        oracleProfile: "battle-scene-on",
        sourceWindow: branch.sourceWindow,
        branch: {
          stockpiles: branch.stockpiles,
          animTurn: branch.stockpiles,
          attackerBattler: branch.orientation === "player-back" ? 0 : 1,
          targetBattler: branch.orientation === "player-back" ? 1 : 0,
        },
        lifecycleCounts: {
          redOrb: branch.stockpiles === 1 ? 8 : branch.stockpiles === 2 ? 12 : 16,
          impact: 2, deform: 1, attackerShake: 1, targetPowerShake: 1,
        },
        cleanup: { active: 0, visualTaskCount: 0, soundTaskCount: 0 },
      });
      expect(rows).toHaveLength(branch.sourceWindow.frameCount);
      expect(raw).toHaveLength(rows.length);
      expect(rows.every((row, age) => row.frame === branch.sourceWindow.startFrame + age
        && row.scriptOwner === "Move_SPIT_UP"
        && row.scriptPtr >= probe.sourcePointerContract.start
        && row.scriptPtr < probe.sourcePointerContract.endExclusive
        && row.scriptPtrParity === (row.scriptPtr & 1)
        && row.engineState && row.immutableState && row.gameplayRng !== undefined
        && row.animationRng !== undefined)).toBe(true);
      expect(probe.songHeaders).toEqual(expect.objectContaining({
        SE_M_TAKE_DOWN: expect.any(Number),
        SE_M_SPIT_UP: expect.any(Number),
        SE_M_DOUBLE_SLAP: expect.any(Number),
      }));
      expect(maps).toMatchObject({
        schema: "spit-up-normalized-change-map/v1",
        orientation: branch.orientation,
        stockpiles: branch.stockpiles,
        sourceWindow: branch.sourceWindow,
        lifecycle: branch.lifecycleCounts,
        state: {
          partiesStable: true, battlersStable: true, engineStable: true,
          immutableStable: true, gameplayRngStable: true,
        },
        cleanup: {
          active: 0, visualTasks: 0, soundTasks: 0,
          ownedSprites: 0, ownedTasks: 0, redOrbTagged: false, impactTagged: false,
        },
      });
      expect(maps.rows).toHaveLength(rows.length);
      expect(maps.banks).toEqual(expect.objectContaining({
        softwareOam: expect.any(Object), hardwareOam: expect.any(Object),
        softwareMatrices: expect.any(Object), hardwareMatrices: expect.any(Object),
        fadedPalette: expect.any(Object), hardwarePalette: expect.any(Object),
        registers: expect.any(Object), allocators: expect.any(Object),
        audio: expect.any(Object), tasks: expect.any(Object), sprites: expect.any(Object),
        engineState: expect.any(Object), immutableState: expect.any(Object),
      }));
      expect(maps.latches).toMatchObject({
        hardwareOamEqualsPrecedingSoftware: expect.stringMatching(/^\d+\/\d+$/),
        hardwarePaletteEqualsPrecedingFaded: expect.stringMatching(/^\d+\/\d+$/),
        hardwareMatricesEqualsPrecedingSoftware: expect.stringMatching(/^\d+\/\d+$/),
        redOrbLives: expect.any(Array),
        impactLives: expect.any(Array),
      });
      expect(maps.latches.redOrbLives).toHaveLength(branch.stockpiles === 1 ? 8 : branch.stockpiles === 2 ? 12 : 16);
      expect(maps.latches.impactLives).toHaveLength(2);
      expect(maps.resources.tags.redOrb.absentAfterCleanup).toBe(true);
      expect(maps.resources.tags.impact.absentAfterCleanup).toBe(true);
    }
    expect(seen).toEqual(new Set([
      "player-back/1", "player-back/2", "player-back/3",
      "opponent-front/1", "opponent-front/2", "opponent-front/3",
    ]));
  });
});
