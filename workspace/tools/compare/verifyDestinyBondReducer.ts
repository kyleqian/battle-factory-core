/**
 * Dense component-state verifier for the source-age Destiny Bond reducer.
 *
 * Retained probes are test-only evidence here.  Production imports only its
 * generated source asset and never opens these maps, RGB archives, scenarios,
 * or canonical parties.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  DESTINY_BOND_FIRST_INACTIVE_AGE,
  destinyBondAtAge,
  destinyBondPaletteCoefficientAtAge,
  type DestinyBondLiveInputs,
} from "../../src/animation/destinyBond.ts";
import {
  type SceneOnDestinyBondConfig,
  sceneOnDestinyBondView,
  type SceneOnDestinyBondPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type DestinyBondOrientation = "player-back" | "opponent-front";
type Side = DestinyBondOrientation;
const root = resolve(new URL("../..", import.meta.url).pathname);
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function invariant(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const statePath: Record<Side, string> = {
  "player-back": "tools/compare/evidence/destiny-bond-player-dense-state.json.gz",
  "opponent-front": "tools/compare/evidence/destiny-bond-opponent-dense-state.json.gz",
};

function rowsFor(side: Side): Json[] {
  return (JSON.parse(gunzipSync(readFileSync(resolve(root, statePath[side]))).toString("utf8")) as Json).frames;
}

function transitions(rows: Json[], select: (row: Json, age: number) => unknown): number[] {
  return rows.flatMap((row, age) => age > 0 && !same(select(row, age), select(rows[age - 1]!, age - 1)) ? [age] : []);
}
function paletteBanks(palette: number[]): string[] {
  return Array.from({ length: 32 }, (_, bank) => JSON.stringify(palette.slice(bank * 16, bank * 16 + 16)));
}
function task(row: Json, callback: string): Json | undefined {
  return row.tasks.find((entry: Json) => entry.func.symbol === callback);
}
function white(row: Json): Json | undefined {
  return row.sprites.find((entry: Json) => entry.template.symbol === "gDestinyBondWhiteShadowSpriteTemplate");
}

function inputsFor(rows: Json[], side: Side): DestinyBondLiveInputs {
  const whiteAtCreate = white(rows[43]!);
  invariant(whiteAtCreate, `${side}: WHITE_SHADOW source row missing`);
  const xStep = whiteAtCreate.data[2] as number;
  const yStep = whiteAtCreate.data[3] as number;
  const fade = task(rows[4]!, "Task_FadeToBg");
  const whiteTask = task(rows[43]!, "AnimTask_DestinyBondWhiteShadow_Step");
  const shake = task(rows[93]!, "AnimTask_ShakeMonInPlace_Step");
  const palette = task(rows[93]!, "AnimTask_BlendSpriteColor_Step2");
  const clear = task(rows[183]!, "Task_ClearMonBg");
  invariant(fade && whiteTask && shake && palette && clear, `${side}: owned slots`);
  const allocator = rows[1]!.resourceAllocators;
  const tileSlot = rows[1]!.tileTags.indexOf(10188);
  const paletteBank = rows[1]!.paletteTags.indexOf(10188);
  invariant(tileSlot >= 0 && paletteBank >= 0, `${side}: resource slots`);
  return {
    attackerSide: side === "player-back" ? "player" : "opponent",
    targetSide: side === "player-back" ? "opponent" : "player",
    attackerSpecies: side === "player-back" ? "WOBBUFFET" : "WOBBUFFET",
    targetSpecies: side === "player-back" ? "ONIX" : "ONIX",
    attackerCenter: { x: (whiteAtCreate.data[0] - xStep) >> 4, y: rows[0]!.battlerSprites.attacker.y },
    targetCenter: { x: whiteAtCreate.data[5], y: rows[0]!.battlerSprites.target.y },
    attackerBottom: (whiteAtCreate.data[1] - yStep) >> 4,
    targetBottom: whiteAtCreate.data[6],
    attackerSpriteSlot: rows[0]!.battlerSprites.attacker.slot,
    whiteShadowSpriteSlot: whiteAtCreate.slot,
    whiteShadowTaskSlot: whiteTask.slot,
    shakeTaskSlot: shake.slot,
    paletteTaskSlot: palette.slot,
    fadeTaskSlot: fade.slot,
    clearMonBgTaskSlot: clear.slot,
    whiteShadowTileSlot: tileSlot,
    whiteShadowPaletteBank: paletteBank,
    whiteShadowTileRange: allocator.tileRanges[tileSlot] as readonly [number, number],
    matrixBitmap: allocator.matrixBitmap,
    spriteOrder: rows[0]!.spriteOrder,
    whiteShadowOrderIndex: rows[43]!.spriteOrder.indexOf(whiteAtCreate.slot),
    visibleObjPaletteBanks: [16, 17],
    excludedObjPaletteBanks: Array.from({ length: 14 }, (_, index) => index + 18),
  };
}

/** Build the production seam from one orientation's live allocator and geometry facts. */
export function destinyBondConfigFor(
  side: DestinyBondOrientation,
  rows: Json[],
  spriteOrder: readonly number[],
): SceneOnDestinyBondConfig {
  const input = inputsFor(rows, side);
  const attacker = rows[0]!.battlerSprites.attacker;
  const target = rows[0]!.sprites.find((entry: Json) =>
    entry.template?.symbol === "gMultiuseSpriteTemplate" && entry.slot !== attacker.slot);
  invariant(target, `${side}: opposite battler sprite missing`);
  const { attackerSide: _attackerSide, targetSide: _targetSide,
    attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
    attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = input;
  return {
    move: "DESTINY_BOND",
    attacker: { species: "WOBBUFFET", geometry: { side: input.attackerSide,
      spriteCorner: { x: attacker.x - 32, y: attacker.y - 32 },
      animationCenter: { x: attacker.x, y: attacker.y },
      battlePositionCenter: { x: attacker.x, y: attacker.y } } },
    target: { species: "ONIX", geometry: { side: input.targetSide,
      spriteCorner: { x: target.x - 32, y: target.y - 32 },
      animationCenter: { x: target.x, y: target.y },
      battlePositionCenter: { x: target.x, y: target.y } } },
    fieldProfile: { playerHp: rows[0]!.battlers.player.hp,
      playerMaxHp: rows[0]!.battlers.player.maxHp,
      opponentHp: rows[0]!.battlers.opponent.hp,
      opponentMaxHp: rows[0]!.battlers.opponent.maxHp,
      playerGender: "male", opponentGender: "male" },
    animationInputs: { ...animationInputs, spriteOrder },
  };
}

function sceneState(age: number, input: DestinyBondLiveInputs): SceneOnDestinyBondPresentationState {
  const { attackerSide: _attackerSide, targetSide: _targetSide,
    attackerSpecies: _attackerSpecies, targetSpecies: _targetSpecies,
    attackerCenter: _attackerCenter, targetCenter: _targetCenter, ...animationInputs } = input;
  return {
    age,
    config: {
      move: "DESTINY_BOND",
      attacker: {
        species: input.attackerSpecies,
        geometry: {
          side: input.attackerSide,
          spriteCorner: input.attackerCenter,
          animationCenter: input.attackerCenter,
          battlePositionCenter: input.attackerCenter,
        },
      },
      target: {
        species: input.targetSpecies,
        geometry: {
          side: input.targetSide,
          spriteCorner: input.targetCenter,
          animationCenter: input.targetCenter,
          battlePositionCenter: input.targetCenter,
        },
      },
      fieldProfile: {},
      animationInputs,
    },
  } as unknown as SceneOnDestinyBondPresentationState;
}

function expectedTaskCallbacks(row: Json): readonly string[] {
  return row.tasks.map((entry: Json) => entry.func.symbol).sort();
}
function actualTaskCallbacks(state: ReturnType<typeof destinyBondAtAge>): readonly string[] {
  return state.tasks.map((entry) => entry.callback).sort();
}

function runSide(side: Side): Json {
  const rows = rowsFor(side);
  invariant(rows.length === 188, `${side}: complete dense source window`);
  const input = inputsFor(rows, side);
  for (const [age, row] of rows.entries()) {
    const reduced = destinyBondAtAge(age, input);
    const seam = sceneOnDestinyBondView(sceneState(age, input));
    invariant(same(reduced, Object.fromEntries(Object.entries(seam).filter(([key]) => key !== "attacker" && key !== "target"))), `${side}: seam row ${age}`);
    invariant(reduced.source.pointerOffset === row.scriptOffset
      && reduced.source.wait === row.scriptWait && reduced.active === row.animScriptActive,
    `${side}: source cursor ${age}`);
    invariant(same(actualTaskCallbacks(reduced), expectedTaskCallbacks(row)), `${side}: task callbacks ${age}`);
    invariant(same(reduced.tasks.map((entry) => entry.slot).sort((a, b) => a - b), row.tasks.map((entry: Json) => entry.slot).sort((a: number, b: number) => a - b)), `${side}: task slots ${age}`);
    const observedWhite = white(row);
    invariant(reduced.sprites.length === (observedWhite ? 1 : 0), `${side}: WHITE_SHADOW life ${age}`);
    if (observedWhite) invariant(same(reduced.sprites[0]!.data, observedWhite.data)
      && reduced.sprites[0]!.x === observedWhite.x && reduced.sprites[0]!.y === observedWhite.y
      && reduced.sprites[0]!.slot === observedWhite.slot && reduced.sprites[0]!.oam.priority === 2,
    `${side}: WHITE_SHADOW sprite ${age}`);
    invariant(same(reduced.sourceOrder, row.spriteOrder), `${side}: source order ${age}`);
    invariant(reduced.registers.bldcnt === row.registers.bldcnt
      && reduced.registers.bldalpha === row.registers.bldalpha
      && reduced.registers.bldy === row.registers.bldy, `${side}: blend registers ${age}`);
    invariant(reduced.resources.whiteShadow.loaded === row.tileTags.includes(10188)
      && reduced.resources.whiteShadow.tag === (row.tileTags.includes(10188) ? 10188 : null), `${side}: resource life ${age}`);
    invariant(reduced.cleanup.visualTasks === row.visualTaskCount
      && reduced.cleanup.firstInactive === (age === DESTINY_BOND_FIRST_INACTIVE_AGE), `${side}: cleanup/task count ${age}`);
    const priorSong = age === 0 ? "se_effective" : rows[age - 1]!.audio.SE1.songHeaderIdentity.symbol;
    const expectedAudio = row.audio.SE1.songHeaderIdentity.symbol === priorSong
      ? []
      : [row.audio.SE1.songHeaderIdentity.symbol];
    const actualAudio = reduced.audio.events.map((event) => `se_m_${event.sound.slice(5).toLowerCase()}`);
    invariant(same(actualAudio, expectedAudio), `${side}: audio ${age}`);
  }

  const coefficientEdges = transitions(rows, (row) => paletteBanks(row.fadedPalette)[16]);
  invariant(same(coefficientEdges, [95, 97, 99, 101, 103, 105, 107, 109, 111, 113, 115, 117,
    121, 123, 125, 127, 129, 131, 133, 135, 137, 139, 141, 143]), `${side}: selected palette edges`);
  invariant(same(coefficientEdges, transitions(rows, (row, age) => destinyBondPaletteCoefficientAtAge(age))), `${side}: source palette coefficient edges`);
  invariant(rows.slice(1).every((row, index) => same(row.hardwareOam, rows[index]!.softwareOam)
    && same(row.hardwareMatrices, rows[index]!.softwareMatrices)
    && same(row.hardwarePalette, rows[index]!.fadedPalette)), `${side}: full hardware predecessor transfer`);
  invariant(rows.slice(44, 139).every((row, index) => row.hardwareOam[11] === rows[index + 43]!.softwareOam[11]), `${side}: WHITE_SHADOW rank eleven latch`);
  invariant(same(transitions(rows, (row) => row.bgVram), [23, 163]), `${side}: Ghost BG vram edges`);
  invariant(same(transitions(rows, (row) => paletteBanks(row.fadedPalette)[2]), [24, 164])
    && same(transitions(rows, (row) => paletteBanks(row.hardwarePalette)[2]), [25, 165]), `${side}: Ghost BG palette latches`);
  invariant(transitions(rows, (row) => row.rawBattleState.gameplayRng).length === 0
    && transitions(rows, (row) => row.animationRng).length === 185, `${side}: RNG ownership split`);
  return {
    reducerRows: rows.length,
    seamRows: rows.length,
    lifecycle: {
      whiteShadow: "43..137", whiteShadowTask: "43..139", shake: "93..137",
      palette: "93..116 / 119..142", fade: "4..41 / 144..181", firstInactive: 187,
    },
    latches: {
      oam: "187/187 predecessor", matrices: "187/187 predecessor",
      palettes: "187/187 predecessor; Ghost BG 24/25 and 164/165",
      whiteShadowHardwareRank: "11 ages 44..138",
    },
    cleanup: { age: 187, active: false, visualTasks: 0, sprites: 0, framebufferCompared: false },
  };
}

export function verifyDestinyBondReducer(): Json {
  const result: Json = {};
  for (const side of ["player-back", "opponent-front"] as const) {
    const first = runSide(side);
    invariant(same(runSide(side), first), `${side}: deterministic second replay`);
    result[side] = first;
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(verifyDestinyBondReducer(), null, 2));
}
