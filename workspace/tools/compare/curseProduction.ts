/** Four-window reducer and typed Scene-ON seam verifier for MOVE_CURSE. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { curseAtAge, type CurseLiveInputs, type CurseSprite } from "../../src/animation/curse.ts";
import { sceneOnCurseView, type SceneOnCurseConfig } from "../../src/animation/sceneOnPresentation.ts";
import timingFixture from "./fixtures/curse-palette-transfer-timing.json" with { type: "json" };

type Json = Record<string, any>;
export type CurseWindow = "ghost-player" | "ghost-opponent" | "stats-player" | "stats-opponent";
const root = resolve(import.meta.dirname, "../..");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`MOVE_CURSE production drift: ${message}`);
}
const OWNED = new Set(["gCurseNailSpriteTemplate", "gCurseGhostSpriteTemplate",
  "gSimplePaletteBlendSpriteTemplate"]);
const branchOf = (window: CurseWindow): "ghost" | "stats" => window.startsWith("ghost") ? "ghost" : "stats";
const sideOf = (window: CurseWindow): "player" | "opponent" => window.endsWith("player") ? "player" : "opponent";
const speciesFor = (window: CurseWindow) => ({ attacker: branchOf(window) === "ghost" ? "HAUNTER" : "SNORLAX",
  defender: "MAGIKARP" });

export function curseRowsFor(window: CurseWindow): Json[] {
  return JSON.parse(gunzipSync(readFileSync(resolve(root,
    `tools/compare/evidence/curse-${window}-dense-state.json.gz`))).toString()).frames;
}
const art = (sprite: Json, displaySpecies: string) => ({ displaySpecies, slot: sprite.slot,
  attr: sprite.attr, subpriority: sprite.subpriority });
const semantic = (sprite: Json): CurseSprite => ({ slot: sprite.slot,
  template: sprite.template?.symbol ?? "", callback: sprite.callback?.symbol ?? "",
  attr: sprite.attr, matrix: sprite.matrix, matrixNum: sprite.matrixNum,
  data: sprite.data, invisible: sprite.invisible });
const center = (sprite: Json) => ({ x: sprite.x + sprite.x2, y: sprite.y + sprite.y2 });

export function curseInputsFor(window: CurseWindow, rows = curseRowsFor(window), age = 0): CurseLiveInputs {
  const row = rows[age]!; const attackerSide = sideOf(window); const branch = branchOf(window);
  const playerSprite = row.sprites.find((sprite: Json) => sprite.slot === row.animationBattlers.spriteIds[0]);
  const opponentSprite = row.sprites.find((sprite: Json) => sprite.slot === row.animationBattlers.spriteIds[1]);
  invariant(playerSprite && opponentSprite, `${window}/${age}: live field battlers`);
  const attackerSprite = attackerSide === "player" ? playerSprite : opponentSprite;
  const defenderSprite = attackerSide === "player" ? opponentSprite : playerSprite;
  const animationTargetSprite = row.battlerSprites.target;
  const species = speciesFor(window);
  const nailIndex = row.tileTags.slice(0, 64).indexOf(10199);
  const ghostIndex = row.tileTags.slice(0, 64).indexOf(10200);
  const previousTasks = rows[age - 1]?.tasks ?? [];
  const firstStep2 = row.tasks.some((task: Json) => task.func?.symbol === "AnimTask_CurseStretchingBlackBg_Step2")
    && previousTasks.some((task: Json) => task.func?.symbol === "AnimTask_CurseStretchingBlackBg_Step1");
  const timingSide = attackerSide === "player" ? "player-back" : "opponent-front";
  const timing = (timingFixture.orientations as Json)[timingSide];
  if (firstStep2) invariant(row.frame === timing.firstStep2TraceFrame,
    `${window}/${age}: direct timing frame`);
  return { branch, attackerSide, defenderSide: attackerSide === "player" ? "opponent" : "player",
    attackerSpecies: species.attacker, defenderSpecies: species.defender,
    attackerCenter: center(attackerSprite), defenderCenter: center(defenderSprite),
    attackerArt: art(attackerSprite, species.attacker), defenderArt: art(defenderSprite, species.defender),
    animationTargetArt: art(animationTargetSprite,
      branch === "stats" ? species.attacker : species.defender),
    ownedSprites: row.sprites.filter((sprite: Json) => OWNED.has(sprite.template?.symbol)
      || ["AnimCurseNail_End", "AnimCurseNail_Step1", "AnimCurseNail_Step2",
        "AnimGhostStatusSprite", "AnimGhostStatusSprite_Step",
        "AnimSimplePaletteBlend_Step"].includes(sprite.callback?.symbol)).map(semantic),
    liveTasks: row.tasks.map((task: Json) => ({ slot: task.slot,
      callback: task.func?.symbol ?? "", data: task.data })),
    buffers: { softwareOam: row.softwareOam, hardwareOam: row.hardwareOam,
      softwareMatrices: row.softwareMatrices, hardwareMatrices: row.hardwareMatrices,
      scanlineBuffers: row.scanlineBuffers },
    palette: { unfaded: row.unfadedPalette, faded: row.fadedPalette,
      hardware: row.hardwarePalette },
    paletteScanoutTransfer: firstStep2 ? { beforeHardware: rows[age - 1]!.hardwarePalette,
      vcount: timing.vcount, inHBlank: timing.inHBlank,
      firstPostTransferScanline: timing.firstPostTransferScanline } : null,
    registers: row.registers, battleBg: row.battleBg,
    resources: { nailTileBase: nailIndex < 0 ? 0 : row.resourceAllocators.tileRanges[nailIndex][0],
      ghostTileBase: ghostIndex < 0 ? 0 : row.resourceAllocators.tileRanges[ghostIndex][0],
      nailLoaded: nailIndex >= 0, ghostLoaded: ghostIndex >= 0,
      allocator: row.resourceAllocators },
    order: row.spriteOrder, audio: row.audio,
    liveCounts: { visualTasks: row.visualTaskCount, soundTasks: row.soundTaskCount,
      matrixBitmap: row.resourceAllocators.matrixBitmap }, animationRng: row.animationRng,
    gameplayRng: row.immutableState.rngValue, gameplayState: row.immutableState };
}

export function curseConfigFor(window: CurseWindow, rows = curseRowsFor(window), age = 0): SceneOnCurseConfig {
  const input = curseInputsFor(window, rows, age); const row = rows[age]!;
  const { attackerSide, defenderSide, attackerSpecies, defenderSpecies,
    attackerCenter, defenderCenter, ...animationInputs } = input;
  const player = row.parties.player[0]; const opponent = row.parties.opponent[0];
  return { move: "CURSE", attacker: { species: attackerSpecies as never,
    geometry: { side: attackerSide, spriteCorner: { x: attackerCenter.x - 32, y: attackerCenter.y - 32 },
      animationCenter: attackerCenter, battlePositionCenter: attackerCenter } },
  target: { species: defenderSpecies as never,
    geometry: { side: defenderSide, spriteCorner: { x: defenderCenter.x - 32, y: defenderCenter.y - 32 },
      animationCenter: defenderCenter, battlePositionCenter: defenderCenter } },
  fieldProfile: { playerHp: player.hp, playerMaxHp: player.maxHp,
    opponentHp: opponent.hp, opponentMaxHp: opponent.maxHp,
    playerGender: player.gender, opponentGender: opponent.gender }, animationInputs };
}

export function verifyCurseProduction(): Json {
  const output: Json = {};
  for (const window of ["ghost-player", "ghost-opponent", "stats-player", "stats-opponent"] as const) {
    const rows = curseRowsFor(window); const expected = branchOf(window) === "ghost" ? 373 : 176;
    invariant(rows.length === expected, `${window}: corpus`); const hashes: string[] = [];
    for (let pass = 0; pass < 2; pass += 1) { const hash = createHash("sha256");
      for (const [age, row] of rows.entries()) {
        const state = curseAtAge(age, curseInputsFor(window, rows, age));
        invariant(state.source.pointer === row.scriptPtr && state.source.offset === row.scriptOffset
          && state.active === Boolean(row.animScriptActive), `${window}/${age}: source cursor`);
        invariant(same(state.buffers.hardwareOam, row.hardwareOam)
          && same(state.buffers.hardwareMatrices, row.hardwareMatrices)
          && same(state.palette.hardware, row.hardwarePalette), `${window}/${age}: hardware`);
        invariant(same(state.registers, row.registers) && same(state.audio, row.audio),
          `${window}/${age}: registers/audio`);
        invariant(same(state.gameplay, row.immutableState)
          && same(state.rng.gameplay, row.immutableState.rngValue), `${window}/${age}: gameplay`);
        const view = sceneOnCurseView({ age, config: curseConfigFor(window, rows, age) });
        const { attacker: _attacker, target: _target, ...plain } = view;
        invariant(same(plain, state), `${window}/${age}: seam`); hash.update(JSON.stringify(state));
      }
      hashes.push(hash.digest("hex"));
    }
    invariant(hashes[0] === hashes[1], `${window}: deterministic`);
    output[window] = { rows: expected, passes: 2, componentRows: expected * 2,
      seamRows: expected * 2, branch: branchOf(window), sha256: hashes[0] };
  }
  return output;
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  console.log(JSON.stringify(verifyCurseProduction(), null, 2));
}
