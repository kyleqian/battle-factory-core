import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  singNotesAtAge,
  singPanTaskAtAge,
  type SingPoint,
} from "../../src/animation/sing.ts";

interface Scenario {
  readonly overrides: {
    readonly parties: {
      readonly player: readonly { readonly moves: readonly number[] }[];
    };
  };
}

interface ProbeTask {
  readonly func: number;
  readonly data: readonly number[];
}

interface ProbeNote {
  readonly slot: number;
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
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly ProbeTask[];
  readonly notes: readonly ProbeNote[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const scenarioPath = resolve(process.argv[2]!);
const scenario = JSON.parse(readFileSync(scenarioPath, "utf8")) as Scenario;
const playerAttacker = scenario.overrides.parties.player[0]?.moves[0] === 47;
const attackerSide = playerAttacker ? "player" : "opponent";
const origin: SingPoint = playerAttacker ? { x: 72, y: 98 } : { x: 176, y: 55 };
const target: SingPoint = playerAttacker ? { x: 176, y: 42 } : { x: 72, y: 88 };

const scratch = mkdtempSync(join(tmpdir(), "pokebench-sing-compare-"));
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"),
  join(root, "tools/compare/singProbe.py"),
  scenarioPath,
  output,
  rgbDir,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  readonly symbols: { readonly Task_PanFromInitialToTarget: number };
  readonly frames: readonly ProbeFrame[];
};
const firstNoteFrame = probe.frames.find((frame) => frame.notes.length > 0)?.frame;
if (firstNoteFrame === undefined) throw new Error("probe found no SING notes");
const firstNoteIndex = probe.frames.findIndex(
  (frame) => frame.frame === firstNoteFrame,
);
let bodyStartIndex = firstNoteIndex;
while (
  bodyStartIndex > 0
  && probe.frames[bodyStartIndex - 1]!.animScriptActive !== 0
) bodyStartIndex -= 1;
let bodyEndIndex = firstNoteIndex;
while (
  bodyEndIndex + 1 < probe.frames.length
  && probe.frames[bodyEndIndex + 1]!.animScriptActive !== 0
) bodyEndIndex += 1;
const bodyFrames = probe.frames.slice(bodyStartIndex, bodyEndIndex + 1);

let noteMatches = 0;
let panMatches = 0;
const diffs: string[] = [];
for (const frame of bodyFrames) {
  const age = frame.frame - firstNoteFrame;
  const expectedNotes = singNotesAtAge(age, origin, target);
  const actualNotes = [...frame.notes].sort((a, b) => a.slot - b.slot);
  const notesMatch = actualNotes.length === expectedNotes.length
    && actualNotes.every((actual, index) => {
      const expected = expectedNotes[index]!;
      return actual.x === expected.x
        && actual.y === expected.y
        && actual.y2 === expected.y2
        && actual.animNum === expected.animation
        && actual.paletteNum === 7 + expected.paletteIndex
        && actual.data[0] === expected.localAge
        && actual.data[1] === expected.paletteIndex
        && actual.data[2] === expected.localAge % 13
        && actual.data[3] === 12;
    });
  if (notesMatch) noteMatches += 1;

  const expectedPan = singPanTaskAtAge(age, attackerSide);
  const actualPan = frame.tasks.find(
    (task) => task.func === probe.symbols.Task_PanFromInitialToTarget,
  );
  const panMatch = expectedPan === null
    ? actualPan === undefined
    : actualPan !== undefined
      && actualPan.data[0] === expectedPan.initialPan
      && actualPan.data[1] === expectedPan.targetPan
      && actualPan.data[2] === expectedPan.incrementPan
      && actualPan.data[3] === 0
      && actualPan.data[4] === expectedPan.currentPan;
  if (panMatch) panMatches += 1;

  if ((!notesMatch || !panMatch) && diffs.length < 12) {
    diffs.push(
      `frame ${frame.frame}/age ${age}: notes=${notesMatch} pan=${panMatch}`
      + ` actualNotes=${actualNotes.length} expectedNotes=${expectedNotes.length}`,
    );
  }
}

const firstActive = bodyFrames[0]!;
const firstInactiveAfter = probe.frames[bodyEndIndex + 1];
console.log(
  `SING ${attackerSide}: notes ${noteMatches}/${bodyFrames.length},`
  + ` pan ${panMatches}/${bodyFrames.length};`
  + ` note body ${firstNoteFrame}..`
  + `${probe.frames.filter((frame) => frame.notes.length > 0).at(-1)!.frame};`
  + ` first animation script ${firstActive.frame}..${firstInactiveAfter?.frame}`,
);
if (diffs.length > 0) {
  console.error(diffs.join("\n"));
  process.exit(1);
}
