import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import {
  cosmicPowerAtAge,
  COSMIC_POWER_SOURCE_END_EXCLUSIVE,
  COSMIC_POWER_SOURCE_START,
} from "../../src/animation/cosmicPower.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCosmicPowerView,
  type SceneOnCosmicPowerConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: "scene-on-dense-evidence/v1" | "cosmic-power-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly move: "MOVE_COSMIC_POWER";
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: "tools/compare/cosmicPowerProbe.py";
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly sourceBounds: { readonly start: string; readonly endExclusive: string };
  readonly carrier: { readonly setId: number; readonly species: string; readonly move: number; readonly level: number };
  readonly probeJsonSha256: string;
  readonly evidenceFullState: string;
  readonly evidenceFullStateGzipSha256: string;
  readonly rawRgbArchive: string;
  readonly rawRgbTarSha256: string;
  readonly rawRgbConcatSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly status: "checkpoint" | "exact";
    readonly componentFrames?: number;
    readonly framebufferFrames?: number | "unmeasured";
    readonly reducerRows?: number;
    readonly seamRows?: number;
    readonly latchRows?: number;
    readonly freshRuns?: number;
  };
}

interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: boolean;
  readonly script: { readonly address: number; readonly symbol: string | null };
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly { readonly func: { readonly symbol: string | null }; readonly data: readonly number[] }[];
  readonly sprites: readonly {
    readonly slot: number;
    readonly template: { readonly symbol: string | null };
    readonly callback: { readonly symbol: string | null };
    readonly attr: readonly number[];
    readonly x: number;
    readonly y: number;
    readonly x2: number;
    readonly y2: number;
    readonly invisible: number;
    readonly matrixNum: number;
    readonly matrix: readonly number[];
    readonly data: readonly number[];
  }[];
  readonly battlers: Readonly<Record<"player" | "opponent", Readonly<Record<string, unknown>>>>;
  readonly parties: unknown;
  readonly immutableState: unknown;
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly softwareMatrices: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
  readonly se2: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
}

interface Probe {
  readonly schema: "cosmic-power-dense-evidence/v1";
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly sourceSymbols: { readonly Move_COSMIC_POWER: number; readonly Move_BLAST_BURN: number };
  readonly topology: {
    readonly tasks: readonly string[];
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
  };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
const once = args.includes("--once");
const requireExact = args.includes("--require-exact");
const paths = args.filter((arg) => !arg.startsWith("--"));
const fixturePaths = paths.length > 0 ? paths : [
  "tools/compare/fixtures/cosmic-power-player-lunatone-opponent-onix.json",
  "tools/compare/fixtures/cosmic-power-opponent-lunatone-player-onix.json",
];
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const firstReceipts = new Map<string, readonly [string, string, string]>();

function configFor(orientation: Fixture["orientation"]): SceneOnCosmicPowerConfig {
  const player = orientation === "player-back";
  return {
    move: "COSMIC_POWER",
    attacker: {
      species: "LUNATONE",
      geometry: player
        ? { side: "player", spriteCorner: { x: 40, y: 53 }, animationCenter: { x: 72, y: 93 }, battlePositionCenter: { x: 72, y: 80 } }
        : { side: "opponent", spriteCorner: { x: 144, y: 4 }, animationCenter: { x: 176, y: 36 }, battlePositionCenter: { x: 176, y: 40 } },
    },
    target: {
      species: "ONIX",
      geometry: player
        ? { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
        : { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } },
    },
    fieldProfile: player
      ? { playerHp: 173, playerMaxHp: 177, opponentHp: 110, opponentMaxHp: 110, playerGender: "none", opponentGender: "male" }
      : { playerHp: 110, playerMaxHp: 110, opponentHp: 173, opponentMaxHp: 177, playerGender: "male", opponentGender: "none" },
  };
}

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], {
    cwd: root,
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0) throw new Error(`${fixture.orientation}: change-map header changed`);
  const committedHeader = readFileSync(resolve(root, fixture.changeMap), "utf8").split("\n", 1)[0]!;
  return `${committedHeader.split(" — ", 1)[0]} — ${run.stdout.slice(separator + 3)}`;
}

function framebufferDiff(app: Uint8Array, rgb: Buffer): { readonly count: number; readonly bbox: string } {
  let count = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgba = pixel * 4, raw = pixel * 3;
    if (app[rgba] === rgb[raw] && app[rgba + 1] === rgb[raw + 1] && app[rgba + 2] === rgb[raw + 2]) continue;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { count, bbox: count === 0 ? "none" : `${minX},${minY}-${maxX},${maxY}` };
}

function runFresh(fixture: Fixture): { readonly probe: Probe; readonly probeBytes: Buffer; readonly rgbDir: string; readonly scratch: string } {
  const scratch = createScratchDir(`pokebench-cosmic-power-${fixture.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
    resolve(root, fixture.scenario), output, rgbDir,
  ], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: join(vendor, "libmgba-py") },
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${fixture.orientation}: fresh probe failed (${run.status})`);
  const probeBytes = readFileSync(output);
  return { probe: JSON.parse(probeBytes.toString("utf8")) as Probe, probeBytes, rgbDir, scratch };
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Fixture;
  const { probe, probeBytes, rgbDir, scratch } = runFresh(fixture);
  const failures: string[] = [];
  const total = fixture.sourceWindow.frameCount;
  if (fixture.oracleProfile !== "battle-scene-on" || fixture.move !== "MOVE_COSMIC_POWER"
    || !same(fixture.carrier, { setId: 222, species: "LUNATONE", move: 322, level: 50 })
    || !same(fixture.sourceBounds, { start: "0x082d5f5d", endExclusive: "0x082d5fe2" })
    || probe.schema !== "cosmic-power-dense-evidence/v1" || !same(probe.sourceWindow, fixture.sourceWindow)
    || probe.frames.length !== total || probe.sourceSymbols.Move_COSMIC_POWER !== COSMIC_POWER_SOURCE_START
    || probe.sourceSymbols.Move_BLAST_BURN !== COSMIC_POWER_SOURCE_END_EXCLUSIVE
    || probe.frames[0]?.scriptOffset !== 0 || probe.frames.at(-1)?.gAnimScriptActive !== false) {
    failures.push("complete exclusive pointer window through first inactive cleanup");
  }
  for (const name of ["AnimTask_BlendSpriteColor_Step2", "AnimTask_UpdateSlidingBg", "Task_FadeToBg"])
    if (!probe.topology.tasks.includes(name)) failures.push(`task topology ${name}`);
  if (!probe.topology.templates.includes("gGrantingStarsSpriteTemplate")
    || !probe.topology.callbacks.includes("TranslateSpriteLinearFixedPoint")
    || !probe.topology.callbacks.includes("DestroyAnimSprite")) failures.push("GrantingStars topology");

  const config = configFor(fixture.orientation);
  const stage = createSceneOnMovePresentation(config);
  const first = probe.frames[0]!;
  let reducerRows = 0, seamRows = 0, componentRows = 0, latchRows = 0, framebufferRows = 0;
  const residuals: Array<{ readonly age: number; readonly count: number; readonly bbox: string }> = [];
  const rawConcat = createHash("sha256");
  for (const [age, frame] of probe.frames.entries()) {
    const before = failures.length;
    const raw = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    rawConcat.update(raw);
    if (sha256(raw) !== frame.sha256) failures.push(`age ${age}: raw RGB hash`);
    const expected = cosmicPowerAtAge(age, config.attacker.geometry.side, config.attacker.geometry.animationCenter);
    const seam = sceneOnCosmicPowerView({ ...stage, age });
    const { attacker: _attacker, target: _target, ...seamState } = seam;
    if (same(expected, seamState)) { reducerRows += 1; seamRows += 1; }
    else failures.push(`age ${age}: typed seam`);
    if (expected.active !== frame.gAnimScriptActive) failures.push(`age ${age}: active cleanup`);

    const taskNames = frame.tasks.map((task) => task.func.symbol);
    if (taskNames.includes("AnimTask_BlendSpriteColor_Step2") !== expected.nonAttackerBlendTaskActive)
      failures.push(`age ${age}: non-attacker palette task lifetime`);
    const blendTask = frame.tasks.find((task) => task.func.symbol === "AnimTask_BlendSpriteColor_Step2");
    if (blendTask !== undefined && blendTask.data[10] !== expected.nonAttackerBlendRamCoefficient)
      failures.push(`age ${age}: non-attacker palette task coefficient`);
    if (taskNames.includes("AnimTask_UpdateSlidingBg") !== expected.slidingBgTaskActive)
      failures.push(`age ${age}: sliding BG task lifetime`);
    if (taskNames.includes("Task_FadeToBg") !== expected.fadeToBgTaskActive)
      failures.push(`age ${age}: BG fade task lifetime`);

    const stars = frame.sprites.filter((sprite) => sprite.template.symbol === "gGrantingStarsSpriteTemplate");
    const sourceStars = stars.map((sprite) => ({
      kind: "grantingStar" as const,
      spawnIndex: (sprite.slot - 3) as 0 | 1,
      oamSlot: sprite.slot as 3 | 4,
      x: sprite.x,
      y: sprite.y,
      frame: Math.floor(((sprite.attr[2]! & 0x3ff) - 537) / 16),
      y2: sprite.y2,
      invisible: Boolean(sprite.invisible),
    }));
    if (!same(sourceStars, expected.sprites)) failures.push(`age ${age}: GrantingStars source reducer`);
    const sparkleLoaded = frame.tileTags.includes(10049) && frame.paletteTags.includes(10049);
    if (sparkleLoaded !== expected.resources.sparkle2Loaded) failures.push(`age ${age}: SPARKLE_2 tag lifecycle`);
    if (frame.registers.bldcnt !== expected.bldcnt || frame.registers.bldy !== expected.bldy
      || frame.registers.bg3vofs !== expected.bg3vofs || frame.registers.bldalpha !== 0
      || frame.registers.bg3cnt !== (expected.background === "cosmic" ? 14859 : 23051)) {
      failures.push(`age ${age}: BG/register schedule`);
    }
    if (frame.registers.dispcnt !== first.registers.dispcnt || frame.softwareOam.length !== 128
      || frame.hardwareOam.length !== 128 || frame.softwareMatrices.length !== 32
      || frame.hardwareMatrices.length !== 32 || frame.fadedPalette.length !== 512
      || frame.unfadedPalette.length !== 512 || frame.hardwarePalette.length !== 512) {
      failures.push(`age ${age}: complete OAM/matrix/palette/register shapes`);
    }
    if (age > 0) {
      const prior = probe.frames[age - 1]!;
      if (same(frame.hardwareOam, prior.softwareOam)
        && same(frame.hardwareMatrices, prior.softwareMatrices)
        && same(frame.hardwarePalette, prior.fadedPalette)) latchRows += 1;
      else failures.push(`age ${age}: software-to-hardware OAM/matrix/palette transfer`);
    }
    const audio = expected.audio[0];
    if (audio !== undefined) {
      const player = audio.player === "SE1" ? frame.se1 : frame.se2;
      const header = audio.song === "SE_M_COSMIC_POWER" ? 0x08902d68 : 0x08902130;
      if (player.songHeader !== header || !player.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === audio.pan))
        failures.push(`age ${age}: ${audio.song} audio`);
    }
    for (const side of ["player", "opponent"] as const)
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3", "statStages"])
        if (!same(frame.battlers[side][key], first.battlers[side][key])) failures.push(`age ${age}: immutable ${side}.${key}`);
    if (!same(frame.parties, first.parties) || !same(frame.immutableState, first.immutableState))
      failures.push(`age ${age}: immutable parties/outcome/weather/side state`);
    if (failures.length === before) componentRows += 1;

    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), raw);
    if (process.env.COSMIC_POWER_DUMP === "1" && [0, 22, 38, 129, 221, 240].includes(age)) {
      const rgba = render(engine);
      const appRgb = Buffer.alloc(240 * 160 * 3);
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        appRgb[pixel * 3] = rgba[pixel * 4]!;
        appRgb[pixel * 3 + 1] = rgba[pixel * 4 + 1]!;
        appRgb[pixel * 3 + 2] = rgba[pixel * 4 + 2]!;
      }
      writeFileSync(join(scratch, `app-${age}.rgb`), appRgb);
      writeFileSync(join(scratch, `oracle-${age}.rgb`), raw);
    }
    if (diff.count === 0) framebufferRows += 1;
    else residuals.push({ age, ...diff });
  }

  const changeMap = normalizedChangeMap(fixture, rgbDir);
  const receipts = [sha256(probeBytes), rawConcat.digest("hex"), sha256(changeMap)] as const;
  const committedFullState = readFileSync(resolve(root, fixture.evidenceFullState));
  const committedRawArchive = readFileSync(resolve(root, fixture.rawRgbArchive));
  if (receipts[0] !== fixture.probeJsonSha256 || receipts[1] !== fixture.rawRgbConcatSha256
    || receipts[2] !== fixture.changeMapSha256
    || sha256(committedFullState) !== fixture.evidenceFullStateGzipSha256
    || !same(gunzipSync(committedFullState), probeBytes)
    || sha256(committedRawArchive) !== fixture.rawRgbTarSha256
    || changeMap !== readFileSync(resolve(root, fixture.changeMap), "utf8")) {
    failures.push("immutable probe/raw-RGB/change-map receipt");
  }
  if (runNumber === 1) firstReceipts.set(fixture.orientation, receipts);
  else if (!same(firstReceipts.get(fixture.orientation), receipts)) failures.push("twice-fresh byte stability");

  const expectedExact = fixture.acceptance.status === "exact" || requireExact;
  if (expectedExact && (reducerRows !== total || seamRows !== total || componentRows !== total
    || latchRows !== total - 1 || framebufferRows !== total)) failures.push("complete exact acceptance counts");
  if (fixture.acceptance.status === "exact" && !same(fixture.acceptance, {
    status: "exact",
    reducerRows: total,
    seamRows: total,
    componentFrames: total,
    latchRows: total - 1,
    framebufferFrames: total,
    freshRuns: 2,
  })) failures.push("pinned exact acceptance receipt");
  const byCount = residuals.slice().sort((left, right) => right.count - left.count);
  const peak = byCount[0];
  const ages = residuals.map(({ age }) => age);
  console.log(`${fixture.orientation} run ${runNumber}: reducer/seam/component/latch/framebuffer ${reducerRows}/${seamRows}/${componentRows}/${latchRows}/${framebufferRows}/${total}; receipts ${receipts.join("/")}`);
  if (residuals.length > 0) console.log(`residual ages ${ages.join(",")}; peak ${peak!.count}px at age ${peak!.age} bbox ${peak!.bbox}`);
  if (residuals.length > 0) console.log(`first ${JSON.stringify(residuals.slice(0, 12))}; worst ${JSON.stringify(byCount.slice(0, 12))}`);
  if (failures.length > 0) {
    console.error([...new Set(failures)].slice(0, 120).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= (once ? 1 : 2); run += 1)
  for (const path of fixturePaths) verify(path, run);
