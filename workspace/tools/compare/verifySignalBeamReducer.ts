/**
 * Strict semantic replay for MOVE_SIGNAL_BEAM's retained bilateral Scene-ON
 * windows. Dense evidence remains here: the production reducer consumes only
 * typed live presentation inputs and never imports recordings or framebuffer
 * data.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  SIGNAL_BEAM_DUCK_TAG,
  SIGNAL_BEAM_GREEN_ORB_TAG,
  SIGNAL_BEAM_RED_ORB_TAG,
  signalBeamAtAge,
  signalBeamFirstInactiveAge,
  type SignalBeamLiveInputs,
} from "../../src/animation/signalBeam.ts";
import {
  sceneOnSignalBeamView,
  type SceneOnSignalBeamPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SignalBeamOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const orientations: readonly SignalBeamOrientation[] = ["player-back", "opponent-front"];
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_SIGNAL_BEAM reducer drift: ${message}`);
}
function rowsFor(side: SignalBeamOrientation): Json[] {
  const name = side === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/signal-beam-${name}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}
function task(row: Json, symbol: string, predicate: (entry: Json) => boolean = () => true): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === symbol && predicate(entry));
}
function sprite(row: Json, symbol: string): Json | undefined {
  return row.sprites.find((entry: Json) => entry.template?.symbol === symbol);
}
function allocation(row: Json, tag: number) {
  const tileSlot = row.tileTags.indexOf(tag), paletteBank = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteBank >= 0, `missing tag allocation ${tag}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing tile range ${tag}`);
  return { tileSlot, paletteBank, tileRange: [range[0], range[1]] as const };
}
function battler(entry: Json) {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix,
  };
}
function pairAt(row: Json, previous: Json | undefined, side: SignalBeamOrientation, pairIndex: number) {
  const wasLive = (slot: number, symbol: string): boolean => previous?.sprites.some((entry: Json) => entry.slot === slot && entry.template?.symbol === symbol) ?? false;
  const red = row.sprites.find((entry: Json) => entry.template?.symbol === "gSignalBeamRedOrbSpriteTemplate" && !wasLive(entry.slot, "gSignalBeamRedOrbSpriteTemplate"));
  const green = row.sprites.find((entry: Json) => entry.template?.symbol === "gSignalBeamGreenOrbSpriteTemplate" && !wasLive(entry.slot, "gSignalBeamGreenOrbSpriteTemplate"));
  invariant(red && green, `${side}: missing pair ${pairIndex}`);
  return { redSlot: red.slot, greenSlot: green.slot };
}

/** Extract scene inputs once; no reducer field comes from a fitted later row. */
export function signalBeamInputsFor(side: SignalBeamOrientation, rows: readonly Json[]): SignalBeamLiveInputs {
  const row0 = rows[0]!, row1 = rows[1]!, row4 = rows[4]!, row7 = rows[7]!, row10 = rows[10]!, row18 = rows[18]!, row36 = rows[36]!;
  const firstRed = sprite(row18, "gSignalBeamRedOrbSpriteTemplate"), helper = sprite(row36, "gComplexPaletteBlendSpriteTemplate");
  const attackerShake = task(row10, "AnimTask_ShakeMon_Step"), pan = task(row18, "Task_PanFromInitialToTarget"), sinTimer = task(row18, "AnimTask_RunSinAnimTimer");
  const targetShake = task(row36, "AnimTask_ShakeMon_Step", (entry) => entry.data[0] === row0.battlerSprites.target.slot);
  invariant(firstRed && helper && attackerShake && pan && sinTimer && targetShake, `${side}: live source allocation facts`);
  const attackerSide = side === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const pairs = Array.from({ length: 23 }, (_, index) => {
    const birth = 18 + index * 3;
    return pairAt(rows[birth]!, rows[birth - 1], side, index);
  });
  const targetBank = 16 + ((row0.battlerSprites.target.attr[2] >>> 12) & 0xf);
  return {
    attackerSide, targetSide, attackerSpecies: "ARIADOS", targetSpecies: "ARIADOS",
    attackerPictureOrigin: { x: firstRed.x - (attackerSide === "player" ? 10 : -10), y: firstRed.y - 10 },
    targetPictureOrigin: { x: helper.x, y: helper.y },
    attackerSprite: battler(row0.battlerSprites.attacker), targetSprite: battler(row0.battlerSprites.target),
    orbPairs: pairs,
    taskSlots: { attackerShake: attackerShake.slot, pan: pan.slot, sinTimer: sinTimer.slot, targetShake: targetShake.slot },
    paletteBlendSpriteSlot: helper.slot,
    resources: { redOrb: allocation(row1, SIGNAL_BEAM_RED_ORB_TAG), greenOrb: allocation(row4, SIGNAL_BEAM_GREEN_ORB_TAG), duck: allocation(row7, SIGNAL_BEAM_DUCK_TAG) },
    matrixBitmap: row0.resourceAllocators.matrixBitmap,
    matrixSlots: row0.softwareMatrices,
    spriteOrder: row0.spriteOrder,
    painterSprites: row0.sprites.map((entry: Json) => ({
      slot: entry.slot, subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, oamY: entry.attr[0] & 0xff,
    })),
    targetPalette: { bank: targetBank, unfaded: row0.unfadedPalette.slice(targetBank * 16, targetBank * 16 + 16) },
    registers: { win0h: row0.registers.win0h, win0v: row0.registers.win0v },
    animationRngSeed: row0.animationRng,
    gameplayRng: row0.rawBattleState.gameplayRng,
  };
}

export function signalBeamConfigFor(side: SignalBeamOrientation, rows: readonly Json[]): SceneOnSignalBeamPresentationState["config"] {
  const input = signalBeamInputsFor(side, rows);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, ...animationInputs } = input;
  return {
    move: "SIGNAL_BEAM",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide, spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 }, animationCenter: input.attackerPictureOrigin, battlePositionCenter: { x: input.attackerSprite.x, y: input.attackerSprite.y } } },
    target: { species: targetSpecies as never, geometry: { side: targetSide, spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 }, animationCenter: input.targetPictureOrigin, battlePositionCenter: { x: input.targetSprite.x, y: input.targetSprite.y } } },
    fieldProfile: {
      playerHp: rows[0]!.parties.player[0].hp, playerMaxHp: rows[0]!.parties.player[0].maxHp,
      opponentHp: rows[0]!.parties.opponent[0].hp, opponentMaxHp: rows[0]!.parties.opponent[0].maxHp,
      playerGender: side === "player-back" ? "male" : "female", opponentGender: side === "player-back" ? "female" : "male",
    },
    animationInputs,
  };
}
function ownedSprites(row: Json): Json[] {
  const names = new Set(["gSignalBeamRedOrbSpriteTemplate", "gSignalBeamGreenOrbSpriteTemplate", "gComplexPaletteBlendSpriteTemplate"]);
  return row.sprites.filter((entry: Json) => names.has(entry.template?.symbol)).map((entry: Json) => ({
    slot: entry.slot, template: entry.template.symbol, callback: entry.callback.symbol, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3, matrixNum: entry.matrixNum, matrix: entry.matrix, flags: entry.flags, data: entry.data,
  })).sort((left: Json, right: Json) => left.slot - right.slot || left.template.localeCompare(right.template));
}
function reducedSprites(state: ReturnType<typeof signalBeamAtAge>): Json[] {
  return state.sprites.map((entry) => ({
    slot: entry.slot, template: entry.template, callback: entry.callback, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: entry.oamPriority, matrixNum: entry.matrixNum, matrix: entry.matrix, flags: entry.flags, data: entry.data,
  })).sort((left, right) => left.slot - right.slot || left.template.localeCompare(right.template));
}
function ownedTasks(row: Json): Json[] {
  const names = new Set(["AnimTask_ShakeMon_Step", "AnimTask_RunSinAnimTimer", "Task_PanFromInitialToTarget"]);
  return row.tasks.filter((entry: Json) => names.has(entry.func?.symbol)).map((entry: Json) => ({ slot: entry.slot, callback: entry.func.symbol, data: entry.data })).sort((left: Json, right: Json) => left.slot - right.slot);
}
function reducedTasks(state: ReturnType<typeof signalBeamAtAge>): Json[] {
  return state.tasks.map((entry) => ({ slot: entry.slot, callback: entry.callback, data: entry.data })).sort((left, right) => left.slot - right.slot);
}
function sourceCreationOrderIsExact(state: ReturnType<typeof signalBeamAtAge>): boolean {
  return state.sprites.every((entry) => {
    if (entry.kind === "complex-palette-blend") return entry.sourceCreationOrder === 12;
    const pairBase = entry.pairIndex < 6 ? entry.pairIndex * 2 : entry.pairIndex * 2 + 1;
    return entry.sourceCreationOrder === pairBase + (entry.kind === "red-orb" ? 0 : 1);
  });
}
function expectedAudio(age: number, row: Json): unknown {
  if (age !== 18) return [];
  const track = row.audio.SE1.tracks[0];
  return [{ channel: "SE1", sound: "SE_M_BUBBLE_BEAM", sourcePan: "SOUND_PAN_ATTACKER", pan: track.panX }];
}
function compareImmutable(row: Json, first: Json, side: SignalBeamOrientation, age: number): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) {
    invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${side}/${age}: immutable gameplay ${key}`);
  }
  invariant(same(row.immutableState, first.immutableState), `${side}/${age}: immutable semantic state`);
}
function compareRow(side: SignalBeamOrientation, age: number, row: Json, previous: Json | undefined, first: Json, input: SignalBeamLiveInputs): ReturnType<typeof signalBeamAtAge> {
  const state = signalBeamAtAge(age, input);
  invariant(state.active === row.animScriptActive && state.source.pointer === row.scriptPtr && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait,
    `${side}/${age}: complete source cursor/waits`);
  invariant(same(state.animArgs, row.animArgs), `${side}/${age}: source animation args/timer wave`);
  invariant(same(reducedSprites(state), ownedSprites(row)), `${side}/${age}: paired orb geometry/callback/data/subpriority/order`);
  invariant(sourceCreationOrderIsExact(state), `${side}/${age}: root/subroutine creation order`);
  invariant(same(reducedTasks(state), ownedTasks(row)), `${side}/${age}: ShakeMon/timer/pan task allocation and data`);
  invariant(state.battlers.attacker.shake.x === row.battlerSprites.attacker.x2 && state.battlers.attacker.shake.y === row.battlerSprites.attacker.y2
    && state.battlers.target.shake.x === row.battlerSprites.target.x2 && state.battlers.target.shake.y === row.battlerSprites.target.y2,
  `${side}/${age}: source ShakeMon scanout`);
  invariant(state.resources.redOrb.loaded === row.tileTags.includes(SIGNAL_BEAM_RED_ORB_TAG)
    && state.resources.greenOrb.loaded === row.tileTags.includes(SIGNAL_BEAM_GREEN_ORB_TAG)
    && state.resources.duck.loaded === row.tileTags.includes(SIGNAL_BEAM_DUCK_TAG)
    && state.resources.allocator.matrixBitmap === row.resourceAllocators.matrixBitmap
    && same(state.resources.allocator.matrixSlots, row.softwareMatrices), `${side}/${age}: resource/matrix allocation`);
  const targetPalette = row.fadedPalette.slice(input.targetPalette.bank * 16, input.targetPalette.bank * 16 + 16);
  invariant(same(state.palette.faded, targetPalette), `${side}/${age}: complex target palette source cycle`);
  invariant(state.registers.win0h === row.registers.win0h && state.registers.win0v === row.registers.win0v, `${side}/${age}: only source-owned WIN0 reset`);
  invariant(same(state.painterOrder, row.spriteOrder), `${side}/${age}: persistent painter order`);
  invariant(same(state.audio, expectedAudio(age, row)), `${side}/${age}: Bubble Beam audio/pan start`);
  invariant(state.rng.animation === row.animationRng && state.rng.gameplayUnchanged && same(state.rng.gameplay, row.rawBattleState.gameplayRng), `${side}/${age}: presentation/gameplay RNG boundary`);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount && state.cleanup.ownedSprites === ownedSprites(row).length,
    `${side}/${age}: visual/sound cleanup ownership`);
  compareImmutable(row, first, side, age);
  if (age > 0) {
    invariant(same(row.hardwareOam, previous!.softwareOam) && same(row.hardwareMatrices, previous!.softwareMatrices)
      && state.displayTransfer.oam === "preceding-software" && state.displayTransfer.matrices === "preceding-software",
    `${side}/${age}: whole OAM/matrix RAM+1 latch`);
    invariant(same(row.hardwarePalette, previous!.fadedPalette) && state.displayTransfer.palette === "preceding-faded",
      `${side}/${age}: whole palette RAM+1 latch`);
  }
  return state;
}
function replay(side: SignalBeamOrientation): Json {
  const rows = rowsFor(side);
  const expectedRows = side === "player-back" ? 146 : 145;
  invariant(rows.length === expectedRows, `${side}: complete root-to-cleanup window`);
  const input = signalBeamInputsFor(side, rows), config = signalBeamConfigFor(side, rows), firstInactive = signalBeamFirstInactiveAge(input);
  let reducerRows = 0, seamRows = 0;
  for (let pass = 0; pass < 2; pass += 1) for (let age = 0; age < rows.length; age += 1) {
    const reduced = compareRow(side, age, rows[age]!, rows[age - 1], rows[0]!, input);
    const seam = sceneOnSignalBeamView({ age, config });
    const { attacker: _attacker, target: _target, ...plainSeam } = seam;
    invariant(same(plainSeam, reduced), `${side}/${age}: narrow typed Scene-ON seam`);
    reducerRows += 1; seamRows += 1;
  }
  const inactive = signalBeamAtAge(firstInactive, input);
  invariant(!inactive.active && inactive.cleanup.firstInactive && inactive.sprites.length === 0 && inactive.tasks.length === 0
    && !inactive.resources.redOrb.loaded && !inactive.resources.greenOrb.loaded && !inactive.resources.duck.loaded,
  `${side}: first inactive cleanup`);
  return { retainedRows: expectedRows, reducerRows, seamRows, cleanup: firstInactive, framebufferCompared: false, coverageCredit: false };
}

/** Replays all 291 retained bilateral semantic rows twice through both seams. */
export function verifySignalBeamReducer(): Json {
  const results = Object.fromEntries(orientations.map((side) => [side, replay(side)]));
  return { ...results, bilateral: { retainedRows: 291, passes: 2, reducerRows: 582, seamRows: 582, framebufferCompared: false, coverageCredit: false } };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifySignalBeamReducer(), null, 2));
}
