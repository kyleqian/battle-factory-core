/** Strict shared-production-framebuffer verifier for retained Screech evidence. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  screechEffectAtAge,
} from "../../src/animation/screech.ts";
import {
  createSceneOnMovePresentation,
  sceneOnScreechView,
  type SceneOnPresentationBattler,
  type SceneOnScreechConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/screech-evidence.json"),
  "utf8",
)) as Record<string, any>;

export type ScreechOrientation = "player-back" | "opponent-front";

type DenseSprite = Readonly<{
  slot: number;
  active: boolean;
  x: number;
  y: number;
  x2: number;
  y2: number;
  matrix: readonly number[];
  template: Readonly<{ symbol?: string }>;
}>;

function visualGender(
  gender: DensePartyMon["gender"],
): "male" | "female" | "none" {
  return gender === "genderless" ? "none" : gender;
}

type DensePartyMon = Readonly<{
  hp: number;
  maxHp: number;
  gender: "male" | "female" | "genderless";
}>;

type DenseRow = Readonly<{
  frame: number;
  sha256: string;
  gAnimScriptActive: boolean;
  scriptOffset: number | null;
  scriptInBounds: boolean;
  visualTaskCount: number;
  soundTaskCount: number;
  tasks: readonly Readonly<{
    active: boolean;
    func: Readonly<{ symbol?: string }>;
  }>[];
  sprites: readonly DenseSprite[];
  battlers: Readonly<{ player: DenseSprite; opponent: DenseSprite }>;
  parties: Readonly<{ player: readonly DensePartyMon[]; opponent: readonly DensePartyMon[] }>;
  immutableState: unknown;
  gameplayRng: number;
  animationRng: number;
  softwareOam: readonly string[];
  hardwareOam: readonly string[];
  softwareMatrices: readonly (readonly number[])[];
  hardwareMatrices: readonly (readonly number[])[];
  fadedPalette: readonly number[];
  hardwarePalette: readonly number[];
}>;

function sha256(value: Uint8Array | Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sourceBlock(path: string, start: string, end: string): string {
  const source = readFileSync(resolve(root, path), "utf8");
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) {
    throw new Error("missing Screech source block " + start);
  }
  return source.slice(from, to);
}

function findRgb(rootPath: string, filename: string): string {
  for (const entry of readdirSync(rootPath)) {
    const path = join(rootPath, entry);
    if (statSync(path).isDirectory()) {
      try {
        return findRgb(path, filename);
      } catch {
        continue;
      }
    }
    if (entry === filename) return path;
  }
  throw new Error("missing Screech RGB " + filename);
}

function sourceVerify(): void {
  const source = receipt.source;
  if (
    sha256(sourceBlock(
      "reference/pokeemerald/data/battle_anim_scripts.s",
      "Move_SCREECH:",
      "Move_FLAME_WHEEL:",
    )) !== source.scriptTextSha256
    || sha256(sourceBlock(
      "reference/pokeemerald/src/battle_anim_effects_2.c",
      "const union AffineAnimCmd gGrowingRingAffineAnimCmds[]",
      "const struct SpriteTemplate gMetalSoundSpriteTemplate",
    )) !== source.ringTemplateSha256
    || sha256(sourceBlock(
      "reference/pokeemerald/src/battle_anim_mon_movement.c",
      "void AnimTask_ShakeMon2(u8 taskId)",
      "// Task to facilitate simple shaking of a pokemon's picture in battle.\n"
        + "// The shaking alternates between the positive and negative versions of the specified pixel offsets\n"
        + "// with respect",
    )) !== source.shakeTaskSha256
    || sha256(sourceBlock(
      "reference/pokeemerald/src/battle_anim_mon_movement.c",
      "void AnimTask_SwayMon(u8 taskId)",
      "// Scales a mon's sprite",
    )) !== source.swayTaskSha256
    || sha256(readFileSync(resolve(root, "src/animation/assets/screech.json")))
      !== source.assetSha256
  ) {
    throw new Error("MOVE_SCREECH source or source-derived art drifted");
  }
}

function rowsFor(orientation: ScreechOrientation): readonly DenseRow[] {
  const item = receipt.orientations[orientation];
  const scenario = readFileSync(resolve(root, item.scenario));
  const dense = readFileSync(resolve(root, item.denseState));
  const rawArchive = readFileSync(resolve(root, item.rawRgbArchive));
  if (
    sha256(scenario) !== item.scenarioSha256
    || sha256(dense) !== item.denseStateSha256
    || sha256(rawArchive) !== item.rawRgbArchiveSha256
  ) {
    throw new Error(orientation + " retained evidence hash drifted");
  }
  const probeJson = gunzipSync(dense);
  if (sha256(probeJson) !== item.probeJsonSha256) {
    throw new Error(orientation + " decompressed dense evidence hash drifted");
  }
  const concatenatedRgb = execFileSync(
    "tar",
    ["-xOzf", resolve(root, item.rawRgbArchive)],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  if (
    concatenatedRgb.length !== item.window.frameCount * 240 * 160 * 3
    || sha256(concatenatedRgb) !== item.rawRgbSequenceSha256
  ) {
    throw new Error(orientation + " raw RGB sequence drifted");
  }
  return (JSON.parse(probeJson.toString("utf8")) as { frames: DenseRow[] }).frames;
}

function battler(
  species: "VOLTORB" | "ONIX",
  side: "player" | "opponent",
  source: DenseSprite,
): SceneOnPresentationBattler {
  const animationCenter = species === "VOLTORB"
    ? (side === "player" ? { x: 72, y: 102 } : { x: 176, y: 49 })
    : (side === "player" ? { x: 72, y: 88 } : { x: 176, y: 42 });
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: source.x - 32, y: source.y - 32 },
      animationCenter,
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  };
}

export function screechConfigFor(
  orientation: ScreechOrientation,
  rows: readonly DenseRow[],
): SceneOnScreechConfig {
  const first = rows[0];
  if (!first) throw new Error("empty Screech dense window");
  const playerAttacker = orientation === "player-back";
  const attacker = playerAttacker ? first.battlers.player : first.battlers.opponent;
  const target = playerAttacker ? first.battlers.opponent : first.battlers.player;
  const player = first.parties.player[0];
  const opponent = first.parties.opponent[0];
  if (!player || !opponent) throw new Error("incomplete Screech staged party");
  return {
    move: "SCREECH",
    attacker: battler(
      "VOLTORB",
      playerAttacker ? "player" : "opponent",
      attacker,
    ),
    target: battler(
      "ONIX",
      playerAttacker ? "opponent" : "player",
      target,
    ),
    fieldProfile: {
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      opponentHp: opponent.hp,
      opponentMaxHp: opponent.maxHp,
      playerGender: visualGender(player.gender),
      opponentGender: visualGender(opponent.gender),
    },
  };
}

function ringSprites(row: DenseRow): readonly DenseSprite[] {
  return row.sprites
    .filter((sprite) => sprite.active
      && sprite.template.symbol === "gScreechRingSpriteTemplate")
    .sort((left, right) => left.slot - right.slot);
}

function activeTaskNames(row: DenseRow): readonly string[] {
  return row.tasks
    .filter((task) => task.active)
    .map((task) => task.func.symbol)
    .filter((name): name is string => Boolean(name));
}

function auditRows(orientation: ScreechOrientation, rows: readonly DenseRow[]): void {
  const config = screechConfigFor(orientation, rows);
  if (
    rows.length !== 63
    || rows[0]?.frame !== receipt.orientations[orientation].window.startFrame
    || rows.at(-1)?.frame !== receipt.orientations[orientation].window.endFrame
    || !rows.every((row, age) => row.frame === rows[0]!.frame + age)
    || !rows.slice(0, -1).every((row) => row.gAnimScriptActive && row.scriptInBounds)
    || rows.at(-1)?.gAnimScriptActive
    || rows.at(-1)?.visualTaskCount !== 0
    || rows.at(-1)?.soundTaskCount !== 0
  ) {
    throw new Error(orientation + " does not retain the complete pointer window");
  }
  let oamPredecessor = 0;
  let matrixPredecessor = 0;
  let palettePredecessor = 0;
  let animationRngTransitions = 0;
  for (const [age, row] of rows.entries()) {
    const reduced = screechEffectAtAge(
      age,
      config.attacker.geometry.side,
      config.attacker.geometry.animationCenter,
      config.target.geometry.animationCenter,
    );
    const rawRings = ringSprites(row);
    if (
      reduced.sourceOffset !== row.scriptOffset
      || reduced.scriptActive !== row.gAnimScriptActive
      || rawRings.length !== reduced.rings.length
    ) {
      throw new Error(orientation + " reducer lifecycle mismatch at age " + age);
    }
    for (const [index, ring] of reduced.rings.entries()) {
      const raw = rawRings[index];
      if (
        !raw
        || raw.x !== ring.x
        || raw.y !== ring.y
        || raw.x2 !== ring.x2
        || raw.y2 !== ring.y2
        || raw.matrix[0] !== ring.xScale
        || raw.matrix[3] !== ring.yScale
      ) {
        throw new Error(orientation + " ring state mismatch at age " + age);
      }
    }
    const attacker = config.attacker.geometry.side === "player"
      ? row.battlers.player
      : row.battlers.opponent;
    const target = config.target.geometry.side === "player"
      ? row.battlers.player
      : row.battlers.opponent;
    const preSwayTargetX2 = config.target.geometry.side === "opponent" ? 1 : 0;
    const expectedTargetX2 = reduced.targetOffsetOverwrite
      ? reduced.targetOffset.x2
      : preSwayTargetX2;
    if (
      attacker.x2 !== reduced.attackerOffset.x2
      || attacker.y2 !== reduced.attackerOffset.y2
      || target.x2 !== expectedTargetX2
      || target.y2 !== 0
    ) {
      throw new Error(orientation + " battler task state mismatch at age " + age);
    }
    const taskNames = activeTaskNames(row);
    if (
      taskNames.includes("AnimTask_ShakeMon2_Step") !== reduced.shakeTaskActive
      || taskNames.includes("AnimTask_SwayMonStep") !== reduced.swayTaskActive
    ) {
      throw new Error(orientation + " task topology mismatch at age " + age);
    }
    if (age > 0) {
      const previous = rows[age - 1];
      if (!previous) throw new Error("missing Screech prior row");
      if (same(row.hardwareOam, previous.softwareOam)) oamPredecessor += 1;
      if (same(row.hardwareMatrices, previous.softwareMatrices)) matrixPredecessor += 1;
      if (same(row.hardwarePalette, previous.fadedPalette)) palettePredecessor += 1;
      if (row.animationRng !== previous.animationRng) animationRngTransitions += 1;
    }
  }
  const first = rows[0];
  if (
    oamPredecessor !== 62
    || matrixPredecessor !== 62
    || palettePredecessor !== 62
    || animationRngTransitions !== 62
    || !rows.every((row) => row.gameplayRng === first?.gameplayRng)
    || !rows.every((row) => same(row.immutableState, first?.immutableState))
  ) {
    throw new Error(orientation + " transfer, RNG, or immutable-state proof incomplete");
  }
}

export function compareScreechRows(
  orientation: ScreechOrientation,
  rows: readonly DenseRow[],
  rgbRoot: string,
): Readonly<{ matched: number; residualPixels: number; failures: readonly string[] }> {
  const stage = createSceneOnMovePresentation(screechConfigFor(orientation, rows));
  const failures: string[] = [];
  let matched = 0;
  let residualPixels = 0;
  for (const [age, row] of rows.entries()) {
    const seam = sceneOnScreechView({ ...stage, age });
    if (seam.age !== age || seam.sourceOffset !== row.scriptOffset) {
      throw new Error(orientation + " typed seam mismatch at age " + age);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    const raw = readFileSync(findRgb(
      rgbRoot,
      String(row.frame).padStart(5, "0") + ".rgb",
    ));
    if (sha256(raw) !== row.sha256) {
      throw new Error(orientation + " raw RGB hash mismatch at age " + age);
    }
    let residual = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (
        app[pixel * 4] === raw[pixel * 3]
        && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
        && app[pixel * 4 + 2] === raw[pixel * 3 + 2]
      ) {
        continue;
      }
      residual += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    residualPixels += residual;
    if (residual === 0) matched += 1;
    else failures.push(age + ":" + residual + ":" + minX + "," + minY + "-" + maxX + "," + maxY);
  }
  return { matched, residualPixels, failures };
}

export function verifyScreechFramebuffer(): readonly Readonly<{
  orientation: ScreechOrientation;
  componentRows: 63;
  seamRows: 63;
  rawRgbRows: 63;
  framebufferRows: 63;
  residualPixels: 0;
}>[] {
  if (receipt.status !== "exact" || !receipt.coverageCredit) {
    throw new Error("MOVE_SCREECH exact receipt is not promotable");
  }
  sourceVerify();
  const results = [];
  let total = 0;
  for (const orientation of ["player-back", "opponent-front"] as const) {
    const rows = rowsFor(orientation);
    auditRows(orientation, rows);
    const scratch = createScratchDir("pokebench-screech-" + orientation + "-");
    execFileSync("tar", [
      "-xzf",
      resolve(root, receipt.orientations[orientation].rawRgbArchive),
      "-C",
      scratch,
    ]);
    const compared = compareScreechRows(orientation, rows, scratch);
    if (compared.failures.length > 0) {
      throw new Error(
        orientation + ": " + compared.matched + "/63 residual "
          + compared.residualPixels + "; " + compared.failures.join(","),
      );
    }
    total += compared.matched;
    results.push({
      orientation,
      componentRows: 63 as const,
      seamRows: 63 as const,
      rawRgbRows: 63 as const,
      framebufferRows: compared.matched as 63,
      residualPixels: compared.residualPixels as 0,
    });
  }
  if (total !== 126) throw new Error("incomplete Screech bilateral proof " + total + "/126");
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  for (const result of verifyScreechFramebuffer()) {
    console.log(
      result.orientation + ": component=63/63 seam=63/63 rawRGB=63/63 framebuffer=63/63 residual=0",
    );
  }
  console.log("MOVE_SCREECH: 126/126 exact with zero residual pixels");
}
