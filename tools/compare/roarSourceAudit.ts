import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const sound = read("reference/pokeemerald/src/battle_anim_sound_tasks.c");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const monConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const species = read("reference/pokeemerald/include/constants/species.h");
const moves = read("reference/pokeemerald/include/constants/moves.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));

function block(source: string, start: string, end: string): string {
  const from = source.indexOf(`${start}:`);
  const to = source.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return source.slice(from, to);
}

const roar = block(scripts, "Move_ROAR", "RoarEffect");
const roarEffect = block(scripts, "RoarEffect", "Move_GROWL");
const houndour = mons.slice(
  mons.indexOf("[FRONTIER_MON_HOUNDOUR]"),
  mons.indexOf("[FRONTIER_MON_HOUNDOUR]") + 500,
);
const entry = inventory.tiers.level50.moves.find(
  (value: { move: string }) => value.move === "MOVE_ROAR",
);
const required = [
  "loadspritegfx ANIM_TAG_NOISE_LINE",
  "monbg ANIM_ATTACKER",
  "splitbgprio ANIM_ATTACKER",
  "setalpha 8, 8",
  "createvisualtask SoundTask_PlayDoubleCry, 2, ANIM_ATTACKER, DOUBLE_CRY_ROAR",
  "createvisualtask AnimTask_ScaleMonAndRestore, 5, -5, -5, 10, ANIM_ATTACKER, 1",
  "call RoarEffect",
  "delay 20",
  "createvisualtask AnimTask_SlideOffScreen, 5, ANIM_TARGET, 2",
  "waitforvisualfinish",
  "clearmonbg ANIM_ATTACKER",
  "blendoff",
  "createvisualtask SoundTask_WaitForCry, 5",
];
if (
  !entry || entry.id !== 46 || entry.exampleMons[0] !== "FRONTIER_MON_HOUNDOUR"
  || !monConstants.includes("#define FRONTIER_MON_HOUNDOUR       119")
  || !species.includes("#define SPECIES_HOUNDOUR 228")
  || !moves.includes("#define MOVE_ROAR 46")
  || !houndour.includes(".species = SPECIES_HOUNDOUR")
  || !houndour.includes(".moves = {MOVE_CRUNCH, MOVE_EMBER, MOVE_ROAR, MOVE_PROTECT}")
  || !houndour.includes("BATTLE_FRONTIER_ITEM_CHARCOAL")
  || !houndour.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !houndour.includes("NATURE_DOCILE")
  || required.some((text) => !roar.includes(text))
  || (roarEffect.match(/gRoarNoiseLineSpriteTemplate/g) ?? []).length !== 6
  || !movement.includes("// To move a mon off-screen when pushed out by Roar/Whirlwind")
  || !movement.includes("void AnimTask_SlideOffScreen(u8 taskId)")
  || !movement.includes("void AnimTask_ScaleMonAndRestore(u8 taskId)")
  || !sound.includes("void SoundTask_PlayDoubleCry")
  || !sound.includes("void SoundTask_WaitForCry")
  || !battleScripts.includes("BattleScript_EffectRoar::")
  || !battleScripts.includes("forcerandomswitch BattleScript_ButItFailed")
) throw new Error("Roar source/controller contract changed");

console.log(
  "set 119/FRONTIER_MON_HOUNDOUR -> SPECIES_HOUNDOUR 228/MOVE_ROAR 46/"
  + "CHARCOAL/SP_ATTACK+HP/DOCILE; Roar owns NOISE_LINE x6, attacker monbg/"
  + "splitbgprio/8:8 alpha, double cry, ScaleMonAndRestore, target SlideOffScreen, "
  + "wait/clearmonbg/blendoff/cry cleanup; EffectRoar reaches attackanimation only "
  + "after attackcanceler, ability/rooted/accuracy/Arena guards and forcerandomswitch",
);
