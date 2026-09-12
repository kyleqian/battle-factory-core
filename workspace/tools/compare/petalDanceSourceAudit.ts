/**
 * Deterministic source/staging audit for MOVE_PETAL_DANCE.
 *
 * This development-only receipt deliberately stops before dense evidence or
 * product work.  It derives source facts from the pinned pret checkout and
 * never feeds a production reducer or compositor.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, any>;
type Span = {
  readonly path: string;
  readonly start: number;
  readonly endExclusive: number;
  readonly byteLength: number;
  readonly sha256: string;
};
type Symbol = { readonly address: number; readonly size: number };

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const read = (path: string): string => readFileSync(resolve(sourceRoot, path), "utf8");
const sha256 = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;

function sourceSpan(path: string, source: string, start: number, endExclusive: number): Span {
  if (start < 0 || endExclusive <= start) throw new Error(`invalid source span ${path}:${start}..${endExclusive}`);
  const body = source.slice(start, endExclusive);
  return { path, start, endExclusive, byteLength: Buffer.byteLength(body), sha256: sha256(body) };
}

function block(path: string, source: string, startToken: string, endToken: string) {
  const start = source.indexOf(startToken);
  const endExclusive = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || endExclusive < 0) throw new Error(`missing source boundary ${startToken}/${endToken}`);
  return { body: source.slice(start, endExclusive), source: sourceSpan(path, source, start, endExclusive) };
}

function functionSpan(path: string, source: string, name: string): Span {
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
      if (depth === 0) return sourceSpan(path, source, start, index + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function objectSpan(path: string, source: string, name: string): Span {
  const token = source.indexOf(name);
  if (token < 0) throw new Error(`missing object ${name}`);
  const start = source.lastIndexOf("\n", token) + 1;
  const open = source.indexOf("{", token);
  const endExclusive = source.indexOf("};", open) + 2;
  if (open < 0 || endExclusive < 2) throw new Error(`unterminated object ${name}`);
  return sourceSpan(path, source, start, endExclusive);
}

function requireTokens(label: string, source: string, tokens: readonly string[]): void {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${label} drifted: ${token}`);
  }
}

const scripts = read("data/battle_anim_scripts.s");
const effects = read("src/battle_anim_effects_1.c");
const movement = read("src/battle_anim_mon_movement.c");
const normal = read("src/battle_anim_normal.c");
const runtime = read("src/battle_anim.c");
const registry = read("src/data/battle_anim.h");
const graphics = read("src/graphics.c");
const animConstants = read("include/constants/battle_anim.h");
const moveConstants = read("include/constants/moves.h");
const songConstants = read("include/constants/songs.h");
const speciesConstants = read("include/constants/species.h");
const frontierConstants = read("include/constants/battle_frontier_mons.h");
const frontierSource = read("src/data/battle_frontier/battle_frontier_mons.h");
const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as Json;
const frontier = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as Json;
const policy = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-round-policy.json"), "utf8")) as Json;
const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;

const rootBlock = block("data/battle_anim_scripts.s", scripts, "Move_PETAL_DANCE:\n", "Move_RAZOR_LEAF:\n");
const commands = rootBlock.body.split("\n")
  .slice(1)
  .map((line) => line.replace(/@.*$/u, "").trim())
  .filter((line) => Boolean(line) && !line.endsWith(":"));
const expectedCommands = [
  "loadspritegfx ANIM_TAG_FLOWER",
  "loadspritegfx ANIM_TAG_IMPACT",
  "monbg ANIM_DEF_PARTNER",
  "setalpha 12, 8",
  "playsewithpan SE_M_PETAL_DANCE, SOUND_PAN_ATTACKER",
  "createvisualtask AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_ATTACKER, 12, 6, 6, 3",
  "create_petal_dance_big_flower_sprite ANIM_ATTACKER, 2, initial_x=0, initial_y=-24, target_y=8, duration=140",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=16, initial_y=-24, target_y=8, duration=100",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=-16, initial_y=-24, target_y=8, duration=100",
  "delay 15",
  "create_petal_dance_big_flower_sprite ANIM_ATTACKER, 2, initial_x=0, initial_y=-24, target_y=8, duration=140",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=32, initial_y=-24, target_y=8, duration=100",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=-32, initial_y=-24, target_y=8, duration=100",
  "delay 15",
  "create_petal_dance_big_flower_sprite ANIM_ATTACKER, 2, initial_x=0, initial_y=-24, target_y=8, duration=140",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=24, initial_y=-24, target_y=8, duration=100",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=-24, initial_y=-24, target_y=8, duration=100",
  "delay 30",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=16, initial_y=-24, target_y=0, duration=100",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=-16, initial_y=-24, target_y=0, duration=100",
  "delay 30",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=20, initial_y=-16, target_y=14, duration=80",
  "create_petal_dance_small_flower_sprite ANIM_ATTACKER, 2, initial_x=-20, initial_y=-14, target_y=16, duration=80",
  "waitforvisualfinish",
  "createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2, 0, 24, 0, 0, 5",
  "delay 3",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 3, x=0, y=0, relative_to=ANIM_TARGET, animation=0",
  "createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 6, 0, 8, 1",
  "waitforvisualfinish",
  "delay 8",
  "createsprite gSlideMonToOriginalPosSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 7",
  "waitforvisualfinish",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
  "end",
];
if (JSON.stringify(commands) !== JSON.stringify(expectedCommands)) throw new Error("Petal Dance root command order drifted");
if (/\b(?:call|goto|return|jump)\b/u.test(rootBlock.body)) throw new Error("Petal Dance root stopped being branchless");

const nm = execFileSync("arm-none-eabi-nm", ["-a", "-S", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
});
const symbols = new Map<string, Symbol>();
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));
function symbol(name: string): Symbol {
  const value = symbols.get(name);
  if (!value) throw new Error(`missing ELF symbol ${name}`);
  return value;
}
function pin(name: string) {
  const value = symbol(name);
  if (!value.size) throw new Error(`missing sized ELF symbol ${name}`);
  const bytes = rom.subarray(value.address - 0x08000000, value.address - 0x08000000 + value.size);
  return { start: hex(value.address), endExclusive: hex(value.address + value.size), byteLength: value.size, romSha256: sha256(bytes) };
}
function interval(startName: string, endName: string) {
  const start = symbol(startName).address;
  const endExclusive = symbol(endName).address;
  if (endExclusive <= start) throw new Error(`invalid interval ${startName}/${endName}`);
  const bytes = rom.subarray(start - 0x08000000, endExclusive - 0x08000000);
  return { start: hex(start), endExclusive: hex(endExclusive), byteLength: bytes.length, romSha256: sha256(bytes) };
}

const generated = graph.moves.find((entry: Json) => entry.move === "MOVE_PETAL_DANCE");
const expectedComponents = [
  "asset:ANIM_TAG_FLOWER", "asset:ANIM_TAG_IMPACT",
  "sprite:gSlideMonToOffsetSpriteTemplate", "sprite:gSlideMonToOriginalPosSpriteTemplate",
  "task:AnimTask_ShakeMon", "task:AnimTask_TranslateMonEllipticalRespectSide",
  "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite",
  "visualCommand:create_petal_dance_big_flower_sprite", "visualCommand:create_petal_dance_small_flower_sprite",
  "visualCommand:monbg", "visualCommand:setalpha",
];
if (!generated || generated.id !== 80 || generated.rootScript !== "Move_PETAL_DANCE"
  || JSON.stringify(generated.blocks) !== JSON.stringify(["Move_PETAL_DANCE"])
  || JSON.stringify(generated.componentIds) !== JSON.stringify(expectedComponents)) {
  throw new Error("Petal Dance generated component graph drifted");
}
if (!coverage.entries.some((entry: Json) => entry.move === "MOVE_PETAL_DANCE" && entry.status === "exact")
  || JSON.stringify(coverage.queue) !== JSON.stringify(["MOVE_SMOG"])) {
  throw new Error("Petal Dance exact promotion and Sky Uppercut queue boundary drifted");
}

const carriers = frontier.entries
  .filter((entry: Json) => entry.index >= 110 && entry.index <= 849 && entry.moves.includes("MOVE_PETAL_DANCE"))
  .sort((left: Json, right: Json) => left.index - right.index);
const expectedCarrierIds = [167, 174, 208, 255, 394];
if (JSON.stringify(carriers.map((entry: Json) => entry.index)) !== JSON.stringify(expectedCarrierIds)) {
  throw new Error("Petal Dance Level-50 carrier census drifted");
}
const lowestRange = policy.rentalSelection.ranges.level50[0];
const lowestTrainerRange = policy.trainerSelection.normalRanges[0];
if (lowestRange.start !== 110 || lowestRange.end !== 199 || lowestTrainerRange.start !== 0 || lowestTrainerRange.end !== 99
  || carriers[0]!.index < lowestRange.start || carriers[0]!.index > lowestRange.end) {
  throw new Error("Petal Dance lowest legal route drifted");
}

requireTokens("Petal Dance constants", [moveConstants, songConstants, speciesConstants, frontierConstants].join("\n"), [
  "#define MOVE_PETAL_DANCE 80", "#define SE_M_PETAL_DANCE            202", "#define SPECIES_GLOOM 44", "#define FRONTIER_MON_GLOOM_1        167",
]);
requireTokens("Petal Dance lowest carrier", frontierSource, [
  "[FRONTIER_MON_GLOOM_1]", ".species = SPECIES_GLOOM",
  ".moves = {MOVE_PETAL_DANCE, MOVE_ACID, MOVE_STUN_SPORE, MOVE_MOONLIGHT}",
  "BATTLE_FRONTIER_ITEM_PERSIM_BERRY", "F_EV_SPREAD_SP_ATTACK | F_EV_SPREAD_HP", "NATURE_QUIRKY",
]);
requireTokens("Petal Dance flower resources", [registry, graphics, animConstants].join("\n"), [
  "{gBattleAnimSpriteGfx_Flower, 0x00a0, ANIM_TAG_FLOWER}", "{gBattleAnimSpritePal_Flower, ANIM_TAG_FLOWER}",
  'INCGFX_U32("graphics/battle_anims/sprites/flower.4bpp", ".lz")',
  'INCGFX_U32("graphics/battle_anims/sprites/flower.pal", ".gbapal.lz")',
  "#define ANIM_TAG_FLOWER                     (ANIM_SPRITES_START + 159)",
]);
requireTokens("Petal Dance big flower", effects, [
  "const struct SpriteTemplate gPetalDanceBigFlowerSpriteTemplate", ".oam = &gOamData_AffineOff_ObjNormal_16x16",
  ".callback = AnimPetalDanceBigFlower", "sprite->x2 += Sin(sprite->data[5], 32)",
  "sprite->y2 += Cos(sprite->data[5], -5)", "sprite->data[5] = (sprite->data[5] + 5) & 0xFF",
]);
requireTokens("Petal Dance small flower", effects, [
  "const struct SpriteTemplate gPetalDanceSmallFlowerSpriteTemplate", ".oam = &gOamData_AffineOff_ObjNormal_8x8",
  ".callback = AnimPetalDanceSmallFlower", "sprite->x2 += Sin(sprite->data[5], 8)",
  "sprite->oam.matrixNum ^= ST_OAM_HFLIP", "(u16)(sprite->data[5] - 59) < 5",
]);
requireTokens("Petal Dance slide and shake", movement, [
  "const struct SpriteTemplate gSlideMonToOffsetSpriteTemplate", "const struct SpriteTemplate gSlideMonToOriginalPosSpriteTemplate",
  "void AnimTask_ShakeMon(u8 taskId)", "void AnimTask_TranslateMonEllipticalRespectSide(u8 taskId)",
  "gBattleAnimArgs[1] = -gBattleAnimArgs[1]", "AnimTask_TranslateMonElliptical(taskId)",
]);
requireTokens("Petal Dance runtime", runtime, [
  "static void Cmd_loadspritegfx(void)", "static void Cmd_monbg(void)", "static void Cmd_clearmonbg(void)",
  "static void Cmd_createsprite(void)", "static void Cmd_createvisualtask(void)", "static void Cmd_waitforvisualfinish(void)",
  "static void Cmd_end(void)", "FreeSpriteTilesByTag", "FreeSpritePaletteByTag",
]);

const audit = {
  schema: "petal-dance-source-audit/v1",
  status: "unsupported-source-staging-checkpoint",
  coverageCredit: false,
  move: "MOVE_PETAL_DANCE",
  moveId: 80,
  pointerOwned: {
    root: {
      symbol: "Move_PETAL_DANCE", nextDispatchLabel: "Move_RAZOR_LEAF",
      rom: interval("Move_PETAL_DANCE", "Move_RAZOR_LEAF"), source: rootBlock.source,
      pointerContract: "branchless half-open script body starts at Move_PETAL_DANCE and ends exactly at the next dispatch label Move_RAZOR_LEAF; it owns no subroutine, call, branch, or return label",
    },
  },
  graph: {
    rootScript: generated.rootScript, blocks: generated.blocks, components: generated.componentIds,
    identities: graph.components.filter((component: Json) => generated.componentIds.includes(component.id)).map((component: Json) => ({
      id: component.id, kind: component.kind, name: component.name, moveCount: component.moveCount, level50MoveCount: component.level50MoveCount,
    })),
  },
  script: {
    commandCount: expectedCommands.length, commands: expectedCommands,
    flowerGroups: {
      big: [
        { initialX: 0, initialY: -24, targetY: 8, duration: 140 },
        { initialX: 0, initialY: -24, targetY: 8, duration: 140 },
        { initialX: 0, initialY: -24, targetY: 8, duration: 140 },
      ],
      small: [
        { initialX: 16, initialY: -24, targetY: 8, duration: 100 }, { initialX: -16, initialY: -24, targetY: 8, duration: 100 },
        { initialX: 32, initialY: -24, targetY: 8, duration: 100 }, { initialX: -32, initialY: -24, targetY: 8, duration: 100 },
        { initialX: 24, initialY: -24, targetY: 8, duration: 100 }, { initialX: -24, initialY: -24, targetY: 8, duration: 100 },
        { initialX: 16, initialY: -24, targetY: 0, duration: 100 }, { initialX: -16, initialY: -24, targetY: 0, duration: 100 },
        { initialX: 20, initialY: -16, targetY: 14, duration: 80 }, { initialX: -20, initialY: -14, targetY: 16, duration: 80 },
      ],
      delays: [15, 15, 30, 30],
    },
    impact: { slideOffset: [0, 24, 0, 0, 5], delay: 3, hitSplat: [0, 0, 0], shake: ["ANIM_TARGET", 6, 0, 8, 1], returnDelay: 8, slideOriginal: [0, 0, 7] },
    background: { monbg: "ANIM_DEF_PARTNER", alpha: [12, 8], cleanup: ["clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"] },
    audio: [
      { sound: "SE_M_PETAL_DANCE", id: 202, pan: "SOUND_PAN_ATTACKER" },
      { sound: "SE_M_MEGA_KICK2", pan: "SOUND_PAN_TARGET" },
    ],
  },
  directBodies: {
    templates: {
      bigFlower: { source: objectSpan("src/battle_anim_effects_1.c", effects, "gPetalDanceBigFlowerSpriteTemplate"), rom: pin("gPetalDanceBigFlowerSpriteTemplate") },
      smallFlower: { source: objectSpan("src/battle_anim_effects_1.c", effects, "gPetalDanceSmallFlowerSpriteTemplate"), rom: pin("gPetalDanceSmallFlowerSpriteTemplate") },
      hitSplat: { source: objectSpan("src/battle_anim_normal.c", normal, "gBasicHitSplatSpriteTemplate"), rom: pin("gBasicHitSplatSpriteTemplate") },
      slideOffset: { source: objectSpan("src/battle_anim_mon_movement.c", movement, "gSlideMonToOffsetSpriteTemplate"), rom: pin("gSlideMonToOffsetSpriteTemplate") },
      slideOriginal: { source: objectSpan("src/battle_anim_mon_movement.c", movement, "gSlideMonToOriginalPosSpriteTemplate"), rom: pin("gSlideMonToOriginalPosSpriteTemplate") },
    },
    callbacks: Object.fromEntries([
      ["AnimPetalDanceBigFlower", effects], ["AnimPetalDanceBigFlower_Step", effects],
      ["AnimPetalDanceSmallFlower", effects], ["AnimPetalDanceSmallFlower_Step", effects],
      ["AnimTask_ShakeMon", movement], ["AnimTask_ShakeMon_Step", movement],
      ["AnimTask_TranslateMonEllipticalRespectSide", movement], ["AnimTask_TranslateMonElliptical", movement],
      ["SlideMonToOffset", movement], ["SlideMonToOriginalPos", movement], ["AnimHitSplatBasic", normal],
      ["Task_InitUpdateMonBg", runtime], ["Task_UpdateMonBg", runtime], ["Task_ClearMonBg", runtime],
    ].map(([name, source]) => [name, { source: functionSpan(`src/${source === effects ? "battle_anim_effects_1.c" : source === movement ? "battle_anim_mon_movement.c" : source === normal ? "battle_anim_normal.c" : "battle_anim.c"}`, source as string, name as string), rom: pin(name as string) }])),
  },
  resources: {
    flower: { tag: "ANIM_TAG_FLOWER", tagValue: 10159, tileBytes: 160, gfx: pin("gBattleAnimSpriteGfx_Flower"), palette: pin("gBattleAnimSpritePal_Flower"), source: "graphics/battle_anims/sprites/flower.4bpp + flower.pal" },
    impact: { tag: "ANIM_TAG_IMPACT", tagValue: 10135, tileBytes: 512, template: "gBasicHitSplatSpriteTemplate" },
    resourceLifetime: "loadspritegfx FLOWER and IMPACT; no explicit unloadspritegfx; Cmd_end frees tracked sheet/palette tags after all visual and sound work completes",
  },
  carrierCensus: {
    level50Range: { first: 110, last: 849 }, complete: carriers,
    lowestLegal: carriers[0],
    lowestLegalRoute: { challengeNum: 0, battleNum: 0, level50Range: [lowestRange.start, lowestRange.end], trainerId: 50, regularTrainerRange: [lowestTrainerRange.start, lowestTrainerRange.end] },
  },
  scope: {
    legalBilateralPartyOnlyStaging: true, denseWindowCaptured: false, latchMeasured: false,
    assetsExtracted: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false,
    framebufferAcceptance: false, productionChanged: false, coveragePromotion: false,
    componentTrackCredit: false, siblingCredit: false, queueItemAdded: true,
  },
  independence: "MOVE_PETAL_DANCE stays unsupported. FLOWER art, IMPACT art, slide, shake, monbg, alpha, or animation-command overlap grants no credit to Aromatherapy, Razor Leaf, Sunny Day, or any other move.",
};

console.log(`${JSON.stringify(audit)}\n`);
