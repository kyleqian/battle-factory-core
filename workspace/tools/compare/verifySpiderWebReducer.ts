/** Replay MOVE_SPIDER_WEB's retained component rows through its pure reducer.
 *
 * This is deliberately a state/seam verifier.  It consumes the retained dense
 * receipts and normalized bank maps in development only; production imports
 * neither file and this verifier makes no framebuffer or actual-core claim.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  spiderWebAtAge,
  type SpiderWebFrame,
  type SpiderWebLiveInputs,
} from "../../src/animation/spiderWeb.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSpiderWebView,
  type SceneOnSpiderWebConfig,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
type Orientation = "player-back" | "opponent-front";
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (message: string): never => { throw new Error(message); };

const paths: Record<Orientation, Readonly<{ dense: string; map: string }>> = {
  "player-back": {
    dense: "tools/compare/evidence/spider-web-player-dense-state.json.gz",
    map: "tools/compare/fixtures/spider-web-changemap-player.json",
  },
  "opponent-front": {
    dense: "tools/compare/evidence/spider-web-opponent-dense-state.json.gz",
    map: "tools/compare/fixtures/spider-web-changemap-opponent.json",
  },
};

function effects(row: Json): Json[] {
  return row.sprites.filter((sprite: Json) => [
    "gWebThreadSpriteTemplate", "gSpiderWebSpriteTemplate",
    "gSimplePaletteBlendSpriteTemplate",
  ].includes(sprite.template?.symbol));
}

function effectState(row: Json): Json[] {
  return effects(row).map((sprite: Json) => {
    if (sprite.template.symbol === "gWebThreadSpriteTemplate") return {
      kind: "thread", slot: sprite.slot, template: sprite.template.symbol,
      callback: sprite.callback.symbol, x: sprite.x, y: sprite.y, x2: sprite.x2,
      y2: sprite.y2, subpriority: sprite.subpriority, visible: !sprite.invisible,
      matrix: sprite.matrix, data: sprite.data,
    };
    if (sprite.template.symbol === "gSpiderWebSpriteTemplate") return {
      kind: "web", slot: sprite.slot, matrixSlot: sprite.matrixNum,
      template: sprite.template.symbol, callback: sprite.callback.symbol,
      x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      subpriority: sprite.subpriority, visible: !sprite.invisible,
      matrix: sprite.matrix, data: sprite.data,
    };
    return {
      kind: "paletteBlend", slot: sprite.slot, template: sprite.template.symbol,
      callback: sprite.callback.symbol, x: sprite.x, y: sprite.y,
      subpriority: sprite.subpriority, visible: !sprite.invisible,
      selector: "F_PAL_BG", delay: 2,
      initialBlendY: row.scriptOffset === 140 ? 9 : 0,
      targetBlendY: row.scriptOffset === 140 ? 0 : 9,
      color: "RGB_BLACK",
    };
  });
}

function reducedEffects(frame: SpiderWebFrame): Json[] {
  return [...frame.threads, ...(frame.web ? [frame.web] : []),
    ...(frame.paletteBlend ? [frame.paletteBlend] : [])];
}

function taskState(row: Json): Json[] {
  return row.tasks.filter((task: Json) => [
    "Task_UpdateMonBg", "Task_ClearMonBg", "Task_LoopAndPlaySE",
  ].includes(task.func?.symbol)).map((task: Json) => ({
    slot: task.slot, callback: task.func.symbol, data: task.data,
  }));
}

function firstEffect(rows: Json[], template: string): Json {
  const found = rows.flatMap(effects).find((sprite: Json) => sprite.template.symbol === template);
  if (!found) fail(`missing ${template}`);
  return found!;
}

function firstTask(rows: Json[], callback: string): Json {
  const found = rows.flatMap((row) => row.tasks).find((task: Json) => task.func?.symbol === callback);
  if (!found) fail(`missing ${callback}`);
  return found!;
}

function threadSlots(rows: Json[]): number[] {
  const firsts = new Map<number, number>();
  for (const [age, row] of rows.entries()) for (const sprite of effects(row)) {
    if (sprite.template.symbol === "gWebThreadSpriteTemplate" && !firsts.has(sprite.slot)) firsts.set(sprite.slot, age);
  }
  return [...firsts].sort((left, right) => left[1] - right[1]).map(([slot]) => slot);
}

function baseConfig(orientation: Orientation, rows: Json[], spriteOrder: readonly number[]): SceneOnSpiderWebConfig {
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const thread = firstEffect(rows, "gWebThreadSpriteTemplate");
  const web = firstEffect(rows, "gSpiderWebSpriteTemplate");
  const palette = firstEffect(rows, "gSimplePaletteBlendSpriteTemplate");
  const monbg = firstTask(rows, "Task_UpdateMonBg");
  const update = firstTask(rows, "Task_UpdateMonBg");
  const clear = firstTask(rows, "Task_ClearMonBg");
  const loop = firstTask(rows, "Task_LoopAndPlaySE");
  const targetCenter = { x: web.x, y: web.y };
  const animationInputs: Omit<SpiderWebLiveInputs,
    "attackerSide" | "targetSide" | "attackerSpecies" | "targetSpecies"
      | "attackerCenter" | "targetCenter"> = {
    threadOrigin: { x: thread.x, y: thread.y }, threadSpriteSlots: threadSlots(rows),
    paletteSpriteSlot: palette.slot, webSpriteSlot: web.slot,
    webMatrixSlot: web.matrixNum, updateMonBgTaskSlot: update.slot,
    clearMonBgTaskSlot: clear.slot, loopSoundTaskSlot: loop.slot, spriteOrder,
    paletteSubpriority: palette.subpriority, threadSubpriority: thread.subpriority,
    webSubpriority: web.subpriority, baseMatrixBitmap: rows[0]!.resourceAllocators.matrixBitmap,
    monbg: {
      layer: targetSide === "player" ? "bg2" : "bg1", spriteSlot: monbg.data[0],
      spriteX: monbg.data[1], spriteY: monbg.data[2], bgX: monbg.data[3],
      bgY: monbg.data[4], inBg2: Boolean(monbg.data[5]), battlerId: monbg.data[6],
    },
  };
  const attackerCenter = { x: thread.x, y: thread.y };
  return {
    move: "SPIDER_WEB",
    attacker: { species: "SPINARAK", geometry: { side: attackerSide,
      spriteCorner: { x: attackerCenter.x - 32, y: attackerCenter.y - 32 },
      animationCenter: attackerCenter, battlePositionCenter: attackerCenter } },
    target: { species: "ONIX", geometry: { side: targetSide,
      spriteCorner: { x: targetCenter.x - 32, y: targetCenter.y - 32 },
      animationCenter: targetCenter, battlePositionCenter: targetCenter } },
    fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100,
      opponentMaxHp: 100, playerGender: "male", opponentGender: "female" },
    animationInputs,
  };
}

function latchExpectation(age: number): SpiderWebFrame["displayTransfer"] {
  return {
    oam: age === 0 ? "current" : "predecessor",
    matrices: age === 0 ? "current" : "predecessor",
    palette: age === 0 ? "current" : age === 7 ? "same-row-monbg-setup" : "predecessor",
  };
}

function verifyOrientation(orientation: Orientation): Json {
  const path = paths[orientation];
  const rows = (JSON.parse(gunzipSync(readFileSync(path.dense)).toString("utf8")) as Json).frames as Json[];
  const map = JSON.parse(readFileSync(path.map, "utf8")) as Json;
  if (rows.length !== 207 || map.rows.length !== 207) fail(`${orientation}: retained window shape`);
  let reducerRows = 0;
  let seamRows = 0;
  for (let age = 0; age < rows.length; age += 1) {
    const row = rows[age]!;
    const mapRow = map.rows[age]!;
    const config = baseConfig(orientation, rows, row.spriteOrder);
    const input: SpiderWebLiveInputs = {
      ...config.animationInputs,
      attackerSide: config.attacker.geometry.side,
      targetSide: config.target.geometry.side,
      attackerSpecies: config.attacker.species,
      targetSpecies: config.target.species,
      attackerCenter: config.attacker.geometry.animationCenter,
      targetCenter: config.target.geometry.animationCenter,
    };
    const reduced = spiderWebAtAge(age, input);
    const prefix = `${orientation} age ${age}`;
    if (!same([row.scriptOwner, row.scriptOffset, row.scriptWait, row.animScriptActive],
      [reduced.source.owner, reduced.source.offset, reduced.source.wait, reduced.active])) {
      fail(`${prefix}: source cursor drift`);
    }
    if (row.scriptPtr !== reduced.source.pointer || row.scriptPtrParity !== reduced.source.pointerParity) {
      fail(`${prefix}: source pointer drift`);
    }
    if (!same(effectState(row), reducedEffects(reduced))) fail(`${prefix}: sprite reducer drift`);
    if (!same(taskState(row), reduced.tasks)) fail(`${prefix}: task reducer drift`);
    const expectedTags = {
      spiderWebLoaded: row.tileTags.includes(10181), webThreadLoaded: row.tileTags.includes(10180),
      spiderWebTag: row.tileTags.includes(10181) ? 10181 : null,
      webThreadTag: row.tileTags.includes(10180) ? 10180 : null,
      matrixBitmap: row.resourceAllocators.matrixBitmap,
    };
    if (!same(reduced.resources, expectedTags)) fail(`${prefix}: resource reducer drift`);
    const expectedRegisters = {
      bg1hofs: row.registers.bg1hofs, bg1vofs: row.registers.bg1vofs,
      bg2hofs: row.registers.bg2hofs, bg2vofs: row.registers.bg2vofs,
    };
    if (!same(reduced.monbg.registers, expectedRegisters)
      || !same(reduced.registers, { bldcnt: row.registers.bldcnt, bldalpha: row.registers.bldalpha })) {
      fail(`${prefix}: register reducer drift`);
    }
    if (!same(reduced.painterSlots, row.spriteOrder.filter((slot: number) =>
      effects(row).some((sprite: Json) => sprite.slot === slot)))) fail(`${prefix}: live ordering drift`);
    if (!same(reduced.displayTransfer, latchExpectation(age))) fail(`${prefix}: transfer contract drift`);
    if (!same([mapRow.frame, mapRow.owner, mapRow.scriptOffset, mapRow.scriptWait, mapRow.active],
      [row.frame, row.scriptOwner, row.scriptOffset, row.scriptWait, row.animScriptActive])) {
      fail(`${prefix}: normalized map cursor drift`);
    }
    const prior = rows[age - 1];
    const expectedOam = age > 0 && same(row.hardwareOam, prior!.softwareOam);
    const expectedMatrices = age > 0 && same(row.hardwareMatrices, prior!.softwareMatrices);
    const expectedPalette = age > 0 && same(row.hardwarePalette, prior!.fadedPalette);
    if (mapRow.banked.oam.predecessor !== expectedOam
      || mapRow.banked.matrices.predecessor !== expectedMatrices
      || mapRow.banked.palette.predecessor !== expectedPalette) {
      fail(`${prefix}: normalized map latch drift`);
    }
    const stage = createSceneOnMovePresentation(config);
    const view = sceneOnSpiderWebView({ ...stage, age });
    const { attacker: _attacker, target: _target, ...seamState } = view;
    if (!same(reduced, seamState)) fail(`${prefix}: typed Scene-ON seam drift`);
    reducerRows += 1;
    seamRows += 1;
  }
  const final = spiderWebAtAge(206, {
    ...baseConfig(orientation, rows, rows[206]!.spriteOrder).animationInputs,
    attackerSide: orientation === "player-back" ? "player" : "opponent",
    targetSide: orientation === "player-back" ? "opponent" : "player",
    attackerSpecies: "SPINARAK", targetSpecies: "ONIX",
    attackerCenter: { x: 0, y: 0 }, targetCenter: { x: 0, y: 0 },
  });
  if (final.active || !final.firstInactiveCleanup || final.threads.length || final.web
    || final.paletteBlend || final.tasks.length || final.resources.spiderWebLoaded
    || final.resources.webThreadLoaded) fail(`${orientation}: inactive cleanup drift`);
  return {
    reducerRows, seamRows,
    lifecycle: { webThreads: 14, affineWeb: "121..172",
      paletteBlends: ["12..37", "179..204"], monbg: "7..176" },
    latches: { oam: "206/206 predecessor", matrices: "206/206 predecessor",
      palette: "205/206 predecessor; age 7 same-row" },
    cleanup: { age: 206, active: false, framebufferCompared: false },
  };
}

export function verifySpiderWebReducer(): Record<Orientation, Json> {
  return {
    "player-back": verifyOrientation("player-back"),
    "opponent-front": verifyOrientation("opponent-front"),
  };
}

if (import.meta.main) console.log(JSON.stringify(verifySpiderWebReducer(), null, 2));
