import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveOpponentShadowRow,
} from "../src/engine/liveMoveAnimation.ts";
import { liveView } from "../tools/integration/liveAdapterFramebuffer.ts";

// ISSUES #142: SpriteCB_EnemyShadow (battle_gfx_sfx_util.c:1203) leaves an elevated opponent's shadow visible on the
// ROM frame where the move script activates; the table pins which live row that is (or none).
const rows = [
  ...JSON.parse(readFileSync("tools/integration/fixtures/issue142-shadow-rows.json", "utf8")).rows,
  ...JSON.parse(readFileSync("tools/integration/fixtures/issue142-shadow-rows-extra.json", "utf8")).rows,
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
const render = (r: (typeof rows)[number], opponent: string, age: number): number => {
  const fixture = {
    move: r.move, body: r.sources?.body ?? "normal", probe: "", scenario: "", requestFields: r.requestFields,
    attacker: { species: r.orientation === "player" ? "PHANPY" : opponent, geometry: { side: r.orientation } },
    target: { species: r.orientation === "player" ? opponent : "PHANPY", geometry: { side: r.orientation === "player" ? "opponent" : "player" } },
    fieldProfile: { playerHp: 120, playerMaxHp: 120, opponentHp: 120, opponentMaxHp: 120, playerGender: "male", opponentGender: "male" },
  };
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, liveView(fixture as never, age));
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

  // Public live render path: elevated GOLBAT target (player attacker) and attacker (opponent attacker).
  const sample = [34, 5, 115, 280, 101, 2, 163, 44, 92, 93, 347, 158, 207, 339, 76, 236];
  for (const id of sample) {
    for (const orientation of ["player", "opponent"] as const) {
      it(`id ${id} ${orientation}: shadow on row 0 iff the activation frame is in the window`, () => {
        const r = rows.find((x) => x.id === id && x.orientation === orientation)!;
        const expected = LIVE_MOVE_OPPONENT_SHADOW_ROW[id] === 0;
        expect(shadowPixels(new Uint8Array(240 * 160 * 4))).toBe(0);
        expect(render(r, "GOLBAT", 0) === 200).toBe(expected);
        // A non-elevated opponent never gets the shadow mask drawn by the hook.
        expect(render(r, "ONIX", 0)).toBeLessThan(200);
      });
    }
  }
});
