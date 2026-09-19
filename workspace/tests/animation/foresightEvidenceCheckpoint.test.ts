import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyForesightEvidence } from "../../tools/compare/foresightEvidence.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_FORESIGHT exact source and production acceptance", () => {
  it("pins the complete source interval, eight-component graph, and legal carrier census", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/foresightSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: "MOVE_FORESIGHT", moveId: 193,
      source: { start: "0x082cd5ed", endExclusive: "0x082cd62c", byteLength: 63,
        romSha256: "2469690030bfc8812942fb5b7e05ffdae282b73a1e5578b96890e55c5f1bf61b" },
      graph: { root: "Move_FORESIGHT", blocks: ["Move_FORESIGHT"] },
      template: "gForesightMagnifyingGlassSpriteTemplate",
      task: "AnimTask_BlendMonInAndOut",
      audio: ["SE_M_SKETCH", "SE_M_DETECT"],
    });
    expect(audit.graph.components).toHaveLength(8);
    expect(audit.carriers.map((carrier: { setId: number }) => carrier.setId)).toEqual([178, 283, 338]);
    expect(audit.carriers[0]).toMatchObject({ setId: 178, label: "FRONTIER_MON_MACHOKE_1",
      species: "SPECIES_MACHOKE", ppUps: [0, 0, 0, 0] });
  });

  it("replays all 334 twice-fresh dense state/raw-RGB rows and move-owned latches", () => {
    const verified = verifyForesightEvidence();
    expect(verified["player-back"]).toEqual({
      window: { startFrame: 211, endFrame: 377, frameCount: 167, sourceFrameCount: 167 },
      rows: 167, sprite: "ages 7..144",
      tasks: "monbg 4..164; sound 26..75; blend 114..160; clear 162..164",
      latches: { oam: "166/166 RAM+1", matrices: "166/166 RAM+1",
        palette: "165/166 RAM+1; age 4 same-row monbg" },
      animationRngTransitions: 164, gameplayRngTransitions: 0, cleanupAge: 166,
    });
    expect(verified["opponent-front"]).toEqual({
      ...verified["player-back"],
      window: { startFrame: 210, endFrame: 376, frameCount: 167, sourceFrameCount: 167 },
    });
  });

  it("re-extracts the source art and keeps Foresight, its track, and siblings honest", () => {
    const output = join(createScratchDir("pokebench-foresight-assets-"), "foresight.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractForesightAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/foresight.json"));
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string; status: string }) => entry.move === "MOVE_FORESIGHT")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "foresight-magnifying-glass")).toMatchObject({
      representatives: ["MOVE_FORESIGHT"], fulfilled: true,
    });
    const statuses = new Map(coverage.entries.map((entry: { move: string; status: string }) => [entry.move, entry.status]));
    for (const move of ["MOVE_SUPER_FANG", "MOVE_FLAME_WHEEL", "MOVE_HIDDEN_POWER",
      "MOVE_TORMENT", "MOVE_RECYCLE", "MOVE_ENDEAVOR"]) expect(statuses.get(move)).toBe("exact");
    for (const move of ["MOVE_HELPING_HAND",
      "MOVE_EXTRASENSORY", "MOVE_RAGE"]) expect(statuses.has(move)).toBe(false);
  });
});
