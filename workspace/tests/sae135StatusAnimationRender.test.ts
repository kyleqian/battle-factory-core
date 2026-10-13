// sae135 (S10A, ISSUES #168 slice SA5, docs/sae135-status-animation-render-3.md): the Scene ON SLP / BRN / INFATUATION status animations
// drawn on the live field through the production renderer (statusAnimation.ts liveStatusAnimationRow -> stq132's reducer), pinned to the
// 37 stq132 ROM windows' 0 px production comparator receipt.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveStatusAnimationRow } from "../src/animation/statusAnimation.ts";
import { statusConditionTarget, statusParticleDisplayRow } from "../src/animation/statusConditionAnimations.ts";
import { STATUS_ANIMATIONS_DRAWN } from "../src/engine/battleResolutionPresentationRender.ts";
import { statusAnimationRenderView } from "../src/engine/battleScene.ts";
import { LIVE_BATTLER_X2_STATUS_ANIMATION } from "../src/engine/liveBattlerX2History.ts";
import { sae135RomWindows, sae135Window, SAE135 } from "../tools/integration/sae135Windows.ts";

const compare = JSON.parse(readFileSync(`${SAE135}/production-compare.json`, "utf8"));
const receipt = JSON.parse(readFileSync("tools/integration/fixtures/sae135-live-receipt.json", "utf8"));
const windows = sae135RomWindows();
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const SA5 = ["SLP", "BRN", "INFATUATION"] as const;

describe("sae135: SLP / BRN / INFATUATION rows (statusAnimation.ts liveStatusAnimationRow)", () => {
  it("the three are drawn (STATUS_ANIMATIONS_DRAWN), the battler stays at its rest (x2 keep), no palette blend", () => {
    for (const name of SA5) {
      expect(STATUS_ANIMATIONS_DRAWN.has(name), name).toBe(true);
      expect(LIVE_BATTLER_X2_STATUS_ANIMATION[name], name).toBe("keep");
      for (const age of [0, 10, 40, 96]) {
        const row = liveStatusAnimationRow(name, age, "player", { x: 72, y: 86 })!;
        expect(row.battlerOffset).toBe("rest");
        expect(row.paletteBlend).toBeNull();
      }
    }
  });
  it("each row is stq132's display row at rel = command age (letter Z affine, flames / hearts plain), back-to-front", () => {
    const at = { player: { x: 72, y: 86 }, opponent: { x: 176, y: 40 } } as const;
    for (const name of SA5) for (const side of ["player", "opponent"] as const) for (let age = 0; age <= 98; age++) {
      const row = liveStatusAnimationRow(name, age, side, at[side])!;
      const ref = statusParticleDisplayRow(name, age, statusConditionTarget(side, at[side].x, at[side].y));
      expect(row.sprites.map((s) => [s.x, s.y, s.affine ?? null]), `${name} ${side} ${age}`)
        .toEqual(ref.sprites.map((s) => [s.left, s.top, s.affine ?? null]));
    }
    // first shown rows: a sprite created on rel c shows from rel c + 2 (SLP 3 / 35, BRN 3 / 9 / 15, INFATUATION 3 / 20 / 37)
    const count = (name: (typeof SA5)[number], age: number) => liveStatusAnimationRow(name, age, "opponent", at.opponent)!.sprites.length;
    expect([4, 5, 36, 37].map((a) => count("SLP", a))).toEqual([0, 1, 1, 2]);
    expect([4, 5, 11, 17, 38, 39].map((a) => count("BRN", a))).toEqual([0, 1, 2, 3, 1, 0]);
    expect([4, 5, 22, 39].map((a) => count("INFATUATION", a))).toEqual([0, 1, 2, 3]);
    expect(liveStatusAnimationRow("SLP", 40, "player", at.player)!.sprites.every((s) => s.affine !== undefined)).toBe(true);
    expect(liveStatusAnimationRow("BRN", 20, "player", at.player)!.sprites.every((s) => s.affine === undefined)).toBe(true);
  });
});

describe("sae135: production frames == the ROM comparator receipt (37 stq132 windows)", () => {
  it("receipt: every command row 0 px on 37 / 37; the only px are the Onix-opponent next-command rows (ordinary-row idle rest)", () => {
    expect(compare.summary).toMatchObject({ neg: null, windows: 37 });
    const cover = new Set<string>();
    for (const [k, v] of Object.entries<any>(compare)) {
      if (k === "summary") continue;
      cover.add(`${v.animation}|${v.side}`);
      for (const [a, px] of v.perRowMismatches) {
        expect(a, k).toBeGreaterThanOrEqual(v.rows.last - 1); // the next command's rows only
        expect(px, k).toBe(1091);
        expect(v.romOpponentX2, k).toBe(1);
      }
    }
    expect([...cover].sort()).toEqual(SA5.flatMap((n) => [`${n}|opponent`, `${n}|player`]).sort());
    expect(receipt.productionCompare.commandRowsZeroPxWindows).toBe(37);
    expect(receipt.diagOrdinaryRest.zeroPxWindows).toBe(37);
    expect(receipt.redrawHarness.redrawExact).toBe(receipt.redrawHarness.redrawRows);
    for (const c of ["age+1", "wrong-side", "drop-one"]) expect(receipt.controls[c].zeroPxWindows, c).toBe(0);
    expect(receipt.controls["rest-y"].zeroPxWindows).toBe(37 - 8 - 6); // all 8 player SLP windows fail (+ the 6 residual windows)
  });
  it.each([
    "stq132-spore-opp-primeape-golbat#1", "stq132-spore-ply-primeape-golbat#2", "stq132-will-o-wisp-opp-primeape-onix#1",
    "stq132-fire-punch-ply-magby-wailmer#0", "stq132-attract-ply-primeape-golbat#0", "stq132-attract-opp-primeape-onix#1",
  ])("%s: every row's production frame sha256 is the receipt's; the command's rows draw", (key) => {
    const win = sae135Window(windows[key]!);
    const shas: string[] = [];
    let drawn = 0;
    for (let a = -1; a <= win.rows + 1; a++) {
      const fb = win.draw(win.viewAt(a));
      shas.push(sha(fb));
      if (a >= 0 && a < win.rows && sha(fb) !== sha(win.reference(a))) drawn++;
    }
    expect(shas).toEqual(compare[key].productionFrameSha);
    expect(drawn).toBeGreaterThan(win.animation === "BRN" ? 30 : 90);
  });
  it("the elevated Golbat opponent's shadow: shown at age 0, hidden from age 1 through the next command's first row", () => {
    for (const key of ["stq132-spore-ply-primeape-golbat#0", "stq132-will-o-wisp-ply-primeape-golbat#0", "stq132-attract-ply-primeape-golbat#0"]) {
      const win = sae135Window(windows[key]!);
      expect(statusAnimationRenderView(win.viewAt(0))!.view.postBodyShadowHidden, key).toBe(false);
      expect(statusAnimationRenderView(win.viewAt(1))!.view.postBodyShadowHidden, key).toBe(true);
      expect(statusAnimationRenderView(win.viewAt(win.rows - 1))!.view.postBodyShadowHidden, key).toBe(true);
      expect(win.viewAt(win.rows).postBodyShadowHidden, key).toBe(true);
      expect(win.viewAt(win.rows + 1).postBodyShadowHidden, key).toBe(false);
    }
  });
});

describe("sae135: x2 keep, routes and census receipts", () => {
  it("x2 kept through 13 / 13 ROM windows; 2 / 2 next live bodies at the predicted rest (0 px), the old unknown rule off", () => {
    expect(receipt.nextBodyX2).toEqual({ windows: 13, keptAfterWindow: 13, windowsWithNextBody: 2, predictedExact: 2, baseRectDiffers: 2 });
  });
  it("app routes base vs final: 6 / 6 OK, every differing frame inside a newly drawn command; census 0 changes", () => {
    expect(receipt.routes.allOk).toBe(true);
    for (const [k, v] of Object.entries<any>(receipt.routes)) if (k !== "allOk") expect(v.differing.unexplained, k).toBe(0);
    expect(receipt.census).toMatchObject({ keyMismatches: 0, frameChanges: 0, statusChanges: [], liveFrameChanges: 0, declineChanges: 0 });
  });
});
