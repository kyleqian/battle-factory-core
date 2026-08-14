import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../..", import.meta.url).pathname);
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const scripts = read("reference/pokeemerald/data/battle_anim_scripts.s");
const dark = read("reference/pokeemerald/src/battle_anim_dark.c");
const anim = read("reference/pokeemerald/src/battle_anim.c");
const rom = readFileSync(resolve(root, "reference/pokeemerald/pokeemerald.gba"));
const mons = JSON.parse(read("src/data/gen/battle-frontier-mons.json"));
const inventory = JSON.parse(read("src/data/gen/factory-animation-inventory.json"));
const graph = JSON.parse(read("src/data/gen/battle-animation-components.json"));
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(root, "reference/pokeemerald/pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
});
const address = (symbol: string): number => Number.parseInt(
  nm.match(new RegExp(`^([0-9a-fA-F]+)\\s+\\w\\s+${symbol}$`, "m"))?.[1] ?? "0", 16,
);
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const block = scripts.slice(scripts.indexOf("Move_MEMENTO:"), scripts.indexOf("Move_FACADE:"));
const memento = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_MEMENTO");
const dig = graph.moves.find((entry: { move: string }) => entry.move === "MOVE_DIG");
const expected = [
  "task:AnimTask_InitMementoShadow",
  "task:AnimTask_MementoHandleBg",
  "task:AnimTask_MoveAttackerMementoShadow",
  "task:AnimTask_MoveTargetMementoShadow",
  "visualCommand:blendoff",
  "visualCommand:clearmonbg_static",
  "visualCommand:monbg_static",
  "visualCommand:setalpha",
];
const sharedWithDig = dig.componentIds.filter((id: string) => expected.includes(id));
const level50 = inventory.tiers.level50.monIndices;
const carriers = mons.entries.filter((entry: { index: number; moves: string[] }) =>
  entry.index >= level50.first && entry.index <= level50.last && entry.moves.includes("MOVE_MEMENTO"));
const scriptCommands = block.split("\n").slice(1).map((line) => line.trim()).filter(Boolean);
const expectedScriptCommands = [
  "setalpha 0, 16",
  "delay 1",
  "createvisualtask AnimTask_InitMementoShadow, 2",
  "delay 1",
  "createvisualtask AnimTask_MoveAttackerMementoShadow, 5",
  "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER",
  "delay 48",
  "playsewithpan SE_M_PSYBEAM2, SOUND_PAN_ATTACKER",
  "waitforvisualfinish",
  "createvisualtask AnimTask_MementoHandleBg, 2",
  "delay 12",
  "setalpha 0, 16",
  "delay 1",
  "monbg_static ANIM_TARGET",
  "createvisualtask AnimTask_MoveTargetMementoShadow, 5",
  "playsewithpan SE_M_PSYBEAM, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "clearmonbg_static ANIM_TARGET",
  "delay 1",
  "blendoff",
  "delay 1",
  "end",
];
const romRanges = {
  moveScript: [0x082cdcf2, 0x082cdd36],
  attackerInit: [0x08113bac, 0x08113d60],
  attackerStep: [0x08113d60, 0x08113e78],
  targetInit: [0x08113e78, 0x081140c8],
  targetStep: [0x081140c8, 0x08114244],
  scanlineReducer: [0x08114244, 0x08114374],
  battlerPriority: [0x08114374, 0x081143c0],
  initShadow: [0x081143c0, 0x08114470],
  handleBg: [0x08114470, 0x081144bc],
  monbgStatic: [0x080a4a18, 0x080a4adc],
  clearmonbgStatic: [0x080a4adc, 0x080a4bb0],
  clearMonBgStaticTask: [0x080a4bb0, 0x080a4c48],
  setalpha: [0x080a4c48, 0x080a4c80],
  blendoff: [0x080a4ca8, 0x080a4ccc],
} as const;
const sourceComponentRom = Object.fromEntries(Object.entries(romRanges).map(([name, [start, endExclusive]]) => {
  const bytes = rom.subarray(start - 0x08000000, endExclusive - 0x08000000);
  return [name, {
    start: `0x${start.toString(16).padStart(8, "0")}`,
    endExclusive: `0x${endExclusive.toString(16).padStart(8, "0")}`,
    bytes: endExclusive - start,
    sha256: sha256(bytes),
  }];
}));
const scenarioSha256 = Object.fromEntries([
  "tools/battle-lab/mechanic-memento-player-weezing-opponent-onix.json",
  "tools/battle-lab/mechanic-memento-opponent-weezing-player-onix.json",
].map((path) => [path, sha256(readFileSync(resolve(root, path)))]));

if (
  address("Move_MEMENTO") !== 0x082cdcf2 || address("Move_FACADE") !== 0x082cdd36
  || address("AnimTask_MoveAttackerMementoShadow") !== 0x08113bac
  || address("AnimTask_MoveAttackerMementoShadow_Step") !== 0x08113d60
  || address("AnimTask_MoveTargetMementoShadow") !== 0x08113e78
  || address("AnimTask_MoveTargetMementoShadow_Step") !== 0x081140c8
  || address("DoMementoShadowEffect") !== 0x08114244
  || address("SetAllBattlersSpritePriority") !== 0x08114374
  || address("AnimTask_InitMementoShadow") !== 0x081143c0
  || address("AnimTask_MementoHandleBg") !== 0x08114470
  || address("Cmd_monbg_static") !== 0x080a4a18
  || address("Cmd_clearmonbg_static") !== 0x080a4adc
  || address("Task_ClearMonBgStatic") !== 0x080a4bb0
  || address("Cmd_setalpha") !== 0x080a4c48
  || address("Cmd_blendoff") !== 0x080a4ca8
  || JSON.stringify(scriptCommands) !== JSON.stringify(expectedScriptCommands)
  || JSON.stringify(memento.componentIds) !== JSON.stringify(expected)
  || dig.componentIds.length !== 17
  || JSON.stringify(sharedWithDig) !== JSON.stringify(["visualCommand:clearmonbg_static", "visualCommand:monbg_static"])
  || !dark.includes("static void DoMementoShadowEffect(struct Task *task)")
  || !dark.includes("ScanlineEffect_SetParams(scanlineParams)")
  || !dark.includes("SetAllBattlersSpritePriority(3)")
  || !anim.includes("static void Cmd_monbg_static(void)")
  || !anim.includes("static void Task_ClearMonBgStatic(u8 taskId)")
  || carriers.length !== 1 || carriers[0]?.index !== 501
  || carriers[0]?.label !== "FRONTIER_MON_WEEZING_2" || carriers[0]?.species !== "SPECIES_WEEZING"
  || JSON.stringify(carriers[0]?.moves) !== JSON.stringify(["MOVE_MEMENTO", "MOVE_SLUDGE_BOMB", "MOVE_FACADE", "MOVE_DESTINY_BOND"])
  || carriers[0]?.itemName !== "BATTLE_FRONTIER_ITEM_SITRUS_BERRY"
  || JSON.stringify(carriers[0]?.evSpreadStats) !== JSON.stringify(["F_EV_SPREAD_ATTACK", "F_EV_SPREAD_HP"])
  || carriers[0]?.nature !== "NATURE_ADAMANT"
) throw new Error("MOVE_MEMENTO source/carrier/component/Dig contract changed");

console.log(JSON.stringify({
  move: "MOVE_MEMENTO",
  sourceBounds: { start: "0x082cdcf2", endExclusive: "0x082cdd36", bytes: "0x44" },
  scriptCommands: expectedScriptCommands,
  sourceComponentRom,
  scenarioSha256,
  carrier: "set 501 FRONTIER_MON_WEEZING_2 / SPECIES_WEEZING / MOVE_MEMENTO",
  components: expected,
  siblingAudit: {
    move: "MOVE_DIG", components: 17,
    shared: ["visualCommand:clearmonbg_static", "visualCommand:monbg_static"],
    distinct: ["two-turn setup/unleash", "dirt mound and plume", "DigDown/DigUp movement", "hitsplat", "ShakeMon"],
    promoted: false,
  },
}));
