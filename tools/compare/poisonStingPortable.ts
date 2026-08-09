import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { poisonStingEffectAtAge } from "../../src/animation/poisonSting.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPoisonStingView,
  type SceneOnPoisonStingConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnPoisonStingConfig {
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string; readonly rawRgbSha256: string;
  readonly changeMap: string; readonly changeMapSha256: string;
}
interface Sprite {
  readonly slot: number; readonly template: number; readonly callback: number;
  readonly attr0: number; readonly attr1: number; readonly attr2: number;
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly matrixNum: number;
  readonly matrix: { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
}
interface Frame {
  readonly frame: number; readonly sha256: string; readonly scriptOffset: number | null;
  readonly animScriptActive: boolean; readonly player: unknown; readonly opponent: unknown;
  readonly playerSprite: Sprite; readonly opponentSprite: Sprite;
  readonly moveSprites: Readonly<Record<string, readonly Sprite[]>>;
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly visualTaskCount: number; readonly soundTaskCount: number;
  readonly fadedPalette: readonly number[]; readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[]; readonly tileTags: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly registers: { readonly bldcnt: number; readonly bldalpha: number };
  readonly se1: { readonly songHeader: number; readonly status: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
}
interface Probe {
  readonly schema: string; readonly scriptBounds: Readonly<Record<string, number>>;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("usage: poisonStingPortable.ts <player> <opponent>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const digests = new Map<string, string>();

function verify(path: string): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-poison-sting-portable-");
  const output = join(scratch, "evidence.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);
  const bytes = readFileSync(output);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const prior = digests.get(fixture.orientation);
  if (prior !== undefined && prior !== digest) {
    throw new Error(`${fixture.orientation}: fresh evidence changed ${prior} -> ${digest}`);
  }
  digests.set(fixture.orientation, digest);
  const probe = JSON.parse(bytes.toString()) as Probe;
  if (probe.schema !== "poison-sting-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || probe.frames.length !== 113
    || probe.frames[0]?.scriptOffset !== 0
    || probe.frames.at(-1)?.animScriptActive !== false) {
    throw new Error(`${fixture.orientation}: pointer-bounded source window changed`);
  }
  const stage = createSceneOnMovePresentation(fixture);
  const initialPlayer = probe.frames[0]!.player;
  const initialOpponent = probe.frames[0]!.opponent;
  const failures: string[] = [];
  const rawWindow = createHash("sha256");
  let components = 0;
  let framebuffers = 0;
  for (let age = 0; age < probe.frames.length; age += 1) {
    const actual = probe.frames[age]!;
    const expected = poisonStingEffectAtAge(
      age, fixture.attacker.geometry.side,
      fixture.attacker.geometry.animationCenter,
      fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnPoisonStingView({ ...stage, age });
    const actualSprites = [
      ...actual.moveSprites.gLinearStingerSpriteTemplate ?? [],
      ...actual.moveSprites.gBasicHitSplatSpriteTemplate ?? [],
      ...actual.moveSprites.gPoisonBubbleSpriteTemplate ?? [],
    ].map((sprite) => {
      const kind = sprite.template === probe.templates.gLinearStingerSpriteTemplate ? "needle"
        : sprite.template === probe.templates.gBasicHitSplatSpriteTemplate ? "impact" : "poisonBubble";
      return {
        kind,
        // AnimBubbleEffect retains its source anchor in x/y and emits the
        // sinusoidal/rising motion in x2/y2; the reducer exposes screen space.
        x: kind === "poisonBubble" ? sprite.x + sprite.x2 : sprite.x,
        y: kind === "poisonBubble" ? sprite.y + sprite.y2 : sprite.y,
        x2: kind === "poisonBubble" ? 0 : sprite.x2,
        y2: kind === "poisonBubble" ? 0 : sprite.y2,
        matrix: sprite.matrix, oamSlot: sprite.slot,
      };
    });
    const expectedSprites = expected.sprites.slice()
      .sort((left, right) => left.oamSlot - right.oamSlot)
      .map((sprite) => ({
      kind: sprite.kind, x: sprite.x, y: sprite.y, x2: sprite.x2, y2: sprite.y2,
      matrix: sprite.matrix, oamSlot: sprite.oamSlot,
      }));
    const sprites = same(actualSprites, expectedSprites);
    const target = fixture.target.geometry.side === "player"
      ? actual.playerSprite : actual.opponentSprite;
    const baseline = fixture.target.geometry.side === "opponent" && age < 35 ? 1 : 0;
    const targetOffset = target.x2 === expected.targetOffset.x2 + baseline
      && target.y2 === expected.targetOffset.y2;
    const shake = actual.tasks.filter((task) =>
      (task.func & ~1) === (probe.taskFuncs.AnimTask_ShakeMon2_Step & ~1));
    const shakeExpected = age >= 35 && age <= 42;
    let task = shake.length === (shakeExpected ? 1 : 0);
    if (shakeExpected) {
      const local = age - 35;
      const targetSlot = fixture.target.geometry.side === "player" ? 6 : 8;
      task &&= same(shake[0]!.data.slice(0, 6), [
        targetSlot, 4 - Math.floor(local / 2), 1, local % 2 === 0 ? 1 : 0, 2, 0,
      ]);
    }
    const tags = [10161, 10135, 10150].filter((_, index) => age >= [1, 4, 7][index]! && age < 112);
    const tagState = tags.every((tag) => actual.tileTags.includes(tag) && actual.paletteTags.includes(tag))
      && expected.loadedTags.length === tags.length;
    const registers = actual.registers.bldcnt === (expected.alpha ? 0x3f40 : 0)
      && actual.registers.bldalpha === (expected.alpha ? 0x080c : 0);
    const soundEvent = expected.soundEvents.find((event) => event.age === age);
    const sound = soundEvent === undefined || (
      actual.se1.songHeader === probe.songHeaders[soundEvent.song]
      && actual.se1.status === 0 && actual.se1.tracks[0]?.flags === 131
      && actual.se1.tracks[0]?.panX === soundEvent.pan
    );
    const priorFrame = probe.frames[age - 1];
    const priorSprites = priorFrame === undefined ? [] : [
      ...priorFrame.moveSprites.gLinearStingerSpriteTemplate ?? [],
      ...priorFrame.moveSprites.gBasicHitSplatSpriteTemplate ?? [],
      ...priorFrame.moveSprites.gPoisonBubbleSpriteTemplate ?? [],
    ];
    const hardware = priorSprites.every((sprite) =>
      actual.hardwareOam.some((oam) => same(oam, [sprite.attr0, sprite.attr1, sprite.attr2]))
      && same(actual.hardwareMatrices[sprite.matrixNum], [
        sprite.matrix.a, sprite.matrix.b, sprite.matrix.c, sprite.matrix.d,
      ]));
    const palette = priorSprites.every((sprite) => {
      const bank = sprite.attr2 >>> 12;
      const start = 256 + bank * 16;
      return actual.hardwarePalette.slice(start, start + 16).every(
        (color, index) => color === priorFrame!.fadedPalette[start + index],
      );
    });
    const immutable = same(actual.player, initialPlayer) && same(actual.opponent, initialOpponent);
    const cleanup = age !== 112 || (
      !actual.animScriptActive && actual.visualTaskCount === 0
      && actual.soundTaskCount === 0 && actualSprites.length === 0
      && actual.registers.bldcnt === 0 && actual.registers.bldalpha === 0
    );
    const seamShape = same(seam.loadedTags, expected.loadedTags)
      && same(seam.alpha, expected.alpha) && seam.targetMonbg === expected.targetMonbg
      && same(seam.targetOffset, expected.targetOffset)
      && same(seam.sprites, expected.sprites) && same(seam.soundEvents, expected.soundEvents);
    const raw = readFileSync(join(rgbDir, `${String(actual.frame).padStart(5, "0")}.rgb`));
    rawWindow.update(raw);
    const rawExact = createHash("sha256").update(raw).digest("hex") === actual.sha256;
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } };
    const app = render(engine);
    let diff = 0;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== raw[pixel * 3]
        || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) diff += 1;
    }
    if (diff === 0) framebuffers += 1;
    const component = sprites && targetOffset && task && tagState && registers
      && sound && hardware && palette && immutable && cleanup && seamShape && rawExact;
    if (component) components += 1;
    if (!component || diff !== 0) failures.push(
      `age ${age}/frame ${actual.frame}: sprites=${sprites} offset=${targetOffset} task=${task} tags=${tagState} regs=${registers} sound=${sound} hardware=${hardware} palette=${palette} immutable=${immutable} cleanup=${cleanup} seam=${seamShape} raw=${rawExact} framebufferDiff=${diff}`,
    );
  }
  const rawDigest = rawWindow.digest("hex");
  const mapRun = spawnSync(
    "python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir],
    { cwd: root, encoding: "utf8" },
  );
  const separator = mapRun.stdout.indexOf(" — ");
  const changeMap = separator < 0 ? ""
    : `# ${basename(fixture.changeMap)} raw RGB888 — ${mapRun.stdout.slice(separator + 3)}`;
  if (digest !== fixture.evidenceSha256 || rawDigest !== fixture.rawRgbSha256
    || createHash("sha256").update(changeMap).digest("hex") !== fixture.changeMapSha256
    || changeMap !== readFileSync(resolve(root, fixture.changeMap), "utf8")) {
    failures.push(`receipt evidence/raw/map ${digest}/${rawDigest}`);
  }
  console.log(`${fixture.orientation}: components ${components}/113; framebuffer ${framebuffers}/113; digest ${digest}`);
  if (failures.length) throw new Error(failures.join("\n"));
}

for (let run = 0; run < 2; run += 1) for (const path of paths) verify(path);
