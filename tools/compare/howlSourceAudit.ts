import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const sound = read("reference/pokeemerald/src/battle_anim_sound_tasks.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const monConstants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const species = read("reference/pokeemerald/include/constants/species.h");
const moveConstants = read("reference/pokeemerald/include/constants/moves.h");
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const howl = block(scripts, "Move_HOWL", "Move_BULK_UP");
const roar = block(scripts, "Move_ROAR", "RoarEffect");
const roarEffect = block(scripts, "RoarEffect", "Move_GROWL");
const loudred = mons.slice(
  mons.indexOf("[FRONTIER_MON_LOUDRED]"),
  mons.indexOf("[FRONTIER_MON_LOUDRED]") + 500,
);
const howlInventory = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_HOWL",
);
const roarInventory = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_ROAR",
);

const requiredHowl = [
  "loadspritegfx ANIM_TAG_NOISE_LINE",
  "createvisualtask AnimTask_DeepInhale, 2, ANIM_ATTACKER",
  "delay 12",
  "call RoarEffect",
  "createvisualtask SoundTask_PlayCryHighPitch, 2, ANIM_ATTACKER, 3",
  "waitforvisualfinish",
  "delay 30",
];
const requiredRoar = [
  "monbg ANIM_ATTACKER",
  "splitbgprio ANIM_ATTACKER",
  "setalpha 8, 8",
  "SoundTask_PlayDoubleCry",
  "AnimTask_ScaleMonAndRestore",
  "AnimTask_SlideOffScreen",
  "clearmonbg ANIM_ATTACKER",
  "blendoff",
  "SoundTask_WaitForCry",
];
if (
  !howlInventory || howlInventory.id !== 336
  || howlInventory.exampleMons[0] !== "FRONTIER_MON_LOUDRED"
  || !roarInventory || roarInventory.id !== 46
  || !monConstants.includes("#define FRONTIER_MON_LOUDRED        144")
  || !species.includes("#define SPECIES_LOUDRED 371")
  || !moveConstants.includes("#define MOVE_HOWL 336")
  || !loudred.includes(".species = SPECIES_LOUDRED")
  || !loudred.includes(
    ".moves = {MOVE_STOMP, MOVE_HOWL, MOVE_ASTONISH, MOVE_SUPERSONIC}",
  )
  || !loudred.includes("BATTLE_FRONTIER_ITEM_FOCUS_BAND")
  || !loudred.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !loudred.includes("NATURE_RELAXED")
  || requiredHowl.some((text) => !howl.includes(text))
  || requiredRoar.some((text) => !roar.includes(text))
  || (roarEffect.match(/gRoarNoiseLineSpriteTemplate/g) ?? []).length !== 6
  || !effects.includes("const union AffineAnimCmd gDeepInhaleAffineAnimCmds[]")
  || !effects.includes("AFFINEANIMCMD_FRAME(16, 0, 0, 4)")
  || !effects.includes("AFFINEANIMCMD_FRAME(0, -3, 0, 16)")
  || !effects.includes("AFFINEANIMCMD_FRAME(4, 0, 0, 4)")
  || !effects.includes("AFFINEANIMCMD_FRAME(0, 0, 0, 24)")
  || !effects.includes("AFFINEANIMCMD_FRAME(-5, 3, 0, 16)")
  || !effects.includes(".callback = AnimRoarNoiseLine")
  || !effects.includes("if (++sprite->data[5] == 14)")
  || !sound.includes("void SoundTask_PlayCryHighPitch")
  || !sound.includes("PlayCry_ByMode(species, pan, CRY_MODE_HIGH_PITCH)")
) throw new Error("Howl/NOISE_LINE source contract changed");

console.log(
  "set 144/FRONTIER_MON_LOUDRED -> SPECIES_LOUDRED 371/MOVE_HOWL 336/"
  + "FOCUS_BAND/ATTACK+HP/RELAXED; Howl owns DeepInhale, six "
  + "gRoarNoiseLineSpriteTemplate lifecycles, high-pitch cry, waits and "
  + "cleanup; MOVE_ROAR remains distinct with ScaleMonAndRestore, "
  + "SlideOffScreen, double-cry/wait, monbg/splitbgprio/alpha choreography",
);
