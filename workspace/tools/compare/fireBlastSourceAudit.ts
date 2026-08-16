import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const path = (relative: string): string => resolve(root, relative);
const read = (relative: string): string => readFileSync(path(relative), "utf8");
const sha256 = (relative: string): string => createHash("sha256")
  .update(readFileSync(path(relative))).digest("hex");

const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const fire = read("reference/pokeemerald/src/battle_anim_fire.c");
const sound = read("reference/pokeemerald/src/battle_anim_sound_tasks.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const monMovement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const frontierMons = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const factory = read("reference/pokeemerald/src/battle_factory.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const generatedMons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json"));
const rom = readFileSync(path("reference/pokeemerald/pokeemerald.gba"));
const nm = execFileSync(
  "arm-none-eabi-nm",
  ["-a", "-S", path("reference/pokeemerald/pokeemerald.elf")],
  { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
);

type Symbol = { readonly address: number; readonly size: number };
const symbols = new Map<string, Symbol>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length === 4 && /^[0-9a-f]+$/iu.test(fields[0]!)
    && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields[3]!, {
      address: Number.parseInt(fields[0]!, 16),
      size: Number.parseInt(fields[1]!, 16),
    });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}

function romInterval(name: string, endName?: string) {
  const symbol = symbols.get(name);
  if (!symbol) throw new Error(`missing ELF symbol ${name}`);
  const end = endName
    ? symbols.get(endName)?.address
    : symbol.size ? symbol.address + symbol.size : undefined;
  if (!end) throw new Error(`missing end for ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, end - 0x08000000);
  return {
    start: `0x${symbol.address.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${end.toString(16).padStart(8, "0")}`,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function scriptCommands(start: string, end: string): string[] {
  const from = scripts.indexOf(`${start}:`);
  const to = scripts.indexOf(`${end}:`, from + start.length + 1);
  if (from < 0 || to < 0) throw new Error(`missing script block ${start}/${end}`);
  return scripts.slice(from, to).split("\n").slice(1)
    .map((line) => line.replace(/@.*$/u, "").trim())
    .filter(Boolean);
}

function requireToken(source: string, token: string, label: string): void {
  if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const moveScript = scriptCommands("Move_FIRE_BLAST", "FireBlastRing");
const ringScript = scriptCommands("FireBlastRing", "FireBlastCross");
const crossScript = scriptCommands("FireBlastCross", "Move_LEECH_SEED");
const expectedMoveScript = [
  "loadspritegfx ANIM_TAG_SMALL_EMBER",
  "createsoundtask SoundTask_FireBlast, SE_M_FLAME_WHEEL, SE_M_FLAME_WHEEL2",
  "call FireBlastRing", "call FireBlastRing", "call FireBlastRing",
  "delay 24",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG, 3, 0, 8, RGB_BLACK",
  "waitforvisualfinish", "delay 19",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 20, 1",
  "call FireBlastCross", "delay 3", "call FireBlastCross", "delay 3",
  "call FireBlastCross", "delay 3", "call FireBlastCross", "delay 3",
  "call FireBlastCross", "delay 3", "call FireBlastCross", "delay 3",
  "call FireBlastCross", "delay 3", "call FireBlastCross", "delay 3",
  "call FireBlastCross", "waitforvisualfinish",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_BG, 2, 8, 0, RGB_BLACK",
  "waitforvisualfinish", "end",
];
const expectedRingScript = [
  "createsprite gFireBlastRingSpriteTemplate, ANIM_TARGET, 2, 0, 0, 0",
  "createsprite gFireBlastRingSpriteTemplate, ANIM_TARGET, 2, 0, 0, 51",
  "createsprite gFireBlastRingSpriteTemplate, ANIM_TARGET, 2, 0, 0, 102",
  "createsprite gFireBlastRingSpriteTemplate, ANIM_TARGET, 2, 0, 0, 153",
  "createsprite gFireBlastRingSpriteTemplate, ANIM_TARGET, 2, 0, 0, 204",
  "delay 5", "return",
];
const expectedCrossScript = [
  "createsprite gFireBlastCrossSpriteTemplate, ANIM_TARGET, 2, 0, 0, 10, 0, -2",
  "createsprite gFireBlastCrossSpriteTemplate, ANIM_TARGET, 2, 0, 0, 13, -2, 0",
  "createsprite gFireBlastCrossSpriteTemplate, ANIM_TARGET, 2, 0, 0, 13, 2, 0",
  "createsprite gFireBlastCrossSpriteTemplate, ANIM_TARGET, 2, 0, 0, 15, -2, 2",
  "createsprite gFireBlastCrossSpriteTemplate, ANIM_TARGET, 2, 0, 0, 15, 2, 2",
  "return",
];
if (JSON.stringify(moveScript) !== JSON.stringify(expectedMoveScript)
  || JSON.stringify(ringScript) !== JSON.stringify(expectedRingScript)
  || JSON.stringify(crossScript) !== JSON.stringify(expectedCrossScript)) {
  throw new Error("Fire Blast script command order, waits, or subroutine branching drifted");
}

const ringPhases = ringScript.filter((line) => line.startsWith(
  "createsprite gFireBlastRingSpriteTemplate",
)).map((line) => Number(line.match(/, 0, 0, (\d+)$/u)?.[1]));
const crossVectors = crossScript.filter((line) => line.startsWith(
  "createsprite gFireBlastCrossSpriteTemplate",
)).map((line) => {
  const match = line.match(/, 0, 0, (\d+), (-?\d+), (-?\d+)$/u);
  if (!match) throw new Error(`unparseable Fire Blast cross vector: ${line}`);
  return { duration: Number(match[1]), x: Number(match[2]), y: Number(match[3]) };
});
if (JSON.stringify(ringPhases) !== JSON.stringify([0, 51, 102, 153, 204])
  || JSON.stringify(crossVectors) !== JSON.stringify([
    { duration: 10, x: 0, y: -2 }, { duration: 13, x: -2, y: 0 },
    { duration: 13, x: 2, y: 0 }, { duration: 15, x: -2, y: 2 },
    { duration: 15, x: 2, y: 2 },
  ])) throw new Error("Fire Blast ring/cross argument table drifted");

for (const token of [
  ".oam = &gOamData_AffineOff_ObjNormal_32x32,",
  ".anims = gAnims_BasicFire,",
  ".callback = AnimFireRing,",
  "ANIMCMD_FRAME(32, 6)", "ANIMCMD_FRAME(48, 6)", "ANIMCMD_JUMP(0)",
  ".callback = AnimFireCross,",
  "InitSpritePosToAnimAttacker(sprite, TRUE);",
  "sprite->data[7] = gBattleAnimArgs[2];",
  "UpdateFireRingCircleOffset(sprite);",
  "if (++sprite->data[0] == 0x12)",
  "GetBattlerSpriteCoord(gBattleAnimTarget, BATTLER_COORD_X_2)",
  "GetBattlerSpriteCoord(gBattleAnimTarget, BATTLER_COORD_Y_PIC_OFFSET)",
  "InitAnimLinearTranslation(sprite);", "if (AnimTranslateLinear(sprite))",
  "if (++sprite->data[0] == 0x1F)", "DestroyAnimSprite(sprite);",
  "sprite->x += gBattleAnimArgs[0];", "sprite->y += gBattleAnimArgs[1];",
  "StoreSpriteCallbackInData6(sprite, DestroyAnimSprite);",
  "sprite->callback = TranslateSpriteLinear;",
]) requireToken(fire, token, "Fire Blast sprite/OAM/callback source");

for (const token of [
  "void SoundTask_FireBlast(u8 taskId)",
  "BattleAnimAdjustPanning(SOUND_PAN_ATTACKER)",
  "BattleAnimAdjustPanning(SOUND_PAN_TARGET)",
  "CalculatePanIncrement(pan1, pan2, 2)", "gTasks[taskId].data[10] = 10;",
  "if (++gTasks[taskId].data[11] == 111)",
  "if (++gTasks[taskId].data[10] == 11)", "PlaySE12WithPanning(gTasks[taskId].data[0], pan);",
  "KeepPanInRange(pan, panIncrement)", "if (++gTasks[taskId].data[10] == 6)",
  "PlaySE12WithPanning(gTasks[taskId].data[1], pan);",
  "if (++gTasks[taskId].data[11] == 2)", "DestroyAnimSoundTask(taskId);",
]) requireToken(sound, token, "Fire Blast sound task source");

requireToken(utility, "void AnimTask_BlendBattleAnimPal(u8 taskId)", "Fire Blast palette task source");
for (const token of [
  "void AnimTask_ShakeMon(u8 taskId)",
  "GetAnimBattlerSpriteId(gBattleAnimArgs[0])",
  "gSprites[spriteId].x2 = gBattleAnimArgs[1];",
  "gSprites[spriteId].y2 = gBattleAnimArgs[2];",
]) requireToken(monMovement, token, "Fire Blast shake task source");
for (const token of [
  "{gBattleAnimSpriteGfx_SmallEmber, 0x0A00, ANIM_TAG_SMALL_EMBER}",
  "{gBattleAnimSpritePal_SmallEmber, ANIM_TAG_SMALL_EMBER}",
]) requireToken(animData, token, "Fire Blast asset table");
for (const token of [
  "graphics/battle_anims/sprites/small_ember.png",
]) requireToken(graphics, token, "Fire Blast graphics source");

const expectedComponents = [
  "asset:ANIM_TAG_SMALL_EMBER", "soundTask:SoundTask_FireBlast",
  "sprite:gFireBlastCrossSpriteTemplate", "sprite:gFireBlastRingSpriteTemplate",
  "subroutine:FireBlastCross", "subroutine:FireBlastRing",
  "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ShakeMon",
];
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_FIRE_BLAST");
const components = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_FIRE_BLAST")?.componentIds;
const level50HighestSet = Math.max(...policy.rentalSelection.ranges.level50.map(
  (range: { end: number }) => range.end,
));
const allCarriers = generatedMons.entries.filter((entry: { index: number; moves: string[] }) =>
  entry.index <= level50HighestSet && entry.moves.includes("MOVE_FIRE_BLAST"),
);
const octillery = generatedMons.entries.find((entry: { index: number }) => entry.index === 361);
const octillerySource = frontierMons.slice(
  frontierMons.indexOf("[FRONTIER_MON_OCTILLERY_2]"),
  frontierMons.indexOf("[FRONTIER_MON_HUNTAIL_2]"),
);
const challenge2Range = policy.rentalSelection.ranges.level50[2];
if (!move || move.id !== 126 || move.exampleMons.join(",")
  !== "FRONTIER_MON_OCTILLERY_2,FRONTIER_MON_CHARIZARD_1,FRONTIER_MON_TYPHLOSION_1"
  || JSON.stringify(components) !== JSON.stringify(expectedComponents)
  || allCarriers[0]?.index !== 361 || allCarriers.length !== 18
  || !octillery || octillery.label !== "FRONTIER_MON_OCTILLERY_2"
  || JSON.stringify(octillery.moves) !== JSON.stringify([
    "MOVE_OCTAZOOKA", "MOVE_FIRE_BLAST", "MOVE_THUNDER_WAVE", "MOVE_MUD_SLAP",
  ])
  || !octillerySource.includes(".species = SPECIES_OCTILLERY")
  || !octillerySource.includes("BATTLE_FRONTIER_ITEM_LAX_INCENSE")
  || !octillerySource.includes("F_EV_SPREAD_SP_DEFENSE | F_EV_SPREAD_DEFENSE | F_EV_SPREAD_HP")
  || !octillerySource.includes("NATURE_QUIRKY")
  || !frontierConstants.includes("#define FRONTIER_MON_OCTILLERY_2    361")
  || !factory.includes("{FRONTIER_MON_DELCATTY_2, FRONTIER_MON_CLOYSTER_2}, // 267 - 371")
  || JSON.stringify(challenge2Range) !== JSON.stringify({
    start: 267, end: 371,
    startLabel: "FRONTIER_MON_DELCATTY_2", endLabel: "FRONTIER_MON_CLOYSTER_2",
  })) throw new Error("Fire Blast carrier/range/component graph drifted");

const sourceHashes = Object.fromEntries([
  "reference/pokeemerald/pokeemerald.gba",
  "reference/pokeemerald/pokeemerald.elf",
  "reference/pokeemerald/data/battle_anim_scripts.s",
  "reference/pokeemerald/src/battle_anim_fire.c",
  "reference/pokeemerald/src/battle_anim_sound_tasks.c",
  "reference/pokeemerald/src/battle_anim_utility_funcs.c",
  "reference/pokeemerald/src/battle_anim_mon_movement.c",
  "reference/pokeemerald/src/data/battle_anim.h",
  "reference/pokeemerald/src/graphics.c",
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
  "reference/pokeemerald/src/battle_factory.c",
  "src/data/gen/factory-animation-inventory.json",
  "src/data/gen/battle-animation-components.json",
  "src/data/gen/battle-frontier-mons.json",
  "src/data/gen/factory-round-policy.json",
].map((relative) => [relative, sha256(relative)]));

console.log(JSON.stringify({
  move: "MOVE_FIRE_BLAST",
  moveId: 126,
  status: "unsupported-source-staging-checkpoint",
  source: {
    moveScript: romInterval("Move_FIRE_BLAST", "FireBlastRing"),
    fireBlastRing: romInterval("FireBlastRing", "FireBlastCross"),
    fireBlastCross: romInterval("FireBlastCross", "Move_LEECH_SEED"),
    ringTemplate: romInterval("gFireBlastRingSpriteTemplate"),
    crossAnimCmds: romInterval("sAnim_FireBlastCross"),
    crossTemplate: romInterval("gFireBlastCrossSpriteTemplate"),
    ringCallbacks: romInterval("AnimFireRing", "AnimFireCross"),
    fireCrossCallback: romInterval("AnimFireCross"),
    soundTask: romInterval("SoundTask_FireBlast"),
    soundTaskStep1: romInterval("SoundTask_FireBlast_Step1"),
    soundTaskStep2: romInterval("SoundTask_FireBlast_Step2"),
    shakeMon: romInterval("AnimTask_ShakeMon"),
    blendBattleAnimPal: romInterval("AnimTask_BlendBattleAnimPal"),
    basicFireAnims: romInterval("gAnims_BasicFire"),
    smallEmberGfx: romInterval("gBattleAnimSpriteGfx_SmallEmber"),
    smallEmberPalette: romInterval("gBattleAnimSpritePal_SmallEmber"),
  },
  sourceHashes,
  scripts: { Move_FIRE_BLAST: moveScript, FireBlastRing: ringScript, FireBlastCross: crossScript },
  ringPhases,
  crossVectors,
  lifecycle: {
    loads: ["ANIM_TAG_SMALL_EMBER"], unloads: [],
    ringSubroutineCalls: 3, ringSpritesPerCall: 5,
    crossSubroutineCalls: 9, crossSpritesPerCall: 5,
    waits: ["delay 24", "waitforvisualfinish", "delay 19", "waitforvisualfinish", "waitforvisualfinish"],
    oam: "both templates are AffineOff ObjNormal 32x32; no affine matrix or OBJ blend allocation",
    palette: ["F_PAL_BG 3,0,8 RGB_BLACK", "F_PAL_BG 2,8,0 RGB_BLACK"],
    audio: "SoundTask_FireBlast: attacker-to-target pan, initial data10=10, loop every 11 task ticks until source tick 111, then target-ending cue at Step2 data10==6 twice before destroy",
  },
  sideDependencies: {
    ring: "rings initialize at attacker picture coordinates via InitSpritePosToAnimAttacker(TRUE), then use target X_2/Y_PIC_OFFSET for the linear transit and target orbit; side changes both battler coordinate systems",
    cross: "all 45 cross sprites are target-relative command spawns; AnimFireCross adds the five source x/y vectors before TranslateSpriteLinear, so side selects the target anchor rather than a hard-coded screen coordinate",
    shake: "AnimTask_ShakeMon receives ANIM_TARGET, 5,0,20,1 and moves only the target-side battler sprite",
    palette: "F_PAL_BG makes both black blend tasks field/background work independent of attacker identity; the Small Ember OBJ palette remains resource-tagged",
    audio: "SoundTask_FireBlast derives both pans with BattleAnimAdjustPanning, therefore the attacker-to-target sweep reverses between player-back and opponent-front stages",
  },
  sharedControls: {
    dragonBreath: "MOVE_DRAGON_BREATH is an exact gDragonBreathFireSpriteTemplate control, not Fire Blast's Small Ember ring/cross, sound-task, or F_PAL_BG lifecycle",
    flamethrower: "MOVE_FLAMETHROWER is an exact fire projectile control, not Fire Blast's three Ring calls, nine Cross calls, or hard-coded SoundTask_FireBlast",
    blazeKick: "MOVE_BLAZE_KICK is an exact fire-contact control and does not exercise Fire Blast's target-relative ring/cross templates",
    ember: "MOVE_EMBER shares ANIM_TAG_SMALL_EMBER but uses Ember-specific templates/callbacks; its asset proof does not prove Fire Blast's callbacks, script timing, or sound task",
    fireSpin: "MOVE_FIRE_SPIN uses gFireSpinSpriteTemplate/AnimParticleInVortex and remains an independent vortex control; it does not prove Fire Blast's Small Ember ring/cross body",
    projectilePrimitives: "shared fire projectile primitives supply no Fire Blast acceptance credit: its root/subroutine order, callbacks, palette waits, and audio lifecycle are move-specific",
  },
  components: expectedComponents,
  carrier: {
    allLevel50: allCarriers.map((entry: { index: number; label: string; species: string }) => ({
      index: entry.index, label: entry.label, species: entry.species,
    })),
    lowestLegal: {
      index: 361, label: "FRONTIER_MON_OCTILLERY_2", species: "SPECIES_OCTILLERY",
      moves: octillery.moves, item: "BATTLE_FRONTIER_ITEM_LAX_INCENSE",
      evSpread: ["F_EV_SPREAD_SP_DEFENSE", "F_EV_SPREAD_DEFENSE", "F_EV_SPREAD_HP"],
      nature: "NATURE_QUIRKY",
    },
    challenge2Range,
  },
  ownership: { gpuRegisters: false, gameplayState: false, renderer: false },
}, null, 2));
