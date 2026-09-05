import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const verify = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/diveEvidence.ts"], { cwd: root, encoding: "utf8" }));

describe("MOVE_DIVE bilateral dense evidence checkpoint", () => {
  it("retains both complete dense bodies twice per orientation", () => {
    expect(verify()).toMatchObject({
      schema: "dive-bilateral-evidence/v1", move: "MOVE_DIVE",
      status: "unsupported-evidence", coverageCredit: false,
      orientations: {
        "player-back": { bodyWindows: [{ frameCount: 118 }, { frameCount: 93 }], denseRows: 211, probeJsonSha256: "2947e75c2cfec66122980939fb6a15fc1ad2ff270f0a267fcbf149734e63e94c", rawRgbSequenceSha256: "c786f824c4f3e56dba36c81c4bae3951d5671058aab4fbb2264b5021c6955c2d", twiceFreshByteIdentical: true },
        "opponent-front": { bodyWindows: [{ frameCount: 115 }, { frameCount: 93 }], denseRows: 208, probeJsonSha256: "7cef3cdf69ecdf085293ebbab315e51a6eb392ecfaa9a2c1db8ee6ba1b60e368", rawRgbSequenceSha256: "3a95fe16ea59bbc33597d7b75a388f1fdf4405e1480cd44a0bc7bdffbb330b15", twiceFreshByteIdentical: true },
      },
      boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false },
    });
  });

  it("retains every requested hardware/state surface and disjoint shared range", () => {
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/dive-evidence.json"), "utf8"));
    expect(fixture.evidenceScope).toMatchObject({ completeDisjointPointerBodies: true, fullDenseRowsRetained: true, rawRgbRetained: true, normalizedChangeMaps: true, productionAnimationChanged: false, framebufferCompared: false, gameplayStateOwned: false });
    for (const side of ["player-back", "opponent-front"]) {
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, fixture.orientations[side].denseState))).toString("utf8"));
      expect(dense.sourcePointerContracts).toEqual([{ start: 0x082d653d, endExclusive: 0x082d65f7 }, { start: 0x082cb102, endExclusive: 0x082cb275 }]);
      expect(dense.bodyWindows.every((window: any) => window.endFrame - window.startFrame + 1 === window.frameCount)).toBe(true);
      expect(dense.frames.every((row: any) => row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.audio.SE1.tracks.length === 4 && row.audio.SE2.tracks.length === 4)).toBe(true);
    }
  });
});
