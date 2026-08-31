/** Source contract for the currently unstageable MOVE_HELPING_HAND success body. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const bytes = (path: string): Buffer => readFileSync(resolve(root, path));
const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const effects = read("reference/pokeemerald/src/battle_anim_effects_3.c");
const mons = read("reference/pokeemerald/src/battle_anim_mons.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const data = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const battleCommands = read("reference/pokeemerald/src/battle_script_commands.c");
const battleConstants = read("reference/pokeemerald/include/constants/battle.h");
const frontierSource = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const reducer = read("src/animation/helpingHand.ts");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
function address(symbol: string): number {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)(?:\\s+[0-9a-fA-F]+)?\\s+\\S+\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing symbol ${symbol}`);
  return Number.parseInt(match[1]!, 16);
}
function requireToken(source: string, token: string, owner: string): void {
  if (!source.includes(token)) throw new Error(`${owner} drifted: ${token}`);
}

const body = scripts.slice(scripts.indexOf("Move_HELPING_HAND:"), scripts.indexOf("Move_ASSIST:"));
const rows = body.trim().split("\n").map((line) => line.trim());
const expectedRows = [
  "Move_HELPING_HAND:", "loadspritegfx ANIM_TAG_TAG_HAND",
  "createvisualtask AnimTask_HelpingHandAttackerMovement, 5",
  "createsprite gHelpingHandClapSpriteTemplate, ANIM_ATTACKER, 40, 0",
  "createsprite gHelpingHandClapSpriteTemplate, ANIM_ATTACKER, 40, 1", "delay 19",
  "playsewithpan SE_M_ENCORE, 0",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATK_PARTNER, 2, 0, 5, 1", "delay 14",
  "playsewithpan SE_M_ENCORE, 0",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATK_PARTNER, 2, 0, 5, 1", "delay 20",
  "playsewithpan SE_M_ENCORE, 0",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATK_PARTNER, 3, 0, 10, 1",
  "createvisualtask AnimTask_BlendMonInAndOut, 2, ANIM_ATK_PARTNER, RGB_YELLOW, 12, 1, 1", "end",
];
if (JSON.stringify(rows) !== JSON.stringify(expectedRows)) {
  throw new Error("Helping Hand script body drifted");
}

for (const token of [
  "const struct SpriteTemplate gHelpingHandClapSpriteTemplate =", ".tileTag = ANIM_TAG_TAG_HAND,",
  ".paletteTag = ANIM_TAG_TAG_HAND,", ".oam = &gOamData_AffineOff_ObjNormal_32x32,",
  ".callback = AnimHelpingHandClap,", "static void AnimHelpingHandClap(struct Sprite *sprite)",
  "sprite->x = 100;", "sprite->x = 140;", "sprite->y = 56;", "sprite->oam.matrixNum |= ST_OAM_HFLIP;",
  "static void AnimHelpingHandClap_Step(struct Sprite *sprite)",
  "sprite->oam.tileNum += 16;", "DestroyAnimSprite(sprite);",
  "void AnimTask_HelpingHandAttackerMovement(u8 taskId)",
  "static void AnimTask_HelpingHandAttackerMovement_Step(u8 taskId)",
  "gSprites[task->data[15]].x2 -= task->data[14] * 3;",
  "gSprites[task->data[15]].x2 += task->data[14] * 4;",
]) requireToken(effects, token, "Helping Hand clap/movement");
for (const token of [
  "void AnimTask_BlendMonInAndOut(u8 task)", "AnimTask_BlendPalInAndOutSetup(&gTasks[task]);",
  "BlendPalette(task->data[0], 15, task->data[2], task->data[1]);",
  "if (task->data[2] == task->data[3])", "DestroyAnimVisualTask(taskId);",
]) requireToken(mons, token, "Helping Hand partner palette blend");
for (const token of [
  "void AnimTask_ShakeMon2(u8 taskId)", "gSprites[spriteId].x2 = gBattleAnimArgs[1];",
  "gTasks[taskId].func(taskId);", "static void AnimTask_ShakeMon2_Step(u8 taskId)",
]) requireToken(movement, token, "Helping Hand partner shake");
for (const token of [
  "{gBattleAnimSpriteGfx_TagHand, 0x0400, ANIM_TAG_TAG_HAND}",
  "{gBattleAnimSpritePal_Finger, ANIM_TAG_TAG_HAND}",
]) requireToken(data, token, "Helping Hand TAG_HAND registry");
requireToken(graphics, 'gBattleAnimSpriteGfx_TagHand[] = INCGFX_U32("graphics/battle_anims/sprites/tag_hand.png", ".4bpp.lz")', "Helping Hand TAG_HAND graphics");
requireToken(constants, "#define ANIM_TAG_TAG_HAND                   (ANIM_SPRITES_START + 247)", "Helping Hand tag");
for (const token of [
  "static void Cmd_trysethelpinghand(void)", "gBattleTypeFlags & BATTLE_TYPE_DOUBLE",
  "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);",
]) requireToken(battleCommands, token, "Helping Hand singles guard");
requireToken(battleConstants, "#define BATTLE_TYPE_DOUBLE", "Helping Hand doubles guard constant");
for (const token of [
  "export function helpingHandClapAtTick", "export function helpingHandAttackerX2AtTick",
  "export function helpingHandPartnerBlendAtTick", "export function helpingHandPartnerShakeAtTick",
]) requireToken(reducer, token, "Helping Hand pure reducer");

const expectedComponents = [
  "asset:ANIM_TAG_TAG_HAND", "sprite:gHelpingHandClapSpriteTemplate",
  "task:AnimTask_BlendMonInAndOut", "task:AnimTask_HelpingHandAttackerMovement", "task:AnimTask_ShakeMon2",
];
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_HELPING_HAND");
const graphMove = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_HELPING_HAND");
const ranges = policy.rentalSelection.ranges.level50 as Array<{ start: number; end: number }>;
const carriers = frontier.entries.filter((entry: { index: number; moves: string[] }) =>
  ranges.some((range) => entry.index >= range.start && entry.index <= range.end)
  && entry.moves.includes("MOVE_HELPING_HAND"));
const carrierBlock = frontierSource.slice(frontierSource.indexOf("[FRONTIER_MON_VOLBEAT_1]"), frontierSource.indexOf("[FRONTIER_MON_ILLUMISE_1]"));
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "helping-hand-clap");
const entry = coverage.entries.find((item: { move: string }) => item.move === "MOVE_HELPING_HAND");
if (move?.id !== 270 || move?.frontierMonCount !== 5 || move?.exampleMons?.[0] !== "FRONTIER_MON_VOLBEAT_1"
  || JSON.stringify(graphMove?.blocks) !== JSON.stringify(["Move_HELPING_HAND"])
  || JSON.stringify(graphMove?.componentIds) !== JSON.stringify(expectedComponents)
  || carriers.length !== 5 || carriers[0]?.index !== 172 || carriers[0]?.label !== "FRONTIER_MON_VOLBEAT_1"
  || !carrierBlock.includes("BATTLE_FRONTIER_ITEM_LIECHI_BERRY")
  || !carrierBlock.includes("F_EV_SPREAD_SPEED | F_EV_SPREAD_ATTACK")
  || !carrierBlock.includes("NATURE_QUIRKY")
  || !frontierConstants.includes("#define FRONTIER_MON_VOLBEAT_1      172")
  || entry !== undefined || track?.fulfilled !== false
  || JSON.stringify(track?.components) !== JSON.stringify(expectedComponents)) {
  throw new Error("Helping Hand source/carrier/coverage contract drifted");
}

const start = 0x082cdebf;
const end = 0x082cdf32;
const rom = bytes("reference/pokeemerald/pokeemerald.gba");
const interval = {
  start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`,
  bytes: end - start, sha256: sha256(rom.subarray(start - 0x08000000, end - 0x08000000)),
};
if (address("Move_HELPING_HAND") !== start || address("Move_ASSIST") !== end
  || address("gHelpingHandClapSpriteTemplate") !== 0x085ce8ac
  || address("AnimHelpingHandClap") !== 0x0815ea14
  || address("AnimTask_HelpingHandAttackerMovement") !== 0x0815ec48
  || address("AnimTask_BlendMonInAndOut") !== 0x080a7b98
  || address("AnimTask_ShakeMon2") !== 0x080d52d0) {
  throw new Error("Helping Hand ROM symbol interval drifted");
}

console.log(JSON.stringify({
  move: "MOVE_HELPING_HAND", moveId: 270, status: "unsupported-source-contract",
  source: { root: interval, text: { bytes: Buffer.byteLength(body), sha256: sha256(body), rows } },
  components: expectedComponents,
  lifecycle: {
    sprites: 2, clapCallbacks: 60, movementCallbacks: 61, blendCallbacks: 24,
    shakes: [[2, 0, 5, 1], [2, 0, 5, 1], [3, 0, 10, 1]],
    audio: { id: "SE_M_ENCORE", pan: 0, starts: 3 },
    partner: "ANIM_ATK_PARTNER",
  },
  carrier: { lowestLegal: carriers[0], allLevel50: carriers, legalRanges: ranges },
  boundary: {
    mechanicLab: "v1 Level-50 singles", successRequires: "BATTLE_TYPE_DOUBLE",
    failureBefore: "attackanimation", exactPromotionBlocked: true,
  },
  ownership: { reducer: true, asset: true, stageEvidence: true, seam: false, renderer: false, framebuffer: false, gameplay: false },
}, null, 2));
