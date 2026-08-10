import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { batonPassAtAge } from "../../src/animation/batonPass.ts";
import { createSceneOnMovePresentation, sceneOnBatonPassView } from "../../src/animation/sceneOnPresentation.ts";
import coverage from "../../ANIMATION_COVERAGE.json" with { type: "json" };

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

  it.each([
    ["baton-pass-player-aipom-opponent-onix.json", "player-back", 69, "6894725b4667f5be198af2bbb043f319194c9a7bf218fd24d6002d24778fee52", "9a4824539e43ac80e53d53015ac571034a4d0a28ceb7a1b1311ebe6b11d878ec"],
    ["baton-pass-opponent-aipom-player-onix.json", "opponent-front", 73, "84a2ebae7906929927c359575fb767a254746728a2e0bfa50617d68a200e9feb", "e6723a9529331264a80e493f928c6619307341b7d3cdfe58b2241daaadd2e3e5"],
  ] as const)("pins complete bilateral evidence: %s", (name, orientation, start, evidenceSha256, rawRgbSha256) => {
    const fixture = JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8"));
    const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
    expect(fixture).toMatchObject({
      schema: "baton-pass-portable-evidence/v1", oracleProfile: "battle-scene-on", probeMoveId: 226,
      orientation, sourceWindow: { startFrame: start, endFrame: start + 52, frameCount: 53 },
      evidenceSha256, rawRgbSha256,
      acceptance: { status: "exact", componentMatching: 53, framebufferMatching: 53 },
    });
    expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex")).toBe(fixture.changeMapSha256);
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50, challengeNum: 0 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const aipom = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
      .find((mon: { species: number }) => mon.species === 190);
    expect(aipom).toMatchObject({ level: 50, nature: 7, item: 217, moves: [226, 226, 226, 226], ppUps: [0, 0, 0, 0] });
  });

  it("keeps Baton Pass exact after the Magic Coat promotion", () => {
    expect(coverage.entries).toHaveLength(150);
    expect(coverage.entries.filter((entry) => entry.move === "MOVE_BATON_PASS"))
      .toMatchObject([{ status: "exact" }]);
  });
});
