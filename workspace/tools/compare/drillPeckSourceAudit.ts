import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const flying = read("reference/pokeemerald/src/battle_anim_flying.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json")) as {
  tiers: { level50: { moves: readonly { move: string; id: number; exampleMons: readonly string[] }[] } };
};

function block(label: string, nextLabel: string): string {
  const start = scripts.indexOf(`${label}:`);
  const end = scripts.indexOf(`${nextLabel}:`, start + label.length + 1);
  if (start < 0 || end < 0) throw new Error(`missing ${label}/${nextLabel}`);
  return scripts.slice(start, end);
}

function definition(label: string): string {
  const marker = `[${label}]`;
  const start = mons.indexOf(marker);
  if (start < 0) throw new Error(`missing ${label}`);
  return mons.slice(start, mons.indexOf("    },", start) + 6);
}

const body = block("Move_DRILL_PECK", "Move_WATERFALL");
const move = inventory.tiers.level50.moves.find((entry) => entry.move === "MOVE_DRILL_PECK");
const nm = execFileSync("arm-none-eabi-nm", ["-a", "reference/pokeemerald/pokeemerald.elf"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const symbols = new Map(
  nm.split("\n").flatMap((line) => {
    const parts = line.trim().split(/\s+/);
    return parts.length === 3 ? [[parts[2]!, Number.parseInt(parts[0]!, 16)] as const] : [];
  }),
);

const required = [
  "loadspritegfx ANIM_TAG_IMPACT",
  "loadspritegfx ANIM_TAG_WHIRLWIND_LINES",
  "createsprite gBowMonSpriteTemplate, ANIM_ATTACKER, 2, 0",
  "playsewithpan SE_M_HEADBUTT, SOUND_PAN_ATTACKER",
  "waitforvisualfinish",
  "delay 2",
  "createsprite gBowMonSpriteTemplate, ANIM_ATTACKER, 2, 1",
  "loopsewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 4, 8",
  "createvisualtask AnimTask_DrillPeckHitSplats, 5",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 18, 1",
  "createsprite gBowMonSpriteTemplate, ANIM_ATTACKER, 2, 2",
  "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 6",
  "end",
];
if (!move || move.id !== 65 || move.exampleMons[0] !== "FRONTIER_MON_FEAROW_1") {
  throw new Error("Drill Peck inventory contract changed");
}
if (required.some((text) => !body.includes(text))) {
  throw new Error("Drill Peck script body changed");
}
if ((body.match(/gBowMonSpriteTemplate/g) ?? []).length !== 3) {
  throw new Error("Drill Peck must have exactly three BowMon phases");
}
const fearow = definition("FRONTIER_MON_FEAROW_1");
if (
  !constants.includes("#define FRONTIER_MON_FEAROW_1       375")
  || !fearow.includes(".species = SPECIES_FEAROW")
  || !fearow.includes(".moves = {MOVE_DRILL_PECK, MOVE_TRI_ATTACK, MOVE_FACADE, MOVE_MUD_SLAP}")
  || !fearow.includes("BATTLE_FRONTIER_ITEM_SHARP_BEAK")
  || !fearow.includes("F_EV_SPREAD_SPEED | F_EV_SPREAD_ATTACK")
  || !fearow.includes("NATURE_ADAMANT")
) throw new Error("lowest legal Fearow set contract changed");
for (const text of [
  "const struct SpriteTemplate gBowMonSpriteTemplate",
  ".callback = AnimBowMon",
  "void AnimTask_DrillPeckHitSplats",
  "CreateSpriteAndAnimate(&gFlashingHitSplatSpriteTemplate",
  "const struct SpriteTemplate gFlashingHitSplatSpriteTemplate",
  "const struct SpriteTemplate gSlideMonToOriginalPosSpriteTemplate",
  "void AnimTask_ShakeMon2",
]) {
  if (![effects, flying, normal, movement].some((source) => source.includes(text))) {
    throw new Error(`component source missing ${text}`);
  }
}

console.log(JSON.stringify({
  move: "MOVE_DRILL_PECK",
  sourceBounds: {
    start: `0x${(symbols.get("Move_DRILL_PECK")! & ~1).toString(16)}`,
    endExclusive: `0x${(symbols.get("Move_WATERFALL")! & ~1).toString(16)}`,
  },
  carrier: "set 375 FRONTIER_MON_FEAROW_1 / SPECIES_FEAROW / MOVE_DRILL_PECK",
  components: [
    "asset:ANIM_TAG_IMPACT",
    "asset:ANIM_TAG_WHIRLWIND_LINES",
    "sprite:gBowMonSpriteTemplate",
    "sprite:gSlideMonToOriginalPosSpriteTemplate",
    "task:AnimTask_DrillPeckHitSplats",
    "task:AnimTask_ShakeMon2",
  ],
  controls: {
    MOVE_HEADBUTT: "all three gBowMonSpriteTemplate phases",
    MOVE_WHIRLWIND: "ANIM_TAG_WHIRLWIND_LINES",
    MOVE_SLAM: "gSlideMonToOriginalPosSpriteTemplate/IMPACT/ShakeMon2 nearest exact control",
  },
}));
