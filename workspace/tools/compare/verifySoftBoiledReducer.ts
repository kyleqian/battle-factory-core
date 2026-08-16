import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnSoftBoiledView,
  type SceneOnPresentationBattler,
  type SceneOnSoftBoiledConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  SOFT_BOILED_FRAME_COUNT,
  softBoiledAtAge,
  type SoftBoiledGeometry,
  type SoftBoiledSide,
  type SoftBoiledSprite,
  type SoftBoiledState,
} from "../../src/animation/softBoiled.ts";

type Json = Record<string, any>;
const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/soft-boiled-evidence.json", "utf8",
)) as Json;
const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
const ownedTemplates = new Set([
  "gSoftBoiledEggSpriteTemplate",
  "gThinRingExpandingSpriteTemplate",
  "gHealingBlueStarSpriteTemplate",
]);
const ownedTasks = new Set([
  "AnimTask_ShakeMon_Step", "Task_UpdateMonBg", "Task_ClearMonBg",
]);

function battler(
  side: SoftBoiledSide,
  sprite: Json,
): SceneOnPresentationBattler {
  return {
    species: "CHANSEY",
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y + (side === "player" ? 5 : 7) },
      battlePositionCenter: { x: sprite.x, y: sprite.y },
    },
  };
}

function configFor(
  side: SoftBoiledSide,
  probe: Json,
): SceneOnSoftBoiledConfig {
  const first = probe.frames[0] as Json;
  const attackerSprite = probe.frames[13].battlerSprites.attacker as Json;
  const attacker = battler(side, attackerSprite);
  const fieldProfile = {
    playerHp: first.battlers.player.hp,
    playerMaxHp: first.battlers.player.maxHp,
    opponentHp: first.battlers.opponent.hp,
    opponentMaxHp: first.battlers.opponent.maxHp,
  };
  return {
    move: "SOFT_BOILED",
    attacker,
    target: attacker,
    fieldProfile,
    healingCenter: {
      x: attackerSprite.x,
      y: attackerSprite.y + (side === "player" ? 8 : 0),
    },
  };
}

function actualSpriteShape(sprite: Json): Json {
  return {
    slot: sprite.slot,
    callback: sprite.callback.symbol,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    tileIndex: sprite.attr[2] & 0x3ff,
    animationFrame: sprite.animCmdIndex,
    animationDelayCounter: sprite.animDelayCounter,
    matrix: sprite.matrix,
    data: sprite.data,
    invisible: Boolean(sprite.invisible),
    subpriority: sprite.subpriority,
  };
}

function expectedSpriteShape(sprite: SoftBoiledSprite): Json {
  return {
    slot: sprite.slot,
    callback: sprite.callback,
    x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
    tileIndex: sprite.tileIndex,
    animationFrame: sprite.animationFrame,
    animationDelayCounter: sprite.animationDelayCounter,
    matrix: sprite.matrix,
    data: sprite.data,
    invisible: sprite.invisible,
    subpriority: sprite.subpriority,
  };
}

function compareRow(
  side: SoftBoiledSide,
  row: Json,
  prior: Json | null,
  reduced: SoftBoiledState,
  age: number,
): void {
  if (!same(
    [row.scriptOwner, row.scriptOffset, row.scriptWait, row.animScriptActive],
    [reduced.source.owner, reduced.source.offset, reduced.source.wait, reduced.active],
  )) throw new Error(`${side} source cursor drift at age ${age}`);

  const actualSprites = row.sprites.filter((sprite: Json) =>
    ownedTemplates.has(sprite.template.symbol));
  const actualBySlot = new Map(actualSprites.map((sprite: Json) => [sprite.slot, sprite]));
  const expectedBySlot = new Map(reduced.sprites.map((sprite) => [sprite.slot, sprite]));
  if (!same([...actualBySlot.keys()].sort((a, b) => a - b),
    [...expectedBySlot.keys()].sort((a, b) => a - b))) {
    throw new Error(`${side} sprite topology drift at age ${age}`);
  }
  for (const [slot, expected] of expectedBySlot) {
    const actual = actualBySlot.get(slot);
    if (!actual || !same(actualSpriteShape(actual), expectedSpriteShape(expected))) {
      throw new Error(`${side} sprite slot ${slot} drift at age ${age}`);
    }
  }
  const actualOrder = row.spriteOrder.filter((slot: number) => actualBySlot.has(slot));
  if (!same(actualOrder, reduced.sourceOrder)) {
    throw new Error(`${side} source OAM order drift at age ${age}`);
  }

  const actualTasks = row.tasks.filter((task: Json) =>
    ownedTasks.has(task.func.symbol)).map((task: Json) => ({
      slot: task.slot, priority: task.priority,
      function: task.func.symbol, data: task.data,
    }));
  if (!same(actualTasks, reduced.tasks)) {
    throw new Error(`${side} task lifecycle drift at age ${age}`);
  }

  for (const key of ["bg1hofs", "bg1vofs", "bg2hofs", "bg2vofs",
    "bldcnt", "bldalpha", "bldy"] as const) {
    if (row.registers[key] !== reduced.registers[key]) {
      throw new Error(`${side} register ${key} drift at age ${age}`);
    }
  }
  for (const key of ["gBattle_BG1_X", "gBattle_BG1_Y",
    "gBattle_BG2_X", "gBattle_BG2_Y"] as const) {
    if (row.battleBg[key] !== reduced.battleBg[key]) {
      throw new Error(`${side} battle BG ${key} drift at age ${age}`);
    }
  }
  if (prior && !same(row.bgVramSha256, prior.bgVramSha256)
    !== (reduced.bgVram.transition !== "none")) {
    throw new Error(`${side} BG VRAM transition drift at age ${age}`);
  }

  const expectedTags = reduced.resources.tileTags;
  if (!same(row.allocators.tileTags.filter((tag: number) =>
    [10031, 10202, 10203].includes(tag)), expectedTags)
    || !same(row.allocators.paletteTags.filter((tag: number) =>
      [10031, 10202, 10203].includes(tag)), reduced.resources.paletteTags)) {
    throw new Error(`${side} resource allocator drift at age ${age}`);
  }
  if (row.visualTaskCount !== reduced.visualTaskCount
    || row.soundTaskCount !== reduced.soundTaskCount) {
    throw new Error(`${side} task count drift at age ${age}`);
  }

  const se1 = row.audio.SE1.songHeaderIdentity.symbol as string;
  const se2 = row.audio.SE2.songHeaderIdentity.symbol as string;
  if (reduced.audio.se1.sound !== null && se1 !== reduced.audio.se1.sound) {
    throw new Error(`${side} SE1 drift at age ${age}`);
  }
  if (reduced.audio.se2.sound !== null && se2 !== reduced.audio.se2.sound) {
    throw new Error(`${side} SE2 drift at age ${age}`);
  }
  if (reduced.audio.events.length) {
    for (const event of reduced.audio.events) {
      const channel = row.audio[event.channel];
      if (channel.songHeaderIdentity.symbol !== event.sound
        || !same(channel.tracks.map((track: Json) => track.panX), event.panX)) {
        throw new Error(`${side} audio event drift at age ${age}`);
      }
    }
  }

  if (prior) {
    const animationChanged = row.animationRng !== prior.animationRng;
    if (animationChanged !== reduced.rng.animationAdvances) {
      throw new Error(`${side} animation RNG observation drift at age ${age}`);
    }
    const oamLatch = same(row.hardwareOam, prior.softwareOam);
    const matrixLatch = same(row.hardwareMatrices, prior.softwareMatrices);
    const paletteLatch = same(row.hardwarePalette, prior.fadedPalette);
    if (!oamLatch || !matrixLatch) {
      throw new Error(`${side} OAM/matrix latch drift at age ${age}`);
    }
    if ((paletteLatch ? "preceding-faded" : "mixed-bg-current-obj-preceding")
      !== reduced.palette.hardwareLatch) {
      throw new Error(`${side} palette latch drift at age ${age}`);
    }
  } else if (reduced.palette.hardwareLatch !== "initial") {
    throw new Error(`${side} initial palette latch drift`);
  }
}

const result: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const receipt = fixture.orientations[orientation];
  const probe = JSON.parse(gunzipSync(readFileSync(receipt.denseState)).toString("utf8")) as Json;
  if (probe.frames.length !== SOFT_BOILED_FRAME_COUNT) {
    throw new Error(`${orientation} expected ${SOFT_BOILED_FRAME_COUNT} retained rows`);
  }
  const side: SoftBoiledSide = orientation === "player-back" ? "player" : "opponent";
  const config = configFor(side, probe);
  const stage = createSceneOnMovePresentation(config);
  const geometry: SoftBoiledGeometry = {
    attackerCenter: config.attacker.geometry.animationCenter,
    targetCenter: config.healingCenter,
    battlePositionCenter: config.attacker.geometry.battlePositionCenter,
  };
  let reducerRows = 0;
  let seamRows = 0;
  let oamLatch = 0;
  let matrixLatch = 0;
  let paletteLatch = 0;
  for (let age = 0; age < probe.frames.length; age += 1) {
    const row = probe.frames[age] as Json;
    const reduced = softBoiledAtAge(age, side, geometry);
    const view = sceneOnSoftBoiledView({ ...stage, age });
    const { attacker: _attacker, target: _target, ...seamState } = view;
    if (!same(seamState, reduced)) {
      throw new Error(`${orientation} typed seam drift at age ${age}`);
    }
    compareRow(side, row, age ? probe.frames[age - 1] : null, reduced, age);
    if (age > 0) {
      if (same(row.hardwareOam, probe.frames[age - 1].softwareOam)) oamLatch += 1;
      if (same(row.hardwareMatrices, probe.frames[age - 1].softwareMatrices)) matrixLatch += 1;
      if (same(row.hardwarePalette, probe.frames[age - 1].fadedPalette)) paletteLatch += 1;
    }
    reducerRows += 1;
    seamRows += 1;
  }
  result[orientation] = {
    reducerRows, seamRows,
    latches: { oam: `${oamLatch}/271`, matrices: `${matrixLatch}/271`, palette: `${paletteLatch}/271` },
    cleanup: {
      age: 271,
      active: softBoiledAtAge(271, side, geometry).active,
      ownedSprites: softBoiledAtAge(271, side, geometry).sprites.length,
      ownedTasks: softBoiledAtAge(271, side, geometry).tasks.length,
      moveTags: softBoiledAtAge(271, side, geometry).resources.tileTags,
    },
  };
}

console.log(JSON.stringify(result, null, 2));
