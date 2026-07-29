import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const script = read("reference/pokeemerald/data/battle_anim_scripts.s");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_FOLLOW_ME",
);
const body = script.slice(
  script.indexOf("Move_FOLLOW_ME:"),
  script.indexOf("Move_CHARGE:"),
);
const togetic = mons.slice(
  mons.indexOf("[FRONTIER_MON_TOGETIC_1]"),
  mons.indexOf("[FRONTIER_MON_TOGETIC_1]") + 500,
);

if (
  !move || move.id !== 266 || move.frontierMonCount !== 5
  || move.exampleMons[0] !== "FRONTIER_MON_TOGETIC_1"
  || !constants.includes("#define FRONTIER_MON_TOGETIC_1      183")
  || !species.includes("#define SPECIES_TOGETIC 176")
  || !togetic.includes(".species = SPECIES_TOGETIC")
  || !togetic.includes("MOVE_FOLLOW_ME")
  || !togetic.includes("BATTLE_FRONTIER_ITEM_LAX_INCENSE")
  || !togetic.includes("F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP")
  || !togetic.includes("NATURE_RELAXED")
  || !body.includes("loadspritegfx ANIM_TAG_FINGER")
  || !body.includes("gFollowMeFingerSpriteTemplate")
  || !body.includes("SE_M_ATTRACT")
  || !body.includes("SE_M_TAIL_WHIP")
  || !effects.includes(".callback = AnimFollowMeFinger")
  || !effects.includes("sprite->y = GetBattlerSpriteCoordAttr(battler, BATTLER_COORD_ATTR_TOP)")
  || !effects.includes("if (++sprite->data[4] > 12)")
  || !effects.includes("sprite->callback = AnimMetronomeFinger_Step")
) throw new Error("Follow Me/FINGER source contract changed");

console.log(
  "lowest Level-50 carrier set 183/FRONTIER_MON_TOGETIC_1 -> "
  + "SPECIES_TOGETIC 176/move 266/LAX_INCENSE/DEFENSE+HP/RELAXED; "
  + "gFollowMeFingerSpriteTemplate/AnimFollowMeFinger; top-center, "
  + "13-frame delay, sine/subpriority traversal, shared Metronome terminal",
);
