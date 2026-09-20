import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (path: string): Json => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", path], { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })) as Json;

describe("MOVE_RETURN unsupported evidence checkpoint", () => {
  it("pins the complete 20-component graph, eight carriers, four staging branches, and FLATTER identity only", () => {
    const audit = run("tools/compare/returnSourceAudit.ts");
    expect(audit).toMatchObject({ schema: "return-source-audit/v1", move: "MOVE_RETURN", status: "unsupported-evidence", coverageCredit: false, graph: { componentCount: 20 }, sibling: { move: "MOVE_FLATTER", componentCount: 11, credit: false }, boundary: { reducer: false, typedSeam: false, compositor: false, framebufferAcceptance: false, coveragePromotion: false, trackCredit: false, siblingCredit: false } });
    expect(audit.level50Carriers.map((entry: Json) => entry.index)).toEqual([288, 306, 355, 459, 534, 567, 747, 827]);
    expect(audit.sibling.level50Carriers.map((entry: Json) => entry.index)).toEqual([146, 147]);
    expect(audit.reachability.completePartyOverride).toEqual({ weak: "friendship 0..60", medium: "61..91", strong: "92..200", strongest: "201..255" });
  });

  it("replays both retained strongest-branch maps and twice-fresh receipts without promotion", () => {
    const result = run("tools/compare/returnEvidence.ts");
    expect(result).toMatchObject({ schema: "return-bilateral-evidence/v1", move: "MOVE_RETURN", status: "unsupported-evidence", coverageCredit: false, boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false } });
    for (const side of ["player-back", "opponent-front"]) expect(result.orientations[side]).toMatchObject({ rows: 282, latches: { hardwareOamEqualsPrecedingSoftware: "281/281", hardwareMatricesEqualPrecedingSoftware: "281/281", hardwarePaletteEqualsPrecedingFaded: "280/281", paletteSameRowExceptions: [4] }, cleanup: { age: 281, active: false, visualTasks: 0, soundTasks: 0 } });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_RETURN")).toBe(false);
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_FLATTER")).toBe(false);
  });
});
