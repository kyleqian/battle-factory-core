import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  singNotesAtAge,
  singNoteAffinePaPdAtLocalAge,
  singPanTaskAtAge,
  type SingPoint,
} from "../../src/animation/sing.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSingView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import singAsset from "../../src/animation/assets/sing.json" with { type: "json" };

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
  readonly tileNum: number;
  readonly invisible: boolean;
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly animScriptActive: number;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly ProbeTask[];
  readonly notes: readonly ProbeNote[];
  readonly battlerSprites: readonly ProbeNote[];
  readonly hardwareOam: string;
  readonly hardwareObjPalettes: readonly number[];
  readonly spritePaletteTags: readonly number[];
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
const firstActive = bodyFrames[0]!;
const noteTileBase = probe.frames.flatMap((frame) => frame.notes)
  .find((note) => note.animNum === 7)!.tileNum - 4;
const rainbowPalettes = (singAsset as {
  musicNotes: {
    palettes: readonly (readonly Readonly<{ r: number; g: number; b: number }>[])[],
  },
}).musicNotes.palettes;
const bgr555 = (color: Readonly<{ r: number; g: number; b: number }>) =>
  (color.r >> 3) | ((color.g >> 3) << 5) | ((color.b >> 3) << 10);
const stage = createSceneOnMovePresentation({
  move: "SING",
  attacker: {
    species: "AZURILL",
    geometry: playerAttacker
      ? {
          side: "player", spriteCorner: { x: 40, y: 58 },
          animationCenter: { x: 72, y: 98 },
          battlePositionCenter: { x: 72, y: 80 },
        }
      : {
          side: "opponent", spriteCorner: { x: 144, y: 23 },
          animationCenter: { x: 176, y: 55 },
          battlePositionCenter: { x: 176, y: 40 },
        },
  },
  target: {
    species: "ONIX",
    geometry: playerAttacker
      ? {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        }
      : {
          side: "player", spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
  },
  fieldProfile: playerAttacker
    ? {
        playerHp: 142, playerMaxHp: 157,
        opponentHp: 110, opponentMaxHp: 110,
        playerGender: "male", opponentGender: "male",
      }
    : {
        playerHp: 110, playerMaxHp: 110,
        opponentHp: 140, opponentMaxHp: 157,
        playerGender: "male", opponentGender: "male",
      },
});

let noteMatches = 0;
let panMatches = 0;
let hardwareMatches = 0;
let paletteMatches = 0;
let monBgMatches = 0;
let framebufferMatches = 0;
let firstFramebufferDiff: string | null = null;
const framebufferDiffs: string[] = [];
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

  const presentation = { ...stage, age: frame.frame - firstActive.frame };
  // Exercise the public view as part of the seam, not only the component
  // reducer imported above.
  const seamView = sceneOnSingView(presentation);
  const displayedView = sceneOnSingView({
    ...presentation,
    age: presentation.age - 1,
  });
  const oam = Buffer.from(frame.hardwareOam, "hex");
  const signedOamCoord = (value: number, cutoff: number) =>
    value >= cutoff ? value - (cutoff === 256 ? 512 : 256) : value;
  const actualHardwareNotes: string[] = [];
  for (let index = 0; index < 128; index += 1) {
    const offset = index * 8;
    const attr0 = oam.readUInt16LE(offset);
    const attr1 = oam.readUInt16LE(offset + 2);
    const attr2 = oam.readUInt16LE(offset + 4);
    if (((attr0 >> 8) & 3) !== 3) continue;
    const palette = attr2 >> 12;
    if (palette < 7 || palette > 10) continue;
    const matrix = (attr1 >> 9) & 31;
    const matrixBase = matrix * 32;
    actualHardwareNotes.push([
      signedOamCoord(attr1 & 0x1ff, 256) + 16,
      signedOamCoord(attr0 & 0xff, 160) + 16,
      attr2 & 0x3ff,
      palette,
      oam.readInt16LE(matrixBase + 6),
      oam.readInt16LE(matrixBase + 14),
      oam.readInt16LE(matrixBase + 22),
      oam.readInt16LE(matrixBase + 30),
    ].join(","));
  }
  const expectedHardwareNotes = displayedView.notes.map((note) => {
    const matrix = singNoteAffinePaPdAtLocalAge(note.localAge + 1);
    return [
      note.x, note.y + note.y2,
      noteTileBase + note.tileOffset,
      7 + note.paletteIndex,
      matrix, 0, 0, matrix,
    ].join(",");
  });
  const hardwareMatch =
    actualHardwareNotes.sort().join("|")
    === expectedHardwareNotes.sort().join("|");
  if (hardwareMatch) hardwareMatches += 1;

  const paletteLastAge = playerAttacker ? 150 : 153;
  const palettesAllocated =
    presentation.age >= 7 && presentation.age <= paletteLastAge;
  const expectedAllocatedPaletteCount =
    presentation.age < 1 ? 0 : palettesAllocated ? 4 : 1;
  const paletteTagsMatch = frame.spritePaletteTags
    .slice(7, 11)
    .filter((tag) => tag !== 0xffff).length === expectedAllocatedPaletteCount;
  const paletteLatchExpected =
    presentation.age >= 8 && presentation.age <= paletteLastAge + 1;
  const paletteLatchMatch = !paletteLatchExpected
    || rainbowPalettes.every((palette, paletteIndex) =>
      palette.slice(1, 6).every((color, colorIndex) =>
        frame.hardwareObjPalettes[
          (7 + paletteIndex) * 16 + colorIndex + 1
        ] === bgr555(color)));
  const paletteMatch = paletteTagsMatch && paletteLatchMatch;
  if (paletteMatch) paletteMatches += 1;

  const targetIndex = playerAttacker ? 1 : 0;
  const monBgMatch =
    frame.battlerSprites[targetIndex]!.invisible === seamView.targetInMonBg;
  if (monBgMatch) monBgMatches += 1;
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: presentation,
  };
  const app = render(engine);
  const oracleRgb = readFileSync(
    join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`),
  );
  let framebufferExact = true;
  let pixelDiffs = 0;
  const pixelSamples: string[] = [];
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const rgb = pixel * 3;
    const rgba = pixel * 4;
    if (
      app[rgba] === oracleRgb[rgb]
      && app[rgba + 1] === oracleRgb[rgb + 1]
      && app[rgba + 2] === oracleRgb[rgb + 2]
    ) continue;
    framebufferExact = false;
    pixelDiffs += 1;
    const x = pixel % 240;
    const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    if (pixelSamples.length < 8) {
      pixelSamples.push(
        `${x},${y}: app=${app[rgba]},${app[rgba + 1]},${app[rgba + 2]}`
        + ` oracle=${oracleRgb[rgb]},${oracleRgb[rgb + 1]},${oracleRgb[rgb + 2]}`,
      );
    }
  }
  if (framebufferExact) framebufferMatches += 1;
  else {
    const summary =
      `first framebuffer diff frame ${frame.frame}`
      + `/age ${presentation.age}: ${pixelDiffs}px`
      + ` bbox ${minX},${minY}-${maxX},${maxY}; ${pixelSamples.join("; ")}`;
    framebufferDiffs.push(summary.replace("first framebuffer diff ", ""));
    if (firstFramebufferDiff === null) firstFramebufferDiff = summary;
  }

  if (
    (!notesMatch || !panMatch || !hardwareMatch || !paletteMatch || !monBgMatch)
    && diffs.length < 12
  ) {
    diffs.push(
      `frame ${frame.frame}/age ${age}: notes=${notesMatch} pan=${panMatch}`
      + ` hardware=${hardwareMatch} palettes=${paletteMatch} monbg=${monBgMatch}`
      + ` actualNotes=${actualNotes.length} expectedNotes=${expectedNotes.length}`,
    );
  }
}

const firstInactiveAfter = probe.frames[bodyEndIndex + 1];
console.log(
  `SING ${attackerSide}: notes ${noteMatches}/${bodyFrames.length},`
  + ` pan ${panMatches}/${bodyFrames.length},`
  + ` hardware ${hardwareMatches}/${bodyFrames.length},`
  + ` palettes ${paletteMatches}/${bodyFrames.length},`
  + ` monbg ${monBgMatches}/${bodyFrames.length},`
  + ` framebuffer ${framebufferMatches}/${bodyFrames.length};`
  + ` note body ${firstNoteFrame}..`
  + `${probe.frames.filter((frame) => frame.notes.length > 0).at(-1)!.frame};`
  + ` first animation script ${firstActive.frame}..${firstInactiveAfter?.frame}`,
);
if (firstFramebufferDiff) console.error(firstFramebufferDiff);
if (framebufferDiffs.length > 1) {
  console.error(framebufferDiffs.slice(1).join("\n"));
}
if (diffs.length > 0) {
  console.error(diffs.join("\n"));
  process.exit(1);
}
if (framebufferMatches !== bodyFrames.length) process.exit(1);
