/** Authoritative source/classification audit for MOVE_HORN_DRILL. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const from = scripts.indexOf("Move_HORN_DRILL:");
const to = scripts.indexOf("Move_THRASH:", from);
if (from < 0 || to < 0) throw new Error("missing Horn Drill source interval");
const body = scripts.slice(from, to);
const commands = body.split("\n").map((row) => row.replace(/@.*$/u, "").trim()).filter(Boolean);
const expectedComponents = [
  "asset:ANIM_TAG_HORN_HIT", "asset:ANIM_TAG_IMPACT", "sprite:gBowMonSpriteTemplate",
  "sprite:gHornHitSpriteTemplate", "subroutine:HornDrillContinue", "subroutine:HornDrillInContest",
  "task:AnimTask_ShakeMonInPlace", "task:AnimTask_StartSlidingBg",
  "visualCommand:create_flashing_hitsplat_sprite", "visualCommand:fadetobg", "visualCommand:playse",
  "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg",
  "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
];
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const graphEntry = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_HORN_DRILL");
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const move = inventory.tiers.level50.moves.find((entry: { move: string }) => entry.move === "MOVE_HORN_DRILL");
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const carriers = mons.entries.filter((entry: { moves: string[] }) => entry.moves.includes("MOVE_HORN_DRILL"));
const first = carriers[0];
const coverage = JSON.parse(read("ANIMATION_COVERAGE.json"));
const track = coverage.componentTracks.find((entry: { id: string }) => entry.id === "horn-drill-bg-horn-shakes");
const status = coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_HORN_DRILL")?.status;

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const address = (symbol: string): number => {
  const match = nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"));
  if (!match) throw new Error(`missing ${symbol}`);
  return Number.parseInt(match[1]!, 16);
};
const start = address("Move_HORN_DRILL");
const end = address("Move_THRASH");
const bytes = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba")).subarray(start - 0x08000000, end - 0x08000000);
const romSha256 = createHash("sha256").update(bytes).digest("hex");
const sourceSha256 = createHash("sha256").update(body).digest("hex");

const effects = read("reference/pokeemerald/src/battle_anim_effects_1.c");
const movement = read("reference/pokeemerald/src/battle_anim_mon_movement.c");
const utility = read("reference/pokeemerald/src/battle_anim_utility_funcs.c");
const graphics = read("reference/pokeemerald/src/graphics.c");
const animData = read("reference/pokeemerald/src/data/battle_anim.h");
for (const token of [
  "fadetobg BG_DRILL", "createvisualtask AnimTask_StartSlidingBg, 5, -2304, 768, 1, -1",
  "createsprite gHornHitSpriteTemplate, ANIM_TARGET, 4, 0, 0, 12",
  "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_ATTACKER, 2, 0, 40, 1",
  "createvisualtask AnimTask_ShakeMonInPlace, 2, ANIM_TARGET, 10, 0, 40, 1",
  "restorebg", "setarg 7, 0xFFFF", "fadetobg BG_DRILL_CONTESTS",
]) if (!body.includes(token)) throw new Error(`Horn Drill script drifted: ${token}`);
if ((body.match(/create_flashing_hitsplat_sprite/g) ?? []).length !== 11
  || (body.match(/playsewithpan SE_M_HORN_ATTACK/g) ?? []).length !== 11
  || (body.match(/gBowMonSpriteTemplate/g) ?? []).length !== 3
  || !effects.includes("const struct SpriteTemplate gHornHitSpriteTemplate")
  || !effects.includes(".callback = AnimHornHit")
  || !movement.includes("void AnimTask_ShakeMonInPlace(u8 taskId)")
  || !utility.includes("void AnimTask_StartSlidingBg(u8 taskId)")
  || !utility.includes("static void AnimTask_UpdateSlidingBg(u8 taskId)")
  || !graphics.includes('gBattleAnimBgImage_Drill[] = INCGFX_U32("graphics/battle_anims/backgrounds/drill.png"')
  || !graphics.includes('gBattleAnimBgTilemap_Drill[] = INCGFX_U32("graphics/battle_anims/backgrounds/drill.bin"')
  || !animData.includes("[BG_DRILL]               = {gBattleAnimBgImage_Drill")
  || JSON.stringify(graphEntry?.blocks) !== JSON.stringify(["Move_HORN_DRILL", "HornDrillInContest", "HornDrillContinue"])
  || JSON.stringify(graphEntry?.componentIds) !== JSON.stringify(expectedComponents)
  || move?.id !== 32 || move?.effect !== "EFFECT_OHKO" || move?.frontierMonCount !== 9
  || first?.index !== 333 || first?.label !== "FRONTIER_MON_SEAKING_2" || first?.species !== "SPECIES_SEAKING"
  || first?.itemName !== "BATTLE_FRONTIER_ITEM_QUICK_CLAW" || first?.nature !== "NATURE_IMPISH"
  || status !== "exact" || track?.fulfilled !== true
  || JSON.stringify(track?.components) !== JSON.stringify(expectedComponents)) {
  throw new Error("MOVE_HORN_DRILL source/carrier/component/status contract changed");
}

console.log(JSON.stringify({
  move: "MOVE_HORN_DRILL", moveId: 32,
  sourceBounds: { start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, byteLength: bytes.length, romSha256, sourceByteLength: Buffer.byteLength(body), sourceSha256 },
  graph: { blocks: graphEntry.blocks, components: expectedComponents },
  carrier: { lowestLevel50Set: 333, frontierMon: "FRONTIER_MON_SEAKING_2", speciesId: 119, itemId: 183, nature: "NATURE_IMPISH", allLevel50Sets: carriers.map((entry: { index: number }) => entry.index) },
  dispatch: { bowSprites: 3, hornSprites: 1, flashingImpacts: 11, attackerShake: [2, 0, 40, 1], targetShake: [10, 0, 40, 1], drillBg: ["BG_DRILL", "BG_DRILL_CONTESTS"], scroll: [-2304, 768, 1, -1] },
  audio: { headbutt: 1, bang: 1, hornAttackTargetPanned: 11 },
  status: "exact",
}, null, 2));
