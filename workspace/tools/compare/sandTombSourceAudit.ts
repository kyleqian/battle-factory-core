/** Strict dev-time authoritative-source audit for unsupported MOVE_SAND_TOMB. */
import { execFileSync } from "node:child_process";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const bytes = (path: string): Buffer => readFileSync(resolve(root, path));
const digest = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const rock = read("reference/pokeemerald/src/battle_anim_rock.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const engine = read("reference/pokeemerald/src/battle_anim.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const graphics = read("reference/pokeemerald/src/graphics.c");
const constants = read("reference/pokeemerald/include/constants/battle_anim.h");
const songs = read("reference/pokeemerald/include/constants/songs.h");
const frontierSource = read("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
const frontierConstants = read("reference/pokeemerald/include/constants/battle_frontier_mons.h");
const factory = read("reference/pokeemerald/src/battle_factory.c");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const frontier = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const policy = JSON.parse(read("src/data/gen/factory-round-policy.json"));
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const reducer = read("src/animation/sandTomb.ts");
const seam = read("src/animation/sceneOnPresentation.ts");
const compositor = read("src/engine/battleScene.ts");

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

const body = scripts.slice(scripts.indexOf("Move_SAND_TOMB:"), scripts.indexOf("Move_SHEER_COLD:"));
const commandRows = body.trim().split("\n").map((line) => line.trim());
const expectedRows = [
  "Move_SAND_TOMB:",
  "loadspritegfx ANIM_TAG_MUD_SAND",
  "simple_palette_blend unused_subpriority_offset=0, selector=F_PAL_TARGET, delay=2, initial_blend_y=0, target_blend_y=7, color=RGB(19, 17, 0)",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 0, 2, 43, 1",
  "playsewithpan SE_M_SAND_TOMB, SOUND_PAN_TARGET",
  "call SandTombSwirlingDirt", "call SandTombSwirlingDirt", "call SandTombSwirlingDirt",
  "delay 22",
  "simple_palette_blend unused_subpriority_offset=0, selector=F_PAL_TARGET, delay=2, initial_blend_y=7, target_blend_y=0, color=RGB(19, 17, 0)",
  "waitforvisualfinish", "end", "", "SandTombSwirlingDirt:",
  "createsprite gSwirlingDirtSpriteTemplate, ANIM_TARGET, 2, 0, 32, 528, 30, 10, 50, ANIM_TARGET", "delay 2",
  "createsprite gSwirlingDirtSpriteTemplate, ANIM_TARGET, 2, 0, 36, 480, 20, 13, -46, ANIM_TARGET", "delay 2",
  "createsprite gSwirlingDirtSpriteTemplate, ANIM_TARGET, 2, 0, 37, 576, 20, 5, 42, ANIM_TARGET", "delay 2",
  "createsprite gSwirlingDirtSpriteTemplate, ANIM_TARGET, 2, 0, 35, 400, 25, 8, -42, ANIM_TARGET", "delay 2",
  "createsprite gSwirlingDirtSpriteTemplate, ANIM_TARGET, 2, 0, 32, 512, 25, 13, 46, ANIM_TARGET", "delay 2",
  "createsprite gSwirlingDirtSpriteTemplate, ANIM_TARGET, 2, 0, 37, 464, 30, 12, -50, ANIM_TARGET", "delay 2", "return",
];
if (commandRows.join("\n") !== expectedRows.join("\n") || Buffer.byteLength(body) !== 1218
  || digest(body) !== "3b672f3fbd0eb6d5a6f3dd28b27e06287cf3277b184bcac38f7612b1260abbca") {
  throw new Error("Sand Tomb script commands or source-text interval drifted");
}

for (const token of [
  "const struct SpriteTemplate gSwirlingDirtSpriteTemplate =", ".tileTag = ANIM_TAG_MUD_SAND,",
  ".paletteTag = ANIM_TAG_MUD_SAND,", ".oam = &gOamData_AffineOff_ObjNormal_8x8,",
  ".callback = AnimParticleInVortex,", "static void AnimParticleInVortex(struct Sprite *sprite)",
  "InitSpritePosToAnimTarget(sprite, FALSE);", "sprite->data[0] = gBattleAnimArgs[3];",
  "sprite->data[1] = gBattleAnimArgs[2];", "sprite->data[2] = gBattleAnimArgs[4];",
  "sprite->data[3] = gBattleAnimArgs[5];", "sprite->y2 = -(sprite->data[4] >> 8);",
  "sprite->x2 = Sin(sprite->data[5], sprite->data[3]);",
  "sprite->data[5] = (sprite->data[5] + sprite->data[2]) & 0xFF;",
  "if (--sprite->data[0] == -1)", "DestroyAnimSprite(sprite);",
]) requireToken(rock, token, "Sand Tomb vortex/template callback");
for (const token of [
  "void AnimTask_ShakeMon(u8 taskId)", "GetAnimBattlerSpriteId(gBattleAnimArgs[0])",
  "gSprites[spriteId].y2 = gBattleAnimArgs[2];", "gTasks[taskId].data[1] = gBattleAnimArgs[3];",
  "gTasks[taskId].func = AnimTask_ShakeMon_Step;", "gSprites[gTasks[taskId].data[0]].y2 = 0;",
  "DestroyAnimVisualTask(taskId);",
]) requireToken(movement, token, "Sand Tomb ShakeMon task/cleanup");
for (const token of [
  "const struct SpriteTemplate gSimplePaletteBlendSpriteTemplate =", ".callback = AnimSimplePaletteBlend,",
  "UnpackSelectedBattlePalettes(cmd->selector)", "BeginNormalPaletteFade(selectedPalettes, cmd->delay, cmd->initialBlendY, cmd->targetBlendY, cmd->color);",
  "sprite->invisible = TRUE;", "sprite->callback = AnimSimplePaletteBlend_Step;", "if (!gPaletteFade.active)", "DestroyAnimSprite(sprite);",
]) requireToken(normal, token, "Sand Tomb palette task/cleanup");
for (const token of ["static void Cmd_end(void)", "FreeSpriteTilesByTag(gBattleAnimPicTable[sAnimSpriteIndexArray[i]].tag);", "FreeSpritePaletteByTag(gBattleAnimPicTable[sAnimSpriteIndexArray[i]].tag);"])
  requireToken(engine, token, "animation end resource cleanup");
for (const token of [
  "{gBattleAnimSpriteGfx_MudSand, 0x00A0, ANIM_TAG_MUD_SAND}",
  "{gBattleAnimSpritePal_MudSand, ANIM_TAG_MUD_SAND}",
]) requireToken(animData, token, "Sand Tomb resource registry");
for (const token of [
  'gBattleAnimSpriteGfx_MudSand[] = INCGFX_U32("graphics/battle_anims/sprites/mud_sand.4bpp", ".lz")',
  'gBattleAnimSpritePal_MudSand[] = INCGFX_U32("graphics/battle_anims/sprites/mud_sand.pal", ".gbapal.lz")',
]) requireToken(graphics, token, "Sand Tomb source asset");
requireToken(constants, "#define ANIM_TAG_MUD_SAND                   (ANIM_SPRITES_START + 74)", "Sand Tomb asset tag");
requireToken(songs, "#define SE_M_SAND_TOMB              230", "Sand Tomb audio");
for (const [source, token, owner] of [
  [reducer, "export function sandTombTimeline", "Sand Tomb pure reducer"],
  [reducer, "SAND_TOMB_VORTEX_CALLS", "Sand Tomb source call table"],
  [reducer, "targetOamAtAge", "Sand Tomb OAM/ShakeMon latch reducer"],
  [seam, "export interface SceneOnSandTombConfig", "Sand Tomb typed Scene-ON seam"],
  [seam, "export function sceneOnSandTombView", "Sand Tomb Scene-ON view"],
  [compositor, "state.config.move === \"SAND_TOMB\"", "Sand Tomb ordinary compositor"],
  [compositor, "sandTombMudSandArt", "Sand Tomb extracted MUD_SAND compositor asset"],
] as const) requireToken(source, token, owner);

const expectedComponents = ["asset:ANIM_TAG_MUD_SAND", "sprite:gSwirlingDirtSpriteTemplate", "subroutine:SandTombSwirlingDirt", "task:AnimTask_ShakeMon", "visualCommand:simple_palette_blend"];
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_SAND_TOMB");
const graphMove = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_SAND_TOMB");
const level50Ranges = policy.rentalSelection.ranges.level50 as Array<{ start: number; end: number }>;
const carriers = frontier.entries.filter((entry: { index: number; moves: string[] }) =>
  level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end) && entry.moves.includes("MOVE_SAND_TOMB"));
const carrierBlock = frontierSource.slice(frontierSource.indexOf("[FRONTIER_MON_DUGTRIO_1]"), frontierSource.indexOf("[FRONTIER_MON_MEDICHAM_1]"));
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "sand-tomb-vortex");
if (move?.id !== 328 || move?.frontierMonCount !== 1 || move?.exampleMons?.join(",") !== "FRONTIER_MON_DUGTRIO_1"
  || JSON.stringify(graphMove?.blocks) !== JSON.stringify(["Move_SAND_TOMB", "SandTombSwirlingDirt"])
  || JSON.stringify(graphMove?.componentIds) !== JSON.stringify(expectedComponents)
  || carriers.length !== 1 || carriers[0]?.index !== 372 || carriers[0]?.label !== "FRONTIER_MON_DUGTRIO_1"
  || carriers[0]?.species !== "SPECIES_DUGTRIO" || carriers[0]?.moves.join(",") !== "MOVE_EARTHQUAKE,MOVE_TRI_ATTACK,MOVE_SLASH,MOVE_SAND_TOMB"
  || !carrierBlock.includes("BATTLE_FRONTIER_ITEM_SOFT_SAND") || !carrierBlock.includes("F_EV_SPREAD_SPEED | F_EV_SPREAD_ATTACK") || !carrierBlock.includes("NATURE_ADAMANT")
  || !frontierConstants.includes("#define FRONTIER_MON_DUGTRIO_1      372")
  || !factory.includes("{FRONTIER_MON_DUGTRIO_1,  FRONTIER_MON_SLAKING_1},  // 372 - 467")
  || coverage.entries.find((entry: { move: string; status: string }) => entry.move === "MOVE_SAND_TOMB")?.status !== "exact"
  || coverage.queue.includes("MOVE_SAND_TOMB") || track?.fulfilled !== true
  || JSON.stringify(track?.components) !== JSON.stringify(expectedComponents)) {
  throw new Error("Sand Tomb component/carrier/unsupported coverage contract drifted");
}

const start = 0x082d516a;
const subroutine = 0x082d51b7;
const end = 0x082d5242;
const rom = bytes("reference/pokeemerald/pokeemerald.gba");
const interval = (from: number, to: number) => ({
  start: `0x${from.toString(16).padStart(8, "0")}`, endExclusive: `0x${to.toString(16).padStart(8, "0")}`,
  bytes: to - from, sha256: digest(rom.subarray(from - 0x08000000, to - 0x08000000)),
});
if (address("Move_SAND_TOMB") !== start || address("SandTombSwirlingDirt") !== subroutine || address("Move_SHEER_COLD") !== end
  || address("gSwirlingDirtSpriteTemplate") !== 0x08596b34 || address("AnimParticleInVortex") !== 0x08110b38
  || address("AnimParticleInVortex_Step") !== 0x08110b80 || address("AnimTask_ShakeMon") !== 0x080d51ac
  || address("gSimplePaletteBlendSpriteTemplate") !== 0x08597274 || address("AnimSimplePaletteBlend") !== 0x081157fc
  || interval(start, subroutine).sha256 !== "23701555772a9a43b70a26589187a029954e9859d26f7e66ca9fac11a0f04b68"
  || interval(subroutine, end).sha256 !== "8346bc94ab13ba070c56e3c60863dca3a566750cb435fab353a658e8a0325ee0"
  || interval(start, end).sha256 !== "0ddd2f1fdfb4bc3819f44c4fc581c4e85f903d66760cf2a1f325a57805a283f3") {
  throw new Error("Sand Tomb ELF/ROM pointer interval drifted");
}

console.log(JSON.stringify({
  move: "MOVE_SAND_TOMB", moveId: 328, status: "exact-source-contract",
  source: { root: interval(start, subroutine), subroutine: interval(subroutine, end), complete: interval(start, end), text: { bytes: Buffer.byteLength(body), sha256: digest(body), commandRows } },
  components: expectedComponents,
  lifecycle: { sprites: 18, spriteArgs: commandRows.filter((row) => row.startsWith("createsprite")), palettePrograms: 2, shake: ["ANIM_TARGET", 0, 2, 43, 1], audio: { id: 230, pan: "SOUND_PAN_TARGET" }, resources: { load: ["ANIM_TAG_MUD_SAND"], cleanup: "Cmd_end frees loaded sheet and palette tags" } },
  callbacks: ["AnimParticleInVortex", "AnimParticleInVortex_Step", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step", "Cmd_end"],
  carrier: { lowestLegal: carriers[0], allLevel50: carriers, legalRange: level50Ranges[3] },
  asset: { tag: "ANIM_TAG_MUD_SAND", shared: true, sandTombExclusiveArt: false, cell: "tile 0, 8x8", sourceBytes: 0xa0 },
  siblings: { mudSand: ["MOVE_SAND_ATTACK", "MOVE_FISSURE", "MOVE_DIG", "MOVE_MUD_SLAP", "MOVE_ROLLOUT", "MOVE_MUD_SPORT"], note: "controls retain independent status; no sibling credit" },
  ownership: { reducer: true, seam: true, renderer: true, framebuffer: true, gameplayState: false, rng: false, controller: false },
}, null, 2));
