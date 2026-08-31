import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(new URL("../..", import.meta.url).pathname);
const audit = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/swiftSourceAudit.ts",
], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

describe("MOVE_SWIFT source/staging checkpoint", () => {
  it("pins the exclusive source interval, all eight graph components, lowest legal carrier, side branches, callbacks, audio, cleanup, and independent controls", () => {
    expect(audit()).toEqual({
      move: "MOVE_SWIFT",
      moveId: 129,
      sourceBounds: { start: "0x082c97a9", endExclusive: "0x082c9862", bytes: "0xb9", sha256: "e147ce5f87abbaec77139982f5f09cc62026b5144cb282cfa8ac5b11364532da" },
      sourceText: { bytes: 1326, sha256: "ad929378372e5300d56e3b84acdbee4a552fde3d1f6026c398968ba98f981b14", commandRows: 24 },
      carrier: {
        firstLevel50: "set 128 FRONTIER_MON_STARYU / SPECIES_STARYU / MOVE_SWIFT",
        excludedOutOfTier: "sets 24 FRONTIER_MON_ZIGZAGOON and 89 FRONTIER_MON_CYNDAQUIL precede the Level-50 inventory range 110..849",
        remainingLevel50: [128, 143, 181, 225, 228, 396],
      },
      components: [
        "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_YELLOW_STAR", "task:AnimTask_ShakeMon2",
        "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_swift_star_sprite",
        "visualCommand:monbg", "visualCommand:setalpha",
      ],
      sideAndBranches: {
        rootBranches: 0,
        targetBoth: "all five stars pass target_both=TRUE; SetAverageBattlerPositions uses the target/partner average in doubles and the target coordinate in singles",
        attackerMirror: "AnimTranslateLinearSingleSineWave negates target_x when the attacker is not on the player side",
        sameSide: "the callback selects its same-side arc mode when attacker and target sides match; both legal stages intentionally keep them opposed",
        targetShake: "AnimTask_ShakeMon2(ANIM_TARGET, 2, 0, 18, 1)",
        partnerShake: "AnimTask_ShakeMon2(ANIM_DEF_PARTNER, 2, 0, 18, 1); it aborts in a singles stage with no visible defender partner",
        monbg: "monbg/clearmonbg ANIM_DEF_PARTNER route through the target and conditionally include its visible partner",
      },
      callbacks: {
        star: "gSwiftStarSpriteTemplate is an affine-normal 32x32 YELLOW_STAR with a one-frame identity affine loop and AnimTranslateLinearSingleSineWave; the callback either destroys on flicker completion or off-screen bounds",
        shake: "AnimTask_ShakeMon2 writes the initial x2/y2, alternates signed offsets through count 18/delay 1, returns both axes to zero, and destroys its visual task",
      },
      audio: { song: "SE_M_SWIFT", songId: 206, calls: 5, pan: "SOUND_PAN_ATTACKER" },
      resources: {
        loaded: ["ANIM_TAG_YELLOW_STAR", "ANIM_TAG_IMPACT"],
        cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"],
        explicitUnload: false,
      },
      artIdentity: {
        yellowStar: "graphics/battle_anims/sprites/yellow_star.png is the exact ANIM_TAG_YELLOW_STAR source asset; no generated Yellow Star asset exists and no production art is added or reused by this checkpoint",
        impact: "existing src/assets/gen/battle-anim-hitsplat.json is source-identical to graphics/battle_anims/sprites/impact.png / ANIM_TAG_IMPACT, but Swift only loads that tag here and no production art is reused",
      },
      checkpoint: { coverageEntry: null, derivedStatus: "unsupported", track: "swift-stars-source-staging", fulfilled: false },
      controls: {
        moves: ["MOVE_ANCIENT_POWER", "MOVE_METEOR_MASH", "MOVE_MAGICAL_LEAF"],
        statuses: ["exact", "exact", "exact"],
        independence: "Swift receives no credit; exact controls retain independent acceptance.",
      },
    });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-swift-player-staryu-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-swift-opponent-staryu-player-onix.json", false],
  ])("keeps the %s lowest-carrier stage complete, legal-shaped, transient-free, and choice-constrained", (_orientation, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, seed: 305419897 });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const target = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    expect(attacker).toHaveLength(3); expect(target).toHaveLength(3);
    for (const mon of [...attacker, ...target]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
      expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "outcome", "volatile"]) {
        expect(mon).not.toHaveProperty(transient);
      }
    }
    expect(attacker[0]).toMatchObject({ species: 120, level: 50, nature: 24, item: 219, gender: "genderless", moves: [129, 129, 129, 129] });
    expect(target[0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
  });
});
