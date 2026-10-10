import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { growAndShrinkY2AtAge } from "../src/animation/swagger.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors, liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import monPicCoords from "../src/data/gen/mon-pic-coords.json" with { type: "json" };
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// fix74 (docs/fix74-bulk-up-light-screen.md): Bulk Up 339 is source-correct for every Factory Bulk Up user. Its species inputs are the
// y_offset of the side's pic coords (SetBattlerSpriteYOffsetFromYScale's height H = 64 - 2 * y_offset), the OBJ corner, the picture and
// the breath origin; the duration is species-independent. Receipt: 22 dense windows (5 users x 2 sides x SNORLAX / SHUCKLE + CHANSEY
// both sides), production live renderer vs two fresh direct-mGBA probes, 104 / 104 rows 0 px, r1 == r2, the ROM's RAM y2 recorded.
type Window = { fixture: string; attacker: string; side: "player" | "opponent"; target: string; rows: number; exactRows: number; px: number;
  r1EqR2: boolean; rowsActivationFraming: number; leadRows: number; romY2: number[]; H: number };
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/fix74-live-receipt.json", "utf8")) as { bulkUp: { windows: Window[] } };
const FIXTURES = "tools/integration/fixtures/fix74/fixtures";
const coords = monPicCoords as unknown as Record<"back" | "front", Record<string, { yOffset: number }>>;

describe("fix74: Bulk Up 339 across the Factory Bulk Up users", () => {
  it("covers every Factory user on both sides against two targets (+ CHANSEY), all exact twice fresh", () => {
    const windows = receipt.bulkUp.windows;
    for (const user of ["PRIMEAPE", "SLAKING", "HERACROSS", "MACHAMP", "URSARING"]) {
      for (const side of ["player", "opponent"]) {
        expect(windows.filter((w) => w.attacker === user && w.side === side).map((w) => w.target).sort()).toEqual(["SHUCKLE", "SNORLAX"]);
      }
    }
    expect(windows.filter((w) => w.attacker === "CHANSEY").map((w) => w.side).sort()).toEqual(["opponent", "player"]);
    for (const w of windows) {
      expect([w.fixture, w.rows, w.exactRows, w.px, w.r1EqR2]).toEqual([w.fixture, 104, 104, 0, true]);
      // The ROM body (activation .. first inactive) is 108 rows for every species: the accepted window starts 4 rows after activation.
      expect([w.rowsActivationFraming, w.leadRows]).toEqual([108, 4]);
    }
  });

  for (const name of readdirSync(FIXTURES).filter((n) => n.endsWith(".json")).map((n) => n.slice(0, -5)).sort()) {
    it(`${name}: production's duration and per-frame y2 are the source's`, () => {
      const f = JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, "utf8")) as Fixture;
      const w = receipt.bulkUp.windows.find((x) => x.fixture === name)!;
      const view = liveView(f, 0);
      const e = view.effect!;
      if (e.type !== "move") throw new Error("expected a move effect");
      expect(e.request.moveId).toBe(339);
      expect(liveMoveAnimationDuration(e.request, view.field)).toBe(104);
      const state = liveMoveAnimationPresentation(e.request, view.field, 0, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
        e.presentationRng, e.battlerX2Input)!;
      const config = state.config as { move: string; battlerHeight: number; breathOrigin: { x: number; y: number } };
      expect(config.move).toBe("BULK_UP");
      const side = f.attacker.geometry.side as "player" | "opponent";
      const yOffset = coords[side === "player" ? "back" : "front"][f.attacker.species]!.yOffset;
      expect(config.battlerHeight).toBe(64 - 2 * yOffset);
      expect(config.battlerHeight).toBe(w.H);
      // SetBattlerSpriteYOffsetFromYScale every GrowAndShrink frame == the ROM's RAM gSprites[attacker].y2 (bulkUpProbe rows 0..47).
      expect(Array.from({ length: 48 }, (_, age) => growAndShrinkY2AtAge(age, config.battlerHeight) + 0)).toEqual(w.romY2);
      expect(config.breathOrigin).toEqual(liveBattlerAnchors(side, createBattleCommandFieldArtView(view.field)).picOffsetPoint);
    });
  }
});
