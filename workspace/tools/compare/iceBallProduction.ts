/** Dense ten-window reducer and typed-seam verifier for MOVE_ICE_BALL. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { iceBallAtAge, type IceBallArt, type IceBallCounter,
  type IceBallLiveInputs } from "../../src/animation/iceBall.ts";
import { sceneOnIceBallView,
  type SceneOnIceBallConfig } from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type IceBallOrientation = "player-back" | "opponent-front";
export type IceBallWindow = `${IceBallOrientation}-${1 | 2 | 3 | 4 | 5}`;
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_ICE_BALL production drift: ${message}`);
}
const sideOf = (window: IceBallWindow): "player" | "opponent" =>
  window.startsWith("player-back") ? "player" : "opponent";
const bodyOf = (window: IceBallWindow): 1 | 2 | 3 | 4 | 5 => Number(window.at(-1)) as 1 | 2 | 3 | 4 | 5;
export function iceBallRowsFor(window: IceBallWindow): Json[] {
  const probe = JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/fixtures/ice-ball/${sideOf(window)}-dense.json.gz`))).toString());
  return probe.bodies[bodyOf(window) - 1];
}
const spriteById = (row: Json, id: number): Json => {
  const sprite = row.sprites.find((entry: Json) => entry.slot === id);
  invariant(sprite, `missing battler sprite ${id}`); return sprite;
};
const art = (sprite: Json, displaySpecies: string): IceBallArt => ({ displaySpecies,
  slot: sprite.slot, attr: sprite.attr, subpriority: sprite.subpriority });
const task = (entry: Json) => ({ slot: entry.slot, callback: entry.func?.symbol ?? "", data: entry.data });
const tagBase = (row: Json, tag: number): { loaded: boolean; base: number } => {
  const index = row.tileTags.slice(0, 64).indexOf(tag);
  return { loaded: index >= 0, base: index < 0 ? 0 : row.allocators.tileRanges[index][0] };
};

export function iceBallInputsFor(window: IceBallWindow, rows = iceBallRowsFor(window), age = 0): IceBallLiveInputs {
  const row = rows[age]!; const first = rows[0]!;
  const attackerSide = sideOf(window); const targetSide = attackerSide === "player" ? "opponent" : "player";
  const attackerId = row.animationBattlers.spriteIds[row.animationBattlers.attacker];
  const targetId = row.animationBattlers.spriteIds[row.animationBattlers.target];
  const attackerSprite = spriteById(row, attackerId), targetSprite = spriteById(row, targetId);
  const chunk = tagBase(row, 10043), crystals = tagBase(row, 10141);
  const creation = rows[37]!;
  return { counter: bodyOf(window) - 1 as IceBallCounter, attackerSide, targetSide,
    attackerSpecies: "SPHEAL", targetSpecies: "REGISTEEL",
    // Source species-coordinate tables, supplied as live presentation geometry:
    // SPHEAL back/front Y_PIC_OFFSET 104/56; REGISTEEL front/back 43/102.
    attackerPictureOffset: attackerSide === "player" ? { x: 72, y: 104 } : { x: 176, y: 56 },
    targetPictureOffset: targetSide === "opponent" ? { x: 176, y: 43 } : { x: 72, y: 102 },
    attackerArt: art(attackerSprite, "SPHEAL"), targetArt: art(targetSprite, "REGISTEEL"),
    allocation: { chunkSlot: creation.sprites.find((sprite: Json) =>
      sprite.template?.symbol === "gIceBallChunkSpriteTemplate").slot,
    shardSlots: creation.sprites.filter((sprite: Json) =>
      sprite.template?.symbol === "gIceBallImpactShardSpriteTemplate").map((sprite: Json) => sprite.slot),
    state: row.allocators },
    buffers: { softwareOam: row.softwareOam, hardwareOam: row.hardwareOam,
      softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices },
    palette: { unfaded: row.unfadedPalette, faded: row.fadedPalette, hardware: row.hardwarePalette },
    registers: row.registers, resources: { chunkTileBase: chunk.base, chunkLoaded: chunk.loaded,
      crystalsTileBase: crystals.base, crystalsLoaded: crystals.loaded },
    tasks: row.tasks.map(task), order: row.spriteOrder, audio: row.audio,
    liveCounts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
      matrixBitmap: row.allocators.matrixBitmap }, initialPresentationRng: first.animationRng,
    gameplayRng: row.immutableState.rngValue, gameplayState: row.immutableState };
}

export function iceBallConfigFor(window: IceBallWindow, rows = iceBallRowsFor(window), age = 0): SceneOnIceBallConfig {
  const input = iceBallInputsFor(window, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerPictureOffset,
    targetPictureOffset, ...animationInputs } = input;
  const row = rows[age]!; const player = row.parties.player[0], opponent = row.parties.opponent[0];
  const attackerSprite = spriteById(row, row.animationBattlers.spriteIds[row.animationBattlers.attacker]);
  const targetSprite = spriteById(row, row.animationBattlers.spriteIds[row.animationBattlers.target]);
  return { move: "ICE_BALL",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide,
      spriteCorner: { x: attackerSprite.x - 32, y: attackerSprite.y - 32 },
      animationCenter: attackerPictureOffset, battlePositionCenter: attackerPictureOffset } },
    target: { species: targetSpecies as never, geometry: { side: targetSide,
      spriteCorner: { x: targetSprite.x - 32, y: targetSprite.y - 32 },
      animationCenter: targetPictureOffset, battlePositionCenter: targetPictureOffset } },
    fieldProfile: { playerHp: player.hp, playerMaxHp: player.maxHp,
      opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
      playerGender: player.gender, opponentGender: opponent.gender }, animationInputs };
}

export function verifyIceBallProduction(): Json {
  const windows: Json[] = [];
  for (const orientation of ["player-back", "opponent-front"] as const) for (const body of [1, 2, 3, 4, 5] as const) {
    const window = `${orientation}-${body}` as IceBallWindow; const rows = iceBallRowsFor(window);
    invariant(rows.length === (body === 5 ? 132 : 76), `${window}: corpus length`);
    const hashes: string[] = [];
    for (let pass = 0; pass < 2; pass += 1) {
      const hash = createHash("sha256");
      for (const [age, row] of rows.entries()) {
        const state = iceBallAtAge(age, iceBallInputsFor(window, rows, age));
        invariant(state.source.pointer === row.scriptPtr && state.source.offset === row.scriptOffset
          && state.active === Boolean(row.animScriptActive), `${window}/${age}: source cursor`);
        invariant(state.rng.presentation === row.animationRng, `${window}/${age}: presentation RNG`);
        const owned = row.sprites.filter((sprite: Json) =>
          sprite.template?.symbol === "gIceBallChunkSpriteTemplate"
          || sprite.template?.symbol === "gIceBallImpactShardSpriteTemplate");
        invariant(state.sprites.length === owned.length, `${window}/${age}: owned sprite count`);
        for (const sprite of state.sprites) {
          const expected = owned.find((item: Json) => item.slot === sprite.slot);
          invariant(expected && sprite.x === expected.x && sprite.y === expected.y
            && sprite.x2 === expected.x2 && sprite.y2 === expected.y2
            && sprite.callback === expected.callback.symbol, `${window}/${age}: ${sprite.kind} callback/position`);
          if (sprite.kind === "shard") invariant(same(sprite.data, expected.data), `${window}/${age}: shard data`);
        }
        invariant(state.background.phase === (body === 5 && age >= 26 && age < 111 ? "ice" : "battle"),
          `${window}/${age}: background`);
        invariant(same(state.gameplay, row.immutableState) && state.rng.gameplay === row.immutableState.rngValue,
          `${window}/${age}: gameplay opacity`);
        const view = sceneOnIceBallView({ age, config: iceBallConfigFor(window, rows, age) });
        const { attacker: _attacker, target: _target, ...plain } = view;
        invariant(same(plain, state), `${window}/${age}: typed seam`); hash.update(JSON.stringify(state));
      }
      hashes.push(hash.digest("hex"));
    }
    invariant(hashes[0] === hashes[1], `${window}: determinism`);
    windows.push({ window, rows: rows.length, passes: 2, componentRows: rows.length * 2,
      seamRows: rows.length * 2, counter: body - 1, shards: [5, 7, 9, 10, 10][body - 1],
      shakeDuration: [8, 10, 14, 18, 30][body - 1], sha256: hashes[0] });
  }
  return { schema: "ice-ball-production-verdict/v1", move: "MOVE_ICE_BALL", rows: 872,
    componentMatched: 872, seamMatched: 872, windows };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify(verifyIceBallProduction(), null, 2));
}
