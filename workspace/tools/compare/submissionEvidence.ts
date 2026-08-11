import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { submissionAtAge } from "../../src/animation/submission.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSubmissionView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: "submission-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly move: "SUBMISSION";
  readonly moveId: 66;
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
    readonly status: "exact";
    readonly completeDenseWindow: 124;
    readonly reducer: 124;
    readonly typedSeam: 124;
    readonly framebuffer: 124;
  };
}

interface Ident { readonly address: number; readonly symbol: string | null }
interface Sprite {
  readonly slot: number;
  readonly template: Ident;
  readonly callback: Ident;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrixNum: number;
  readonly matrix: readonly number[];
}
interface Task { readonly func: Ident; readonly data: readonly number[] }
interface SoundPlayer { readonly rawInfo: string; readonly songHeader: number; readonly status: number }
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly gAnimScriptActive: number;
  readonly script: Ident;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly Task[];
  readonly sprites: readonly Sprite[];
  readonly battlers: unknown;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: SoundPlayer;
  readonly se2: SoundPlayer;
}
interface Probe {
  readonly schema: "submission-dense-evidence/v1";
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly sourceSymbols: { readonly Move_SUBMISSION: number; readonly Move_SUNNY_DAY: number };
  readonly topology: {
    readonly tasks: readonly string[];
    readonly templates: readonly string[];
    readonly callbacks: readonly string[];
  };
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: submissionEvidence.ts <player-fixture> <opponent-fixture>");
}

const evidenceDigests = new Map<string, string>();
const rawDigests = new Map<string, string>();

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizedChangeMap(rgbDir: string): string {
  const changed = spawnSync("python3", [
    join(root, "tools/compare/frame-changemap.py"), rgbDir,
  ], { cwd: root, encoding: "utf8" });
  assert(changed.status === 0,
    `frame-changemap failed: ${changed.stderr || changed.stdout}`);
  return changed.stdout.trimEnd().split("\n").slice(1).join("\n");
}

function sourceStage(orientation: Fixture["orientation"]) {
  const playerToOpponent = orientation === "player-back";
  return createSceneOnMovePresentation({
    move: "SUBMISSION",
    attacker: {
      species: "POLIWRATH",
      geometry: playerToOpponent
        ? {
            side: "player",
            spriteCorner: { x: 40, y: 59 },
            animationCenter: { x: 72, y: 91 },
            battlePositionCenter: { x: 72, y: 80 },
          }
        : {
            side: "opponent",
            spriteCorner: { x: 144, y: 16 },
            animationCenter: { x: 176, y: 48 },
            battlePositionCenter: { x: 176, y: 40 },
          },
    },
    target: {
      species: "LICKITUNG",
      geometry: playerToOpponent
        ? {
            side: "opponent",
            spriteCorner: { x: 144, y: 16 },
            animationCenter: { x: 176, y: 48 },
            battlePositionCenter: { x: 176, y: 40 },
          }
        : {
            side: "player",
            spriteCorner: { x: 40, y: 62 },
            // This is `GetBattlerSpriteCoord` for Lickitung back art, not
            // its sheet center (which remains 72,94 for ordinary drawing).
            animationCenter: { x: 72, y: 102 },
            battlePositionCenter: { x: 72, y: 80 },
          },
    },
    fieldProfile: {
      playerHp: 197,
      playerMaxHp: 197,
      opponentHp: 197,
      opponentMaxHp: 197,
      playerGender: "male",
      opponentGender: "male",
    },
  });
}

function reducerView(view: ReturnType<typeof sceneOnSubmissionView>) {
  return {
    age: view.age,
    active: view.active,
    impactGfxLoaded: view.impactGfxLoaded,
    monbgTaskActive: view.monbgTaskActive,
    clearMonbgTaskActive: view.clearMonbgTaskActive,
    alpha: view.alpha,
    translationTasksActive: view.translationTasksActive,
    attackerOffset: view.attackerOffset,
    targetOffset: view.targetOffset,
    impacts: view.impacts,
  };
}

function diffFrame(app: Uint8Array, raw: Buffer): { count: number; bbox: string } {
  let count = 0;
  let minX = 240;
  let minY = 160;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] === raw[pixel * 3]
      && app[pixel * 4 + 1] === raw[pixel * 3 + 1]
      && app[pixel * 4 + 2] === raw[pixel * 3 + 2]) continue;
    count += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { count, bbox: `${minX},${minY}-${maxX},${maxY}` };
}

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  assert(
    fixture.schema === "submission-evidence/v1"
      && fixture.oracleProfile === "battle-scene-on"
      && fixture.move === "SUBMISSION"
      && fixture.moveId === 66
      && fixture.acceptance.status === "exact"
      && fixture.acceptance.completeDenseWindow === 124
      && fixture.acceptance.reducer === 124
      && fixture.acceptance.typedSeam === 124
      && fixture.acceptance.framebuffer === 124,
    `${fixture.orientation}: invalid exact acceptance fixture`,
  );
  const scratch = createScratchDir("pokebench-submission-evidence-");
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
  assert(run.status === 0, `${fixture.orientation}: probe exited ${run.status}`);

  const evidenceBytes = readFileSync(output);
  const probe = JSON.parse(evidenceBytes.toString("utf8")) as Probe;
  const evidenceDigest = sha256(evidenceBytes);
  assert(probe.schema === "submission-dense-evidence/v1",
    `${fixture.orientation}: probe contract drifted`);
  assert(probe.sourceSymbols.Move_SUBMISSION === 0x082d2664
    && probe.sourceSymbols.Move_SUNNY_DAY === 0x082d2707,
  `${fixture.orientation}: source pointer bounds drifted`);
  assert(same(probe.sourceWindow, fixture.sourceWindow)
    && evidenceDigest === fixture.probeJsonSha256,
  `${fixture.orientation}: source receipt drifted`);
  const priorEvidence = evidenceDigests.get(fixture.orientation);
  assert(priorEvidence === undefined || priorEvidence === evidenceDigest,
    `${fixture.orientation}: fresh source receipt changed`);
  evidenceDigests.set(fixture.orientation, evidenceDigest);

  const frames = probe.frames;
  assert(frames.length === 124
    && frames[0]?.frame === fixture.sourceWindow.startFrame
    && frames.at(-1)?.frame === fixture.sourceWindow.endFrame,
  `${fixture.orientation}: incomplete pointer-bounded dense window`);
  for (const symbol of [
    "AnimTask_TranslateMonElliptical_Step",
    "Task_UpdateMonBg",
    "Task_ClearMonBg",
  ]) {
    assert(probe.topology.tasks.includes(symbol),
      `${fixture.orientation}: missing task ${symbol}`);
  }
  assert(probe.topology.templates.includes("gBasicHitSplatSpriteTemplate"),
    `${fixture.orientation}: missing IMPACT lifecycle`);

  const stage = sourceStage(fixture.orientation);
  const playerToOpponent = fixture.orientation === "player-back";
  let reducerMatched = 0;
  let seamMatched = 0;
  let softwareMatched = 0;
  let hardwareReceiptMatched = 0;
  let registerMatched = 0;
  let framebufferMatched = 0;
  const framebufferErrors: string[] = [];
  const initialBattlers = JSON.stringify(frames[0]!.battlers);
  const sourceTaskNames = new Set([
    "AnimTask_TranslateMonElliptical_Step",
    "Task_UpdateMonBg",
    "Task_ClearMonBg",
  ]);

  for (const [age, frame] of frames.entries()) {
    assert(frame.frame === fixture.sourceWindow.startFrame + age,
      `${fixture.orientation}: non-dense frame ${frame.frame}`);
    assert(JSON.stringify(frame.battlers) === initialBattlers,
      `${fixture.orientation}: battle state mutated at ${frame.frame}`);
    assert(frame.softwareOam.length === 128 && frame.hardwareOam.length === 128
      && frame.hardwareMatrices.length === 32
      && frame.fadedPalette.length === 512 && frame.unfadedPalette.length === 512
      && frame.hardwarePalette.length === 512 && frame.paletteTags.length === 16,
    `${fixture.orientation}: incomplete OAM/matrix/palette receipt at ${frame.frame}`);
    if (age < 123) {
      assert(frame.gAnimScriptActive === 1 && frame.scriptOffset !== null,
        `${fixture.orientation}: source body ended early at ${frame.frame}`);
    } else {
      // The controller leaves its completed script pointer parked inside the
      // source range for this first inactive display; `gAnimScriptActive`
      // and the visual-task counter are the source completion authority.
      assert(frame.gAnimScriptActive === 0 && frame.visualTaskCount === 0,
      `${fixture.orientation}: first inactive cleanup missing at ${frame.frame}`);
    }

    const expected = submissionAtAge(
      age,
      stage.config.target.geometry.animationCenter,
      stage.config.attacker.geometry.side,
    );
    const view = sceneOnSubmissionView({ ...stage, age });
    if (same(expected, reducerView(view))) {
      reducerMatched += 1;
      seamMatched += 1;
    }
    const attacker = playerToOpponent ? frame.playerSprite : frame.opponentSprite;
    const target = playerToOpponent ? frame.opponentSprite : frame.playerSprite;
    const hits = frame.sprites.filter(
      (sprite) => sprite.template.symbol === "gBasicHitSplatSpriteTemplate",
    );
    const translationTasks = frame.tasks.filter(
      (task) => task.func.symbol === "AnimTask_TranslateMonElliptical_Step",
    );
    const monbgTasks = frame.tasks.filter(
      (task) => task.func.symbol === "Task_UpdateMonBg",
    );
    const clearTasks = frame.tasks.filter(
      (task) => task.func.symbol === "Task_ClearMonBg",
    );
    const expectedHits = expected.impacts;
    const hitsOk = hits.length === expectedHits.length && hits.every((hit, index) => {
      const wanted = expectedHits[index]!;
      return hit.slot === wanted.slot && hit.x === wanted.x && hit.y === wanted.y
        && same(hit.matrix, [wanted.matrix.a, wanted.matrix.b, wanted.matrix.c, wanted.matrix.d]);
    });
    const tasksOk = translationTasks.length === Number(expected.translationTasksActive) * 2
      && monbgTasks.length === Number(expected.monbgTaskActive)
      && clearTasks.length === Number(expected.clearMonbgTaskActive)
      && frame.tasks.filter((task) => sourceTaskNames.has(task.func.symbol ?? "")).length
        >= translationTasks.length + monbgTasks.length + clearTasks.length;
    const sourceOk = attacker.x2 === expected.attackerOffset.x2
      && attacker.y2 === expected.attackerOffset.y2
      && target.x2 === expected.targetOffset.x2
      && target.y2 === expected.targetOffset.y2
      && hitsOk && tasksOk && frame.gAnimScriptActive === Number(expected.active);
    if (sourceOk) softwareMatched += 1;
    const registersOk = frame.registers.bldalpha === (expected.alpha ? 0x080c : 0)
      && frame.registers.bldcnt === (expected.alpha ? 0x3f40 : 0)
      && frame.registers.bldy === 0;
    if (registersOk) registerMatched += 1;
    // The full JSON receipt pins every software/hardware OAM word, affine
    // matrix, palette, register, and both SE player snapshots. These shape
    // checks make a truncated receipt fail before its digest could pass.
    if (frame.hardwareMatrices.every((matrix) => matrix.length === 4)
      && frame.se1.rawInfo.length === 128 && frame.se2.rawInfo.length === 128) {
      hardwareReceiptMatched += 1;
    }

    const raw = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    assert(sha256(raw) === frame.sha256,
      `${fixture.orientation}: raw RGB receipt mismatch at ${frame.frame}`);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = diffFrame(render(engine), raw);
    if (diff.count === 0) framebufferMatched += 1;
    else if (framebufferErrors.length < 16) {
      framebufferErrors.push(`${frame.frame}/age${age}: ${diff.count}px ${diff.bbox}`);
    }
  }

  assert(reducerMatched === 124 && seamMatched === 124,
    `${fixture.orientation}: reducer/seam ${reducerMatched}/124`);
  assert(softwareMatched === 124,
    `${fixture.orientation}: software task/OAM receipt ${softwareMatched}/124`);
  assert(registerMatched === 124 && hardwareReceiptMatched === 124,
    `${fixture.orientation}: hardware/register receipt ${hardwareReceiptMatched}/124, registers ${registerMatched}/124`);
  assert(framebufferMatched === 124,
    `${fixture.orientation}: framebuffer ${framebufferMatched}/124\n${framebufferErrors.join("\n")}`);

  const rgbHash = createHash("sha256");
  for (const name of readdirSync(rgbDir).filter((name) => name.endsWith(".rgb")).sort()) {
    rgbHash.update(readFileSync(join(rgbDir, name)));
  }
  const rawDigest = rgbHash.digest("hex");
  assert(rawDigest === fixture.rawRgbSha256,
    `${fixture.orientation}: concatenated raw RGB drifted`);
  const priorRaw = rawDigests.get(fixture.orientation);
  assert(priorRaw === undefined || priorRaw === rawDigest,
    `${fixture.orientation}: fresh raw RGB changed`);
  rawDigests.set(fixture.orientation, rawDigest);

  const actualMap = normalizedChangeMap(rgbDir);
  const committedMap = readFileSync(resolve(root, fixture.changeMap), "utf8").trimEnd()
    .split("\n").slice(1).join("\n");
  assert(actualMap === committedMap,
    `${fixture.orientation}: raw RGB change map drifted`);
  assert(sha256(readFileSync(resolve(root, fixture.changeMap))) === fixture.changeMapSha256,
    `${fixture.orientation}: committed change map digest drifted`);
  console.log(
    `${fixture.orientation} run ${runNumber}: 124/124 component+seam+software/hardware `
    + `OAM/matrix/palette/register/audio/state/raw-RGB/framebuffer; `
    + `probe ${evidenceDigest}; raw ${rawDigest}`,
  );
}

for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
  for (const fixturePath of fixturePaths) verify(fixturePath, runNumber);
}
