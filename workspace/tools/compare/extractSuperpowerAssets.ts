/** Reproducible production-asset extraction for MOVE_SUPERPOWER's orb, rock, and fireball. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decodeIndexedPng } from "../extract/indexedPng.ts";
import { to5Bit } from "../extract/gbaColor.ts";
import { sliceTiles, type Tile } from "../extract/tiles.ts";

type SymbolEntry = { address: number; size: number };
type SourceRecord = {
  readonly path: string;
  readonly start: number;
  readonly endExclusive: number;
  readonly byteLength: number;
  readonly sha256: string;
};

const root = resolve(import.meta.dirname, "../..");
const reference = join(root, "reference/pokeemerald");
const outputFlag = process.argv.indexOf("--out");
const output = outputFlag >= 0 && process.argv[outputFlag + 1]
  ? resolve(process.argv[outputFlag + 1]!)
  : join(root, "src/animation/assets/superpower-rock-orb-fire.json");
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

function definition(text: string, token: string): string {
  const tokenStart = text.indexOf(token);
  if (tokenStart < 0) throw new Error("missing source definition " + token);
  const open = text.indexOf("{", tokenStart);
  if (open < 0) throw new Error("missing definition body " + token);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    else if (text[index] === "}" && --depth === 0) {
      const semicolon = text.indexOf(";", index);
      if (semicolon < 0) throw new Error("missing definition terminator " + token);
      return text.slice(text.lastIndexOf("\n", tokenStart) + 1, semicolon + 1);
    }
  }
  throw new Error("unterminated source definition " + token);
}

function sourceIdentity(path: string, text: string, body: string): SourceRecord {
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

function symbol(name: string): SymbolEntry {
  const entry = symbols.get(name);
  if (!entry) throw new Error("missing ELF symbol " + name);
  return entry;
}

function romIdentity(name: string, endName?: string) {
  const entry = symbol(name);
  const endEntry = endName ? symbol(endName) : undefined;
  if ((!endName && entry.size === 0) || (endName && !endEntry)) {
    throw new Error("missing ELF symbol range " + name);
  }
  const endAddress = endEntry ? endEntry.address : entry.address + entry.size;
  const bytes = rom.subarray(entry.address - 0x08000000, endAddress - 0x08000000);
  return {
    symbol: name,
    start: hex(entry.address),
    endExclusive: hex(endAddress),
    byteLength: endAddress - entry.address,
    sha256: sha256(bytes),
  };
}

function romBytes(name: string): Buffer {
  const entry = symbol(name);
  if (entry.size === 0) throw new Error("zero-sized ELF symbol " + name);
  return rom.subarray(entry.address - 0x08000000, entry.address - 0x08000000 + entry.size);
}

function decompressLz77(bytes: Uint8Array): { readonly output: Buffer; readonly streamByteLength: number } {
  if (bytes[0] !== 0x10) throw new Error("expected GBA LZ77 type 0x10");
  const targetLength = bytes[1]! | (bytes[2]! << 8) | (bytes[3]! << 16);
  const output: number[] = [];
  let offset = 4;
  while (output.length < targetLength) {
    if (offset >= bytes.length) throw new Error("truncated GBA LZ77 flags");
    const flags = bytes[offset++]!;
    for (let bit = 7; bit >= 0 && output.length < targetLength; bit -= 1) {
      if ((flags & (1 << bit)) === 0) {
        if (offset >= bytes.length) throw new Error("truncated GBA LZ77 literal");
        output.push(bytes[offset++]!);
      } else {
        if (offset + 1 >= bytes.length) throw new Error("truncated GBA LZ77 copy");
        const first = bytes[offset++]!;
        const second = bytes[offset++]!;
        const length = (first >> 4) + 3;
        const distance = ((first & 0xf) << 8) | second;
        const sourceIndex = output.length - distance - 1;
        if (sourceIndex < 0) throw new Error("invalid GBA LZ77 back-reference");
        for (let count = 0; count < length && output.length < targetLength; count += 1) {
          output.push(output[sourceIndex + count]!);
        }
      }
    }
  }
  return { output: Buffer.from(output), streamByteLength: offset };
}

function pack4bpp(tiles: readonly Tile[]): Buffer {
  const bytes = Buffer.alloc(tiles.length * 32);
  for (let tileIndex = 0; tileIndex < tiles.length; tileIndex += 1) {
    const pixels = tiles[tileIndex]!.pixels;
    for (let pixel = 0; pixel < pixels.length; pixel += 2) {
      const low = pixels[pixel]!;
      const high = pixels[pixel + 1]!;
      if (low > 0xf || high > 0xf) throw new Error("indexed pixel escaped 4bpp");
      bytes[tileIndex * 32 + pixel / 2] = low | (high << 4);
    }
  }
  return bytes;
}

function packPalette(colors: readonly { readonly r: number; readonly g: number; readonly b: number }[]): Buffer {
  if (colors.length !== 16) throw new Error("expected 16-color OBJ palette");
  const bytes = Buffer.alloc(32);
  colors.forEach((color, index) => {
    const bgr555 = to5Bit(color.r) | (to5Bit(color.g) << 5) | (to5Bit(color.b) << 10);
    bytes.writeUInt16LE(bgr555, index * 2);
  });
  return bytes;
}

function lz77Contract(symbolName: string, expected: Buffer) {
  const compressed = romBytes(symbolName);
  const decoded = decompressLz77(compressed);
  const padding = compressed.subarray(decoded.streamByteLength);
  if (!decoded.output.equals(expected)) {
    throw new Error(symbolName + " LZ77 output no longer matches indexed source layout");
  }
  if (padding.some((byte) => byte !== 0)) {
    throw new Error(symbolName + " has non-zero bytes after its LZ77 stream");
  }
  return {
    format: "GBA-LZ77-0x10",
    rom: romIdentity(symbolName),
    streamByteLength: decoded.streamByteLength,
    alignmentPaddingByteLength: padding.length,
    decompressedByteLength: decoded.output.length,
    decompressedSha256: sha256(decoded.output),
    indexedSourceSha256: sha256(expected),
    decodedMatchesIndexedSource: true,
  };
}

const scripts = source("data/battle_anim_scripts.s");
const fight = source("src/battle_anim_fight.c");
const graphics = source("src/graphics.c");
const registry = source("src/data/battle_anim.h");
const constants = source("include/constants/battle_anim.h");
const sprite = source("src/sprite.c");

const moveBody = block(scripts, "Move_SUPERPOWER:\n", "Move_RECYCLE:\n");
const affineProgram = block(
  fight,
  "static const union AffineAnimCmd sAffineAnim_SuperpowerOrb[]",
  "static const union AffineAnimCmd *const sAffineAnims_SuperpowerOrb[]",
);
const affineTable = block(
  fight,
  "static const union AffineAnimCmd *const sAffineAnims_SuperpowerOrb[]",
  "const struct SpriteTemplate gSuperpowerOrbSpriteTemplate",
);
const orbTemplate = block(
  fight,
  "const struct SpriteTemplate gSuperpowerOrbSpriteTemplate",
  "const struct SpriteTemplate gSuperpowerRockSpriteTemplate",
);
const rockTemplate = block(
  fight,
  "const struct SpriteTemplate gSuperpowerRockSpriteTemplate",
  "const struct SpriteTemplate gSuperpowerFireballSpriteTemplate",
);
const fireballTemplate = block(
  fight,
  "const struct SpriteTemplate gSuperpowerFireballSpriteTemplate",
  "const struct SpriteTemplate gArmThrustHandSpriteTemplate",
);
const orbCallback = functionBody(fight, "AnimSuperpowerOrb");
const orbStep = functionBody(fight, "AnimSuperpowerOrb_Step");
const rockCallback = functionBody(fight, "AnimSuperpowerRock");
const rockStep1 = functionBody(fight, "AnimSuperpowerRock_Step1");
const rockStep2 = functionBody(fight, "AnimSuperpowerRock_Step2");
const fireballCallback = functionBody(fight, "AnimSuperpowerFireball");
const dummyAnimation = block(
  sprite,
  "static const union AnimCmd sDummyAnim = { ANIM_END };",
  "static const union AffineAnimCmd sDummyAffineAnim",
);
const orbOam = definition(registry, "const struct OamData gOamData_AffineDouble_ObjBlend_64x64");
const rockOam = definition(registry, "const struct OamData gOamData_AffineOff_ObjNormal_16x16");
const fireballOam = definition(registry, "const struct OamData gOamData_AffineOff_ObjNormal_64x64");

const declarations = {
  circleOfLightGraphics: "const u32 gBattleAnimSpriteGfx_CircleOfLight[] = INCGFX_U32(\"graphics/battle_anims/sprites/circle_of_light.png\", \".4bpp.lz\");",
  electricOrbsPalette: "const u32 gBattleAnimSpritePal_ElectricOrbs[] = INCGFX_U32(\"graphics/battle_anims/sprites/electric_orbs.png\", \".gbapal.lz\");",
  meteorGraphics: "const u32 gBattleAnimSpriteGfx_Meteor[] = INCGFX_U32(\"graphics/battle_anims/sprites/meteor.png\", \".4bpp.lz\");",
  meteorPalette: "const u32 gBattleAnimSpritePal_Meteor[] = INCGFX_U32(\"graphics/battle_anims/sprites/meteor.png\", \".gbapal.lz\");",
  flatRockGraphics: "const u32 gBattleAnimSpriteGfx_FlatRock[] = INCGFX_U32(\"graphics/battle_anims/sprites/flat_rock.png\", \".4bpp.lz\");",
  flatRockPalette: "const u32 gBattleAnimSpritePal_FlatRock[] = INCGFX_U32(\"graphics/battle_anims/sprites/flat_rock.png\", \".gbapal.lz\");",
} as const;
const registryEntries = {
  circleOfLight: {
    sheet: "{gBattleAnimSpriteGfx_CircleOfLight, 0x0800, ANIM_TAG_CIRCLE_OF_LIGHT},",
    palette: "{gBattleAnimSpritePal_ElectricOrbs, ANIM_TAG_CIRCLE_OF_LIGHT},",
  },
  meteor: {
    sheet: "{gBattleAnimSpriteGfx_Meteor, 0x0800, ANIM_TAG_METEOR},",
    palette: "{gBattleAnimSpritePal_Meteor, ANIM_TAG_METEOR},",
  },
  flatRock: {
    sheet: "{gBattleAnimSpriteGfx_FlatRock, 0x0280, ANIM_TAG_FLAT_ROCK},",
    palette: "{gBattleAnimSpritePal_FlatRock, ANIM_TAG_FLAT_ROCK},",
  },
} as const;
const tagDefinitions = {
  circleOfLight: "#define ANIM_TAG_CIRCLE_OF_LIGHT            (ANIM_SPRITES_START + 212)",
  meteor: "#define ANIM_TAG_METEOR                     (ANIM_SPRITES_START + 256)",
  flatRock: "#define ANIM_TAG_FLAT_ROCK                  (ANIM_SPRITES_START + 257)",
} as const;

requireTokens("MOVE_SUPERPOWER", moveBody, [
  "loadspritegfx ANIM_TAG_CIRCLE_OF_LIGHT",
  "loadspritegfx ANIM_TAG_METEOR",
  "loadspritegfx ANIM_TAG_FLAT_ROCK",
  "createsprite gSuperpowerOrbSpriteTemplate, ANIM_TARGET, 2, ANIM_ATTACKER",
  "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 200, 96, 1, 120",
  "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 20, 248, 4, 112",
  "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 130, 160, 2, 104",
  "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 160, 192, 0, 96",
  "createsprite gSuperpowerRockSpriteTemplate, ANIM_ATTACKER, 41, 60, 288, 3, 88",
  "createsprite gSuperpowerFireballSpriteTemplate, ANIM_TARGET, 3, ANIM_ATTACKER",
]);
requireTokens("Superpower orb template", orbTemplate, [
  ".tileTag = ANIM_TAG_CIRCLE_OF_LIGHT",
  ".paletteTag = ANIM_TAG_CIRCLE_OF_LIGHT",
  ".oam = &gOamData_AffineDouble_ObjBlend_64x64",
  ".anims = gDummySpriteAnimTable",
  ".images = NULL",
  ".affineAnims = sAffineAnims_SuperpowerOrb",
  ".callback = AnimSuperpowerOrb",
]);
requireTokens("Superpower rock template", rockTemplate, [
  ".tileTag = ANIM_TAG_FLAT_ROCK",
  ".paletteTag = ANIM_TAG_FLAT_ROCK",
  ".oam = &gOamData_AffineOff_ObjNormal_16x16",
  ".anims = gDummySpriteAnimTable",
  ".images = NULL",
  ".affineAnims = gDummySpriteAffineAnimTable",
  ".callback = AnimSuperpowerRock",
]);
requireTokens("Superpower fireball template", fireballTemplate, [
  ".tileTag = ANIM_TAG_METEOR",
  ".paletteTag = ANIM_TAG_METEOR",
  ".oam = &gOamData_AffineOff_ObjNormal_64x64",
  ".anims = gDummySpriteAnimTable",
  ".images = NULL",
  ".affineAnims = gDummySpriteAffineAnimTable",
  ".callback = AnimSuperpowerFireball",
]);
requireTokens("Superpower orb affine program", affineProgram, [
  "AFFINEANIMCMD_FRAME(0x20, 0x20, 0, 0)",
  "AFFINEANIMCMD_FRAME(0x4, 0x4, 0, 64)",
  "AFFINEANIMCMD_FRAME(0xFFFA, 0xFFFA, 0, 8)",
  "AFFINEANIMCMD_FRAME(0x6, 0x6, 0, 8)",
  "AFFINEANIMCMD_JUMP(2)",
]);
requireTokens("Superpower rock callback", rockCallback, [
  "sprite->y = 120",
  "sprite->oam.tileNum += gBattleAnimArgs[2] * 4",
  "AnimSuperpowerRock_Step1",
]);
requireTokens("Superpower rock followups", rockStep1 + rockStep2, [
  "sprite->y < -8",
  "sprite->data[2] += sprite->data[0]",
  "edgeX > 256",
  "DestroyAnimSprite",
]);
requireTokens("Superpower fireball callback", fireballCallback, [
  "ST_OAM_HFLIP",
  "ST_OAM_VFLIP",
  "InitAnimLinearTranslation",
  "DestroyAnimSprite",
]);
requireTokens("Superpower graphics declarations", graphics, Object.values(declarations));
requireTokens("Superpower tag registry", registry, Object.values(registryEntries).flatMap((entry) => [entry.sheet, entry.palette]));
requireTokens("Superpower tag constants", constants, [
  "#define ANIM_SPRITES_START 10000",
  ...Object.values(tagDefinitions),
]);
requireTokens("dummy animation tables", dummyAnimation, [
  "static const union AnimCmd sDummyAnim = { ANIM_END };",
  "const union AnimCmd *const gDummySpriteAnimTable[] = { &sDummyAnim };",
]);

type ResourceName = "circleOfLight" | "meteor" | "flatRock";
type ResourceSpec = {
  readonly name: ResourceName;
  readonly tag: string;
  readonly tagValue: number;
  readonly tileBytes: number;
  readonly imagePath: string;
  readonly palettePath: string;
  readonly graphicsSymbol: string;
  readonly paletteSymbol: string;
  readonly graphicsDeclaration: string;
  readonly paletteDeclaration: string;
};

const resourceSpecs: readonly ResourceSpec[] = [
  {
    name: "circleOfLight",
    tag: "ANIM_TAG_CIRCLE_OF_LIGHT",
    tagValue: 10212,
    tileBytes: 0x0800,
    imagePath: "graphics/battle_anims/sprites/circle_of_light.png",
    palettePath: "graphics/battle_anims/sprites/electric_orbs.png",
    graphicsSymbol: "gBattleAnimSpriteGfx_CircleOfLight",
    paletteSymbol: "gBattleAnimSpritePal_ElectricOrbs",
    graphicsDeclaration: declarations.circleOfLightGraphics,
    paletteDeclaration: declarations.electricOrbsPalette,
  },
  {
    name: "meteor",
    tag: "ANIM_TAG_METEOR",
    tagValue: 10256,
    tileBytes: 0x0800,
    imagePath: "graphics/battle_anims/sprites/meteor.png",
    palettePath: "graphics/battle_anims/sprites/meteor.png",
    graphicsSymbol: "gBattleAnimSpriteGfx_Meteor",
    paletteSymbol: "gBattleAnimSpritePal_Meteor",
    graphicsDeclaration: declarations.meteorGraphics,
    paletteDeclaration: declarations.meteorPalette,
  },
  {
    name: "flatRock",
    tag: "ANIM_TAG_FLAT_ROCK",
    tagValue: 10257,
    tileBytes: 0x0280,
    imagePath: "graphics/battle_anims/sprites/flat_rock.png",
    palettePath: "graphics/battle_anims/sprites/flat_rock.png",
    graphicsSymbol: "gBattleAnimSpriteGfx_FlatRock",
    paletteSymbol: "gBattleAnimSpritePal_FlatRock",
    graphicsDeclaration: declarations.flatRockGraphics,
    paletteDeclaration: declarations.flatRockPalette,
  },
];

function resource(spec: ResourceSpec) {
  const imageFile = join(reference, spec.imagePath);
  const paletteFile = join(reference, spec.palettePath);
  const imageBytes = readFileSync(imageFile);
  const paletteBytes = readFileSync(paletteFile);
  const image = decodeIndexedPng(imageFile);
  const paletteImage = decodeIndexedPng(paletteFile);
  const sliced = sliceTiles(image);
  const gba4bpp = pack4bpp(sliced.tiles);
  const gbaPalette = packPalette(paletteImage.palette);
  if (gba4bpp.length !== spec.tileBytes || sliced.tiles.length * 32 !== spec.tileBytes) {
    throw new Error(spec.tag + " registry allocation disagrees with its 4bpp tile layout");
  }
  if (image.bitDepth !== 4 || image.palette.length !== 16 || paletteImage.palette.length !== 16) {
    throw new Error(spec.tag + " is not a 16-color indexed source asset");
  }
  const registryEntry = registryEntries[spec.name];
  const tagDefinition = tagDefinitions[spec.name];
  const variants = spec.name === "flatRock"
    ? Array.from({ length: 5 }, (_, index) => ({
      args2: index,
      tileOffset: index * 4,
      tileCount: 4,
      sourcePixels: { x: 0, y: index * 16, width: 16, height: 16 },
    }))
    : [{
      index: 0,
      tileOffset: 0,
      tileCount: sliced.tiles.length,
      sourcePixels: { x: 0, y: 0, width: image.width, height: image.height },
    }];
  return {
    tag: spec.tag,
    tagValue: spec.tagValue,
    tileBytes: spec.tileBytes,
    graphicsSymbol: spec.graphicsSymbol,
    paletteSymbol: spec.paletteSymbol,
    source: {
      graphicsDeclaration: sourceIdentity("src/graphics.c", graphics, spec.graphicsDeclaration + "\n"),
      paletteDeclaration: sourceIdentity("src/graphics.c", graphics, spec.paletteDeclaration + "\n"),
      registry: {
        path: "src/data/battle_anim.h",
        sheet: registryEntry.sheet,
        palette: registryEntry.palette,
        sha256: sha256(registryEntry.sheet + "\n" + registryEntry.palette),
      },
      tag: {
        path: "include/constants/battle_anim.h",
        definition: tagDefinition,
        value: spec.tagValue,
      },
      imagePng: {
        path: spec.imagePath,
        sha256: sha256(imageBytes),
      },
      palettePng: {
        path: spec.palettePath,
        sha256: sha256(paletteBytes),
        sameFileAsImage: spec.imagePath === spec.palettePath,
        imagePaletteMatchesAssignedPalette: JSON.stringify(image.palette) === JSON.stringify(paletteImage.palette),
      },
    },
    compression: {
      graphics: lz77Contract(spec.graphicsSymbol, gba4bpp),
      palette: lz77Contract(spec.paletteSymbol, gbaPalette),
    },
    layout: {
      png: {
        width: image.width,
        height: image.height,
        bitDepth: image.bitDepth,
        colorType: "indexed",
        paletteEntries: image.palette.length,
      },
      tiles: {
        width: 8,
        height: 8,
        columns: sliced.columns,
        rows: sliced.rows,
        count: sliced.tiles.length,
        bytesPerTile: 32,
        subpalettes: [...new Set(sliced.tiles.map((tile) => tile.subpalette))],
        tileSubpalettes: sliced.tiles.map((tile) => tile.subpalette),
      },
      variants,
    },
    art: {
      tiles: sliced.tiles.map((tile) => [...tile.pixels]),
      palette: paletteImage.palette,
    },
  };
}

const resources = Object.fromEntries(resourceSpecs.map((spec) => [spec.name, resource(spec)])) as Record<ResourceName, ReturnType<typeof resource>>;

const asset = {
  schema: "superpower-rock-orb-fire-source-assets/v1",
  source: {
    move: sourceIdentity("data/battle_anim_scripts.s", scripts, moveBody),
    templates: {
      orb: sourceIdentity("src/battle_anim_fight.c", fight, orbTemplate),
      rock: sourceIdentity("src/battle_anim_fight.c", fight, rockTemplate),
      fireball: sourceIdentity("src/battle_anim_fight.c", fight, fireballTemplate),
    },
    callbacks: {
      orb: sourceIdentity("src/battle_anim_fight.c", fight, orbCallback),
      orbStep: sourceIdentity("src/battle_anim_fight.c", fight, orbStep),
      rock: sourceIdentity("src/battle_anim_fight.c", fight, rockCallback),
      rockStep1: sourceIdentity("src/battle_anim_fight.c", fight, rockStep1),
      rockStep2: sourceIdentity("src/battle_anim_fight.c", fight, rockStep2),
      fireball: sourceIdentity("src/battle_anim_fight.c", fight, fireballCallback),
    },
    affine: {
      program: sourceIdentity("src/battle_anim_fight.c", fight, affineProgram),
      table: sourceIdentity("src/battle_anim_fight.c", fight, affineTable),
    },
    oam: {
      orb: sourceIdentity("src/data/battle_anim.h", registry, orbOam),
      rock: sourceIdentity("src/data/battle_anim.h", registry, rockOam),
      fireball: sourceIdentity("src/data/battle_anim.h", registry, fireballOam),
    },
    dummyAnimation: sourceIdentity("src/sprite.c", sprite, dummyAnimation),
    rom: {
      gameCode: "AGB-BPEE",
      image: "pokeemerald.gba",
      imageSha256: sha256(rom),
      symbols: {
        move: romIdentity("Move_SUPERPOWER", "Move_RECYCLE"),
        templates: {
          orb: romIdentity("gSuperpowerOrbSpriteTemplate"),
          rock: romIdentity("gSuperpowerRockSpriteTemplate"),
          fireball: romIdentity("gSuperpowerFireballSpriteTemplate"),
        },
        callbacks: {
          orb: romIdentity("AnimSuperpowerOrb"),
          orbStep: romIdentity("AnimSuperpowerOrb_Step"),
          rock: romIdentity("AnimSuperpowerRock"),
          rockStep1: romIdentity("AnimSuperpowerRock_Step1"),
          rockStep2: romIdentity("AnimSuperpowerRock_Step2"),
          fireball: romIdentity("AnimSuperpowerFireball"),
        },
        affine: {
          program: romIdentity("sAffineAnim_SuperpowerOrb"),
          table: romIdentity("sAffineAnims_SuperpowerOrb"),
        },
        oam: {
          orb: romIdentity("gOamData_AffineDouble_ObjBlend_64x64"),
          rock: romIdentity("gOamData_AffineOff_ObjNormal_16x16"),
          fireball: romIdentity("gOamData_AffineOff_ObjNormal_64x64"),
        },
        dummyAnimationTable: romIdentity("gDummySpriteAnimTable"),
        dummyAffineAnimationTable: romIdentity("gDummySpriteAffineAnimTable"),
      },
    },
  },
  templates: {
    orb: {
      symbol: "gSuperpowerOrbSpriteTemplate",
      tileTag: "ANIM_TAG_CIRCLE_OF_LIGHT",
      paletteTag: "ANIM_TAG_CIRCLE_OF_LIGHT",
      oam: {
        symbol: "gOamData_AffineDouble_ObjBlend_64x64",
        affineMode: "double",
        objMode: "blend",
        bpp: 4,
        shape: "64x64",
        priority: 2,
      },
      animations: "gDummySpriteAnimTable",
      images: null,
      affine: {
        table: "sAffineAnims_SuperpowerOrb",
        programs: [{
          index: 0,
          commands: [
            { scaleX: 32, scaleY: 32, rotation: 0, duration: 0 },
            { scaleX: 4, scaleY: 4, rotation: 0, duration: 64 },
            { scaleX: -6, scaleY: -6, rotation: 0, duration: 8 },
            { scaleX: 6, scaleY: 6, rotation: 0, duration: 8 },
            { jumpToCommand: 2 },
          ],
        }],
      },
      callback: "AnimSuperpowerOrb",
    },
    rock: {
      symbol: "gSuperpowerRockSpriteTemplate",
      tileTag: "ANIM_TAG_FLAT_ROCK",
      paletteTag: "ANIM_TAG_FLAT_ROCK",
      oam: {
        symbol: "gOamData_AffineOff_ObjNormal_16x16",
        affineMode: "off",
        objMode: "normal",
        bpp: 4,
        shape: "16x16",
        priority: 2,
      },
      animations: "gDummySpriteAnimTable",
      images: null,
      affine: "gDummySpriteAffineAnimTable",
      callback: "AnimSuperpowerRock",
      tileSelection: "gBattleAnimArgs[2] * 4",
      fiveVariants: true,
    },
    fireball: {
      symbol: "gSuperpowerFireballSpriteTemplate",
      tileTag: "ANIM_TAG_METEOR",
      paletteTag: "ANIM_TAG_METEOR",
      oam: {
        symbol: "gOamData_AffineOff_ObjNormal_64x64",
        affineMode: "off",
        objMode: "normal",
        bpp: 4,
        shape: "64x64",
        priority: 2,
      },
      animations: "gDummySpriteAnimTable",
      images: null,
      affine: "gDummySpriteAffineAnimTable",
      callback: "AnimSuperpowerFireball",
    },
  },
  resources,
  controls: {
    move: "MOVE_SUPERPOWER",
    status: "staged",
    coverageCredit: false,
    componentTrack: "superpower-rock-orb-fire",
    componentTrackFulfilled: false,
    reducerAdded: false,
    typedSeamAdded: false,
    compositorAdded: false,
    actualCoreFramebufferAcceptance: false,
    siblingOrSharedCredit: false,
  },
};

const serialized = JSON.stringify(asset, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== serialized) {
    throw new Error("Superpower rock/orb/fire asset differs from pinned source: " + output);
  }
  console.log("Superpower rock/orb/fire asset matches authoritative sources");
  process.exit(0);
}
mkdirSync(resolve(output, ".."), { recursive: true });
writeFileSync(output, serialized);
console.log("wrote " + output);
