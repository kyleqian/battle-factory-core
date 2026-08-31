import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const audit = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/rockBlastSourceAudit.ts",
], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }));

const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

describe("MOVE_ROCK_BLAST source/staging checkpoint", () => {
  it("pins the pointer-owned source, eligible Rhyhorn carrier, generated components, multi-hit boundary, and independent controls", () => {
    expect(audit()).toEqual({
      move: "MOVE_ROCK_BLAST",
      sourceBounds: { start: "0x082d65f7", endExclusive: "0x082d6694", bytes: "0x9d" },
      sourceText: { bytes: 860, sha256: "42acd62b1a932dada9c90efddc72b12231930c4cf6e7fc97869b82c288f112c5", commandRows: 15 },
      carrier: {
        firstLevel50: "set 133 FRONTIER_MON_RHYHORN / SPECIES_RHYHORN / MOVE_ROCK_BLAST",
        excludedOutOfTier: "set 70 FRONTIER_MON_GEODUDE is before the Level-50 inventory range 110..849",
        remainingLevel50: [133, 256],
      },
      components: [
        "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_ROCKS", "sprite:gHorizontalLungeSpriteTemplate",
        "sprite:gRockBlastRockSpriteTemplate", "sprite:gRockFragmentSpriteTemplate", "task:AnimTask_ShakeMon",
        "visualCommand:create_basic_hitsplat_sprite",
      ],
      multiHit: {
        effect: "EFFECT_MULTI_HIT",
        ownership: "Evidence captures one first pointer-owned Move_ROCK_BLAST body through its first inactive cleanup; later hit bodies and battle outcome are excluded.",
      },
      artIdentity: {
        rocks: "existing battle-anim-rocks.json is the same ANIM_TAG_ROCKS source asset, but its BasicRock cells 0/1/5 remain explicitly undecoded; no production art is reused by this checkpoint",
        impact: "ANIM_TAG_IMPACT is source-identified only; no production compositor is added",
      },
      checkpoint: { coverageEntry: null, derivedStatus: "unsupported", track: "rock-blast-first-body", fulfilled: false },
      controls: {
        moves: ["MOVE_ROCK_THROW", "MOVE_ROCK_TOMB", "MOVE_ANCIENT_POWER"],
        statuses: ["exact", "exact", "exact"],
        independence: "Rock Blast receives no credit; exact controls retain independent acceptance.",
      },
    });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-rock-blast-player-rhyhorn-opponent-shuckle.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-rock-blast-opponent-rhyhorn-player-shuckle.json", false],
  ])("keeps the %s stage complete, legal-shaped, transient-free, and choice-constrained", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(path, "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, seed: 305419897 });
    expect(stage.trace.captureFrames).toEqual([0, 534]);
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
    expect(attacker[0]).toMatchObject({ species: 111, level: 50, moves: [350, 350, 350, 350] });
    expect(target[0]).toMatchObject({ species: 213, level: 50, moves: [33, 33, 33, 33] });
  });
});
