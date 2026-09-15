/**
 * Dense semantic replay for MOVE_HYPER_VOICE's retained Scene-ON root windows.
 *
 * This is deliberately test-only: it extracts one live scene allocation per
 * orientation, replays every retained semantic row through the source-relative
 * reducer and the typed seam, and checks transfer latches separately from the
 * reducer's software state.  Production code never imports these recordings.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  HYPER_VOICE_FIRST_INACTIVE_AGE,
  hyperVoiceAtAge,
  hyperVoiceSourceAtAge,
  type HyperVoiceLiveInputs,
  type HyperVoiceState,
} from "../../src/animation/hyperVoice.ts";
import {
  sceneOnHyperVoiceView,
  type SceneOnHyperVoicePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import { verifyHyperVoiceEvidence } from "./hyperVoiceEvidence.ts";

type Json = Record<string, any>;
export type HyperVoiceOrientation = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_HYPER_VOICE reducer drift: ${message}`);
}

function rowsFor(orientation: HyperVoiceOrientation): Json[] {
  const name = orientation === "player-back" ? "player" : "opponent";
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, `tools/compare/evidence/hyper-voice-${name}-dense-state.json.gz`))).toString("utf8")) as Json).frames;
}

function task(row: Json, symbol: string): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func?.symbol === symbol);
}

function sprite(row: Json, symbol: string): Json | undefined {
  return row.sprites.find((entry: Json) => entry.template?.symbol === symbol);
}

function battler(entry: Json) {
  return {
    slot: entry.slot, x: entry.x, y: entry.y, x2: entry.x2, y2: entry.y2,
    subpriority: entry.subpriority, oamPriority: (entry.attr[2] >>> 10) & 3,
    matrixNum: entry.matrixNum, matrix: entry.matrix,
    attr: [entry.attr[0], entry.attr[1], entry.attr[2]] as const,
  };
}

function allocation(row: Json, tag: number) {
  const tileSlot = row.tileTags.indexOf(tag), paletteBank = row.paletteTags.indexOf(tag);
  invariant(tileSlot >= 0 && paletteBank >= 0, `missing Hyper Voice resource tag ${tag}`);
  const range = row.resourceAllocators.tileRanges[tileSlot];
  invariant(Array.isArray(range) && range.length === 2, `missing Hyper Voice tile range ${tag}`);
  return { tag, tileSlot, paletteBank, tileRange: [range[0], range[1]] as const };
}

function paletteBankForBattler(entry: Json): number {
  return 16 + ((entry.attr[2] >>> 12) & 0xf);
}

/** Extract the live Scene-ON allocation; no retained row enters the reducer. */
export function hyperVoiceInputsFor(
  orientation: HyperVoiceOrientation,
  rows = rowsFor(orientation),
): HyperVoiceLiveInputs {
  const row0 = rows[0]!, row1 = rows[1]!, row4 = rows[4]!, row88 = rows[88]!;
  const attackerSide = orientation === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const ring = sprite(row4, "gHyperVoiceRingSpriteTemplate");
  const palette = sprite(row4, "gSimplePaletteBlendSpriteTemplate");
  const cry = task(row4, "SoundTask_PlayCryWithEcho_Step");
  const scale = task(row4, "AnimTask_ScaleMonAndRestore_Step");
  const targetShake = task(row4, "AnimTask_ShakeMon2_Step");
  const platform = task(row4, "AnimTask_ShakeBattlePlatforms_Step");
  const waitForCry = task(row4, "SoundTask_WaitForCry");
  const duckBgm = task(row88, "Task_DuckBGMForPokemonCry");
  invariant(ring && palette && cry && scale && targetShake && platform && waitForCry && duckBgm, `${orientation}: complete live root allocation`);
  const ringIndex = row4.spriteOrder.indexOf(ring.slot);
  const paletteIndex = row4.spriteOrder.indexOf(palette.slot);
  invariant(ringIndex >= 0 && paletteIndex >= 0 && ringIndex + 1 < row4.spriteOrder.length && paletteIndex + 1 < row4.spriteOrder.length, `${orientation}: source painter placement`);
  const attacker = row0.battlerSprites.attacker, target = row0.battlerSprites.target;
  const sign = attackerSide === "player" ? -1 : 1;
  const resource = allocation(row1, 10203);
  return {
    attackerSide, targetSide, attackerSpecies: "EXPLOUD", targetSpecies: "SLOWKING", attackerCrySpecies: cry.data[1],
    attackerPictureOrigin: { x: ring.x - sign * 45, y: ring.y },
    targetPictureOrigin: { x: palette.x, y: palette.y },
    attackerSprite: battler(attacker), targetSprite: battler(target),
    taskSlots: {
      cry: cry.slot, scale: scale.slot, targetShake: targetShake.slot, platform: platform.slot,
      waitForCry: waitForCry.slot, duckBgm: duckBgm.slot,
    },
    spriteSlots: { paletteBlend: palette.slot, ring: ring.slot },
    paletteBlendSubpriority: palette.subpriority,
    matrixSlots: { ring: ring.matrixNum, attackerScale: row4.battlerSprites.attacker.matrixNum },
    resource,
    spriteOrder: row0.spriteOrder,
    painter: { shadowSlot: row4.spriteOrder[paletteIndex + 1]!, ringInsertionBefore: row4.spriteOrder[ringIndex + 1]! },
    palettes: {
      unfaded: row0.unfadedPalette,
      faded: row0.fadedPalette,
      hardware: row0.hardwarePalette,
      backgroundBanks: [1, 2, 3], attackerBank: paletteBankForBattler(attacker), targetBank: paletteBankForBattler(target),
      thinRingBank: 16 + resource.paletteBank,
      thinRingPalette: row1.fadedPalette.slice((16 + resource.paletteBank) * 16, (17 + resource.paletteBank) * 16),
    },
    matrixBitmap: row0.resourceAllocators.matrixBitmap,
    animationRngSeed: row0.animationRng,
    gameplayRng: row0.rawBattleState.gameplayRng,
  };
}

export function hyperVoiceConfigFor(
  orientation: HyperVoiceOrientation,
  rows = rowsFor(orientation),
): SceneOnHyperVoicePresentationState["config"] {
  const input = hyperVoiceInputsFor(orientation, rows);
  const {
    attackerSide, targetSide, attackerSpecies, targetSpecies,
    attackerPictureOrigin, targetPictureOrigin, ...animationInputs
  } = input;
  return {
    move: "HYPER_VOICE",
    attacker: {
      species: attackerSpecies as never,
      geometry: {
        side: attackerSide,
        spriteCorner: { x: input.attackerSprite.x - 32, y: input.attackerSprite.y - 32 },
        animationCenter: attackerPictureOrigin,
        battlePositionCenter: attackerSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
      },
    },
    target: {
      species: targetSpecies as never,
      geometry: {
        side: targetSide,
        spriteCorner: { x: input.targetSprite.x - 32, y: input.targetSprite.y - 32 },
        animationCenter: targetPictureOrigin,
        battlePositionCenter: targetSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
      },
    },
    fieldProfile: {
      playerHp: rows[0]!.parties.player[0].hp, playerMaxHp: rows[0]!.parties.player[0].maxHp,
      opponentHp: rows[0]!.parties.opponent[0].hp, opponentMaxHp: rows[0]!.parties.opponent[0].maxHp,
      playerGender: "male", opponentGender: "male",
    },
    animationInputs,
  };
}

const OWNED_TASKS = new Set([
  "SoundTask_PlayCryWithEcho_Step", "AnimTask_ScaleMonAndRestore_Step", "AnimTask_ShakeMon2_Step",
  "AnimTask_ShakeBattlePlatforms_Step", "SoundTask_WaitForCry", "Task_DuckBGMForPokemonCry",
]);

function expectedTasks(row: Json): Json[] {
  return row.tasks.filter((entry: Json) => OWNED_TASKS.has(entry.func?.symbol))
    .sort((left: Json, right: Json) => left.slot - right.slot || left.func.symbol.localeCompare(right.func.symbol));
}

function compareTasks(orientation: HyperVoiceOrientation, age: number, row: Json, state: HyperVoiceState): void {
  const expected = expectedTasks(row);
  const actual = state.tasks.slice().sort((left, right) => left.slot - right.slot || left.callback.localeCompare(right.callback));
  invariant(expected.length === actual.length, `${orientation}/${age}: owned task count`);
  for (let index = 0; index < expected.length; index += 1) {
    const left = expected[index]!, right = actual[index]!;
    invariant(left.slot === right.slot && left.func.symbol === right.callback && left.data.length === 16
      && right.data.length === 16 && same(left.data, right.data), `${orientation}/${age}: ${left.func.symbol} full 16-word task data/lifetime`);
  }
}

function compareSprites(orientation: HyperVoiceOrientation, age: number, row: Json, state: HyperVoiceState): void {
  const expectedRing = sprite(row, "gHyperVoiceRingSpriteTemplate"), actualRing = state.sprites.ring;
  if (!expectedRing) invariant(actualRing === null, `${orientation}/${age}: Thin Ring cleanup`);
  else {
    invariant(actualRing !== null, `${orientation}/${age}: Thin Ring live`);
    invariant(expectedRing.slot === actualRing.slot && expectedRing.template.symbol === actualRing.template
      && expectedRing.callback.symbol === actualRing.callback && actualRing.affine === "gHyperVoiceRingAffineAnimCmds"
      && expectedRing.x === actualRing.x && expectedRing.y === actualRing.y && expectedRing.x2 === actualRing.x2
      && expectedRing.y2 === actualRing.y2 && expectedRing.subpriority === actualRing.subpriority
      && ((expectedRing.attr[2] >>> 10) & 3) === actualRing.oamPriority && expectedRing.matrixNum === actualRing.matrixNum
      && same(expectedRing.matrix, actualRing.matrix) && same(expectedRing.data, actualRing.data)
      && actualRing.sourceCreationOrder === 1, `${orientation}/${age}: Thin Ring template/translation/affine/data/order`);
  }
  const expectedPalette = sprite(row, "gSimplePaletteBlendSpriteTemplate"), actualPalette = state.sprites.paletteBlend;
  if (!expectedPalette) invariant(actualPalette === null, `${orientation}/${age}: simple palette blend cleanup`);
  else {
    invariant(actualPalette !== null, `${orientation}/${age}: simple palette blend live`);
    invariant(expectedPalette.slot === actualPalette.slot && expectedPalette.template.symbol === actualPalette.template
      && expectedPalette.callback.symbol === actualPalette.callback && expectedPalette.x === actualPalette.x
      && expectedPalette.y === actualPalette.y && expectedPalette.subpriority === actualPalette.subpriority
      && actualPalette.selector === "F_PAL_BG | F_PAL_BATTLERS" && actualPalette.delay === 3
      && actualPalette.initialBlendY === 8 && actualPalette.targetBlendY === 0 && actualPalette.color === "RGB_YELLOW"
      && actualPalette.sourceCreationOrder === 0, `${orientation}/${age}: simple palette blend command/order`);
  }
}

function compareBattlers(orientation: HyperVoiceOrientation, age: number, row: Json, state: HyperVoiceState, input: HyperVoiceLiveInputs): void {
  const expectedAttacker = row.battlerSprites.attacker, attacker = state.battlers.attacker.sprite;
  const expectedTarget = row.battlerSprites.target, target = state.battlers.target.sprite;
  invariant(state.battlers.attacker.side === input.attackerSide && state.battlers.attacker.species === input.attackerSpecies
    && state.battlers.target.side === input.targetSide && state.battlers.target.species === input.targetSpecies,
  `${orientation}/${age}: live identity/sides`);
  for (const key of ["slot", "x", "y", "x2", "y2", "subpriority", "matrixNum"] as const) {
    invariant(expectedAttacker[key] === attacker[key], `${orientation}/${age}: attacker ${key}`);
  }
  invariant(same(expectedAttacker.matrix, attacker.matrix), `${orientation}/${age}: ScaleMonAndRestore matrix`);
  for (const key of ["slot", "x", "y", "x2", "y2", "subpriority"] as const) {
    invariant(expectedTarget[key] === target[key], `${orientation}/${age}: target ${key}`);
  }
  const effect = state.effect.localAge;
  const expectedShake = effect !== null && effect <= 10 ? expectedTarget.x2 : 0;
  invariant(state.battlers.target.shake.x === expectedShake && state.partnerShake.active === false
    && state.partnerShake.requested === (effect !== null) && state.partnerShake.reason === "singles-no-visible-partner",
  `${orientation}/${age}: target/defender-partner ShakeMon2 ownership`);
}

function paletteBank(palette: number[], bank: number): number[] {
  return palette.slice(bank * 16, bank * 16 + 16);
}

function signedRegister(value: number): number {
  const word = value & 0x1ff;
  return word >= 256 ? word - 512 : word;
}

function oamX(raw: string): number {
  return Buffer.from(raw, "hex").readUInt16LE(2) & 0x1ff;
}

function isBetween(age: number, start: number, offsetStart: number, offsetEnd: number): boolean {
  return age >= start + offsetStart && age <= start + offsetEnd;
}

function compareDisplayLatches(
  orientation: HyperVoiceOrientation,
  age: number,
  row: Json,
  rows: Json[],
  state: HyperVoiceState,
  input: HyperVoiceLiveInputs,
): void {
  if (age === 0) {
    invariant(same(state.displayTransfer, {
      oam: "initial", ringMatrix: "initial", attackerScaleMatrix: "initial", targetShake: "initial", platform: "initial",
      palette: { thinRing: "initial", battlers: "initial", backgrounds: "initial" },
    }), `${orientation}/0: initial transfer latches`);
    return;
  }
  const previous = rows[age - 1]!;
  invariant(state.displayTransfer.oam === "preceding-software" && same(row.hardwareOam, previous.softwareOam), `${orientation}/${age}: whole OAM RAM+1`);
  invariant(state.displayTransfer.ringMatrix === "preceding-software"
    && same(row.hardwareMatrices[input.matrixSlots.ring], previous.softwareMatrices[input.matrixSlots.ring]), `${orientation}/${age}: Thin Ring matrix RAM+1`);
  const scaleLag = [4, 59].some((start) => isBetween(age, start, 2, 11));
  if (scaleLag) {
    invariant(state.displayTransfer.attackerScaleMatrix === "two-source-rows"
      && same(row.hardwareMatrices[input.matrixSlots.attackerScale], rows[age - 2]!.softwareMatrices[input.matrixSlots.attackerScale]),
    `${orientation}/${age}: ScaleMonAndRestore matrix RAM+2`);
  } else invariant(state.displayTransfer.attackerScaleMatrix === "preceding-software", `${orientation}/${age}: ordinary attacker matrix transfer`);
  const shakeLag = [4, 59].some((start) => isBetween(age, start, 2, 12));
  if (shakeLag) {
    const rank = orientation === "player-back" ? 11 : 10;
    const baseX = orientation === "player-back" ? 144 : 40;
    invariant(state.displayTransfer.targetShake === "two-source-rows"
      && oamX(row.hardwareOam[rank]!) - baseX === rows[age - 2]!.battlerSprites.target.x2,
    `${orientation}/${age}: target ShakeMon2 OAM RAM+2`);
  } else invariant(state.displayTransfer.targetShake === "initial", `${orientation}/${age}: no target-shake lag body`);
  invariant(state.displayTransfer.platform === "preceding-software"
    && signedRegister(row.registers.bg3hofs) === previous.battleBg.gBattle_BG3_X
    && state.platform.hardwareX === signedRegister(row.registers.bg3hofs), `${orientation}/${age}: platform BG3 RAM+1`);
  const setup = age === 4 || age === 59;
  const backgroundExpected = setup ? row.fadedPalette : previous.fadedPalette;
  invariant(state.displayTransfer.palette.backgrounds === (setup ? "same-row-effect-setup" : "preceding-faded"), `${orientation}/${age}: background palette latch label`);
  for (const bank of input.palettes.backgroundBanks) invariant(same(paletteBank(row.hardwarePalette, bank), paletteBank(backgroundExpected, bank)), `${orientation}/${age}: BG palette bank ${bank}`);
  invariant(state.displayTransfer.palette.battlers === "preceding-faded", `${orientation}/${age}: battler palette latch label`);
  for (const bank of [input.palettes.attackerBank, input.palettes.targetBank]) invariant(same(paletteBank(row.hardwarePalette, bank), paletteBank(previous.fadedPalette, bank)), `${orientation}/${age}: battler palette bank ${bank} RAM+1`);
  const thinRingExpected = age < 2 ? rows[0]!.fadedPalette : previous.fadedPalette;
  invariant(state.displayTransfer.palette.thinRing === (age < 2 ? "initial" : "preceding-faded")
    && same(paletteBank(row.hardwarePalette, input.palettes.thinRingBank), paletteBank(thinRingExpected, input.palettes.thinRingBank)),
  `${orientation}/${age}: Thin Ring palette RAM+1`);
}

function compareImmutable(orientation: HyperVoiceOrientation, age: number, row: Json, first: Json, state: HyperVoiceState): void {
  for (const key of ["playerParty", "opponentParty", "battleMons", "battleOutcome", "battleWeather", "gameplayRng"]) {
    invariant(same(row.rawBattleState[key], first.rawBattleState[key]), `${orientation}/${age}: immutable gameplay ${key}`);
  }
  invariant(same(row.immutableState, first.immutableState) && same(state.rng.gameplay, row.rawBattleState.gameplayRng)
    && state.rng.gameplayUnchanged, `${orientation}/${age}: opaque gameplay boundary`);
}

function compareAudio(orientation: HyperVoiceOrientation, age: number, state: HyperVoiceState, input: HyperVoiceLiveInputs): void {
  const local = state.effect.localAge;
  const expectedEvents = local === 1
    ? [{ kind: "cry-echo-start", species: input.attackerSpecies, pan: input.attackerSide === "player" ? -64 : 63 }]
    : local === 28
      ? [{ kind: "cry-echo-end", species: input.attackerSpecies, pan: input.attackerSide === "player" ? -64 : 63 }]
      : [];
  invariant(same(state.audio.events, expectedEvents) && state.audio.waitForCry === (local === 0)
    && state.audio.duckBgm === (age >= 88), `${orientation}/${age}: cry/audio/wait schedule`);
  if (local === null || local > 28) invariant(state.audio.cry === null, `${orientation}/${age}: cry task cleanup`);
  else invariant(state.audio.cry !== null && state.audio.cry.species === input.attackerSpecies
    && state.audio.cry.pan === (input.attackerSide === "player" ? -64 : 63)
    && state.audio.cry.lastCry === (state.effect.call === 2), `${orientation}/${age}: live cry task`);
}

function compareRow(orientation: HyperVoiceOrientation, age: number, row: Json, rows: Json[], input: HyperVoiceLiveInputs): void {
  const state = hyperVoiceAtAge(age, input), first = rows[0]!;
  invariant(state.age === age && state.active === row.animScriptActive && state.source.active === row.animScriptActive
    && state.source.owner === row.scriptOwner && state.source.pointer === row.scriptPtr
    && state.source.pointerOffset === row.scriptOffset && state.source.wait === row.scriptWait,
  `${orientation}/${age}: complete root cursor/wait/active`);
  invariant(same(state.animArgs, row.animArgs), `${orientation}/${age}: complete anim args`);
  compareTasks(orientation, age, row, state);
  compareSprites(orientation, age, row, state);
  compareBattlers(orientation, age, row, state, input);
  invariant(same(state.painterOrder, row.spriteOrder), `${orientation}/${age}: live painter order`);
  invariant(state.platform.sourceX === row.battleBg.gBattle_BG3_X && state.platform.sourceY === row.battleBg.gBattle_BG3_Y,
    `${orientation}/${age}: shake_battle_platforms source scroll`);
  const loaded = row.tileTags.includes(input.resource.tag) && row.paletteTags.includes(input.resource.tag);
  invariant(state.resources.thinRing.loaded === loaded && state.resources.thinRing.tag === (loaded ? input.resource.tag : null)
    && same(state.resources.thinRing.allocation, loaded ? input.resource : null)
    && state.matrices.bitmap === row.resourceAllocators.matrixBitmap
    && same(state.matrices.ring.matrix, state.sprites.ring?.matrix ?? null)
    && same(state.matrices.attackerScale.matrix, state.battlers.attacker.sprite.matrix),
  `${orientation}/${age}: Thin Ring resource/matrix allocation/free lifecycle`);
  invariant(state.palette.thinRingBank === input.palettes.thinRingBank
    && same(state.palette.banks, [1, 2, 3, input.palettes.attackerBank, input.palettes.targetBank])
    && same(state.palette.faded, row.fadedPalette) && same(state.palette.hardware, row.hardwarePalette)
    && state.palette.fade.active === (state.sprites.paletteBlend !== null), `${orientation}/${age}: simple palette blend program/banks`);
  compareAudio(orientation, age, state, input);
  invariant(state.cleanup.visualTasks === row.visualTaskCount && state.cleanup.soundTasks === row.soundTaskCount
    && state.cleanup.ownedSprites === Number(state.sprites.ring !== null) + Number(state.sprites.paletteBlend !== null)
    && state.cleanup.firstInactive === (age === HYPER_VOICE_FIRST_INACTIVE_AGE)
    && state.cleanup.resourcesReleased === (age >= HYPER_VOICE_FIRST_INACTIVE_AGE), `${orientation}/${age}: inactive cleanup/task ownership`);
  invariant(state.rng.animation === row.animationRng && state.rng.sourceDraws === age, `${orientation}/${age}: presentation RNG source draw count`);
  compareDisplayLatches(orientation, age, row, rows, state, input);
  compareImmutable(orientation, age, row, first, state);
}

function replayOrientation(orientation: HyperVoiceOrientation): { readonly retainedRows: number; readonly reducerRows: number; readonly seamRows: number; readonly cleanup: number } {
  const rows = rowsFor(orientation), input = hyperVoiceInputsFor(orientation, rows), config = hyperVoiceConfigFor(orientation, rows);
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [age, row] of rows.entries()) {
      compareRow(orientation, age, row!, rows, input);
      const seam = sceneOnHyperVoiceView({ age, config } as SceneOnHyperVoicePresentationState);
      const reduced = hyperVoiceAtAge(age, input);
      const { attacker, target, ...seamState } = seam;
      invariant(same(seamState, reduced) && same(attacker, config.attacker) && same(target, config.target), `${orientation}/${age}: complete typed Scene-ON seam divergence`);
    }
  }
  invariant(hyperVoiceSourceAtAge(HYPER_VOICE_FIRST_INACTIVE_AGE).active === false
    && hyperVoiceAtAge(HYPER_VOICE_FIRST_INACTIVE_AGE, input).rng.sourceDraws === HYPER_VOICE_FIRST_INACTIVE_AGE,
  `${orientation}: first inactive root cleanup/RNG`);
  return { retainedRows: rows.length, reducerRows: rows.length * 2, seamRows: rows.length * 2, cleanup: HYPER_VOICE_FIRST_INACTIVE_AGE };
}

/** Run raw/evidence integrity first, then the complete reducer/seam replay. */
export function verifyHyperVoiceReducer() {
  const evidence = verifyHyperVoiceEvidence();
  invariant(evidence.coverageCredit === false, "retained evidence must not promote coverage");
  const player = replayOrientation("player-back"), opponent = replayOrientation("opponent-front");
  return {
    "player-back": { ...player, framebufferCompared: false, coverageCredit: false },
    "opponent-front": { ...opponent, framebufferCompared: false, coverageCredit: false },
    bilateral: {
      retainedRows: player.retainedRows + opponent.retainedRows, passes: 2,
      reducerRows: player.reducerRows + opponent.reducerRows, seamRows: player.seamRows + opponent.seamRows,
      framebufferCompared: false, coverageCredit: false,
    },
  } as const;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) console.log(JSON.stringify(verifyHyperVoiceReducer(), null, 2));
