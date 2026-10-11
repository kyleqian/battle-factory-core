// scd112 (S10A, ISSUES #166 slice d, docs/scd112-stats-change-render.md): the `stats-change` command's General_StatsChange banner,
// drawn by production in both scenes. The per-row production frame hashes are the ones the dense ROM comparator
// (tools/integration/scd112ProductionCompare.ts, through renderBattleResolutionLiveView / renderBattleResolutionSceneOffView) measured
// at 0 px against direct-mGBA frames (tools/integration/fixtures/scd112-live-receipt.json).
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { scd112Window, SCD112_STAT101 } from "../tools/integration/scd112Windows.ts";
import { statsChangeRenderView } from "../src/engine/battleScene.ts";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import { statsChangeParams, statsChangeRow, statsChangeSpan } from "../src/animation/statsChange.ts";

const receipt = JSON.parse(readFileSync("tools/integration/fixtures/scd112-live-receipt.json", "utf8"));
const stat101 = JSON.parse(readFileSync(`${SCD112_STAT101}/receipts/stat-anim.json`, "utf8"));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const windowOf = (key: string) => {
  const scene = key.endsWith("-on") ? "on" as const : "off" as const;
  const scen = key.slice(0, -(scene.length + 1));
  const r = receipt.productionCompare[key];
  return { r, win: scd112Window(scen, scene, stat101, scene === "on" ? r.x2History.zeroed : null) };
};

describe("scd112 stats-change render (General_StatsChange banner, both scenes)", () => {
  it("the receipt: 19 / 20 windows 0 px through production (20 / 20 with the x2 tracker's Growl row corrected); controls fail", () => {
    expect(receipt.frameMapping).toBe("stats-change command age a == statsChangeRow rel a + 1");
    expect(receipt.productionCompare.summary).toMatchObject({ windows: 20, zeroPxWindows: 19 });
    expect(Object.keys(receipt.experiments["neg-age+1"].nonZeroWindows)).toHaveLength(20);
    expect(receipt.experiments["tracker-growl-zeroed"].summary.zeroPxWindows).toBe(20);
    expect(Object.keys(receipt.experiments["neg-no-rest"].nonZeroWindows)).toEqual(["stat101-memento-ply-primeape-onix-on"]);
    expect(receipt.experiments["neg-no-shadow"].summary.zeroPxWindows).toBe(9);
    const failing = Object.entries<any>(receipt.productionCompare).filter(([k, v]) => k !== "summary" && !v.zeroPx).map(([k]) => k);
    expect(failing).toEqual(["stat101-growl-ply-primeape-onix-on"]);
    expect(receipt.deltaCheck.spansEqualAddedRowsPlusOne).toBe(true);
    expect(receipt.deltaCheck.boundaryOutsideBoxZero).toBe(true);
    expect(receipt.routes.summary).toEqual({ routes: 8, ok: true });
  });

  // Player up (ONIX opponent at its idle rest x2 1, Scene ON), Memento ON (the mask at x2 1), the elevated GOLBAT (sharply, its
  // shadow), Icy Wind on the elevated GOLBAT (secondary), Screech OFF (sharply down, player), Cosmic Power OFF (multiple palette).
  it.each([
    "stat101-harden-ply-primeape-onix-on", "stat101-memento-ply-primeape-onix-on", "stat101-agility-opp-golbat-snorlax-on",
    "stat101-icy-wind-ply-primeape-golbat-on", "stat101-screech-opp-golbat-onix-off", "stat101-cosmic-power-ply-snorlax-golbat-off",
  ])("%s: every row's production frame == the comparator's 0 px receipt", (key) => {
    const { r, win } = windowOf(key);
    expect(r.zeroPx).toBe(true);
    const shas = r.productionFrameSha.map((_: string, i: number) => sha(win.draw(win.viewAtRel(i - 1))));
    expect(shas).toEqual(r.productionFrameSha);
    // The banner rows differ from the ordinary field, and the next command's first frame (rel E+2) is not the command's.
    const ordinary = sha(win.ordinary());
    const bannerRows = shas.filter((_: string, i: number) => statsChangeRow(win.params, i - 1).bannerVisible && i - 1 <= win.E + 1);
    expect(bannerRows.length).toBe(win.params.sharply ? 80 : 58);
    expect(bannerRows.every((s: string) => s !== ordinary)).toBe(true);
  });

  it("hides the elevated opponent's shadow on every command age, and only there", () => {
    const { win } = windowOf("stat101-agility-opp-golbat-snorlax-on");
    const span = statsChangeSpan(statsChangeParams(41)!);
    for (let age = 0; age < span.addedRows; age++) {
      expect(statsChangeRenderView(win.viewOf(1, age))!.view.postBodyShadowHidden).toBe(true);
    }
    const ordinary = win.ordinary(), age0 = win.draw(win.viewOf(1, 0)), next = win.draw(win.viewAtRel(win.E + 2));
    let shadowPx = 0, elsewhere = 0, nextShadowDiff = 0;
    for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) {
      const o = (y * 240 + x) * 4;
      const inShadow = x >= 160 && x < 192 && y >= 65 && y < 73;
      if (age0[o] !== ordinary[o] || age0[o + 1] !== ordinary[o + 1] || age0[o + 2] !== ordinary[o + 2]) {
        if (inShadow) shadowPx++; else elsewhere++;
      }
      if (inShadow && (next[o] !== ordinary[o] || next[o + 1] !== ordinary[o + 1] || next[o + 2] !== ordinary[o + 2])) nextShadowDiff++;
    }
    expect(shadowPx).toBe(200);
    expect(elsewhere).toBe(0);
    expect(nextShadowDiff).toBe(0);
  });

  it("masks with the displayed Castform form at the elevated corner, never over the doll or for an unplayable argument", () => {
    const mon = (b: 0 | 1, species: number, extra = {}) => Object.freeze({
      species, name: b === 0 ? "SNORLAX" : "CASTFORM", side: b === 0 ? "player" : "trainer", battler: b, partyIndex: 0, level: 50,
      hp: 100, maxHP: 100, gender: "male", status: "none", moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0, ...extra,
    });
    const stateOf = (opponentExtra: object, argument: number, forms: [number, number]) => {
      const field = { player: mon(0, 143), opponent: mon(1, 385, opponentExtra) };
      const commands = [{ type: "stats-change", eventSequence: 1, battler: 1, argument, timing: { minimumFrames: 76 } }];
      return createBattleResolutionPresentationRenderView({
        field, segments: [{ field, beforeRules: null, afterRules: null, events: [], commands }], segmentIndex: 0, commandIndex: 0,
        lifecycle: { phase: "presenting", phaseElapsed: 20 }, confirmHandoff: null, opponentTrainer: null,
        sourceDecision: { kind: "use-move" }, fadeTick: 0, liveCastformForms: forms,
      } as never);
    };
    const formed = stateOf({}, 22, [0, 2]);
    expect(formed.fieldArt.opponent.castformForm).toBe(2);
    const banner = statsChangeRenderView(formed)!.banner!;
    expect(banner.tileset).toBe(formed.fieldArt.opponent.pic.tileset);
    const normal = createBattleCommandFieldArtView({ player: mon(0, 143), opponent: mon(1, 385) } as never).opponent;
    expect(banner.tileset).not.toEqual(normal.pic.tileset);
    const corner = battleCommandFieldSpriteOrigin(formed.fieldArt.opponent, "opponent");
    expect(banner.corner).toEqual(corner);
    expect(corner.y).toBeLessThan(formed.fieldArt.opponent.origin.y);
    expect(stateOf({ substituteDoll: true }, 22, [0, 0]).effect).toBeNull();
    expect(statsChangeParams(70)).toBeNull();
    expect(statsChangeRenderView(stateOf({}, 70, [0, 0]))).toBeNull();
  });
});
