/**
 * Hermetic source/classification audit for the still-unsupported Focus Punch
 * Scene-ON checkpoint.  This is development evidence only: production code
 * never imports the ROM, ELF, source tree, or this audit.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const sourceRoot = resolve(root, "reference/pokeemerald");
const scriptPath = resolve(sourceRoot, "data/battle_anim_scripts.s");
const scripts = readFileSync(scriptPath, "utf8");
const rom = readFileSync(resolve(sourceRoot, "pokeemerald.gba"));

type SourceSpan = {
  readonly path: string;
  readonly start: number;
  readonly endExclusive: number;
  readonly byteLength: number;
  readonly sha256: string;
};

type SymbolRecord = {
  readonly address: number;
  readonly kind: string;
  readonly name: string;
};

const sha256 = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

function sourceSpan(path: string, text: string, start: number, endExclusive: number): SourceSpan {
  const body = text.slice(start, endExclusive);
  return {
    path,
    start,
    endExclusive,
    byteLength: Buffer.byteLength(body),
    sha256: sha256(body),
  };
}

function commands(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/@.*$/, "").trim())
    .filter((line) => line.length > 0 && !/^[A-Za-z_][A-Za-z0-9_]*:$/.test(line));
}

function scriptBlock(label: string, nextLabel: string): {
  readonly label: string;
  readonly commands: readonly string[];
  readonly source: SourceSpan;
} {
  const start = scripts.indexOf(`${label}:`);
  const endExclusive = scripts.indexOf(`${nextLabel}:`, start + 1);
  if (start < 0 || endExclusive < 0) throw new Error(`missing source block ${label}/${nextLabel}`);
  return {
    label,
    commands: commands(scripts.slice(start, endExclusive)),
    source: sourceSpan("data/battle_anim_scripts.s", scripts, start, endExclusive),
  };
}

function sourceFunction(path: string, source: string, name: string): SourceSpan {
  const expression = new RegExp(
    `^(?:(?:static\\s+)?[A-Za-z_][A-Za-z0-9_]*[\\s*]+)+${name}\\s*\\([^;{}]*\\)\\s*\\{`,
    "m",
  );
  const match = expression.exec(source);
  if (!match || match.index === undefined) throw new Error(`missing C function ${name}`);
  const open = source.indexOf("{", match.index);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}") {
      depth--;
      if (depth === 0) return sourceSpan(path, source, match.index, index + 1);
    }
  }
  throw new Error(`unterminated C function ${name}`);
}

function sourceObject(path: string, source: string, name: string): SourceSpan {
  const token = source.indexOf(name);
  if (token < 0) throw new Error(`missing C object ${name}`);
  const start = source.lastIndexOf("\n", token) + 1;
  const open = source.indexOf("{", token);
  const endExclusive = source.indexOf("};", open) + 2;
  if (open < 0 || endExclusive < 2) throw new Error(`unterminated C object ${name}`);
  return sourceSpan(path, source, start, endExclusive);
}

function requireTokens(name: string, text: string, tokens: readonly string[]): void {
  for (const token of tokens) {
    if (!text.includes(token)) throw new Error(`${name} lost source token ${token}`);
  }
}

function requireCommands(name: string, actual: readonly string[], expected: readonly string[]): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name} command ordering changed`);
  }
}

const nm = execFileSync("arm-none-eabi-nm", ["-a", resolve(sourceRoot, "pokeemerald.elf")], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});
const symbols: SymbolRecord[] = nm.split(/\r?\n/).flatMap((line): SymbolRecord[] => {
  const match = /^([0-9a-fA-F]+) ([A-Za-z?]) (.+)$/.exec(line);
  return match ? [{ address: Number.parseInt(match[1]!, 16), kind: match[2]!, name: match[3]! }] : [];
});

function symbol(name: string): SymbolRecord {
  const found = symbols.find((entry) => entry.name === name);
  if (!found) throw new Error(`missing ELF symbol ${name}`);
  return found;
}

function elfRomInterval(startName: string, endName: string): {
  readonly elf: { readonly start: string; readonly endExclusive: string; readonly startSymbol: string; readonly endSymbol: string };
  readonly rom: { readonly start: string; readonly endExclusive: string; readonly byteLength: number; readonly sha256: string };
} {
  const start = symbol(startName).address;
  const endExclusive = symbol(endName).address;
  if (endExclusive <= start) throw new Error(`invalid ELF interval ${startName}/${endName}`);
  const bytes = rom.subarray(start - 0x08000000, endExclusive - 0x08000000);
  if (bytes.length !== endExclusive - start) throw new Error(`ROM interval outside image ${startName}`);
  return {
    elf: {
      start: `0x${start.toString(16)}`,
      endExclusive: `0x${endExclusive.toString(16)}`,
      startSymbol: startName,
      endSymbol: endName,
    },
    rom: {
      start: `0x${start.toString(16)}`,
      endExclusive: `0x${endExclusive.toString(16)}`,
      byteLength: bytes.length,
      sha256: sha256(bytes),
    },
  };
}

const blockSpecs = [
  ["Move_FOCUS_PUNCH", "FocusPunchEnd"],
  ["FocusPunchEnd", "FocusPunch"],
  ["FocusPunch", "FocusPunchContinue"],
  ["FocusPunchContinue", "FocusPunchOnOpponent"],
  ["FocusPunchOnOpponent", "FocusPunchOnPlayer"],
  ["FocusPunchOnPlayer", "FocusPunchInContest"],
  ["FocusPunchInContest", "Move_RETURN"],
] as const;
const blocks = Object.fromEntries(blockSpecs.map(([label, next]) => [label, scriptBlock(label, next)]));

requireCommands("Move_FOCUS_PUNCH", blocks.Move_FOCUS_PUNCH!.commands, ["goto FocusPunch"]);
requireCommands("FocusPunchEnd", blocks.FocusPunchEnd!.commands, ["waitforvisualfinish", "end"]);
requireCommands("FocusPunch", blocks.FocusPunch!.commands, [
  "loadspritegfx ANIM_TAG_IMPACT",
  "loadspritegfx ANIM_TAG_HANDS_AND_FEET",
  "delay 1",
  "createvisualtask AnimTask_IsContest, 2",
  "jumprettrue FocusPunchInContest",
  "createvisualtask AnimTask_IsTargetPlayerSide, 2",
  "jumpretfalse FocusPunchOnOpponent",
  "jumprettrue FocusPunchOnPlayer",
]);
requireCommands("FocusPunchContinue", blocks.FocusPunchContinue!.commands, [
  "waitbgfadein",
  "monbg ANIM_DEF_PARTNER",
  "setalpha 12, 8",
  "playsewithpan SE_M_SWAGGER, SOUND_PAN_TARGET",
  "createsprite gFocusPunchFistSpriteTemplate, ANIM_TARGET, 2",
  "delay 10",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=-10, y=-8, relative_to=ANIM_TARGET, animation=0",
  "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 8, 0, 24, 1",
  "delay 8",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=10, y=2, relative_to=ANIM_TARGET, animation=0",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "delay 8",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=10, y=-6, relative_to=ANIM_TARGET, animation=0",
  "playsewithpan SE_M_VITAL_THROW2, SOUND_PAN_TARGET",
  "delay 8",
  "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=8, relative_to=ANIM_TARGET, animation=0",
  "playsewithpan SE_M_MEGA_KICK2, SOUND_PAN_TARGET",
  "waitforvisualfinish",
  "restorebg",
  "waitbgfadein",
  "clearmonbg ANIM_DEF_PARTNER",
  "blendoff",
  "goto FocusPunchEnd",
]);
requireCommands("FocusPunchOnOpponent", blocks.FocusPunchOnOpponent!.commands, [
  "fadetobg BG_IMPACT_OPPONENT", "goto FocusPunchContinue",
]);
requireCommands("FocusPunchOnPlayer", blocks.FocusPunchOnPlayer!.commands, [
  "fadetobg BG_IMPACT_PLAYER", "goto FocusPunchContinue",
]);
requireCommands("FocusPunchInContest", blocks.FocusPunchInContest!.commands, [
  "fadetobg BG_IMPACT_CONTESTS", "goto FocusPunchContinue",
]);

const sourceFiles = {
  fight: "src/battle_anim_fight.c",
  normal: "src/battle_anim_normal.c",
  movement: "src/battle_anim_mon_movement.c",
  utility: "src/battle_anim_utility_funcs.c",
  effects3: "src/battle_anim_effects_3.c",
  animation: "src/battle_anim.c",
  data: "src/data/battle_anim.h",
  constants: "include/constants/battle_anim.h",
  frontierMons: "src/data/battle_frontier/battle_frontier_mons.h",
  frontierConstants: "include/constants/battle_frontier_mons.h",
};
const source = Object.fromEntries(Object.entries(sourceFiles).map(([key, path]) => [key, readFileSync(resolve(sourceRoot, path), "utf8")])) as Record<keyof typeof sourceFiles, string>;

const templates = {
  focusPunchFist: sourceObject(sourceFiles.fight, source.fight, "gFocusPunchFistSpriteTemplate"),
  basicHitSplat: sourceObject(sourceFiles.normal, source.normal, "gBasicHitSplatSpriteTemplate"),
};
const callbacks = {
  AnimFocusPunchFist: sourceFunction(sourceFiles.fight, source.fight, "AnimFocusPunchFist"),
  AnimHitSplatBasic: sourceFunction(sourceFiles.normal, source.normal, "AnimHitSplatBasic"),
};
const tasks = {
  AnimTask_IsContest: sourceFunction(sourceFiles.utility, source.utility, "AnimTask_IsContest"),
  AnimTask_IsTargetPlayerSide: sourceFunction(sourceFiles.effects3, source.effects3, "AnimTask_IsTargetPlayerSide"),
  AnimTask_ShakeMon: sourceFunction(sourceFiles.movement, source.movement, "AnimTask_ShakeMon"),
  AnimTask_ShakeMon_Step: sourceFunction(sourceFiles.movement, source.movement, "AnimTask_ShakeMon_Step"),
  Task_FadeToBg: sourceFunction(sourceFiles.animation, source.animation, "Task_FadeToBg"),
  Task_UpdateMonBg: sourceFunction(sourceFiles.animation, source.animation, "Task_UpdateMonBg"),
  Task_ClearMonBg: sourceFunction(sourceFiles.animation, source.animation, "Task_ClearMonBg"),
};

requireTokens("gFocusPunchFistSpriteTemplate", source.fight, [
  ".tileTag = ANIM_TAG_HANDS_AND_FEET", ".paletteTag = ANIM_TAG_HANDS_AND_FEET",
  ".oam = &gOamData_AffineDouble_ObjNormal_32x32", ".affineAnims = sAffineAnims_FocusPunchFist",
  ".callback = AnimFocusPunchFist",
]);
requireTokens("FocusPunch affine", source.fight, [
  "sAffineAnim_FocusPunchFist", "AFFINEANIMCMD_FRAME(0x200, 0x200, 0, 0)",
  "AFFINEANIMCMD_FRAME(0xFFE0, 0xFFE0, 0, 8)",
]);
requireTokens("AnimFocusPunchFist", source.fight, [
  "sprite->data[1] = (sprite->data[1] + 40) & 0xFF", "sprite->x2 = Sin(sprite->data[1], 2)",
  "if (++sprite->data[0] > 40)", "DestroyAnimSprite(sprite)",
]);
requireTokens("gBasicHitSplatSpriteTemplate", source.normal, [
  ".tileTag = ANIM_TAG_IMPACT", ".paletteTag = ANIM_TAG_IMPACT",
  ".oam = &gOamData_AffineNormal_ObjBlend_32x32", ".callback = AnimHitSplatBasic",
]);
requireTokens("AnimTask_IsContest", source.utility, ["IsContest()", "gBattleAnimArgs[ARG_RET_ID] = FALSE"]);
requireTokens("AnimTask_IsTargetPlayerSide", source.effects3, [
  "GetBattlerSide(gBattleAnimTarget) == B_SIDE_OPPONENT", "gBattleAnimArgs[ARG_RET_ID] = FALSE",
  "gBattleAnimArgs[ARG_RET_ID] = TRUE",
]);
requireTokens("AnimTask_ShakeMon", source.movement, [
  "gSprites[spriteId].x2 = gBattleAnimArgs[1]", "gBattleAnimArgs[3]", "AnimTask_ShakeMon_Step",
]);
requireTokens("Task_FadeToBg", source.animation, [
  "LoadMoveBg(bgId)", "BeginHardwarePaletteFade", "sAnimBackgroundFadeState",
]);
requireTokens("Focus Punch resources", source.data, [
  "{gBattleAnimSpriteGfx_Impact, 0x0200, ANIM_TAG_IMPACT}",
  "{gBattleAnimSpriteGfx_HandsAndFeet, 0x0800, ANIM_TAG_HANDS_AND_FEET}",
  "{gBattleAnimSpritePal_Impact, ANIM_TAG_IMPACT}",
  "{gBattleAnimSpritePal_HandsAndFeet, ANIM_TAG_HANDS_AND_FEET}",
  "[BG_IMPACT_OPPONENT]", "gBattleAnimBgTilemap_ImpactOpponent",
  "[BG_IMPACT_PLAYER]", "gBattleAnimBgTilemap_ImpactPlayer",
  "[BG_IMPACT_CONTESTS]", "gBattleAnimBgTilemap_ImpactContests",
]);
requireTokens("Focus Punch background constants", source.constants, [
  "#define BG_IMPACT_OPPONENT 4", "#define BG_IMPACT_PLAYER 5", "#define BG_IMPACT_CONTESTS 6",
]);

const graph = JSON.parse(readFileSync(resolve(root, "src/data/gen/battle-animation-components.json"), "utf8")) as {
  readonly moves: ReadonlyArray<{ readonly move: string; readonly id: number; readonly rootScript: string; readonly blocks: readonly string[]; readonly componentIds: readonly string[] }>;
  readonly components: ReadonlyArray<{ readonly id: string; readonly kind: string; readonly name: string; readonly moveCount: number; readonly level50MoveCount: number; readonly moves: readonly string[] }>;
};
const generated = graph.moves.find((entry) => entry.move === "MOVE_FOCUS_PUNCH");
if (!generated) throw new Error("generated Focus Punch graph missing");
const expectedBlocks = ["Move_FOCUS_PUNCH", "FocusPunch", "FocusPunchInContest", "FocusPunchOnOpponent", "FocusPunchOnPlayer", "FocusPunchContinue", "FocusPunchEnd"];
const expectedComponents = [
  "asset:ANIM_TAG_HANDS_AND_FEET", "asset:ANIM_TAG_IMPACT", "sprite:gFocusPunchFistSpriteTemplate",
  "subroutine:FocusPunch", "subroutine:FocusPunchContinue", "subroutine:FocusPunchEnd", "subroutine:FocusPunchInContest",
  "subroutine:FocusPunchOnOpponent", "subroutine:FocusPunchOnPlayer", "task:AnimTask_IsContest",
  "task:AnimTask_IsTargetPlayerSide", "task:AnimTask_ShakeMon", "visualCommand:blendoff", "visualCommand:clearmonbg",
  "visualCommand:create_basic_hitsplat_sprite", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg",
  "visualCommand:setalpha", "visualCommand:waitbgfadein",
];
if (generated.id !== 264 || generated.rootScript !== "Move_FOCUS_PUNCH"
  || JSON.stringify(generated.blocks) !== JSON.stringify(expectedBlocks)
  || JSON.stringify(generated.componentIds) !== JSON.stringify(expectedComponents)) {
  throw new Error("generated Focus Punch component graph changed");
}

const ids = new Map<string, number>();
for (const match of source.frontierConstants.matchAll(/^#define\s+(FRONTIER_MON_[A-Z0-9_]+)\s+(\d+)/gm)) {
  ids.set(match[1]!, Number.parseInt(match[2]!, 10));
}
const carrierCensus: Array<{ readonly setId: number; readonly frontierMon: string; readonly species: string; readonly moves: readonly string[] }> = [];
for (const match of source.frontierMons.matchAll(/^\s*\[(FRONTIER_MON_[A-Z0-9_]+)\]\s*=\s*\{([\s\S]*?)^\s*\},/gm)) {
  const frontierMon = match[1]!;
  const body = match[2]!;
  const setId = ids.get(frontierMon);
  if (setId === undefined || setId < 110 || setId > 849 || !body.includes("MOVE_FOCUS_PUNCH")) continue;
  const species = /\.species\s*=\s*(SPECIES_[A-Z0-9_]+)/.exec(body)?.[1];
  const moves = /\.moves\s*=\s*\{([^}]+)\}/.exec(body)?.[1]?.split(",").map((move) => move.trim());
  if (!species || !moves) throw new Error(`incomplete Focus Punch carrier ${frontierMon}`);
  carrierCensus.push({ setId, frontierMon, species, moves });
}
carrierCensus.sort((left, right) => left.setId - right.setId);
const expectedCarrierIds = [480, 498, 503, 507, 518, 546, 574, 670, 810, 836, 840];
if (JSON.stringify(carrierCensus.map((carrier) => carrier.setId)) !== JSON.stringify(expectedCarrierIds)) {
  throw new Error("complete Level-50 Focus Punch carrier census changed");
}

const controlIntervals = {
  MOVE_MEGA_PUNCH: elfRomInterval("Move_MEGA_PUNCH", "Move_MEGA_KICK"),
  MOVE_MEGA_KICK: elfRomInterval("Move_MEGA_KICK", "Move_COMET_PUNCH"),
  MOVE_HYPER_FANG: elfRomInterval("Move_HYPER_FANG", "Move_TRI_ATTACK"),
  MOVE_SOLAR_BEAM: elfRomInterval("Move_SOLAR_BEAM", "Move_BLIZZARD"),
  MOVE_FOCUS_ENERGY: elfRomInterval("Move_FOCUS_ENERGY", "Move_BIDE"),
  MOVE_ENDURE: elfRomInterval("Move_ENDURE", "Move_CHARM"),
  General_FocusPunchSetUp: elfRomInterval("General_FocusPunchSetUp", "General_IngrainHeal"),
};
const rootInterval = elfRomInterval("Move_FOCUS_PUNCH", "Move_RETURN");
for (const interval of Object.values(controlIntervals)) {
  if (interval.elf.start === rootInterval.elf.start || interval.elf.endExclusive === rootInterval.elf.endExclusive) {
    throw new Error("Focus Punch aliases a control body");
  }
}

const sourceAudit = {
  schema: "focus-punch-source-audit/v1",
  status: "unsupported-source-staging-checkpoint",
  coverageCredit: false,
  move: "MOVE_FOCUS_PUNCH",
  moveId: 264,
  pointerOwned: {
    root: {
      ...rootInterval,
      source: sourceSpan("data/battle_anim_scripts.s", scripts, scripts.indexOf("Move_FOCUS_PUNCH:"), scripts.indexOf("Move_RETURN:")),
    },
    blocks: Object.fromEntries(blockSpecs.map(([label, next]) => [label, {
      ...elfRomInterval(label, next),
      source: blocks[label]!.source,
      commands: blocks[label]!.commands,
    }])),
  },
  generatedGraph: {
    rootScript: generated.rootScript,
    blocks: generated.blocks,
    components: generated.componentIds,
    componentDetails: graph.components.filter((component) => generated.componentIds.includes(component.id)).map((component) => ({
      id: component.id,
      kind: component.kind,
      name: component.name,
      moveCount: component.moveCount,
      level50MoveCount: component.level50MoveCount,
      focusPunchOwned: component.moves.length === 1 && component.moves[0] === "MOVE_FOCUS_PUNCH",
    })),
  },
  dependencies: {
    templates,
    callbacks,
    tasks,
    resources: {
      HANDS_AND_FEET: { gfx: "gBattleAnimSpriteGfx_HandsAndFeet", palette: "gBattleAnimSpritePal_HandsAndFeet", tag: "ANIM_TAG_HANDS_AND_FEET" },
      IMPACT: { gfx: "gBattleAnimSpriteGfx_Impact", palette: "gBattleAnimSpritePal_Impact", tag: "ANIM_TAG_IMPACT", template: "gBasicHitSplatSpriteTemplate" },
    },
    background: {
      targetOpponent: { id: 4, token: "BG_IMPACT_OPPONENT", tilemap: "gBattleAnimBgTilemap_ImpactOpponent" },
      targetPlayer: { id: 5, token: "BG_IMPACT_PLAYER", tilemap: "gBattleAnimBgTilemap_ImpactPlayer" },
      contest: { id: 6, token: "BG_IMPACT_CONTESTS", tilemap: "gBattleAnimBgTilemap_ImpactContests" },
    },
    paletteMonbgAlphaAudioCleanup: {
      monbg: "monbg ANIM_DEF_PARTNER",
      alpha: "setalpha 12, 8",
      audio: ["SE_M_SWAGGER", "SE_M_VITAL_THROW2", "SE_M_VITAL_THROW2", "SE_M_MEGA_KICK2"],
      cleanup: ["waitforvisualfinish", "restorebg", "waitbgfadein", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "FocusPunchEnd"],
    },
  },
  carrierCensus: {
    level50IndexRange: { first: 110, last: 849 },
    count: carrierCensus.length,
    lowestLegal: carrierCensus[0],
    carriers: carrierCensus,
  },
  controls: {
    distinctPointerBodies: controlIntervals,
    noTransfer: "Mega Punch, Mega Kick, Hyper Fang, Solar Beam, Focus Energy, Endure, and General_FocusPunchSetUp are independent source bodies. Their exact acceptance, target-side branch, impact BG, sprite, palette, audio, timing, latch, framebuffer, or reducer facts grant MOVE_FOCUS_PUNCH no credit.",
  },
  scope: {
    productionChanged: false,
    reducerAdded: false,
    typedSeamAdded: false,
    compositorAdded: false,
    framebufferAcceptance: false,
    latchMeasured: false,
    coveragePromotion: false,
  },
};

console.log(JSON.stringify(sourceAudit, null, 2));
