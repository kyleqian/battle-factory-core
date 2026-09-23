/** Dense six-window production reducer and typed-seam verifier for MOVE_SPIT_UP. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { spitUpAtAge, type SpitUpLiveInputs, type SpitUpSprite } from "../../src/animation/spitUp.ts";
import { sceneOnSpitUpView, type SceneOnSpitUpConfig } from "../../src/animation/sceneOnPresentation.ts";

type Json = Record<string, any>;
export type SpitUpOrientation = "player-back" | "opponent-front";
export type SpitUpWindow = `${SpitUpOrientation}-${1 | 2 | 3}`;
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_SPIT_UP production drift: ${message}`);
}
const OWNED = new Set(["gSpitUpOrbSpriteTemplate", "gFlashingHitSplatSpriteTemplate"]);
const stem = (window: SpitUpWindow): string => {
  const [orientation, face, stockpiles] = window.split("-");
  return `${orientation === "player" && face === "back" ? "player" : "opponent"}-${stockpiles}`;
};
export function spitUpRowsFor(window: SpitUpWindow): Json[] {
  return JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/spit-up-${stem(window)}-dense.json.gz`))).toString()).frames;
}
const art = (sprite: Json, displaySpecies: string) => ({ displaySpecies, slot: sprite.slot,
  attr: sprite.attr, subpriority: sprite.raw ? Number.parseInt(sprite.raw.slice(-2), 16) : 0 });
const semantic = (sprite: Json): SpitUpSprite => ({ slot: sprite.slot, template: sprite.template,
  callback: sprite.callback, attr: sprite.attr, matrix: sprite.matrix,
  matrixNum: sprite.matrixNum, data: sprite.data });
const center = (sprite: Json): { x: number; y: number } => ({
  x: ((sprite.attr[1] & 0x1ff) >= 240 ? (sprite.attr[1] & 0x1ff) - 512 : sprite.attr[1] & 0x1ff) + 32,
  y: ((sprite.attr[0] & 0xff) >= 160 ? (sprite.attr[0] & 0xff) - 256 : sprite.attr[0] & 0xff) + 32,
});

export function spitUpInputsFor(window: SpitUpWindow, rows = spitUpRowsFor(window), age = 0): SpitUpLiveInputs {
  const row = rows[age]!;
  const playerAttacker = window.startsWith("player-back");
  const stockpiles = Number(window.at(-1)) as 1 | 2 | 3;
  const attackerSprite = row.sprites.find((sprite: Json) => sprite.slot === (playerAttacker ? 6 : 8))!;
  const targetSprite = row.sprites.find((sprite: Json) => sprite.slot === (playerAttacker ? 8 : 6))!;
  const tagBase = (tag: number, fallback: number): number => {
    const index = row.tileTags.slice(0, 64).indexOf(tag);
    return index < 0 ? fallback : row.allocators.tileRanges[index][0];
  };
  return {
    stockpiles,
    attackerSide: playerAttacker ? "player" : "opponent",
    targetSide: playerAttacker ? "opponent" : "player",
    // MechanicLab replaces legal party data after the canonical battle art is
    // loaded; the retained live display sprite/healthbox remains KECLEON.
    attackerSpecies: "KECLEON", targetSpecies: "BLISSEY",
    attackerCenter: center(attackerSprite), targetCenter: center(targetSprite),
    attackerArt: art(attackerSprite, "KECLEON"), targetArt: art(targetSprite, "BLISSEY"),
    ownedSprites: row.sprites.filter((sprite: Json) => OWNED.has(sprite.template)).map(semantic),
    liveTasks: row.tasks.map((task: Json) => ({ slot: task.slot, callback: task.function, data: task.data })),
    buffers: { softwareOam: row.softwareOam, hardwareOam: row.hardwareOam,
      softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices },
    palette: { unfaded: row.unfadedPalette, faded: row.fadedPalette, hardware: row.hardwarePalette },
    registers: row.registers,
    resources: { redOrbTileBase: tagBase(10237, 305), impactTileBase: tagBase(10135, 308),
      redOrbLoaded: row.tileTags.includes(10237), impactLoaded: row.tileTags.includes(10135),
      allocator: row.allocators },
    order: row.hardwareOam.map((_entry: unknown, index: number) => index), audio: row.audio,
    liveCounts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
      matrixBitmap: row.allocators.matrixBitmap },
    animationRng: row.animationRng, gameplayRng: row.gameplayRng,
    gameplayState: row.immutableState,
  };
}

export function spitUpConfigFor(window: SpitUpWindow, rows = spitUpRowsFor(window), age = 0): SceneOnSpitUpConfig {
  const input = spitUpInputsFor(window, rows, age);
  const { attackerSide, targetSide, attackerSpecies, targetSpecies, attackerCenter, targetCenter,
    ...animationInputs } = input;
  const row = rows[age]!;
  const player = row.parties.player[0]; const opponent = row.parties.opponent[0];
  return { move: "SPIT_UP",
    attacker: { species: attackerSpecies as never, geometry: { side: attackerSide,
      spriteCorner: { x: attackerCenter.x - 32, y: attackerCenter.y - 32 },
      animationCenter: attackerCenter, battlePositionCenter: attackerCenter } },
    target: { species: targetSpecies as never, geometry: { side: targetSide,
      spriteCorner: { x: targetCenter.x - 32, y: targetCenter.y - 32 },
      animationCenter: targetCenter, battlePositionCenter: targetCenter } },
    fieldProfile: { playerHp: player.hp, playerMaxHp: player.maxHp,
      opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
      playerGender: player.gender, opponentGender: opponent.gender },
    animationInputs };
}

export function verifySpitUpProduction(): Json {
  const output: Json = {};
  for (const orientation of ["player-back", "opponent-front"] as const) {
    for (const stockpiles of [1, 2, 3] as const) {
      const window = `${orientation}-${stockpiles}` as SpitUpWindow;
      const rows = spitUpRowsFor(window);
      const expectedRows = stockpiles === 3 ? 109 : 108;
      invariant(rows.length === expectedRows && !rows.at(-1)!.active, `${window}: complete corpus`);
      const hashes: string[] = [];
      for (let pass = 0; pass < 2; pass += 1) {
        const hash = createHash("sha256");
        for (const [age, row] of rows.entries()) {
          const state = spitUpAtAge(age, spitUpInputsFor(window, rows, age));
          invariant(state.source.pointer === row.scriptPtr && state.source.offset === row.scriptOffset
            && state.active === Boolean(row.active), `${window}/${age}: source cursor`);
          invariant(same(state.sprites, row.sprites.filter((sprite: Json) => OWNED.has(sprite.template)).map(semantic)),
            `${window}/${age}: owned sprites`);
          invariant(same(state.buffers.hardwareOam, row.hardwareOam)
            && same(state.buffers.hardwareMatrices, row.hardwareMatrices)
            && same(state.palette.hardware, row.hardwarePalette), `${window}/${age}: hardware buffers`);
          invariant(same(state.registers, row.registers) && same(state.audio, row.audio),
            `${window}/${age}: registers/audio`);
          invariant(same(state.gameplay, row.immutableState) && same(state.rng.gameplay, row.gameplayRng),
            `${window}/${age}: opaque gameplay`);
          const view = sceneOnSpitUpView({ age, config: spitUpConfigFor(window, rows, age) });
          const { attacker: _attacker, target: _target, ...plain } = view;
          invariant(same(plain, state), `${window}/${age}: typed seam`);
          hash.update(JSON.stringify(state));
        }
        hashes.push(hash.digest("hex"));
      }
      invariant(hashes[0] === hashes[1], `${window}: deterministic replay`);
      output[window] = { rows: expectedRows, passes: 2,
        componentRows: expectedRows * 2, seamRows: expectedRows * 2, sha256: hashes[0] };
    }
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify(verifySpitUpProduction(), null, 2));
}
