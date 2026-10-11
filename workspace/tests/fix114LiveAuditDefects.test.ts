// fix114 (docs/fix114-live-audit-defects.md): the three live-audit-25 defects (docs/aud110-live-audit-25.md), pinned at the state level
// through the production live path (liveMoveAnimationPresentation / renderBattleResolutionLiveView) and tied to the committed direct-mGBA
// receipt (tools/integration/fixtures/fix114-live-receipt.json: every aligned window of these pairs 0 px, r1 == r2).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import swaggerAsset from "../src/animation/assets/swagger.json" with { type: "json" };
import { growAndShrinkY2AtAge } from "../src/animation/swagger.ts";
import { sceneOnBattlerFrontIdleRest, sceneOnSwaggerView, sceneOnTauntView } from "../src/animation/sceneOnPresentation.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { drawSpriteSheetAffineRotate, renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import monPicCoords from "../src/data/gen/mon-pic-coords.json" with { type: "json" };
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

type Side = "player" | "opponent";
const W = 240, H = 160;
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/fix114-live-receipt.json", "utf8")) as {
  windows: ReadonlyArray<{ fixture: string; move: string; side: Side; species: string; arm: "head" | "base"; px: number; r1r2: boolean }>;
};

function displayed(player: string, opponent: string): BattleResolutionDisplayedField {
  const mon = (name: string) => ({ species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id,
    speciesSymbol: name, name, level: 50, hp: 100, maxHP: 100, gender: "male", status: "none" });
  return { player: mon(player), opponent: mon(opponent) } as unknown as BattleResolutionDisplayedField;
}

function request(moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest {
  return { moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 };
}

function render(moveId: number, attacker: 0 | 1, field: BattleResolutionDisplayedField, age: number): Uint8Array {
  const healthbox = (side: Side) => ({ name: field[side].name, level: 50, gender: "male", hpFraction: 1, status: "none",
    ...(side === "player" ? { currentHp: 100, maxHp: 100 } : {}) });
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field),
    healthboxes: { player: healthbox("player"), opponent: healthbox("opponent") },
    message: { lines: ["A MOVE!", ""], visibleCharacters: 99 },
    effect: { type: "move", request: request(moveId, attacker), age }, bottom: "message",
  } as unknown as BattleResolutionPresentationRenderView;
  const fb = new Uint8Array(W * H * 4);
  renderBattleResolutionLiveView(fb, view);
  return fb;
}

/** The receipt's aligned windows of one scenario (fixture prefix) for one move: all of them 0 px and r1 == r2 on the fixed tree. */
function receiptWindows(prefix: string, move: string, arm: "head" | "base" = "head") {
  return receipt.windows.filter(w => w.arm === arm && w.fixture.startsWith(prefix) && w.move === move);
}

describe("fix114 A: Taunt's anger marks are created at the TARGET's subpriority - 2 (in front of a player target)", () => {
  const anger = (swaggerAsset as unknown as { anger: { tileset: never; palette: never } }).anger;
  // Opponent Taunter -> a BIG (Steelix, back 64) and a SMALL (Diglett, back 32) player target, plus the aud110 Onix target.
  for (const [taunter, target, fixture] of [["MURKROW", "STEELIX", "pb-fix114-taunt-opp-198-208"],
    ["MIGHTYENA", "DIGLETT", "pb-fix114-taunt-opp-287-50"], ["GOLBAT", "ONIX", "pb-stg107-ply-95-42"]] as const) {
    it(`opponent ${taunter} -> player ${target} (${fixture}): every anger-mark pixel is on top of the frame`, () => {
      const field = displayed(target, taunter);
      let covered = 0, overPlayer = 0;
      const mismatches: string[] = [];
      for (let age = 1; age < 125; age += 2) {
        const state = liveMoveAnimationPresentation(request(269, 1), field, age)!;
        // The renderer draws the preceding reducer frame's marks (sprite callbacks run after the OAM transfer).
        const marks = sceneOnTauntView({ ...state, age: age - 1 }).angerMarks;
        if (marks.length === 0) continue;
        const layer = new Uint8Array(W * H * 4);
        for (const mark of marks) {
          const matrix = Math.trunc(0x10000 / mark.xScale);
          drawSpriteSheetAffineRotate(layer, anger.tileset, anger.palette, mark.x, mark.y, matrix, 0, 0, matrix, undefined, false);
        }
        const frame = render(269, 1, field, age);
        const corner = state.config.target.geometry.spriteCorner;
        for (let i = 0; i < W * H; i++) {
          if (layer[i * 4 + 3] === 0) continue;
          covered++;
          const x = i % W, y = Math.trunc(i / W);
          if (x >= corner.x && x < corner.x + 64 && y >= corner.y && y < corner.y + 64) overPlayer++;
          if (frame[i * 4] !== layer[i * 4] || frame[i * 4 + 1] !== layer[i * 4 + 1] || frame[i * 4 + 2] !== layer[i * 4 + 2]) {
            if (mismatches.length < 5) mismatches.push(`age ${age} (${x},${y})`);
          }
        }
      }
      expect(covered).toBeGreaterThan(0);
      expect(overPlayer).toBeGreaterThan(0);
      expect(mismatches).toEqual([]);
    });
  }

  it("the receipt's aligned Taunt windows of those pairs are 0 px, r1 == r2 (direct mGBA, lab seed 305420349)", () => {
    for (const prefix of ["pb-fix114-taunt-opp-198-208", "pb-fix114-taunt-opp-287-50", "pb-fix114-taunt-ply-198-208",
      "pb-fix114-taunt-ply-287-50", "pb-stg107-ply-95-42", "pb-aud110-taunt-opp-169-99", "pb-aud110-taunt-opp-95-42"]) {
      const windows = receiptWindows(prefix, "TAUNT");
      expect(windows.length, prefix).toBeGreaterThan(0);
      for (const w of windows) expect([w.fixture, w.px, w.r1r2]).toEqual([w.fixture, 0, true]);
    }
  });
});

describe("fix114 B: Harden draws an OPPONENT attacker at its species' front idle rest", () => {
  // ONIX and RATTATA are the only opponent species with a non-zero settled rest (x2 = 1).
  for (const [player, opponent] of [["STEELIX", "ONIX"], ["ALAKAZAM", "RATTATA"], ["HAUNTER", "ONIX"]] as const) {
    it(`opponent ${opponent} Harden: the attacker sits where the target ${opponent} of a player Harden sits (rest x2 1)`, () => {
      const field = displayed(player, opponent);
      const state = liveMoveAnimationPresentation(request(106, 1), field, 0)!;
      expect(state.config.attacker.geometry.side).toBe("opponent");
      expect(sceneOnBattlerFrontIdleRest(state.config.attacker)).toEqual({ x2: 1, y2: 0 });
      const corner = state.config.attacker.geometry.spriteCorner;
      // Ages 0 and 1 precede the grayscale / metallic shine: the opponent's OBJ box must equal the plain target draw.
      for (const age of [0, 1]) {
        const asAttacker = render(106, 1, field, age), asTarget = render(106, 0, field, age);
        let differ = 0, opaque = 0;
        for (let y = Math.max(0, corner.y); y < Math.min(H, corner.y + 64); y++) {
          for (let x = Math.max(0, corner.x - 2); x < Math.min(W, corner.x + 66); x++) {
            const i = (y * W + x) * 4;
            if (asAttacker[i] !== asTarget[i] || asAttacker[i + 1] !== asTarget[i + 1] || asAttacker[i + 2] !== asTarget[i + 2]) differ++;
            opaque++;
          }
        }
        expect(opaque).toBeGreaterThan(0);
        expect([age, differ]).toEqual([age, 0]);
      }
    });
  }

  it("the receipt's aligned Harden windows with an opponent ONIX / RATTATA are 0 px, r1 == r2", () => {
    for (const prefix of ["pb-fix114-harden-65-19", "pb-fix114-harden-208-95", "pb-aud110-harden-93-95"]) {
      const windows = receiptWindows(prefix, "HARDEN");
      expect(windows.filter(w => w.side === "opponent").length, prefix).toBeGreaterThan(0);
      for (const w of windows) expect([w.fixture, w.px, w.r1r2]).toEqual([w.fixture, 0, true]);
    }
  });
});

describe("fix114 C: Swagger's grow-and-shrink uses the attacker's own picture height (64 - 2 * yOffset)", () => {
  const coords = monPicCoords as unknown as Record<"front" | "back", Record<string, { yOffset: number }>>;
  const height = (side: Side, species: string) => 64 - 2 * coords[side === "player" ? "back" : "front"][species]!.yOffset;
  // A tall and a short picture on EACH side, the aud110 pairs and the Rattata pair the old 38 / 32 came from.
  const pairs: ReadonlyArray<[Side, string, string, number]> = [
    ["player", "STEELIX", "DIGLETT", 64], ["player", "WAILORD", "STEELIX", 20], ["player", "ALAKAZAM", "SNORLAX", 54],
    ["player", "RATTATA", "ONIX", 38], ["opponent", "STEELIX", "DIGLETT", 64], ["opponent", "DIGLETT", "STEELIX", 28],
    ["opponent", "CROBAT", "KINGLER", 64], ["opponent", "RATTATA", "ONIX", 32],
  ];
  for (const [side, attacker, target, expected] of pairs) {
    it(`${side} ${attacker} -> ${target}: battlerHeight ${expected} drives attackerY2`, () => {
      expect(height(side, attacker)).toBe(expected);
      const field = side === "player" ? displayed(attacker, target) : displayed(target, attacker);
      const state = liveMoveAnimationPresentation(request(207, side === "player" ? 0 : 1), field, 0)!;
      expect(state.config.move).toBe("SWAGGER");
      expect((state.config as { battlerHeight?: number }).battlerHeight).toBe(expected);
      for (const age of [10, 20, 40, 60, 90, 120]) {
        const view = sceneOnSwaggerView({ ...state, age });
        expect([age, view.attackerY2]).toEqual([age, growAndShrinkY2AtAge(age, expected)]);
      }
    });
  }

  it("the receipt's aligned Swagger windows (tall / short attacker on each side) are 0 px, r1 == r2", () => {
    for (const prefix of ["pb-fix114-swagger-ply-208-50", "pb-fix114-swagger-ply-314-208", "pb-fix114-swagger-opp-208-50",
      "pb-fix114-swagger-opp-50-208", "pb-aud110-swagger-ply-65-143", "pb-aud110-swagger-opp-169-99", "pb-aud110-swagger-ply-19-95",
      "pb-aud110-swagger-opp-19-95"]) {
      const windows = receiptWindows(prefix, "SWAGGER");
      expect(windows.length, prefix).toBeGreaterThan(0);
      for (const w of windows) expect([w.fixture, w.px, w.r1r2]).toEqual([w.fixture, 0, true]);
    }
  });
});
