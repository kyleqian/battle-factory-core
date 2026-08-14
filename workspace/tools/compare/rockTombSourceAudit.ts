import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path: string): string => readFileSync(path, "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const rock = read("reference/pokeemerald/src/battle_anim_rock.c");
const normal = read("reference/pokeemerald/src/battle_anim_normal.c");
const psychic = read("reference/pokeemerald/src/battle_anim_psychic.c");
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const rom = readFileSync("reference/pokeemerald/pokeemerald.gba");
const nm = execFileSync("arm-none-eabi-nm", ["-a", "reference/pokeemerald/pokeemerald.elf"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const address = (symbol: string): number => Number.parseInt(nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"))?.[1] ?? "0", 16);
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const body = scripts.slice(scripts.indexOf("Move_ROCK_TOMB:"), scripts.indexOf("Move_SILVER_WIND:"));
const commands = body.split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
const expected = ["asset:ANIM_TAG_ROCKS", "asset:ANIM_TAG_X_SIGN", "sprite:gRedXSpriteTemplate", "sprite:gRockTombRockSpriteTemplate", "task:AnimTask_ShakeMon", "visualCommand:shake_battle_platforms"];
const move = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_ROCK_TOMB");
const sibling = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_HYPER_VOICE");
const tier = inventory.tiers.level50.monIndices;
const carriers = mons.entries.filter((entry: { index: number; moves: string[] }) => entry.index >= tier.first && entry.index <= tier.last && entry.moves.includes("MOVE_ROCK_TOMB"));
const ranges = {
  moveScript: [0x082d6224, 0x082d630b], rockInit: [0x08111388, 0x081113c8],
  rockStep: [0x081113c8, 0x08111418], redXStep: [0x0810fb60, 0x0810fba8],
  redXInit: [0x0810fba8, 0x0810fbf0], platformInit: [0x081162a4, 0x081162f8],
  platformStep: [0x081162f8, 0x08116388],
} as const;
const sourceRom = Object.fromEntries(Object.entries(ranges).map(([name, [start, end]]) => [name, { start: `0x${start.toString(16)}`, endExclusive: `0x${end.toString(16)}`, bytes: end - start, sha256: sha256(rom.subarray(start - 0x08000000, end - 0x08000000)) }]));
if (address("Move_ROCK_TOMB") !== ranges.moveScript[0] || address("Move_SILVER_WIND") !== ranges.moveScript[1]
  || address("AnimRockTomb") !== ranges.rockInit[0] || address("AnimRockTomb_Step") !== ranges.rockStep[0]
  || address("AnimRedX_Step") !== ranges.redXStep[0] || address("AnimRedX") !== ranges.redXInit[0]
  || address("AnimTask_ShakeBattlePlatforms") !== ranges.platformInit[0] || address("AnimTask_ShakeBattlePlatforms_Step") !== ranges.platformStep[0]
  || JSON.stringify(move.componentIds) !== JSON.stringify(expected) || carriers.length !== 19
  || carriers[0]?.index !== 110 || carriers[0]?.label !== "FRONTIER_MON_GRIMER"
  || !rock.includes("sprite->data[3] += sprite->data[0]") || !psychic.includes("static void AnimRedX_Step")
  || !normal.includes("gBattle_BG3_X = -gTasks[taskId].tXOffset")
  || commands.filter((line) => line.startsWith("createsprite gRockTombRockSpriteTemplate")).length !== 4
  || commands.filter((line) => line.startsWith("shake_battle_platforms")).length !== 6) throw new Error("Rock Tomb source/carrier/component contract changed");
console.log(JSON.stringify({ move: "MOVE_ROCK_TOMB", sourceBounds: { start: "0x082d6224", endExclusive: "0x082d630b", bytes: 231 }, commands, sourceRom, components: expected, carrier: "set 110 FRONTIER_MON_GRIMER / SPECIES_GRIMER / MOVE_ROCK_TOMB", carriers: carriers.length, reusedAssets: ["src/animation/assets/sludge.json (GRIMER)", "src/animation/assets/block.json (X_SIGN)", "source ROCKS already exercised by exact moves"], siblingAudit: { move: "MOVE_HYPER_VOICE", components: sibling.componentIds, shared: ["visualCommand:shake_battle_platforms"], promoted: false } }));
