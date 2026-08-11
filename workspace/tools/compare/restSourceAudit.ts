import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects1 = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const effects3 = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const mons = read(
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
);
const constants = read(
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
);
const species = read("reference/pokeemerald/include/constants/species.h");
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const inventory = JSON.parse(
  read("src/data/gen/factory-animation-inventory.json"),
);
const rest = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_REST",
);
const sleepTalk = inventory.tiers.level50.moves.find(
  (entry: { move: string }) => entry.move === "MOVE_SLEEP_TALK",
);
const restBody = scripts.slice(
  scripts.indexOf("Move_REST:"),
  scripts.indexOf("Move_CONFUSION:"),
);
const sleepTalkBody = scripts.slice(
  scripts.indexOf("Move_SLEEP_TALK:"),
  scripts.indexOf("Move_HYPER_FANG:"),
);
const teddiursa = mons.slice(
  mons.indexOf("[FRONTIER_MON_TEDDIURSA]"),
  mons.indexOf("[FRONTIER_MON_TEDDIURSA]") + 500,
);
const restBattleScript = battleScripts.slice(
  battleScripts.indexOf("BattleScript_EffectRest::"),
  battleScripts.indexOf("BattleScript_RestCantSleep::"),
);

if (
  !rest || rest.id !== 156 || rest.frontierMonCount !== 49
  || rest.exampleMons[0] !== "FRONTIER_MON_TEDDIURSA"
  || !sleepTalk || sleepTalk.id !== 214
  || !constants.includes("#define FRONTIER_MON_TEDDIURSA      117")
  || !species.includes("#define SPECIES_TEDDIURSA 216")
  || !teddiursa.includes(".species = SPECIES_TEDDIURSA")
  || !teddiursa.includes(
    ".moves = {MOVE_SECRET_POWER, MOVE_FAKE_TEARS, MOVE_FAINT_ATTACK, MOVE_REST}",
  )
  || !teddiursa.includes("BATTLE_FRONTIER_ITEM_CHESTO_BERRY")
  || !teddiursa.includes("F_EV_SPREAD_ATTACK | F_EV_SPREAD_HP")
  || !teddiursa.includes("NATURE_RELAXED")
  || !restBody.includes("playsewithpan SE_M_SNORE, SOUND_PAN_ATTACKER")
  || !restBody.includes("loadspritegfx ANIM_TAG_LETTER_Z")
  || (restBody.match(/gSleepLetterZSpriteTemplate/g) ?? []).length !== 3
  || !effects1.includes(".callback = AnimSleepLetterZ")
  || !effects1.includes("sprite->callback = AnimSleepLetterZ_Step")
  || !effects1.includes("if (++sprite->data[1] > 60)")
  || !restBattleScript.includes("trysetrest BattleScript_AlreadyAtFullHp")
  || !restBattleScript.includes("updatestatusicon BS_ATTACKER")
  || !restBattleScript.includes("goto BattleScript_PresentHealTarget")
  || !sleepTalkBody.includes("createvisualtask AnimTask_SwayMon")
  || (sleepTalkBody.match(/gLetterZSpriteTemplate/g) ?? []).length !== 9
  || !effects3.includes(".callback = AnimLetterZ")
) throw new Error("Rest/LETTER_Z source contract changed");

console.log(
  "lowest challenge-0 Level-50 carrier set 117/FRONTIER_MON_TEDDIURSA -> "
  + "SPECIES_TEDDIURSA 216/move 156/CHESTO_BERRY/ATTACK+HP/RELAXED; "
  + "Rest owns 3 gSleepLetterZSpriteTemplate/AnimSleepLetterZ lifecycles "
  + "after trysetrest sleep/status setup; Sleep Talk remains distinct with "
  + "9 gLetterZSpriteTemplate lifecycles plus AnimTask_SwayMon",
);
