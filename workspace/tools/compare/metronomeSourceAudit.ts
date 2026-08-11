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
  (entry: { move: string }) => entry.move === "MOVE_METRONOME",
);
const body = script.slice(
  script.indexOf("Move_METRONOME:"),
  script.indexOf("Move_SKULL_BASH:"),
);
const chansey = mons.slice(
  mons.indexOf("[FRONTIER_MON_CHANSEY_1]"),
  mons.indexOf("[FRONTIER_MON_CHANSEY_1]") + 500,
);

if (
  !move || move.id !== 118 || move.frontierMonCount !== 2
  || !constants.includes("#define FRONTIER_MON_CHANSEY_1      227")
  || !species.includes("#define SPECIES_CHANSEY 113")
  || !chansey.includes(".species = SPECIES_CHANSEY")
  || !chansey.includes("MOVE_METRONOME")
  || !body.includes("loadspritegfx ANIM_TAG_FINGER")
  || !body.includes("loadspritegfx ANIM_TAG_THOUGHT_BUBBLE")
  || !body.includes("gThoughtBubbleSpriteTemplate")
  || !body.includes("gMetronomeFingerSpriteTemplate")
  || !body.includes("SE_M_METRONOME")
  || !body.includes("SE_M_TAIL_WHIP")
  || !effects.includes("static void AnimThoughtBubble(struct Sprite *sprite)")
  || !effects.includes("static void AnimMetronomeFinger(struct Sprite *sprite)")
  || !effects.includes("gFollowMeFingerSpriteTemplate")
  || !effects.includes("static void AnimFollowMeFinger(struct Sprite *sprite)")
) throw new Error("Metronome/Finger source contract changed");

console.log(
  "set 227/FRONTIER_MON_CHANSEY_1 -> SPECIES_CHANSEY 113/move 118; "
  + "THOUGHT_BUBBLE + FINGER; AnimThoughtBubble; AnimMetronomeFinger; "
  + "SE_M_METRONOME + looped SE_M_TAIL_WHIP; Follow Me sibling has "
  + "gFollowMeFingerSpriteTemplate/AnimFollowMeFinger and distinct top-center "
  + "sine/subpriority lifecycle with SE_M_ATTRACT",
);
