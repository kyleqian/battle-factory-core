import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnCrabHammerView,
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
  readonly move: "CRABHAMMER";
  readonly orientation: "player-to-opponent" | "opponent-to-player";
  readonly scenario: string;
  readonly probe: string;
  readonly appStage: { readonly presentationAge: number };
  readonly denseWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: { readonly species: "KRABBY"; readonly geometry: Geometry };
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
  readonly evidenceSchema: "crabhammer-dense-evidence/v1";
  /** Deliberately removes the one controller-selected PP counter, not pixels. */
  readonly stableEvidenceSha256: string;
  readonly secondFreshStableEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: "exact";
    readonly framebufferMatching: number;
    readonly componentMatching: number;
  };
}

interface ProbeSprite {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly template: number;
  readonly callback: number;
  readonly subpriority: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
  readonly animCmdIndex: number;
  readonly data: readonly number[];
  readonly invisible: boolean;
  readonly attr2: number;
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
  readonly player: Record<string, unknown>;
  readonly opponent: Record<string, unknown>;
  readonly playerSprite: ProbeSprite;
  readonly opponentSprite: ProbeSprite;
  readonly shakeTasks: readonly ProbeTask[];
  readonly moveSprites: Readonly<Record<string, readonly ProbeSprite[]>>;
  readonly paletteTags: readonly number[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly animScriptActive: boolean;
  readonly bldcnt: number;
  readonly bldalpha: number;
}

interface Probe {
  readonly schema: string;
  readonly sourceWindow: Fixture["denseWindow"];
  readonly scriptBounds: Readonly<{ Move_CRABHAMMER: number }>;
  readonly templates: Readonly<Record<string, number>>;
  readonly shakeTaskFuncs: Readonly<Record<string, number>>;
  readonly watchedCallbacks: Readonly<Record<string, number>>;
  readonly frames: readonly ProbeFrame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error(
    "usage: node --experimental-strip-types tools/compare/crabHammerPortable.ts <player-fixture> <opponent-fixture>",
  );
}

function stableEvidenceHash(probe: Probe): string {
  // A legal Factory decision can decrement any one of four equivalent
  // CRABHAMMER PP slots. That UI-independent counter is the only unstable
  // field. Do not omit any screen/RAM/OAM/palette evidence.
  const projected = {
    ...probe,
    frames: probe.frames.map((frame) => {
      const { pp: _playerPp, ...player } = frame.player;
      const { pp: _opponentPp, ...opponent } = frame.opponent;
      return { ...frame, player, opponent };
    }),
  };
  return createHash("sha256").update(JSON.stringify(projected)).digest("hex");
}

function rgbHash(probe: Probe, rgbDir: string): string {
  const hash = createHash("sha256");
  for (const frame of probe.frames) {
    const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (createHash("sha256").update(rgb).digest("hex") !== frame.sha256) {
      throw new Error(`frame ${frame.frame} RGB hash disagrees with its probe row`);
    }
    hash.update(rgb);
  }
  return hash.digest("hex");
}

function sameSprite(
  got: ProbeSprite,
  want: Readonly<{ slot: number; x: number; y: number; subpriority: number }>,
): boolean {
  return got.slot === want.slot
    && got.x === want.x
    && got.y === want.y
    && got.subpriority === want.subpriority;
}

function framebufferDiff(appRgba: Uint8Array, oracleRgb: Buffer): string | null {
  let count = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const app = pixel * 4;
    const oracle = pixel * 3;
    if (
      appRgba[app] === oracleRgb[oracle]
      && appRgba[app + 1] === oracleRgb[oracle + 1]
      && appRgba[app + 2] === oracleRgb[oracle + 2]
    ) continue;
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

function runFresh(fixture: Fixture, repeat: number): {
  readonly probe: Probe;
  readonly rgbDir: string;
  readonly scratch: string;
} {
  const scratch = createScratchDir(`pokebench-crabhammer-${fixture.orientation}-${repeat}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync(
    "python3",
    [
      join(root, "tools/run-mgba-probe.py"),
      output,
      "--",
      join(vendor, "mgba-venv/bin/python"),
      resolve(root, fixture.probe),
      resolve(root, fixture.scenario),
      output,
      rgbDir,
      "152",
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
    rgbDir,
    scratch,
  };
}

function checkEvidence(fixture: Fixture, probe: Probe, rgbDir: string): string[] {
  const errors: string[] = [];
  const stableHash = stableEvidenceHash(probe);
  const actualRgbHash = rgbHash(probe, rgbDir);
  if (probe.schema !== fixture.evidenceSchema) errors.push(`schema ${probe.schema}`);
  if (JSON.stringify(probe.sourceWindow) !== JSON.stringify(fixture.denseWindow)) {
    errors.push(`source window ${JSON.stringify(probe.sourceWindow)}`);
  }
  if (probe.frames.length !== fixture.denseWindow.frameCount) {
    errors.push(`frame count ${probe.frames.length}`);
  }
  if (stableHash !== fixture.stableEvidenceSha256) errors.push(`stable hash ${stableHash}`);
  if (stableHash !== fixture.secondFreshStableEvidenceSha256) {
    errors.push(`second-fresh stable hash ${stableHash}`);
  }
  if (actualRgbHash !== fixture.rawRgbSha256) errors.push(`RGB hash ${actualRgbHash}`);
  return errors;
}

function checkComponents(
  fixture: Fixture,
  probe: Probe,
): { readonly matches: number; readonly errors: readonly string[] } {
  const stage = createSceneOnMovePresentation({
    move: "CRABHAMMER",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
    targetIdleX2: fixture.targetIdleX2,
  } as never);
  const playerToOpponent = fixture.orientation === "player-to-opponent";
  const errors: string[] = [];
  let matches = 0;

  for (const oracle of probe.frames) {
    const age = oracle.frame - fixture.denseWindow.startFrame + fixture.appStage.presentationAge;
    const view = sceneOnCrabHammerView({ ...stage, age });
    const attacker = playerToOpponent ? oracle.playerSprite : oracle.opponentSprite;
    const target = playerToOpponent ? oracle.opponentSprite : oracle.playerSprite;
    const splats = oracle.moveSprites.gWaterHitSplatSpriteTemplate ?? [];
    const offsetSlides = oracle.moveSprites.gSlideMonToOffsetSpriteTemplate ?? [];
    const originalSlides = oracle.moveSprites.gSlideMonToOriginalPosSpriteTemplate ?? [];
    const palettes = oracle.moveSprites.gComplexPaletteBlendSpriteTemplate ?? [];
    const bubbles = oracle.moveSprites.gSmallBubblePairSpriteTemplate ?? [];

    const targetShape = target.x2 === view.targetX2
      && target.y2 === view.targetY2
      && target.invisible === view.targetMonbg;
    const attackerShape = attacker.x2 === 0 && attacker.y2 === 0 && !attacker.invisible;
    const scriptShape = oracle.scriptPtr - probe.scriptBounds.Move_CRABHAMMER === view.scriptOffset
      && oracle.animScriptActive === view.active;
    const assetsShape = oracle.paletteTags.includes(10141) === view.assetsLoaded.iceCrystals
      && oracle.paletteTags.includes(10148) === view.assetsLoaded.waterImpact;
    const alphaShape = view.alpha === null
      ? oracle.bldcnt === 0 && oracle.bldalpha === 0
      : oracle.bldcnt === 0x3f40 && oracle.bldalpha === 0x080c;
    const splatShape = view.waterHitsplat === null
      ? splats.length === 0
      : splats.length === 1
        && sameSprite(splats[0]!, view.waterHitsplat)
        && splats[0]!.x2 === 0
        && splats[0]!.y2 === 0
        && splats[0]!.matrix.a === 256
        && splats[0]!.matrix.b === 0
        && splats[0]!.matrix.c === 0
        && splats[0]!.matrix.d === 256
        && (view.waterHitsplat.callback === "DestroyAnimSprite"
          ? splats[0]!.callback === probe.watchedCallbacks.DestroyAnimSprite
          : splats[0]!.callback !== probe.watchedCallbacks.DestroyAnimSprite);
    const slideShape = view.slides.filter((slide) => slide.kind === "to-offset").every((want) =>
      offsetSlides.some((got) => sameSprite(got, want)))
      && offsetSlides.length === view.slides.filter((slide) => slide.kind === "to-offset").length
      && view.slides.filter((slide) => slide.kind === "to-original").every((want) =>
        originalSlides.some((got) => sameSprite(got, want)))
      && originalSlides.length === view.slides.filter((slide) => slide.kind === "to-original").length;
    const paletteShape = view.complexPaletteBlend === null
      ? palettes.length === 0
      : palettes.length === 1
        && palettes[0]!.slot === view.complexPaletteBlend.slot
        && palettes[0]!.subpriority === view.complexPaletteBlend.subpriority
        && palettes[0]!.x === view.target.geometry.animationCenter.x
        && palettes[0]!.y === view.target.geometry.animationCenter.y;
    const bubbleShape = bubbles.length === view.bubbles.length
      && view.bubbles.every((want) => {
        const localAge = 19 - want.remaining;
        const got = bubbles.find((candidate) => candidate.slot === want.oamSlot);
        return got !== undefined
          && got.slot === want.oamSlot
          && got.x === want.x
          && got.y === want.y
          && got.subpriority === want.subpriority
          && got.x2 === want.x2
          && got.y2 === want.y2
          && got.data[0] === want.data0
          && got.data[1] === want.data1
          && got.data[7] === want.remaining
          && got.animCmdIndex === (Math.floor((localAge + 1) / 6) & 1)
          && (got.attr2 & 0x03ff) === 317 + (Math.floor((localAge + 1) / 6) & 1);
      });
    const shakeShape = view.shakeTask === null
      ? oracle.shakeTasks.length === 0
      : oracle.shakeTasks.length === 1
        && oracle.shakeTasks[0]!.slot === view.shakeTask.slot
        && (
          oracle.shakeTasks[0]!.func === probe.shakeTaskFuncs.AnimTask_ShakeMon
          || oracle.shakeTasks[0]!.func === probe.shakeTaskFuncs.AnimTask_ShakeMon_Step
        );
    const taskShape = oracle.visualTaskCount === view.visualTaskCount
      && oracle.soundTaskCount === view.soundTaskCount;

    if (
      targetShape && attackerShape && scriptShape && assetsShape && alphaShape
      && splatShape && slideShape && paletteShape && bubbleShape && shakeShape && taskShape
    ) {
      matches += 1;
    } else {
      errors.push(
        `frame ${oracle.frame}/age ${age}: target=${targetShape} attacker=${attackerShape}`
        + ` script=${scriptShape} assets=${assetsShape} alpha=${alphaShape}`
        + ` splat=${splatShape} slide=${slideShape} palette=${paletteShape}`
        + ` bubble=${bubbleShape} shake=${shakeShape} tasks=${taskShape}`,
      );
    }
  }
  return { matches, errors };
}

function checkFramebuffers(fixture: Fixture, probe: Probe, rgbDir: string): {
  readonly matches: number;
  readonly errors: readonly string[];
} {
  const stage = createSceneOnMovePresentation({
    move: "CRABHAMMER",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
    targetIdleX2: fixture.targetIdleX2,
  } as never);
  const errors: string[] = [];
  let matches = 0;
  for (const oracle of probe.frames) {
    const age = oracle.frame - fixture.denseWindow.startFrame + fixture.appStage.presentationAge;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const difference = framebufferDiff(
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
  let first: ReturnType<typeof runFresh> | null = null;
  for (let repeat = 1; repeat <= 2; repeat += 1) {
    const fresh = runFresh(fixture, repeat);
    const evidenceErrors = checkEvidence(fixture, fresh.probe, fresh.rgbDir);
    if (evidenceErrors.length) {
      failed = true;
      console.error(`${fixture.orientation} fresh ${repeat}: ${evidenceErrors.join("; ")}`);
    }
    if (repeat === 1) first = fresh;
  }
  if (first === null) throw new Error("first fresh probe missing");
  const components = checkComponents(fixture, first.probe);
  const framebuffers = checkFramebuffers(fixture, first.probe, first.rgbDir);
  const total = fixture.denseWindow.frameCount;
  console.log(
    `${fixture.orientation}: components ${components.matches}/${total}; framebuffer ${framebuffers.matches}/${total}`,
  );
  if (components.errors.length) console.error(components.errors.slice(0, 24).join("\n"));
  if (framebuffers.errors.length) console.error(framebuffers.errors.slice(0, 24).join("\n"));
  if (
    components.matches !== fixture.acceptance.componentMatching
    || framebuffers.matches !== fixture.acceptance.framebufferMatching
    || components.matches !== total
    || framebuffers.matches !== total
  ) {
    failed = true;
    console.error(`scratch: ${first.scratch}`);
  }
}
if (failed) process.exit(1);
