import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import {
  TEETER_DANCE_NOTE_X_OFFSETS,
  teeterDanceNoteAffinePaPdAtLocalAge,
  teeterDanceNotesAtAge,
  teeterDanceTaskAtAge,
  type TeeterDancePoint,
  type TeeterDanceSide,
} from "../../src/animation/teeterDance.ts";

type Sprite = {
  slot: number;
  x: number;
  y: number;
  x2: number;
  y2: number;
  attr0: number;
  attr1: number;
  attr2: number;
  animNum: number;
  matrixNum: number;
  matrix: { a: number; b: number; c: number; d: number };
  data: number[];
};

type Task = { func: number; data: number[] };
type Frame = {
  effects: Sprite[];
  tasks: Task[];
  battlerSprites: Sprite[];
  hardwareOam: string;
  hardwareMatrices: number[][];
  fadedPalette: number[];
  hardwarePalette: number[];
};

type ManifestOrientation = {
  frames: number;
  evidenceSha256: string;
  freshEvidenceSha256: string;
  rawRgbSequenceSha256: string;
  freshRawRgbSequenceSha256: string;
  denseState: string;
};

type Manifest = {
  orientations: Record<"player-back" | "opponent-front", ManifestOrientation>;
};

export interface TeeterDanceReducerAuditResult {
  readonly orientation: "player-back" | "opponent-front";
  readonly rows: number;
  readonly noteRows: number;
  readonly taskRows: number;
  readonly noteSprites: number;
  readonly oamLatches: number;
  readonly matrixLatches: number;
  readonly paletteLatches: number;
}

const manifest = JSON.parse(readFileSync(
  "tools/compare/fixtures/teeter-dance-evidence.json",
  "utf8",
)) as Manifest;

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function oamTriplet(sprite: Sprite): string {
  const bytes = Buffer.alloc(6);
  bytes.writeUInt16LE(sprite.attr0 & 0xffff, 0);
  bytes.writeUInt16LE(sprite.attr1 & 0xffff, 2);
  bytes.writeUInt16LE(sprite.attr2 & 0xffff, 4);
  return bytes.toString("hex");
}

export function auditTeeterDanceReducer(
  orientation: "player-back" | "opponent-front",
): TeeterDanceReducerAuditResult {
  const receipt = manifest.orientations[orientation];
  const decoded = gunzipSync(readFileSync(receipt.denseState));
  const digest = createHash("sha256").update(decoded).digest("hex");
  invariant(digest === receipt.evidenceSha256, `${orientation}: dense evidence hash`);
  invariant(receipt.freshEvidenceSha256 === receipt.evidenceSha256,
    `${orientation}: twice-fresh dense evidence`);
  invariant(receipt.freshRawRgbSequenceSha256 === receipt.rawRgbSequenceSha256,
    `${orientation}: twice-fresh raw RGB evidence`);

  const frames = (JSON.parse(decoded.toString("utf8")) as { frames: Frame[] }).frames;
  invariant(frames.length === receipt.frames, `${orientation}: frame count`);
  const side: TeeterDanceSide = orientation === "player-back" ? "player" : "opponent";
  const noteOrigin: TeeterDancePoint = orientation === "player-back"
    ? { x: 72, y: 93 }
    : { x: 176, y: 41 };
  const battlerOrigin: TeeterDancePoint = orientation === "player-back"
    ? { x: 72, y: 85 }
    : { x: 176, y: 41 };
  const battlerSlot = orientation === "player-back" ? 6 : 8;
  const sign = side === "player" ? 1 : -1;
  let noteSprites = 0;
  let oamLatches = 0;
  let matrixLatches = 0;
  let paletteLatches = 0;

  for (let age = 0; age < frames.length; age += 1) {
    const row = frames[age]!;
    const expectedNotes = teeterDanceNotesAtAge(age, noteOrigin, side);
    invariant(row.effects.length === expectedNotes.length,
      `${orientation} age ${age}: note count`);
    for (const note of expectedNotes) {
      const effect = row.effects.find((candidate) => candidate.slot === note.spriteSlot);
      invariant(effect, `${orientation} age ${age}: note slot ${note.spriteSlot}`);
      const rawOffset = TEETER_DANCE_NOTE_X_OFFSETS[note.index]! * sign;
      const velocityX = Math.trunc(rawOffset * 16 / 5);
      const velocityY = Math.trunc(-2 * 128 / 5);
      const xFixed = ((noteOrigin.x + rawOffset) << 4) + velocityX * note.localAge;
      const yFixed = ((noteOrigin.y - 2) << 4) + velocityY * note.localAge;
      invariant(same(
        [effect.x, effect.y, effect.x2, effect.y2, effect.animNum, effect.attr2 & 0x3ff],
        [note.x, note.y, note.x2, note.y2, note.animation, 305 + note.tileOffset],
      ), `${orientation} age ${age}: note geometry`);
      invariant(same(
        [effect.data[0], effect.data[4], effect.data[5], effect.data[6], effect.data[7]],
        [note.localAge, xFixed, yFixed, velocityX, velocityY],
      ), `${orientation} age ${age}: note callback state`);
      const affine = teeterDanceNoteAffinePaPdAtLocalAge(note.localAge + 1);
      invariant(same(effect.matrix, { a: affine, b: 0, c: 0, d: affine }),
        `${orientation} age ${age}: note affine state`);
      noteSprites += 1;

      const next = frames[age + 1];
      invariant(next, `${orientation} age ${age}: missing latch row`);
      if (next.hardwareOam.includes(oamTriplet(effect))) oamLatches += 1;
      if (same(next.hardwareMatrices[effect.matrixNum], [
        effect.matrix.a, effect.matrix.b, effect.matrix.c, effect.matrix.d,
      ])) matrixLatches += 1;
    }

    const task = teeterDanceTaskAtAge(age, noteOrigin, side, battlerOrigin);
    invariant(row.tasks.length === (task ? 1 : 0), `${orientation} age ${age}: task count`);
    if (task) {
      const actual = row.tasks[0]!;
      invariant(actual.func === 135659997, `${orientation} age ${age}: task callback`);
      const taskIndices = [0, 4, 5, 6, 9, 10, 11] as const;
      invariant(same(
        taskIndices.map((index) => actual.data[index]),
        taskIndices.map((index) => task.data[index]),
      ),
        `${orientation} age ${age}: task data`);
      const battler = row.battlerSprites.find((sprite) => sprite.slot === battlerSlot);
      invariant(battler, `${orientation} age ${age}: attacker battler`);
      invariant(same([battler.x, battler.x2], [task.x, task.x2]),
        `${orientation} age ${age}: battler task projection`);
    }
    if (age > 0 && same(row.hardwarePalette, frames[age - 1]!.fadedPalette)) {
      paletteLatches += 1;
    }
  }

  invariant(noteSprites === 235, `${orientation}: note sprite rows`);
  invariant(oamLatches === 235, `${orientation}: OAM latches`);
  invariant(matrixLatches === 235, `${orientation}: matrix latches`);
  invariant(paletteLatches === 168, `${orientation}: palette latches`);
  return {
    orientation,
    rows: frames.length,
    noteRows: frames.length,
    taskRows: frames.length,
    noteSprites,
    oamLatches,
    matrixLatches,
    paletteLatches,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({
    player: auditTeeterDanceReducer("player-back"),
    opponent: auditTeeterDanceReducer("opponent-front"),
  }, null, 2));
}
