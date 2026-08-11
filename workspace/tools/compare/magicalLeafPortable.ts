import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  magicalLeafAtAge,
  type MagicalLeafCutter,
  type MagicalLeafHitsplat,
  type MagicalLeafParticle,
} from "../../src/animation/magicalLeaf.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMagicalLeafView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Geometry {
  readonly side: "player" | "opponent";
  readonly spriteCorner: Readonly<{ x: number; y: number }>;
  readonly animationCenter: Readonly<{ x: number; y: number }>;
  readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
}

interface Fixture {
  readonly schema: "scene-on-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly move: "MAGICAL_LEAF";
  readonly pair: string;
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: string;
  readonly appStage: { readonly presentationAge: number };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: { readonly species: "ROSELIA"; readonly geometry: Geometry };
  readonly target: { readonly species: "ONIX"; readonly geometry: Geometry };
  readonly targetIdleX2: number;
  readonly fieldProfile: {
    readonly playerHp: number;
    readonly playerMaxHp: number;
    readonly opponentHp: number;
    readonly opponentMaxHp: number;
    readonly playerGender: "male" | "female";
    readonly opponentGender: "male" | "female";
  };
  readonly evidenceSchema: "magical-leaf-dense-evidence/v1";
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSequenceSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly status: "exact";
    readonly componentMatching: number;
    readonly framebufferMatching: number;
  };
}

interface ProbeSprite {
  readonly slot: number;
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly template: number;
  readonly callback: number;
  readonly subpriority: number;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
  readonly matrix: readonly number[];
}

interface ProbeTask {
  readonly slot: number;
  readonly func: number;
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly scriptPtr: number;
  readonly animScriptActive: boolean;
  readonly battleAnimAttacker: number;
  readonly battleAnimTarget: number;
  readonly battleAnimArgs: readonly number[];
  readonly playerSprite: ProbeSprite;
  readonly opponentSprite: ProbeSprite;
  readonly tasks: readonly ProbeTask[];
  readonly moveSprites: Readonly<Record<string, readonly ProbeSprite[]>>;
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly registers: Readonly<{ dispcnt: number; bldcnt: number; bldalpha: number; bldy: number }>;
}

interface Probe {
  readonly schema: string;
  readonly moveId: number;
  readonly sourceWindow: Fixture["denseWindow"];
  readonly scriptBounds: Readonly<{ Move_MAGICAL_LEAF: number; Move_ICE_BALL: number }>;
  readonly templates: Readonly<{
    gRazorLeafParticleSpriteTemplate: number;
    gRazorLeafCutterSpriteTemplate: number;
    gBasicHitSplatSpriteTemplate: number;
  }>;
  readonly taskFuncs: Readonly<{
    AnimTask_CycleMagicalLeafPal: number;
    AnimTask_ShakeMon2: number;
    AnimTask_ShakeMon2_Step: number;
  }>;
  readonly callbacks: Readonly<{
    AnimRazorLeafParticle: number;
    AnimRazorLeafParticle_Step1: number;
    AnimRazorLeafParticle_Step2: number;
    AnimTranslateLinearSingleSineWave: number;
    AnimTranslateLinearSingleSineWave_Step: number;
    RunStoredCallbackWhenAffineAnimEnds: number;
    DestroyAnimSprite: number;
  }>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly ProbeFrame[];
}

interface FreshProbe {
  readonly probe: Probe;
  readonly output: string;
  readonly rgbDir: string;
  readonly scratch: string;
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: node --experimental-strip-types tools/compare/magicalLeafPortable.ts <player-fixture> <opponent-fixture>",
  );
}

const LEAF_TAG = 10063;
const RAZOR_LEAF_TAG = 10160;
const IMPACT_TAG = 10135;
const PALETTE_SCOPE = [...Array(32).keys()].map((index) => 368 + index);

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function rgbSequenceHash(probe: Probe, rgbDir: string): string {
  const hash = createHash("sha256");
  for (const frame of probe.frames) {
    const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (sha256(rgb) !== frame.sha256) {
      throw new Error(`raw RGB digest drifted at frame ${frame.frame}`);
    }
    hash.update(rgb);
  }
  return hash.digest("hex");
}

function runFresh(fixture: Fixture, repeat: number): FreshProbe {
  const scratch = createScratchDir(`pokebench-magical-leaf-${fixture.orientation}-${repeat}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync(
    "python3",
    [
      join(root, "tools/run-mgba-probe.py"), output, "--",
      join(vendor, "mgba-venv/bin/python"),
      resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgbDir,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) {
    throw new Error(`fresh ${fixture.orientation} probe ${repeat} failed (${run.status})`);
  }
  return {
    probe: JSON.parse(readFileSync(output, "utf8")) as Probe,
    output,
    rgbDir,
    scratch,
  };
}

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync(
    "python3",
    [join(root, "tools/compare/frame-changemap.py"), rgbDir],
    { cwd: root, encoding: "utf8" },
  );
  if (run.status !== 0) {
    throw new Error(`change-map regeneration failed for ${fixture.orientation}`);
  }
  const separator = run.stdout.indexOf(" — ");
  if (separator === -1) throw new Error("change-map header unexpectedly changed");
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function checkEvidence(fixture: Fixture, fresh: FreshProbe): string[] {
  const errors: string[] = [];
  const evidence = sha256(readFileSync(fresh.output));
  const raw = rgbSequenceHash(fresh.probe, fresh.rgbDir);
  const source = fresh.probe.sourceWindow;
  const map = normalizedChangeMap(fixture, fresh.rgbDir);
  const committedMap = readFileSync(resolve(root, fixture.changeMap), "utf8");
  if (fresh.probe.schema !== fixture.evidenceSchema) errors.push(`schema ${fresh.probe.schema}`);
  if (fresh.probe.moveId !== 345) errors.push(`move ${fresh.probe.moveId}`);
  if (!same(source, fixture.denseWindow)) errors.push(`window ${JSON.stringify(source)}`);
  if (fresh.probe.frames.length !== fixture.denseWindow.frameCount) {
    errors.push(`frame count ${fresh.probe.frames.length}`);
  }
  if (fresh.probe.frames[0]?.frame !== fixture.denseWindow.startFrame
    || fresh.probe.frames.at(-1)?.frame !== fixture.denseWindow.endFrame) {
    errors.push("dense endpoints");
  }
  if (!fresh.probe.frames[0]?.animScriptActive || fresh.probe.frames.at(-1)?.animScriptActive) {
    errors.push("active-to-inactive boundary");
  }
  if (evidence !== fixture.evidenceSha256) errors.push(`evidence ${evidence}`);
  if (evidence !== fixture.secondFreshEvidenceSha256) errors.push(`second fresh evidence ${evidence}`);
  if (raw !== fixture.rawRgbSequenceSha256) errors.push(`raw RGB ${raw}`);
  if (sha256(Buffer.from(committedMap)) !== fixture.changeMapSha256) {
    errors.push("committed change-map hash");
  }
  if (map !== committedMap) errors.push("regenerated change map differs");
  return errors;
}

function blendRgb555(source: number, target: number, coefficient: number): number {
  const blend = (channel: number, destination: number) =>
    channel + (((destination - channel) * coefficient) >> 4);
  return blend(source & 0x1f, target & 0x1f)
    | (blend((source >> 5) & 0x1f, (target >> 5) & 0x1f) << 5)
    | (blend((source >> 10) & 0x1f, (target >> 10) & 0x1f) << 10);
}

function particleMatches(
  got: ProbeSprite,
  expected: MagicalLeafParticle,
  probe: Probe,
): boolean {
  // The template callback initializes before this post-frame probe runs.  A
  // source-local transition has therefore already installed Step2; this is
  // the same callback boundary carried by the shared Razor Leaf receipt.
  const callback = expected.callback === "step1"
    ? probe.callbacks.AnimRazorLeafParticle_Step1
    : probe.callbacks.AnimRazorLeafParticle_Step2;
  return got.slot === expected.oamSlot
    && got.x === expected.x
    && got.y === expected.y
    && got.x2 === expected.x2
    && got.y2 === expected.y2
    && got.subpriority === expected.subpriority
    && got.template === probe.templates.gRazorLeafParticleSpriteTemplate
    && (got.attr2 & 0x03ff) === 305 + expected.tileOffset
    && got.callback === callback;
}

function cutterMatches(
  got: ProbeSprite,
  expected: MagicalLeafCutter,
  probe: Probe,
): boolean {
  return got.slot === expected.oamSlot
    && got.x === expected.x
    && got.y === expected.y
    && got.x2 === expected.x2
    && got.y2 === expected.y2
    && got.subpriority === expected.subpriority
    && got.template === probe.templates.gRazorLeafCutterSpriteTemplate
    && (got.attr2 & 0x03ff) === 341
    && ((got.attr1 >> 12) & 1) === Number(expected.hFlip)
    && ((got.attr1 >> 13) & 1) === Number(expected.vFlip)
    // The template's initializer has already run before the source capture,
    // including on its literal create frame.  A normal OBJ has no owned
    // affine matrix; the probe's matrix field is the shared stale slot there.
    && got.callback === probe.callbacks.AnimTranslateLinearSingleSineWave_Step;
}

function hitsplatMatches(
  got: ProbeSprite,
  expected: MagicalLeafHitsplat,
  probe: Probe,
): boolean {
  return got.slot === expected.oamSlot
    && got.x === expected.x
    && got.y === expected.y
    && got.x2 === 0
    && got.y2 === 0
    && got.subpriority === expected.subpriority
    && got.template === probe.templates.gBasicHitSplatSpriteTemplate
    && (got.attr2 & 0x03ff) === 349
    && ((got.attr0 >> 10) & 3) === 1
    && (got.callback === probe.callbacks.RunStoredCallbackWhenAffineAnimEnds
      || got.callback === probe.callbacks.DestroyAnimSprite)
    && same(got.matrix, [372, 0, 0, 372]);
}

function expectedHardware(
  particles: readonly MagicalLeafParticle[],
  cutters: readonly MagicalLeafCutter[],
  hitsplats: readonly MagicalLeafHitsplat[],
): readonly string[] {
  return [
    ...particles.map((sprite) => [
      "particle", 305 + sprite.tileOffset,
      (sprite.y + sprite.y2 - 8) & 0xff,
      (sprite.x + sprite.x2 - 8) & 0x1ff,
      0,
      0,
    ].join(",")),
    ...cutters.map((sprite) => [
      "cutter", 341,
      (sprite.y + sprite.y2 - 8) & 0xff,
      (sprite.x + sprite.x2 - 16) & 0x1ff,
      0,
      Number(sprite.hFlip) | (Number(sprite.vFlip) << 1),
    ].join(",")),
    ...hitsplats.map((sprite) => [
      "hitsplat", 349,
      (sprite.y - 16) & 0xff,
      (sprite.x - 16) & 0x1ff,
      1,
      0,
    ].join(",")),
  ].sort();
}

function observedHardware(frame: ProbeFrame): readonly string[] {
  return frame.hardwareOam
    .filter((oam) => {
      if ((((oam[0] ?? 0) >> 8) & 3) === 2) return false;
      const tile = (oam[2] ?? 0) & 0x03ff;
      return (tile >= 305 && tile <= 337 && (tile - 305) % 4 === 0)
        || tile === 341
        || tile === 349;
    })
    .map((oam) => {
      const attr0 = oam[0] ?? 0;
      const attr1 = oam[1] ?? 0;
      const tile = (oam[2] ?? 0) & 0x03ff;
      const kind = tile === 341 ? "cutter" : tile === 349 ? "hitsplat" : "particle";
      return [
        kind, tile, attr0 & 0xff, attr1 & 0x1ff,
        (attr0 >> 10) & 3, (attr1 >> 12) & 3,
      ].join(",");
    })
    .sort();
}

function framebufferDifference(app: Uint8Array, oracle: Buffer): string | null {
  let count = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgba = pixel * 4;
    const rgb = pixel * 3;
    if (app[rgba] === oracle[rgb]
      && app[rgba + 1] === oracle[rgb + 1]
      && app[rgba + 2] === oracle[rgb + 2]) continue;
    count += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return count === 0 ? null : `${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
}

function checkComponents(
  fixture: Fixture,
  probe: Probe,
): { readonly matches: number; readonly errors: readonly string[] } {
  const stage = createSceneOnMovePresentation({
    move: "MAGICAL_LEAF",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
    targetIdleX2: fixture.targetIdleX2,
  });
  const errors: string[] = [];
  let matches = 0;
  for (const [index, oracle] of probe.frames.entries()) {
    const age = fixture.appStage.presentationAge + oracle.frame - fixture.denseWindow.startFrame;
    const expected = magicalLeafAtAge(age, {
      attackerSide: fixture.attacker.geometry.side,
      attackerCenter: fixture.attacker.geometry.animationCenter,
      targetCenter: fixture.target.geometry.animationCenter,
      targetIdleX2: fixture.targetIdleX2,
    });
    const seam = sceneOnMagicalLeafView({ ...stage, age });
    const attacker = fixture.attacker.geometry.side === "player"
      ? oracle.playerSprite
      : oracle.opponentSprite;
    const target = fixture.target.geometry.side === "player"
      ? oracle.playerSprite
      : oracle.opponentSprite;
    const particles = oracle.moveSprites.gRazorLeafParticleSpriteTemplate ?? [];
    const cutters = oracle.moveSprites.gRazorLeafCutterSpriteTemplate ?? [];
    const hitsplats = oracle.moveSprites.gBasicHitSplatSpriteTemplate ?? [];
    const paletteTask = oracle.tasks.find(({ slot }) => slot === 2);
    const shakeTask = oracle.tasks.find(({ slot }) => slot === 0);
    const previous = magicalLeafAtAge(age - 1, {
      attackerSide: fixture.attacker.geometry.side,
      attackerCenter: fixture.attacker.geometry.animationCenter,
      targetCenter: fixture.target.geometry.animationCenter,
      targetIdleX2: fixture.targetIdleX2,
    });
    const previousFrame = probe.frames[index - 1];
    const inScript = oracle.scriptPtr >= probe.scriptBounds.Move_MAGICAL_LEAF
      && oracle.scriptPtr < probe.scriptBounds.Move_ICE_BALL;
    const script = inScript && oracle.animScriptActive === expected.active;
    const side = oracle.battleAnimAttacker === (fixture.attacker.geometry.side === "player" ? 0 : 1)
      && oracle.battleAnimTarget === (fixture.target.geometry.side === "player" ? 0 : 1);
    const battlers = attacker.x2 === 0 && attacker.y2 === 0 && !attacker.invisible
      && target.x2 === expected.targetX2 && target.y2 === 0
      && target.invisible === expected.targetMonbg;
    const assets = [
      [LEAF_TAG, expected.assetsLoaded.leaf],
      [RAZOR_LEAF_TAG, expected.assetsLoaded.razorLeaf],
      [IMPACT_TAG, expected.assetsLoaded.impact],
    ].every(([tag, loaded]) => oracle.paletteTags.includes(tag as number) === loaded
      && oracle.tileTags.includes(tag as number) === loaded);
    const alpha = expected.alpha === null
      ? oracle.registers.bldcnt === 0 && oracle.registers.bldalpha === 0
      : oracle.registers.bldcnt === 0x3f40 && oracle.registers.bldalpha === 0x080c;
    const palette = expected.paletteCycle === null
      ? paletteTask === undefined
      : paletteTask?.func === probe.taskFuncs.AnimTask_CycleMagicalLeafPal
        && paletteTask.data[8] === 368
        && paletteTask.data[9] === 0
        && paletteTask.data[10] === (expected.paletteCycle.coefficient + 1) % 17
        && paletteTask.data[11] === (
          expected.paletteCycle.colorIndex + Number(expected.paletteCycle.coefficient === 16)
        ) % 7
        && PALETTE_SCOPE.every((offset) => oracle.fadedPalette[offset]
          === blendRgb555(
            oracle.unfadedPalette[offset]!,
            expected.paletteCycle.color,
            expected.paletteCycle.coefficient,
          ));
    const paletteLatch = previousFrame === undefined || PALETTE_SCOPE.every((offset) =>
      oracle.hardwarePalette[offset] === previousFrame.fadedPalette[offset]);
    const sprites = particles.length === expected.particles.length
      && expected.particles.every((sprite) => {
        const got = particles.find(({ slot }) => slot === sprite.oamSlot);
        return got !== undefined && particleMatches(got, sprite, probe);
      })
      && cutters.length === expected.cutters.length
      && expected.cutters.every((sprite) => {
        const got = cutters.find(({ slot }) => slot === sprite.oamSlot);
        return got !== undefined && cutterMatches(got, sprite, probe);
      })
      && hitsplats.length === expected.hitsplats.length
      && expected.hitsplats.every((sprite) => {
        const got = hitsplats.find(({ slot }) => slot === sprite.oamSlot);
        return got !== undefined && hitsplatMatches(got, sprite, probe);
      });
    const hardware = same(
      observedHardware(oracle),
      expectedHardware(previous.particles, previous.cutters, previous.hitsplats),
    );
    const shake = expected.shakeTask === null
      ? shakeTask?.func !== probe.taskFuncs.AnimTask_ShakeMon2
        && shakeTask?.func !== probe.taskFuncs.AnimTask_ShakeMon2_Step
      : shakeTask?.func === probe.taskFuncs.AnimTask_ShakeMon2
        || shakeTask?.func === probe.taskFuncs.AnimTask_ShakeMon2_Step;
    const visualTasks = oracle.visualTaskCount === expected.particles.length
      + expected.cutters.length
      + expected.hitsplats.length
      + Number(expected.paletteCycle !== null)
      + Number(expected.shakeTask !== null);
    const sound = expected.soundRestart === null || (
      oracle.se1.songHeader === probe.songHeaders[expected.soundRestart]
      && oracle.se1.tracks[0]?.flags === 131
      && oracle.se1.tracks[0]?.panX === expected.soundPan
    );
    const registers = oracle.registers.dispcnt === 48960 && oracle.registers.bldy === 0;
    const args = oracle.battleAnimArgs[7] === expected.arg7;
    const seamShape = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined },
      expected,
    );
    if (script && side && battlers && assets && alpha && palette && paletteLatch
      && sprites && hardware && shake && visualTasks && sound && registers && args && seamShape) {
      matches += 1;
    } else {
      errors.push(
        `frame ${oracle.frame}/age ${age}: script=${script} side=${side} battlers=${battlers}`
        + ` assets=${assets} alpha=${alpha} palette=${palette}/${paletteLatch}`
        + ` sprites=${sprites} hardware=${hardware} shake=${shake} visual=${visualTasks}`
        + ` sound=${sound} registers=${registers} args=${args} seam=${seamShape}`,
      );
    }
  }
  return { matches, errors };
}

function checkFramebuffers(
  fixture: Fixture,
  probe: Probe,
  rgbDir: string,
): { readonly matches: number; readonly errors: readonly string[] } {
  const stage = createSceneOnMovePresentation({
    move: "MAGICAL_LEAF",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
    targetIdleX2: fixture.targetIdleX2,
  });
  const errors: string[] = [];
  let matches = 0;
  for (const oracle of probe.frames) {
    const age = fixture.appStage.presentationAge + oracle.frame - fixture.denseWindow.startFrame;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const difference = framebufferDifference(
      render(engine),
      readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`)),
    );
    if (difference === null) matches += 1;
    else errors.push(`frame ${oracle.frame}/age ${age}: ${difference}`);
  }
  return { matches, errors };
}

let failed = false;
for (const fixturePath of fixturePaths) {
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  let first: FreshProbe | undefined;
  for (let repeat = 1; repeat <= 2; repeat += 1) {
    const fresh = runFresh(fixture, repeat);
    const evidenceErrors = checkEvidence(fixture, fresh);
    if (evidenceErrors.length) {
      failed = true;
      console.error(`${fixture.orientation} fresh ${repeat}: ${evidenceErrors.join("; ")}`);
    }
    if (repeat === 1) first = fresh;
  }
  if (first === undefined) throw new Error("missing first fresh probe");
  const components = checkComponents(fixture, first.probe);
  const framebuffers = checkFramebuffers(fixture, first.probe, first.rgbDir);
  const total = fixture.denseWindow.frameCount;
  console.log(
    `${fixture.orientation}: source components + typed seam ${components.matches}/${total}; framebuffer ${framebuffers.matches}/${total}`,
  );
  if (components.errors.length) console.error(components.errors.slice(0, 24).join("\n"));
  if (framebuffers.errors.length) console.error(framebuffers.errors.slice(0, 24).join("\n"));
  if (components.matches !== fixture.acceptance.componentMatching
    || framebuffers.matches !== fixture.acceptance.framebufferMatching
    || components.matches !== total
    || framebuffers.matches !== total) {
    failed = true;
    console.error(`scratch: ${first.scratch}`);
  }
}
if (failed) process.exit(1);
