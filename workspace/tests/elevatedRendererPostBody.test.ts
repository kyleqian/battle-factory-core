import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import enemyElevations from "../src/data/gen/enemy-mon-elevations.json" with { type: "json" };
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import type { BattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import {
  LIVE_MOVE_OPPONENT_SHADOW_POST_BODY_HIDE_ROWS,
  liveMoveOpponentShadowPostBodyHideRows,
} from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// ISSUES #147 (docs/elevated-postbody-audit.md, docs/elevated-renderer-off-check.md): the ordinary resolution field draws an elevated
// opponent at origin.y - enemyMonElevation with the generated 32x8 shadow (colour 526b63 at x160-191 y65-72), like the command menu;
// the shadow hides while the sprite is invisible and on the post-body hide rows. ROM proof: elevatedPostbodyRun.sh / elevatedOffRun.sh
// (tools/integration/fixtures/elevated-renderer-receipt.json).
const FIXTURES = new URL("../tools/integration/fixtures/", import.meta.url);
const load = (path: string): Fixture => {
  const source = JSON.parse(readFileSync(new URL(path, FIXTURES), "utf8")) as Fixture;
  return source.sourceFixture
    ? { ...JSON.parse(readFileSync(source.sourceFixture, "utf8")), ...source }
    : source;
};
const ordinary = (path: string, extra: Partial<BattleResolutionPresentationRenderView> = {}) =>
  ({ ...liveView(load(path), 0), effect: null, ...extra }) as BattleResolutionPresentationRenderView;
const render = (view: BattleResolutionPresentationRenderView) => {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, view);
  return fb;
};
const shadowPixels = (fb: Uint8Array) => {
  let n = 0;
  for (let y = 65; y <= 72; y++) for (let x = 160; x <= 191; x++) {
    const p = (y * 240 + x) * 4;
    if (fb[p] === 0x52 && fb[p + 1] === 0x6b && fb[p + 2] === 0x63) n++;
  }
  return n;
};
const ELEVATED = [
  ["GOLBAT", "prep11-live/air-cutter-opponent-air-cutter-opponent-golbat-player-chansey.json"],
  ["BUTTERFREE", "prep11-live/whirlwind-opponent-whirlwind-opponent-butterfree-player-onix.json"],
  ["PIDGEOT", "species-audit/derived-elevpb/pidgeot-prep8-swift-opponent.json"],
] as const;
const ONIX = "prep11-live/foresight-player-foresight-player-machoke-opponent-onix.json";

describe("ordinary resolution field: elevated opponents (ISSUES #147)", () => {
  for (const [species, path] of ELEVATED) {
    it(`${species}: sprite at origin - elevation, shadow drawn while visible`, () => {
      const view = ordinary(path);
      expect(view.fieldArt.opponent.speciesSymbol).toBe(species);
      const elevation = (enemyElevations as Record<string, number>)[species]!;
      expect(elevation).toBeGreaterThan(0);
      expect(shadowPixels(render(view))).toBeGreaterThanOrEqual(100);
      // Without the shadow, the sprite equals the same pic drawn at origin - elevation under a non-elevated label.
      const lowered = {
        ...view,
        fieldArt: {
          ...view.fieldArt,
          opponent: {
            ...view.fieldArt.opponent,
            speciesSymbol: "ONIX",
            origin: { x: view.fieldArt.opponent.origin.x, y: view.fieldArt.opponent.origin.y - elevation },
          },
        },
      } as BattleResolutionPresentationRenderView;
      expect(Buffer.from(render({ ...view, postBodyShadowHidden: true })).equals(Buffer.from(render(lowered)))).toBe(true);
      // Post-body hide rows and invisible (blink / semi-invisible) rows draw no shadow.
      expect(shadowPixels(render({ ...view, postBodyShadowHidden: true }))).toBe(0);
      const hidden = {
        ...view,
        visibility: { ...view.visibility, opponent: { ...view.visibility.opponent, sprite: false } },
      } as BattleResolutionPresentationRenderView;
      expect(shadowPixels(render(hidden))).toBe(0);
    });
  }

  it("GOLBAT faint: the sink starts from the elevated origin and HP 0 hides the shadow (ROM elevated-faint frames 204-290)", () => {
    const view = ordinary(ELEVATED[0][1]);
    const fainted = { ...view, field: { ...view.field, opponent: { ...view.field.opponent, hp: 0 } } } as BattleResolutionPresentationRenderView;
    // IsBattlerSpritePresent: the sprite stays drawn, the shadow goes once HP is 0.
    expect(shadowPixels(render(fainted))).toBe(0);
    expect(Buffer.from(render(fainted)).equals(Buffer.from(render({ ...view, postBodyShadowHidden: true })))).toBe(true);
    const sink = (v: BattleResolutionPresentationRenderView, s: number) => render({
      ...v, effect: { type: "faint", battler: 1, healthboxVisible: true, sink: { type: "opponent-tile-rows", keptRows: 8 - s, y2: 8 * s } },
    } as BattleResolutionPresentationRenderView);
    const lowered = {
      ...fainted,
      fieldArt: { ...fainted.fieldArt, opponent: { ...fainted.fieldArt.opponent, speciesSymbol: "ONIX",
        origin: { x: fainted.fieldArt.opponent.origin.x, y: fainted.fieldArt.opponent.origin.y - 8 } } },
    } as BattleResolutionPresentationRenderView;
    for (let s = 1; s <= 7; s++) {
      expect(shadowPixels(sink(fainted, s))).toBe(0);
      expect(Buffer.from(sink(fainted, s)).equals(Buffer.from(sink(lowered, s))), `step ${s}`).toBe(true);
    }
  });

  it("ONIX (no elevation, no shadow) is byte-identical to the pre-#147 ordinary field", () => {
    const view = ordinary(ONIX);
    expect(view.fieldArt.opponent.speciesSymbol).toBe("ONIX");
    const fb = render(view);
    expect(shadowPixels(fb)).toBe(0);
    expect(Buffer.from(render({ ...view, postBodyShadowHidden: true })).equals(Buffer.from(fb))).toBe(true);
    // sha256 of the same frame rendered by master 4254d9708 (before the fix).
    expect(createHash("sha256").update(fb).digest("hex")).toBe("1222820d5014ed3cf36bb789cad71df7ebacf2ce159f12a5b3d9f26ca230ac35");
  });
});

describe("post-body shadow hide table (ISSUES #147) vs the ROM script-end table", () => {
  const table = JSON.parse(readFileSync(
    new URL("elevated-postbody/script-end-vs-window-table.json", FIXTURES), "utf8",
  )) as { rows: { fixture: string; move: string; attackerSide: "player" | "opponent"; d: number }[] };
  const MOVE_IDS: Record<string, number> = {
    ABSORB: 71, DRAGON_RAGE: 82, DREAM_EATER: 138, HORN_DRILL: 32, PSYBEAM: 60, RAZOR_WIND: 13, SING: 47, SKY_UPPERCUT: 327,
  };
  // The one measured disagreement: Sky Uppercut's Combusken variant ends on its script end (d = 0) while the Hitmonchan fixture
  // measures d = 1; the table follows the audit (+1).
  const VARIANT_EXCEPTIONS = new Set(["derived-golbat2b/sky-uppercut-player-sky-uppercut-alt-combusken.json"]);

  it("lists exactly the positive-d move/side pairs with their measured d", () => {
    expect(table.rows.length).toBe(214);
    const expected: Record<string, Record<number, number>> = { player: {}, opponent: {} };
    for (const row of table.rows.filter((r) => r.d > 0)) {
      const id = MOVE_IDS[row.move];
      expect(id, row.move).toBeDefined();
      expected[row.attackerSide]![id!] = row.d;
    }
    expect(LIVE_MOVE_OPPONENT_SHADOW_POST_BODY_HIDE_ROWS).toEqual(expected);
  });

  it("returns d for every measured row (0 for d <= 0 rows)", () => {
    for (const row of table.rows) {
      const id = MOVE_IDS[row.move];
      if (id === undefined) { expect(row.d, row.fixture).toBeLessThanOrEqual(0); continue; }
      if (VARIANT_EXCEPTIONS.has(row.fixture)) continue;
      const hide = liveMoveOpponentShadowPostBodyHideRows({
        moveId: id, attacker: row.attackerSide === "player" ? 0 : 1, target: row.attackerSide === "player" ? 1 : 0,
        turn: 0, power: 0, damage: 0, friendship: 0, multihit: 0,
      });
      expect(hide, row.fixture).toBe(Math.max(0, row.d));
    }
  });
});
