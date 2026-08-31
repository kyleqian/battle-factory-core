import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const audit = () => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/trickSourceAudit.ts",
], { encoding: "utf8" }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

describe("MOVE_TRICK source/staging checkpoint", () => {
  it("pins the pointer-owned ROM interval, carrier, components, resource-only SPEED_DUST, and independent controls", () => {
    expect(audit()).toEqual({
      move: "MOVE_TRICK",
      sourceBounds: { start: "0x082d486e", endExclusive: "0x082d48ec", bytes: "0x7e" },
      carrier: "set 304 FRONTIER_MON_FURRET_2 / SPECIES_FURRET / MOVE_TRICK",
      components: [
        "asset:ANIM_TAG_ITEM_BAG", "asset:ANIM_TAG_SPEED_DUST", "task:AnimTask_ShakeMon",
        "task:AnimTask_StretchAttackerUp", "task:AnimTask_StretchTargetUp", "visualCommand:create_trick_bag_sprite",
      ],
      resources: {
        itemBag: "reused covet.json identity: item_bag.png / tag 10224",
        speedDust: "reused battle-anim-extreme-speed.json identity: speed_dust.png / tag 10207; resource-only in Move_TRICK",
      },
      controls: {
        moves: ["MOVE_PRESENT", "MOVE_COVET", "MOVE_EXTREME_SPEED", "MOVE_FAKE_OUT", "MOVE_ASTONISH", "MOVE_SAND_TOMB"],
        statuses: ["exact", "exact", "exact", "exact", "exact", "exact"],
        independence: "Controls are checked only; MOVE_TRICK alone may receive future credit.",
      },
    });
  });

  it.each([
    ["player-back", "tools/compare/fixtures/trick-player-furret-opponent-chansey.json", true],
    ["opponent-front", "tools/compare/fixtures/trick-opponent-furret-player-chansey.json", false],
  ])("keeps the %s party stage complete, legal-shaped, transient-free, and item-swappable", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(path, "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2, battleNum: 2, trainerId: 110 });
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
    expect(attacker[0]).toMatchObject({ species: 162, level: 50, item: 186 });
    expect(target[0]).toMatchObject({ species: 242, level: 50, item: 200 });
    expect(playerAttacker ? attacker[0].moves[0] : attacker[0].moves).toEqual(playerAttacker ? 271 : [271, 271, 271, 271]);
  });
});
