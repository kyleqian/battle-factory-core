import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// This is an extraction-time audit.  Nothing in the production renderer imports
// this file or the pinned ROM; the output is a reviewable source/component
// checkpoint for the still-unsupported move.
const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const scriptPath = resolve(sourceRoot, "data/battle_anim_scripts.s");
const scriptSource = readFileSync(scriptPath, "utf8");
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

function scriptBody(label: string, nextLabel: string): {
  readonly text: string;
  readonly start: number;
  readonly endExclusive: number;
} {
  const start = scriptSource.indexOf(`${label}:`);
  const end = scriptSource.indexOf(`${nextLabel}:`, start + 1);
  if (start < 0 || end < 0) throw new Error(`missing script interval ${label}`);
  return { text: scriptSource.slice(start, end), start, endExclusive: end };
}

function commands(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/@.*$/, "").trim())
    .filter((line) => line.length > 0 && !/^[A-Za-z_][A-Za-z0-9_]*:$/.test(line));
}

const expectedRootCommands = [
  "loadspritegfx ANIM_TAG_TRI_ATTACK_TRIANGLE",
  "createsprite gTriAttackTriangleSpriteTemplate, ANIM_TARGET, 2, 16, 0",
  "playsewithpan SE_M_TRI_ATTACK, SOUND_PAN_ATTACKER",
  "delay 20",
  "playsewithpan SE_M_TRI_ATTACK, SOUND_PAN_ATTACKER",
  "delay 20",
  "createsoundtask SoundTask_LoopSEAdjustPanning, SE_M_TRI_ATTACK, SOUND_PAN_ATTACKER, SOUND_PAN_TARGET, 5, 6, 0, 7",
  "waitforvisualfinish",
  "simple_palette_blend selector=F_PAL_BG, delay=2, initial_blend_y=0, target_blend_y=16, color=RGB_BLACK",
  "delay 16",
  "loadspritegfx ANIM_TAG_FIRE",
  "createsprite gLargeFlameScatterSpriteTemplate, ANIM_TARGET, 2, 0, 0, 30, 30, -1, 0",
  "playsewithpan SE_M_FLAME_WHEEL2, SOUND_PAN_TARGET",
  "createsprite gLargeFlameScatterSpriteTemplate, ANIM_TARGET, 2, 0, 0, 30, 30, 0, 1",
  "delay 1",
  "createsprite gLargeFlameScatterSpriteTemplate, ANIM_TARGET, 2, 0, 0, 30, 30, -1, -1",
  "delay 1",
  "createsprite gLargeFlameScatterSpriteTemplate, ANIM_TARGET, 2, 0, 0, 30, 30, 2, 1",
  "delay 1",
  "createsprite gLargeFlameScatterSpriteTemplate, ANIM_TARGET, 2, 0, 0, 30, 30, 1, -1",
  "delay 1",
  "createsprite gLargeFlameScatterSpriteTemplate, ANIM_TARGET, 2, 0, 0, 30, 30, -1, 1",
  "delay 1",
  "createsprite gLargeFlameScatterSpriteTemplate, ANIM_TARGET, 2, 0, 0, 30, 30, 1, -2",
  "delay 1",
  "createsprite gLargeFlameScatterSpriteTemplate, ANIM_TARGET, 2, 0, 0, 30, 30, 3, 1",
  "delay 2",
  "createvisualtask AnimTask_ShakeTargetInPattern, 2, 20, 3, TRUE, 1",
  "waitforvisualfinish",
  "loadspritegfx ANIM_TAG_LIGHTNING",
  "invert_screen_color scenery=TRUE, attacker=TRUE, target=TRUE",
  "playsewithpan SE_M_TRI_ATTACK2, SOUND_PAN_TARGET",
  "createsprite gLightningSpriteTemplate, ANIM_TARGET, 2, 0, -48",
  "delay 1",
  "createsprite gLightningSpriteTemplate, ANIM_TARGET, 2, 0, -16",
  "delay 1",
  "createsprite gLightningSpriteTemplate, ANIM_TARGET, 2, 0, 16",
  "delay 20",
  "createvisualtask AnimTask_ShakeTargetInPattern, 2, 20, 3, TRUE, 0",
  "delay 2",
  "invert_screen_color scenery=TRUE, attacker=TRUE, target=TRUE",
  "waitforvisualfinish",
  "loadspritegfx ANIM_TAG_ICE_CRYSTALS",
  "call IceCrystalEffectShort",
  "simple_palette_blend selector=F_PAL_BG, delay=2, initial_blend_y=16, target_blend_y=0, color=RGB_BLACK",
  "waitforvisualfinish",
  "end",
] as const;

const expectedIceCommands = [
  "createsprite gIceCrystalHitLargeSpriteTemplate, ANIM_TARGET, 2, -10, -10, 0",
  "playsewithpan SE_M_ICY_WIND, SOUND_PAN_TARGET",
  "delay 4",
  "createsprite gIceCrystalHitSmallSpriteTemplate, ANIM_TARGET, 2, 10, 20, 0",
  "playsewithpan SE_M_ICY_WIND, SOUND_PAN_TARGET",
  "delay 4",
  "createsprite gIceCrystalHitLargeSpriteTemplate, ANIM_TARGET, 2, -5, 10, 0",
  "playsewithpan SE_M_ICY_WIND, SOUND_PAN_TARGET",
  "delay 4",
  "createsprite gIceCrystalHitSmallSpriteTemplate, ANIM_TARGET, 2, 17, -12, 0",
  "playsewithpan SE_M_ICY_WIND, SOUND_PAN_TARGET",
  "delay 4",
  "createsprite gIceCrystalHitSmallSpriteTemplate, ANIM_TARGET, 2, -15, 15, 0",
  "playsewithpan SE_M_ICY_WIND, SOUND_PAN_TARGET",
  "delay 4",
  "createsprite gIceCrystalHitSmallSpriteTemplate, ANIM_TARGET, 2, 0, 0, 0",
  "playsewithpan SE_M_ICY_WIND, SOUND_PAN_TARGET",
  "delay 4",
  "createsprite gIceCrystalHitLargeSpriteTemplate, ANIM_TARGET, 2, 20, 2, 0",
  "playsewithpan SE_M_ICY_WIND, SOUND_PAN_TARGET",
  "return",
] as const;

function assertCommands(name: string, actual: readonly string[], expected: readonly string[]): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name} command ordering changed`);
  }
}

function sourceFunction(source: string, name: string): {
  readonly text: string;
  readonly start: number;
  readonly endExclusive: number;
} {
  const expression = new RegExp(
    `^(?:(?:static\\s+)?[A-Za-z_][A-Za-z0-9_]*[\\s*]+)+${name}\\s*\\([^;{}]*\\)\\s*\\{`,
    "m",
  );
  const match = expression.exec(source);
  if (!match || match.index === undefined) throw new Error(`missing C function ${name}`);
  const open = source.indexOf("{", match.index);
  let depth = 0;
  let close = -1;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}") {
      depth--;
      if (depth === 0) {
        close = index;
        break;
      }
    }
  }
  if (close < 0) throw new Error(`unterminated C function ${name}`);
  return { text: source.slice(match.index, close + 1), start: match.index, endExclusive: close + 1 };
}

function sourceObject(source: string, name: string): {
  readonly text: string;
  readonly start: number;
  readonly endExclusive: number;
} {
  const start = source.indexOf(name);
  if (start < 0) throw new Error(`missing C object ${name}`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("};", open);
  if (open < 0 || close < 0) throw new Error(`unterminated C object ${name}`);
  const lineStart = source.lastIndexOf("\n", start) + 1;
  return { text: source.slice(lineStart, close + 2), start: lineStart, endExclusive: close + 2 };
}

type SymbolRecord = { readonly address: number; readonly kind: string; readonly name: string };
const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});
const symbols: SymbolRecord[] = nm
  .split(/\r?\n/)
  .flatMap((line): SymbolRecord[] => {
    const match = /^(?:([0-9a-fA-F]+) )([A-Za-z?]) (.+)$/.exec(line);
    if (!match) return [];
    return [{ address: Number.parseInt(match[1]!, 16), kind: match[2]!, name: match[3]! }];
  });

function romInterval(name: string, sectionKinds: readonly string[]): {
  readonly symbol: string;
  readonly start: string;
  readonly endExclusive: string;
  readonly byteLength: number;
  readonly romSha256: string;
} {
  const symbol = symbols.find((entry) => entry.name === name && sectionKinds.includes(entry.kind));
  if (!symbol) throw new Error(`missing ROM symbol ${name}`);
  const next = symbols
    .filter((entry) => sectionKinds.includes(entry.kind) && entry.address > symbol.address)
    .sort((left, right) => left.address - right.address)[0];
  if (!next) throw new Error(`missing ROM end for ${name}`);
  const startOffset = symbol.address - 0x08000000;
  const endOffset = next.address - 0x08000000;
  const bytes = rom.subarray(startOffset, endOffset);
  if (bytes.length !== endOffset - startOffset) throw new Error(`ROM interval outside image ${name}`);
  return {
    symbol: name,
    start: `0x${symbol.address.toString(16)}`,
    endExclusive: `0x${next.address.toString(16)}`,
    byteLength: bytes.length,
    romSha256: sha256(bytes),
  };
}

function sourceInterval(
  path: string,
  source: string,
  start: number,
  endExclusive: number,
): { readonly path: string; readonly start: number; readonly endExclusive: number; readonly byteLength: number; readonly sourceSha256: string } {
  const text = source.slice(start, endExclusive);
  return { path, start, endExclusive, byteLength: Buffer.byteLength(text), sourceSha256: sha256(text) };
}

function requireLiterals(name: string, text: string, literals: readonly string[]): void {
  for (const literal of literals) {
    if (!text.includes(literal)) throw new Error(`${name} lost source literal ${literal}`);
  }
}

const tri = scriptBody("Move_TRI_ATTACK", "Move_WILL_O_WISP");
const ice = scriptBody("IceCrystalEffectShort", "IceCrystalEffectLong");
assertCommands("Move_TRI_ATTACK", commands(tri.text), expectedRootCommands);
assertCommands("IceCrystalEffectShort", commands(ice.text), expectedIceCommands);

const cSources = {
  effects3: readFileSync(resolve(sourceRoot, "src/battle_anim_effects_3.c"), "utf8"),
  fire: readFileSync(resolve(sourceRoot, "src/battle_anim_fire.c"), "utf8"),
  electric: readFileSync(resolve(sourceRoot, "src/battle_anim_electric.c"), "utf8"),
  ice: readFileSync(resolve(sourceRoot, "src/battle_anim_ice.c"), "utf8"),
  sound: readFileSync(resolve(sourceRoot, "src/battle_anim_sound_tasks.c"), "utf8"),
  data: readFileSync(resolve(sourceRoot, "src/data/battle_anim.h"), "utf8"),
  graphics: readFileSync(resolve(sourceRoot, "src/graphics.c"), "utf8"),
};

const cFunctions = {
  AnimTriAttackTriangle: sourceFunction(cSources.effects3, "AnimTriAttackTriangle"),
  AnimLargeFlame: sourceFunction(cSources.fire, "AnimLargeFlame"),
  AnimLargeFlame_Step: sourceFunction(cSources.fire, "AnimLargeFlame_Step"),
  AnimTask_ShakeTargetInPattern: sourceFunction(cSources.fire, "AnimTask_ShakeTargetInPattern"),
  AnimLightning: sourceFunction(cSources.electric, "AnimLightning"),
  AnimLightning_Step: sourceFunction(cSources.electric, "AnimLightning_Step"),
  AnimIceEffectParticle: sourceFunction(cSources.ice, "AnimIceEffectParticle"),
  AnimFlickerIceEffectParticle: sourceFunction(cSources.ice, "AnimFlickerIceEffectParticle"),
  SoundTask_LoopSEAdjustPanning: sourceFunction(cSources.sound, "SoundTask_LoopSEAdjustPanning"),
  SoundTask_LoopSEAdjustPanning_Step: sourceFunction(cSources.sound, "SoundTask_LoopSEAdjustPanning_Step"),
};

requireLiterals("AnimTriAttackTriangle", cFunctions.AnimTriAttackTriangle.text, [
  "InitSpritePosToAnimAttacker(sprite, FALSE)", "sprite->data[0] == 61",
  "StoreSpriteCallbackInData6(sprite, DestroyAnimSprite)", "StartAnimLinearTranslation",
]);
requireLiterals("AnimLargeFlame", cFunctions.AnimLargeFlame.text, [
  "GetBattlerSide(gBattleAnimAttacker)", "sprite->data[2] = -gBattleAnimArgs[4]",
  "sprite->callback = AnimLargeFlame_Step",
]);
requireLiterals("AnimLargeFlame_Step", cFunctions.AnimLargeFlame_Step.text, [
  "sprite->x2 += sprite->data[2]", "sprite->y2 += sprite->data[3]", "DestroySpriteAndMatrix(sprite)",
]);
requireLiterals("AnimTask_ShakeTargetInPattern", cFunctions.AnimTask_ShakeTargetInPattern.text, [
  "sShakeDirsPattern0", "sShakeDirsPattern1", "gBattleAnimArgs[0]", "gBattleAnimArgs[1] * dir",
]);
requireLiterals("AnimLightning", cFunctions.AnimLightning.text, [
  "sprite->x -= gBattleAnimArgs[0]", "sprite->x += gBattleAnimArgs[0]", "sprite->y += gBattleAnimArgs[1]",
  "sprite->callback = AnimLightning_Step",
]);
requireLiterals("AnimLightning_Step", cFunctions.AnimLightning_Step.text, [
  "if (sprite->animEnded)", "DestroyAnimSprite(sprite)",
]);
requireLiterals("AnimIceEffectParticle", cFunctions.AnimIceEffectParticle.text, [
  "InitSpritePosToAnimTarget(sprite, TRUE)", "SetAverageBattlerPositions(gBattleAnimTarget, TRUE",
  "StoreSpriteCallbackInData6(sprite, AnimFlickerIceEffectParticle)",
]);
requireLiterals("AnimFlickerIceEffectParticle", cFunctions.AnimFlickerIceEffectParticle.text, [
  "sprite->invisible ^= 1", "sprite->data[0] == 20", "DestroySpriteAndMatrix(sprite)",
]);
requireLiterals("SoundTask_LoopSEAdjustPanning", cFunctions.SoundTask_LoopSEAdjustPanning.text, [
  "CalculatePanIncrement(sourcePan, targetPan, panIncrement)", "SoundTask_LoopSEAdjustPanning_Step",
]);
requireLiterals("SoundTask_LoopSEAdjustPanning_Step", cFunctions.SoundTask_LoopSEAdjustPanning_Step.text, [
  "PlaySE12WithPanning", "DestroyAnimSoundTask(taskId)",
]);

const templatesSource = {
  effects3: sourceObject(cSources.effects3, "gTriAttackTriangleSpriteTemplate"),
  fire: sourceObject(cSources.fire, "gLargeFlameScatterSpriteTemplate"),
  electric: sourceObject(cSources.electric, "gLightningSpriteTemplate"),
  iceLarge: sourceObject(cSources.ice, "gIceCrystalHitLargeSpriteTemplate"),
  iceSmall: sourceObject(cSources.ice, "gIceCrystalHitSmallSpriteTemplate"),
};
requireLiterals("gTriAttackTriangleSpriteTemplate", templatesSource.effects3.text, [
  ".tileTag = ANIM_TAG_TRI_ATTACK_TRIANGLE", ".oam = &gOamData_AffineDouble_ObjNormal_64x64",
  ".callback = AnimTriAttackTriangle",
]);
requireLiterals("gLargeFlameScatterSpriteTemplate", templatesSource.fire.text, [
  ".tileTag = ANIM_TAG_FIRE", ".oam = &gOamData_AffineOff_ObjNormal_32x32", ".callback = AnimLargeFlame",
]);
requireLiterals("gLightningSpriteTemplate", templatesSource.electric.text, [
  ".tileTag = ANIM_TAG_LIGHTNING", ".oam = &gOamData_AffineOff_ObjNormal_32x32", ".callback = AnimLightning",
]);
requireLiterals("gIceCrystalHitLargeSpriteTemplate", templatesSource.iceLarge.text, [
  ".tileTag = ANIM_TAG_ICE_CRYSTALS", ".callback = AnimIceEffectParticle",
]);
requireLiterals("gIceCrystalHitSmallSpriteTemplate", templatesSource.iceSmall.text, [
  ".tileTag = ANIM_TAG_ICE_CRYSTALS", ".callback = AnimIceEffectParticle",
]);

const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as {
  moves: Array<{ move: string; id: number; tier: string; rootScript: string; blocks: string[]; componentIds: string[] }>;
};
const graphTri = graph.moves.find((move) => move.move === "MOVE_TRI_ATTACK");
if (!graphTri) throw new Error("generated animation graph lost MOVE_TRI_ATTACK");
const expectedComponents = [
  "asset:ANIM_TAG_FIRE", "asset:ANIM_TAG_ICE_CRYSTALS", "asset:ANIM_TAG_LIGHTNING", "asset:ANIM_TAG_TRI_ATTACK_TRIANGLE",
  "soundTask:SoundTask_LoopSEAdjustPanning", "sprite:gIceCrystalHitLargeSpriteTemplate", "sprite:gIceCrystalHitSmallSpriteTemplate",
  "sprite:gLargeFlameScatterSpriteTemplate", "sprite:gLightningSpriteTemplate", "sprite:gTriAttackTriangleSpriteTemplate",
  "subroutine:IceCrystalEffectShort", "task:AnimTask_ShakeTargetInPattern", "visualCommand:invert_screen_color",
  "visualCommand:simple_palette_blend",
];
if (JSON.stringify(graphTri.componentIds) !== JSON.stringify(expectedComponents)) throw new Error("Tri Attack graph components changed");

const inventory = JSON.parse(readFileSync(resolve(root, "src/data/gen/factory-animation-inventory.json"), "utf8")) as {
  tiers: Record<string, { monIndices?: { first: number; last: number; count: number }; moves: Array<{ move: string; id: number; frontierMonCount: number; speciesCount: number; exampleMons: string[] }> }>;
};
const frontierMonsData = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-frontier-mons.json"), "utf8")) as { entries: Array<{
  index: number; label: string; species: string; moves: string[]; itemTableId: number; itemName: string; evSpread: number; evSpreadStats: string[]; nature: string;
}> };
const frontierMons = frontierMonsData.entries;
const carriers = frontierMons.filter((mon) => mon.moves.includes("MOVE_TRI_ATTACK"));
const level50Indices = inventory.tiers.level50.monIndices!;
const openOnlyIndices = inventory.tiers.openOnly.monIndices!;
const level50Carriers = carriers.filter((mon) => mon.index >= level50Indices.first && mon.index <= level50Indices.last);
const openOnlyCarriers = carriers.filter((mon) => mon.index > level50Indices.last && mon.index <= openOnlyIndices.last);
const outsideFactoryCarriers = carriers.filter((mon) => mon.index < level50Indices.first);
if (level50Carriers.length !== 8 || openOnlyCarriers.length !== 0 || outsideFactoryCarriers.length !== 0 || level50Carriers[0]?.index !== 273) {
  throw new Error("Tri Attack Factory carrier census changed");
}
const triInventory = inventory.tiers.level50.moves.find((move) => move.move === "MOVE_TRI_ATTACK");
if (!triInventory || triInventory.id !== 161 || triInventory.frontierMonCount !== 8 || triInventory.speciesCount !== 5) {
  throw new Error("Tri Attack inventory classification changed");
}
const level50Labels = level50Carriers.map((mon) => mon.label);

function codeRecord(name: keyof typeof cFunctions, sourcePath: string, source: string, sectionKinds: readonly string[]): object {
  const body = cFunctions[name];
  return { ...sourceInterval(sourcePath, source, body.start, body.endExclusive), rom: romInterval(name, sectionKinds) };
}
function templateRecord(name: string, sourcePath: string, source: string): object {
  const body = sourceObject(source, name);
  return { ...sourceInterval(sourcePath, source, body.start, body.endExclusive), rom: romInterval(name, ["R", "r"]) };
}

const rootSourceInterval = sourceInterval("data/battle_anim_scripts.s", scriptSource, tri.start, tri.endExclusive);
const rootRomInterval = romInterval("Move_TRI_ATTACK", ["d", "D"]);
const rootInterval = {
  ...rootRomInterval,
  sourcePath: rootSourceInterval.path,
  sourceStart: rootSourceInterval.start,
  sourceEndExclusive: rootSourceInterval.endExclusive,
  sourceByteLength: rootSourceInterval.byteLength,
  sourceSha256: rootSourceInterval.sourceSha256,
};
const iceSourceInterval = sourceInterval("data/battle_anim_scripts.s", scriptSource, ice.start, ice.endExclusive);
const iceRomInterval = romInterval("IceCrystalEffectShort", ["d", "D"]);
const iceInterval = {
  ...iceRomInterval,
  sourcePath: iceSourceInterval.path,
  sourceStart: iceSourceInterval.start,
  sourceEndExclusive: iceSourceInterval.endExclusive,
  sourceByteLength: iceSourceInterval.byteLength,
  sourceSha256: iceSourceInterval.sourceSha256,
};
const rootRom = rom.subarray(0x082d4595 - 0x08000000, 0x082d4709 - 0x08000000);
const iceRom = rom.subarray(0x082d7720 - 0x08000000, 0x082d77a4 - 0x08000000);
const combinedRom = Buffer.concat([rootRom, iceRom]);
const combinedSource = tri.text + ice.text;

const sourceAudit = {
  move: "MOVE_TRI_ATTACK",
  moveId: 161,
  status: "unsupported-evidence",
  coverageCredit: false,
  pointerOwned: {
    root: rootInterval,
    subroutine: iceInterval,
    combined: {
      byteLength: combinedRom.length, romSha256: sha256(combinedRom),
      sourceByteLength: Buffer.byteLength(combinedSource), sourceSha256: sha256(combinedSource),
    },
  },
  script: {
    root: { commands: commands(tri.text), commandCount: commands(tri.text).length },
    subroutine: { label: "IceCrystalEffectShort", commands: commands(ice.text), commandCount: commands(ice.text).length },
  },
  graph: { rootScript: graphTri.rootScript, blocks: graphTri.blocks, components: graphTri.componentIds },
  phases: {
    triangle: { asset: "ANIM_TAG_TRI_ATTACK_TRIANGLE", template: "gTriAttackTriangleSpriteTemplate", initialOffset: [16, 0], waits: [20, 20], cleanup: "AnimTriAttackTriangle -> DestroyAnimSprite after translation" },
    fire: { asset: "ANIM_TAG_FIRE", template: "gLargeFlameScatterSpriteTemplate", spriteCount: 8, lifetime: 30, offsets: [[-1, 0], [0, 1], [-1, -1], [2, 1], [1, -1], [-1, 1], [1, -2], [3, 1]], shake: [20, 3, true, 1] },
    lightning: { asset: "ANIM_TAG_LIGHTNING", template: "gLightningSpriteTemplate", spriteCount: 3, yOffsets: [-48, -16, 16], shake: [20, 3, true, 0], screenInversions: 2 },
    ice: { asset: "ANIM_TAG_ICE_CRYSTALS", subroutine: "IceCrystalEffectShort", spriteCount: 7, offsets: [[-10, -10], [10, 20], [-5, 10], [17, -12], [-15, 15], [0, 0], [20, 2]], cleanup: "AnimFlickerIceEffectParticle at data[0] == 20" },
  },
  callbacks: {
    AnimTriAttackTriangle: codeRecord("AnimTriAttackTriangle", "src/battle_anim_effects_3.c", cSources.effects3, ["t", "T"]),
    AnimLargeFlame: codeRecord("AnimLargeFlame", "src/battle_anim_fire.c", cSources.fire, ["t", "T"]),
    AnimLargeFlame_Step: codeRecord("AnimLargeFlame_Step", "src/battle_anim_fire.c", cSources.fire, ["t", "T"]),
    AnimLightning: codeRecord("AnimLightning", "src/battle_anim_electric.c", cSources.electric, ["t", "T"]),
    AnimLightning_Step: codeRecord("AnimLightning_Step", "src/battle_anim_electric.c", cSources.electric, ["t", "T"]),
    AnimIceEffectParticle: codeRecord("AnimIceEffectParticle", "src/battle_anim_ice.c", cSources.ice, ["t", "T"]),
    AnimFlickerIceEffectParticle: codeRecord("AnimFlickerIceEffectParticle", "src/battle_anim_ice.c", cSources.ice, ["t", "T"]),
    AnimTask_ShakeTargetInPattern: codeRecord("AnimTask_ShakeTargetInPattern", "src/battle_anim_fire.c", cSources.fire, ["t", "T"]),
  },
  sound: {
    task: codeRecord("SoundTask_LoopSEAdjustPanning", "src/battle_anim_sound_tasks.c", cSources.sound, ["t", "T"]),
    step: codeRecord("SoundTask_LoopSEAdjustPanning_Step", "src/battle_anim_sound_tasks.c", cSources.sound, ["t", "T"]),
    triangleLoop: { song: "SE_M_TRI_ATTACK", sourcePan: "SOUND_PAN_ATTACKER", targetPan: "SOUND_PAN_TARGET", panIncrement: 5, firstWait: 6, firstRestart: 0, repeats: 7 },
    cues: [["SE_M_TRI_ATTACK", "SOUND_PAN_ATTACKER"], ["SE_M_FLAME_WHEEL2", "SOUND_PAN_TARGET"], ["SE_M_TRI_ATTACK2", "SOUND_PAN_TARGET"], ["SE_M_ICY_WIND", "SOUND_PAN_TARGET"]],
  },
  templates: {
    triangle: templateRecord("gTriAttackTriangleSpriteTemplate", "src/battle_anim_effects_3.c", cSources.effects3),
    flame: templateRecord("gLargeFlameScatterSpriteTemplate", "src/battle_anim_fire.c", cSources.fire),
    lightning: templateRecord("gLightningSpriteTemplate", "src/battle_anim_electric.c", cSources.electric),
    iceLarge: templateRecord("gIceCrystalHitLargeSpriteTemplate", "src/battle_anim_ice.c", cSources.ice),
    iceSmall: templateRecord("gIceCrystalHitSmallSpriteTemplate", "src/battle_anim_ice.c", cSources.ice),
  },
  assets: {
    triangle: { gfx: "gBattleAnimSpriteGfx_TriAttackTriangle", gfxPath: "graphics/battle_anims/sprites/tri_attack_triangle.png", tileBytes: 0x0800, palette: "gBattleAnimSpritePal_TriAttackTriangle", tag: "ANIM_TAG_TRI_ATTACK_TRIANGLE" },
    fire: { gfx: "gBattleAnimSpriteGfx_Fire", gfxPath: "graphics/battle_anims/sprites/fire.png", tileBytes: 0x1000, palette: "gBattleAnimSpritePal_Fire", tag: "ANIM_TAG_FIRE" },
    lightning: { gfx: "gBattleAnimSpriteGfx_Lightning", gfxPath: "graphics/battle_anims/sprites/lightning.png", tileBytes: 0x0a00, palette: "gBattleAnimSpritePal_Lightning2", tag: "ANIM_TAG_LIGHTNING" },
    ice: { gfx: "gBattleAnimSpriteGfx_IceCrystals", gfxPath: "graphics/battle_anims/sprites/ice_crystals.4bpp", tileBytes: 0x01c0, palette: "gBattleAnimSpritePal_IceCrystals", tag: "ANIM_TAG_ICE_CRYSTALS" },
    sourceTable: "src/data/battle_anim.h",
    graphicsSource: "src/graphics.c",
  },
  background: { dedicatedBackground: false, enter: { selector: "F_PAL_BG", delay: 2, initialBlendY: 0, targetBlendY: 16, color: "RGB_BLACK" }, restore: { selector: "F_PAL_BG", delay: 2, initialBlendY: 16, targetBlendY: 0, color: "RGB_BLACK" } },
  carrier: {
    lowestLevel50Set: level50Carriers[0]!.index,
    frontierMon: level50Carriers[0]!.label,
    species: level50Carriers[0]!.species,
    itemTableId: level50Carriers[0]!.itemTableId,
    nature: level50Carriers[0]!.nature,
    allLevel50Sets: level50Carriers.map((mon) => mon.index),
    allInventorySets: carriers.map((mon) => mon.index),
    excludedOpenOnly: openOnlyCarriers.map((mon) => mon.index),
    excludedOutsideFactory: outsideFactoryCarriers.map((mon) => mon.index),
    level50SpeciesCount: new Set(level50Carriers.map((mon) => mon.species)).size,
    sourceRanges: { level50: level50Indices, openOnly: openOnlyIndices },
    generatedInventory: { frontierMonCount: triInventory.frontierMonCount, speciesCount: triInventory.speciesCount, examples: triInventory.exampleMons },
    labels: level50Labels,
  },
  siblings: [
    { move: "MOVE_SCARY_FACE", status: "exact", blocks: ["Move_SCARY_FACE"] },
    { move: "MOVE_GLARE", status: "exact", blocks: ["Move_GLARE"] },
    { move: "MOVE_THUNDER", status: "exact", blocks: ["Move_THUNDER"] },
    { move: "MOVE_TRI_ATTACK", status: "unsupported", blocks: ["Move_TRI_ATTACK", "IceCrystalEffectShort"] },
  ],
};

const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as {
  entries: Array<{ move: string; status: string }>;
  componentTracks: Array<{ id: string; representatives: string[]; fulfilled?: boolean }>;
};
if (coverage.entries.some((entry) => entry.move === "MOVE_TRI_ATTACK")) throw new Error("Tri Attack must remain absent from exact coverage entries");
const track = coverage.componentTracks.find((entry) => entry.id === "shake-target-in-pattern-scary-face");
if (!track || !track.representatives.includes("MOVE_TRI_ATTACK") || track.fulfilled === true) throw new Error("Tri Attack track must remain unfulfilled");

console.log(JSON.stringify(sourceAudit, null, 2));
