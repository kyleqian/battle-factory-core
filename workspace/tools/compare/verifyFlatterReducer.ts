/** Hermetic reducer/seam replay for MOVE_FLATTER's retained bilateral rows. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  FLATTER_CONFETTI_TAG,
  FLATTER_FIRST_INACTIVE_AGE,
  FLATTER_SPOTLIGHT_TAG,
  flatterAtAge,
  type FlatterLiveInputs,
  type FlatterState,
} from "../../src/animation/flatter.ts";
import {
  sceneOnFlatterView,
  type SceneOnFlatterPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type FlatterOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const digest = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_FLATTER reducer drift: ${message}`);
}

const speciesName: Readonly<Record<number, string>> = { 30: "NIDORINA", 95: "ONIX" };

function rowsFor(orientation: FlatterOrientation): Json[] {
  const stem = orientation === "player-back" ? "player" : "opponent";
  const file = resolve(root, `tools/compare/evidence/flatter-${stem}-dense-state.json.gz`);
  return (JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as Json).frames;
}

function owned(rows: readonly Json[], age: number, template: string): Json[] {
  return rows[age]!.sprites.filter((sprite: Json) => sprite.template?.symbol === template);
}

function art(row: Json, role: "attacker" | "target"): FlatterLiveInputs["attackerArt"] {
  const sprite = row.battlerSprites[role];
  return {
    slot: sprite.slot,
    attr: [sprite.attr[0], sprite.attr[1], sprite.attr[2]],
    subpriority: sprite.subpriority,
    matrixNum: sprite.matrixNum,
    matrix: [sprite.matrix[0], sprite.matrix[1], sprite.matrix[2], sprite.matrix[3]],
  };
}

function allocationRows(rows: readonly Json[]): FlatterLiveInputs["confetti"] {
  const lives = new Map<number, { start: number; end: number; first: Json }>();
  for (let age = 0; age < rows.length; age += 1) {
    const current = new Map(owned(rows, age, "gFlatterConfettiSpriteTemplate").map((sprite: Json) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) {
      const life = lives.get(slot);
      if (life === undefined) lives.set(slot, { start: age, end: age, first: sprite });
      else life.end = age;
    }
  }
  return [...lives.entries()].sort((a, b) => a[1].start - b[1].start || a[0] - b[0]).map(([slot, life]) => {
    const initializedRow = rows.slice(life.start, life.end + 1)
      .map((row, index) => ({ age: life.start + index, sprite: owned([row], 0, "gFlatterConfettiSpriteTemplate")
        .find((sprite: Json) => sprite.slot === slot && sprite.callback?.symbol === "AnimFlatterConfetti_Step") }))
      .find((entry) => entry.sprite !== undefined);
    invariant(initializedRow?.sprite, `confetti slot ${slot}: initialized state`);
    const observed = initializedRow.sprite;
    const steps = initializedRow.age < 67 ? 0 : Math.min(30, Math.max(1, initializedRow.age - 67));
    invariant(steps <= 1, `confetti slot ${slot}: reconstructable initialized state`);
    const initialized = steps === 0 ? observed : {
      ...observed,
      x2: observed.x2 - (observed.data[2] === 0 ? 1 : -1) * ((observed.data[0] + 22) >> 8),
      y2: observed.y2 + ((observed.data[1] + 48) >> 8),
      data: [observed.data[0] + 22, observed.data[1] + 48, observed.data[2], observed.data[3] - 1,
        ...observed.data.slice(4)],
    };
    const fields = (sprite: Json) => ({
      x: sprite.x,
      y: sprite.y,
      x2: sprite.x2,
      y2: sprite.y2,
      data: sprite.data,
      flags: sprite.flags,
    });
    return {
      slot,
      start: life.start,
      end: life.end,
      initial: {
        ...fields(life.first),
        callback: life.first.callback.symbol === "AnimFlatterConfetti"
          ? "AnimFlatterConfetti" as const : "AnimFlatterConfetti_Step" as const,
      },
      initialized: { ...fields(initialized), callback: "AnimFlatterConfetti_Step" as const },
    };
  }) as FlatterLiveInputs["confetti"];
}

function stableSlots(rows: readonly Json[]): Readonly<{
  spotlight: FlatterLiveInputs["spotlight"];
  verticalDipSlots: readonly [number, number];
  task: number;
}> {
  const spotlight = owned(rows, 49, "gFlatterSpotlightSpriteTemplate")[0]!;
  const dips = [owned(rows, 51, "gVerticalDipSpriteTemplate")[0]!.slot,
    owned(rows, 63, "gVerticalDipSpriteTemplate").find((entry: Json) => entry.slot !== owned(rows, 63, "gVerticalDipSpriteTemplate")[0]!.slot)!.slot] as const;
  const fade = rows[7]!.tasks.find((task: Json) => task.func?.symbol === "AnimTask_HardwarePaletteFade_Step");
  invariant(fade, "missing HardwarePaletteFade allocation");
  return {
    spotlight: { slot: spotlight.slot, attr: spotlight.attr, subpriority: spotlight.subpriority, matrixNum: spotlight.matrixNum },
    verticalDipSlots: dips,
    task: fade.slot,
  };
}

function inputFor(
  orientation: FlatterOrientation,
  rows: readonly Json[],
  age: number,
): FlatterLiveInputs {
  const first = rows[0]!, row = rows[age]!, slots = stableSlots(rows);
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const spotlight = owned(rows, 49, "gFlatterSpotlightSpriteTemplate")[0]!;
  const dip = owned(rows, 51, "gVerticalDipSpriteTemplate")[0]!;
  const resource = (tag: number, preferredAge: number): number | null => {
    const index = rows[preferredAge]!.paletteTags.indexOf(tag);
    return index >= 0 ? index : null;
  };
  const paletteSlot = resource(FLATTER_SPOTLIGHT_TAG, 1);
  const confettiPaletteSlot = resource(FLATTER_CONFETTI_TAG, 4);
  const tileSlot = (tag: number, preferredAge: number): number | null => {
    const index = rows[preferredAge]!.tileTags.indexOf(tag);
    return index >= 0 ? index : null;
  };
  return {
    attackerSide,
    targetSide,
    attackerSpecies: speciesName[first.parties[attackerSide][0].species] ?? "NIDORINA",
    targetSpecies: speciesName[first.parties[targetSide][0].species] ?? "ONIX",
    attackerCenter: { x: first.battlerSprites.attacker.x, y: first.battlerSprites.attacker.y },
    targetCenter: { x: spotlight.x, y: spotlight.y + 8 },
    targetSpriteOrigin: { x: dip.x, y: dip.y },
    attackerInitialOffset: { x2: first.battlerSprites.attacker.x2, y2: first.battlerSprites.attacker.y2 },
    targetInitialOffset: { x2: first.battlerSprites.target.x2, y2: first.battlerSprites.target.y2 },
    attackerArt: art(row, "attacker"),
    targetArt: art(row, "target"),
    spotlight: slots.spotlight,
    verticalDipSlots: slots.verticalDipSlots,
    confetti: allocationRows(rows),
    taskSlots: { hardwarePaletteFade: slots.task },
    spriteOrder: row.spriteOrder,
    buffers: {
      softwareOam: row.softwareOam,
      hardwareOam: row.hardwareOam,
      softwareMatrices: row.softwareMatrices,
      hardwareMatrices: row.hardwareMatrices,
    },
    palette: { unfaded: row.unfadedPalette, faded: row.fadedPalette, hardware: row.hardwarePalette },
    registers: row.registers,
    resources: {
      spotlightTag: FLATTER_SPOTLIGHT_TAG,
      confettiTag: FLATTER_CONFETTI_TAG,
      spotlightTileSlot: tileSlot(FLATTER_SPOTLIGHT_TAG, 1),
      spotlightPaletteSlot: paletteSlot,
      confettiTileSlot: tileSlot(FLATTER_CONFETTI_TAG, 4),
      confettiPaletteSlot,
      allocator: row.resourceAllocators,
    },
    audio: {
      current: row.audio,
      attackerPan: attackerSide === "player" ? -64 : 63,
      targetPan: targetSide === "player" ? -63 : 63,
    },
    liveCounts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount, matrixBitmap: row.resourceAllocators.matrixBitmap },
    animationRng: row.animationRng,
    gameplayRng: row.rawBattleState.gameplayRng,
    gameplayState: row.immutableState,
  };
}

/** Build a retained Scene-ON live snapshot for focused reducer/seam controls. */
export function flatterInputsFor(
  orientation: FlatterOrientation,
  age: number,
): FlatterLiveInputs {
  const rows = rowsFor(orientation);
  invariant(rows[age], `${orientation}/${age}: retained row`);
  return inputFor(orientation, rows, age);
}

/** Build the narrow typed seam config from caller-owned live animation inputs. */
export function flatterConfigFor(
  orientation: FlatterOrientation,
  age: number,
  input = flatterInputsFor(orientation, age),
): SceneOnFlatterPresentationState["config"] {
  const {
    attackerSide,
    targetSide,
    attackerSpecies,
    targetSpecies,
    attackerCenter,
    targetCenter,
    ...animationInputs
  } = input;
  return {
    move: "FLATTER",
    attacker: {
      species: attackerSpecies as never,
      geometry: {
        side: attackerSide,
        spriteCorner: { x: attackerCenter.x - 32, y: attackerCenter.y - 32 },
        animationCenter: attackerCenter,
        battlePositionCenter: attackerCenter,
      },
    },
    target: {
      species: targetSpecies as never,
      geometry: {
        side: targetSide,
        spriteCorner: { x: targetCenter.x - 32, y: targetCenter.y - 32 },
        animationCenter: targetCenter,
        battlePositionCenter: targetCenter,
      },
    },
    fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100 },
    animationInputs,
  } as SceneOnFlatterPresentationState["config"];
}

function compact(state: FlatterState): unknown {
  return {
    age: state.age,
    active: state.active,
    source: state.source,
    args: state.animArgs,
    battlers: { attacker: state.battlers.attacker, target: state.battlers.target },
    spotlight: state.spotlight,
    verticalDips: state.verticalDips,
    confetti: state.confetti,
    tasks: state.tasks,
    lifecycle: state.lifecycle,
    registers: state.registers,
    audio: state.audio,
    resources: state.resources,
    painterOrder: state.painterOrder,
    buffers: state.buffers,
    palette: state.palette,
    rng: state.rng,
    gameplay: state.gameplay,
    displayTransfer: state.displayTransfer,
    cleanup: state.cleanup,
  };
}

function spriteCallback(sprite: Json): string {
  return sprite.callback?.symbol;
}

function assertSpotlight(
  orientation: FlatterOrientation,
  age: number,
  state: FlatterState,
  sprites: readonly Json[],
): void {
  invariant((state.spotlight ? 1 : 0) === sprites.length, `${orientation}/${age}: spotlight lifecycle`);
  if (!state.spotlight) return;
  const actual = sprites[0]!;
  invariant(same({
    slot: state.spotlight.slot,
    callback: state.spotlight.callback,
    x: state.spotlight.x,
    y: state.spotlight.y,
    x2: state.spotlight.x2,
    y2: state.spotlight.y2,
    flags: state.spotlight.flags,
    matrixNum: state.spotlight.matrixNum,
    matrix: state.spotlight.matrix,
    data: state.spotlight.data,
  }, {
    slot: actual.slot,
    callback: spriteCallback(actual),
    x: actual.x,
    y: actual.y,
    x2: actual.x2,
    y2: actual.y2,
    flags: actual.flags,
    matrixNum: actual.matrixNum,
    matrix: actual.matrix,
    data: actual.data,
  }), `${orientation}/${age}: exact spotlight state`);
  invariant(state.spotlight.template === actual.template?.symbol
    && state.spotlight.phase === actual.data[1]
    && state.spotlight.localAge === age - 49
    && state.spotlight.displayedAge === age + 1, `${orientation}/${age}: spotlight source phase`);
}

function assertVerticalDips(
  orientation: FlatterOrientation,
  age: number,
  input: FlatterLiveInputs,
  state: FlatterState,
  sprites: readonly Json[],
): void {
  invariant(state.verticalDips.length === sprites.length, `${orientation}/${age}: VerticalDip lifecycle`);
  for (const dip of state.verticalDips) {
    const actual = sprites.find((sprite) => sprite.slot === dip.slot);
    invariant(actual, `${orientation}/${age}: VerticalDip slot ${dip.slot}`);
    invariant(same({
      callback: dip.callback,
      x: dip.x,
      y: dip.y,
      x2: dip.x2,
      y2: dip.y2,
      data: dip.data,
    }, {
      callback: spriteCallback(actual),
      x: actual.x,
      y: actual.y,
      x2: actual.x2,
      y2: actual.y2,
      data: actual.data,
    }), `${orientation}/${age}: exact VerticalDip slot ${dip.slot}`);
    const index = input.verticalDipSlots.indexOf(dip.slot);
    const start = index === 0 ? 51 : 63;
    const end = index === 0 ? 63 : 78;
    invariant(index >= 0 && dip.template === actual.template?.symbol
      && dip.start === start && dip.end === end && dip.localAge === age - start,
    `${orientation}/${age}: VerticalDip source metadata slot ${dip.slot}`);
  }
}

function assertConfetti(
  orientation: FlatterOrientation,
  age: number,
  input: FlatterLiveInputs,
  state: FlatterState,
  sprites: readonly Json[],
): void {
  invariant(state.confetti.length === sprites.length, `${orientation}/${age}: confetti lifecycle`);
  for (const confetti of state.confetti) {
    const actual = sprites.find((sprite) => sprite.slot === confetti.slot);
    invariant(actual, `${orientation}/${age}: confetti slot ${confetti.slot}`);
    invariant(same({
      callback: confetti.callback,
      x: confetti.x,
      y: confetti.y,
      x2: confetti.x2,
      y2: confetti.y2,
      flags: confetti.flags,
      data: confetti.data,
    }, {
      callback: spriteCallback(actual),
      x: actual.x,
      y: actual.y,
      x2: actual.x2,
      y2: actual.y2,
      flags: actual.flags,
      data: actual.data,
    }), `${orientation}/${age}: exact confetti slot ${confetti.slot}`);
    const allocation = input.confetti.find((entry) => entry.slot === confetti.slot);
    invariant(allocation && confetti.template === actual.template?.symbol
      && confetti.localAge === age - allocation.start,
    `${orientation}/${age}: confetti source metadata slot ${confetti.slot}`);
  }
}

function actualLifecycle(rows: readonly Json[]): unknown {
  const ages = (template: string) => rows.flatMap((_, age) => owned(rows, age, template).length ? [age] : []);
  const spotlight = ages("gFlatterSpotlightSpriteTemplate");
  const dips = rows.flatMap((_, age) => owned(rows, age, "gVerticalDipSpriteTemplate")
    .filter((sprite: Json) => !rows.slice(0, age).some((row) => row.sprites.some((prior: Json) => prior.slot === sprite.slot
      && prior.template?.symbol === "gVerticalDipSpriteTemplate"))).map(() => age));
  const confetti = allocationRows(rows);
  const starts = confetti.reduce<Record<number, number>>((counts, entry) => {
    counts[entry.start] = (counts[entry.start] ?? 0) + 1;
    return counts;
  }, {});
  return {
    spotlight: { start: Math.min(...spotlight), end: Math.max(...spotlight) },
    verticalDipStarts: dips,
    confettiStarts: starts,
    confettiEnd: Math.max(...confetti.map((entry) => entry.end)),
    firstInactive: rows.findIndex((row) => !row.animScriptActive),
  };
}

function assertDisplayTransfer(
  orientation: FlatterOrientation,
  rows: readonly Json[],
  age: number,
  state: FlatterState,
): void {
  if (age === 0) {
    invariant(same(state.displayTransfer, {
      oam: "initial", matrices: "initial", palette: "initial", registers: "current-source",
    }), `${orientation}/${age}: initial transfer`);
    return;
  }
  const row = rows[age]!, previous = rows[age - 1]!;
  invariant(same(row.hardwareOam, previous.softwareOam), `${orientation}/${age}: retained OAM transfer`);
  invariant(same(row.hardwarePalette, previous.fadedPalette), `${orientation}/${age}: retained palette transfer`);
  const matrixSource = rows[age === 68 ? age - 2 : age - 1]!.softwareMatrices;
  invariant(same(row.hardwareMatrices, matrixSource), `${orientation}/${age}: retained matrix transfer`);
  invariant(same(state.displayTransfer, {
    oam: "preceding-software",
    matrices: age === 68 ? "two-frame-spotlight-edge" : "preceding-software",
    palette: "preceding-faded",
    registers: "current-source",
  }), `${orientation}/${age}: transfer latch`);
}

function compareRow(orientation: FlatterOrientation, rows: readonly Json[], age: number): void {
  const row = rows[age]!, input = inputFor(orientation, rows, age), state = flatterAtAge(age, input);
  invariant(state.age === age && state.active === row.animScriptActive, `${orientation}/${age}: active age`);
  invariant(state.source.owner === row.scriptOwner && state.source.pointer === row.scriptPtr
    && state.source.pointerOffset === row.scriptOffset && state.source.active === row.animScriptActive
    && state.source.wait === row.scriptWait, `${orientation}/${age}: source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: source args`);
  invariant(same(state.battlers.attacker.offset, { x2: row.battlerSprites.attacker.x2, y2: row.battlerSprites.attacker.y2 })
    && same(state.battlers.target.offset, { x2: row.battlerSprites.target.x2, y2: row.battlerSprites.target.y2 }), `${orientation}/${age}: battler axes`);
  invariant(state.battlers.attacker.side === input.attackerSide
    && state.battlers.target.side === input.targetSide
    && state.battlers.attacker.species === input.attackerSpecies
    && state.battlers.target.species === input.targetSpecies
    && same(state.battlers.attacker.center, input.attackerCenter)
    && same(state.battlers.target.center, input.targetCenter)
    && same(state.battlers.attacker.art, art(row, "attacker"))
    && same(state.battlers.target.art, art(row, "target")), `${orientation}/${age}: exact battler inputs`);
  const spotlight = owned(rows, age, "gFlatterSpotlightSpriteTemplate");
  const dips = owned(rows, age, "gVerticalDipSpriteTemplate");
  const confetti = owned(rows, age, "gFlatterConfettiSpriteTemplate");
  assertSpotlight(orientation, age, state, spotlight);
  assertVerticalDips(orientation, age, input, state, dips);
  assertConfetti(orientation, age, input, state, confetti);
  const fadeTasks = row.tasks.filter((task: Json) => task.func?.symbol === "AnimTask_HardwarePaletteFade_Step");
  invariant(state.tasks.length === fadeTasks.length, `${orientation}/${age}: fade lifecycle`);
  for (const task of state.tasks) {
    const actual = fadeTasks.find((entry: Json) => entry.slot === task.slot);
    invariant(actual && task.callback === actual.func.symbol && same(task.data, actual.data), `${orientation}/${age}: exact fade task`);
    const restore = age >= 176;
    invariant(task.role === (restore ? "restore-battle" : "fade-to-dark")
      && task.start === (restore ? 176 : 7) && task.end === (restore ? 216 : 47)
      && same(task.args, row.animArgs.slice(0, 5)), `${orientation}/${age}: fade task source metadata`);
  }
  invariant(same(state.lifecycle, actualLifecycle(rows)), `${orientation}/${age}: retained lifecycle`);
  const tileSlot = (tag: number) => row.tileTags.indexOf(tag);
  const paletteSlot = (tag: number) => row.paletteTags.indexOf(tag);
  const spotlightTileSlot = tileSlot(FLATTER_SPOTLIGHT_TAG);
  const spotlightPaletteSlot = paletteSlot(FLATTER_SPOTLIGHT_TAG);
  const confettiTileSlot = tileSlot(FLATTER_CONFETTI_TAG);
  const confettiPaletteSlot = paletteSlot(FLATTER_CONFETTI_TAG);
  invariant(same(state.resources, {
    spotlightLoaded: spotlightTileSlot >= 0 && spotlightPaletteSlot >= 0,
    confettiLoaded: confettiTileSlot >= 0 && confettiPaletteSlot >= 0,
    spotlightTag: spotlightTileSlot >= 0 && spotlightPaletteSlot >= 0 ? FLATTER_SPOTLIGHT_TAG : null,
    confettiTag: confettiTileSlot >= 0 && confettiPaletteSlot >= 0 ? FLATTER_CONFETTI_TAG : null,
    spotlightTileSlot: spotlightTileSlot >= 0 ? spotlightTileSlot : null,
    spotlightPaletteSlot: spotlightPaletteSlot >= 0 ? spotlightPaletteSlot : null,
    confettiTileSlot: confettiTileSlot >= 0 ? confettiTileSlot : null,
    confettiPaletteSlot: confettiPaletteSlot >= 0 ? confettiPaletteSlot : null,
    matrixBitmap: row.resourceAllocators.matrixBitmap,
    allocator: row.resourceAllocators,
  }), `${orientation}/${age}: exact resources and allocator`);
  invariant(same(state.registers, row.registers)
    && same(state.painterOrder, row.spriteOrder)
    && same(state.buffers, {
      softwareOam: row.softwareOam,
      hardwareOam: row.hardwareOam,
      softwareMatrices: row.softwareMatrices,
      hardwareMatrices: row.hardwareMatrices,
    }) && same(state.palette, {
      unfaded: row.unfadedPalette, faded: row.fadedPalette, hardware: row.hardwarePalette,
    }), `${orientation}/${age}: exact caller-owned display state`);
  invariant(same(state.audio.events, age === 7 ? [{ channel: "SE2", sound: "SE_M_ENCORE2", pan: input.audio.targetPan }]
    : age === 65 ? [{ channel: "SE1", sound: "SE_M_FLATTER", pan: input.audio.attackerPan }]
      : age === 75 ? [{ channel: "SE1", sound: "SE_M_FLATTER", pan: input.audio.targetPan }] : []), `${orientation}/${age}: audio`);
  for (const event of state.audio.events) {
    const channel = row.audio[event.channel];
    const symbol = event.sound === "SE_M_ENCORE2" ? "se_m_encore2" : "se_m_flatter";
    invariant(channel.songHeaderIdentity?.symbol === symbol
      && channel.tracks[0]?.panX === event.pan
      && (channel.tracks[0]?.flags & 3) === 3, `${orientation}/${age}: exact audio start`);
  }
  invariant(same(state.audio.live, row.audio) && state.rng.animation === row.animationRng,
    `${orientation}/${age}: caller-owned audio and animation RNG`);
  invariant(state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && same(state.gameplay, row.immutableState), `${orientation}/${age}: gameplay opacity`);
  const firstInactive = age === FLATTER_FIRST_INACTIVE_AGE;
  invariant(same(state.cleanup, {
    firstInactive,
    visualTasks: row.visualTaskCount,
    soundTasks: row.soundTaskCount,
    ownedTasks: fadeTasks.length,
    ownedSprites: spotlight.length + dips.length + confetti.length,
    resourcesReleased: firstInactive && spotlightTileSlot < 0 && spotlightPaletteSlot < 0
      && confettiTileSlot < 0 && confettiPaletteSlot < 0,
  }), `${orientation}/${age}: exact cleanup`);
  assertDisplayTransfer(orientation, rows, age, state);
  const seam = sceneOnFlatterView({ age, config: flatterConfigFor(orientation, age, input) } as SceneOnFlatterPresentationState);
  const { attacker: _attacker, target: _target, ...seamState } = seam;
  invariant(same(compact(seamState), compact(state)), `${orientation}/${age}: typed seam`);
}

function replay(orientation: FlatterOrientation) {
  const rows = rowsFor(orientation);
  invariant(rows.length === FLATTER_FIRST_INACTIVE_AGE + 1, `${orientation}: complete retained window`);
  for (let pass = 0; pass < 2; pass += 1) for (let age = 0; age < rows.length; age += 1) compareRow(orientation, rows, age);
  const reducer = rows.map((_, age) => compact(flatterAtAge(age, inputFor(orientation, rows, age))));
  const seam = rows.map((_, age) => {
    const input = inputFor(orientation, rows, age);
    const state = sceneOnFlatterView({ age, config: flatterConfigFor(orientation, age, input) } as SceneOnFlatterPresentationState);
    const { attacker: _attacker, target: _target, ...view } = state;
    return compact(view);
  });
  invariant(same(reducer, seam), `${orientation}: complete seam equality`);
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, reducerSha256: digest(reducer), seamSha256: digest(seam), framebufferCompared: false, coverageCredit: false };
}

export function verifyFlatterReducer() {
  const result = { "player-back": replay("player-back"), "opponent-front": replay("opponent-front") };
  return { ...result, allWindows: { retainedRows: 438, passes: 2, reducerRows: 876, seamRows: 876, reducerSha256: digest([result["player-back"].reducerSha256, result["opponent-front"].reducerSha256]), seamSha256: digest([result["player-back"].seamSha256, result["opponent-front"].seamSha256]), framebufferCompared: false, coverageCredit: false } } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyFlatterReducer(), null, 2));
}
