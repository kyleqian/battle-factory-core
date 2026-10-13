// sar131 (S10A, ISSUES #168 slice SA4, docs/sar131-status-animation-render.md): the Scene ON PSN / PRZ status animations drawn on the
// live field through the production renderer, and the source-derived x2 rows of all nine B_ANIM_STATUS_*.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveStatusAnimationRow } from "../src/animation/statusAnimation.ts";
import {
  applyLiveBattlerX2Event, liveBattlerX2EventsOf, LIVE_BATTLER_X2_IDLE, LIVE_BATTLER_X2_STATUS_ANIMATION,
} from "../src/engine/liveBattlerX2History.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../src/engine/battleResolutionPresentation.ts";
import { STATUS_ANIMATIONS_DRAWN } from "../src/engine/battleResolutionPresentationRender.ts";
import { statusAnimationRenderView } from "../src/engine/battleScene.ts";
import { sar131Window, SAR131 } from "../tools/integration/sar131Windows.ts";
import { sar131HistoryBefore } from "../tools/integration/sar131History.ts";

const rom = JSON.parse(readFileSync(`${SAR131}/receipts/rom-r1.json`, "utf8"));
const compare = JSON.parse(readFileSync(`${SAR131}/production-compare.json`, "utf8"));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);

describe("sar131: PSN / PRZ rows (statusAnimation.ts liveStatusAnimationRow)", () => {
  it("draws PSN and PRZ (and exactly STATUS_ANIMATIONS_DRAWN); every other B_ANIM_STATUS_* leaves the field as it is", () => {
    for (const name of Object.keys(STATUS_ANIMATION_ADDED_ROWS)) {
      // sad133 / sae135: the reducer cases need the battler sprite's x / y (statusAnimationRenderView passes it)
      const drawn = liveStatusAnimationRow(name, 10, "opponent", { sprite: { x: 176, y: 40 } }) !== null;
      if (name === "PSN" || name === "PRZ") expect(drawn, name).toBe(true);
      expect(STATUS_ANIMATIONS_DRAWN.has(name), name).toBe(drawn);
    }
  });
  it("PSN: ShakeMon2 (1, 0, 18, 2) shown from age 2, ends x2 0 at age 55; blend 0 -> 12 -> 0 in steps of 2 every 4 rows", () => {
    const x2 = (a: number) => { const o = liveStatusAnimationRow("PSN", a, "player")!.battlerOffset; return o === "rest" ? "rest" : o.x2; };
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 54, 55, 70].map(x2)).toEqual(["rest", "rest", 1, 1, -1, -1, -1, 1, 1, -1, 0, 0]);
    const coeff = (a: number) => liveStatusAnimationRow("PSN", a, "player")!.paletteBlend?.coeff ?? 0;
    expect([5, 6, 10, 25, 26, 35, 36, 55, 56, 70].map(coeff)).toEqual([0, 2, 4, 10, 12, 12, 10, 2, 0, 0]);
    expect(liveStatusAnimationRow("PSN", 30, "opponent")!.sprites).toEqual([]);
  });
  it("PRZ: ShakeMon2 (1, 0, 10, 1) shown from age 5, ends x2 0 at age 24; 8 ElectricityEffect sparks, 6 rows each, every 4 rows, mirrored by side", () => {
    const x2 = (a: number) => { const o = liveStatusAnimationRow("PRZ", a, "opponent")!.battlerOffset; return o === "rest" ? "rest" : o.x2; };
    expect([4, 5, 6, 7, 8, 23, 24].map(x2)).toEqual(["rest", 1, -1, -1, 1, -1, 0]);
    const sparks = (a: number, side: "player" | "opponent") => liveStatusAnimationRow("PRZ", a, side)!.sprites.map((s) => [s.x, s.y]);
    expect(sparks(4, "opponent")).toEqual([]);
    expect(sparks(5, "opponent")).toEqual([[176 - 5 - 8, 40 - 8]]);
    expect(sparks(5, "player")).toEqual([[72 + 5 - 8, 80 - 8]]);
    expect(sparks(9, "opponent")).toEqual([[163, 32], [176 + 5 - 8, 40 + 10 - 8]]);
    expect(sparks(38, "player")).toEqual([[72 - 20 - 8, 80 + 15 - 8]]);
    expect(sparks(39, "player")).toEqual([]);
  });
});

describe("sar131: production frames == the ROM comparator's 0 px receipt (17 / 17 windows)", () => {
  it("receipt: 17 / 17 windows 0 px, both animations x both sides, every row activation-1 .. release+2", () => {
    expect(compare.summary).toMatchObject({ neg: null, windows: 17, zeroPxWindows: 17 });
    const cover = new Set<string>();
    for (const [k, v] of Object.entries<any>(compare)) if (k !== "summary") { expect(v.zeroPx, k).toBe(true); cover.add(`${v.animation}|${v.side}`); }
    expect([...cover].sort()).toEqual(["PRZ|opponent", "PRZ|player", "PSN|opponent", "PSN|player"]);
  });
  it.each([
    ["sta123-toxic-ply-primeape-onix", 309], ["sta123-toxic-ply-primeape-onix", 721], ["sta123-toxic-opp-primeape-onix", 718],
    ["sar131-toxic-ply-primeape-ledian", 309], ["sar131-thunder-wave-ply-primeape-golbat", 204], ["sta123-thunder-wave-opp-primeape-snorlax", 1752],
  ] as const)("%s window %i: every row's production frame sha256 is the receipt's; the command's rows draw", (stem, R) => {
    const scen = rom[stem];
    const w = scen.windows.find((x: any) => x.R === R);
    const h = sar131HistoryBefore(scen, w.R);
    const win = sar131Window(stem, w, (["player", "opponent"] as const).filter((s) => h[s] === "zeroed"));
    const shas: string[] = [];
    let drawn = 0;
    for (let a = -1; a <= win.rows + 1; a++) {
      const fb = win.draw(win.viewAt(a));
      shas.push(sha(fb));
      if (a >= 2 && a < win.rows && sha(fb) !== sha(win.reference(a))) drawn++;
    }
    expect(shas).toEqual(compare[`${stem}-${R}`].productionFrameSha);
    expect(drawn).toBeGreaterThan(win.animation === "PSN" ? 50 : 30);
  });
  it("an elevated opponent's shadow: shown at age 0, hidden from age 1 through the next command's first row", () => {
    const scen = rom["sar131-toxic-ply-primeape-ledian"];
    const w = scen.windows[0];
    const win = sar131Window("sar131-toxic-ply-primeape-ledian", w, []);
    expect(win.viewAt(0).effect?.type).toBe("status-animation");
    expect(statusAnimationRenderView(win.viewAt(0))!.view.postBodyShadowHidden).toBe(false);
    expect(statusAnimationRenderView(win.viewAt(1))!.view.postBodyShadowHidden).toBe(true);
    expect(win.viewAt(win.rows).postBodyShadowHidden).toBe(true);
    expect(win.viewAt(win.rows + 1).postBodyShadowHidden).toBe(false);
  });
  it("over the doll or for an undrawn animation: no status-animation view (the field as it is)", () => {
    const w = rom["sta123-toxic-ply-primeape-onix"].windows[0];
    // sae135: BRN is drawn now; an animation name without a liveStatusAnimationRow case stands in for "undrawn".
    const view = sar131Window("sta123-toxic-ply-primeape-onix", w, []).viewAt(5);
    expect(statusAnimationRenderView({ ...view, effect: { ...(view.effect as never as object), animation: "WRAPPED" } } as never)).toBeNull();
    const doll = { ...view, field: { ...view.field, opponent: { ...view.field.opponent, substituteDoll: true } } };
    expect(statusAnimationRenderView(doll as never)).toBeNull();
  });
});

describe("sar131: source-derived x2 rows of the nine B_ANIM_STATUS_* (liveBattlerX2History.ts)", () => {
  it("ShakeMon2 scripts zero their battler (PSN / PRZ attacker = CURSED / NIGHTMARE target = the battler); sprite-only and FRZ keep", () => {
    expect(LIVE_BATTLER_X2_STATUS_ANIMATION).toEqual({
      PSN: "zeroed", PRZ: "zeroed", CURSED: "zeroed", NIGHTMARE: "zeroed",
      BRN: "keep", SLP: "keep", INFATUATION: "keep", CONFUSION: "keep", FRZ: "keep",
    });
    const idleOpp = { player: "zeroed", opponent: "idle" } as const;
    for (const [animation, cls] of Object.entries(LIVE_BATTLER_X2_STATUS_ANIMATION)) {
      const next = applyLiveBattlerX2Event(idleOpp, { kind: "status-animation", side: "opponent", animation });
      expect(next.opponent, animation).toBe(cls === "zeroed" ? "zeroed" : "idle");
      expect(next.player).toBe("zeroed");
    }
    expect(applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, { kind: "status-animation", side: "player", animation: "WRAPPED" }).player).toBe("unknown");
    expect(applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, { kind: "status-animation", side: "player", animation: null }).player).toBe("unknown");
  });
  it("maps every kernel status-animation receipt through InitAndLaunchChosenStatusAnimation's pick", () => {
    const ev = (battler: number, isStatus2: number, status: number) => liveBattlerX2EventsOf({
      sequence: 1, payload: { kind: "status-animation", battler, isStatus2, status },
    } as never);
    expect(ev(1, 0, 0x8)).toEqual([{ kind: "status-animation", side: "opponent", animation: "PSN" }]);
    expect(ev(0, 0, 0x80)).toEqual([{ kind: "status-animation", side: "player", animation: "PSN" }]);
    expect(ev(0, 0, 0x40)).toEqual([{ kind: "status-animation", side: "player", animation: "PRZ" }]);
    expect(ev(1, 0, 0x20)).toEqual([{ kind: "status-animation", side: "opponent", animation: "FRZ" }]);
    expect(ev(1, 1, 0x10000000)).toEqual([{ kind: "status-animation", side: "opponent", animation: "CURSED" }]);
    expect(ev(1, 1, 0x08000000)).toEqual([{ kind: "status-animation", side: "opponent", animation: "NIGHTMARE" }]);
    expect(ev(1, 1, 0x1)).toEqual([{ kind: "status-animation", side: "opponent", animation: "CONFUSION" }]);
  });
  it("the next live body after every PSN / PRZ ROM window starts at the predicted x2 (14 / 14, 0 px in its rect; base differs on 2)", () => {
    const nb = JSON.parse(readFileSync(`${SAR131}/next-body-x2.json`, "utf8"));
    expect(nb.summary).toEqual({ windowsWithNextBody: 14, predictedExact: 14, baseRectDiffers: 2 });
    const sides = new Set(Object.entries<any>(nb).filter(([k]) => k !== "summary").map(([, v]) => v.side));
    expect([...sides].sort()).toEqual(["opponent", "player"]);
  });
});
