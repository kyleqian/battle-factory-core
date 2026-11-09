/** Strict shared-production-framebuffer verifier for retained Belly Drum evidence. */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  createSceneOnMovePresentation,
  sceneOnBellyDrumView,
  type SceneOnBellyDrumConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { bellyDrumAtAge } from "../../src/animation/bellyDrum.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/belly-drum-evidence.json",
  "utf8",
));

export type BellyDrumOrientation = "player-back" | "opponent-front";

type DenseSprite = Readonly<{
  slot: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  matrix?: readonly number[];
  template?: Readonly<{ symbol?: string }>;
}>;

type DenseMon = Readonly<{
  species: number;
  hp: number;
  maxHp: number;
}>;

type DenseRow = Readonly<{
  frame: number;
  sha256: string;
  scriptOffset: number | null;
  visualTaskCount: number;
  gAnimScriptActive: boolean;
  animationBattlers: Readonly<{
    attacker: number;
    spriteIds: readonly number[];
  }>;
  battlers: Readonly<{ player: DenseMon; opponent: DenseMon }>;
  sprites: readonly DenseSprite[];
  tasks: readonly Readonly<{ func?: Readonly<{ symbol?: string }> }> [];
  softwareOam: readonly string[];
  hardwareOam: readonly string[];
  softwareMatrices: readonly (readonly number[])[];
  hardwareMatrices: readonly (readonly number[])[];
  fadedPalette: readonly number[];
  hardwarePalette: readonly number[];
}>;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function findRgb(root: string, filename: string): string {
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      try {
        return findRgb(path, filename);
      } catch {
        continue;
      }
    }
    if (entry === filename) return path;
  }
  throw new Error(`missing ${filename} below ${root}`);
}

function spriteAt(row: DenseRow, slot: number): DenseSprite {
  const sprite = row.sprites.find((candidate) => candidate.slot === slot);
  if (!sprite) throw new Error(`missing live battler sprite slot ${slot}`);
  return sprite;
}

function battler(
  species: "POLIWRATH" | "ONIX",
  side: "player" | "opponent",
  sprite: DenseSprite,
  animationCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter,
      battlePositionCenter: side === "player"
        ? { x: 72, y: 80 }
        : { x: 176, y: 40 },
    },
  };
}

export function bellyDrumConfigFor(
  orientation: BellyDrumOrientation,
  rows: readonly DenseRow[],
): SceneOnBellyDrumConfig {
  const first = rows[0]!;
  const playerAttacker = orientation === "player-back";
  const attackerIndex = playerAttacker ? 0 : 1;
  const otherIndex = playerAttacker ? 1 : 0;
  const attackerSprite = spriteAt(first, first.animationBattlers.spriteIds[attackerIndex]!);
  const otherSprite = spriteAt(first, first.animationBattlers.spriteIds[otherIndex]!);
  const playerMon = first.battlers.player;
  const opponentMon = first.battlers.opponent;
  const noteOrigin = playerAttacker ? { x: 72, y: 107 } : { x: 176, y: 56 };
  return {
    move: "BELLY_DRUM",
    attacker: battler(
      "POLIWRATH",
      playerAttacker ? "player" : "opponent",
      attackerSprite,
      noteOrigin,
    ),
    target: battler(
      "ONIX",
      playerAttacker ? "opponent" : "player",
      otherSprite,
      playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 80 },
    ),
    attackerNoteOrigin: noteOrigin,
    fieldProfile: {
      playerHp: playerMon.hp,
      playerMaxHp: playerMon.maxHp,
      opponentHp: opponentMon.hp,
      opponentMaxHp: opponentMon.maxHp,
      playerGender: "male",
      opponentGender: "male",
    },
  };
}

function auditDenseRows(
  orientation: BellyDrumOrientation,
  rows: readonly DenseRow[],
): void {
  const origin = orientation === "player-back" ? { x: 72, y: 107 } : { x: 176, y: 56 };
  let oamLatches = 0;
  let matrixLatches = 0;
  let paletteLatches = 0;
  for (const [age, row] of rows.entries()) {
    const body = bellyDrumAtAge(age, origin, orientation === "player-back" ? "player" : "opponent");
    const notes = row.sprites.filter((sprite) =>
      sprite.template?.symbol === "gSlowFlyingMusicNotesSpriteTemplate");
    const hands = row.sprites.filter((sprite) =>
      sprite.template?.symbol === "gBellyDrumHandSpriteTemplate");
    const shakes = row.tasks.filter((task) => task.func?.symbol === "AnimTask_ShakeMon_Step");
    if (body.notes.length !== notes.length || body.hands.length !== hands.length
      || body.shakeTasks.length !== shakes.length || body.visualTaskCount !== row.visualTaskCount
      || body.sourceOffset !== row.scriptOffset) {
      throw new Error(`${orientation} age ${age}: reducer lifecycle mismatch`);
    }
    for (const note of body.notes) {
      const sprite = notes.find((candidate) => candidate.slot === note.spriteSlot);
      if (!sprite || sprite.x !== note.x || sprite.y !== note.y
        || sprite.x2 !== note.x2 || sprite.y2 !== note.y2
        || sprite.matrix?.[0] !== note.affinePaPd) {
        throw new Error(`${orientation} age ${age}: note ${note.index} mismatch`);
      }
    }
    if (age > 0) {
      const previous = rows[age - 1]!;
      if (JSON.stringify(row.hardwareOam) === JSON.stringify(previous.softwareOam)) oamLatches += 1;
      if (JSON.stringify(row.hardwareMatrices) === JSON.stringify(previous.softwareMatrices)) matrixLatches += 1;
      if (JSON.stringify(row.hardwarePalette) === JSON.stringify(previous.fadedPalette)) paletteLatches += 1;
    }
  }
  if (oamLatches !== 109 || matrixLatches !== 109 || paletteLatches !== 109
    || rows.at(-1)?.gAnimScriptActive !== false) {
    throw new Error(`${orientation}: incomplete transfer/cleanup proof`);
  }
}

function verifyRawEvidence(
  orientation: BellyDrumOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
  expectedSequenceSha256: string,
  changeMapPath: string,
): void {
  const rgb = rows.map((row) => readFileSync(findRgb(
    rgbRoot,
    `${String(row.frame).padStart(5, "0")}.rgb`,
  )));
  for (const [age, bytes] of rgb.entries()) {
    if (sha256(bytes) !== rows[age]!.sha256) {
      throw new Error(`${orientation} age ${age}: raw RGB row hash`);
    }
  }
  if (sha256(Buffer.concat(rgb)) !== expectedSequenceSha256) {
    throw new Error(`${orientation}: raw RGB sequence hash`);
  }
  const rgbDir = dirname(findRgb(
    rgbRoot,
    `${String(rows[0]!.frame).padStart(5, "0")}.rgb`,
  ));
  const map = spawnSync("python3", ["tools/compare/frame-changemap.py", rgbDir], {
    encoding: "utf8",
  });
  if (map.status !== 0) throw new Error(`${orientation}: change-map generation failed`);
  const normalized = map.stdout.split("\n");
  normalized[0] = `# belly-drum-${orientation === "player-back" ? "player" : "opponent"} raw RGB888 — 110 frames, 240x160`;
  if (normalized.join("\n") !== readFileSync(changeMapPath, "utf8")) {
    throw new Error(`${orientation}: retained normalized change map drifted`);
  }
}

export function compareBellyDrumRows(
  orientation: BellyDrumOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(bellyDrumConfigFor(orientation, rows));
  const failures: string[] = [];
  let matched = 0;
  let residualPixels = 0;
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnBellyDrumView({ ...stage, age });
    if (seam.age !== age || seam.visualTaskCount !== row.visualTaskCount) {
      throw new Error(`${orientation} age ${age}: typed seam mismatch`);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(
      rgbRoot,
      `${String(row.frame).padStart(5, "0")}.rgb`,
    ));
    let residual = 0;
    let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
      residual += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(`${age}:${residual}:${minX},${minY}-${maxX},${maxY}`);
  }
  return { matched, residualPixels, failures };
}

export function verifyBellyDrumFramebuffer(): readonly Readonly<{
  orientation: BellyDrumOrientation;
  componentRows: 110;
  seamRows: 110;
  rawRgbRows: 110;
  framebufferRows: 110;
  residualPixels: 0;
}>[] {
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const receipt = fixture.orientations[orientation];
    const denseBytes = readFileSync(receipt.denseState);
    if (sha256(denseBytes) !== receipt.denseStateSha256
      || sha256(readFileSync(receipt.rawRgb)) !== receipt.rawRgbArchiveSha256) {
      throw new Error(`${orientation}: retained archive hash drifted`);
    }
    const rows = JSON.parse(gunzipSync(denseBytes).toString()).frames as DenseRow[];
    if (rows.length !== 110) throw new Error(`${orientation}: expected 110 rows`);
    auditDenseRows(orientation, rows);
    const scratch = createScratchDir(`pokebench-belly-drum-${orientation}-`);
    const unpack = spawnSync("tar", ["-xzf", receipt.rawRgb, "-C", scratch]);
    if (unpack.status !== 0) throw new Error(`${orientation}: RGB archive unpack failed`);
    verifyRawEvidence(
      orientation,
      rows,
      scratch,
      receipt.rawRgbSequenceSha256,
      receipt.changeMap,
    );
    const compared = compareBellyDrumRows(orientation, rows, scratch);
    if (compared.failures.length) {
      throw new Error(
        `${orientation}: ${compared.matched}/${rows.length}, residual ${compared.residualPixels}; `
        + compared.failures.join(","),
      );
    }
    total += compared.matched;
    results.push({
      orientation,
      componentRows: 110 as const,
      seamRows: 110 as const,
      rawRgbRows: 110 as const,
      framebufferRows: compared.matched as 110,
      residualPixels: compared.residualPixels as 0,
    });
  }
  if (total !== 220) throw new Error(`incomplete bilateral proof ${total}/220`);
  return results;
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  for (const result of verifyBellyDrumFramebuffer()) {
    console.log(`${result.orientation}: component=110/110 seam=110/110 rawRGB=110/110 framebuffer=110/110 residual=0`);
  }
  console.log("MOVE_BELLY_DRUM: 220/220 exact with zero residual pixels");
}
