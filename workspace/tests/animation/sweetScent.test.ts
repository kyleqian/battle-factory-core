import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SWEET_SCENT_BLEND_TIMING,
  SWEET_SCENT_FIRST_INACTIVE_AGE,
  SWEET_SCENT_FRAME_COUNT,
  SWEET_SCENT_SOURCE_BASE,
  SWEET_SCENT_SOURCE_END,
  sweetScentAtAge,
} from "../../src/animation/sweetScent.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSweetScentView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { verifySweetScentEvidence } from "../../tools/compare/sweetScentEvidence.ts";

const sourceScript = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
const sourceEffects = readFileSync("reference/pokeemerald/src/battle_anim_effects_3.c", "utf8");
const inventory = JSON.parse(readFileSync("src/data/gen/factory-animation-inventory.json", "utf8"));
const checkpoint = JSON.parse(readFileSync("tools/compare/fixtures/sweet-scent-source-staging-checkpoint.json", "utf8"));

const battler = (side: "player" | "opponent", species: string): SceneOnPresentationBattler => ({
  species: species as SceneOnPresentationBattler["species"],
  geometry: {
    side,
    spriteCorner: side === "player" ? { x: 40, y: 58 } : { x: 144, y: 10 },
    animationCenter: side === "player" ? { x: 72, y: 90 } : { x: 176, y: 42 },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  },
});

const fieldProfile: SceneOnDragonRageFieldProfile = {
  playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100,
  playerGender: "female", opponentGender: "male",
};

describe("MOVE_SWEET_SCENT source-relative reducer and typed seam", () => {
  it("pins the generated lowest legal carrier and four exclusive source components", () => {
    const carrier = inventory.tiers.level50.moves.find((move: any) => move.move === "MOVE_SWEET_SCENT");
    expect(carrier.exampleMons[0]).toBe("FRONTIER_MON_WEEPINBELL_1");
    const mons = JSON.parse(readFileSync("src/data/gen/battle-frontier-mons.json", "utf8"));
    expect(mons.entries[165]).toMatchObject({
      label: "FRONTIER_MON_WEEPINBELL_1",
      species: "SPECIES_WEEPINBELL",
      moves: ["MOVE_RAZOR_LEAF", "MOVE_ACID", "MOVE_WRAP", "MOVE_SWEET_SCENT"],
    });
    const mon = inventory.tiers.level50.moves.find((move: any) => move.move === "MOVE_SWEET_SCENT");
    expect(mon).toMatchObject({ id: 230, frontierMonCount: 3, speciesCount: 3 });
    const block = sourceScript.slice(sourceScript.indexOf("Move_SWEET_SCENT:"), sourceScript.indexOf("Move_HYPER_BEAM:"));
    expect(block).toContain("loadspritegfx ANIM_TAG_PINK_PETAL");
    expect(block).toContain("gSweetScentPetalSpriteTemplate");
    expect(block).toContain("blend_color_cycle priority=2, selector=F_PAL_DEF_SIDE, delay=1, num_blends=5");
    expect((block.match(/gSweetScentPetalSpriteTemplate/g) ?? []).length).toBe(13);
    expect(sourceEffects).toContain("static void AnimSweetScentPetal(struct Sprite *sprite)");
    expect(sourceEffects).toContain("sprite->x += 5");
    expect(sourceEffects).toContain("sprite->y2 = Cos(sprite->data[0] & 0xFF, 16)");
    expect(block).not.toContain("monbg");
    expect(SWEET_SCENT_SOURCE_END - SWEET_SCENT_SOURCE_BASE).toBe(234);
  });

  it("reduces all 24 edge-to-edge petals with side-relative callbacks and cleanup", () => {
    const player = sweetScentAtAge(74, "player", { x: 72, y: 90 }, { targetSubpriority: 2 });
    const opponent = sweetScentAtAge(74, "opponent", { x: 176, y: 42 }, { targetSubpriority: 2 });
    expect(player.petals).toHaveLength(13);
    expect(opponent.petals).toHaveLength(13);
    expect(player.petals.find((petal) => petal.index === 0)).toBeUndefined();
    expect(player.petals[0]).toMatchObject({ x: 240, y: 22, x2: 0, callback: "AnimSweetScentPetal_Step" });
    expect(opponent.petals[0]).toMatchObject({ x: 0, y: 88, x2: 0, callback: "AnimSweetScentPetal_Step" });
    expect(player.sound).toBe(null);
    expect(sweetScentAtAge(75, "player", { x: 72, y: 90 }).blend.active).toBe(true);
    const first = sweetScentAtAge(0, "player", { x: 72, y: 90 });
    expect(first.petals[0]).toMatchObject({ x: 5, y: 99, x2: 0, y2: 1, callback: "AnimSweetScentPetal" });
    expect(first.petals[0]?.animFrame).toBe(0);
    expect(sweetScentAtAge(7, "player", { x: 72, y: 90 }).petals[0]?.animFrame).toBe(1);
    const final = sweetScentAtAge(SWEET_SCENT_FIRST_INACTIVE_AGE, "player", { x: 72, y: 90 });
    expect(final.active).toBe(false);
    expect(final.resources.loaded).toBe(false);
    expect(final.petals).toHaveLength(0);
    expect(SWEET_SCENT_FRAME_COUNT).toBe(SWEET_SCENT_FIRST_INACTIVE_AGE + 1);
  });

  it("uses the ordinary typed live species/side/geometry seam without a carrier gate", () => {
    const config = createSceneOnMovePresentation({
      move: "SWEET_SCENT",
      attacker: battler("player", "SURSKIT"),
      target: battler("opponent", "ONIX"),
      fieldProfile,
      animationProfile: { spriteSlots: Array.from({ length: 24 }, (_, index) => index), targetSubpriority: 2 },
    });
    const view = sceneOnSweetScentView({ ...config, age: 0 });
    expect(view.attacker.species).toBe("SURSKIT");
    expect(view.target.species).toBe("ONIX");
    expect(view.petals[0]).toMatchObject({ x: 5, y: 99, animNum: 0 });
    expect(view.soundPanSide).toBe("player");
    expect(SWEET_SCENT_BLEND_TIMING.legs).toHaveLength(5);
  });

  it("keeps the reusable evidence checkpoint honest and outside exact coverage", () => {
    expect(checkpoint).toMatchObject({
      move: "MOVE_SWEET_SCENT",
      status: "unsupported-source-checkpoint",
      coverageCredit: false,
      source: { interval: { bytes: 234 }, expandedCreates: 24 },
      reducer: { sourceRelativeRows: 166, firstInactiveAge: 165, peakLivePetals: 13 },
      evidence: {
        stagedBothOrientations: true,
        freshOracleRuns: 2,
        denseStateRetained: true,
        rawRgbRetained: true,
        normalizedChangeMapsRetained: true,
        productionFramebufferCompared: false,
        zeroResidual: false,
      },
    });
    for (const orientation of checkpoint.orientations) {
      const stage = JSON.parse(readFileSync(orientation.scenario, "utf8"));
      expect(stage).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(stage.overrides.parties.player).toHaveLength(3);
      expect(stage.overrides.parties.opponent).toHaveLength(3);
      expect(stage.trace.segments.every((segment: any) => segment.frames > 0)).toBe(true);
      for (const mon of [...stage.overrides.parties.player, ...stage.overrides.parties.opponent]) {
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
      }
    }
  });

  it("replays both complete twice-fresh pointer windows and measures the own display edge", () => {
    const result = verifySweetScentEvidence();
    expect(result["player-back"]).toMatchObject({ pointerRows: 175, reducerRows: 166, typedSeamRows: 166, petalCreates: 24, peakPetals: 13, firstPetalRamRow: 4, firstPetalDisplayRow: 5, firstInactiveScriptRow: 174, latches: { oam: "174/174", matrices: "174/174", palette: "174/174", paletteSameRow: "0/174" }, framebufferCompared: true });
    expect(result["opponent-front"]).toMatchObject({ pointerRows: 175, reducerRows: 166, typedSeamRows: 166, petalCreates: 24, peakPetals: 13, firstPetalRamRow: 4, firstPetalDisplayRow: 5, firstInactiveScriptRow: 174, latches: { oam: "174/174", matrices: "174/174", palette: "174/174", paletteSameRow: "0/174" }, framebufferCompared: true });
  });
});
