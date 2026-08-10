import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { batonPassAtAge } from "../../src/animation/batonPass.ts";
import { createSceneOnMovePresentation, sceneOnBatonPassView } from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_BATON_PASS source-relative presentation", () => {
  it("ports both fall-through affine phases, hide/reset, ascent, and geometry-dependent cleanup", () => {
    const center = { x: 72, y: 97 };
    expect(batonPassAtAge(4, center).pokeball).toMatchObject({ phase: 1, data1: 448, data2: 278, data3: 2 });
    expect(batonPassAtAge(8, center).pokeball).toMatchObject({ phase: 2, data1: 1024, data2: 418, data3: 8 });
    expect(batonPassAtAge(9, center)).toMatchObject({ attackerInvisible: true, attackerMatrix: { a: 256, d: 256 } });
    expect(batonPassAtAge(30, center).pokeball?.y2).toBe(-126);
    expect(batonPassAtAge(31, center).pokeball).toBeNull();
    expect(batonPassAtAge(21, { x: 176, y: 43 }).pokeball?.y2).toBe(-72);
    expect(batonPassAtAge(22, { x: 176, y: 43 }).pokeball).toBeNull();
  });

  it("keeps the 53-frame pointer window and 47-frame shared blend task exact", () => {
    const center = { x: 72, y: 97 };
    expect(batonPassAtAge(0, center)).toMatchObject({ active: true, scriptOffset: 0, visualTaskCount: 0 });
    expect(batonPassAtAge(4, center)).toMatchObject({ scriptOffset: 33, blendTaskActive: true, visualTaskCount: 2 });
    expect(batonPassAtAge(50, center).blendTaskActive).toBe(true);
    expect(batonPassAtAge(51, center)).toMatchObject({ active: true, blendTaskActive: false });
    expect(batonPassAtAge(52, center).active).toBe(false);
  });

  it("publishes software and one-transfer-lagged scanout state through the typed seam", () => {
    const state = createSceneOnMovePresentation({
      move: "BATON_PASS",
      attacker: { species: "AIPOM", geometry: { side: "player", spriteCorner: { x: 40, y: 57 }, animationCenter: { x: 72, y: 97 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 126, playerMaxHp: 126, opponentHp: 117, opponentMaxHp: 117 },
    });
    const view = sceneOnBatonPassView({ ...state, age: 5 });
    expect(view.pokeball?.data1).toBe(640);
    expect(view.displayedPokeball?.data1).toBe(448);
    expect(view.displayedAttackerMatrix.a).toBe(448);
  });

  it("pins source, lowest carrier, and deterministic Poké Ball extraction", () => {
    expect(execFileSync("node", ["--experimental-strip-types", "tools/compare/batonPassSourceAudit.ts"], { encoding: "utf8" }))
      .toContain("lowest set 142 AIPOM");
    const dir = mkdtempSync(join(tmpdir(), "baton-pass-assets-"));
    const out = join(dir, "baton-pass.json");
    execFileSync("node", ["--experimental-strip-types", "tools/compare/extractBatonPassAssets.ts", "--out", out]);
    expect(readFileSync(out)).toEqual(readFileSync("src/animation/assets/baton-pass.json"));
  });
});
