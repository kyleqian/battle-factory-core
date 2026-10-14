import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { battleCommandFieldArtElevation, battleCommandTransformPalette, createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import type { BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";
import { battleResolutionFieldBeforeCommand } from "../src/engine/battleResolutionPresentationRender.ts";
import { liveBattlerAnchors, liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import {
  LIVE_TRANSFORM_ROWS, liveTransformDeclineReason, liveTransformMosaicLevel, liveTransformOf, withLiveTransform,
} from "../src/engine/liveTransform.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// trf174 (docs/trf174-transform-live.md): the live Move_TRANSFORM body and the transformed field.
const FIXTURES = "tools/integration/fixtures/trf174";
const rom = JSON.parse(readFileSync(`${FIXTURES}/rom-rows.json`, "utf8")) as { windows: Record<string, { fixture: string; rows: string[] }> };
const fixture = (name: string) => JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, "utf8")) as Fixture;
const SLOWBRO = 80, GOLBAT = 42, SPINDA = 308;

describe("trf174 live Transform", () => {
  it("renders every ROM row of the 8 probed windows (ON / OFF x player / opponent DITTO x SLOWBRO / elevated GOLBAT) exactly", () => {
    expect(Object.keys(rom.windows)).toHaveLength(8);
    for (const [name, window] of Object.entries(rom.windows)) {
      const f = fixture(name);
      expect(window.rows).toHaveLength(LIVE_TRANSFORM_ROWS);
      const view0 = liveView(f, 0);
      expect(view0.effect?.type === "move" && liveMoveAnimationDuration(view0.effect.request, view0.field)).toBe(LIVE_TRANSFORM_ROWS);
      window.rows.forEach((sha, age) => {
        const rgba = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(rgba, liveView(f, age));
        const rgb = new Uint8Array(240 * 160 * 3);
        for (let p = 0; p < 240 * 160; p++) rgb.set(rgba.subarray(p * 4, p * 4 + 3), p * 3);
        expect(createHash("sha256").update(rgb).digest("hex"), `${name} age ${age}`).toBe(sha);
      });
    }
  });

  it("mosaic law: RAM steps on rows 3k + 3 / 52 + 3j shown one row later; the copied species from row 50", () => {
    const levels = Array.from({ length: LIVE_TRANSFORM_ROWS }, (_, age) => liveTransformMosaicLevel(age));
    expect(levels.slice(0, 7)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(levels.slice(7, 10)).toEqual([1, 1, 1]);
    expect(levels.slice(46, 53)).toEqual([14, 14, 14, 15, 15, 15, 15]);
    expect(levels.slice(53, 56)).toEqual([14, 14, 14]);
    expect(levels.slice(92, 96)).toEqual([1, 1, 1, 0]);
    expect(levels.slice(95).every((level) => level === 0)).toBe(true);
  });

  it("the field art shows the copied species: its picture, the 6/16 white-blended palette, its corner / elevation, the own idle rest", () => {
    const f = fixture("trf174-on-opponent-ditto-golbat");
    const field = withLiveTransform(liveView(f, 0).field, 1, { species: GOLBAT, personality: 0 });
    const art = createBattleCommandFieldArtView(field);
    const plain = createBattleCommandFieldArtView({ ...field, opponent: { ...field.opponent, species: GOLBAT, transform: undefined } });
    expect(art.opponent.speciesSymbol).toBe("GOLBAT");
    expect(art.opponent.restSpeciesSymbol).toBe("DITTO");
    expect(art.opponent.pic.tileset).toBe(plain.opponent.pic.tileset);
    expect(art.opponent.pic.palette).toEqual(battleCommandTransformPalette(plain.opponent.pic.palette));
    expect(art.opponent.pic.palette).not.toEqual(plain.opponent.pic.palette);
    expect(battleCommandFieldArtElevation(art.opponent, "opponent")).toBe(battleCommandFieldArtElevation(plain.opponent, "opponent"));
    // BlendPalette(.., 6, RGB_WHITE) per 5-bit channel: 0 -> 11, 31 -> 31, 16 -> 21.
    expect(battleCommandTransformPalette([{ r: 0, g: 255, b: 132 }])).toEqual([{ r: 90, g: 255, b: 173 }]);
    // An ONIX-copying DITTO keeps DITTO's rest (0), not ONIX's +1.
    const onix = createBattleCommandFieldArtView(withLiveTransform(field, 1, { species: 95, personality: 0 }));
    expect(liveBattlerAnchors("opponent", onix).frontIdleRest).toEqual({ x2: 0, y2: 0 });
  });

  it("a completed Transform body transforms its attacker in the display ledger; a switch-in reverts it", () => {
    const view = liveView(fixture("trf174-on-player-ditto-slowbro"), 0);
    const request = view.effect!.type === "move" ? view.effect.request : null;
    const body = { type: "move-animation", animation: request!, eventSequence: 1, battler: 0, timing: {} } as unknown as BattleResolutionPresentationCommand;
    const incoming = { ...view.field.player, species: 67 };
    const switchIn = { type: "switch-in", battler: 0, incoming } as unknown as BattleResolutionPresentationCommand;
    const after = battleResolutionFieldBeforeCommand(view.field, [body, switchIn, body], 1);
    expect(after.player.transform).toEqual({ species: SLOWBRO, personality: 0 });
    expect(after.opponent.transform).toBeUndefined();
    expect(battleResolutionFieldBeforeCommand(view.field, [body, switchIn, body], 2).player.transform).toBeUndefined();
    expect(liveTransformOf(request!, view.field)).toEqual({ species: SLOWBRO, personality: 0 });
  });

  it("declines outside the proven scope; every other live body declines while a battler is shown transformed", () => {
    const view = liveView(fixture("trf174-on-player-ditto-slowbro"), 0);
    const request = view.effect!.type === "move" ? view.effect.request : null;
    expect(liveTransformDeclineReason(request!, view.field)).toBeNull();
    expect(liveTransformDeclineReason(request!, { ...view.field, opponent: { ...view.field.opponent, species: SPINDA } })).toMatch(/SPINDA/);
    expect(liveTransformDeclineReason(request!, withLiveTransform(view.field, 1, { species: GOLBAT, personality: 0 }))).toMatch(/transformed/);
    // A shiny DITTO (FACTORY_OT_ID 416049562-relative personality) would copy the shiny palette.
    const shiny = (((416_049_562 >>> 16) ^ (416_049_562 & 0xffff)) << 16) >>> 0;
    expect(liveTransformDeclineReason(request!, { ...view.field, player: { ...view.field.player, personality: shiny } })).toMatch(/shiny/);
    expect(liveMoveAnimationDuration(request!, { ...view.field, player: { ...view.field.player, personality: shiny } })).toBeNull();
    const earthquake = { ...request!, moveId: 89 };
    expect(liveMoveAnimationDuration(earthquake, view.field)).not.toBeNull();
    expect(liveMoveAnimationDuration(earthquake, withLiveTransform(view.field, 0, { species: SLOWBRO, personality: 0 }))).toBeNull();
  });
});
