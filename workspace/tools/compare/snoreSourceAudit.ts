/** Authoritative source/component/carrier/reachability audit for MOVE_SNORE. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type SymbolEntry = { address: number; size: number };
const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const scripts = read("data/battle_anim_scripts.s");
const battleScripts = read("data/battle_scripts_1.s");
const effects = read("src/battle_anim_effects_2.c");
const mons = read("src/battle_anim_mons.c");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, SymbolEntry[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const list = symbols.get(fields.at(-1)!) ?? [];
    list.push({ address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
    symbols.set(fields.at(-1)!, list);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const list = symbols.get(fields[2]!) ?? [];
    list.push({ address: Number.parseInt(fields[0]!, 16), size: 0 });
    symbols.set(fields[2]!, list);
  }
}
function sym(name: string, expected?: number): SymbolEntry {
  const values = symbols.get(name) ?? [];
  const value = expected === undefined ? (values.length === 1 ? values[0] : undefined) : values.find((entry) => entry.address === expected);
  if (!value) throw new Error(`missing or ambiguous ELF symbol ${name}`);
  return value;
}
function romRange(name: string, end?: number, expected?: number): Json {
  const value = sym(name, expected), finish = end ?? value.address + value.size;
  if (finish <= value.address) throw new Error(`invalid ROM range ${name}`);
  return { elf: { image: "reference/pokeemerald/pokeemerald.elf", symbol: name, start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address }, romSha256: sha(rom.subarray(value.address - 0x08000000, finish - 0x08000000)) };
}
function span(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source span ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}
function block(source: string, startToken: string, endToken: string): string {
  const start = source.indexOf(startToken), end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`missing block ${startToken}`);
  return source.slice(start, end);
}
function functionBody(source: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "g"); let match: RegExpExecArray | null;
  while ((match = matcher.exec(source)) !== null) {
    const open = source.indexOf("{", match.index), semi = source.indexOf(";", match.index);
    if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1);
    }
  }
  throw new Error(`missing function ${name}`);
}
function bodyRecord(name: string, path: string, source: string, expected?: number): Json {
  const body = functionBody(source, name);
  return { source: span(path, source, body), rom: romRange(name, undefined, expected) };
}
function objectRecord(name: string, path: string, source: string, expected?: number): Json {
  const from = source.indexOf(name), to = source.indexOf("};", from) + 2;
  if (from < 0 || to < 2) throw new Error(`missing object ${name}`);
  const body = source.slice(source.lastIndexOf("\n", from) + 1, to);
  return { source: span(path, source, body), rom: romRange(name, undefined, expected) };
}
function line(path: string, source: string, token: string): Json {
  const index = source.indexOf(token), start = source.lastIndexOf("\n", index) + 1, end = source.indexOf("\n", index);
  if (index < 0) throw new Error(`missing line ${token}`);
  return { source: span(path, source, source.slice(start, end)) };
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((value) => value.replace(/@.*$/u, "").trim()).filter((value) => value && !value.endsWith(":"));
}

const rootBody = block(scripts, "Move_SNORE:\n", "Move_LIGHT_SCREEN:\n");
const effectBody = rootBody.slice(rootBody.indexOf("SnoreEffect:\n"));
const labels = [...rootBody.matchAll(/^([A-Za-z0-9_]+):$/gmu)].map((match) => match[1]);
const expectedCommands = [
  "loadspritegfx ANIM_TAG_SNORE_Z", "monbg ANIM_ATK_PARTNER", "setalpha 8, 8", "call SnoreEffect", "delay 30", "call SnoreEffect", "waitforvisualfinish", "clearmonbg ANIM_ATK_PARTNER", "blendoff", "end",
  "playsewithpan SE_M_SNORE, SOUND_PAN_ATTACKER", "createvisualtask AnimTask_ScaleMonAndRestore, 5, -7, -7, 7, ANIM_ATTACKER, 1", "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 4, 0, 7, 1", "shake_mon_or_platform velocity=6, shake_timer=1, shake_duration=14, type=SHAKE_BG_X, battler_selector=SHAKE_MON_ATTACKER",
  "createsprite gSnoreZSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, -42, -38, 24, 0, 0", "createsprite gSnoreZSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 0, -42, 24, 0, 0", "createsprite gSnoreZSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 42, -38, 24, 0, 0", "return",
] as const;
const expectedComponents = ["asset:ANIM_TAG_SNORE_Z", "sprite:gSnoreZSpriteTemplate", "subroutine:SnoreEffect", "task:AnimTask_ScaleMonAndRestore", "task:AnimTask_ShakeMon2", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:shake_mon_or_platform"] as const;
if (JSON.stringify(labels) !== JSON.stringify(["Move_SNORE", "SnoreEffect"]) || JSON.stringify(commands(rootBody)) !== JSON.stringify(expectedCommands)) throw new Error("MOVE_SNORE pointer graph/command order drifted");
const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_SNORE");
if (!graphEntry || graphEntry.id !== 173 || JSON.stringify(graphEntry.blocks) !== JSON.stringify(labels) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("MOVE_SNORE generated graph drifted");

const ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SNORE"));
const level50 = carriers.filter((entry: Json) => ranges.some((range) => entry.index >= range.start && entry.index <= range.end));
if (JSON.stringify(carriers.map((entry: Json) => entry.index)) !== "[196]" || JSON.stringify(level50.map((entry: Json) => entry.index)) !== "[196]" || (frontierSource.match(/MOVE_SNORE/g) ?? []).length !== 1) throw new Error("MOVE_SNORE carrier census drifted");

const battleRoot = block(battleScripts, "BattleScript_EffectSnore::\n", "BattleScript_EffectConversion2::\n");
for (const token of ["jumpifstatus BS_ATTACKER, STATUS1_SLEEP, BattleScript_SnoreIsAsleep", "goto BattleScript_ButItFailed", "jumpifhalfword CMP_EQUAL, gChosenMove, MOVE_SLEEP_TALK, BattleScript_DoSnore", "statusanimation BS_ATTACKER", "setmoveeffect MOVE_EFFECT_FLINCH", "goto BattleScript_HitFromCritCalc"]) if (!battleRoot.includes(token)) throw new Error(`Snore battle reachability drifted: ${token}`);
for (const token of ["#define ANIM_TAG_SNORE_Z", "#define SE_M_SNORE", "[MOVE_SNORE] =", ".effect = EFFECT_SNORE", ".power = 40"]) if (!`${constants}\n${songs}\n${moves}`.includes(token)) throw new Error(`Snore identity drifted: ${token}`);

const rootStart = sym("Move_SNORE", 0x082cff5d).address, effectStart = sym("SnoreEffect", 0x082cff76).address, rootEnd = sym("Move_LIGHT_SCREEN", 0x082cffed).address;
const runtimeAddresses: Record<string, number> = { Cmd_loadspritegfx: 0x080a3d24, Cmd_monbg: 0x080a41d8, Cmd_setalpha: 0x080a4c48, Cmd_call: 0x080a4ccc, Cmd_delay: 0x080a3f48, Cmd_waitforvisualfinish: 0x080a3f88, Cmd_clearmonbg: 0x080a48b0, Cmd_blendoff: 0x080a4ca8, Cmd_end: 0x080a3fc4, Cmd_createvisualtask: 0x080a3ecc, Cmd_createsprite: 0x080a3dd8 };
console.log(JSON.stringify({
  schema: "snore-source-audit/v1", move: "MOVE_SNORE", moveId: 173, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: { symbol: "Move_SNORE", nextDispatchLabel: "Move_LIGHT_SCREEN", source: span("data/battle_anim_scripts.s", scripts, rootBody), rom: { ...romRange("Move_SNORE", rootEnd, 0x082cff5d), start: hex(rootStart), endExclusive: hex(rootEnd) }, branches: { directlyReachableBlocks: labels, dispatchedBranches: ["SnoreEffect"], complete: true } },
    commands: expectedCommands,
    directBodies: {
      snoreEffect: { source: span("data/battle_anim_scripts.s", scripts, effectBody), rom: { ...romRange("SnoreEffect", rootEnd, 0x082cff76), start: hex(effectStart), endExclusive: hex(rootEnd) } },
      sprite: { template: objectRecord("gSnoreZSpriteTemplate", "src/battle_anim_effects_2.c", effects, 0x085936ec), callback: bodyRecord("AnimTravelDiagonally", "src/battle_anim_mons.c", mons, 0x080a7938), translation: bodyRecord("StartAnimLinearTranslation", "src/battle_anim_mons.c", mons, 0x080a6eec) },
      tasks: { scale: [bodyRecord("AnimTask_ScaleMonAndRestore", "src/battle_anim_mon_movement.c", movement, 0x080d6064), bodyRecord("AnimTask_ScaleMonAndRestore_Step", "src/battle_anim_mon_movement.c", movement, 0x080d60bc)], shake: [bodyRecord("AnimTask_ShakeMon2", "src/battle_anim_mon_movement.c", movement, 0x080d52d0), bodyRecord("AnimTask_ShakeMon2_Step", "src/battle_anim_mon_movement.c", movement, 0x080d53bc)], platform: [objectRecord("gShakeMonOrPlatformSpriteTemplate", "src/battle_anim_normal.c", normal, 0x085972d8), bodyRecord("AnimShakeMonOrBattlePlatforms", "src/battle_anim_normal.c", normal), bodyRecord("AnimShakeMonOrBattlePlatforms_Step", "src/battle_anim_normal.c", normal, 0x08116148)], monbg: [bodyRecord("Task_UpdateMonBg", "src/battle_anim.c", runtime, 0x080a47d8), bodyRecord("Task_ClearMonBg", "src/battle_anim.c", runtime, 0x080a4980)] },
      runtimeCommands: Object.fromEntries(Object.entries(runtimeAddresses).map(([name, address]) => [name, bodyRecord(name, "src/battle_anim.c", runtime, address)])),
      resources: { gfxSource: line("src/graphics.c", graphics, "const u32 gBattleAnimSpriteGfx_SnoreZ[]"), paletteSource: line("src/graphics.c", graphics, "const u32 gBattleAnimSpritePal_SnoreZ[]"), gfx: romRange("gBattleAnimSpriteGfx_SnoreZ", undefined, 0x08c21084), palette: romRange("gBattleAnimSpritePal_SnoreZ", undefined, 0x08c211f4), registryGfx: line("src/data/battle_anim.h", registry, "{gBattleAnimSpriteGfx_SnoreZ, 0x0200, ANIM_TAG_SNORE_Z}"), registryPalette: line("src/data/battle_anim.h", registry, "{gBattleAnimSpritePal_SnoreZ, ANIM_TAG_SNORE_Z}") },
    },
  },
  graph: { blocks: labels, components: expectedComponents },
  battleReachability: { source: span("data/battle_scripts_1.s", battleScripts, battleRoot), rom: { start: hex(sym("BattleScript_EffectSnore").address), asleep: hex(sym("BattleScript_SnoreIsAsleep").address), success: hex(sym("BattleScript_DoSnore").address), endExclusive: hex(sym("BattleScript_EffectConversion2").address), romSha256: romRange("BattleScript_EffectSnore", sym("BattleScript_EffectConversion2").address).romSha256 }, failure: "awake attacker -> BattleScript_ButItFailed", success: "STATUS1_SLEEP -> BattleScript_DoSnore -> ordinary damage chain", sleepTalkSuccess: "gChosenMove == MOVE_SLEEP_TALK bypasses the fast-asleep message but shares BattleScript_DoSnore" },
  behavior: { effectCalls: 2, delayBetweenCalls: 30, scale: [-7,-7,7,"ANIM_ATTACKER",1], targetShake: ["ANIM_TARGET",4,0,7,1], platform: [6,1,14,"SHAKE_BG_X"], zSpritesPerCall: [[-42,-38],[0,-42],[42,-38]], duration: 24, monbg: "ANIM_ATK_PARTNER", alpha: [8,8], audio: "SE_M_SNORE" },
  resource: { tag: "ANIM_TAG_SNORE_Z", value: 10197, tileBytes: 512, source: "graphics/battle_anims/sprites/snore_z.png" },
  carriers: { factoryCount: carriers.length, level50Count: level50.length, allFactory: carriers, level50, representative: level50[0] },
  staging: { method: "A faster legal Factory Venomoth uses Sleep Powder as an ordinary action before Sealeo executes Snore in the same turn", sleepCarrierSetId: 226, transientOverrides: [], battleStateInjected: false, completePartiesBeforeBattleInit: true },
}, null, 2));
