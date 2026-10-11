import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveOpponentShadowRow, liveMoveAnimationDuration,
} from "../src/engine/liveMoveAnimation.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import { prepareLiveMoveSpriteAllocator } from "../src/engine/liveMoveSpriteAllocator.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

// ISSUES #142: SpriteCB_EnemyShadow (battle_gfx_sfx_util.c:1203) leaves an elevated opponent's shadow visible on the
// ROM frame where the move script activates; the table pins which live row that is (or none).
const rows = [
  ...JSON.parse(readFileSync("tools/integration/fixtures/issue142-shadow-rows.json", "utf8")).rows,
  ...JSON.parse(readFileSync("tools/integration/fixtures/issue142-shadow-rows-extra.json", "utf8")).rows,
  ...JSON.parse(readFileSync("tools/integration/fixtures/stl109-shadow-rows.json", "utf8")).rows,
] as { id: number; move: string; orientation: "player" | "opponent"; shadowRow: number; inWindow: boolean; sources?: { body?: string }; requestFields?: object }[];
const shadow = JSON.parse(readFileSync("src/assets/gen/battle-enemy-shadow.json", "utf8"));

const shadowPixels = (fb: Uint8Array): number => {
  const x0 = 176 - shadow.width / 2, y0 = 40 + 29 - shadow.height / 2;
  let n = 0;
  for (const p of shadow.mask as number[]) {
    const o = ((y0 + Math.floor(p / shadow.width)) * 240 + x0 + (p % shadow.width)) * 4;
    if (fb[o] === shadow.color.r && fb[o + 1] === shadow.color.g && fb[o + 2] === shadow.color.b) n++;
  }
  return n;
};
// Icy Wind / Blizzard are live only for pairs whose particle slot order is proven (liveMoveAnimation.ts provableEffectOrder).
const PAIR: Record<number, [string, string]> = { 196: ["SHUCKLE", "MAGNEMITE"], 59: ["SHUCKLE", "BUTTERFREE"], 237: ["UNOWN", "UNOWN"] };
const render = (r: (typeof rows)[number], opponent: string, age: number): number => {
  const mon = (name: string, side: "player" | "opponent") => ({
    species: speciesStats.species.find((x) => x.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 120, maxHP: 120, gender: "male" as const, status: "none" as const,
    side: side === "player" ? "player" as const : "trainer" as const, battler: side === "player" ? 0 as const : 1 as const,
    partyIndex: 0 as const, moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
  });
  const field = { player: mon(PAIR[r.id]?.[0] ?? "PHANPY", "player"), opponent: mon(opponent, "opponent") };
  const attacker = r.orientation === "player" ? 0 : 1;
  const request = {
    moveId: r.id, attacker, target: attacker === 0 ? 1 : 0, turn: r.sources?.body === "shattered-wall" ? 1 : 0,
    power: 0, damage: 0, friendship: 70, multihit: 0, ...r.requestFields,
  } as never;
  const hb = (m: typeof field.player) => ({ name: m.name, level: 50, gender: m.gender, status: m.status, hpFraction: 1, currentHp: 120, maxHp: 120 });
  const view = {
    field, fieldArt: createBattleCommandFieldArtView(field as never),
    healthboxes: { player: hb(field.player), opponent: hb(field.opponent) },
    message: { lines: ["X used", "Y!"], visibleCharacters: 99 },
    effect: {
      type: "move", request, age,
      spriteAllocatorInput: prepareLiveMoveSpriteAllocator(
        createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove, request).input,
    },
    visibility: { player: { sprite: true, healthbox: true }, opponent: { sprite: true, healthbox: true } },
    waitCursor: null, bottom: "message", confirmHandoff: null, switchIn: null, midBattleSwitchIn: null,
    switchOut: null, partySummary: null, midBattleSwitchFade: null, midBattleSwitchParticles: null, trainerSlide: null,
  };
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view as never);
  return shadowPixels(fb);
};

describe("live elevated-opponent shadow rows (#142)", () => {
  it("pins the constant against the supervisor table in both directions", () => {
    const fromTable = new Map<number, Set<number>>();
    for (const r of rows) {
      if (!r.inWindow) continue;
      (fromTable.get(r.id) ?? fromTable.set(r.id, new Set()).get(r.id)!).add(r.shadowRow);
    }
    for (const [id, set] of fromTable) {
      expect([...set]).toHaveLength(1);
      expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[id]).toBe([...set][0]);
    }
    for (const id of Object.keys(LIVE_MOVE_OPPONENT_SHADOW_ROW).map(Number)) expect(fromTable.has(id)).toBe(true);
    const covered = new Set(rows.map((r) => r.id));
    for (const id of LIVE_MOVE_ANIMATION_IDS) expect(covered.has(id)).toBe(true);
    expect(liveMoveOpponentShadowRow({ moveId: 34 } as never)).toBe(0);
    expect(liveMoveOpponentShadowRow({ moveId: 44 } as never)).toBeNull();
  });

  // Bind (H_BUFFER S1) is the first non-zero row: the activation frame is live age 2, so the shared hook arms on
  // age === row rather than age 0 (battleScene.ts renderBattleResolutionLiveView).
  it("id 20 opponent (Bind): the shadow is drawn on row 2 and not on rows 0/1/3", () => {
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[20]).toBe(2);
    const r = rows.find((x) => x.id === 20 && x.orientation === "opponent")!;
    expect(render(r, "GOLBAT", 2)).toBe(200);
    for (const age of [0, 1, 3]) expect(render(r, "GOLBAT", age)).toBeLessThan(200);
  });

  // Public live render path: elevated GOLBAT target (player attacker) and attacker (opponent attacker).
  const sample = [165, 57, 330, 196, 59, 252, 322, 34, 5, 115, 280, 101, 2, 163, 44, 92, 93, 347, 158, 207, 339, 76, 236, 212, 265, 111, 275, 35, 225, 296, 312, 266, 118, 187, 317, 219, 230, 256, 120, 282, 7, 244, 315];
  for (const id of sample) {
    for (const orientation of ["player", "opponent"] as const) {
      it(`id ${id} ${orientation}: shadow on row 0 iff the activation frame is in the window`, () => {
        const r = rows.find((x) => x.id === id && x.orientation === orientation)!;
        const expected = LIVE_MOVE_OPPONENT_SHADOW_ROW[id] === 0;
        expect(render(r, PAIR[id]?.[1] ?? "GOLBAT", 0) === 200).toBe(expected);
        // A non-elevated opponent never gets the shadow mask drawn by the hook.
        expect(render(r, "ONIX", 0)).toBeLessThan(200);
      });
    }
  }

  // End-of-body return (docs/live-species-audit-2.md 2.1): the shadow comes back on the last 2 rows of Light Screen / Future Sight.
  for (const id of [113, 248]) {
    it(`id ${id} player: shadow returns on the last two rows for an elevated opponent only`, () => {
      const r = rows.find((x) => x.id === id && x.orientation === "player")!;
      const duration = liveMoveAnimationDuration({ moveId: id, attacker: 0, target: 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0, ...r.requestFields } as never)!;
      expect(render(r, "GOLBAT", duration - 3)).toBeLessThan(200);
      for (const age of [duration - 2, duration - 1]) {
        expect(render(r, "GOLBAT", age)).toBe(200);
        expect(render(r, "ONIX", age)).toBeLessThan(200);
      }
    });
  }
});
