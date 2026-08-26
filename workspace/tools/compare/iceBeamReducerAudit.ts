import { strict as assert } from "node:assert";
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import {
  iceBeamProfileFor,
  iceBeamTimeline,
  type IceBeamFrame,
  type IceBeamOrientation,
} from "../../src/animation/iceBeam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnIceBeamView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

type DenseFrame = any;

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/ice-beam-evidence.json", "utf8"));
const crystalTemplates = new Set([
  "gIceBeamOuterCrystalSpriteTemplate",
  "gIceBeamInnerCrystalSpriteTemplate",
  "gIceCrystalHitLargeSpriteTemplate",
  "gIceCrystalHitSmallSpriteTemplate",
  "gSimplePaletteBlendSpriteTemplate",
]);
const taskCallbacks = [
  "SoundTask_LoopSEAdjustPanning_Step",
  "Task_UpdateMonBg",
  "AnimTask_ShakeMon2_Step",
  "Task_ClearMonBg",
] as const;
const expectedCreations = {
  gIceBeamOuterCrystalSpriteTemplate: [[26, 3], [26, 4], [29, 5], [29, 7], [32, 10], [32, 11], [35, 13], [35, 14], [38, 17], [38, 18], [41, 20], [41, 21], [44, 9], [44, 23], [47, 12], [47, 25], [50, 3], [50, 4], [53, 5], [53, 7], [56, 10], [56, 11], [59, 13], [59, 14]],
  gIceBeamInnerCrystalSpriteTemplate: [[29, 9], [32, 12], [35, 15], [38, 19], [41, 22], [44, 24], [47, 26], [50, 15], [53, 19], [56, 22], [59, 16], [62, 17], [65, 15]],
  gIceCrystalHitLargeSpriteTemplate: [[109, 3], [121, 5], [145, 11]],
  gIceCrystalHitSmallSpriteTemplate: [[115, 4], [127, 7], [133, 9], [139, 10]],
} as const;

export interface IceBeamReducerAuditSummary {
  readonly orientation: IceBeamOrientation;
  readonly rows: number;
  readonly checked: Readonly<{
    readonly sourceRows: number;
    readonly spriteRows: number;
    readonly taskRows: number;
    readonly matrixRows: number;
    readonly registerRows: number;
    readonly orderRows: number;
    readonly seamRows: number;
    readonly paletteRows: number;
    readonly audioRows: number;
  }>;
  readonly lifecycle: Readonly<{
    readonly outer: number;
    readonly inner: number;
    readonly largeHits: number;
    readonly smallHits: number;
  }>;
  readonly latches: Readonly<{
    readonly oam: string;
    readonly matrices: string;
    readonly palette: string;
    readonly monbgShake: string;
  }>;
  readonly gameplay: Readonly<{
    readonly immutable: true;
    readonly gameplayRngTransitions: 0;
    readonly animationRngRows: number;
  }>;
  readonly cleanup: Readonly<{
    readonly age: number;
    readonly active: false;
    readonly sprites: 0;
    readonly tasks: 0;
    readonly resources: false;
  }>;
}

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const fail = (orientation: IceBeamOrientation, age: number, message: string): never => {
  throw new Error(`${orientation} age ${age}: ${message}`);
};

function battler(side: "player" | "opponent", species: SceneOnPresentationBattler["species"]): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: side === "player" ? { x: 32, y: 40 } : { x: 144, y: 8 },
      animationCenter: side === "player" ? { x: 72, y: 88 } : { x: 176, y: 42 },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

function seamRows(
  orientation: IceBeamOrientation,
  profile: ReturnType<typeof iceBeamProfileFor>,
  immutableState: unknown,
): number {
  const playerAttacker = orientation === "player-back";
  const config = {
    move: "ICE_BEAM" as const,
    attacker: battler(playerAttacker ? "player" : "opponent", playerAttacker ? "SURSKIT" : "ONIX"),
    target: battler(playerAttacker ? "opponent" : "player", playerAttacker ? "ONIX" : "SURSKIT"),
    fieldProfile: {
      playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100,
    } satisfies SceneOnDragonRageFieldProfile,
    animationProfile: { ...profile, immutableGameplayState: immutableState },
  };
  const state = createSceneOnMovePresentation(config);
  for (let age = 0; age <= profile.endAge; age += 1) {
    const view = sceneOnIceBeamView({ ...state, age });
    const expected = iceBeamTimeline(config.animationProfile).frames[age]!;
    if (view.age !== age || view.attacker !== config.attacker || view.target !== config.target
      || !same(view.source, expected.source) || !same(view.sprites, expected.sprites)
      || !same(view.tasks, expected.tasks)) fail(orientation, age, "typed Scene-ON seam changed reducer state");
  }
  return profile.endAge + 1;
}

function assertSpriteRow(
  orientation: IceBeamOrientation,
  age: number,
  dense: DenseFrame,
  actual: IceBeamFrame,
): void {
  const expected = dense.sprites
    .filter((sprite: DenseFrame) => crystalTemplates.has(sprite.template?.symbol))
    .sort((left: DenseFrame, right: DenseFrame) => left.slot - right.slot);
  const got = [...actual.sprites].sort((left, right) => left.slot - right.slot);
  if (expected.length !== got.length) fail(orientation, age, `sprite count ${got.length} != ${expected.length}`);
  expected.forEach((sprite: DenseFrame, index: number) => {
    const current = got[index]!;
    const projected = {
      slot: current.slot,
      template: current.template,
      callback: current.callback,
      x: current.x,
      y: current.y,
      x2: current.x2,
      y2: current.y2,
      data: current.data,
      subpriority: current.subpriority,
      invisible: current.invisible,
      animNum: current.animNum,
      animCmdIndex: current.animCmdIndex,
      animDelayCounter: current.animDelayCounter,
      cellTileOffset: current.cellTileOffset,
      matrixNum: current.matrixNum,
      matrix: current.matrix,
    };
    const expectedProjection = {
      slot: sprite.slot,
      template: sprite.template.symbol,
      callback: sprite.callback.symbol,
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      data: sprite.data,
      subpriority: sprite.subpriority,
      invisible: Boolean(sprite.invisible),
      animNum: sprite.animNum,
      animCmdIndex: sprite.animCmdIndex,
      animDelayCounter: sprite.animDelayCounter,
      cellTileOffset: sprite.template.symbol.includes("Large") || sprite.template.symbol.includes("Inner") ? 4 : 6,
      matrixNum: sprite.matrixNum,
      matrix: sprite.matrix,
    };
    if (!same(projected, expectedProjection)) fail(orientation, age, `sprite slot ${sprite.slot} state drifted`);
  });
}

function assertTaskRow(orientation: IceBeamOrientation, age: number, dense: DenseFrame, actual: IceBeamFrame): void {
  const expected = dense.tasks
    .filter((task: DenseFrame) => taskCallbacks.includes(task.func.symbol))
    .sort((left: DenseFrame, right: DenseFrame) => left.slot - right.slot)
    .map((task: DenseFrame) => ({ slot: task.slot, callback: task.func.symbol, data: task.data }));
  const got = [...actual.tasks]
    .sort((left, right) => left.slot - right.slot)
    .map((task) => ({ slot: task.slot, callback: task.callback, data: task.data }));
  if (!same(got, expected)) fail(orientation, age, "task callback/data state drifted");
}

function assertPaletteRow(orientation: IceBeamOrientation, age: number, actual: IceBeamFrame): void {
  const expected = [
    ["opening-bg", 7, 24, 3, 1, "F_PAL_BG", "RGB_BLACK", 27],
    ["target-fade-in", 38, 57, 16, -31, "F_PAL_TARGET", "RGB(0,20,31)", 310],
    ["target-fade-out", 145, 178, 12, 5, "F_PAL_TARGET", "RGB(0,20,31)", 234],
    ["closing-bg", 183, 196, 3, 0, "F_PAL_BG", "RGB_BLACK", 252],
  ] as const;
  if (actual.palette.programs.length !== expected.length) fail(orientation, age, "palette program count drifted");
  expected.forEach(([name, first, last, slot, delay, selector, color, offset], index) => {
    const program = actual.palette.programs[index]!;
    const active = age >= first && age <= last;
    const local = Math.max(0, age - first);
    const coefficient = name === "opening-bg"
      ? Math.min(7, 2 * Math.floor((local + 1) / 3))
      : name === "target-fade-in"
        ? Math.min(7, Math.floor(local / 2))
        : name === "target-fade-out"
          ? Math.max(0, 7 - 2 * Math.floor(local / 7))
          : Math.max(0, 7 - 2 * Math.floor((local + 1) / 2));
    if (program.name !== name || program.slot !== slot || program.delay !== delay || program.selector !== selector
      || program.color !== color || program.active !== active || program.spriteActive !== active
      || program.coefficient !== coefficient) fail(orientation, age, `${name} palette program drifted`);
    if (active && (program.source === null || program.source.offset !== offset)) fail(orientation, age, `${name} source command drifted`);
    if (!active && program.source !== null) fail(orientation, age, `${name} inactive source command leaked`);
  });
  const selected = actual.palette.programs.filter((program) => program.active).map((program) => program.selector);
  const expectedSelected = expected.filter(([, first, last]) => age >= first && age <= last).map((row) => row[5]);
  if (!same(selected, expectedSelected)) fail(orientation, age, "palette selector intent drifted");
}

function assertAudioRow(orientation: IceBeamOrientation, age: number, actual: IceBeamFrame): void {
  const player = orientation === "player-back";
  const active = age >= 26 && age <= 57;
  const local = age - 26;
  const expectedPan = active
    ? Math.max(-64, Math.min(63, (player ? -56 : 55) + (player ? 4 : -4) * local))
    : 0;
  const expectedPlayAges = [26, 36, 46, 56];
  if (actual.audio.loop.songId !== 183 || actual.audio.loop.song !== "se_m_bubble_beam2"
    || actual.audio.loop.active !== active || actual.audio.loop.pan !== expectedPan
    || !same(actual.audio.loop.playAges, expectedPlayAges)
    || actual.audio.loop.startThisRow !== expectedPlayAges.includes(age)) {
    fail(orientation, age, "looped sound program/panning drifted");
  }
  const expectedImpactStarts = [109, 115, 121, 127, 133, 139, 145].map((impactAge) => ({
    age: impactAge, song: "se_icy_wind", pan: player ? 63 : -63,
  }));
  if (!same(actual.audio.impactStarts, expectedImpactStarts)) fail(orientation, age, "impact sound program/panning drifted");
}

function creationRows(denseFrames: readonly DenseFrame[], template: string): readonly (readonly [number, number])[] {
  const result: [number, number][] = [];
  let previous = new Set<number>();
  denseFrames.forEach((row, age) => {
    const current = new Set<number>(row.sprites
      .filter((sprite: DenseFrame) => sprite.template?.symbol === template)
      .map((sprite: DenseFrame) => sprite.slot));
    current.forEach((slot) => { if (!previous.has(slot)) result.push([age, slot]); });
    previous = current;
  });
  return result;
}

function assertMonbgLatches(orientation: IceBeamOrientation, denseFrames: readonly DenseFrame[]): void {
  const hofsName = orientation === "player-back" ? "bg1hofs" : "bg2hofs";
  const base = orientation === "player-back" ? 368 : 472;
  const sourceEdges = denseFrames.flatMap((row, age) => age === 0 || row.battlerSprites.target.x2 !== denseFrames[age - 1].battlerSprites.target.x2
    ? [[age, row.battlerSprites.target.x2]] : []);
  const displayEdges = denseFrames.flatMap((row, age) => age === 0 || row.registers[hofsName] !== denseFrames[age - 1].registers[hofsName]
    ? [[age, row.registers[hofsName]]] : []);
  const expectedSource = [[0, 0], ...Array.from({ length: 24 }, (_, index) => [38 + index * 2, index % 2 === 0 ? -2 : 2]), [86, 0]];
  const expectedDisplay = [[0, 0], [2, base], ...Array.from({ length: 24 }, (_, index) => [39 + index * 2, base + (index % 2 === 0 ? 2 : -2)]), [87, base], [202, 0]];
  assert.deepEqual(sourceEdges, expectedSource, `${orientation}: source target x2 latch`);
  assert.deepEqual(displayEdges, expectedDisplay, `${orientation}: monbg display latch`);
}

export function verifyIceBeamReducer(orientation: IceBeamOrientation): IceBeamReducerAuditSummary {
  const entry = fixture.orientations[orientation];
  const dense = JSON.parse(gunzipSync(readFileSync(entry.denseState)).toString("utf8"));
  const denseFrames = dense.frames as DenseFrame[];
  assert.equal(denseFrames.length, 203, `${orientation}: expected 203 retained rows`);
  const immutable = JSON.stringify(denseFrames[0]!.immutableState);
  const parties = JSON.stringify(denseFrames[0]!.parties);
  const profile = iceBeamProfileFor(orientation, {
    gameplayRng: denseFrames[0]!.immutableState.rngValue,
    immutableGameplayState: denseFrames[0]!.immutableState,
  });
  const timeline = iceBeamTimeline(profile);
  assert.equal(timeline.frames.length, 203, `${orientation}: reducer row count`);
  let sourceRows = 0;
  let spriteRows = 0;
  let taskRows = 0;
  let matrixRows = 0;
  let registerRows = 0;
  let orderRows = 0;
  let paletteRows = 0;
  let audioRows = 0;
  let oamLatch = 0;
  let matrixLatch = 0;
  let paletteLatch = 0;
  const sourceOwnerCounts: Record<string, number> = {};
  const animationValues = new Set<number>();
  for (let age = 0; age < denseFrames.length; age += 1) {
    const denseFrame = denseFrames[age]!;
    if (JSON.stringify(denseFrame.immutableState) !== immutable || JSON.stringify(denseFrame.parties) !== parties) fail(orientation, age, "immutable gameplay/party state changed");
    const actual = timeline.frames[age]!;
    if (actual.active !== denseFrame.animScriptActive
      || actual.source.owner !== denseFrame.scriptOwner
      || actual.source.offset !== denseFrame.scriptOffset
      || actual.source.pointer !== denseFrame.scriptPtr
      || actual.source.pointerParity !== (denseFrame.scriptPtr & 1)
      || actual.source.wait !== denseFrame.scriptWait
      || !same(actual.source.args, denseFrame.animArgs)) fail(orientation, age, "source pointer/owner/cursor/args drifted");
    sourceRows += 1;
    sourceOwnerCounts[actual.source.owner] = (sourceOwnerCounts[actual.source.owner] ?? 0) + 1;
    assertSpriteRow(orientation, age, denseFrame, actual);
    spriteRows += 1;
    assertTaskRow(orientation, age, denseFrame, actual);
    taskRows += 1;
    assertPaletteRow(orientation, age, actual);
    paletteRows += 1;
    assertAudioRow(orientation, age, actual);
    audioRows += 1;
    if (!same(actual.matrices, denseFrame.softwareMatrices)) fail(orientation, age, "affine matrix register state drifted");
    matrixRows += 1;
    const relevantRegisters = ["bg1cnt", "bg2cnt", "bg1hofs", "bg1vofs", "bg2hofs", "bg2vofs", "bldcnt", "bldalpha"] as const;
    if (!relevantRegisters.every((key) => actual.registers[key] === denseFrame.registers[key])) fail(orientation, age, "monbg/blend register intent drifted");
    registerRows += 1;
    if (!same(actual.order.fullSourceOrder, denseFrame.spriteOrder)
      || !same(actual.order.fullPainterOrder, [...denseFrame.spriteOrder].reverse())) fail(orientation, age, "source painter order drifted");
    orderRows += 1;
    if (age > 0 && same(denseFrame.hardwareOam, denseFrames[age - 1]!.softwareOam)) oamLatch += 1;
    if (age > 0 && same(denseFrame.hardwareMatrices, denseFrames[age - 1]!.softwareMatrices)) matrixLatch += 1;
    if (age > 0 && same(denseFrame.hardwarePalette, denseFrames[age - 1]!.fadedPalette)) paletteLatch += 1;
    if (actual.visualTaskCount !== denseFrame.visualTaskCount || actual.soundTaskCount !== denseFrame.soundTaskCount) fail(orientation, age, "visual/sound task count drifted");
    if (actual.targetMonbg.targetX2 !== denseFrame.battlerSprites.target.x2
      || actual.targetMonbg.displayedHofs !== denseFrame.registers[orientation === "player-back" ? "bg1hofs" : "bg2hofs"]) fail(orientation, age, "target-monbg source/display transfer drifted");
    const loaded = denseFrame.tileTags.includes(10141) && denseFrame.paletteTags.includes(10141);
    const freed = age >= 202;
    if (actual.resources.loaded !== loaded || actual.resources.freed !== freed) fail(orientation, age, "tag/resource lifetime drifted");
    if (actual.animationRng !== denseFrame.animationRng) fail(orientation, age, "animation RNG sequence drifted");
    if (actual.gameplay.rng !== denseFrame.immutableState.rngValue
      || actual.gameplay.changed !== false
      || !same(actual.gameplay.immutableState, denseFrame.immutableState)) fail(orientation, age, "gameplay RNG/state pass-through mutated");
    animationValues.add(actual.animationRng);
  }
  assert.deepEqual(sourceOwnerCounts, { Move_ICE_BEAM: 134, IceBeamCreateCrystals: 33, IceCrystalEffectShort: 36 }, `${orientation}: source ownership counts`);
  (Object.keys(expectedCreations) as (keyof typeof expectedCreations)[]).forEach((template) => {
    assert.deepEqual(creationRows(denseFrames, template), expectedCreations[template], `${orientation}: ${template} allocator rows`);
  });
  assertMonbgLatches(orientation, denseFrames);
  assert.equal(oamLatch, 202, `${orientation}: OAM predecessor transfer`);
  assert.equal(matrixLatch, 202, `${orientation}: matrix predecessor transfer`);
  assert.equal(paletteLatch, 201, `${orientation}: palette predecessor transfer`);
  assert.deepEqual(denseFrames.flatMap((row, age) => age > 0 && !same(row.hardwarePalette, denseFrames[age - 1]!.fadedPalette) ? [age] : []), [1], `${orientation}: palette age-one exception`);
  assert.equal(animationValues.size, 201, `${orientation}: animation RNG rows`);
  const seamChecked = seamRows(orientation, profile, denseFrames[0]!.immutableState);
  const cleanup = timeline.frames[202]!;
  assert.equal(cleanup.active, false);
  assert.equal(cleanup.sprites.length, 0);
  assert.equal(cleanup.tasks.length, 0);
  assert.equal(cleanup.resources.loaded, false);
  return {
    orientation,
    rows: denseFrames.length,
    checked: { sourceRows, spriteRows, taskRows, matrixRows, registerRows, orderRows, seamRows: seamChecked, paletteRows, audioRows },
    lifecycle: { outer: 24, inner: 13, largeHits: 3, smallHits: 4 },
    latches: { oam: "202/202 RAM+1", matrices: "202/202 RAM+1", palette: "201/202 RAM+1; age 1 pre-animation exception", monbgShake: "source 38..86 -> display 39..87 RAM+1" },
    gameplay: { immutable: true, gameplayRngTransitions: 0, animationRngRows: animationValues.size },
    cleanup: { age: 202, active: false, sprites: 0, tasks: 0, resources: false },
  };
}

if (process.argv[1]?.endsWith("iceBeamReducerAudit.ts")) {
  console.log(JSON.stringify({
    "player-back": verifyIceBeamReducer("player-back"),
    "opponent-front": verifyIceBeamReducer("opponent-front"),
  }, null, 2));
}
