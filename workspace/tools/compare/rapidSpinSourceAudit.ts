/**
 * Deterministic source/classification audit for exact MOVE_RAPID_SPIN.
 * This development-only verifier never feeds production.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;

type SourceSpan = {
  readonly path: string;
  readonly start: number;
  readonly endExclusive: number;
  readonly byteLength: number;
  readonly sha256: string;
};

type Symbol = {
  readonly address: number;
  readonly size: number;
};

type NamedSymbol = Symbol & {
  readonly name: string;
};

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;

function span(path: string, source: string, start: number, endExclusive: number): SourceSpan {
  if (start < 0 || endExclusive <= start) throw new Error(`invalid source span ${path}:${start}..${endExclusive}`);
  const body = source.slice(start, endExclusive);
  return { path, start, endExclusive, byteLength: Buffer.byteLength(body), sha256: sha256(body) };
}

function block(path: string, source: string, startToken: string, endToken: string): { readonly body: string; readonly source: SourceSpan } {
  const start = source.indexOf(startToken);
  const endExclusive = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || endExclusive < 0) throw new Error(`missing source boundary ${startToken}/${endToken}`);
  return { body: source.slice(start, endExclusive), source: span(path, source, start, endExclusive) };
}

function functionSpan(path: string, source: string, name: string): SourceSpan {
  // Keep this deliberately linear. A permissive C-signature expression becomes
  // catastrophically slow when a source file contains many prototypes.
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "g");
  let match: RegExpExecArray | null;
  let token = -1;
  let open = -1;
  while ((match = matcher.exec(source)) !== null) {
    const candidateOpen = source.indexOf("{", match.index);
    const candidateSemicolon = source.indexOf(";", match.index);
    if (candidateOpen >= 0 && (candidateSemicolon < 0 || candidateOpen < candidateSemicolon)) {
      token = match.index;
      open = candidateOpen;
      break;
    }
  }
  if (token < 0 || open < 0) throw new Error(`missing function ${name}`);
  const start = source.lastIndexOf("\n", token) + 1;
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}") {
      depth--;
      if (depth === 0) return span(path, source, start, index + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function objectSpan(path: string, source: string, name: string): SourceSpan {
  const token = source.indexOf(name);
  if (token < 0) throw new Error(`missing object ${name}`);
  const start = source.lastIndexOf("\n", token) + 1;
  const open = source.indexOf("{", token);
  const endExclusive = source.indexOf("};", open) + 2;
  if (open < 0 || endExclusive < 2) throw new Error(`unterminated object ${name}`);
  return span(path, source, start, endExclusive);
}

function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
  }
}

const scripts = read("data/battle_anim_scripts.s");
const effects = read("src/battle_anim_effects_3.c");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
const registry = read("src/data/battle_anim.h");
const graphics = read("src/graphics.c");
const animationConstants = read("include/constants/battle_anim.h");
const songConstants = read("include/constants/songs.h");
const moveConstants = read("include/constants/moves.h");
const battleMoves = read("src/data/battle_moves.h");
const frontierConstants = read("include/constants/battle_frontier_mons.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;

const rootBlock = block("data/battle_anim_scripts.s", scripts, "Move_RAPID_SPIN:\n", "Move_MOONLIGHT:\n");
const rapidSpinMove = block("src/data/battle_moves.h", battleMoves, "    [MOVE_RAPID_SPIN] =\n", "    [MOVE_SWEET_SCENT] =\n");
const commands = rootBlock.body.split("\n")
  .slice(1)
  .map((line) => line.replace(/@.*$/u, "").trim())
  .filter((line) => Boolean(line) && !line.endsWith(":"));
const expectedCommands = [
  "loadspritegfx ANIM_TAG_IMPACT",
  "loadspritegfx ANIM_TAG_RAPID_SPIN",
  "monbg ANIM_ATTACKER",
  "createsprite gRapidSpinSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 32, -32, 40, -2",
  "createvisualtask AnimTask_RapinSpinMonElevation, 2, 0, 2, 0",
  "loopsewithpan SE_M_RAZOR_WIND2, SOUND_PAN_ATTACKER, 8, 4",
  "waitforvisualfinish",
  "create_basic_hitsplat_sprite ANIM_TARGET, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=2",
  "createvisualtask AnimTask_ShakeTargetBasedOnMovePowerOrDmg, 2, FALSE, 1, 10, 1, 0",
  "playsewithpan SE_M_DOUBLE_SLAP, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "delay 8",
  "createvisualtask AnimTask_RapinSpinMonElevation, 2, 0, 2, 1",
  "loopsewithpan SE_M_RAZOR_WIND2, SOUND_PAN_ATTACKER, 8, 4",
  "waitforvisualfinish",
  "clearmonbg ANIM_ATTACKER",
  "end",
];
if (JSON.stringify(commands) !== JSON.stringify(expectedCommands)) throw new Error("Rapid Spin root command order drifted");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});
const symbols = new Map<string, Symbol>();
const symbolRows: NamedSymbol[] = [];
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    const symbol = { name: fields.at(-1)!, address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) };
    symbols.set(symbol.name, symbol);
    symbolRows.push(symbol);
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    const symbol = { name: fields[2]!, address: Number.parseInt(fields[0]!, 16), size: 0 };
    symbols.set(symbol.name, symbol);
    symbolRows.push(symbol);
  }
}
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));
function address(name: string): number {
  const symbol = symbols.get(name);
  if (!symbol) throw new Error(`missing ELF symbol ${name}`);
  return symbol.address;
}
function pin(name: string) {
  const symbol = symbols.get(name);
  if (!symbol?.size) throw new Error(`missing sized ELF symbol ${name}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, symbol.address - 0x08000000 + symbol.size);
  return { start: hex(symbol.address), endExclusive: hex(symbol.address + symbol.size), byteLength: symbol.size, romSha256: sha256(bytes) };
}
function pinAt(name: string, start: number) {
  const symbol = symbolRows.find((candidate) => candidate.name === name && candidate.address === start && candidate.size > 0);
  if (!symbol) throw new Error(`missing exact ELF symbol ${name} at ${hex(start)}`);
  const bytes = rom.subarray(symbol.address - 0x08000000, symbol.address - 0x08000000 + symbol.size);
  return { start: hex(symbol.address), endExclusive: hex(symbol.address + symbol.size), byteLength: symbol.size, romSha256: sha256(bytes) };
}
function interval(startName: string, endName: string) {
  const start = address(startName);
  const endExclusive = address(endName);
  if (endExclusive <= start) throw new Error(`invalid ELF interval ${startName}/${endName}`);
  const bytes = rom.subarray(start - 0x08000000, endExclusive - 0x08000000);
  return { start: hex(start), endExclusive: hex(endExclusive), byteLength: bytes.length, romSha256: sha256(bytes) };
}

const rapidTemplate = objectSpan("src/battle_anim_effects_3.c", effects, "gRapidSpinSpriteTemplate");
const rapidAnimCommands = objectSpan("src/battle_anim_effects_3.c", effects, "gRapidSpinAnimCmds");
const rapidAnimTable = objectSpan("src/battle_anim_effects_3.c", effects, "gRapidSpinAnimTable");
const hitSplatTemplate = objectSpan("src/battle_anim_normal.c", normal, "gBasicHitSplatSpriteTemplate");
const callbackSource = {
  AnimRapidSpin: functionSpan("src/battle_anim_effects_3.c", effects, "AnimRapidSpin"),
  AnimRapidSpin_Step: functionSpan("src/battle_anim_effects_3.c", effects, "AnimRapidSpin_Step"),
  AnimTask_RapinSpinMonElevation: functionSpan("src/battle_anim_effects_3.c", effects, "AnimTask_RapinSpinMonElevation"),
  RapinSpinMonElevation_Step: functionSpan("src/battle_anim_effects_3.c", effects, "RapinSpinMonElevation_Step"),
  AnimTask_ShakeTargetBasedOnMovePowerOrDmg: functionSpan("src/battle_anim_mon_movement.c", movement, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg"),
  AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step: functionSpan("src/battle_anim_mon_movement.c", movement, "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step"),
  AnimHitSplatBasic: functionSpan("src/battle_anim_normal.c", normal, "AnimHitSplatBasic"),
  Task_InitUpdateMonBg: functionSpan("src/battle_anim.c", runtime, "Task_InitUpdateMonBg"),
  Task_UpdateMonBg: functionSpan("src/battle_anim.c", runtime, "Task_UpdateMonBg"),
  Task_ClearMonBg: functionSpan("src/battle_anim.c", runtime, "Task_ClearMonBg"),
  Task_LoopAndPlaySE: functionSpan("src/battle_anim.c", runtime, "Task_LoopAndPlaySE"),
};
const callbacks = Object.fromEntries(Object.entries(callbackSource).map(([name, source]) => [name, { source, rom: pin(name) }]));
const runtimeCommandAddresses = {
  Cmd_loadspritegfx: 0x080a3d24,
  Cmd_createsprite: 0x080a3dd8,
  Cmd_createvisualtask: 0x080a3ecc,
  Cmd_waitforvisualfinish: 0x080a3f88,
  Cmd_end: 0x080a3fc4,
  Cmd_monbg: 0x080a41d8,
  Cmd_clearmonbg: 0x080a48b0,
  Cmd_playsewithpan: 0x080a5354,
  Cmd_loopsewithpan: 0x080a565c,
} as const;

for (const [label, tokens] of Object.entries({
  rapidTemplate: [
    ".tileTag = ANIM_TAG_RAPID_SPIN", ".paletteTag = ANIM_TAG_RAPID_SPIN",
    ".oam = &gOamData_AffineOff_ObjNormal_32x16", ".anims = gRapidSpinAnimTable", ".callback = AnimRapidSpin",
  ],
  rapidAnim: ["ANIMCMD_FRAME(0, 2)", "ANIMCMD_FRAME(8, 2)", "ANIMCMD_FRAME(16, 2)", "ANIMCMD_JUMP(0)"],
  rapidCallback: [
    "GetBattlerSpriteCoord(gBattleAnimAttacker, BATTLER_COORD_X)", "GetBattlerSpriteCoord(gBattleAnimTarget, BATTLER_COORD_X)",
    "sprite->data[2] = gBattleAnimArgs[4]", "sprite->callback = AnimRapidSpin_Step",
    "sprite->data[1] = (sprite->data[1] + sprite->data[2]) & 0xFF", "sprite->x2 = gSineTable[sprite->data[1]] >> 4", "DestroyAnimSprite(sprite)",
  ],
  elevation: [
    "void AnimTask_RapinSpinMonElevation(u8 taskId)", "GetBattlerYCoordWithElevation(gBattleAnimAttacker)",
    "GetBattlerSpriteBGPriorityRank(gBattleAnimAttacker)", "task->data[0] = var0 + 36", "task->data[2] = var0 - 33",
    "ScanlineEffect_SetParams(scanlineParams)", "task->func = RapinSpinMonElevation_Step", "task->data[5] = gBattleAnimArgs[1]",
    "gScanlineEffectRegBuffers[0][i] = task->data[12]", "if (task->data[10])", "gScanlineEffect.state = 3", "DestroyAnimVisualTask(taskId)",
  ],
  powerShake: [
    "void AnimTask_ShakeTargetBasedOnMovePowerOrDmg(u8 taskId)", "if (!gBattleAnimArgs[0])",
    "gTasks[taskId].data[15] = gAnimMovePower / 12", "gTasks[taskId].data[15] = gAnimMoveDmg / 12",
    "if (gTasks[taskId].data[15] < 1)", "if (gTasks[taskId].data[15] > 16)",
    "gTasks[taskId].data[7] = GetAnimBattlerSpriteId(ANIM_TARGET)", "AnimTask_ShakeTargetBasedOnMovePowerOrDmg_Step",
    "if (!--task->data[2])", "DestroyAnimVisualTask(taskId)",
  ],
  hitSplat: [
    ".tileTag = ANIM_TAG_IMPACT", ".paletteTag = ANIM_TAG_IMPACT", ".oam = &gOamData_AffineNormal_ObjBlend_32x32",
    ".affineAnims = sAffineAnims_HitSplat", ".callback = AnimHitSplatBasic", "DestroyAnimSprite(sprite)",
  ],
  runtime: [
    "static void Cmd_loadspritegfx(void)", "LoadCompressedSpriteSheetUsingHeap", "LoadCompressedSpritePaletteUsingHeap", "AddSpriteIndex",
    "static void Cmd_createsprite(void)", "CreateSpriteAndAnimate", "static void Cmd_createvisualtask(void)", "taskFunc(taskId)",
    "static void Cmd_loopsewithpan(void)", "CreateTask(Task_LoopAndPlaySE, 1)", "static void Cmd_playsewithpan(void)",
    "static void Cmd_monbg(void)", "MoveBattlerSpriteToBG", "CreateTask(Task_InitUpdateMonBg, 10)",
    "static void Cmd_clearmonbg(void)", "CreateTask(Task_ClearMonBg, 5)", "static void Cmd_end(void)", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag",
  ],
  resources: [
    "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}", "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}",
    "{gBattleAnimSpriteGfx_RapidSpin, 0x0300, ANIM_TAG_RAPID_SPIN}", "{gBattleAnimSpritePal_RapidSpin, ANIM_TAG_RAPID_SPIN}",
  ],
  graphics: [
    "graphics/battle_anims/sprites/impact.png", "graphics/battle_anims/sprites/rapid_spin.png",
  ],
  constants: [
    "#define ANIM_TAG_IMPACT                     (ANIM_SPRITES_START + 135)",
    "#define ANIM_TAG_RAPID_SPIN                 (ANIM_SPRITES_START + 229)",
  ],
  audio: ["#define SE_M_DOUBLE_SLAP            134", "#define SE_M_RAZOR_WIND2            160"],
  move: ["#define MOVE_RAPID_SPIN 229"],
  moveData: ["[MOVE_RAPID_SPIN] =", ".effect = EFFECT_RAPID_SPIN", ".power = 20", ".type = TYPE_NORMAL", ".accuracy = 100", ".pp = 40"],
  carrier: [".species = SPECIES_WARTORTLE", ".moves = {MOVE_SURF, MOVE_ICE_BEAM, MOVE_RAPID_SPIN, MOVE_PROTECT}", "BATTLE_FRONTIER_ITEM_SHELL_BELL", "F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP", "NATURE_DOCILE"],
})) {
  const source = label === "rapidTemplate" || label === "rapidAnim" || label === "rapidCallback" || label === "elevation" ? effects
    : label === "powerShake" ? movement
      : label === "hitSplat" ? normal
        : label === "runtime" ? runtime
          : label === "resources" ? registry
            : label === "graphics" ? graphics
              : label === "constants" ? animationConstants
              : label === "audio" ? songConstants
                  : label === "move" ? moveConstants
                    : label === "moveData" ? battleMoves
                    : frontierSource;
  requireTokens(label, source, tokens);
}
requireTokens("carrier constant", frontierConstants, ["#define FRONTIER_MON_WARTORTLE_2    281"]);

const expectedComponents = [
  "asset:ANIM_TAG_IMPACT",
  "asset:ANIM_TAG_RAPID_SPIN",
  "sprite:gRapidSpinSpriteTemplate",
  "task:AnimTask_RapinSpinMonElevation",
  "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg",
  "visualCommand:clearmonbg",
  "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:monbg",
];
const rapid = graph.moves.find((entry: Json) => entry.move === "MOVE_RAPID_SPIN");
if (!rapid || rapid.id !== 229 || rapid.rootScript !== "Move_RAPID_SPIN"
  || JSON.stringify(rapid.blocks) !== JSON.stringify(["Move_RAPID_SPIN"])
  || JSON.stringify(rapid.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Rapid Spin component graph drifted");

const level50Ranges = policy.rentalSelection.ranges.level50 as readonly { start: number; end: number }[];
const carriers = frontier.entries.filter((entry: Json) => level50Ranges.some((range) => entry.index >= range.start && entry.index <= range.end)
  && entry.moves.includes("MOVE_RAPID_SPIN"));
if (JSON.stringify(carriers.map((entry: Json) => entry.index)) !== JSON.stringify([281])) throw new Error("Rapid Spin Level-50 carrier census drifted");

const coverageStatus = (move: string): string => coverage.entries.find((entry: Json) => entry.move === move)?.status ?? "unsupported-absent";
const controlMoves = ["MOVE_ROLLOUT", "MOVE_FLAIL", "MOVE_REVERSAL", "MOVE_ENDEAVOR", "MOVE_PURSUIT", "MOVE_SPIT_UP", "MOVE_ICE_BALL"] as const;
const controls = Object.fromEntries(controlMoves.map((move) => {
  const entry = graph.moves.find((candidate: Json) => candidate.move === move);
  if (!entry) throw new Error(`missing generated control ${move}`);
  const isExact = ["MOVE_ROLLOUT", "MOVE_FLAIL", "MOVE_REVERSAL", "MOVE_ENDEAVOR"].includes(move);
  if ((isExact && coverageStatus(move) !== "exact") || (!isExact && coverageStatus(move) !== "unsupported-absent")) {
    throw new Error(`Rapid Spin control coverage changed for ${move}`);
  }
  if (entry.componentIds.includes("asset:ANIM_TAG_RAPID_SPIN") || entry.componentIds.includes("sprite:gRapidSpinSpriteTemplate") || entry.componentIds.includes("task:AnimTask_RapinSpinMonElevation")) {
    throw new Error(`Rapid Spin-exclusive source leaked to ${move}`);
  }
  return [move, { status: coverageStatus(move), rootScript: entry.rootScript, blocks: entry.blocks, components: entry.componentIds }];
}));

if (!coverage.entries.some((entry: Json) => entry.move === "MOVE_RAPID_SPIN" && entry.status === "exact")
  || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_BONEMERANG"])
  || coverage.componentTracks.some((track: Json) => track.moves?.includes("MOVE_RAPID_SPIN"))) {
  throw new Error("Rapid Spin exact coverage or component-track boundary drifted");
}

console.log(JSON.stringify({
  schema: "rapid-spin-source-audit/v1",
  move: "MOVE_RAPID_SPIN",
  moveId: 229,
  status: "exact",
  coverageCredit: true,
  source: {
    pointerOwnedRoot: {
      symbol: "Move_RAPID_SPIN",
      nextDispatchLabel: "Move_MOONLIGHT",
      source: rootBlock.source,
      rom: interval("Move_RAPID_SPIN", "Move_MOONLIGHT"),
      pointerContract: "complete half-open pointer-owned Move_RAPID_SPIN interval stops at the next dispatch label Move_MOONLIGHT; it contains no local branch, call, return, or subroutine label",
    },
    commands: expectedCommands,
    directBodies: {
      rapidSpinTemplate: { source: rapidTemplate, rom: pin("gRapidSpinSpriteTemplate") },
      rapidSpinAnimCommands: { source: rapidAnimCommands, rom: pin("gRapidSpinAnimCmds") },
      rapidSpinAnimTable: { source: rapidAnimTable, rom: pin("gRapidSpinAnimTable") },
      basicHitSplatTemplate: { source: hitSplatTemplate, rom: pin("gBasicHitSplatSpriteTemplate") },
      moveDefinition: { source: rapidSpinMove.source, power: 20, pp: 40, effect: "EFFECT_RAPID_SPIN" },
      callbacks,
      runtimeCommands: Object.fromEntries(Object.entries(runtimeCommandAddresses)
        .map(([name, start]) => [name, { source: functionSpan("src/battle_anim.c", runtime, name), rom: pinAt(name, start) }])),
    },
  },
  graph: { blocks: rapid.blocks, components: expectedComponents },
  resources: {
    impact: {
      tag: "ANIM_TAG_IMPACT", tagValue: 10135, tileBytes: 512,
      graphics: pin("gBattleAnimSpriteGfx_Impact"), palette: pin("gBattleAnimSpritePal_Impact"),
      template: "gBasicHitSplatSpriteTemplate", callback: "AnimHitSplatBasic",
      source: "graphics/battle_anims/sprites/impact.png",
    },
    rapidSpin: {
      tag: "ANIM_TAG_RAPID_SPIN", tagValue: 10229, tileBytes: 768,
      graphics: pin("gBattleAnimSpriteGfx_RapidSpin"), palette: pin("gBattleAnimSpritePal_RapidSpin"),
      template: "gRapidSpinSpriteTemplate", callback: "AnimRapidSpin -> AnimRapidSpin_Step",
      source: "graphics/battle_anims/sprites/rapid_spin.png",
      animation: ["ANIMCMD_FRAME(0, 2)", "ANIMCMD_FRAME(8, 2)", "ANIMCMD_FRAME(16, 2)", "ANIMCMD_JUMP(0)"],
    },
  },
  behavior: {
    monbg: {
      command: "monbg ANIM_ATTACKER", cleanup: "clearmonbg ANIM_ATTACKER",
      intent: "the attacker (and visible partner in doubles) moves to the battle-animation background; Task_UpdateMonBg follows its BG offset/palette until Task_ClearMonBg restores it",
    },
    rapidSpinSprite: {
      selector: "ANIM_ATTACKER", args: [0, 0, 32, -32, 40, -2],
      callback: "starts at the attacker X/Y, sine-wobbles x2 by gSineTable phase +40, advances y2 by -2, and self-destroys below -32",
    },
    elevation: {
      task: "AnimTask_RapinSpinMonElevation", spelling: "Rapin is source spelling",
      calls: [[0, 2, 0], [0, 2, 1]],
      intent: "scanline BG1/BG2 horizontal-offset elevation alternates every two frames, rises from attacker Y+36 toward max(Y-33,0), and ends its scanline effect only on the return call",
    },
    impact: {
      command: "create_basic_hitsplat_sprite ANIM_TARGET, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=2",
      template: "gBasicHitSplatSpriteTemplate uses ANIM_TAG_IMPACT's affine-normal 32x32 blend callback",
    },
    shake: {
      command: "createvisualtask AnimTask_ShakeTargetBasedOnMovePowerOrDmg, 2, FALSE, 1, 10, 1, 0",
      input: "FALSE selects gAnimMovePower / 12, clamped 1..16; TRUE would instead select gAnimMoveDmg / 12",
      movePower: 20, powerDivisor: 12, clampedAmplitude: 1,
      target: "ANIM_TARGET", cadence: { delay: 1, repeats: 10, horizontal: true, vertical: false },
    },
    audio: [
      { command: "loopsewithpan", sound: "SE_M_RAZOR_WIND2", id: 160, pan: "SOUND_PAN_ATTACKER", framesToWait: 8, plays: 4, occurrences: 2 },
      { command: "playsewithpan", sound: "SE_M_DOUBLE_SLAP", id: 134, pan: "SOUND_PAN_TARGET", occurrences: 1 },
    ],
    resourceLifetime: {
      loads: ["ANIM_TAG_IMPACT", "ANIM_TAG_RAPID_SPIN"], explicitUnload: false,
      release: "Cmd_end waits for visual/sound/mon-bg work, then releases every tracked loadspritegfx sheet and palette tag through sAnimSpriteIndexArray",
    },
  },
  carriers: {
    level50Ranges, setCount: carriers.length, speciesCount: new Set(carriers.map((entry: Json) => entry.species)).size,
    all: carriers.map((entry: Json) => ({ index: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, nature: entry.nature, evSpreadStats: entry.evSpreadStats })),
    lowest: carriers[0],
    lowestLegalRoute: { challengeNum: 2, level50Range: [267, 371], trainerId: 110, regularTrainerRange: [110, 119] },
  },
  controls: {
    exact: ["MOVE_ROLLOUT", "MOVE_FLAIL", "MOVE_REVERSAL", "MOVE_ENDEAVOR"],
    unsupported: ["MOVE_PURSUIT", "MOVE_SPIT_UP", "MOVE_ICE_BALL"],
    entries: controls,
    independence: "Exact controls and unsupported siblings remain independent. Rapid Spin transfers no component, timing, latch, reducer, compositor, or acceptance credit to them.",
  },
  checkpoint: {
    sourceAudit: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, productionChanged: true,
    coveragePromotion: true, componentTrackCredit: false, latchPromotion: true, unsupportedNoCreditBoundary: false,
  },
  scope: {
    denseStateCaptured: true, reducerAdded: true, assetsExtracted: true, typedSeamAdded: true,
    compositorAdded: true, framebufferAcceptance: true, productionChanged: true, coveragePromotion: true,
    queueItemAdded: false, componentTrackFulfilled: false, latchRowAdded: true,
  },
}, null, 2));
