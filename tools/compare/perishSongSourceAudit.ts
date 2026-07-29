import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_2.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const monConstants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const perish = block(scripts, "Move_PERISH_SONG", "Move_SLEEP_TALK");
const healBell = block(scripts, "Move_HEAL_BELL", "HealBellRing");
const carrier = mons.slice(
  mons.indexOf("[FRONTIER_MON_MURKROW_2]"),
  mons.indexOf("[FRONTIER_MON_MURKROW_2]") + 500,
);
const perishInventory = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_PERISH_SONG",
);
const healBellInventory = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_HEAL_BELL",
);
const requiredPerish = [
  "loadspritegfx ANIM_TAG_MUSIC_NOTES_2",
  "gPerishSongMusicNote2SpriteTemplate",
  "panse SE_M_PERISH_SONG",
  "simple_palette_blend selector=F_PAL_BG",
  "set_grayscale_pal battler=ANIM_PLAYER_LEFT",
  "set_grayscale_pal battler=ANIM_OPPONENT_LEFT",
  "set_original_pal battler=ANIM_PLAYER_LEFT",
  "set_original_pal battler=ANIM_OPPONENT_LEFT",
  "waitforvisualfinish",
];
const requiredHealBell = [
  "loadspritegfx ANIM_TAG_BELL",
  "loadspritegfx ANIM_TAG_MUSIC_NOTES_2",
  "loadspritegfx ANIM_TAG_THIN_RING",
  "AnimTask_LoadMusicNotesPals",
  "gBellSpriteTemplate",
  "gHealBellMusicNoteSpriteTemplate",
  "call HealBellRing",
  "AnimTask_FreeMusicNotesPals",
  "unloadspritegfx ANIM_TAG_MUSIC_NOTES_2",
  "loadspritegfx ANIM_TAG_SPARKLE_2",
  "gSparklingStarsSpriteTemplate",
  "AnimTask_BlendBattleAnimPalExclude",
  "gBlendThinRingExpandingSpriteTemplate",
];
if (
  !perishInventory || perishInventory.id !== 195
  || perishInventory.exampleMons[0] !== "FRONTIER_MON_MURKROW_2"
  || !healBellInventory || healBellInventory.id !== 215
  || !monConstants.includes("#define FRONTIER_MON_MURKROW_2      289")
  || !carrier.includes(".species = SPECIES_MURKROW")
  || !carrier.includes(
    ".moves = {MOVE_PERISH_SONG, MOVE_MEAN_LOOK, MOVE_DOUBLE_TEAM, MOVE_THUNDER_WAVE}",
  )
  || !carrier.includes("BATTLE_FRONTIER_ITEM_BRIGHT_POWDER")
  || !carrier.includes(
    "F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP",
  )
  || !carrier.includes("NATURE_QUIRKY")
  || requiredPerish.some((text) => !perish.includes(text))
  || (perish.match(/gPerishSongMusicNoteSpriteTemplate/g) ?? []).length !== 16
  || requiredHealBell.some((text) => !healBell.includes(text))
  || (healBell.match(/gHealBellMusicNoteSpriteTemplate/g) ?? []).length !== 12
  || !effects.includes(".callback = AnimPerishSongMusicNote")
  || !effects.includes(".callback = AnimPerishSongMusicNote2")
  || !effects.includes("sprite->x2 = Cos(index, 100)")
  || !effects.includes(
    "sprite->y2 = sprite->data[1] + Sin(index, 10) + Cos(sprite->data[6], 4)",
  )
  || !effects.includes("SetGrayscaleOrOriginalPalette(sprite->oam.paletteNum + 16, FALSE)")
  || !animData.includes(
    "{gBattleAnimSpriteGfx_MusicNotes2, 0x0800, ANIM_TAG_MUSIC_NOTES_2}",
  )
  || !animData.includes(
    "{gBattleAnimSpritePal_MusicNotes2, ANIM_TAG_MUSIC_NOTES_2}",
  )
) throw new Error("Perish Song/MUSIC_NOTES_2 source contract changed");

console.log(
  "set 289/FRONTIER_MON_MURKROW_2 -> SPECIES_MURKROW 198/"
  + "MOVE_PERISH_SONG 195/BRIGHT_POWDER/HP+DEFENSE+SP_DEFENSE/QUIRKY; "
  + "Perish Song owns 16 gPerishSongMusicNoteSpriteTemplate lifecycles, "
  + "one gPerishSongMusicNote2SpriteTemplate palette sentinel, panse, BG "
  + "black fades, grayscale/original battler palette restoration and cleanup; "
  + "MOVE_HEAL_BELL remains distinct with bell, palette load/free, 12 note "
  + "paths, three ring macros, stars, blend-exclude tasks and tag reloads",
);
