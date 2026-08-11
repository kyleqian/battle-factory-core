import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const flying = read("reference/pokeemerald/src/battle_anim_flying.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
) as {
  tiers: {
    level50: {
      moves: readonly {
        move: string; id: number; exampleMons: readonly string[];
      }[];
    };
  };
};

function block(label: string, nextLabel: string): string {
  const start = scripts.indexOf(`${label}:`);
  const end = scripts.indexOf(`${nextLabel}:`, start + label.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${label}/${nextLabel}`);
  return scripts.slice(start, end);
}

const body = block("Move_WHIRLWIND", "Move_CONFUSE_RAY");
const drillPeck = block("Move_DRILL_PECK", "Move_WATERFALL");
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_BUTTERFREE]"),
  mons.indexOf("[FRONTIER_MON_BUTTERFREE]") + 600,
);
const move = inventory.tiers.level50.moves.find(
  (entry) => entry.move === "MOVE_WHIRLWIND",
);
const required = [
  "loadspritegfx ANIM_TAG_WHIRLWIND_LINES",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 15, 1",
  "createvisualtask AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_TARGET, 12, 6, 1, 5",
  "createvisualtask AnimTask_SlideOffScreen, 5, ANIM_TARGET, 8",
  "loopsewithpan SE_M_DOUBLE_TEAM, SOUND_PAN_TARGET, 10, 4",
  "playsewithpan SE_M_STRING_SHOT, SOUND_PAN_TARGET",
];

if (
  !move || move.id !== 18
  || move.exampleMons[0] !== "FRONTIER_MON_BUTTERFREE"
  || !constants.includes("#define FRONTIER_MON_BUTTERFREE")
  || !carrier.includes(".species = SPECIES_BUTTERFREE")
  || !carrier.includes(
    ".moves = {MOVE_SILVER_WIND, MOVE_PSYBEAM, MOVE_TOXIC, MOVE_WHIRLWIND}",
  )
  || !carrier.includes("BATTLE_FRONTIER_ITEM_PECHA_BERRY")
  || !carrier.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !carrier.includes("NATURE_QUIRKY")
  || required.some((text) => !body.includes(text))
  || (body.match(/gWhirlwindLineSpriteTemplate/g) ?? []).length !== 6
  || !flying.includes("const struct SpriteTemplate gWhirlwindLineSpriteTemplate")
  || !flying.includes(".callback = AnimWhirlwindLine")
  || !flying.includes("sprite->data[1] = 0x0ccc")
  || !movement.includes("void AnimTask_TranslateMonEllipticalRespectSide")
  || !movement.includes("void AnimTask_SlideOffScreen")
  || !graphics.includes(
    'INCGFX_U32("graphics/battle_anims/sprites/whirlwind_lines.png", ".4bpp.lz")',
  )
) {
  throw new Error("Whirlwind/WHIRLWIND_LINES source contract changed");
}

for (const text of [
  "loadspritegfx ANIM_TAG_WHIRLWIND_LINES",
  "createvisualtask AnimTask_DrillPeckHitSplats, 5",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 18, 1",
  "loopsewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 4, 8",
]) {
  if (!drillPeck.includes(text)) {
    throw new Error(`DRILL_PECK sibling contract lost ${text}`);
  }
}

console.log(JSON.stringify({
  carrier:
    "set 153 FRONTIER_MON_BUTTERFREE / SPECIES_BUTTERFREE / MOVE_WHIRLWIND",
  whirlwindLines: 6,
  components: [
    "asset:ANIM_TAG_WHIRLWIND_LINES",
    "sprite:gWhirlwindLineSpriteTemplate",
    "task:AnimTask_ShakeMon2",
    "task:AnimTask_SlideOffScreen",
    "task:AnimTask_TranslateMonEllipticalRespectSide",
  ],
  sibling: {
    move: "MOVE_DRILL_PECK",
    remainder:
      "independent BowMon body, AnimTask_DrillPeckHitSplats, IMPACT sprites, looped sound, ShakeMon2, and dense acceptance",
  },
}));
