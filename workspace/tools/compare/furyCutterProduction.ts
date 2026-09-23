/** Dense eight-window reducer and typed-seam verifier for MOVE_FURY_CUTTER. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { furyCutterAtAge, type FuryCutterLiveInputs,
  type FuryCutterSprite } from "../../src/animation/furyCutter.ts";
import { sceneOnFuryCutterView,
  type SceneOnFuryCutterConfig } from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type FuryCutterOrientation = "player-back" | "opponent-front";
export type FuryCutterWindow = `${FuryCutterOrientation}-${1 | 2 | 3 | 4}`;
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_FURY_CUTTER production drift: ${message}`);
}
const OWNED = new Set(["gCuttingSliceSpriteTemplate", "gComplexPaletteBlendSpriteTemplate"]);
const sideOf = (window: FuryCutterWindow): "player" | "opponent" =>
  window.startsWith("player-back") ? "player" : "opponent";
const counterOf = (window: FuryCutterWindow): 1 | 2 | 3 | 4 => Number(window.at(-1)) as 1 | 2 | 3 | 4;
export function furyCutterRowsFor(window: FuryCutterWindow): Json[] {
  const side = sideOf(window);
  const probe = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/fury-cutter-${side}-dense-state.json.gz`))).toString());
  const counter = counterOf(window);
  return probe.frames.slice((counter - 1) * 43, counter * 43);
}
const art = (sprite: Json, displaySpecies: string) => ({ displaySpecies, slot: sprite.slot,
  attr: sprite.attr, subpriority: sprite.subpriority });
const semantic = (sprite: Json): FuryCutterSprite => ({ slot: sprite.slot,
  template: sprite.template.symbol, callback: sprite.callback.symbol,
  attr: sprite.attr, matrix: sprite.matrix, matrixNum: sprite.matrixNum, data: sprite.data });
const center = (sprite: Json): { x: number; y: number } => ({ x: sprite.x + sprite.x2,
  y: sprite.y + sprite.y2 });

export function furyCutterInputsFor(
  window: FuryCutterWindow,
  rows = furyCutterRowsFor(window),
  age = 0,
): FuryCutterLiveInputs {
  const row = rows[age]!; const attackerIsPlayer = sideOf(window) === "player";
  const attackerSprite = row.battlerSprites.attacker;
  const targetSprite = row.battlerSprites.target;
  const tagIndex = row.tileTags.slice(0, 64).indexOf(10138);
  return { counter: counterOf(window), attackerSide: attackerIsPlayer ? "player" : "opponent",
    targetSide: attackerIsPlayer ? "opponent" : "player",
    // MechanicLab replaces party data after the canonical display art is loaded.
    attackerSpecies: "KECLEON", targetSpecies: "BLISSEY",
    attackerCenter: center(attackerSprite), targetCenter: center(targetSprite),
    attackerArt: art(attackerSprite, "KECLEON"), targetArt: art(targetSprite, "BLISSEY"),
    ownedSprites: row.sprites.filter((sprite: Json) => OWNED.has(sprite.template?.symbol)).map(semantic),
    liveTasks: row.tasks.map((task: Json) => ({ slot: task.slot,
      callback: task.func?.symbol ?? "", data: task.data })),
    buffers: { softwareOam: row.softwareOam, hardwareOam: row.hardwareOam,
      softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices },
    palette: { unfaded: row.unfadedPalette, faded: row.fadedPalette,
      hardware: row.hardwarePalette }, registers: row.registers,
    resources: { cutTileBase: tagIndex < 0 ? 0 : row.resourceAllocators.tileRanges[tagIndex][0],
      cutLoaded: tagIndex >= 0, allocator: row.resourceAllocators },
    order: row.spriteOrder, audio: row.audio,
    liveCounts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
      matrixBitmap: row.resourceAllocators.matrixBitmap },
    animationRng: row.animationRng, gameplayRng: row.immutableState.rngValue,
    gameplayState: row.immutableState };
}

export function furyCutterConfigFor(
  window: FuryCutterWindow,
  rows = furyCutterRowsFor(window),
  age = 0,
): SceneOnFuryCutterConfig {
  const input = furyCutterInputsFor(window, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerCenter, targetCenter,
    ...animationInputs } = input;
  const row = rows[age]!; const player = row.parties.player[0]; const opponent = row.parties.opponent[0];
  return { move: "FURY_CUTTER",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide,
      spriteCorner: { x: attackerCenter.x - 32, y: attackerCenter.y - 32 },
      animationCenter: attackerCenter, battlePositionCenter: attackerCenter } },
    target: { species: targetSpecies as never, geometry: { side: targetSide,
      spriteCorner: { x: targetCenter.x - 32, y: targetCenter.y - 32 },
      animationCenter: targetCenter, battlePositionCenter: targetCenter } },
    fieldProfile: { playerHp: player.hp, playerMaxHp: player.maxHp,
      opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
      playerGender: player.gender, opponentGender: opponent.gender }, animationInputs };
}

export function verifyFuryCutterProduction(): Json {
  const output: Json = {};
  for (const orientation of ["player-back", "opponent-front"] as const) {
    for (const counter of [1, 2, 3, 4] as const) {
      const window = `${orientation}-${counter}` as FuryCutterWindow;
      const rows = furyCutterRowsFor(window); invariant(rows.length === 43, `${window}: corpus`);
      const hashes: string[] = [];
      for (let pass = 0; pass < 2; pass += 1) {
        const hash = createHash("sha256");
        for (const [age, row] of rows.entries()) {
          const state = furyCutterAtAge(age, furyCutterInputsFor(window, rows, age));
          invariant(state.source.pointer === row.scriptPtr && state.source.offset === row.scriptOffset
            && state.active === Boolean(row.animScriptActive), `${window}/${age}: source cursor`);
          invariant(state.source.power === row.animationMovePower, `${window}/${age}: power`);
          invariant(same(state.sprites, row.sprites.filter((sprite: Json) =>
            OWNED.has(sprite.template?.symbol)).map(semantic)), `${window}/${age}: sprites`);
          invariant(same(state.buffers.hardwareOam, row.hardwareOam)
            && same(state.buffers.hardwareMatrices, row.hardwareMatrices)
            && same(state.palette.hardware, row.hardwarePalette), `${window}/${age}: hardware`);
          invariant(same(state.registers, row.registers) && same(state.audio, row.audio),
            `${window}/${age}: registers/audio`);
          invariant(same(state.gameplay, row.immutableState)
            && same(state.rng.gameplay, row.immutableState.rngValue), `${window}/${age}: gameplay`);
          const view = sceneOnFuryCutterView({ age, config: furyCutterConfigFor(window, rows, age) });
          const { attacker: _attacker, target: _target, ...plain } = view;
          invariant(same(plain, state), `${window}/${age}: seam`); hash.update(JSON.stringify(state));
        }
        hashes.push(hash.digest("hex"));
      }
      invariant(hashes[0] === hashes[1], `${window}: deterministic`);
      output[window] = { rows: 43, passes: 2, componentRows: 86, seamRows: 86,
        power: [10, 20, 40, 80][counter - 1],
        direction: counter % 2 ? "right" : "left", sha256: hashes[0] };
    }
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify(verifyFuryCutterProduction(), null, 2));
}
