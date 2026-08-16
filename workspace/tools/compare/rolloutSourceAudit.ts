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
const battleScripts = read("reference/pokeemerald/data/battle_scripts_1.s");
const rock = read("reference/pokeemerald/src/battle_anim_rock.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const mons = read("reference/pokeemerald/src/battle_anim_mons.c");
const battleCommands = read("reference/pokeemerald/src/battle_script_commands.c");
const controllers = read("reference/pokeemerald/src/battle_controllers.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const songs = read("reference/pokeemerald/include/constants/songs.h");
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
  if (!end || end <= symbol.address) throw new Error(`missing end for ${name}`);
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

function battleScriptCommands(start: string, end: string): string[] {
  const from = battleScripts.indexOf(`${start}::`);
  const to = battleScripts.indexOf(`${end}::`, from + start.length + 2);
  if (from < 0 || to < 0) throw new Error(`missing battle-script block ${start}/${end}`);
  return battleScripts.slice(from, to).split("\n").slice(1)
    .map((line) => line.replace(/@.*$/u, "").trim())
    .filter(Boolean);
}

function requireToken(source: string, token: string, label: string): void {
  if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const moveScript = scriptCommands("Move_ROLLOUT", "Move_FALSE_SWIPE");
const expectedMoveScript = [
  "loadspritegfx ANIM_TAG_IMPACT",
  "loadspritegfx ANIM_TAG_MUD_SAND",
  "loadspritegfx ANIM_TAG_ROCKS",
  "monbg ANIM_DEF_PARTNER",
  "splitbgprio ANIM_TARGET",
  "setalpha 12, 8",
  "createvisualtask AnimTask_Rollout, 2",
  "waitforvisualfinish",
  "createvisualtask AnimTask_ShakeTargetBasedOnMovePowerOrDmg, 2, FALSE, 1, 30, 1, 0",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 4, x=0, y=0, relative_to=ANIM_TARGET, animation=2",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
  "end",
];
if (JSON.stringify(moveScript) !== JSON.stringify(expectedMoveScript)) {
  throw new Error("Rollout root command order, visual wait, or cleanup drifted");
}

const effectScript = battleScriptCommands("BattleScript_EffectRollout", "BattleScript_EffectSwagger");
const expectedEffectScript = [
  "attackcanceler",
  "attackstring",
  "jumpifstatus2 BS_ATTACKER, STATUS2_MULTIPLETURNS, BattleScript_RolloutCheckAccuracy",
  "ppreduce",
  "BattleScript_RolloutCheckAccuracy::",
  "accuracycheck BattleScript_RolloutHit, ACC_CURR_MOVE",
  "BattleScript_RolloutHit::",
  "typecalc2",
  "rolloutdamagecalculation",
  "goto BattleScript_HitFromCritCalc",
];
if (JSON.stringify(effectScript) !== JSON.stringify(expectedEffectScript)) {
  throw new Error("Rollout gameplay-script branch order drifted");
}

for (const token of [
  "void AnimTask_Rollout(u8 taskId)",
  "GetBattlerSpriteCoord(gBattleAnimAttacker, BATTLER_COORD_X_2)",
  "GetBattlerSpriteCoord(gBattleAnimTarget, BATTLER_COORD_Y) + 24",
  "if (BATTLE_PARTNER(gBattleAnimAttacker) == gBattleAnimTarget)",
  "rolloutCounter = GetRolloutCounter();",
  "if (rolloutCounter == 1)",
  "task->data[8] = 32;",
  "task->data[8] = 48 - (rolloutCounter * 8);",
  "task->data[10] = (task->data[8] / 8) - 1;",
  "BattleAnimAdjustPanning(SOUND_PAN_ATTACKER)",
  "BattleAnimAdjustPanning(SOUND_PAN_TARGET)",
  "task->func = AnimTask_Rollout_Step;",
  "case 0:", "if (++task->data[9] == 10)", "task->data[11] = 20;",
  "PlaySE12WithPanning(SE_M_HEADBUTT, task->data[13]);",
  "case 3:", "CreateRolloutDirtSprite(task);",
  "PlaySE12WithPanning(SE_M_DIG, task->data[13]);",
  "if (task->data[11] == 0)", "DestroyAnimVisualTask(taskId);",
  "case 1:", "spriteTemplate = &gRolloutMudSpriteTemplate;", "tileOffset = 0;",
  "case 2:", "spriteTemplate = &gRolloutRockSpriteTemplate;", "tileOffset = 80;",
  "case 4:", "tileOffset = 64;", "case 5:", "tileOffset = 48;",
  "spriteId = CreateSprite(spriteTemplate, x, y, 35);",
  "gSprites[spriteId].data[0] = 18;",
  "gSprites[spriteId].data[5] = -16 - (task->data[1] * 2);",
  "InitAnimArcTranslation(&gSprites[spriteId]);",
  "task->data[12] *= -1;",
  "static void AnimRolloutParticle(struct Sprite *sprite)",
  "TranslateAnimHorizontalArc(sprite)",
  "FindTaskIdByFunc(AnimTask_Rollout_Step)",
  "gTasks[taskId].data[11]--;", "DestroySprite(sprite);",
  "static u8 GetRolloutCounter(void)",
  "gAnimDisableStructPtr->rolloutTimerStartValue - gAnimDisableStructPtr->rolloutTimer",
  "if (var0 > 4)", "retVal = 1;",
  ".oam = &gOamData_AffineOff_ObjNormal_8x8,",
  ".oam = &gOamData_AffineOff_ObjNormal_32x32,",
]) requireToken(rock, token, "Rollout task/template/callback source");

for (const token of [
  "void AnimTask_ShakeTargetBasedOnMovePowerOrDmg(u8 taskId)",
  "if (!gBattleAnimArgs[0])", "gTasks[taskId].data[15] = gAnimMovePower / 12;",
  "gTasks[taskId].data[15] = gAnimMoveDmg / 12;",
  "if (gTasks[taskId].data[15] < 1)",
  "if (gTasks[taskId].data[15] > 16)",
  "gTasks[taskId].data[10] = gBattleAnimArgs[3];",
  "gTasks[taskId].data[11] = gBattleAnimArgs[4];",
  "gTasks[taskId].data[7] = GetAnimBattlerSpriteId(ANIM_TARGET);",
  "gTasks[taskId].func = AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step;",
  "if (!--task->data[2])", "DestroyAnimVisualTask(taskId);",
]) requireToken(movement, token, "Rollout power-shake task source");

for (const token of [
  "void InitAnimArcTranslation(struct Sprite *sprite)",
  "sprite->data[6] = 0x8000 / sprite->data[0];",
  "bool8 TranslateAnimHorizontalArc(struct Sprite *sprite)",
  "sprite->y2 += Sin((u8)(sprite->data[7] >> 8), sprite->data[5]);",
]) requireToken(mons, token, "Rollout arc helper source");

for (const token of [
  "if (gMoveResultFlags & MOVE_RESULT_NO_EFFECT)",
  "CancelMultiTurnMoves(gBattlerAttacker);",
  "gDisableStructs[gBattlerAttacker].rolloutTimer = 5;",
  "gDisableStructs[gBattlerAttacker].rolloutTimerStartValue = 5;",
  "gBattleMons[gBattlerAttacker].status2 |= STATUS2_MULTIPLETURNS;",
  "if (--gDisableStructs[gBattlerAttacker].rolloutTimer == 0)",
  "gDynamicBasePower = gBattleMoves[gCurrentMove].power;",
  "for (i = 1; i < (5 - gDisableStructs[gBattlerAttacker].rolloutTimer); i++)",
  "gDynamicBasePower *= 2;",
  "if (gBattleMons[gBattlerAttacker].status2 & STATUS2_DEFENSE_CURL)",
]) requireToken(battleCommands, token, "Rollout gameplay counter/power source");
for (const token of [
  "BtlController_EmitMoveAnimation(B_COMM_TO_CONTROLLER, gCurrentMove",
  "gBattleMovePower, gBattleMoveDamage",
]) requireToken(battleCommands, token, "Rollout animation dispatch source");
for (const token of [
  "void BtlController_EmitMoveAnimation(u8 bufferId, u16 move, u8 turnOfMove, u16 movePower",
  "sBattleBuffersTransferData[4] = movePower;",
  "memcpy(&sBattleBuffersTransferData[16], disableStructPtr, sizeof(struct DisableStruct));",
]) requireToken(controllers, token, "Rollout animation packet source");

for (const token of [
  "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}",
  "{gBattleAnimSpriteGfx_MudSand, 0x00A0, ANIM_TAG_MUD_SAND}",
  "{gBattleAnimSpriteGfx_Rocks, 0x0C00, ANIM_TAG_ROCKS}",
  "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}",
  "{gBattleAnimSpritePal_MudSand, ANIM_TAG_MUD_SAND}",
  "{gBattleAnimSpritePal_Rocks, ANIM_TAG_ROCKS}",
]) requireToken(animData, token, "Rollout resource table");
for (const token of [
  "graphics/battle_anims/sprites/impact.png",
  "graphics/battle_anims/sprites/mud_sand.4bpp",
  "graphics/battle_anims/sprites/mud_sand.pal",
  "graphics/battle_anims/sprites/rocks.png",
]) requireToken(graphics, token, "Rollout graphics source");
for (const token of [
  "#define SE_M_MEGA_KICK2             141",
  "#define SE_M_HEADBUTT               162",
  "#define SE_M_DIG                    175",
]) requireToken(songs, token, "Rollout audio constants");

const expectedComponents = [
  "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_MUD_SAND", "asset:ANIM_TAG_ROCKS",
  "task:AnimTask_Rollout", "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
  "visualCommand:blendoff", "visualCommand:clearmonbg",
  "visualCommand:create_basic_hitsplat_sprite", "visualCommand:monbg",
  "visualCommand:setalpha", "visualCommand:splitbgprio",
];
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_ROLLOUT");
const components = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_ROLLOUT")?.componentIds;
const rolloutComponent = graph.components.find((entry: { id: string }) => entry.id === "task:AnimTask_Rollout");
const level50Ranges = policy.rentalSelection.ranges.level50 as Array<{ start: number; end: number }>;
const allLevel50Carriers = generatedMons.entries.filter((entry: { index: number; moves: string[] }) =>
  level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end)
    && entry.moves.includes("MOVE_ROLLOUT"),
);
const voltorb = generatedMons.entries.find((entry: { index: number }) => entry.index === 115);
const voltorbSource = frontierMons.slice(
  frontierMons.indexOf("[FRONTIER_MON_VOLTORB]"),
  frontierMons.indexOf("[FRONTIER_MON_CHINCHOU]"),
);
const challenge0Range = policy.rentalSelection.ranges.level50[0];
if (!move || move.id !== 205 || move.frontierMonCount !== 5
  || JSON.stringify(move.exampleMons) !== JSON.stringify([
    "FRONTIER_MON_VOLTORB", "FRONTIER_MON_PHANPY", "FRONTIER_MON_WAILMER_1",
  ]) || JSON.stringify(components) !== JSON.stringify(expectedComponents)
  || JSON.stringify(rolloutComponent) !== JSON.stringify({
    id: "task:AnimTask_Rollout", kind: "task", name: "AnimTask_Rollout",
    moveCount: 1, level50MoveCount: 1, moves: ["MOVE_ROLLOUT"],
  }) || allLevel50Carriers[0]?.index !== 115 || allLevel50Carriers.length !== 5
  || !voltorb || voltorb.label !== "FRONTIER_MON_VOLTORB"
  || JSON.stringify(voltorb.moves) !== JSON.stringify([
    "MOVE_SPARK", "MOVE_SCREECH", "MOVE_ROLLOUT", "MOVE_LIGHT_SCREEN",
  ]) || !voltorbSource.includes(".species = SPECIES_VOLTORB")
  || !voltorbSource.includes("BATTLE_FRONTIER_ITEM_LAX_INCENSE")
  || !voltorbSource.includes("F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP")
  || !voltorbSource.includes("NATURE_DOCILE")
  || !frontierConstants.includes("#define FRONTIER_MON_VOLTORB        115")
  || !factory.includes("{FRONTIER_MON_GRIMER,     FRONTIER_MON_FURRET_1},   // 110 - 199")
  || JSON.stringify(challenge0Range) !== JSON.stringify({
    start: 110, end: 199, startLabel: "FRONTIER_MON_GRIMER", endLabel: "FRONTIER_MON_FURRET_1",
  })) throw new Error("Rollout carrier/range/component graph drifted");

const counterBranches = [
  { counter: 1, remainingTimer: 4, dynamicBasePower: 30, defenseCurlPower: 60, duration: 32, particlePeriod: 3, particleCount: 10, template: "gRolloutMudSpriteTemplate", tileOffset: 0 },
  { counter: 2, remainingTimer: 3, dynamicBasePower: 60, defenseCurlPower: 120, duration: 32, particlePeriod: 3, particleCount: 10, template: "gRolloutRockSpriteTemplate", tileOffset: 80 },
  { counter: 3, remainingTimer: 2, dynamicBasePower: 120, defenseCurlPower: 240, duration: 24, particlePeriod: 2, particleCount: 12, template: "gRolloutRockSpriteTemplate", tileOffset: 80 },
  { counter: 4, remainingTimer: 1, dynamicBasePower: 240, defenseCurlPower: 480, duration: 16, particlePeriod: 1, particleCount: 16, template: "gRolloutRockSpriteTemplate", tileOffset: 64 },
  { counter: 5, remainingTimer: 0, dynamicBasePower: 480, defenseCurlPower: 960, duration: 8, particlePeriod: 0, particleCount: 8, template: "gRolloutRockSpriteTemplate", tileOffset: 48 },
].map((branch) => ({
  ...branch,
  taskData10: (branch.duration / 8) - 1,
  shakeIfAnimationReceivesDynamicPower: Math.min(16, Math.max(1, Math.floor(branch.dynamicBasePower / 12))),
  shakeIfAnimationReceivesDefenseCurlPower: Math.min(16, Math.max(1, Math.floor(branch.defenseCurlPower / 12))),
}));

const sourceHashes = Object.fromEntries([
  "reference/pokeemerald/pokeemerald.gba",
  "reference/pokeemerald/pokeemerald.elf",
  "reference/pokeemerald/data/battle_anim_scripts.s",
  "reference/pokeemerald/data/battle_scripts_1.s",
  "reference/pokeemerald/src/battle_anim_rock.c",
  "reference/pokeemerald/src/battle_anim_mon_movement.c",
  "reference/pokeemerald/src/battle_anim_mons.c",
  "reference/pokeemerald/src/battle_script_commands.c",
  "reference/pokeemerald/src/battle_controllers.c",
  "reference/pokeemerald/src/data/battle_anim.h",
  "reference/pokeemerald/src/graphics.c",
  "reference/pokeemerald/include/constants/songs.h",
  "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
  "reference/pokeemerald/include/constants/battle_frontier_mons.h",
  "reference/pokeemerald/src/battle_factory.c",
  "src/data/gen/factory-animation-inventory.json",
  "src/data/gen/battle-animation-components.json",
  "src/data/gen/battle-frontier-mons.json",
  "src/data/gen/factory-round-policy.json",
].map((relative) => [relative, sha256(relative)]));

console.log(JSON.stringify({
  move: "MOVE_ROLLOUT",
  moveId: 205,
  status: "unsupported-source-staging-checkpoint",
  source: {
    moveScript: romInterval("Move_ROLLOUT", "Move_FALSE_SWIPE"),
    rolloutTaskInit: romInterval("AnimTask_Rollout", "AnimTask_Rollout_Step"),
    rolloutTaskStep: romInterval("AnimTask_Rollout_Step", "CreateRolloutDirtSprite"),
    createParticle: romInterval("CreateRolloutDirtSprite", "AnimRolloutParticle"),
    particleCallback: romInterval("AnimRolloutParticle", "GetRolloutCounter"),
    rolloutCounter: romInterval("GetRolloutCounter"),
    mudTemplate: romInterval("gRolloutMudSpriteTemplate"),
    rockTemplate: romInterval("gRolloutRockSpriteTemplate"),
    powerShakeInit: romInterval("AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"),
    powerShakeStep: romInterval("AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"),
    arcInit: romInterval("InitAnimArcTranslation"),
    horizontalArc: romInterval("TranslateAnimHorizontalArc"),
    impactGfx: romInterval("gBattleAnimSpriteGfx_Impact"),
    impactPalette: romInterval("gBattleAnimSpritePal_Impact"),
    mudSandGfx: romInterval("gBattleAnimSpriteGfx_MudSand"),
    mudSandPalette: romInterval("gBattleAnimSpritePal_MudSand"),
    rocksGfx: romInterval("gBattleAnimSpriteGfx_Rocks"),
    rocksPalette: romInterval("gBattleAnimSpritePal_Rocks"),
  },
  sourceHashes,
  scripts: { Move_ROLLOUT: moveScript, BattleScript_EffectRollout: effectScript },
  lifecycle: {
    loads: ["ANIM_TAG_IMPACT", "ANIM_TAG_MUD_SAND", "ANIM_TAG_ROCKS"],
    monbg: "ANIM_DEF_PARTNER", splitbgprio: "ANIM_TARGET", alpha: [12, 8],
    teardown: ["clearmonbg ANIM_DEF_PARTNER", "blendoff"],
    rootAudio: "SE_M_MEGA_KICK2/SOUND_PAN_TARGET after the power shake and animation-2 basic IMPACT hitsplat",
    rolloutAudio: "SE_M_HEADBUTT/SOUND_PAN_ATTACKER on each ten-tick windup step; SE_M_DIG panned from attacker toward target after each successful particle allocation",
    audioConstants: { SE_M_MEGA_KICK2: 141, SE_M_HEADBUTT: 162, SE_M_DIG: 175 },
    templates: [
      "gRolloutMudSpriteTemplate: AffineOff ObjNormal 8x8 ANIM_TAG_MUD_SAND",
      "gRolloutRockSpriteTemplate: AffineOff ObjNormal 32x32 ANIM_TAG_ROCKS",
    ],
    particle: "CreateSprite priority 35, fixed 18-tick horizontal arc with alternating +/-4 initial X, counter-scaled endpoint and -16-(counter*2) vertical amplitude; callback decrements the parent task only after TranslateAnimHorizontalArc completes",
  },
  counterBranches,
  counterFallback: "GetRolloutCounter returns the normal 1..5 startValue-timer results; zero and every result >= 6 take unsigned (retVal - 1) > 4 back to visual counter 1.",
  powerOwnership: "Cmd_rolloutdamagecalculation owns the 30/60/120/240/480 dynamic-base-power ladder (or doubled Defense Curl ladder) and the 5->0 timer; the animation packet carries gBattleMovePower and a DisableStruct snapshot. This checkpoint only audits those source branches and never computes or mutates them.",
  sideDependencies: {
    path: "attacker/target X_2 and Y+24 anchors, plus the partner-target Y exception, derive the Q8.8 movement path from the live battle side rather than fixed coordinates",
    panning: "BattleAnimAdjustPanning derives attacker and target pan; the duration-divided increment and SE_M_DIG sweep reverse between player-back and opponent-front",
    targetShake: "the root requests power rather than damage (FALSE), x every 1 tick for 30 alternations, y enabled, so a future dense proof must independently check the packet power and target latch",
  },
  components: expectedComponents,
  carrier: {
    allLevel50: allLevel50Carriers.map((entry: { index: number; label: string; species: string; moves: string[] }) => ({
      index: entry.index, label: entry.label, species: entry.species, moves: entry.moves,
    })),
    lowestLegal: {
      index: 115, label: "FRONTIER_MON_VOLTORB", species: "SPECIES_VOLTORB",
      moves: voltorb.moves, item: "BATTLE_FRONTIER_ITEM_LAX_INCENSE",
      evSpread: ["F_EV_SPREAD_SP_ATTACK", "F_EV_SPREAD_HP"], nature: "NATURE_DOCILE",
    },
    challenge0Range,
  },
  sharedControls: {
    sandAttack: "MOVE_SAND_ATTACK is independently exact and shares only ANIM_TAG_MUD_SAND with Rollout; its dirt subroutine/slides and its coverage do not prove the Rollout task or callback.",
    ancientPower: "MOVE_ANCIENT_POWER is independently exact and shares ANIM_TAG_ROCKS plus ANIM_TAG_IMPACT; its ten raising-rock callbacks and ShakeMon2 body are not Rollout's counter/power path.",
    iceBall: "MOVE_ICE_BALL is an unsupported escalating-move control: it shares AnimTask_ShakeTargetBasedOnMovePowerOrDmg but has its own IceBall counter, ice BG, chunk/shard templates, subroutines, and no Rollout acceptance credit.",
  },
  ownership: { gameplayState: false, rng: false, controller: false, renderer: false },
}, null, 2));
