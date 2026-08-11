import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/sleepPowder.json" with { type: "json" };
import {
  SLEEP_POWDER_FIRST_INACTIVE_AGE,
  SLEEP_POWDER_FRAME_COUNT,
  sleepPowderAtAge,
  sleepPowderParticleDrawOrderAtAge,
} from "../../src/animation/sleepPowder.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSleepPowderView,
  type SceneOnSleepPowderConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const opponent = { x: 176, y: 42 };

describe("MOVE_SLEEP_POWDER source-relative reducer", () => {
  it("ports the complete independent resource/lifecycle contract", () => {
    expect(SLEEP_POWDER_FRAME_COUNT).toBe(194);
    expect(SLEEP_POWDER_FIRST_INACTIVE_AGE).toBe(193);
    expect(sleepPowderAtAge(0, "opponent", opponent)).toMatchObject({
      active: true, sleepPowderLoaded: false, scriptOffset: 0, particles: [],
    });
    expect(sleepPowderAtAge(1, "opponent", opponent).sleepPowderLoaded).toBe(true);
    expect(sleepPowderAtAge(4, "opponent", opponent)).toMatchObject({
      scriptOffset: 68, sound: "SE_M_POISON_POWDER",
    });
    expect(sleepPowderAtAge(4, "opponent", opponent).particles[0])
      .toMatchObject({ callback: "AnimMovePowderParticle_Step" });
    expect(sleepPowderAtAge(75, "opponent", opponent).particles).toHaveLength(15);
    expect(sleepPowderAtAge(192, "opponent", opponent).particles).toEqual([]);
    expect(sleepPowderAtAge(193, "opponent", opponent)).toMatchObject({
      active: false, sleepPowderLoaded: false, scriptOffset: 301,
    });
    expect(sleepPowderParticleDrawOrderAtAge(4)).toEqual([4, 5, 3]);
    expect(sleepPowderParticleDrawOrderAtAge(191)).toEqual([16, 19, 17, 18]);
  });

  it("keeps the typed seam outcome-free", () => {
    const config: SceneOnSleepPowderConfig = {
      move: "SLEEP_POWDER",
      attacker: { species: "HOPPIP", geometry: { side: "player", spriteCorner: { x: 40, y: 59 }, animationCenter: { x: 72, y: 91 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: opponent, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 69, playerMaxHp: 110, opponentHp: 142, opponentMaxHp: 142, playerGender: "male", opponentGender: "male" },
    };
    const view = sceneOnSleepPowderView({ ...createSceneOnMovePresentation(config), age: 4 });
    expect(view).toMatchObject({ age: 4, attacker: { species: "HOPPIP" }, target: { species: "ONIX" }, sleepPowderLoaded: true });
    expect("asleep" in view).toBe(false);
    expect("damage" in view).toBe(false);
  });

  it("re-extracts distinct source art and pins the full graph/carrier", () => {
    const out = join(mkdtempSync(join(tmpdir(), "sleep-powder-assets-")), "a.json");
    execFileSync("node", ["--experimental-strip-types", "tools/compare/extractSleepPowderAssets.ts", "--out", out]);
    expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(asset);
    const audit = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/sleepPowderSourceAudit.ts"], { encoding: "utf8" });
    expect(audit).toContain("0x082c967b..0x082c97a9 (0x12e bytes)");
    expect(audit).toContain("gSleepPowderParticleSpriteTemplate -> AnimMovePowderParticle_Step");
    expect(audit).toContain("set 226/FRONTIER_MON_VENOMOTH_1");
  });
});
