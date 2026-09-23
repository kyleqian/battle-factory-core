/** Dense bilateral reducer/seam inputs for MOVE_WILL_O_WISP. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { willOWispAtAge, type WillOWispLiveInputs } from "../../src/animation/willOWisp.ts";
import { sceneOnWillOWispView, type SceneOnWillOWispConfig } from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type WillOWispWindow = "player-back" | "opponent-front";
const root = resolve(import.meta.dirname, "../..");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function invariant(v: unknown, m: string): asserts v { if (!v) throw new Error(`MOVE_WILL_O_WISP reducer drift: ${m}`); }
export function willOWispRowsFor(window: WillOWispWindow): Json[] {
  const stem = window === "player-back" ? "player" : "opponent";
  return JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/will-o-wisp-${stem}-dense-state.json.gz`))).toString("utf8")).frames;
}
function taskAt(rows: readonly Json[], callback: string) { for (const row of rows) {
  const task = row.tasks.find((entry: Json) => entry.func?.symbol === callback); if (task) return task.slot; }
  throw new Error(`missing task ${callback}`); }
function art(sprite: Json, displaySpecies: string) { return { displaySpecies, slot: sprite.slot,
  attr: sprite.attr, subpriority: sprite.subpriority }; }
export function willOWispInputsFor(window: WillOWispWindow,
  rows: readonly Json[] = willOWispRowsFor(window), age = 0): WillOWispLiveInputs {
  const row = rows[age]!, attackerSide = window === "player-back" ? "player" : "opponent";
  const targetSide = attackerSide === "player" ? "opponent" : "player";
  const allocator = row.resourceAllocators;
  const tileIndex = (tag: number) => allocator.tileTags.slice(0, 64).indexOf(tag);
  const paletteIndex = (tag: number) => allocator.paletteTags.indexOf(tag);
  const tileBase = (tag: number, fallback: number) => { const index = tileIndex(tag);
    return index >= 0 ? allocator.tileRanges[index][0] : fallback; };
  return { attackerSide, targetSide, attackerSpecies: "SHUPPET", targetSpecies: "SHUCKLE",
    attackerCenter: { x: rows[10]!.sprites.find((sprite: Json) =>
      sprite.template?.symbol === "gWillOWispOrbSpriteTemplate")!.x,
    y: rows[10]!.sprites.find((sprite: Json) =>
      sprite.template?.symbol === "gWillOWispOrbSpriteTemplate")!.y },
    targetCenter: { x: rows[window === "player-back" ? 163 : 162]!.sprites.find((sprite: Json) =>
      sprite.template?.symbol === "gWillOWispFireSpriteTemplate")!.x,
    y: rows[window === "player-back" ? 163 : 162]!.sprites.find((sprite: Json) =>
      sprite.template?.symbol === "gWillOWispFireSpriteTemplate")!.y },
    // mechanicLab replaces battle data with legal SHUPPET while the retained
    // carrier's already-created presentation sprite/name remains PLUSLE.
    attackerArt: art(row.battlerSprites.attacker, "PLUSLE"),
    targetArt: art(row.battlerSprites.target, "SHUCKLE"),
    taskSlots: { updateMonBg: taskAt(rows, "Task_UpdateMonBg"), clearMonBg: taskAt(rows, "Task_ClearMonBg"),
      panning: taskAt(rows, "SoundTask_AdjustPanningVar_Step"), shake: taskAt(rows, "AnimTask_ShakeMon2_Step") },
    liveTasks: row.tasks.map((task: Json) => ({ slot: task.slot, callback: task.func.symbol, data: task.data })),
    buffers: { softwareOam: row.softwareOam, hardwareOam: row.hardwareOam,
      softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices },
    palette: { unfaded: row.unfadedPalette, faded: row.fadedPalette, hardware: row.hardwarePalette },
    registers: row.registers, background: { battleVram: rows[0]!.bgVram, currentVram: row.bgVram,
      monbgPaletteBank: targetSide === "opponent" ? 8 : 9 },
    resources: { orbTileBase: tileBase(10231, 537), fireTileBase: tileBase(10232, 305),
      orbPaletteBank: Math.max(0, paletteIndex(10231) + 16), firePaletteBank: Math.max(0, paletteIndex(10232) + 16),
      orbLoaded: row.tileTags.includes(10231), fireLoaded: row.tileTags.includes(10232), allocator },
    spriteOrder: row.spriteOrder, audio: row.audio,
    liveCounts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
      matrixBitmap: allocator.matrixBitmap }, animationRng: row.animationRng,
    gameplayRng: row.rawBattleState.gameplayRng, gameplayState: row.immutableState };
}
export function willOWispConfigFor(window: WillOWispWindow,
  rows: readonly Json[] = willOWispRowsFor(window), age = 0): SceneOnWillOWispConfig {
  const input = willOWispInputsFor(window, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerCenter, targetCenter,
    ...animationInputs } = input;
  const row = rows[age]!, player = row.parties.player[0], opponent = row.parties.opponent[0];
  const sprite = (role: "attacker" | "target") => row.battlerSprites[role];
  return { move: "WILL_O_WISP",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide,
      spriteCorner: { x: sprite("attacker").x - 32, y: sprite("attacker").y - 32 },
      animationCenter: attackerCenter, battlePositionCenter: { x: sprite("attacker").x, y: sprite("attacker").y } } },
    target: { species: targetSpecies as never, geometry: { side: targetSide,
      spriteCorner: { x: sprite("target").x - 32, y: sprite("target").y - 32 },
      animationCenter: targetCenter, battlePositionCenter: { x: sprite("target").x, y: sprite("target").y } } },
    fieldProfile: { playerHp: player.hp, playerMaxHp: player.maxHp,
      opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
      playerGender: player.gender, opponentGender: opponent.gender }, animationInputs };
}
function semanticSprites(row: Json) { return row.sprites.filter((s: Json) =>
  s.template?.symbol === "gWillOWispOrbSpriteTemplate" || s.template?.symbol === "gWillOWispFireSpriteTemplate")
  .map((s: Json) => ({ kind: s.template.symbol.includes("Orb") ? "orb" : "fire", callback: s.callback.symbol,
    animation: s.animNum, x: s.x, y: s.y, x2: s.x2, y2: s.y2, invisible: s.invisible, priority: s.attr[0] >> 10 })); }
export function verifyWillOWispReducer() {
  const result: Json = {};
  for (const window of ["player-back", "opponent-front"] as const) {
    const rows = willOWispRowsFor(window), hashes: string[] = [];
    invariant(rows.length === (window === "player-back" ? 214 : 213), `${window}: complete corpus`);
    for (let pass = 0; pass < 2; pass += 1) { const hash = createHash("sha256");
      for (const [age, row] of rows.entries()) { const state = willOWispAtAge(age, willOWispInputsFor(window, rows, age));
        invariant(state.source.pointer === row.scriptPtr && state.active === row.animScriptActive, `${window}/${age}: source`);
        const reduced = state.sprites.map(({start: _s, end: _e, ordinal: _o, ...sprite}) => sprite);
        invariant(same(reduced, semanticSprites(row)), `${window}/${age}: callback trajectories`);
        invariant(same(state.buffers.hardwareOam, row.hardwareOam) && same(state.palette.hardware, row.hardwarePalette), `${window}/${age}: hardware`);
        invariant(same(state.audio, row.audio) && same(state.gameplay, row.immutableState), `${window}/${age}: audio/gameplay`);
        const view = sceneOnWillOWispView({ age, config: willOWispConfigFor(window, rows, age) });
        const { attacker: _a, target: _t, ...plain } = view;
        invariant(same(plain, state), `${window}/${age}: typed seam`);
        hash.update(JSON.stringify(state)); }
      hashes.push(hash.digest("hex")); }
    invariant(hashes[0] === hashes[1], `${window}: deterministic replay`);
    result[window] = { rows: rows.length, passes: 2, componentRows: rows.length * 2, sha256: hashes[0] };
  }
  return result;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) console.log(JSON.stringify(verifyWillOWispReducer(), null, 2));
