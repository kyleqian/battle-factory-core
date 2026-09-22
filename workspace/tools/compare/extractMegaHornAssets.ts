/** Reproducible source extraction for MOVE_MEGAHORN's HORN_HIT_2 object. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { sliceTiles } from "../extract/tiles.ts";

type SymbolEntry = { address: number; size: number };

const root = resolve(import.meta.dirname, "../..");
const reference = join(root, "reference/pokeemerald");
const outputFlag = process.argv.indexOf("--out");
const output = outputFlag >= 0 && process.argv[outputFlag + 1]
  ? resolve(process.argv[outputFlag + 1]!)
  : join(root, "src/animation/assets/mega-horn-horn-hit-2.json");
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => "0x" + value.toString(16).padStart(8, "0");
const source = (path: string): string => readFileSync(join(reference, path), "utf8");

function block(text: string, startToken: string, endToken: string): string {
  const start = text.indexOf(startToken);
  const end = text.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) {
    throw new Error("missing source block " + startToken + "/" + endToken);
  }
  return text.slice(start, end);
}

function functionBody(text: string, name: string): string {
  const matcher = new RegExp("\\b" + name + "\\s*\\(", "gu");
  for (let match = matcher.exec(text); match; match = matcher.exec(text)) {
    const open = text.indexOf("{", match.index);
    const semicolon = text.indexOf(";", match.index);
    if (open < 0 || (semicolon >= 0 && semicolon < open)) continue;
    let depth = 0;
    for (let index = open; index < text.length; index += 1) {
      if (text[index] === "{") depth += 1;
      else if (text[index] === "}" && --depth === 0) {
        return text.slice(text.lastIndexOf("\n", match.index) + 1, index + 1);
      }
    }
  }
  throw new Error("missing function " + name);
}

function sourceIdentity(path: string, text: string, body: string) {
  const start = text.indexOf(body);
  if (start < 0) throw new Error("source body drifted for " + path);
  return {
    path,
    start,
    endExclusive: start + body.length,
    byteLength: Buffer.byteLength(body),
    sha256: sha256(body),
  };
}

function requireTokens(label: string, text: string, tokens: readonly string[]): void {
  for (const token of tokens) {
    if (!text.includes(token)) throw new Error(label + " drifted: " + token);
  }
}

const rom = readFileSync(join(reference, "pokeemerald.gba"));
const symbols = new Map<string, SymbolEntry>();
const nm = execFileSync("arm-none-eabi-nm", [
  "-a",
  "-S",
  join(reference, "pokeemerald.elf"),
], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
for (const line of nm.split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4
    && /^[0-9a-f]+$/iu.test(fields[0]!)
    && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields.at(-1)!, {
      address: Number.parseInt(fields[0]!, 16),
      size: Number.parseInt(fields[1]!, 16),
    });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, {
      address: Number.parseInt(fields[0]!, 16),
      size: 0,
    });
  }
}

function romIdentity(name: string, endName?: string) {
  const entry = symbols.get(name);
  const endEntry = endName ? symbols.get(endName) : undefined;
  if (!entry || (!endName && entry.size === 0) || (endName && !endEntry)) {
    throw new Error("missing ELF symbol range " + name);
  }
  const start = entry.address - 0x08000000;
  const endAddress = endEntry ? endEntry.address : entry.address + entry.size;
  const end = endAddress - 0x08000000;
  return {
    symbol: name,
    start: hex(entry.address),
    endExclusive: hex(endAddress),
    byteLength: endAddress - entry.address,
    sha256: sha256(rom.subarray(start, end)),
  };
}

const scripts = source("data/battle_anim_scripts.s");
const bug = source("src/battle_anim_bug.c");
const graphics = source("src/graphics.c");
const registry = source("src/data/battle_anim.h");
const constants = source("include/constants/battle_anim.h");
const sprite = source("src/sprite.c");

const moveBody = block(scripts, "Move_MEGAHORN:\n", "Move_GUST:\n");
const affine0 = block(
  bug,
  "static const union AffineAnimCmd sAffineAnim_MegahornHorn_0",
  "static const union AffineAnimCmd sAffineAnim_MegahornHorn_1",
);
const affine1 = block(
  bug,
  "static const union AffineAnimCmd sAffineAnim_MegahornHorn_1",
  "static const union AffineAnimCmd sAffineAnim_MegahornHorn_2",
);
const affine2 = block(
  bug,
  "static const union AffineAnimCmd sAffineAnim_MegahornHorn_2",
  "static const union AffineAnimCmd *const sAffineAnims_MegahornHorn",
);
const affineTable = block(
  bug,
  "static const union AffineAnimCmd *const sAffineAnims_MegahornHorn",
  "const struct SpriteTemplate gMegahornHornSpriteTemplate",
);
const template = block(
  bug,
  "const struct SpriteTemplate gMegahornHornSpriteTemplate",
  "static const union AffineAnimCmd sAffineAnim_LeechLifeNeedle_0",
);
const callback = functionBody(bug, "AnimMegahornHorn");
const graphicsEntries = block(
  graphics,
  "const u32 gBattleAnimSpriteGfx_HornHit2[]",
  "const u32 gBattleAnimSpriteGfx_AirWave2[]",
);
const registrySheet = "{gBattleAnimSpriteGfx_HornHit2, 0x0100, ANIM_TAG_HORN_HIT_2},";
const registryPalette = "{gBattleAnimSpritePal_HornHit2, ANIM_TAG_HORN_HIT_2},";
const registryEntries = registrySheet + "\n" + registryPalette;
const tagDefinition = "#define ANIM_TAG_HORN_HIT_2                 (ANIM_SPRITES_START + 153)";
const dummyAnimation = block(
  sprite,
  "static const union AnimCmd sDummyAnim = { ANIM_END };",
  "static const union AffineAnimCmd sDummyAffineAnim",
);

requireTokens("MOVE_MEGAHORN", moveBody, [
  "loadspritegfx ANIM_TAG_HORN_HIT_2",
  "create_megahorn_horn_sprite ANIM_ATTACKER, 3, x1=-42, y1=25, x2=0, y2=0, duration=6",
]);
requireTokens("Megahorn template", template, [
  ".tileTag = ANIM_TAG_HORN_HIT_2",
  ".paletteTag = ANIM_TAG_HORN_HIT_2",
  ".oam = &gOamData_AffineDouble_ObjNormal_32x16",
  ".anims = gDummySpriteAnimTable",
  ".images = NULL",
  ".affineAnims = sAffineAnims_MegahornHorn",
  ".callback = AnimMegahornHorn",
]);
requireTokens("Megahorn affine programs", affine0 + affine1 + affine2, [
  "AFFINEANIMCMD_FRAME(0x100, 0x100, 30, 0)",
  "AFFINEANIMCMD_FRAME(0x100, 0x100, -99, 0)",
  "AFFINEANIMCMD_FRAME(0x100, 0x100, 94, 0)",
  "AFFINEANIMCMD_END",
]);
requireTokens("Megahorn callback", callback, [
  "IsContest()",
  "StartSpriteAffineAnim(sprite, 2)",
  "GetBattlerSide(gBattleAnimTarget) == B_SIDE_PLAYER",
  "StartSpriteAffineAnim(sprite, 1)",
  "StartAnimLinearTranslation",
  "DestroyAnimSprite",
]);
requireTokens("Horn Hit 2 graphics", graphicsEntries, [
  "INCGFX_U32(\"graphics/battle_anims/sprites/horn_hit_2.png\", \".4bpp.lz\")",
  "INCGFX_U32(\"graphics/battle_anims/sprites/horn_hit_2.png\", \".gbapal.lz\")",
]);
requireTokens("Horn Hit 2 registry", registry, [registrySheet, registryPalette]);
requireTokens("Horn Hit 2 tag", constants, [
  "#define ANIM_SPRITES_START 10000",
  tagDefinition,
]);
requireTokens("dummy frame table", dummyAnimation, [
  "static const union AnimCmd sDummyAnim = { ANIM_END };",
  "const union AnimCmd *const gDummySpriteAnimTable[] = { &sDummyAnim };",
]);

const pngPath = join(
  reference,
  "graphics/battle_anims/sprites/horn_hit_2.png",
);
const png = readFileSync(pngPath);
const image = decodeIndexedPng(pngPath);
const sliced = sliceTiles(image);
if (image.width !== 32 || image.height !== 16
  || sliced.columns !== 4 || sliced.rows !== 2 || sliced.tiles.length !== 8
  || image.palette.length !== 16) {
  throw new Error("Horn Hit 2 PNG layout drifted");
}

const tileBytes = 0x0100;
if (sliced.tiles.length * 32 !== tileBytes) {
  throw new Error("Horn Hit 2 registry tile byte count drifted");
}

const asset = {
  schema: "mega-horn-horn-hit-2-source-assets/v1",
  source: {
    move: sourceIdentity("data/battle_anim_scripts.s", scripts, moveBody),
    template: sourceIdentity("src/battle_anim_bug.c", bug, template),
    callback: sourceIdentity("src/battle_anim_bug.c", bug, callback),
    affinePrograms: [
      sourceIdentity("src/battle_anim_bug.c", bug, affine0),
      sourceIdentity("src/battle_anim_bug.c", bug, affine1),
      sourceIdentity("src/battle_anim_bug.c", bug, affine2),
    ],
    affineTable: sourceIdentity("src/battle_anim_bug.c", bug, affineTable),
    graphics: sourceIdentity("src/graphics.c", graphics, graphicsEntries),
    registry: {
      path: "src/data/battle_anim.h",
      sheet: registrySheet,
      palette: registryPalette,
      sha256: sha256(registryEntries),
    },
    tag: {
      path: "include/constants/battle_anim.h",
      definition: tagDefinition,
      value: 10153,
    },
    png: {
      path: "graphics/battle_anims/sprites/horn_hit_2.png",
      sha256: sha256(png),
    },
    rom: {
      gameCode: "AGB-BPEE",
      image: "pokeemerald.gba",
      imageSha256: sha256(rom),
      symbols: {
        move: romIdentity("Move_MEGAHORN", "Move_GUST"),
        template: romIdentity("gMegahornHornSpriteTemplate"),
        callback: romIdentity("AnimMegahornHorn"),
        affineTable: romIdentity("sAffineAnims_MegahornHorn"),
        affinePrograms: [
          romIdentity("sAffineAnim_MegahornHorn_0"),
          romIdentity("sAffineAnim_MegahornHorn_1"),
          romIdentity("sAffineAnim_MegahornHorn_2"),
        ],
        oam: romIdentity("gOamData_AffineDouble_ObjNormal_32x16"),
        dummyAnimationTable: romIdentity("gDummySpriteAnimTable"),
        graphics: romIdentity("gBattleAnimSpriteGfx_HornHit2"),
        palette: romIdentity("gBattleAnimSpritePal_HornHit2"),
      },
    },
  },
  resource: {
    tag: "ANIM_TAG_HORN_HIT_2",
    tagValue: 10153,
    tileBytes,
    graphics: "gBattleAnimSpriteGfx_HornHit2",
    palette: "gBattleAnimSpritePal_HornHit2",
  },
  frameLayout: {
    spriteAnimationTable: "gDummySpriteAnimTable",
    kind: "static-default-frame",
    frames: [{
      index: 0,
      tileOffset: 0,
      tileCount: 8,
      width: 32,
      height: 16,
    }],
    tiles: {
      width: 8,
      height: 8,
      columns: sliced.columns,
      rows: sliced.rows,
      count: sliced.tiles.length,
      bytesPerTile: 32,
    },
  },
  template: {
    symbol: "gMegahornHornSpriteTemplate",
    tileTag: "ANIM_TAG_HORN_HIT_2",
    paletteTag: "ANIM_TAG_HORN_HIT_2",
    oam: {
      symbol: "gOamData_AffineDouble_ObjNormal_32x16",
      affineMode: "double",
      objMode: "objnormal",
      bpp: 4,
      shape: "32x16",
      priority: 2,
    },
    animations: "gDummySpriteAnimTable",
    images: null,
    callback: "AnimMegahornHorn",
    affine: {
      table: "sAffineAnims_MegahornHorn",
      selection: {
        defaultBattle: 0,
        targetPlayerSide: 1,
        contest: 2,
      },
      programs: [
        { index: 0, scaleX: 256, scaleY: 256, rotation: 30, duration: 0 },
        { index: 1, scaleX: 256, scaleY: 256, rotation: -99, duration: 0 },
        { index: 2, scaleX: 256, scaleY: 256, rotation: 94, duration: 0 },
      ],
    },
  },
  hornHit2: {
    dimensions: { width: image.width, height: image.height },
    tileset: {
      columns: sliced.columns,
      rows: sliced.rows,
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
    },
    palette: image.palette,
  },
};

const serialized = JSON.stringify(asset, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== serialized) {
    throw new Error("Megahorn Horn Hit 2 asset differs from pinned source: " + output);
  }
  console.log("Megahorn Horn Hit 2 asset matches authoritative sources");
  process.exit(0);
}
mkdirSync(resolve(output, ".."), { recursive: true });
writeFileSync(output, serialized);
console.log("wrote " + output);
