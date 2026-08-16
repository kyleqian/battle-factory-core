import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  HEAL_BELL_FRAME_COUNT,
  HEAL_BELL_ROOT_COMMAND_AGES,
} from "../../src/animation/healBell.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHealBellView,
  type SceneOnHealBellConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/heal-bell-evidence.json", "utf8",
));
const sha = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
const ownedTemplates = new Set([
  "gBellSpriteTemplate", "gHealBellMusicNoteSpriteTemplate",
  "gThinRingExpandingSpriteTemplate", "gBlendThinRingExpandingSpriteTemplate",
  "gSparklingStarsSpriteTemplate",
]);
const movePaletteTags = new Set([10205, 10206, 10203, 10049, 9999, 9998]);
const moveTileTags = new Set([10205, 10206, 10203, 10049]);

const result: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const config = fixture.orientations[orientation];
  const compressed = readFileSync(config.denseState);
  if (sha(compressed) !== config.denseStateSha256) {
    throw new Error(`${orientation} dense archive receipt drifted`);
  }
  const json = gunzipSync(compressed);
  if (sha(json) !== config.probeJsonSha256) {
    throw new Error(`${orientation} probe JSON receipt drifted`);
  }
  const probe = JSON.parse(json.toString("utf8"));
  const sceneConfig: SceneOnHealBellConfig = {
    move: "HEAL_BELL",
    attacker: config.attacker,
    target: config.target,
    fieldProfile: {
      playerHp: probe.frames[0].battlers.player.hp,
      playerMaxHp: probe.frames[0].battlers.player.maxHp,
      opponentHp: probe.frames[0].battlers.opponent.hp,
      opponentMaxHp: probe.frames[0].battlers.opponent.maxHp,
      playerGender: "male",
      opponentGender: "female",
    },
  };
  const stage = createSceneOnMovePresentation(sceneConfig);
  let reducerRows = 0;
  let seamRows = 0;
  let oamLatch = 0;
  let matrixLatch = 0;
  let paletteLatch = 0;
  const lifecycle = new Map<string, number>();
  let priorOwned = new Set<string>();
  const immutable = JSON.stringify(probe.frames[0].immutableState);
  const parties = JSON.stringify(probe.frames[0].parties);
  for (let age = 0; age < probe.frames.length; age += 1) {
    const row = probe.frames[age];
    const view = sceneOnHealBellView({ ...stage, age });
    if (view.age !== age || view.attacker.species !== "CHIMECHO") {
      throw new Error(`${orientation} typed seam drift at age ${age}`);
    }
    seamRows += 1;
    const sprites = row.sprites.filter((sprite: any) =>
      ownedTemplates.has(sprite.template.symbol));
    const bySlot = new Map(sprites.map((sprite: any) => [sprite.slot, sprite]));
    const expectedSlots = [
      ...(view.bell ? [view.bell.slot] : []),
      ...view.notes.map((note) => note.slot),
      ...view.rings.map((ring) => ring.slot),
      ...view.sparkles.map((sparkle) => sparkle.slot),
    ];
    if (!same([...bySlot.keys()].sort((a: any, b: any) => a - b),
      [...expectedSlots].sort((a, b) => a - b))) {
      throw new Error(`${orientation} owned slot topology drift at age ${age}`);
    }
    if (view.bell) {
      const sprite: any = bySlot.get(view.bell.slot);
      if (!sprite || sprite.template.symbol !== "gBellSpriteTemplate"
        || sprite.x !== view.bell.x || sprite.y !== view.bell.y
        || (sprite.attr[2] & 0x3ff) !== 305 + view.bell.frame * 16
        || Boolean(sprite.attr[1] & 0x1000) !== view.bell.hFlip) {
        throw new Error(`${orientation} bell reducer drift at age ${age}`);
      }
    }
    for (const note of view.notes) {
      const sprite: any = bySlot.get(note.slot);
      if (!sprite || sprite.template.symbol !== "gHealBellMusicNoteSpriteTemplate"
        || !same([sprite.x, sprite.y, sprite.x2, sprite.y2],
          [note.x, note.y, note.x2, note.y2])
        || !same(sprite.data.slice(0, 5), [note.remaining, note.deltaXQ8,
          note.deltaYQ8, note.accumulatorXQ8, note.accumulatorYQ8])
        || (sprite.attr[2] & 0x3ff) !== 537 + note.tileVariant * 4
          + (note.paletteVariant & 1) * 32
        || ((sprite.attr[2] >> 12) & 15) !== note.paletteSlot) {
        throw new Error(`${orientation} note ${note.group}/${note.path} drift at age ${age}`);
      }
    }
    for (const ring of view.rings) {
      const sprite: any = bySlot.get(ring.slot);
      const template = ring.kind === "normal"
        ? "gThinRingExpandingSpriteTemplate"
        : "gBlendThinRingExpandingSpriteTemplate";
      if (!sprite || sprite.template.symbol !== template
        || !same([sprite.x, sprite.y], [ring.x, ring.y])
        || !same(sprite.matrix, [ring.matrixScale, 0, 0, ring.matrixScale])) {
        throw new Error(`${orientation} ${ring.kind} ring drift at age ${age}`);
      }
    }
    for (const sparkle of view.sparkles) {
      const sprite: any = bySlot.get(sparkle.slot);
      if (!sprite || sprite.template.symbol !== "gSparklingStarsSpriteTemplate"
        || !same([sprite.x, sprite.y, sprite.y2, sprite.animCmdIndex],
          [sparkle.x, sparkle.y, sparkle.y2, sparkle.frame])) {
        throw new Error(`${orientation} sparkle ${sparkle.spawnIndex} drift at age ${age}`);
      }
    }
    const tasks = row.tasks.filter((task: any) =>
      task.func.symbol === "AnimTask_BlendSpriteColor_Step2");
    if (tasks.length !== view.paletteTasks.length) {
      throw new Error(`${orientation} palette-task topology drift at age ${age}`);
    }
    for (let index = 0; index < tasks.length; index += 1) {
      const actual = tasks[index].data;
      const expected = view.paletteTasks[index];
      if (!same([actual[2], actual[3], actual[4], actual[9], actual[10]],
        [expected.delay, expected.startCoefficient, expected.targetCoefficient,
          expected.counter, expected.coefficient])) {
        throw new Error(`${orientation} palette-task ${index} drift at age ${age}`);
      }
    }
    const palettes = row.paletteTags.filter((tag: number) => movePaletteTags.has(tag));
    const tiles = row.tileTags.filter((tag: number) => moveTileTags.has(tag));
    if (!same(palettes, view.resources.paletteTags)
      || !same(tiles, view.resources.tileTags)) {
      throw new Error(`${orientation} allocator state drift at age ${age}`);
    }
    if (row.visualTaskCount !== view.visualTaskCount
      || row.animScriptActive !== view.active
      || JSON.stringify(row.immutableState) !== immutable
      || JSON.stringify(row.parties) !== parties) {
      throw new Error(`${orientation} count/cleanup/semantic state drift at age ${age}`);
    }
    if (view.audio !== null) {
      const symbol = view.audio.toLowerCase();
      if (row.audio.SE1.songHeaderIdentity.symbol !== symbol
        || row.audio.SE1.tracks[0].panX !== view.audioPan) {
        throw new Error(`${orientation} audio drift at age ${age}`);
      }
    }
    const owned = new Set(sprites.map((sprite: any) =>
      `${sprite.slot}:${sprite.template.symbol}`));
    for (const identity of owned) {
      if (!priorOwned.has(identity)) {
        const template = identity.slice(identity.indexOf(":") + 1);
        lifecycle.set(template, (lifecycle.get(template) ?? 0) + 1);
      }
    }
    priorOwned = owned;
    reducerRows += 1;
    if (age > 0) {
      const prior = probe.frames[age - 1];
      if (same(row.hardwareOam, prior.softwareOam)) oamLatch += 1;
      if (same(row.hardwareMatrices, prior.softwareMatrices)) matrixLatch += 1;
      if (same(row.hardwarePalette, prior.fadedPalette)) paletteLatch += 1;
    }
  }
  if (probe.frames.length !== HEAL_BELL_FRAME_COUNT
    || HEAL_BELL_ROOT_COMMAND_AGES.length !== 44
    || probe.frames.at(-1).visualTaskCount !== 0
    || probe.frames.at(-1).soundTaskCount !== 0) {
    throw new Error(`${orientation} complete cleanup window drifted`);
  }
  const scratch = createScratchDir("heal-bell-rgb-");
  const archive = readFileSync(config.rawRgbArchive);
  if (sha(archive) !== config.rawRgbArchiveSha256) {
    throw new Error(`${orientation} raw RGB archive receipt drifted`);
  }
  const untar = spawnSync("tar", ["-xzf", config.rawRgbArchive, "-C", scratch], {
    encoding: "utf8",
  });
  if (untar.status !== 0) throw new Error(untar.stderr);
  const rawHash = createHash("sha256");
  for (const row of probe.frames) {
    const rgb = readFileSync(join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(rgb) !== row.sha256) {
      throw new Error(`${orientation} raw RGB row ${row.frame} drifted`);
    }
    rawHash.update(rgb);
  }
  if (rawHash.digest("hex") !== config.rawRgbSha256) {
    throw new Error(`${orientation} raw RGB sequence drifted`);
  }
  result[orientation] = {
    sourceWindow: probe.sourceWindow,
    reducerRows,
    seamRows,
    lifecycle: Object.fromEntries([...lifecycle].sort()),
    latches: {
      hardwareOamEqualsPrecedingSoftware: `${oamLatch}/260`,
      hardwareMatricesEqualPrecedingSoftware: `${matrixLatch}/260`,
      hardwarePaletteEqualsPrecedingFaded: `${paletteLatch}/260`,
    },
    cleanup: { age: 260, active: false, visualTasks: 0, soundTasks: 0 },
  };
}
console.log(JSON.stringify(result, null, 2));
