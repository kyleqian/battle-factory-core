import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly move: string;
  readonly moveId: number;
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly sourceBounds: { readonly start: string; readonly endExclusive: string };
  readonly probeJsonSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly status: string;
    readonly completeDenseWindow: number;
    readonly reducer: number;
    readonly typedSeam: number;
    readonly framebuffer: number;
  };
}

interface Ident { readonly address: number; readonly symbol: string | null }
interface Sprite {
  readonly slot: number;
  readonly template: Ident;
  readonly callback: Ident;
  readonly inUse: boolean;
  readonly data: readonly number[];
}
interface Task { readonly func: Ident; readonly data: readonly number[] }
interface SoundPlayer { readonly songHeader: number; readonly status: number }
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly scriptPtr: number;
  readonly scriptOffset: number | null;
  readonly animScriptActive: boolean;
  readonly battleAnimAttacker: number;
  readonly battleAnimTarget: number;
  readonly battlers: readonly Sprite[];
  readonly sprites: readonly Sprite[];
  readonly tasks: readonly Task[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: SoundPlayer;
  readonly se2: SoundPlayer;
  readonly battlerState: unknown;
}
interface Probe {
  readonly schema: string;
  readonly move: number;
  readonly sourceBounds: { readonly start: number; readonly endExclusive: number };
  readonly templates: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: drillPeckEvidence.ts <player-fixture> <opponent-fixture>");
}

const evidenceDigests = new Map<string, string>();
const rawDigests = new Map<string, string>();

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function activeSprites(frame: Frame, template: number): readonly Sprite[] {
  return frame.sprites.filter((sprite) => sprite.template.address === template);
}

function startsAcrossWindow(frames: readonly Frame[], template: number): number {
  let prior = new Set<number>();
  let starts = 0;
  for (const frame of frames) {
    const current = new Set(activeSprites(frame, template).map((sprite) => sprite.slot));
    for (const slot of current) if (!prior.has(slot)) starts += 1;
    prior = current;
  }
  return starts;
}

function sourceTaskFrames(frames: readonly Frame[], symbol: string): number {
  return frames.filter((frame) => frame.tasks.some((task) => task.func.symbol === symbol)).length;
}

function tagFrames(frames: readonly Frame[], tag: number): readonly Frame[] {
  return frames.filter((frame) => frame.paletteTags.includes(tag) && frame.tileTags.includes(tag));
}

function normalizedChangeMap(rgbDir: string): string {
  const changed = spawnSync("python3", [
    join(root, "tools/compare/frame-changemap.py"), rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (changed.status !== 0) {
    throw new Error(`frame-changemap failed: ${changed.stderr || changed.stdout}`);
  }
  // The tool's first line contains the scratch directory. The committed map
  // deliberately has a stable provenance header in that position.
  return changed.stdout.trimEnd().split("\n").slice(1).join("\n");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  assert(
    fixture.schema === "drill-peck-evidence/v1"
      && fixture.oracleProfile === "battle-scene-on"
      && fixture.move === "DRILL_PECK"
      && fixture.moveId === 65
      && fixture.acceptance.status === "evidence-only"
      && fixture.acceptance.reducer === 0
      && fixture.acceptance.typedSeam === 0
      && fixture.acceptance.framebuffer === 0,
    `${fixture.orientation}: invalid honest evidence-only fixture`,
  );
  const scratch = createScratchDir("pokebench-drill-peck-evidence-");
  const output = join(scratch, "probe.json");
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
  const probe = JSON.parse(bytes.toString()) as Probe;
  const evidenceDigest = sha256(bytes);
  assert(probe.schema === "drill-peck-dense-evidence/v1" && probe.move === 65,
    `${fixture.orientation}: unexpected probe contract`);
  assert(probe.sourceBounds.start === 0x082cafc8 && probe.sourceBounds.endExclusive === 0x082cb020,
    `${fixture.orientation}: pointer bounds changed`);
  assert(JSON.stringify(probe.sourceWindow) === JSON.stringify(fixture.sourceWindow),
    `${fixture.orientation}: source window changed`);
  assert(evidenceDigest === fixture.probeJsonSha256,
    `${fixture.orientation}: probe digest ${evidenceDigest} != ${fixture.probeJsonSha256}`);
  const priorEvidence = evidenceDigests.get(fixture.orientation);
  assert(priorEvidence === undefined || priorEvidence === evidenceDigest,
    `${fixture.orientation}: fresh probe changed`);
  evidenceDigests.set(fixture.orientation, evidenceDigest);

  const names = [
    "gBowMonSpriteTemplate", "gFlashingHitSplatSpriteTemplate",
    "gWhirlwindLineSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate",
  ] as const;
  for (const name of names) assert(probe.templates[name] !== undefined,
    `${fixture.orientation}: missing template ${name}`);
  const frames = probe.frames;
  assert(frames.length === fixture.sourceWindow.frameCount && frames.length === 91,
    `${fixture.orientation}: incomplete dense capture`);
  assert(frames[0]?.frame === fixture.sourceWindow.startFrame
    && frames.at(-1)?.frame === fixture.sourceWindow.endFrame,
  `${fixture.orientation}: source endpoints changed`);

  const attacker = fixture.orientation === "player-back" ? 0 : 1;
  const target = attacker ^ 1;
  const sourceStart = probe.sourceBounds.start;
  const sourceEnd = probe.sourceBounds.endExclusive;
  for (const [index, frame] of frames.entries()) {
    assert(frame.frame === fixture.sourceWindow.startFrame + index,
      `${fixture.orientation}: non-dense frame ${frame.frame}`);
    assert(frame.battleAnimAttacker === attacker && frame.battleAnimTarget === target,
      `${fixture.orientation}: side geometry changed at ${frame.frame}`);
    assert(frame.battlers.length === 2 && frame.softwareOam.length === 128
      && frame.hardwareOam.length === 128 && frame.hardwareMatrices.length === 32
      && frame.fadedPalette.length === 512 && frame.unfadedPalette.length === 512
      && frame.hardwarePalette.length === 512 && frame.paletteTags.length === 16
      && frame.tileTags.length === 128 && Object.keys(frame.registers).length === 4,
    `${fixture.orientation}: incomplete hardware receipt at ${frame.frame}`);
    assert(sha256(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`))) === frame.sha256,
      `${fixture.orientation}: raw RGB mismatch at ${frame.frame}`);
    if (index + 1 < frames.length) {
      assert(frame.animScriptActive && frame.scriptOffset !== null
        && frame.scriptPtr >= sourceStart && frame.scriptPtr < sourceEnd,
      `${fixture.orientation}: script left source body early at ${frame.frame}`);
    } else {
      assert(!frame.animScriptActive && frame.scriptOffset === null,
        `${fixture.orientation}: first inactive cleanup was not captured`);
    }
  }

  const rawHash = createHash("sha256");
  for (const name of readdirSync(rgbDir).filter((name) => name.endsWith(".rgb")).sort()) {
    rawHash.update(readFileSync(join(rgbDir, name)));
  }
  const rawDigest = rawHash.digest("hex");
  assert(rawDigest === fixture.rawRgbSha256,
    `${fixture.orientation}: concatenated raw RGB changed`);
  const priorRaw = rawDigests.get(fixture.orientation);
  assert(priorRaw === undefined || priorRaw === rawDigest,
    `${fixture.orientation}: fresh raw RGB changed`);
  rawDigests.set(fixture.orientation, rawDigest);

  const bow = probe.templates.gBowMonSpriteTemplate!;
  const splat = probe.templates.gFlashingHitSplatSpriteTemplate!;
  const whirlwind = probe.templates.gWhirlwindLineSpriteTemplate!;
  const slide = probe.templates.gSlideMonToOriginalPosSpriteTemplate!;
  assert(startsAcrossWindow(frames, bow) === 3,
    `${fixture.orientation}: BowMon phases are not complete`);
  assert(startsAcrossWindow(frames, splat) === 8,
    `${fixture.orientation}: Drill Peck did not create eight hit splats`);
  assert(startsAcrossWindow(frames, whirlwind) === 0,
    `${fixture.orientation}: Drill Peck unexpectedly creates Whirlwind line sprites`);
  assert(startsAcrossWindow(frames, slide) === 1
    && frames.filter((frame) => activeSprites(frame, slide).length > 0).length === 6,
  `${fixture.orientation}: return-slide lifecycle changed`);
  assert(sourceTaskFrames(frames, "AnimTask_DrillPeckHitSplats") === 30
    && sourceTaskFrames(frames, "AnimTask_ShakeMon2_Step") === 34
    && sourceTaskFrames(frames, "Task_LoopAndPlaySE") === 34,
  `${fixture.orientation}: Drill Peck task lifecycles changed`);
  const impactTags = tagFrames(frames, 10135);
  const whirlwindTags = tagFrames(frames, 10162);
  const firstSplat = frames.find((frame) => activeSprites(frame, splat).length > 0);
  assert(impactTags.length > 0 && whirlwindTags.length > 0
    && firstSplat !== undefined
    && firstSplat.paletteTags.includes(10135) && firstSplat.tileTags.includes(10135)
    && firstSplat.paletteTags.includes(10162) && firstSplat.tileTags.includes(10162)
    && impactTags.at(-1)?.frame === fixture.sourceWindow.endFrame - 1
    && whirlwindTags.at(-1)?.frame === fixture.sourceWindow.endFrame - 1
    && !frames.at(-1)!.paletteTags.includes(10135)
    && !frames.at(-1)!.paletteTags.includes(10162),
  `${fixture.orientation}: IMPACT/WHIRLWIND resource lifetime changed`);
  assert(frames.some((frame) => frame.se1.songHeader === probe.songHeaders.SE_M_HEADBUTT)
    && frames.some((frame) => frame.se1.songHeader === probe.songHeaders.SE_M_HORN_ATTACK),
  `${fixture.orientation}: expected audio did not occur`);
  const initialState = JSON.stringify(frames[0]!.battlerState);
  assert(frames.every((frame) => JSON.stringify(frame.battlerState) === initialState),
    `${fixture.orientation}: battle outcome mutated during visual body`);

  const actualMap = normalizedChangeMap(rgbDir);
  const committedMap = readFileSync(resolve(root, fixture.changeMap), "utf8").trimEnd()
    .split("\n").slice(1).join("\n");
  assert(actualMap === committedMap,
    `${fixture.orientation}: change map changed`);
  assert(sha256(readFileSync(resolve(root, fixture.changeMap))) === fixture.changeMapSha256,
    `${fixture.orientation}: committed change map digest changed`);
  console.log(
    `${fixture.orientation} run ${runNumber}: ${frames.length}/${frames.length} `
    + `pointer/task/sprite/hardware/palette/audio/state/raw-RGB frames; `
    + `probe ${evidenceDigest}; raw ${rawDigest}`,
  );
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, runNumber);
}
