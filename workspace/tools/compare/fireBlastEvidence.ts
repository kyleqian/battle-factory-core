import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createScratchDir } from "../lib/scratch.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/fire-blast-evidence.json", "utf8",
));
const sha = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
const ownedTemplates = new Set([
  "gFireBlastRingSpriteTemplate", "gFireBlastCrossSpriteTemplate",
]);
const expectedTasks = new Set([
  "AnimTask_BlendSpriteColor_Step2", "AnimTask_ShakeMon_Step",
  "SoundTask_FireBlast_Step1", "SoundTask_FireBlast_Step2",
]);
const expectedCallbacks = new Set([
  "AnimFireRing_Step1", "AnimFireRing_Step2", "AnimFireRing_Step3",
  "TranslateSpriteLinear", "DestroyAnimSprite",
]);

const result: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as const) {
  const config = fixture.orientations[orientation];
  for (const [path, expected] of [
    [config.scenario, config.scenarioSha256],
    [fixture.source.audit, fixture.source.auditSha256],
    [fixture.source.probe, fixture.source.probeSha256],
    [fixture.source.stagingFixture, fixture.source.stagingFixtureSha256],
    [config.denseState, config.denseStateSha256],
    [config.rawRgbArchive, config.rawRgbArchiveSha256],
  ] as const) {
    if (sha(readFileSync(path)) !== expected) throw new Error(`${path} receipt drifted`);
  }
  if (config.probeJsonSha256 !== config.repeatProbeJsonSha256) {
    throw new Error(`${orientation} twice-fresh probe mismatch`);
  }
  const json = gunzipSync(readFileSync(config.denseState));
  if (sha(json) !== config.probeJsonSha256) {
    throw new Error(`${orientation} probe JSON receipt drifted`);
  }
  const probe = JSON.parse(json.toString("utf8"));
  const frames = probe.frames as any[];
  if (!same(probe.sourceWindow, config.sourceWindow) || frames.length !== 197
    || frames[0].scriptOffset !== 0 || frames.at(-1).animScriptActive !== false) {
    throw new Error(`${orientation} complete pointer window drifted`);
  }
  const immutable = JSON.stringify(frames[0].immutableState);
  const parties = JSON.stringify(frames[0].parties);
  const lifecycle = new Map<string, number>();
  const creationAges = new Map<number, number>();
  let priorOwned = new Set<string>();
  let oamLatch = 0;
  let matrixLatch = 0;
  let paletteLatch = 0;
  for (let age = 0; age < frames.length; age += 1) {
    const row = frames[age];
    if (row.softwareOam.length !== 128 || row.hardwareOam.length !== 128
      || row.softwareMatrices.length !== 32 || row.hardwareMatrices.length !== 32
      || row.fadedPalette.length !== 512 || row.unfadedPalette.length !== 512
      || row.hardwarePalette.length !== 512 || row.sprites.length > 64
      || JSON.stringify(row.immutableState) !== immutable
      || JSON.stringify(row.parties) !== parties) {
      throw new Error(`${orientation} full-state/semantic drift at age ${age}`);
    }
    const owned = new Set<string>(row.sprites.filter((sprite: any) =>
      ownedTemplates.has(sprite.template.symbol)).map((sprite: any) =>
      `${sprite.slot}:${sprite.template.symbol}`));
    for (const identity of owned) {
      if (!priorOwned.has(identity)) {
        const template = identity.slice(identity.indexOf(":") + 1);
        lifecycle.set(template, (lifecycle.get(template) ?? 0) + 1);
        creationAges.set(age, (creationAges.get(age) ?? 0) + 1);
      }
    }
    priorOwned = owned;
    for (const sprite of row.sprites.filter((entry: any) =>
      ownedTemplates.has(entry.template.symbol))) {
      if (!expectedCallbacks.has(sprite.callback.symbol)) {
        throw new Error(`${orientation} callback drift at age ${age}`);
      }
    }
    for (const task of row.tasks.filter((entry: any) =>
      String(entry.func.symbol).includes("FireBlast")
      || entry.func.symbol === "AnimTask_ShakeMon_Step"
      || entry.func.symbol === "AnimTask_BlendSpriteColor_Step2")) {
      if (!expectedTasks.has(task.func.symbol)) {
        throw new Error(`${orientation} task drift at age ${age}`);
      }
    }
    if (age > 0) {
      const prior = frames[age - 1];
      if (same(row.hardwareOam, prior.softwareOam)) oamLatch += 1;
      if (same(row.hardwareMatrices, prior.softwareMatrices)) matrixLatch += 1;
      if (same(row.hardwarePalette, prior.fadedPalette)) paletteLatch += 1;
    }
  }
  if (!same(Object.fromEntries(lifecycle), {
    gFireBlastRingSpriteTemplate: 15,
    gFireBlastCrossSpriteTemplate: 45,
  }) || !same(Object.fromEntries(creationAges), {
    4: 5, 11: 5, 18: 5, 113: 5, 118: 5, 123: 5,
    128: 5, 133: 5, 138: 5, 143: 5, 148: 5, 153: 5,
  })) throw new Error(`${orientation} exact creation/order lifecycle drifted`);
  const ages = (predicate: (row: any) => boolean): number[] => frames
    .flatMap((row, age) => predicate(row) ? [age] : []);
  const taskAges = (symbol: string): number[] => ages((row) => row.tasks.some(
    (task: any) => task.func.symbol === symbol,
  ));
  const soundAges = ages((row) => row.tasks.some((task: any) =>
    String(task.func.symbol).startsWith("SoundTask_FireBlast")));
  const ringAges = ages((row) => row.sprites.some((sprite: any) =>
    sprite.template.symbol === "gFireBlastRingSpriteTemplate"));
  const crossAges = ages((row) => row.sprites.some((sprite: any) =>
    sprite.template.symbol === "gFireBlastCrossSpriteTemplate"));
  if (!same([ringAges[0], ringAges.at(-1)], [4, 90])
    || !same([crossAges[0], crossAges.at(-1)], [113, 168])
    || !same([taskAges("AnimTask_ShakeMon_Step")[0],
      taskAges("AnimTask_ShakeMon_Step").at(-1)], [113, 150])
    || !same([taskAges("AnimTask_BlendSpriteColor_Step2")[0],
      taskAges("AnimTask_BlendSpriteColor_Step2").at(-1)], [51, 194])
    || !same([soundAges[0], soundAges.at(-1)], [4, 120])) {
    throw new Error(`${orientation} task/sprite lifetime drifted`);
  }
  const expectedInitialPan = orientation === "player-back" ? -64 : 63;
  const expectedTargetPan = orientation === "player-back" ? 63 : -63;
  const firstSound = frames[4].tasks.find((task: any) =>
    task.func.symbol === "SoundTask_FireBlast_Step1");
  const firstPanStep = orientation === "player-back" ? 2 : -2;
  if (!firstSound || firstSound.data[2] !== expectedInitialPan + firstPanStep
    || firstSound.data[3] !== expectedTargetPan
    || frames[4].audio.SE1.songHeaderIdentity.symbol !== "se_m_flame_wheel"
    || frames[115].audio.SE1.songHeaderIdentity.symbol !== "se_m_flame_wheel2") {
    throw new Error(`${orientation} hard-coded sound/pan lifecycle drifted`);
  }
  if (new Set(frames.map((row) => row.immutableState.rngValue)).size !== 1
    || new Set(frames.map((row) => row.animationRng)).size !== 197
    || !frames.slice(1, 196).every((row) => row.tileTags.includes(10029)
      && row.paletteTags.includes(10029))
    || frames[196].tileTags.includes(10029) || frames[196].paletteTags.includes(10029)
    || frames[196].visualTaskCount !== 0 || frames[196].soundTaskCount !== 0) {
    throw new Error(`${orientation} RNG/resource/cleanup drifted`);
  }
  const scratch = createScratchDir("fire-blast-rgb-");
  const untar = spawnSync("tar", ["-xzf", config.rawRgbArchive, "-C", scratch], {
    encoding: "utf8",
  });
  if (untar.status !== 0) throw new Error(untar.stderr);
  const rawHash = createHash("sha256");
  for (const row of frames) {
    const rgb = readFileSync(join(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(rgb) !== row.sha256) throw new Error(`${orientation} RGB row ${row.frame} drifted`);
    rawHash.update(rgb);
  }
  if (rawHash.digest("hex") !== config.rawRgbSha256) {
    throw new Error(`${orientation} RGB sequence drifted`);
  }
  result[orientation] = {
    sourceWindow: probe.sourceWindow,
    lifecycle: Object.fromEntries(lifecycle),
    latches: { oam: `${oamLatch}/196`, matrices: `${matrixLatch}/196`, palette: `${paletteLatch}/196` },
    rng: { gameplayDistinct: 1, animationDistinct: 197 },
    cleanup: { age: 196, active: false, visualTasks: 0, soundTasks: 0 },
  };
}
console.log(JSON.stringify(result, null, 2));
