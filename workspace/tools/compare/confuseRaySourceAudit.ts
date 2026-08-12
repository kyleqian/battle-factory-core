import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const ghost = read("reference/pokeemerald/src/battle_anim_ghost.c");
const fire = read("reference/pokeemerald/src/battle_anim_fire.c");
const sound = read("reference/pokeemerald/src/battle_anim_sound_tasks.c");
const mons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const constants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json")) as {
  rentalSelection: { ranges: { level50: Array<{ start: number; end: number }> } };
};
const frontierMons = (JSON.parse(read("src/data/gen/battle-frontier-mons.json")) as {
  entries: Array<{
    index: number;
    label: string;
    species: string;
    moves: string[];
    nature: string;
    itemName: string;
  }>;
}).entries;
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json")) as {
  moves: Array<{ move: string; componentIds: string[] }>;
};
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const scriptBlock = (start: string, end: string): string => {
  const from = scripts.indexOf(`${start}:`);
  const to = scripts.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing ${start}/${end}`);
  return scripts.slice(from, to);
};
const confuseRay = graph.moves.find((entry) => entry.move === "MOVE_CONFUSE_RAY");
const willOWisp = graph.moves.find((entry) => entry.move === "MOVE_WILL_O_WISP");
const expectedConfuseRay = [
  "asset:ANIM_TAG_YELLOW_BALL",
  "sprite:gConfuseRayBallBounceSpriteTemplate",
  "sprite:gConfuseRayBallSpiralSpriteTemplate",
  "task:SoundTask_AdjustPanningVar",
  "visualCommand:blend_color_cyclebytag",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg",
  "visualCommand:fadetobg",
  "visualCommand:monbg",
  "visualCommand:restorebg",
  "visualCommand:setalpha",
  "visualCommand:waitbgfadein",
];
const expectedWillOWisp = [
  "asset:ANIM_TAG_WISP_FIRE",
  "asset:ANIM_TAG_WISP_ORB",
  "sprite:gWillOWispFireSpriteTemplate",
  "sprite:gWillOWispOrbSpriteTemplate",
  "task:AnimTask_ShakeMon2",
  "task:SoundTask_AdjustPanningVar",
  "visualCommand:clearmonbg",
  "visualCommand:monbg",
  "visualCommand:splitbgprio_all",
  "visualCommand:splitbgprio_foes",
];
const confuseRayScript = scriptBlock("Move_CONFUSE_RAY", "Move_LOCK_ON");
const willOWispScript = scriptBlock("Move_WILL_O_WISP", "Move_ENCORE");
const isLevel50 = (index: number): boolean => policy.rentalSelection.ranges.level50.some(
  ({ start, end }) => index >= start && index <= end,
);
const carrier = frontierMons
  .filter((mon) => isLevel50(mon.index) && mon.moves.includes("MOVE_CONFUSE_RAY"))
  .sort((a, b) => a.index - b.index)[0];
const sharedWithWillOWisp = willOWisp?.componentIds.filter((id) => expectedConfuseRay.includes(id));

const confuseRayRows = [
  "loadspritegfx ANIM_TAG_YELLOW_BALL",
  "monbg ANIM_DEF_PARTNER",
  "fadetobg BG_GHOST",
  "waitbgfadein",
  "createvisualtask SoundTask_AdjustPanningVar, 2, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 2, 0",
  "blend_color_cyclebytag tag=ANIM_TAG_YELLOW_BALL, delay=0, num_blends=6, initial_blend_y=0, target_blend_y=14, color=RGB(31, 10, 0)",
  "createsprite gConfuseRayBallBounceSpriteTemplate, ANIM_TARGET, 2, 28, 0, 288",
  "setalpha 8, 8",
  "playsewithpan SE_M_STRING_SHOT2, SOUND_PAN_TARGET",
  "createsprite gConfuseRayBallSpiralSpriteTemplate, ANIM_TARGET, 2, 0, -16",
  "delay 0",
  "blendoff",
  "clearmonbg ANIM_DEF_PARTNER",
  "restorebg",
  "end",
];
const willOWispRows = [
  "loadspritegfx ANIM_TAG_WISP_FIRE",
  "loadspritegfx ANIM_TAG_WISP_ORB",
  "splitbgprio_foes ANIM_TARGET",
  "createvisualtask SoundTask_AdjustPanningVar, 2, SOUND_PAN_ATTACKER, SOUND_PAN_ATTACKER, 1, 0",
  "createsprite gWillOWispOrbSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 0",
  "createvisualtask SoundTask_AdjustPanningVar, 2, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 2, 0",
  "splitbgprio_all",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 13, 1",
  "createsprite gWillOWispFireSpriteTemplate, ANIM_ATTACKER, 2, 0",
  "createsprite gWillOWispFireSpriteTemplate, ANIM_ATTACKER, 2, 210",
  "clearmonbg ANIM_DEF_PARTNER",
];

if (
  address("Move_CONFUSE_RAY") !== 0x082cbe91
  || address("Move_LOCK_ON") !== 0x082cbee4
  || address("gConfuseRayBallBounceSpriteTemplate") !== 0x08596d14
  || address("gConfuseRayBallSpiralSpriteTemplate") !== 0x08596d2c
  || address("AnimConfuseRayBallBounce") !== 0x0811160c
  || address("AnimConfuseRayBallBounce_Step1") !== 0x08111674
  || address("AnimConfuseRayBallBounce_Step2") !== 0x081116e8
  || address("AnimConfuseRayBallSpiral") !== 0x081117f4
  || address("AnimConfuseRayBallSpiral_Step") !== 0x08111814
  || address("SoundTask_AdjustPanningVar") !== 0x08159278
  || address("SoundTask_AdjustPanningVar_Step") !== 0x08159308
  || address("AnimTask_BlendColorCycleByTag") !== 0x08115c80
  || address("AnimTask_BlendColorCycleByTagLoop") !== 0x08115d2c
  || address("Task_FadeToBg") !== 0x080a4ef4
  || address("Task_ClearMonBg") !== 0x080a4980
  || address("gBattleAnimSpriteGfx_YellowBall") !== 0x08c03438
  || address("gBattleAnimSpritePal_YellowBall") !== 0x08c0346c
  || address("gBattleAnimBgImage_Ghost") !== 0x08d90074
  || address("gBattleAnimBgPalette_Ghost") !== 0x08d90d3c
  || address("gBattleAnimBgTilemap_Ghost") !== 0x08d90d58
  || address("Move_WILL_O_WISP") !== 0x082d4709
  || address("Move_ENCORE") !== 0x082d47c7
  || address("gWillOWispOrbSpriteTemplate") !== 0x0859563c
  || address("gWillOWispFireSpriteTemplate") !== 0x0859566c
  || address("AnimWillOWispOrb") !== 0x08109afc
  || address("AnimWillOWispFire") !== 0x08109cb0
  || address("AnimTask_ShakeMon2") !== 0x080d52d0
  || address("gBattleAnimSpriteGfx_WispFire") !== 0x08c27e34
  || address("gBattleAnimSpriteGfx_WispOrb") !== 0x08c28394
  || address("gBattleAnimSpritePal_WispOrb") !== 0x08c2836c
  || confuseRayRows.some((row) => !confuseRayScript.includes(row))
  || willOWispRows.some((row) => !willOWispScript.includes(row))
  || !ghost.includes("void AnimConfuseRayBallBounce(struct Sprite *sprite)")
  || !ghost.includes("PlaySE12WithPanning(SE_M_CONFUSE_RAY, gAnimCustomPanning)")
  || !ghost.includes("void AnimConfuseRayBallSpiral(struct Sprite *sprite)")
  || !ghost.includes("if (sprite->data[7] == 61)")
  || !sound.includes("// Used by Confuse Ray and Will-O-Wisp (see uses of gAnimCustomPanning)")
  || !sound.includes("gAnimCustomPanning = gTasks[taskId].data[11]")
  || !fire.includes("static void AnimWillOWispOrb(struct Sprite *sprite)")
  || !fire.includes("static void AnimWillOWispFire(struct Sprite *sprite)")
  || JSON.stringify(confuseRay?.componentIds) !== JSON.stringify(expectedConfuseRay)
  || JSON.stringify(willOWisp?.componentIds) !== JSON.stringify(expectedWillOWisp)
  || JSON.stringify(sharedWithWillOWisp) !== JSON.stringify([
    "task:SoundTask_AdjustPanningVar",
    "visualCommand:clearmonbg",
    "visualCommand:monbg",
  ])
  || !carrier
  || carrier.index !== 116
  || carrier.label !== "FRONTIER_MON_CHINCHOU"
  || carrier.species !== "SPECIES_CHINCHOU"
  || JSON.stringify(carrier.moves) !== JSON.stringify(["MOVE_SPARK", "MOVE_DIVE", "MOVE_CONFUSE_RAY", "MOVE_TAKE_DOWN"])
  || carrier.nature !== "NATURE_HARDY"
  || carrier.itemName !== "BATTLE_FRONTIER_ITEM_LAX_INCENSE"
  || !constants.includes("#define FRONTIER_MON_CHINCHOU       116")
  || !mons.includes("[FRONTIER_MON_CHINCHOU]")
) {
  throw new Error("MOVE_CONFUSE_RAY source/carrier/component contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_CONFUSE_RAY",
  sourceBounds: { start: "0x082cbe91", endExclusive: "0x082cbee4", bytes: "0x53" },
  components: expectedConfuseRay,
  carrier: "set 116 FRONTIER_MON_CHINCHOU / SPECIES_CHINCHOU / MOVE_CONFUSE_RAY",
  soundTask: "SoundTask_AdjustPanningVar uses gAnimCustomPanning for the Confuse Ray bounce cue",
  siblingAudit: {
    move: "MOVE_WILL_O_WISP",
    components: expectedWillOWisp,
    shared: sharedWithWillOWisp,
    independence: "Will-O-Wisp retains WISP_FIRE/WISP_ORB, its orb/fire callbacks, split-bg transitions, and ShakeMon2 body; it is not promoted.",
  },
}));
