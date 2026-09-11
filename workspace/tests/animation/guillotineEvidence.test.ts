import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };

const cases = [
  ["guillotine-player-gligar-opponent-onix.json", "player-back", 74, 238, 165,
    "49f55f7f94cbb4ecc2af8ea116687391a228343292defd7d972f094cb3cb0ac0", "e52f5331d06764be107d236930e19b205e484ba33aaf35db887cac16cfe166ef", "ab5c9b5a26c41ba7fd9f834f2b33e02eb871e3c6cacf5a3bb133cb8b5e43c707"],
  ["guillotine-opponent-gligar-player-onix.json", "opponent-front", 78, 241, 164,
    "59054f50992919d685713034d1a90a7db65861a956c3530c434fb4c96f1fcbb4", "16d58dcb19351512baea7973e46f771d2f8e9847bd989b56276d953b814f3ed8", "dc296a41267668224c6ad0b7e61ddc4ce78714cc16cb062d4a54947bd9a479ac"],
] as const;

describe("MOVE_GUILLOTINE bilateral exact evidence", () => {
  it.each(cases)("pins %s", (name, orientation, start, end, count, evidence, raw, map) => {
    const receipt = JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8"));
    expect(receipt).toMatchObject({
      schema: "guillotine-portable-evidence/v1", oracleProfile: "battle-scene-on", orientation,
      sourceWindow: { startFrame: start, endFrame: end, frameCount: count },
      evidenceSha256: evidence, rawRgbSha256: raw, changeMapSha256: map,
      acceptance: { status: "exact", reducerMatching: count, typedSeamMatching: count,
        componentMatching: count, framebufferMatching: count, freshRuns: 2 },
    });
    expect(createHash("sha256").update(readFileSync(receipt.changeMap)).digest("hex")).toBe(map);
  });

  it("keeps the complete portable gates and sole coverage promotion load-bearing", () => {
    const portable = readFileSync("tools/compare/guillotinePortable.ts", "utf8");
    for (const token of ["reducerMatching", "typedSeamMatching", "AnimGuillotinePincer source",
      "ShakeMon2 task lifetime", "software/hardware shape", "blend/background registers",
      "asset tag", "audio", "immutable", "production framebuffer", "twice-fresh byte stability"])
      expect(portable).toContain(token);
    expect(coverage.entries.filter((entry) => entry.status === "exact")).toHaveLength(248);
    expect(coverage.entries.filter((entry) => entry.move === "MOVE_GUILLOTINE"))
      .toEqual([expect.objectContaining({ status: "exact" })]);
    expect(276 - coverage.entries.length).toBe(28);
  });
});
