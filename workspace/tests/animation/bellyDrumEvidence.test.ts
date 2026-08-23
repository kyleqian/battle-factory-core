import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  bellyDrumAtAge,
  bellyDrumNotesAtAge,
} from "../../src/animation/bellyDrum.ts";
import { bellyDrumSourceReceipt } from "../../tools/compare/bellyDrumSourceAudit.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/belly-drum-evidence.json",
  "utf8",
)) as any;

function readRows(orientation: "player-back" | "opponent-front"): any[] {
  const path = fixture.orientations[orientation].denseState as string;
  return JSON.parse(gunzipSync(readFileSync(path)).toString("utf8")).frames;
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("MOVE_BELLY_DRUM retained Scene-ON evidence", () => {
  it("pins the source receipt, bilateral windows, dense state, and change maps", () => {
    expect(bellyDrumSourceReceipt.sourceBounds).toMatchObject(fixture.source);
    expect(fixture.productionFramebufferCompared).toBe(false);
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const receipt = fixture.orientations[orientation];
      const rows = readRows(orientation);
      expect(rows).toHaveLength(110);
      expect(rows[0].frame).toBe(receipt.window.startFrame);
      expect(rows.at(-1).frame).toBe(receipt.window.endFrame);
      expect(sha256(receipt.denseState)).toBe(receipt.denseStateSha256);
      expect(sha256(receipt.changeMap)).toBe(receipt.changeMapSha256);
      expect(rows.map((row) => row.frame)).toEqual(
        Array.from({ length: 110 }, (_, index) => receipt.window.startFrame + index),
      );
      for (const row of rows) {
        expect(row).toEqual(expect.objectContaining({
          script: expect.any(Object),
          tasks: expect.any(Array),
          sprites: expect.any(Array),
          softwareOam: expect.any(Array),
          hardwareOam: expect.any(Array),
          softwareMatrices: expect.any(Array),
          hardwareMatrices: expect.any(Array),
          fadedPalette: expect.any(Array),
          hardwarePalette: expect.any(Array),
          paletteTags: expect.any(Array),
          tileTags: expect.any(Array),
          registers: expect.any(Object),
          battlers: expect.any(Object),
          parties: expect.any(Object),
          immutableState: expect.any(Object),
          animationRng: expect.any(Number),
        }));
      }
    }
  });

  it("replays every retained lifecycle count and preceding-row latch", () => {
    for (const [orientation, origin] of [
      ["player-back", { x: 72, y: 107 }],
      ["opponent-front", { x: 176, y: 56 }],
    ] as const) {
      const rows = readRows(orientation);
      let oamLatches = 0;
      let matrixLatches = 0;
      let paletteLatches = 0;
      for (let age = 0; age < rows.length; age += 1) {
        const row = rows[age]!;
        const notes = row.sprites.filter((sprite: any) =>
          sprite.template?.symbol === "gSlowFlyingMusicNotesSpriteTemplate");
        const hands = row.sprites.filter((sprite: any) =>
          sprite.template?.symbol === "gBellyDrumHandSpriteTemplate");
        const shake = row.tasks.filter((task: any) =>
          task.func?.symbol === "AnimTask_ShakeMon_Step");
        const body = bellyDrumAtAge(age, origin, orientation === "player-back" ? "player" : "opponent");
        expect(body.notes).toHaveLength(notes.length);
        expect(body.hands).toHaveLength(hands.length);
        expect(body.shakeTasks).toHaveLength(shake.length);
        expect(body.visualTaskCount).toBe(row.visualTaskCount);
        expect(body.sourceOffset).toBe(row.scriptOffset);
        expect(row.scriptOffset).toBe(
          age === 0 ? 0
            : age <= 3 ? 3
              : age <= 6 ? 6
                : age <= 23 ? 40
                  : age <= 40 ? 66
                    : age <= 49 ? 92
                      : age <= 58 ? 118
                        : age <= 67 ? 144
                          : age <= 108 ? 168 : 177,
        );
        if (age > 0) {
          const previous = rows[age - 1]!;
          if (JSON.stringify(row.hardwareOam) === JSON.stringify(previous.softwareOam)) oamLatches += 1;
          if (JSON.stringify(row.hardwareMatrices) === JSON.stringify(previous.softwareMatrices)) matrixLatches += 1;
          if (JSON.stringify(row.hardwarePalette) === JSON.stringify(previous.fadedPalette)) paletteLatches += 1;
        }
        for (const note of body.notes) {
          const sprite = notes.find((candidate: any) => candidate.slot === note.spriteSlot);
          expect(sprite).toBeDefined();
          expect(sprite).toMatchObject({ x: note.x, y: note.y, x2: note.x2, y2: note.y2 });
          expect(sprite.matrix?.[0]).toBe(note.affinePaPd);
          expect(sprite.data.slice(0, 6)).toEqual(note.linearData);
        }
      }
      expect(oamLatches).toBe(109);
      expect(matrixLatches).toBe(109);
      expect(paletteLatches).toBe(109);
      expect(rows.at(-1).gAnimScriptActive).toBe(false);
    }
  });

  it("keeps the six source note lifetimes independent of the evidence reader", () => {
    expect(bellyDrumNotesAtAge(7, { x: 72, y: 107 })).toHaveLength(1);
    expect(bellyDrumNotesAtAge(68, { x: 72, y: 107 })).toHaveLength(4);
    expect(bellyDrumNotesAtAge(108, { x: 72, y: 107 })).toHaveLength(0);
  });
});
