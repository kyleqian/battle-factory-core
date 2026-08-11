import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
const address = (symbol: string) =>
  Number.parseInt(
    nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"))?.[1] ??
      "0",
    16,
  );
const block = scripts.slice(
  scripts.indexOf("Move_GUILLOTINE:"),
  scripts.indexOf("Move_PAY_DAY:"),
);
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_GLIGAR_2]"),
  mons.indexOf("[FRONTIER_MON_QWILFISH_2]"),
);
const move = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_GUILLOTINE",
);
const components = graph.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_GUILLOTINE",
);
const expected = [
  "asset:ANIM_TAG_CUT",
  "asset:ANIM_TAG_IMPACT",
  "sprite:gGuillotineSpriteTemplate",
  "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_ShakeMon2",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:complex_palette_blend",
  "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:fadetobgfromset",
  "visualCommand:monbg",
  "visualCommand:restorebg",
  "visualCommand:setalpha",
  "visualCommand:waitbgfadein",
];
const rows = [
  "loadspritegfx ANIM_TAG_CUT",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "setalpha 12, 8",
  "fadetobgfromset BG_GUILLOTINE_OPPONENT, BG_GUILLOTINE_PLAYER, BG_GUILLOTINE_CONTESTS",
  "createsprite gGuillotineSpriteTemplate, ANIM_ATTACKER, 2, 0",
  "createsprite gGuillotineSpriteTemplate, ANIM_ATTACKER, 2, 1",
  "createvisualtask AnimTask_BlendBattleAnimPal",
  "createvisualtask AnimTask_ShakeMon2",
  "create_basic_hitsplat_sprite",
  "complex_palette_blend",
  "restorebg",
  "end",
];

if (
  address("Move_GUILLOTINE") !== 0x082cb829 ||
  address("Move_PAY_DAY") !== 0x082cb8b5 ||
  address("gGuillotineSpriteTemplate") !== 0x085935d0 ||
  address("AnimGuillotinePincer") !== 0x08104414 ||
  address("AnimGuillotinePincer_Step1") !== 0x081044bc ||
  address("AnimGuillotinePincer_Step2") !== 0x08104530 ||
  address("AnimGuillotinePincer_Step3") !== 0x08104594 ||
  address("AnimTask_BlendBattleAnimPal") !== 0x08116620 ||
  address("AnimTask_ShakeMon2") !== 0x080d52d0 ||
  address("gBasicHitSplatSpriteTemplate") !== 0x08597358 ||
  address("gBattleAnimSpriteGfx_Cut") !== 0x08c1ab40 ||
  address("gBattleAnimSpriteGfx_Impact") !== 0x08c1a3a0 ||
  address("gBattleAnimSpritePal_Impact") !== 0x08c1a478 ||
  rows.some((row) => !block.includes(row)) ||
  !effects.includes(
    "static void AnimGuillotinePincer(struct Sprite *sprite)",
  ) ||
  !effects.includes("if (++sprite->data[4] == 51)") ||
  move?.id !== 12 ||
  move.frontierMonCount !== 4 ||
  JSON.stringify(components?.componentIds) !== JSON.stringify(expected) ||
  !constants.includes("#define FRONTIER_MON_GLIGAR_2       315") ||
  !carrier.includes(".species = SPECIES_GLIGAR") ||
  !carrier.includes(
    ".moves = {MOVE_EARTHQUAKE, MOVE_AERIAL_ACE, MOVE_GUILLOTINE, MOVE_SCREECH}",
  ) ||
  !carrier.includes("BATTLE_FRONTIER_ITEM_QUICK_CLAW") ||
  !carrier.includes("NATURE_ADAMANT")
)
  throw new Error("MOVE_GUILLOTINE source/carrier/component contract changed");

console.log(
  "Move_GUILLOTINE exclusive pointer interval 0x082cb829..0x082cb8b5 (0x8c bytes); complete 14-component CUT/IMPACT/pincer/background/palette/ShakeMon2/hitsplat graph; lowest legal Level-50 carrier set 315 FRONTIER_MON_GLIGAR_2",
);
