import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnGrassWhistleView,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  grassWhistleNoteSlotForIndex,
} from "../../src/animation/grassWhistle.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: unknown;
  readonly target: unknown;
  readonly fieldProfile: { readonly playerHp: number; readonly playerMaxHp: number; readonly opponentHp: number; readonly opponentMaxHp: number };
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: "partial" | "exact";
    readonly framebufferMatching?: number;
    readonly componentMatching?: number;
  };
}

interface ProbeNote {
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly animNum: number;
  readonly paletteNum: number;
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly animScriptActive: number;
  readonly inMoveScript: boolean;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly notes: readonly ProbeNote[];
  readonly hardwareObjPalettes: readonly number[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-grass-whistle-compare-");
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
  ],
  { cwd: root, encoding: "utf8" },
);
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const bytes = readFileSync(output);
const probe = JSON.parse(bytes.toString("utf8")) as {
  readonly schema: string;
  readonly scriptBounds: Record<string, number>;
  readonly frames: readonly ProbeFrame[];
};
const evidenceHash = createHash("sha256").update(bytes).digest("hex");
const rgbHash = createHash("sha256");
for (const frame of probe.frames) {
  rgbHash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
}
const errors: string[] = [];
if (probe.schema !== fixture.evidenceSchema) errors.push("probe schema drifted");
const moveFrames = probe.frames.filter((frame) => frame.inMoveScript);
if (moveFrames.length !== fixture.denseWindow.frameCount) {
  errors.push(`in-move frames ${moveFrames.length} != fixture ${fixture.denseWindow.frameCount}`);
}
if (JSON.stringify(probe.frames) !== JSON.stringify(probe.frames)) errors.push("unreachable");
if (evidenceHash !== fixture.evidenceSha256) errors.push(`evidence hash ${evidenceHash}`);
if (evidenceHash !== fixture.secondFreshEvidenceSha256) errors.push("second-fresh evidence pin differs");
const actualRgbHash = rgbHash.digest("hex");
if (actualRgbHash !== fixture.rawRgbSha256) errors.push(`RGB hash ${actualRgbHash}`);
const firstMove = moveFrames[0];
const lastMove = moveFrames.at(-1);
if (!firstMove?.animScriptActive || lastMove?.animScriptActive) errors.push("active/cleanup boundary drifted");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`${moveFrames.length}/${fixture.denseWindow.frameCount} isolated move frames reproduced`);
console.log(`evidence ${evidenceHash}; RGB ${actualRgbHash}`);

const frames = new Map(moveFrames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "GRASS_WHISTLE",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
let componentMatches = 0;
let framebufferMatches = 0;
const componentMismatches: string[] = [];
const framebufferDiffLines: string[] = [];

for (const frame of moveFrames) {
  const age = frame.frame - fixture.denseWindow.startFrame;
  const view = sceneOnGrassWhistleView({ ...stage, age });
  // Notes latch RAM->framebuffer one display behind (the draw uses age-1), so
  // the RAM-level component comparison runs at the ACTUAL age. The app's notes
  // are ordered by the spriteOrder painter pass; re-order them by their
  // probe-derived sprite slot to compare positionally against the ROM's
  // ascending-slot records.
  const noteExact = view.notes.length === frame.notes.length
    && [...view.notes]
      .sort(
        (a, b) => grassWhistleNoteSlotForIndex(a.index) - grassWhistleNoteSlotForIndex(b.index),
      )
      .every((note, index) => {
        const actual = frame.notes[index];
        if (!actual) return false;
        return actual.x === note.x
          && actual.y === note.y
          && actual.y2 === note.y2
          && actual.animNum === note.animation
          && actual.paletteNum === 8
          && actual.data[0] === note.localAge
          && actual.data[1] === 1
          && actual.data[2] === 0
          && actual.data[3] === 0;
      });
  const taskExact = view.visualTaskCount === frame.visualTaskCount;
  if (!noteExact || !taskExact) {
    componentMismatches.push(`frame ${frame.frame}/age ${age}: notes ${view.notes.length}vs${frame.notes.length} vt ${view.visualTaskCount}vs${frame.visualTaskCount}`);
  } else {
    componentMatches += 1;
  }

  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const appRgba = render(engine);
  const oracleRgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
  let exact = true;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      appRgba[pixel * 4] !== oracleRgb[pixel * 3]
      || appRgba[pixel * 4 + 1] !== oracleRgb[pixel * 3 + 1]
      || appRgba[pixel * 4 + 2] !== oracleRgb[pixel * 3 + 2]
    ) {
      exact = false;
      break;
    }
  }
  if (exact) framebufferMatches += 1;
  else {
    let count = 0;
    let minX = 240;
    let minY = 160;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      const offset = pixel * 3;
      if (
        appRgba[pixel * 4] === oracleRgb[offset]
        && appRgba[pixel * 4 + 1] === oracleRgb[offset + 1]
        && appRgba[pixel * 4 + 2] === oracleRgb[offset + 2]
      ) continue;
      count += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    framebufferDiffLines.push(`framebuffer diff at frame ${frame.frame}: ${count}px bbox ${minX},${minY}-${maxX},${maxY}`);
  }
}

const total = moveFrames.length;
console.log(`GRASS_WHISTLE component ${componentMatches}/${total}; framebuffer ${framebufferMatches}/${total}`);
if (componentMismatches.length) console.error(componentMismatches.slice(0, 24).join("\n"));
if (framebufferDiffLines.length) console.error(framebufferDiffLines.slice(0, 24).join("\n"));
if (componentMatches !== total || framebufferMatches !== total) {
  console.error(`scratch: ${scratch}`);
  // An `exact` fixture must reproduce every frame on both axes. A `partial`
  // fixture is a staged checkpoint: it still pins the isolated window and the
  // twice-fresh evidence/RGB hashes above (those comparisons already hard-fail),
  // so report the shortfall against its recorded counts without claiming pass.
  if (fixture.acceptance.status === "exact") process.exit(1);
  if (framebufferMatches !== (fixture.acceptance.framebufferMatching ?? -1)
    || componentMatches !== (fixture.acceptance.componentMatching ?? -1)) {
    console.error("staged counts drifted from the fixture's recorded partial state");
    process.exit(1);
  }
}
if (fixture.acceptance.status === "exact"
  && framebufferMatches !== fixture.denseWindow.frameCount) process.exit(1);
