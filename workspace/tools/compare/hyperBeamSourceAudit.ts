/** Authoritative source/classification audit for MOVE_HYPER_BEAM. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const from = scripts.indexOf("Move_HYPER_BEAM:");
const to = scripts.indexOf("Move_FLATTER:", from);
if (from < 0 || to < 0) throw new Error("missing Hyper Beam source interval");
const body = scripts.slice(from, to);
const commandRows = body.split("\n").map((row) => row.replace(/@.*$/u, "").trim())
  .filter((row) => row && !row.endsWith(":"));
const commandCounts = Object.fromEntries([...new Set(commandRows.map((row) => row.split(/\s+/u)[0]!))]
  .map((command) => [command, commandRows.filter((row) => row.startsWith(`${command} `) || row === command).length]));
const expectedComponents = [
  "asset:ANIM_TAG_ORBS",
  "soundTask:SoundTask_LoopSEAdjustPanning",
  "subroutine:HyperBeamOrbs",
  "task:AnimTask_BlendBattleAnimPal",
  "task:AnimTask_ShakeMon",
  "task:AnimTask_ShakeMon2",
  "visualCommand:create_hyper_beam_orb_sprite",
  "visualCommand:flash_anim_tag_with_color",
  "visualCommand:simple_palette_blend",
];
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_HYPER_BEAM");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_HYPER_BEAM");
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const allCarriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_HYPER_BEAM"));
const level50 = inventory.tiers.level50.monIndices;
const carriers = allCarriers.filter((entry: { index: number }) => entry.index >= level50.first && entry.index <= level50.last);
const first = carriers[0];
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "hyper-beam-orbs-blackout");
const status = coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_HYPER_BEAM")?.status ?? "unsupported";

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const start = address("Move_HYPER_BEAM");
const subroutine = address("HyperBeamOrbs");
const end = address("Move_FLATTER");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"))
  .subarray(start - 0x08000000, end - 0x08000000);
const romSha256 = createHash("sha256").update(bytes).digest("hex");
const sourceSha256 = createHash("sha256").update(body).digest("hex");

const beforeTarget = body.slice(0, body.indexOf("createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 50, 1"));
const afterTarget = body.slice(body.indexOf("createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 50, 1"));
const orbitCallsBeforeTarget = (beforeTarget.match(/call HyperBeamOrbs/g) ?? []).length;
const orbitCallsAfterTarget = (afterTarget.match(/call HyperBeamOrbs/g) ?? []).length;
const orbCalls = (body.match(/call HyperBeamOrbs/g) ?? []).length;
const orbsPerCall = (body.match(/create_hyper_beam_orb_sprite/g) ?? []).length;

const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const orbFrom = effects.indexOf("static void AnimHyperBeamOrb(struct Sprite *sprite)");
const orbTo = effects.indexOf("// seed (sprouts a sapling from a seed.)", orbFrom);
const orbBody = effects.slice(orbFrom, orbTo);
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const sound = read("reference/pokeemerald/src/battle_anim_sound_tasks.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
const requiredTokens = [
  "loadspritegfx ANIM_TAG_ORBS",
  "simple_palette_blend selector=F_PAL_BG, delay=4, initial_blend_y=0, target_blend_y=16, color=RGB_BLACK",
  "playsewithpan SE_M_HYPER_BEAM, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_ATTACKER, 1, 0, 4, 1",
  "createsoundtask SoundTask_LoopSEAdjustPanning, SE_M_HYPER_BEAM2, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 1, 15, 0, 5",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_ATTACKER, 0, 4, 50, 1",
  "flash_anim_tag_with_color tag=ANIM_TAG_ORBS, delay=1, num_blends=12, color1=RGB_RED, blend_y1=16, color2=RGB_BLACK, blend_y2=0",
  "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 50, 1",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 2, 0, 11, RGB(25, 25, 25)",
  "createvisualtask AnimTask_BlendBattleAnimPal, 10, F_PAL_TARGET, 2, 11, 0, RGB(25, 25, 25)",
  "simple_palette_blend selector=F_PAL_BG, delay=4, initial_blend_y=16, target_blend_y=0, color=RGB_BLACK",
];
if (requiredTokens.some((token) => !body.includes(token))
  || orbCalls !== 26 || orbitCallsBeforeTarget !== 5 || orbitCallsAfterTarget !== 21 || orbsPerCall !== 2
  || commandCounts.loadspritegfx !== 1 || commandCounts.simple_palette_blend !== 2
  || commandCounts.waitforvisualfinish !== 3 || commandCounts.delay !== 3 || commandCounts.playsewithpan !== 1
  || commandCounts.createvisualtask !== 5 || commandCounts.createsoundtask !== 1
  || commandCounts.flash_anim_tag_with_color !== 1 || commandCounts.call !== 26
  || commandCounts.create_hyper_beam_orb_sprite !== 2 || commandCounts.end !== 1 || commandCounts.return !== 1
  || !effects.includes("const struct SpriteTemplate gHyperBeamOrbSpriteTemplate")
  || !effects.includes(".oam = &gOamData_AffineOff_ObjNormal_8x8")
  || !effects.includes(".anims = gSolarBeamBigOrbAnimTable")
  || !effects.includes(".callback = AnimHyperBeamOrb")
  || (orbBody.match(/Random2\(\)/g) ?? []).length !== 3
  || !orbBody.includes("StartSpriteAnim(sprite, animNum % 8)")
  || !orbBody.includes("InitAnimFastLinearTranslationWithSpeed(sprite)")
  || !orbBody.includes("sprite->y2 += Cos(sprite->data[5], 12)")
  || !orbBody.includes("DestroyAnimSprite(sprite)")
  || !normal.includes("void AnimTask_FlashAnimTagWithColor(u8 taskId)")
  || !normal.includes("AnimTask_FlashAnimTagWithColor_Step1")
  || !normal.includes("AnimTask_FlashAnimTagWithColor_Step2")
  || !normal.includes("DestroyAnimVisualTask(taskId)")
  || !movement.includes("void AnimTask_ShakeMon(u8 taskId)")
  || !movement.includes("void AnimTask_ShakeMon2(u8 taskId)")
  || !utility.includes("void AnimTask_BlendBattleAnimPal(u8 taskId)")
  || !sound.includes("void SoundTask_LoopSEAdjustPanning(u8 taskId)")
  || !sound.includes("DestroyAnimSoundTask(taskId)")
  || !animData.includes("{gBattleAnimSpriteGfx_Orbs, 0x0180, ANIM_TAG_ORBS}")
  || !animData.includes("{gBattleAnimSpritePal_Orbs, ANIM_TAG_ORBS}")
  || JSON.stringify(graphEntry?.blocks) !== JSON.stringify(["Move_HYPER_BEAM", "HyperBeamOrbs"])
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)
  || move?.id !== 63 || move?.effect !== "EFFECT_RECHARGE" || move?.frontierMonCount !== 4 || move?.speciesCount !== 4
  || JSON.stringify(allCarriers.map((entry: { index: number }) => entry.index)) !== JSON.stringify([531, 805, 826, 836, 852, 853])
  || JSON.stringify(carriers.map((entry: { index: number }) => entry.index)) !== JSON.stringify([531, 805, 826, 836])
  || first?.index !== 531 || first?.label !== "FRONTIER_MON_AERODACTYL_2" || first?.species !== "SPECIES_AERODACTYL"
  || first?.itemName !== "BATTLE_FRONTIER_ITEM_CHOICE_BAND" || first?.nature !== "NATURE_ADAMANT"
  || status !== "unsupported" || track?.fulfilled !== false
  || JSON.stringify(track?.components) !== JSON.stringify(expectedComponents)) {
  throw new Error("MOVE_HYPER_BEAM source/carrier/component/status contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_HYPER_BEAM", moveId: 63, status,
  sourceBounds: {
    start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, byteLength: bytes.length,
    romSha256, sourceByteLength: Buffer.byteLength(body), sourceSha256,
  },
  pointerOwned: {
    root: { symbol: "Move_HYPER_BEAM", start: `0x${start.toString(16)}`, endExclusive: `0x${subroutine.toString(16)}` },
    subroutine: { symbol: "HyperBeamOrbs", start: `0x${subroutine.toString(16)}`, endExclusive: `0x${end.toString(16)}` },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  commands: commandCounts,
  dispatch: {
    blackout: ["F_PAL_BG", 4, 0, 16, "RGB_BLACK"], restore: ["F_PAL_BG", 4, 16, 0, "RGB_BLACK"],
    attackerShake2: ["ANIM_ATTACKER", 1, 0, 4, 1], attackerShake: ["ANIM_ATTACKER", 0, 4, 50, 1],
    targetShake2: ["ANIM_TARGET", 4, 0, 50, 1], targetBlendForward: ["F_PAL_TARGET", 2, 0, 11, "RGB(25, 25, 25)"],
    targetBlendReverse: ["F_PAL_TARGET", 2, 11, 0, "RGB(25, 25, 25)"],
    hyperBeamOrbs: { groups: orbCalls, groupsBeforeTargetShake: orbitCallsBeforeTarget, groupsAfterTargetShake: orbitCallsAfterTarget, orbsPerGroup: orbsPerCall, totalOrbs: orbCalls * orbsPerCall },
  },
  callbacks: {
    orb: "AnimHyperBeamOrb -> AnimHyperBeamOrb_Step -> DestroyAnimSprite; three Random2 draws per orb, 8 animation cells, fast linear target translation, Cos(phase, 12) y wobble, +24 phase",
    flash: "AnimTask_FlashAnimTagWithColor -> Step1/Step2 -> DestroyAnimVisualTask",
    shakes: "AnimTask_ShakeMon2 attacker/target plus AnimTask_ShakeMon attacker",
  },
  assets: { tag: "ANIM_TAG_ORBS", tileBytes: 0x180, palette: "gBattleAnimSpritePal_Orbs", template: "gHyperBeamOrbSpriteTemplate", oam: "gOamData_AffineOff_ObjNormal_8x8", anims: "gSolarBeamBigOrbAnimTable" },
  palette: { flash: ["ANIM_TAG_ORBS", 1, 12, "RGB_RED", 16, "RGB_BLACK", 0], targetBlend: ["F_PAL_TARGET", 2, 0, 11, "RGB(25, 25, 25)", 11, 0] },
  audio: { initial: ["SE_M_HYPER_BEAM", "SOUND_PAN_ATTACKER"], loop: ["SE_M_HYPER_BEAM2", "SOUND_PAN_ATTACKER", "SOUND_PAN_TARGET", 1, 15, 0, 5] },
  resourcesAndCleanup: ["loadspritegfx ANIM_TAG_ORBS", "52 transient ORBS sprites destroy through AnimFastTranslateLinear", "flash/task/sound tasks destroy themselves", "waitforvisualfinish", "F_PAL_BG black 16->0", "end"],
  carrier: {
    lowestLevel50Set: 531, frontierMon: "FRONTIER_MON_AERODACTYL_2", speciesId: 142, itemId: 186, nature: "NATURE_ADAMANT",
    allLevel50Sets: carriers.map((entry: { index: number }) => entry.index), allInventorySets: allCarriers.map((entry: { index: number }) => entry.index),
    excludedOpenOnly: allCarriers.filter((entry: { index: number }) => entry.index > level50.last).map((entry: { index: number }) => entry.index),
  },
}, null, 2));
