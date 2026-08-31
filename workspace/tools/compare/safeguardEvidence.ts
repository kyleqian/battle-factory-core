/** Strict retained-evidence audit and normalized change-map bank for Safeguard. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

type Json = any;
type Side = "player-back" | "opponent-front";

const root = resolve(import.meta.dirname, "../..");
const receipt = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/safeguard-evidence.json"),
  "utf8",
)) as Json;
const sha = (value: Uint8Array | string): string =>
  createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
const invariant = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

function transitions<T>(rows: readonly Json[], value: (row: Json) => T): number[] {
  return rows.flatMap((row, age) =>
    age === 0 || !same(value(row), value(rows[age - 1]!)) ? [age] : [],
  );
}

function rgbFrames(archive: string): Buffer[] {
  const names = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim().split("\n").filter((name) => name.endsWith(".rgb")).sort();
  return names.map((name) => execFileSync("tar", ["-xOzf", archive, name]));
}

function changedPixels(previous: Buffer | undefined, current: Buffer): Json {
  if (!previous) return { changedPixels: 0, bounds: null };
  let count = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const offset = pixel * 3;
    if (current[offset] === previous[offset]
      && current[offset + 1] === previous[offset + 1]
      && current[offset + 2] === previous[offset + 2]) continue;
    count += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { changedPixels: count, bounds: count ? [minX, minY, maxX, maxY] : null };
}

function taskAges(rows: readonly Json[], symbol: string): number[] {
  return rows.flatMap((row, age) => row.tasks.some(
    (task: Json) => task.func?.symbol === symbol,
  ) ? [age] : []);
}

function ringLifecycles(rows: readonly Json[]): Json[] {
  const active = new Map<number, Json>();
  const lives: Json[] = [];
  for (const [age, row] of rows.entries()) {
    const current = new Map<number, Json>(row.sprites
      .filter((sprite: Json) => sprite.template?.symbol === "gGuardRingSpriteTemplate")
      .map((sprite: Json) => [sprite.slot, sprite]));
    for (const [slot, sprite] of current) {
      if (!active.has(slot)) {
        const life = {
          slot,
          start: age,
          end: null as number | null,
          x: sprite.x,
          y: sprite.y,
          subpriority: sprite.subpriority,
          attr: sprite.attr,
          matrix: sprite.matrix,
          states: [] as Json[],
        };
        active.set(slot, life);
        lives.push(life);
      }
      active.get(slot)!.states.push({
        age,
        x2: sprite.x2,
        y2: sprite.y2,
        callback: sprite.callback?.symbol,
        data: sprite.data,
        attr: sprite.attr,
        matrix: sprite.matrix,
      });
    }
    for (const [slot, life] of active) {
      if (!current.has(slot)) {
        life.end = age - 1;
        active.delete(slot);
      }
    }
  }
  for (const life of active.values()) life.end = rows.length - 1;
  return lives;
}

function audioEvents(rows: readonly Json[]): Json[] {
  const events: Json[] = [];
  for (const [age, row] of rows.entries()) {
    for (const channel of ["SE1", "SE2"]) {
      const symbol = row.audio[channel].songHeaderIdentity.symbol;
      const prior = age === 0 ? null : rows[age - 1]!.audio[channel].songHeaderIdentity.symbol;
      if (symbol && symbol !== prior) {
        events.push({
          age,
          channel,
          symbol,
          panX: row.audio[channel].tracks.map((track: Json) => track.panX),
        });
      }
    }
  }
  return events;
}

function rowsFor(side: Side): Readonly<{ rows: Json[]; rgb: Buffer[] }> {
  const item = receipt.orientations[side];
  const scenario = readFileSync(resolve(root, item.scenario));
  const dense = readFileSync(resolve(root, item.denseState));
  const archive = readFileSync(resolve(root, item.rawRgbArchive));
  invariant(
    sha(scenario) === item.scenarioSha256
      && sha(dense) === item.denseStateSha256
      && sha(archive) === item.rawRgbArchiveSha256,
    side + " retained evidence hash drifted",
  );
  const decoded = gunzipSync(dense);
  invariant(
    sha(decoded) === item.probeJsonSha256
      && item.probeJsonSha256 === item.repeatProbeJsonSha256,
    side + " twice-fresh dense receipt drifted",
  );
  const probe = JSON.parse(decoded.toString("utf8"));
  const rgb = rgbFrames(resolve(root, item.rawRgbArchive));
  invariant(
    rgb.length === item.window.frameCount
      && rgb.every((frame) => frame.length === 240 * 160 * 3)
      && sha(Buffer.concat(rgb)) === item.rawRgbSequenceSha256
      && item.rawRgbSequenceSha256 === item.repeatRawRgbSequenceSha256,
    side + " twice-fresh raw RGB receipt drifted",
  );
  return { rows: probe.frames, rgb };
}

function mapFor(side: Side, rows: readonly Json[], rgb: readonly Buffer[]): Json {
  const item = receipt.orientations[side];
  invariant(
    rows.length === 71
      && rows[0]?.frame === item.window.startFrame
      && rows.at(-1)?.frame === item.window.endFrame
      && rows.every((row, age) => row.frame === rows[0]!.frame + age)
      && rows.slice(0, -1).every((row) => row.animScriptActive)
      && !rows.at(-1)?.animScriptActive
      && rows.at(-1)?.visualTaskCount === 0
      && rows.at(-1)?.soundTaskCount === 0,
    side + " is not the complete pointer-owned Safeguard window",
  );
  invariant(rows.every((row) => row.scriptOwner === "Move_SAFEGUARD"
    && row.scriptPtr >= 0x082c_b6f7 && row.scriptPtr < 0x082c_b739
    && (row.scriptPtrParity === 0 || row.scriptPtrParity === 1)),
  side + " source ownership/parity drifted");
  invariant(rows.every((row, age) => row.softwareOam.length === 128
    && row.hardwareOam.length === 128
    && row.softwareMatrices.length === 32
    && row.hardwareMatrices.length === 32
    && row.fadedPalette.length === 512
    && row.hardwarePalette.length === 512
    && row.paletteTags.length === 16
    && row.tileTags.length === 128
    && row.parties.player.length === 3
    && row.parties.opponent.length === 3
    && rgb[age]!.length === 240 * 160 * 3
    && sha(rgb[age]!) === row.sha256), side + " retained-row shape/RGB drifted");

  const rings = ringLifecycles(rows);
  const updateMonBg = taskAges(rows, "Task_UpdateMonBg");
  const clearMonBg = taskAges(rows, "Task_ClearMonBg");
  const blend = taskAges(rows, "AnimTask_BlendColorCycleLoop");
  const oamMatches = rows.slice(1).filter((row, age) =>
    same(row.hardwareOam, rows[age]!.softwareOam)).length;
  const matrixMatches = rows.slice(1).filter((row, age) =>
    same(row.hardwareMatrices, rows[age]!.softwareMatrices)).length;
  const paletteMatches = rows.slice(1).filter((row, age) =>
    same(row.hardwarePalette, rows[age]!.fadedPalette)).length;
  const map = {
    schema: "safeguard-normalized-change-map/v1",
    side,
    sourceWindow: {
      startFrame: rows[0]!.frame,
      endFrame: rows.at(-1)!.frame,
      frameCount: rows.length,
    },
    sourceRows: rows.map((row, age) => ({
      age,
      frame: row.frame,
      pointer: row.scriptPtr,
      offset: row.scriptOffset,
      wait: row.scriptWait,
      active: row.animScriptActive,
      visualTaskCount: row.visualTaskCount,
      soundTaskCount: row.soundTaskCount,
      ringSlots: row.sprites.filter((sprite: Json) =>
        sprite.template?.symbol === "gGuardRingSpriteTemplate",
      ).map((sprite: Json) => sprite.slot),
      registers: row.registers,
      guardRingTag: {
        palette: row.paletteTags.indexOf(10244),
        tiles: row.tileTags.indexOf(10244),
      },
      ...changedPixels(rgb[age - 1], rgb[age]!),
    })),
    rings,
    tasks: {
      updateMonBg: { start: updateMonBg[0], end: updateMonBg.at(-1), count: updateMonBg.length },
      clearMonBg: { start: clearMonBg[0], end: clearMonBg.at(-1), count: clearMonBg.length },
      blendColorCycle: { start: blend[0], end: blend.at(-1), count: blend.length },
    },
    palette: {
      fadedChanges: transitions(rows, (row) => row.fadedPalette),
      hardwareChanges: transitions(rows, (row) => row.hardwarePalette),
      guardRingTagAges: rows.flatMap((row, age) =>
        row.paletteTags.includes(10244) && row.tileTags.includes(10244) ? [age] : []),
    },
    latches: {
      // Safeguard proves every retained ordinary OAM/matrix/palette transfer
      // against the preceding software buffer in both orientations.
      oam: `${oamMatches}/${rows.length - 1}`,
      matrices: `${matrixMatches}/${rows.length - 1}`,
      palette: `${paletteMatches}/${rows.length - 1}`,
      ringSourceBirths: rings.map((ring) => ring.start),
      ringFirstVisibleRgbAges: [8, 14, 20],
      blendFadedAges: transitions(rows, (row) => row.fadedPalette).slice(2),
      blendHardwareAges: transitions(rows, (row) => row.hardwarePalette).slice(2),
    },
    audio: audioEvents(rows),
    state: {
      partiesStable: rows.every((row) => same(row.parties, rows[0]!.parties)),
      engineTransitions: transitions(rows, (row) => row.engine),
      immutableTransitions: transitions(rows, (row) => row.immutableState),
      gameplayRngTransitions: transitions(rows, (row) => row.immutableState.rngValue).slice(1),
      animationRngTransitions: transitions(rows, (row) => row.animationRng).slice(1),
    },
    cleanup: {
      age: rows.length - 1,
      scriptActive: rows.at(-1)!.animScriptActive,
      visualTasks: rows.at(-1)!.visualTaskCount,
      soundTasks: rows.at(-1)!.soundTaskCount,
      rings: rows.at(-1)!.sprites.filter((sprite: Json) =>
        sprite.template?.symbol === "gGuardRingSpriteTemplate").length,
      tagged: rows.at(-1)!.paletteTags.includes(10244)
        || rows.at(-1)!.tileTags.includes(10244),
    },
  };
  invariant(
    same(rings.map((ring) => [ring.slot, ring.start, ring.end]), [
      [3, 7, 20], [4, 13, 26], [5, 19, 32],
    ])
      && rings.every((ring) => ring.matrix[0] === 256 && ring.matrix[3] === 256
        && ring.states.at(-1)?.callback === "DestroyAnimSprite")
      && same(map.tasks, {
        updateMonBg: { start: 4, end: 68, count: 65 },
        clearMonBg: { start: 66, end: 68, count: 3 },
        blendColorCycle: { start: 34, end: 64, count: 31 },
      })
      && same(map.latches, {
        oam: "70/70", matrices: "70/70", palette: "70/70",
        ringSourceBirths: [7, 13, 19], ringFirstVisibleRgbAges: [8, 14, 20],
        blendFadedAges: [36, 38, 40, 42, 44, 52, 54, 56, 58, 60],
        blendHardwareAges: [37, 39, 41, 43, 45, 53, 55, 57, 59, 61],
      })
      && map.state.partiesStable
      && map.state.gameplayRngTransitions.length === 0
      && map.cleanup.age === 70 && !map.cleanup.scriptActive
      && map.cleanup.visualTasks === 0 && map.cleanup.soundTasks === 0
      && map.cleanup.rings === 0 && !map.cleanup.tagged,
    side + " Safeguard lifecycle/latch/cleanup drifted",
  );
  return map;
}

const writeMaps = process.argv.includes("--write-maps");
const result: Record<Side, Json> = {} as Record<Side, Json>;
for (const side of ["player-back", "opponent-front"] as const) {
  const { rows, rgb } = rowsFor(side);
  const map = mapFor(side, rows, rgb);
  const bytes = Buffer.from(JSON.stringify(map, null, 2) + "\n");
  const path = resolve(root, receipt.orientations[side].changeMap);
  if (writeMaps) writeFileSync(path, bytes);
  else invariant(
    readFileSync(path).equals(bytes) && sha(bytes) === receipt.orientations[side].changeMapSha256,
    side + " normalized change map drifted",
  );
  result[side] = {
    window: map.sourceWindow,
    rings: map.rings.map((ring: Json) => [ring.slot, ring.start, ring.end]),
    tasks: map.tasks,
    latches: map.latches,
    cleanup: map.cleanup,
    gameplayRngTransitions: map.state.gameplayRngTransitions.length,
    animationRngTransitions: map.state.animationRngTransitions.length,
  };
}

console.log(JSON.stringify(result, null, 2));
