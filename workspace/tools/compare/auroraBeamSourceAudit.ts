/** Authoritative source/classification audit for MOVE_AURORA_BEAM. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const from = scripts.indexOf("Move_AURORA_BEAM:");
const to = scripts.indexOf("Move_SOLAR_BEAM:", from);
if (from < 0 || to < 0) throw new Error("missing Aurora Beam source interval");
const body = scripts.slice(from, to);
const expectedComponents = [
  "asset:ANIM_TAG_RAINBOW_RINGS",
  "soundTask:SoundTask_LoopSEAdjustPanning",
  "sprite:gAuroraBeamRingSpriteTemplate",
  "subroutine:AuroraBeamCreateRings",
  "task:AnimTask_RotateAuroraRingColors",
  "task:AnimTask_ShakeMon2",
  "visualCommand:fadetobg",
  "visualCommand:restorebg",
  "visualCommand:setarg",
  "visualCommand:waitbgfadein",
];
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_AURORA_BEAM");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_AURORA_BEAM");
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const allCarriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_AURORA_BEAM"));
const carriers = allCarriers.filter((entry: { index: number }) => entry.index >= inventory.tiers.level50.monIndices.first && entry.index <= inventory.tiers.level50.monIndices.last);
const first = carriers[0];
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "aurora-beam-rainbow-rings-bg");
const status = coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_AURORA_BEAM")?.status ?? "unsupported";

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const start = address("Move_AURORA_BEAM");
const end = address("Move_SOLAR_BEAM");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba")).subarray(start - 0x08000000, end - 0x08000000);
const romSha256 = createHash("sha256").update(bytes).digest("hex");
const sourceSha256 = createHash("sha256").update(body).digest("hex");

const water = read("reference/pokeemerald/src/battle_anim_water.c");
const sound = read("reference/pokeemerald/src/battle_anim_sound_tasks.c");
const core = read("reference/pokeemerald/src/battle_anim.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
for (const token of [
  "loadspritegfx ANIM_TAG_RAINBOW_RINGS", "fadetobg BG_AURORA", "createvisualtask AnimTask_RotateAuroraRingColors, 10, 130",
  "createvisualtask AnimTask_ShakeMon2, 5, ANIM_TARGET, 1, 0, 17, 1", "setarg 7, 0xFFFF",
  "createsoundtask SoundTask_LoopSEAdjustPanning, SE_M_BUBBLE_BEAM2, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 3, 6, 0, 10",
  "createvisualtask AnimTask_ShakeMon2, 5, ANIM_TARGET, 2, 0, 40, 1", "restorebg",
]) if (!body.includes(token)) throw new Error(`Aurora Beam script drifted: ${token}`);
if ((body.match(/call AuroraBeamCreateRings/g) ?? []).length !== 10
  || (body.match(/createsprite gAuroraBeamRingSpriteTemplate/g) ?? []).length !== 4
  || !water.includes("const struct SpriteTemplate gAuroraBeamRingSpriteTemplate")
  || !water.includes(".oam = &gOamData_AffineDouble_ObjNormal_8x16")
  || !water.includes(".callback = AnimAuroraBeamRings")
  || !water.includes("if ((u16)gBattleAnimArgs[7] == 0xFFFF)")
  || !water.includes("StartSpriteAnim(sprite, 1)") || !water.includes("sprite->affineAnimPaused = FALSE")
  || !water.includes("if (AnimTranslateLinear(sprite))") || !water.includes("DestroyAnimSprite(sprite)")
  || !water.includes("if (++gTasks[taskId].data[10] == 3)")
  || !water.includes("if (++gTasks[taskId].data[11] == gTasks[taskId].data[0])")
  || !sound.includes("void SoundTask_LoopSEAdjustPanning(u8 taskId)")
  || !core.includes("BeginHardwarePaletteFade(0xE8, 0, 0, 16, 0)")
  || !core.includes("LoadMoveBg(bgId)") || !core.includes("gTasks[taskId].tBackgroundId = -1")
  || !graphics.includes('gBattleAnimBgImage_Aurora[] = INCGFX_U32("graphics/battle_anims/backgrounds/aurora.png"')
  || !graphics.includes('gBattleAnimBgPalette_Aurora[] = INCGFX_U32("graphics/battle_anims/backgrounds/aurora.png", ".gbapal.lz")')
  || !graphics.includes('gBattleAnimBgTilemap_Aurora[] = INCGFX_U32("graphics/battle_anims/backgrounds/aurora.bin"')
  || !animData.includes("{gBattleAnimSpriteGfx_RainbowRings, 0x00c0, ANIM_TAG_RAINBOW_RINGS}")
  || !animData.includes("{gBattleAnimSpritePal_RainbowRings, ANIM_TAG_RAINBOW_RINGS}")
  || !animData.includes("[BG_AURORA]              = {gBattleAnimBgImage_Aurora")
  || JSON.stringify(graphEntry?.blocks) !== JSON.stringify(["Move_AURORA_BEAM", "AuroraBeamCreateRings"])
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)
  || move?.id !== 62 || move?.effect !== "EFFECT_ATTACK_DOWN_HIT" || move?.frontierMonCount !== 3
  || first?.index !== 219 || first?.label !== "FRONTIER_MON_SEADRA_1" || first?.species !== "SPECIES_SEADRA"
  || first?.itemName !== "BATTLE_FRONTIER_ITEM_MYSTIC_WATER" || first?.nature !== "NATURE_SASSY"
  || status !== "exact" || track?.fulfilled !== true
  || JSON.stringify(track?.components) !== JSON.stringify(expectedComponents)) {
  throw new Error("MOVE_AURORA_BEAM source/carrier/component/status contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_AURORA_BEAM", moveId: 62,
  sourceBounds: { start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, byteLength: bytes.length, romSha256, sourceByteLength: Buffer.byteLength(body), sourceSha256 },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  carrier: { lowestLevel50Set: 219, frontierMon: "FRONTIER_MON_SEADRA_1", speciesId: 117, itemId: 209, nature: "NATURE_SASSY", allLevel50Sets: carriers.map((entry: { index: number }) => entry.index), excludedBelowLevel50: allCarriers.filter((entry: { index: number }) => entry.index < 110).map((entry: { index: number }) => entry.index) },
  dispatch: { ringGroups: 10, ringsPerGroup: 4, ringsTotal: 40, paletteTaskFrames: 130, paletteRotateEvery: 3, firstShake: [1, 0, 17, 1], secondShake: [2, 0, 40, 1], arg7Gate: [0, 0xFFFF], bg: "BG_AURORA" },
  assets: { tag: "ANIM_TAG_RAINBOW_RINGS", tileBytes: 0xC0, palette: "gBattleAnimSpritePal_RainbowRings", cells: [0, 4], affine: [[0, 0, 0, 1], [0x60, 0x60, 0, 1]], oam: "gOamData_AffineDouble_ObjNormal_8x16", bgImage: "aurora.png", bgPalette: "gBattleAnimBgPalette_Aurora", bgTilemap: "aurora.bin" },
  paletteAndRegisters: { ringRotation: "faded OBJ colors 1..8 rotate left every 3 task ticks", fadeMask: "0xE8", blend: "hardware palette fade 0->16, load BG_AURORA, 16->0; restore repeats with default BG" },
  audio: { initial: "SE_M_BUBBLE_BEAM", loop: "SE_M_BUBBLE_BEAM2", loopArgs: [3, 6, 0, 10] },
  cleanup: ["DestroyAnimSprite", "DestroyAnimVisualTask", "restorebg", "waitbgfadein", "end"], status,
}, null, 2));
