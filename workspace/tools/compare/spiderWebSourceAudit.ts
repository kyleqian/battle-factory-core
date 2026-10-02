/** Deterministic authoritative source/classification audit for MOVE_SPIDER_WEB. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Symbol = { readonly address: number; readonly size: number };

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;

function span(path: string, source: string, start: number, endExclusive: number): Json {
  if (start < 0 || endExclusive <= start) throw new Error(`invalid source span ${path}:${start}..${endExclusive}`);
  const body = source.slice(start, endExclusive);
  return { path, start, endExclusive, byteLength: Buffer.byteLength(body), sha256: sha256(body) };
}

function block(path: string, source: string, startToken: string, endToken: string): { body: string; source: Json } {
  const start = source.indexOf(startToken);
  const endExclusive = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || endExclusive < 0) throw new Error(`missing source boundary ${startToken}/${endToken}`);
  return { body: source.slice(start, endExclusive), source: span(path, source, start, endExclusive) };
}

function functionSpan(path: string, source: string, name: string): Json {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "g");
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(source)) !== null) {
    const open = source.indexOf("{", match.index);
    const semicolon = source.indexOf(";", match.index);
    if (open < 0 || (semicolon >= 0 && semicolon < open)) continue;
    const start = source.lastIndexOf("\n", match.index) + 1;
    let depth = 0;
    for (let index = open; index < source.length; index++) {
      if (source[index] === "{") depth++;
      if (source[index] === "}") {
        depth--;
        if (depth === 0) return span(path, source, start, index + 1);
      }
    }
  }
  throw new Error(`missing function ${name}`);
}

function objectSpan(path: string, source: string, name: string): Json {
  const token = source.indexOf(name);
  const open = source.indexOf("{", token);
  const close = source.indexOf("};", open);
  if (token < 0 || open < 0 || close < 0) throw new Error(`missing object ${name}`);
  return span(path, source, source.lastIndexOf("\n", token) + 1, close + 2);
}

function macroSpan(path: string, source: string, name: string): Json {
  const token = source.indexOf(`.macro ${name}`);
  const close = source.indexOf("\n\t.endm", token);
  if (token < 0 || close < 0) throw new Error(`missing macro ${name}`);
  return span(path, source, source.lastIndexOf("\n", token) + 1, close + "\n\t.endm".length);
}

function sourceLine(path: string, source: string, token: string): Json {
  const start = source.indexOf(token);
  if (start < 0) throw new Error(`missing source token ${path}: ${token}`);
  const lineStart = source.lastIndexOf("\n", start) + 1;
  const lineEnd = source.indexOf("\n", start);
  return { path, line: source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd), sha256: sha256(source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd)) };
}

const scripts = read("data/battle_anim_scripts.s");
const macros = read("asm/macros/battle_anim_script.inc");
const bug = read("src/battle_anim_bug.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
const graphics = read("src/graphics.c");
const animData = read("src/data/battle_anim.h");
const animConstants = read("include/constants/battle_anim.h");
const songConstants = read("include/constants/songs.h");
const moveConstants = read("include/constants/moves.h");
const moves = read("src/data/battle_moves.h");
const frontierConstants = read("include/constants/battle_frontier_mons.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;

const rootBlock = block("data/battle_anim_scripts.s", scripts, "Move_SPIDER_WEB:\n", "Move_RAZOR_WIND:\n");
const rootCommands = rootBlock.body.split("\n")
  .slice(1)
  .map((line) => line.replace(/@.*$/u, "").trim())
  .filter((line) => Boolean(line) && !line.endsWith(":"));
const expectedCommands = [
  "loadspritegfx ANIM_TAG_SPIDER_WEB",
  "loadspritegfx ANIM_TAG_WEB_THREAD",
  "monbg ANIM_DEF_PARTNER",
  "delay 0",
  "simple_palette_blend unused_subpriority_offset=5, selector=F_PAL_BG, delay=2, initial_blend_y=0, target_blend_y=9, color=RGB_BLACK",
  "waitforvisualfinish",
  "splitbgprio ANIM_TARGET",
  "loopsewithpan SE_M_STRING_SHOT, SOUND_PAN_ATTACKER, 9, 6",
  ...Array.from({ length: 14 }, () => "call SpiderWebThread"),
  "waitforvisualfinish",
  "playsewithpan SE_M_STRING_SHOT2, SOUND_PAN_TARGET",
  "createsprite gSpiderWebSpriteTemplate, ANIM_ATTACKER, 2",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "delay 1",
  "simple_palette_blend unused_subpriority_offset=5, selector=F_PAL_BG, delay=2, initial_blend_y=9, target_blend_y=0, color=RGB_BLACK",
  "end",
  "create_web_thread_sprite ANIM_TARGET, 2, x=20, y=0, unk2=512, amplitude=20, targets_both=FALSE",
  "delay 1",
  "return",
];
if (JSON.stringify(rootCommands) !== JSON.stringify(expectedCommands)) throw new Error("Spider Web root command order drifted");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
});
const symbols = new Map<string, Symbol>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    // Three translation units define static Cmd_end. Pin the animation
    // runtime body (battle_anim.o in the linker map), independent of nm's
    // ordering of duplicate names on macOS versus Linux.
    if (fields.at(-1) === "Cmd_end" && Number.parseInt(fields[0]!, 16) !== 0x080a3fc4) continue;
    symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));
function address(name: string): number {
  const value = symbols.get(name);
  if (!value) throw new Error(`missing ELF symbol ${name}`);
  return value.address;
}
function pin(name: string): Json {
  const value = symbols.get(name);
  if (!value?.size) throw new Error(`missing sized ELF symbol ${name}`);
  const bytes = rom.subarray(value.address - 0x08000000, value.address - 0x08000000 + value.size);
  return { start: hex(value.address), endExclusive: hex(value.address + value.size), byteLength: value.size, romSha256: sha256(bytes) };
}
function interval(startName: string, endName: string): Json {
  const start = address(startName), endExclusive = address(endName);
  const bytes = rom.subarray(start - 0x08000000, endExclusive - 0x08000000);
  return { start: hex(start), endExclusive: hex(endExclusive), byteLength: bytes.length, romSha256: sha256(bytes) };
}
function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const generated = graph.moves.find((move: Json) => move.move === "MOVE_SPIDER_WEB");
if (!generated) throw new Error("generated Spider Web graph missing");
const carriers = frontier.entries.filter((entry: Json) => entry.moves.includes("MOVE_SPIDER_WEB"));
if (carriers.length !== 2 || carriers[0]?.index !== 27) throw new Error("Spider Web carrier census drifted");

requireTokens("Spider Web source", rootBlock.body, [
  "loadspritegfx ANIM_TAG_SPIDER_WEB", "loadspritegfx ANIM_TAG_WEB_THREAD", "monbg ANIM_DEF_PARTNER",
  "simple_palette_blend", "splitbgprio ANIM_TARGET", "call SpiderWebThread", "createsprite gSpiderWebSpriteTemplate",
  "clearmonbg ANIM_DEF_PARTNER", "SE_M_STRING_SHOT", "SE_M_STRING_SHOT2",
]);
requireTokens("Spider Web callbacks", bug, [
  "const struct SpriteTemplate gWebThreadSpriteTemplate", "const struct SpriteTemplate gSpiderWebSpriteTemplate",
  "static void AnimTranslateWebThread", "static void AnimTranslateWebThread_Step",
  "static void AnimSpiderWeb", "static void AnimSpiderWeb_Step", "static void AnimSpiderWeb_End",
  "InitAnimLinearTranslationWithSpeed", "AnimTranslateLinear", "SetGpuReg(REG_OFFSET_BLDALPHA",
  "DestroyAnimSprite(sprite)",
]);
requireTokens("Spider Web runtime", runtime, [
  "static void Cmd_monbg", "static void Cmd_clearmonbg", "static void Cmd_splitbgprio",
  "static void Task_InitUpdateMonBg", "static void Task_UpdateMonBg", "static void Task_ClearMonBg",
  "static void Cmd_loopsewithpan", "static void Task_LoopAndPlaySE", "static void Cmd_end",
]);
requireTokens("Spider Web palette", normal, [
  "gSimplePaletteBlendSpriteTemplate", "static void AnimSimplePaletteBlend",
  "static void AnimSimplePaletteBlend_Step", "BeginNormalPaletteFade",
]);

const source = {
  pointerOwnedRoot: { rom: interval("Move_SPIDER_WEB", "Move_RAZOR_WIND"), source: rootBlock.source },
  subroutine: { source: block("data/battle_anim_scripts.s", scripts, "SpiderWebThread:\n", "Move_RAZOR_WIND:\n").source },
  direct: {
    templates: {
      gWebThreadSpriteTemplate: { source: objectSpan("src/battle_anim_bug.c", bug, "gWebThreadSpriteTemplate"), rom: pin("gWebThreadSpriteTemplate") },
      gSpiderWebSpriteTemplate: { source: objectSpan("src/battle_anim_bug.c", bug, "gSpiderWebSpriteTemplate"), rom: pin("gSpiderWebSpriteTemplate") },
      sAffineAnim_SpiderWeb: { source: objectSpan("src/battle_anim_bug.c", bug, "sAffineAnim_SpiderWeb"), rom: pin("sAffineAnim_SpiderWeb") },
      sAffineAnims_SpiderWeb: { source: objectSpan("src/battle_anim_bug.c", bug, "sAffineAnims_SpiderWeb"), rom: pin("sAffineAnims_SpiderWeb") },
      gSimplePaletteBlendSpriteTemplate: { source: objectSpan("src/battle_anim_normal.c", normal, "gSimplePaletteBlendSpriteTemplate"), rom: pin("gSimplePaletteBlendSpriteTemplate") },
    },
    callbacks: Object.fromEntries([
      ["AnimTranslateWebThread", ["src/battle_anim_bug.c", bug]],
      ["AnimTranslateWebThread_Step", ["src/battle_anim_bug.c", bug]],
      ["AnimSpiderWeb", ["src/battle_anim_bug.c", bug]],
      ["AnimSpiderWeb_Step", ["src/battle_anim_bug.c", bug]],
      ["AnimSpiderWeb_End", ["src/battle_anim_bug.c", bug]],
      ["AnimSimplePaletteBlend", ["src/battle_anim_normal.c", normal]],
      ["AnimSimplePaletteBlend_Step", ["src/battle_anim_normal.c", normal]],
      ["Task_InitUpdateMonBg", ["src/battle_anim.c", runtime]],
      ["Task_UpdateMonBg", ["src/battle_anim.c", runtime]],
      ["Task_ClearMonBg", ["src/battle_anim.c", runtime]],
      ["Task_LoopAndPlaySE", ["src/battle_anim.c", runtime]],
      ["Cmd_monbg", ["src/battle_anim.c", runtime]],
      ["Cmd_clearmonbg", ["src/battle_anim.c", runtime]],
      ["Cmd_splitbgprio", ["src/battle_anim.c", runtime]],
      ["Cmd_loopsewithpan", ["src/battle_anim.c", runtime]],
      ["Cmd_end", ["src/battle_anim.c", runtime]],
    ].map(([name, [path, text]]) => [name, { source: functionSpan(path as string, text as string, name as string), rom: pin(name as string) }])),
  },
  macros: Object.fromEntries([
    "monbg", "clearmonbg", "splitbgprio", "simple_palette_blend", "create_web_thread_sprite",
  ].map((name) => [name, macroSpan("asm/macros/battle_anim_script.inc", macros, name)])),
};

const output = {
  schema: "spider-web-source-audit/v1",
  status: "exact",
  coverageCredit: false,
  move: "MOVE_SPIDER_WEB",
  moveId: 169,
  source,
  script: {
    commands: rootCommands,
    root: "Move_SPIDER_WEB",
    endExclusive: "Move_RAZOR_WIND",
    pointerAddresses: ["Move_SPIDER_WEB", "SpiderWebThread", "Move_RAZOR_WIND"],
  },
  graph: { root: generated.rootScript, blocks: generated.blocks, components: generated.componentIds },
  templates: ["gWebThreadSpriteTemplate", "gSpiderWebSpriteTemplate", "gSimplePaletteBlendSpriteTemplate"],
  callbacks: ["AnimTranslateWebThread", "AnimTranslateWebThread_Step", "AnimSpiderWeb", "AnimSpiderWeb_Step", "AnimSpiderWeb_End", "AnimSimplePaletteBlend", "AnimSimplePaletteBlend_Step"],
  tasks: ["Task_InitUpdateMonBg", "Task_UpdateMonBg", "Task_ClearMonBg", "Task_LoopAndPlaySE"],
  visualCommands: ["clearmonbg", "create_web_thread_sprite", "monbg", "simple_palette_blend", "splitbgprio"],
  resources: {
    tags: { ANIM_TAG_WEB_THREAD: 10180, ANIM_TAG_SPIDER_WEB: 10181 },
    graphics: [sourceLine("src/graphics.c", graphics, "gBattleAnimSpriteGfx_WebThread"), sourceLine("src/graphics.c", graphics, "gBattleAnimSpriteGfx_SpiderWeb")],
    table: [
      sourceLine("src/data/battle_anim.h", animData, "gBattleAnimSpriteGfx_WebThread"),
      sourceLine("src/data/battle_anim.h", animData, "gBattleAnimSpritePal_String, ANIM_TAG_WEB_THREAD"),
      sourceLine("src/data/battle_anim.h", animData, "gBattleAnimSpriteGfx_SpiderWeb"),
      sourceLine("src/data/battle_anim.h", animData, "gBattleAnimSpritePal_String, ANIM_TAG_SPIDER_WEB"),
    ],
    sourceFiles: ["graphics/battle_anims/sprites/web_thread.png", "graphics/battle_anims/sprites/spider_web.png"],
  },
  audio: {
    symbols: ["SE_M_STRING_SHOT", "SE_M_STRING_SHOT2"],
    constants: [sourceLine("include/constants/songs.h", songConstants, "#define SE_M_STRING_SHOT"), sourceLine("include/constants/songs.h", songConstants, "#define SE_M_STRING_SHOT2")],
  },
  moveData: block("src/data/battle_moves.h", moves, "    [MOVE_SPIDER_WEB] =\n", "    [MOVE_MIND_READER] =\n").source,
  constants: {
    move: sourceLine("include/constants/moves.h", moveConstants, "#define MOVE_SPIDER_WEB"),
    webThread: sourceLine("include/constants/battle_anim.h", animConstants, "#define ANIM_TAG_WEB_THREAD"),
    spiderWeb: sourceLine("include/constants/battle_anim.h", animConstants, "#define ANIM_TAG_SPIDER_WEB"),
  },
  carriers: carriers.map((entry: Json) => ({ setId: entry.index, label: entry.label, species: entry.species, moves: entry.moves, itemName: entry.itemName, ppUps: [0, 0, 0, 0] })),
  carrierSource: {
    constant: sourceLine("include/constants/battle_frontier_mons.h", frontierConstants, "FRONTIER_MON_SPINARAK"),
    record: block("src/data/battle_frontier/battle_frontier_mons.h", frontierSource, "    [FRONTIER_MON_SPINARAK] = {\n", "    [FRONTIER_MON_MARILL] = {\n").source,
    lowestLegalLevel50Set: 27,
  },
  boundaries: {
    immutable: ["parties", "battlers", "engine", "immutableState", "rawBattleState"],
    gameplayRng: "immutableState.rngValue and rawBattleState.gameplayRng remain source-window stable",
    animationRng: "gRng2Value is presentation-only and may advance independently",
    noTransientInjection: true,
    scene: "battle-scene-on",
  },
};

console.log(JSON.stringify(output, null, 2));
