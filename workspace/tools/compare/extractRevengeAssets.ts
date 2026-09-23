/** Reproducible source/ELF/ROM extraction for MOVE_REVENGE's scratch sheets. */
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
const outFlag = process.argv.indexOf("--out");
const output = outFlag >= 0 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1]!)
  : join(root, "tools/compare/evidence/revenge-assets.json");
const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const hex = (value: number): string => `0x${value.toString(16).padStart(8, "0")}`;
const source = (path: string): string => readFileSync(join(reference, path), "utf8");

function block(text: string, startToken: string, endToken: string): string {
  const start = text.indexOf(startToken);
  const end = text.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`missing source block ${startToken}/${endToken}`);
  return text.slice(start, end);
}

function functionBody(text: string, name: string): string {
  const matcher = new RegExp(`\\b${name}\\s*\\(`, "gu");
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
  throw new Error(`missing function ${name}`);
}

function definition(text: string, token: string): string {
  const start = text.indexOf(token);
  if (start < 0) throw new Error(`missing source definition ${token}`);
  const open = text.indexOf("{", start);
  if (open < 0) throw new Error(`missing definition body ${token}`);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    else if (text[index] === "}" && --depth === 0) {
      const semicolon = text.indexOf(";", index);
      if (semicolon < 0) throw new Error(`missing definition terminator ${token}`);
      return text.slice(text.lastIndexOf("\n", start) + 1, semicolon + 1);
    }
  }
  throw new Error(`unterminated source definition ${token}`);
}

function sourceIdentity(path: string, text: string, body: string): SourceRecord {
  const start = text.indexOf(body);
  if (start < 0) throw new Error(`source body drifted for ${path}`);
  return { path, start, endExclusive: start + body.length, byteLength: Buffer.byteLength(body), sha256: sha256(body) };
}

function requireTokens(label: string, text: string, tokens: readonly string[]): void {
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${label} drifted: ${token}`);
}

const rom = readFileSync(join(reference, "pokeemerald.gba"));
const symbols = new Map<string, SymbolEntry>();
for (const line of execFileSync("arm-none-eabi-nm", ["-a", "-S", join(reference, "pokeemerald.elf")], {
  encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
}).split("\n")) {
  const fields = line.trim().split(/\s+/u);
  if (fields.length >= 4 && /^[0-9a-f]+$/iu.test(fields[0]!) && /^[0-9a-f]+$/iu.test(fields[1]!)) {
    symbols.set(fields.at(-1)!, { address: Number.parseInt(fields[0]!, 16), size: Number.parseInt(fields[1]!, 16) });
  } else if (fields.length === 3 && /^[0-9a-f]+$/iu.test(fields[0]!)) {
    symbols.set(fields[2]!, { address: Number.parseInt(fields[0]!, 16), size: 0 });
  }
}

function symbol(name: string): SymbolEntry {
  const value = symbols.get(name);
  if (!value) throw new Error(`missing ELF symbol ${name}`);
  return value;
}

function romIdentity(name: string, endName?: string) {
  const entry = symbol(name);
  const end = endName ? symbol(endName).address : entry.address + entry.size;
  if (entry.size === 0 && !endName) throw new Error(`zero-sized ELF symbol ${name}`);
  const bytes = rom.subarray(entry.address - 0x08000000, end - 0x08000000);
  return { symbol: name, start: hex(entry.address), endExclusive: hex(end), byteLength: end - entry.address, sha256: sha256(bytes) };
}

function romBytes(name: string): Buffer {
  const entry = symbol(name);
  if (entry.size === 0) throw new Error(`zero-sized ELF symbol ${name}`);
  return rom.subarray(entry.address - 0x08000000, entry.address - 0x08000000 + entry.size);
}

function decompressLz77(bytes: Uint8Array): { output: Buffer; streamByteLength: number } {
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
        for (let count = 0; count < length && output.length < targetLength; count += 1) output.push(output[sourceIndex + count]!);
      }
    }
  }
  return { output: Buffer.from(output), streamByteLength: offset };
}

function pack4bpp(tiles: readonly Tile[]): Buffer {
  const bytes = Buffer.alloc(tiles.length * 32);
  for (let tileIndex = 0; tileIndex < tiles.length; tileIndex += 1) {
    const pixels = tiles[tileIndex]!.pixels;
    for (let pixel = 0; pixel < pixels.length; pixel += 2) bytes[tileIndex * 32 + pixel / 2] = pixels[pixel]! | (pixels[pixel + 1]! << 4);
  }
  return bytes;
}

function packPalette(colors: readonly { r: number; g: number; b: number }[]): Buffer {
  if (colors.length !== 16) throw new Error("expected 16-color palette");
  const bytes = Buffer.alloc(32);
  colors.forEach((color, index) => bytes.writeUInt16LE(to5Bit(color.r) | (to5Bit(color.g) << 5) | (to5Bit(color.b) << 10), index * 2));
  return bytes;
}

function lz77Contract(symbolName: string, expected: Buffer) {
  const compressed = romBytes(symbolName);
  const decoded = decompressLz77(compressed);
  const padding = compressed.subarray(decoded.streamByteLength);
  if (!decoded.output.equals(expected)) throw new Error(`${symbolName} LZ77 output differs from indexed source layout`);
  if (padding.some((byte) => byte !== 0)) throw new Error(`${symbolName} has non-zero stream padding`);
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

function parseFrames(body: string) {
  return [...body.matchAll(/ANIMCMD_FRAME\(([^)]*)\)/gu)].map((match) => {
    const fields = match[1]!.split(",").map((field) => field.trim());
    return {
      tileOffset: Number.parseInt(fields[0]!, 0),
      duration: Number.parseInt(fields[1]!, 0),
      hFlip: fields.some((field) => field.includes(".hFlip = TRUE")),
      vFlip: fields.some((field) => field.includes(".vFlip = TRUE")),
    };
  });
}

const scripts = source("data/battle_anim_scripts.s");
const fight = source("src/battle_anim_fight.c");
const graphics = source("src/graphics.c");
const registry = source("src/data/battle_anim.h");
const constants = source("include/constants/battle_anim.h");
const sprite = source("src/sprite.c");
const moveBody = block(scripts, "Move_REVENGE:\n", "Move_POISON_FANG:\n");
const smallTemplate = block(fight, "const struct SpriteTemplate gRevengeSmallScratchSpriteTemplate", "static const union AnimCmd sAnim_RevengeBigScratch_0[]");
const bigTemplate = block(fight, "const struct SpriteTemplate gRevengeBigScratchSpriteTemplate", "static const union AffineAnimCmd sAffineAnim_FocusPunchFist[]");
const scratchCallback = functionBody(fight, "AnimRevengeScratch");
const smallAnimations = [0, 1, 2].map((index) => block(fight, `static const union AnimCmd sAnim_RevengeSmallScratch_${index}[]`, index === 2 ? "static const union AnimCmd *const sAnims_RevengeSmallScratch[]" : `static const union AnimCmd sAnim_RevengeSmallScratch_${index + 1}[]`));
const bigAnimations = [0, 1, 2].map((index) => block(fight, `static const union AnimCmd sAnim_RevengeBigScratch_${index}[]`, index === 2 ? "static const union AnimCmd *const sAnims_RevengeBigScratch[]" : `static const union AnimCmd sAnim_RevengeBigScratch_${index + 1}[]`));
const smallAnimationTable = block(fight, "static const union AnimCmd *const sAnims_RevengeSmallScratch[]", "const struct SpriteTemplate gRevengeSmallScratchSpriteTemplate");
const bigAnimationTable = block(fight, "static const union AnimCmd *const sAnims_RevengeBigScratch[]", "const struct SpriteTemplate gRevengeBigScratchSpriteTemplate");
const smallOam = definition(registry, "const struct OamData gOamData_AffineOff_ObjNormal_32x32");
const bigOam = definition(registry, "const struct OamData gOamData_AffineOff_ObjNormal_64x64");
const dummyAnimation = block(sprite, "static const union AnimCmd sDummyAnim = { ANIM_END };", "static const union AffineAnimCmd sDummyAffineAnim");

const declarations = {
  scratchGraphics: "const u32 gBattleAnimSpriteGfx_PurpleScratch[] = INCGFX_U32(\"graphics/battle_anims/sprites/purple_scratch.png\", \".4bpp.lz\");",
  scratchPalette: "const u32 gBattleAnimSpritePal_PurpleScratch[] = INCGFX_U32(\"graphics/battle_anims/sprites/purple_scratch.png\", \".gbapal.lz\");",
  swipeGraphics: "const u32 gBattleAnimSpriteGfx_PurpleSwipe[] = INCGFX_U32(\"graphics/battle_anims/sprites/purple_swipe.png\", \".4bpp.lz\");",
} as const;
const registryEntries = {
  scratch: { sheet: "{gBattleAnimSpriteGfx_PurpleScratch, 0x0600, ANIM_TAG_PURPLE_SCRATCH},", palette: "{gBattleAnimSpritePal_PurpleScratch, ANIM_TAG_PURPLE_SCRATCH}," },
  swipe: { sheet: "{gBattleAnimSpriteGfx_PurpleSwipe, 0x1000, ANIM_TAG_PURPLE_SWIPE},", palette: "{gBattleAnimSpritePal_PurpleScratch, ANIM_TAG_PURPLE_SWIPE}," },
} as const;
const tagDefinitions = {
  scratch: "#define ANIM_TAG_PURPLE_SCRATCH             (ANIM_SPRITES_START + 245)",
  swipe: "#define ANIM_TAG_PURPLE_SWIPE               (ANIM_SPRITES_START + 246)",
} as const;

requireTokens("MOVE_REVENGE", moveBody, ["loadspritegfx ANIM_TAG_PURPLE_SCRATCH", "loadspritegfx ANIM_TAG_PURPLE_SWIPE", "createsprite gRevengeSmallScratchSpriteTemplate", "createsprite gRevengeBigScratchSpriteTemplate"]);
requireTokens("small template", smallTemplate, [".tileTag = ANIM_TAG_PURPLE_SCRATCH", ".paletteTag = ANIM_TAG_PURPLE_SCRATCH", ".oam = &gOamData_AffineOff_ObjNormal_32x32", ".anims = sAnims_RevengeSmallScratch", ".images = NULL", ".affineAnims = gDummySpriteAffineAnimTable", ".callback = AnimRevengeScratch"]);
requireTokens("big template", bigTemplate, [".tileTag = ANIM_TAG_PURPLE_SWIPE", ".paletteTag = ANIM_TAG_PURPLE_SWIPE", ".oam = &gOamData_AffineOff_ObjNormal_64x64", ".anims = sAnims_RevengeBigScratch", ".images = NULL", ".affineAnims = gDummySpriteAffineAnimTable", ".callback = AnimRevengeScratch"]);
requireTokens("scratch callback", scratchCallback, ["InitSpritePosToAnimAttacker", "InitSpritePosToAnimTarget", "GetBattlerSide(gBattleAnimAttacker)", "StartSpriteAnim(sprite, 1)", "RunStoredCallbackWhenAnimEnds", "DestroyAnimSprite"]);
requireTokens("graphics", graphics, Object.values(declarations));
requireTokens("registry", registry, Object.values(registryEntries).flatMap((entry) => [entry.sheet, entry.palette]));
requireTokens("constants", constants, ["#define ANIM_SPRITES_START 10000", ...Object.values(tagDefinitions)]);
requireTokens("dummy animation", dummyAnimation, ["static const union AnimCmd sDummyAnim = { ANIM_END };", "const union AnimCmd *const gDummySpriteAnimTable[] = { &sDummyAnim };"]);

type ResourceName = "purpleScratch" | "purpleSwipe";
type ResourceSpec = { readonly name: ResourceName; readonly tag: string; readonly tagValue: number; readonly tileBytes: number; readonly imagePath: string; readonly palettePath: string; readonly graphicsSymbol: string; readonly paletteSymbol: string; readonly graphicsDeclaration: string; readonly paletteDeclaration: string; readonly registry: { sheet: string; palette: string }; readonly tagDefinition: string; readonly frameWidth: number; readonly frameHeight: number };
const resourceSpecs: readonly ResourceSpec[] = [
  { name: "purpleScratch", tag: "ANIM_TAG_PURPLE_SCRATCH", tagValue: 10245, tileBytes: 0x0600, imagePath: "graphics/battle_anims/sprites/purple_scratch.png", palettePath: "graphics/battle_anims/sprites/purple_scratch.png", graphicsSymbol: "gBattleAnimSpriteGfx_PurpleScratch", paletteSymbol: "gBattleAnimSpritePal_PurpleScratch", graphicsDeclaration: declarations.scratchGraphics, paletteDeclaration: declarations.scratchPalette, registry: registryEntries.scratch, tagDefinition: tagDefinitions.scratch, frameWidth: 32, frameHeight: 32 },
  { name: "purpleSwipe", tag: "ANIM_TAG_PURPLE_SWIPE", tagValue: 10246, tileBytes: 0x1000, imagePath: "graphics/battle_anims/sprites/purple_swipe.png", palettePath: "graphics/battle_anims/sprites/purple_scratch.png", graphicsSymbol: "gBattleAnimSpriteGfx_PurpleSwipe", paletteSymbol: "gBattleAnimSpritePal_PurpleScratch", graphicsDeclaration: declarations.swipeGraphics, paletteDeclaration: declarations.scratchPalette, registry: registryEntries.swipe, tagDefinition: tagDefinitions.swipe, frameWidth: 64, frameHeight: 64 },
];

function resource(spec: ResourceSpec, animationBodies: readonly string[]) {
  const imageFile = join(reference, spec.imagePath);
  const paletteFile = join(reference, spec.palettePath);
  const imageBytes = readFileSync(imageFile);
  const paletteBytes = readFileSync(paletteFile);
  const image = decodeIndexedPng(imageFile);
  const paletteImage = decodeIndexedPng(paletteFile);
  const sliced = sliceTiles(image);
  const gba4bpp = pack4bpp(sliced.tiles);
  const gbaPalette = packPalette(paletteImage.palette);
  if (image.bitDepth !== 4 || image.palette.length !== 16 || gba4bpp.length !== spec.tileBytes) throw new Error(`${spec.tag} source layout disagrees with registry allocation`);
  if (paletteImage.palette.length !== 16 || JSON.stringify(image.palette) !== JSON.stringify(paletteImage.palette)) throw new Error(`${spec.tag} image/palette source colors disagree`);
  if (image.width !== spec.frameWidth || image.height % spec.frameHeight !== 0) throw new Error(`${spec.tag} frame geometry changed`);
  const framesPerSheet = image.height / spec.frameHeight;
  const tilesPerFrame = spec.frameWidth / 8 * (spec.frameHeight / 8);
  if (framesPerSheet * tilesPerFrame !== sliced.tiles.length) throw new Error(`${spec.tag} frame/tile count mismatch`);
  return {
    tag: spec.tag,
    tagValue: spec.tagValue,
    tileBytes: spec.tileBytes,
    graphicsSymbol: spec.graphicsSymbol,
    paletteSymbol: spec.paletteSymbol,
    source: {
      graphicsDeclaration: sourceIdentity("src/graphics.c", graphics, spec.graphicsDeclaration + "\n"),
      paletteDeclaration: sourceIdentity("src/graphics.c", graphics, spec.paletteDeclaration + "\n"),
      registry: { path: "src/data/battle_anim.h", sheet: spec.registry.sheet, palette: spec.registry.palette, sha256: sha256(spec.registry.sheet + "\n" + spec.registry.palette) },
      tag: { path: "include/constants/battle_anim.h", definition: spec.tagDefinition, value: spec.tagValue },
      imagePng: { path: spec.imagePath, sha256: sha256(imageBytes) },
      palettePng: { path: spec.palettePath, sha256: sha256(paletteBytes), sameFileAsImage: spec.palettePath === spec.imagePath, imagePaletteMatchesAssignedPalette: JSON.stringify(image.palette) === JSON.stringify(paletteImage.palette) },
    },
    compression: { graphics: lz77Contract(spec.graphicsSymbol, gba4bpp), palette: lz77Contract(spec.paletteSymbol, gbaPalette) },
    layout: {
      png: { width: image.width, height: image.height, bitDepth: image.bitDepth, colorType: "indexed", paletteEntries: image.palette.length },
      tiles: { width: 8, height: 8, columns: sliced.columns, rows: sliced.rows, count: sliced.tiles.length, bytesPerTile: 32, subpalettes: [...new Set(sliced.tiles.map((tile) => tile.subpalette))], tileSubpalettes: sliced.tiles.map((tile) => tile.subpalette) },
      frames: Array.from({ length: framesPerSheet }, (_, index) => ({ index, tileOffset: index * tilesPerFrame, tileCount: tilesPerFrame, sourcePixels: { x: 0, y: index * spec.frameHeight, width: spec.frameWidth, height: spec.frameHeight } })),
      animations: animationBodies.map((body, index) => ({ index, frames: parseFrames(body) })),
    },
    art: { tiles: sliced.tiles.map((tile) => [...tile.pixels]), palette: paletteImage.palette },
  };
}

const resources = {
  purpleScratch: resource(resourceSpecs[0]!, smallAnimations),
  purpleSwipe: resource(resourceSpecs[1]!, bigAnimations),
};
const asset = {
  schema: "revenge-purple-scratch-swipe-source-assets/v1",
  source: {
    move: sourceIdentity("data/battle_anim_scripts.s", scripts, moveBody),
    templates: { small: sourceIdentity("src/battle_anim_fight.c", fight, smallTemplate), big: sourceIdentity("src/battle_anim_fight.c", fight, bigTemplate) },
    callbacks: { scratch: sourceIdentity("src/battle_anim_fight.c", fight, scratchCallback) },
    animations: {
      small: { table: sourceIdentity("src/battle_anim_fight.c", fight, smallAnimationTable), programs: smallAnimations.map((body) => sourceIdentity("src/battle_anim_fight.c", fight, body)) },
      big: { table: sourceIdentity("src/battle_anim_fight.c", fight, bigAnimationTable), programs: bigAnimations.map((body) => sourceIdentity("src/battle_anim_fight.c", fight, body)) },
    },
    oam: { small: sourceIdentity("src/data/battle_anim.h", registry, smallOam), big: sourceIdentity("src/data/battle_anim.h", registry, bigOam) },
    dummyAffineAnimationTable: "gDummySpriteAffineAnimTable",
    rom: {
      gameCode: "AGB-BPEE", image: "pokeemerald.gba", imageSha256: sha256(rom),
      symbols: {
        move: romIdentity("Move_REVENGE", "Move_POISON_FANG"),
        templates: { small: romIdentity("gRevengeSmallScratchSpriteTemplate"), big: romIdentity("gRevengeBigScratchSpriteTemplate") },
        callbacks: { scratch: romIdentity("AnimRevengeScratch") },
        animations: {
          small: { table: romIdentity("sAnims_RevengeSmallScratch"), programs: [0, 1, 2].map((index) => romIdentity(`sAnim_RevengeSmallScratch_${index}`)) },
          big: { table: romIdentity("sAnims_RevengeBigScratch"), programs: [0, 1, 2].map((index) => romIdentity(`sAnim_RevengeBigScratch_${index}`)) },
        },
        oam: { small: romIdentity("gOamData_AffineOff_ObjNormal_32x32"), big: romIdentity("gOamData_AffineOff_ObjNormal_64x64") },
        dummyAnimationTable: romIdentity("gDummySpriteAnimTable"), dummyAffineAnimationTable: romIdentity("gDummySpriteAffineAnimTable"),
        graphics: { scratch: romIdentity("gBattleAnimSpriteGfx_PurpleScratch"), swipe: romIdentity("gBattleAnimSpriteGfx_PurpleSwipe") },
        palette: romIdentity("gBattleAnimSpritePal_PurpleScratch"),
      },
    },
  },
  templates: {
    small: { symbol: "gRevengeSmallScratchSpriteTemplate", tileTag: "ANIM_TAG_PURPLE_SCRATCH", paletteTag: "ANIM_TAG_PURPLE_SCRATCH", oam: { symbol: "gOamData_AffineOff_ObjNormal_32x32", affineMode: "off", objMode: "normal", bpp: 4, shape: "32x32", priority: 2 }, animations: "sAnims_RevengeSmallScratch", images: null, affine: "gDummySpriteAffineAnimTable", callback: "AnimRevengeScratch" },
    big: { symbol: "gRevengeBigScratchSpriteTemplate", tileTag: "ANIM_TAG_PURPLE_SWIPE", paletteTag: "ANIM_TAG_PURPLE_SWIPE", oam: { symbol: "gOamData_AffineOff_ObjNormal_64x64", affineMode: "off", objMode: "normal", bpp: 4, shape: "64x64", priority: 2 }, animations: "sAnims_RevengeBigScratch", images: null, affine: "gDummySpriteAffineAnimTable", callback: "AnimRevengeScratch" },
  },
  resources,
  controls: { move: "MOVE_REVENGE", status: "unsupported-source-asset-checkpoint", coverageCredit: false, componentTrack: "revenge-purple-scratch-persist-hit", componentTrackFulfilled: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, siblingOrSharedCredit: false },
};

const serialized = JSON.stringify(asset, null, 2) + "\n";
const productionFlag = process.argv.indexOf("--production-out");
const productionOutput = productionFlag >= 0 && process.argv[productionFlag + 1]
  ? resolve(process.argv[productionFlag + 1]!)
  : null;
if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== serialized) throw new Error(`Revenge scratch asset differs from pinned source: ${output}`);
  console.log("Revenge scratch asset matches authoritative source PNGs, ELF, and ROM");
} else {
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, serialized);
  console.log(`wrote ${output}`);
}
if (productionOutput) {
  const productionAsset = {
    schema: "revenge-purple-scratch-swipe-production-assets/v1",
    sourceReceipt: "tools/compare/evidence/revenge-assets.json",
    purpleScratch: { columns: resources.purpleScratch.layout.tiles.columns,
      rows: resources.purpleScratch.layout.tiles.rows, ...resources.purpleScratch.art },
    purpleSwipe: { columns: resources.purpleSwipe.layout.tiles.columns,
      rows: resources.purpleSwipe.layout.tiles.rows, ...resources.purpleSwipe.art },
  };
  mkdirSync(resolve(productionOutput, ".."), { recursive: true });
  writeFileSync(productionOutput, JSON.stringify(productionAsset) + "\n");
  console.log(`wrote ${productionOutput}`);
}
