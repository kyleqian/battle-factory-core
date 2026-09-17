/** Authoritative source/component/carrier classification for MOVE_OVERHEAT. */
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
const macros = read("asm/macros/battle_anim_script.inc");
const dragon = read("src/battle_anim_dragon.c");
const normal = read("src/battle_anim_normal.c");
const movement = read("src/battle_anim_mon_movement.c");
const utility = read("src/battle_anim_utility_funcs.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const registry = read("src/data/battle_anim.h");
const constants = read("include/constants/battle_anim.h");
const songs = read("include/constants/songs.h");
const moves = read("src/data/battle_moves.h");
const frontierConstants = read("include/constants/battle_frontier_mons.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const symbols = new Map<string, SymbolEntry[]>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
}).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const values = symbols.get(fields.at(-1)!) ?? [];
    values.push({ address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
    symbols.set(fields.at(-1)!, values);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const values = symbols.get(fields[2]!) ?? [];
    values.push({ address: Number.parseInt(fields[0]!, 16), size: 0 });
    symbols.set(fields[2]!, values);
  }
}

function sym(name: string, address?: number): SymbolEntry {
  const candidates = symbols.get(name) ?? [];
  const values = address === undefined ? candidates : candidates.filter((candidate) => candidate.address === address);
  if (values.length !== 1) throw new Error(`missing or ambiguous ELF symbol ${name}${address === undefined ? "" : ` at ${hex(address)}`}`);
  return values[0]!;
}
function romRange(name: string, end?: number, address?: number): Json {
  const value = sym(name, address);
  const finish = end ?? value.address + value.size;
  if (finish <= value.address) throw new Error(`invalid ROM interval ${name}`);
  return {
    symbol: name,
    elf: { image: "reference/pokeemerald/pokeemerald.elf", symbol: name, start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address },
    start: hex(value.address), endExclusive: hex(finish), byteLength: finish - value.address,
    romSha256: sha(rom.subarray(value.address - 0x08000000, finish - 0x08000000)),
  };
}
function sourceSpan(path: string, source: string, body: string): Json {
  const start = source.indexOf(body);
  if (start < 0) throw new Error(`missing source span ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha(body) };
}
function sourceBlock(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`missing source block ${start}/${end}`);
  return source.slice(from, to);
}
function functionBody(source: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "g");
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(source)) !== null) {
    const open = source.indexOf("{", match.index);
    const semi = source.indexOf(";", match.index);
    if (open < 0 || (semi >= 0 && semi < open)) continue;
    let depth = 0;
    for (let index = open; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      else if (source[index] === "}" && --depth === 0) return source.slice(source.lastIndexOf("\n", match.index) + 1, index + 1);
    }
  }
  throw new Error(`missing function ${name}`);
}
function objectBlock(source: string, token: string): string {
  const from = source.indexOf(token);
  const to = source.indexOf("};", from) + 2;
  if (from < 0 || to < 2) throw new Error(`missing object ${token}`);
  return source.slice(source.lastIndexOf("\n", from) + 1, to);
}
function bodyRecord(name: string, path: string, source: string, address?: number): Json {
  const body = functionBody(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name, undefined, address) };
}
function objectRecord(name: string, path: string, source: string, address?: number): Json {
  const body = objectBlock(source, name);
  return { source: sourceSpan(path, source, body), rom: romRange(name, undefined, address) };
}
function lineRecord(path: string, source: string, token: string): Json {
  const index = source.indexOf(token);
  if (index < 0) throw new Error(`missing source line ${token}`);
  const start = source.lastIndexOf("\n", index) + 1;
  const end = source.indexOf("\n", index);
  return { source: sourceSpan(path, source, source.slice(start, end < 0 ? source.length : end)) };
}
function commands(body: string): string[] {
  return body.split("\n").slice(1).map((line) => line.replace(/@.*$/u, "").trim()).filter((line) => line.length > 0 && !line.endsWith(":"));
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const rootBody = sourceBlock(scripts, "Move_OVERHEAT:\n", "Move_HYDRO_CANNON:\n");
const rootCommands = commands(rootBody);
const expectedComponents = [
  "asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_SMALL_EMBER", "task:AnimTask_AllocBackupPalBuffer",
  "task:AnimTask_CopyPalFadedToUnfaded", "task:AnimTask_CopyPalUnfadedFromBackup", "task:AnimTask_CopyPalUnfadedToBackup",
  "task:AnimTask_FreeBackupPalBuffer", "task:AnimTask_ShakeMon", "visualCommand:blendoff", "visualCommand:clearmonbg",
  "visualCommand:create_basic_hitsplat_sprite", "visualCommand:create_overheat_flame_sprite", "visualCommand:monbg",
  "visualCommand:setalpha", "visualCommand:simple_palette_blend",
] as const;
const expectedRootStart = 0x082d6694;
const expectedRootEnd = 0x082d6986;
const flameCommands = rootCommands.filter((command) => command.startsWith("create_overheat_flame_sprite"));
const hitSplatCommands = rootCommands.filter((command) => command.startsWith("create_basic_hitsplat_sprite"));
const taskCommands = rootCommands.filter((command) => command.startsWith("createvisualtask"));
const blendCommands = rootCommands.filter((command) => command.startsWith("simple_palette_blend"));
const audioCommands = rootCommands.filter((command) => command.startsWith("playsewithpan"));
if (rootCommands.length !== 79 || flameCommands.length !== 24 || hitSplatCommands.length !== 4 || taskCommands.length !== 11 || blendCommands.length !== 5 || audioCommands.length !== 6
  || !rootCommands.at(-1)?.match(/^end$/u) || rootCommands.some((command) => /^(?:call|goto|return|jump)/u.test(command))) {
  throw new Error("MOVE_OVERHEAT command topology drifted");
}
if (JSON.stringify(flameCommands.map((command) => command.match(/unk1=(\d+).*y=(-?\d+)/u)?.slice(1))) !== JSON.stringify([
  ["0", "-20"], ["32", "-20"], ["64", "-20"], ["96", "-20"], ["128", "-20"], ["160", "-20"], ["192", "-20"], ["224", "-20"],
  ["0", "0"], ["32", "0"], ["64", "0"], ["96", "0"], ["128", "0"], ["160", "0"], ["192", "0"], ["224", "0"],
  ["0", "10"], ["32", "10"], ["64", "10"], ["96", "10"], ["128", "10"], ["160", "10"], ["192", "10"], ["224", "10"],
])) throw new Error("MOVE_OVERHEAT flame lattice drifted");
if (JSON.stringify(audioCommands) !== JSON.stringify([
  "playsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER", "playsewithpan SE_M_FLAME_WHEEL2, SOUND_PAN_ATTACKER",
  "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET",
  "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET",
])) throw new Error("MOVE_OVERHEAT audio schedule drifted");

const graphEntry = graph.moves.find((entry: Json) => entry.move === "MOVE_OVERHEAT");
if (!graphEntry || graphEntry.id !== 315 || graphEntry.rootScript !== "Move_OVERHEAT" || JSON.stringify(graphEntry.blocks) !== JSON.stringify(["Move_OVERHEAT"]) || JSON.stringify(graphEntry.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("generated MOVE_OVERHEAT graph drifted");
if (coverage.entries.find((entry: Json) => entry.move === "MOVE_OVERHEAT")?.status !== "exact"
  || coverage.queue.includes("MOVE_OVERHEAT")
  || coverage.componentTracks.some((entry: Json) => entry.representatives?.includes("MOVE_OVERHEAT"))) {
  throw new Error("MOVE_OVERHEAT must be exact, queue-empty, and component-track absent");
}

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const inLevel50 = (entry: Json): boolean => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end);
const allCarriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_OVERHEAT"));
const level50Carriers = allCarriers.filter(inLevel50);
const expectedAllCarrierIndices = [299, 328, 337, 357, 474, 589, 611, 618, 636, 643, 647, 656, 685, 707, 714, 718, 732, 739, 742, 743, 752, 769, 791, 874, 875];
const expectedLevel50CarrierIndices = [299, 328, 337, 357, 474, 589, 611, 618, 636, 643, 647, 656, 685, 707, 714, 718, 732, 739, 742, 743, 752, 769, 791];
const inventoryEntry = inventory.tiers.level50.moves.find((entry: Json) => entry.move === "MOVE_OVERHEAT");
if (JSON.stringify(allCarriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedAllCarrierIndices)
  || JSON.stringify(level50Carriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedLevel50CarrierIndices)
  || inventoryEntry?.id !== 315 || inventoryEntry?.frontierMonCount !== 23 || inventoryEntry?.speciesCount !== 15
  || JSON.stringify(allCarriers.filter((entry: Json) => !inLevel50(entry)).map((entry: Json) => entry.index)) !== JSON.stringify([874, 875])) {
  throw new Error("MOVE_OVERHEAT Factory/Level-50 carrier census drifted");
}
for (const carrier of allCarriers) requireTokens(`Overheat carrier ${carrier.label}`, frontierConstants, [carrier.label]);
if ((frontierSource.match(/\bMOVE_OVERHEAT\b/g) ?? []).length !== allCarriers.length) throw new Error("MOVE_OVERHEAT source carrier count drifted");

const controls = {
  MOVE_OUTRAGE: { token: "Move_OUTRAGE:", reason: "shares the Small Ember art animation table but uses gOutrageFlameSpriteTemplate and its own callback" },
  MOVE_FIRE_PUNCH: { token: "Move_FIRE_PUNCH:", reason: "shares Impact and Small Ember identities but has no Overheat palette-buffer or flame lattice body" },
  MOVE_BLAST_BURN: { token: "Move_BLAST_BURN:", reason: "shares Impact and target monbg/shake commands but has a separate Fire Plume body" },
  MOVE_PSYCHO_BOOST: { token: "Move_PSYCHO_BOOST:", reason: "shares EFFECT_OVERHEAT in move mechanics but has a separate Psychic animation root" },
} as const;
for (const [move, control] of Object.entries(controls)) {
  const candidate = graph.moves.find((entry: Json) => entry.move === move);
  if (!candidate) throw new Error(`missing Overheat source identity control ${move}`);
  requireTokens(`Overheat identity control ${move}`, scripts, [control.token]);
}
const outrage = graph.moves.find((entry: Json) => entry.move === "MOVE_OUTRAGE")!;
const firePunch = graph.moves.find((entry: Json) => entry.move === "MOVE_FIRE_PUNCH")!;
const blastBurn = graph.moves.find((entry: Json) => entry.move === "MOVE_BLAST_BURN")!;
if (outrage.componentIds.includes("visualCommand:create_overheat_flame_sprite") || !firePunch.componentIds.includes("asset:ANIM_TAG_IMPACT") || !firePunch.componentIds.includes("asset:ANIM_TAG_SMALL_EMBER") || blastBurn.componentIds.includes("asset:ANIM_TAG_SMALL_EMBER")) throw new Error("MOVE_OVERHEAT identity-control boundary drifted");

requireTokens("Overheat macros", macros, [
  ".macro simple_palette_blend", "gSimplePaletteBlendSpriteTemplate", ".macro create_overheat_flame_sprite", "gOverheatFlameSpriteTemplate",
  ".macro create_basic_hitsplat_sprite", "gBasicHitSplatSpriteTemplate",
]);
requireTokens("Overheat callbacks", `${dragon}\n${normal}\n${movement}\n${utility}`, [
  "const struct SpriteTemplate gOverheatFlameSpriteTemplate", "static void AnimOverheatFlame", "static void AnimOverheatFlame_Step",
  "const struct SpriteTemplate gBasicHitSplatSpriteTemplate", "static void AnimHitSplatBasic", "const struct SpriteTemplate gSimplePaletteBlendSpriteTemplate",
  "static void AnimSimplePaletteBlend", "static void AnimSimplePaletteBlend_Step", "void AnimTask_ShakeMon", "static void AnimTask_ShakeMon_Step",
  "void AnimTask_AllocBackupPalBuffer", "void AnimTask_FreeBackupPalBuffer", "void AnimTask_CopyPalUnfadedToBackup",
  "void AnimTask_CopyPalUnfadedFromBackup", "void AnimTask_CopyPalFadedToUnfaded",
]);
requireTokens("Overheat runtime", runtime, [
  "static void Cmd_loadspritegfx", "static void Cmd_createsprite", "static void Cmd_createvisualtask", "static void Cmd_delay",
  "static void Cmd_waitforvisualfinish", "static void Cmd_playsewithpan", "static void Cmd_monbg", "static void Cmd_clearmonbg",
  "static void Cmd_setalpha", "static void Cmd_blendoff", "static void Cmd_end", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag",
]);
requireTokens("Overheat resources", `${graphics}\n${registry}\n${constants}\n${songs}\n${moves}`, [
  "gBattleAnimSpriteGfx_SmallEmber", "gBattleAnimSpritePal_SmallEmber", "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact",
  "{gBattleAnimSpriteGfx_SmallEmber, 0x0A00, ANIM_TAG_SMALL_EMBER}", "{gBattleAnimSpritePal_SmallEmber, ANIM_TAG_SMALL_EMBER}",
  "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}", "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}",
  "#define ANIM_TAG_SMALL_EMBER", "#define ANIM_TAG_IMPACT", "#define SE_M_DRAGON_RAGE", "#define SE_M_FLAME_WHEEL2", "#define SE_M_FIRE_PUNCH",
  "[MOVE_OVERHEAT] =", ".effect = EFFECT_OVERHEAT", ".power = 140", ".pp = 5", ".secondaryEffectChance = 100",
]);

const rootStart = sym("Move_OVERHEAT", expectedRootStart).address;
const rootEnd = sym("Move_HYDRO_CANNON", expectedRootEnd).address;
const runtimeAddresses: Record<string, number> = {
  Cmd_loadspritegfx: 0x080a3d24, Cmd_createsprite: 0x080a3dd8, Cmd_createvisualtask: 0x080a3ecc,
  Cmd_delay: 0x080a3f48, Cmd_waitforvisualfinish: 0x080a3f88, Cmd_end: 0x080a3fc4,
  Cmd_monbg: 0x080a41d8, Cmd_clearmonbg: 0x080a48b0, Cmd_setalpha: 0x080a4c48,
  Cmd_blendoff: 0x080a4ca8, Cmd_playsewithpan: 0x080a5354,
};
const carrier = (entry: Json): Json => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemTableId: entry.itemTableId, itemName: entry.itemName, evSpread: entry.evSpread, evSpreadStats: entry.evSpreadStats, nature: entry.nature });

console.log(JSON.stringify({
  schema: "overheat-source-audit/v1", move: "MOVE_OVERHEAT", moveId: 315,
  status: "unsupported-source-staging-checkpoint", coverageCredit: false,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_OVERHEAT", nextDispatchLabel: "Move_HYDRO_CANNON", source: sourceSpan("data/battle_anim_scripts.s", scripts, rootBody),
      rom: { ...romRange("Move_OVERHEAT", rootEnd, expectedRootStart), start: hex(rootStart), endExclusive: hex(rootEnd) },
      branches: { directlyReachableBlocks: ["Move_OVERHEAT"], dispatchedBranches: [], complete: true },
    },
    commands: rootCommands,
    commandSummary: {
      flameRows: 24, flameAngles: [0, 32, 64, 96, 128, 160, 192, 224], flameYRows: [-20, 0, 10],
      targetHitSplats: hitSplatCommands, paletteBlends: blendCommands, visualTasks: taskCommands, audio: audioCommands,
      cleanup: ["clearmonbg ANIM_DEF_PARTNER", "blendoff", "waitforvisualfinish", "delay 15", "createvisualtask AnimTask_CopyPalUnfadedFromBackup, 5, 1, 0", "simple_palette_blend selector=F_PAL_ATTACKER, delay=0, initial_blend_y=13, target_blend_y=0, color=RGB(18, 18, 18)", "createvisualtask AnimTask_FreeBackupPalBuffer, 5", "waitforvisualfinish", "end"],
    },
    directBodies: {
      flame: {
        frameProgram: objectRecord("sAnim_OutrageOverheatFire_0", "src/battle_anim_dragon.c", dragon, 0x08596e60),
        frameTable: objectRecord("sAnims_OutrageOverheatFire", "src/battle_anim_dragon.c", dragon, 0x08596e78),
        template: objectRecord("gOverheatFlameSpriteTemplate", "src/battle_anim_dragon.c", dragon, 0x08596fb0),
        start: bodyRecord("AnimOverheatFlame", "src/battle_anim_dragon.c", dragon, 0x081135ec),
        step: bodyRecord("AnimOverheatFlame_Step", "src/battle_anim_dragon.c", dragon, 0x0811369c),
      },
      impact: {
        template: objectRecord("gBasicHitSplatSpriteTemplate", "src/battle_anim_normal.c", normal, 0x08597358),
        callback: bodyRecord("AnimHitSplatBasic", "src/battle_anim_normal.c", normal, 0x08116388),
      },
      palettes: {
        template: objectRecord("gSimplePaletteBlendSpriteTemplate", "src/battle_anim_normal.c", normal, 0x08597274),
        start: bodyRecord("AnimSimplePaletteBlend", "src/battle_anim_normal.c", normal, 0x081157fc),
        step: bodyRecord("AnimSimplePaletteBlend_Step", "src/battle_anim_normal.c", normal, 0x08115884),
        alloc: bodyRecord("AnimTask_AllocBackupPalBuffer", "src/battle_anim_utility_funcs.c", utility, 0x08117c44),
        free: bodyRecord("AnimTask_FreeBackupPalBuffer", "src/battle_anim_utility_funcs.c", utility, 0x08117c70),
        copyUnfadedToBackup: bodyRecord("AnimTask_CopyPalUnfadedToBackup", "src/battle_anim_utility_funcs.c", utility, 0x08117ca0),
        copyUnfadedFromBackup: bodyRecord("AnimTask_CopyPalUnfadedFromBackup", "src/battle_anim_utility_funcs.c", utility, 0x08117d3c),
        copyFadedToUnfaded: bodyRecord("AnimTask_CopyPalFadedToUnfaded", "src/battle_anim_utility_funcs.c", utility, 0x08117dd8),
      },
      shake: {
        start: bodyRecord("AnimTask_ShakeMon", "src/battle_anim_mon_movement.c", movement, 0x080d51ac),
        step: bodyRecord("AnimTask_ShakeMon_Step", "src/battle_anim_mon_movement.c", movement, 0x080d5220),
      },
      runtimeCommands: Object.fromEntries(Object.entries(runtimeAddresses).map(([name, address]) => [name, bodyRecord(name, "src/battle_anim.c", runtime, address)])),
    },
    macros: {
      simplePaletteBlend: lineRecord("asm/macros/battle_anim_script.inc", macros, ".macro simple_palette_blend"),
      overheatFlame: lineRecord("asm/macros/battle_anim_script.inc", macros, ".macro create_overheat_flame_sprite"),
      basicHitSplat: lineRecord("asm/macros/battle_anim_script.inc", macros, ".macro create_basic_hitsplat_sprite"),
    },
  },
  graph: { blocks: graphEntry.blocks, components: expectedComponents, coverage: { entryPresent: false, queueContainsMove: false, componentTrackPresent: false } },
  resources: {
    smallEmber: {
      tag: lineRecord("include/constants/battle_anim.h", constants, "#define ANIM_TAG_SMALL_EMBER"),
      gfx: { source: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimSpriteGfx_SmallEmber[]"), rom: romRange("gBattleAnimSpriteGfx_SmallEmber") },
      palette: { source: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimSpritePal_SmallEmber[]"), rom: romRange("gBattleAnimSpritePal_SmallEmber") },
      registry: { gfx: lineRecord("src/data/battle_anim.h", registry, "{gBattleAnimSpriteGfx_SmallEmber, 0x0A00, ANIM_TAG_SMALL_EMBER}"), palette: lineRecord("src/data/battle_anim.h", registry, "{gBattleAnimSpritePal_SmallEmber, ANIM_TAG_SMALL_EMBER}") },
    },
    impact: {
      tag: lineRecord("include/constants/battle_anim.h", constants, "#define ANIM_TAG_IMPACT"),
      gfx: { source: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimSpriteGfx_Impact[]"), rom: romRange("gBattleAnimSpriteGfx_Impact") },
      palette: { source: lineRecord("src/graphics.c", graphics, "const u32 gBattleAnimSpritePal_Impact[]"), rom: romRange("gBattleAnimSpritePal_Impact") },
      registry: { gfx: lineRecord("src/data/battle_anim.h", registry, "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}"), palette: lineRecord("src/data/battle_anim.h", registry, "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}") },
    },
    audio: {
      dragonRage: { id: 171, line: lineRecord("include/constants/songs.h", songs, "#define SE_M_DRAGON_RAGE") },
      flameWheel2: { id: 145, line: lineRecord("include/constants/songs.h", songs, "#define SE_M_FLAME_WHEEL2") },
      firePunch: { id: 147, line: lineRecord("include/constants/songs.h", songs, "#define SE_M_FIRE_PUNCH") },
    },
    move: { source: sourceSpan("src/data/battle_moves.h", moves, sourceBlock(moves, "    [MOVE_OVERHEAT] =", "    [MOVE_ODOR_SLEUTH] =")) },
  },
  behavior: {
    move: { effect: "EFFECT_OVERHEAT", power: 140, accuracy: 90, pp: 5, secondaryEffectChance: 100, target: "MOVE_TARGET_SELECTED" },
    monbg: "ANIM_DEF_PARTNER", alpha: [12, 18], attackerShake: ["ANIM_ATTACKER", 2, 0, 15, 1], targetShake: ["ANIM_TARGET", 10, 0, 25, 1],
    targetHits: [[-5, 3], [8, -5], [10, 10], [0, 0]],
  },
  carriers: {
    factoryCount: allCarriers.length, level50Count: level50Carriers.length, allFactory: allCarriers.map(carrier), level50: level50Carriers.map(carrier),
    excludedOutsideLevel50: allCarriers.filter((entry: Json) => !inLevel50(entry)).map((entry: Json) => entry.index), representative: carrier(level50Carriers[0]), inventory: inventoryEntry,
  },
  controls: {
    kind: "source/component identity checks only; Outrage, Fire Punch, Blast Burn, and Psycho Boost confer no Overheat timing, body, latch, component, sibling, track, queue, or coverage credit",
    named: Object.fromEntries(Object.entries(controls).map(([move, control]) => [move, { ...control, status: coverage.entries.find((entry: Json) => entry.move === move)?.status ?? "unsupported", sharedComponents: expectedComponents.filter((component) => graph.moves.find((entry: Json) => entry.move === move)?.componentIds.includes(component) ?? false) }])),
  },
  checkpoint: {
    sourceAudit: true, completePointerOwnedRoot: true, commandOrder: true, completeReachableVisualGraph: true, directTaskCallbackResourceBodies: true,
    fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleFreshnessCheckedBeforeLocalMgba: true,
    compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, rawRgbRetained: false, latchMeasured: false,
    durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false,
    coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, latchPromotion: false, queueChanged: false,
    boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true,
  },
}, null, 2));
