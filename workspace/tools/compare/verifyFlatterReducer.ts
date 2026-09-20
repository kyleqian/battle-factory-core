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
  return [...lives.entries()].sort((a, b) => a[1].start - b[1].start || a[0] - b[0]).map(([slot, life]) => ({
    slot,
    start: life.start,
    end: life.end,
    initial: {
      x: life.first.x,
      y: life.first.y,
      x2: life.first.x2,
      y2: life.first.y2,
      data: life.first.data,
      flags: life.first.flags,
      callback: life.first.callback.symbol === "AnimFlatterConfetti"
        ? "AnimFlatterConfetti" as const : "AnimFlatterConfetti_Step" as const,
    },
  })) as FlatterLiveInputs["confetti"];
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
    targetCenter: { x: spotlight.x, y: spotlight.y },
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

function compareRow(orientation: FlatterOrientation, rows: readonly Json[], age: number): void {
  const row = rows[age]!, input = inputFor(orientation, rows, age), state = flatterAtAge(age, input);
  invariant(state.active === row.animScriptActive, `${orientation}/${age}: active`);
  invariant(state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset
    && state.source.wait === row.scriptWait, `${orientation}/${age}: source cursor`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: source args`);
  invariant(same(state.battlers.target.offset, { x2: row.battlerSprites.target.x2, y2: row.battlerSprites.target.y2 }), `${orientation}/${age}: target axis`);
  invariant((state.spotlight ? 1 : 0) === owned(rows, age, "gFlatterSpotlightSpriteTemplate").length, `${orientation}/${age}: spotlight lifecycle`);
  invariant(state.verticalDips.length === owned(rows, age, "gVerticalDipSpriteTemplate").length, `${orientation}/${age}: VerticalDip lifecycle`);
  invariant(state.confetti.length === owned(rows, age, "gFlatterConfettiSpriteTemplate").length, `${orientation}/${age}: confetti lifecycle`);
  invariant(state.tasks.length === row.tasks.filter((task: Json) => task.func?.symbol === "AnimTask_HardwarePaletteFade_Step").length, `${orientation}/${age}: fade lifecycle`);
  invariant(state.resources.spotlightLoaded === (age >= 1 && age < FLATTER_FIRST_INACTIVE_AGE)
    && state.resources.confettiLoaded === (age >= 4 && age < FLATTER_FIRST_INACTIVE_AGE), `${orientation}/${age}: resource lifecycle`);
  invariant(same(state.audio.events, age === 7 ? [{ channel: "SE2", sound: "SE_M_ENCORE2", pan: input.audio.targetPan }]
    : age === 65 ? [{ channel: "SE1", sound: "SE_M_FLATTER", pan: input.audio.attackerPan }]
      : age === 75 ? [{ channel: "SE1", sound: "SE_M_FLATTER", pan: input.audio.targetPan }] : []), `${orientation}/${age}: audio`);
  invariant(state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && same(state.gameplay, row.immutableState), `${orientation}/${age}: gameplay opacity`);
  invariant(state.cleanup.firstInactive === (age === FLATTER_FIRST_INACTIVE_AGE)
    && state.cleanup.resourcesReleased === (age === FLATTER_FIRST_INACTIVE_AGE), `${orientation}/${age}: cleanup`);
  if (age === 0) invariant(state.displayTransfer.oam === "initial" && state.displayTransfer.matrices === "initial" && state.displayTransfer.palette === "initial", `${orientation}/${age}: initial transfer`);
  else invariant(state.displayTransfer.oam === "preceding-software" && state.displayTransfer.palette === "preceding-faded"
    && state.displayTransfer.matrices === (age === 68 ? "two-frame-spotlight-edge" : "preceding-software"), `${orientation}/${age}: transfer latch`);
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
