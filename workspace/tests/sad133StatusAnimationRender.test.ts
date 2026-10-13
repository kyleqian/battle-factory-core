// sad133 (S10A, ISSUES #168 slices SA6 / SA7 / SA8, docs/sad133-status-animation-render-2.md): CURSED / NIGHTMARE / CONFUSION / FRZ
// drawn on the live field from stp128's reducer (statusConditionAnimations.ts) through statusAnimation.ts liveStatusAnimationRow and
// battleScene.ts statusAnimationRenderView.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveStatusAnimationRow } from "../src/animation/statusAnimation.ts";
import { statusConditionDisplayRow, statusConditionSpan, statusConditionTarget } from "../src/animation/statusConditionAnimations.ts";
import { STATUS_ANIMATION_ADDED_ROWS } from "../src/engine/battleResolutionPresentation.ts";
import { STATUS_ANIMATIONS_DRAWN } from "../src/engine/battleResolutionPresentationRender.ts";
import { statusAnimationRenderView } from "../src/engine/battleScene.ts";
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE } from "../src/engine/liveBattlerX2History.ts";
import { sad133FreezeInflicted, sad133Window, sad133X2Zeroed, SAD133, STP128, type Sad133RomWindow } from "../tools/integration/sad133Windows.ts";

const SAD133_DRAWN = ["CURSED", "NIGHTMARE", "CONFUSION", "FRZ"] as const;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);
const rom = JSON.parse(readFileSync(`${STP128}/rom-windows.json`, "utf8")) as { windows: Record<string, Sad133RomWindow> };
const receipt = JSON.parse(readFileSync(`${SAD133}/production-compare.json`, "utf8"));
const controls = JSON.parse(readFileSync(`${SAD133}/controls.json`, "utf8"));
const SPRITE = { player: { x: 72, y: 86 }, opponent: { x: 176, y: 35 } } as const;

describe("sad133: the stp128 cases of liveStatusAnimationRow", () => {
  it("draws CURSED / NIGHTMARE / CONFUSION / FRZ (in STATUS_ANIMATIONS_DRAWN); without the battler geometry they stay undrawn", () => {
    for (const name of SAD133_DRAWN) {
      expect(STATUS_ANIMATIONS_DRAWN.has(name), name).toBe(true);
      expect(liveStatusAnimationRow(name, 10, "opponent"), name).toBeNull();
      expect(liveStatusAnimationRow(name, 10, "opponent", { sprite: SPRITE.opponent }), name).not.toBeNull();
    }
    // PSN / PRZ ignore the context
    expect(liveStatusAnimationRow("PSN", 30, "player", { sprite: SPRITE.player })).toEqual(liveStatusAnimationRow("PSN", 30, "player"));
    expect(liveStatusAnimationRow("PRZ", 12, "opponent", { sprite: SPRITE.opponent })).toEqual(liveStatusAnimationRow("PRZ", 12, "opponent"));
  });

  it("every row is the reducer's display row at rel = age (battler offset, sprite places, priority, blend; no re-fit)", () => {
    for (const name of SAD133_DRAWN) for (const side of ["player", "opponent"] as const) for (const inflicted of [false, true]) {
      const options = { freezeLoadLagRows: inflicted ? 0 as const : 1 as const };
      for (let age = 0; age < STATUS_ANIMATION_ADDED_ROWS[name]; age++) {
        const row = liveStatusAnimationRow(name, age, side, { sprite: SPRITE[side], inflicted })!;
        const d = statusConditionDisplayRow(name, age, statusConditionTarget(side, SPRITE[side].x, SPRITE[side].y, 0), options);
        const d1 = statusConditionDisplayRow(name, age, statusConditionTarget(side, SPRITE[side].x, SPRITE[side].y, 1), options);
        expect(row.battlerOffset, `${name} ${side} ${age}`).toEqual(d1.battlerOffset.x !== d.battlerOffset.x
          ? "rest" : { x2: d.battlerOffset.x, y2: d.battlerOffset.y });
        expect(row.paletteBlend).toBeNull();
        const want = d.sprites.flatMap((s) => s.template === "sFrozenIceCubeSpriteTemplate"
          ? (s.blend === null || s.blend.eva === 0 ? [] : [[-16, -16], [-16, 48], [48, -16], [48, 48]].map(([x, y]) => [s.left + x!, s.top + y!, false, s.blend]))
          : [[s.left, s.top, s.priority === 3, s.blend]]);
        expect(row.sprites.map((s) => [s.x, s.y, s.behindBattlers === true, s.blend ?? null]), `${name} ${side} ${age}`).toEqual(want);
      }
    }
  });

  it("schedules: ghost shake absolute from age 7 (ShakeMon2 2, 0, 14, 1) and 0 after, ducks behind on the far half, FRZ cube one row later on the frozen turn", () => {
    const x2 = (name: "CURSED" | "NIGHTMARE", age: number) => liveStatusAnimationRow(name, age, "opponent", { sprite: SPRITE.opponent })!.battlerOffset;
    expect([6, 7, 8, 9].map((a) => x2("CURSED", a))).toEqual(["rest", { x2: 2, y2: 0 }, { x2: -2, y2: 0 }, { x2: -2, y2: 0 }]);
    expect(x2("NIGHTMARE", 60)).toEqual({ x2: 0, y2: 0 });
    const ducks = (age: number) => liveStatusAnimationRow("CONFUSION", age, "player", { sprite: SPRITE.player })!.sprites;
    expect(ducks(4)).toEqual([]);
    expect(ducks(5).length).toBe(5);
    expect(ducks(5).some((s) => s.behindBattlers) && ducks(5).some((s) => !s.behindBattlers)).toBe(true);
    const cube = (age: number, inflicted: boolean) => liveStatusAnimationRow("FRZ", age, "player", { sprite: SPRITE.player, inflicted })!.sprites.length;
    const first = (inflicted: boolean) => Array.from({ length: 117 }, (_, a) => a).find((a) => cube(a, inflicted) > 0);
    expect(first(false)! - first(true)!).toBe(1);
    expect(statusConditionSpan("FRZ", { freezeLoadLagRows: 1 }).controllerRows).toBe(STATUS_ANIMATION_ADDED_ROWS.FRZ);
  });
});

describe("sad133: the production comparator receipt (34 stp128 ROM windows)", () => {
  it("34 / 34 windows 0 px on every command row (activation - 1 .. release), full screen; 31 / 34 on every row through release + 2", () => {
    const s = receipt.summary;
    expect([s.windows, s.zeroPxCommandRowWindows, s.zeroPxWindows]).toEqual([34, 34, 31]);
    expect(Object.keys(s.perAnimationSide).sort()).toEqual(SAD133_DRAWN.flatMap((n) => [`${n} opponent`, `${n} player`]).sort());
    for (const g of Object.values<any>(s.perAnimationSide)) expect(g.commandPx).toBe(0);
    // the residual: the 3 CONFUSION windows on the ONIX opponent (idle x2 1, kept by CONFUSION), only on the next message's rows
    const bad = Object.entries<any>(receipt).filter(([k, v]) => k !== "summary" && !v.zeroPx);
    expect(bad.map(([k]) => k).sort()).toEqual([0, 1, 2].map((i) => `stp128-confuse-ray-ply-primeape-onix#${i}`));
    for (const [, v] of bad) expect(v.perRowMismatches).toEqual([[100, 1091, 0], [101, 1091, 0]]);
  });

  it("controls fail exactly where their component is drawn", () => {
    const keys = Object.keys(rom.windows).sort();
    const of = (...names: string[]) => keys.filter((k) => names.includes(rom.windows[k]!.animation));
    expect(controls["age+1"].failingCommandRowWindows).toEqual(keys);
    expect(controls["wrong-side"].failingCommandRowWindows).toEqual(keys);
    expect(controls["no-shake"].failingCommandRowWindows).toEqual(of("CURSED", "NIGHTMARE"));
    expect(controls["no-ghost"].failingCommandRowWindows).toEqual(of("CURSED", "NIGHTMARE"));
    expect(controls["no-ducks"].failingCommandRowWindows).toEqual(of("CONFUSION"));
    expect(controls["no-cube"].failingCommandRowWindows).toEqual(of("FRZ"));
    expect(controls["lag-swap"].failingCommandRowWindows).toEqual(of("FRZ"));
  });

  // one window per animation x side (elevated GOLBAT / HAUNTER, both FRZ paths): every production frame == the 0 px receipt
  const PINNED = [
    "stp128-curse-ply-gengar-golbat#0", "stp128-curse-opp-gengar-onix#1", "stp128-nightmare-opp-haunter-shuckle#0",
    "stp128-nightmare-ply-gengar-golbat#2", "stp128-confuse-ray-ply-primeape-golbat#1", "stp128-confuse-ray-opp-primeape-onix#0",
    "stp128-ice-beam-ply-delcatty-shuckle#0", "stp128-ice-beam-opp-delcatty-shuckle#1",
  ];
  it.each(PINNED)("%s: every production frame sha256 == the 0 px receipt", (key) => {
    const w = rom.windows[key]!;
    const win = sad133Window(w, sad133X2Zeroed(w));
    const got = Array.from({ length: receipt[key].rows.compared }, (_, i) => sha(win.draw(win.viewAt(i - 1))));
    expect(got).toEqual(receipt[key].productionFrameSha);
    // the status-animation command's rows draw (the battler / sprites differ from the effect-less reference somewhere)
    expect(got.some((h, i) => h !== sha(win.reference(i - 1)))).toBe(true);
  });
});

describe("sad133: inputs", () => {
  it("FRZ inflicted (after the battler's status command) vs the frozen turn: the effect's `inflicted`", () => {
    const key = Object.keys(rom.windows).find((k) => rom.windows[k]!.animation === "FRZ" && sad133FreezeInflicted(rom.windows[k]!))!;
    const w = rom.windows[key]!;
    expect((sad133Window(w, []).viewAt(0).effect as any).inflicted).toBe(true);
    expect((sad133Window(w, [], { inflicted: false }).viewAt(0).effect as any).inflicted).toBeUndefined();
  });

  it("elevated GOLBAT under CURSED: shadow hidden ages 1 .. 74 and the next command's first row, shown at 0 and after", () => {
    const w = rom.windows["stp128-curse-ply-gengar-golbat#0"]!;
    const win = sad133Window(w, sad133X2Zeroed(w));
    const hidden = (a: number) => {
      const view = win.viewAt(a);
      return statusAnimationRenderView(view)?.view.postBodyShadowHidden ?? view.postBodyShadowHidden;
    };
    expect([0, 1, 74, 75, 76].map(hidden)).toEqual([false, true, true, true, false]);
  });

  it("x2 rows: CURSED / NIGHTMARE zero the side, CONFUSION / FRZ keep it; the ROM x2 after every window matches", () => {
    for (const name of SAD133_DRAWN) {
      const after = applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, { kind: "status-animation", side: "opponent", animation: name });
      expect(after.opponent, name).toBe(name === "CURSED" || name === "NIGHTMARE" ? "zeroed" : "idle");
    }
    for (const w of Object.values(rom.windows)) {
      const last = w.rows[w.rows.length - 1]!;
      // the target's x2 at release + 2: ShakeMon2's absolute 0 (ghosts), else its x2 before the window
      expect(last.bat[2], w.scenario).toBe(w.animation === "CURSED" || w.animation === "NIGHTMARE" ? 0 : w.rows[0]!.bat[2]);
      expect(last.other[2], w.scenario).toBe(w.rows[0]!.other[2]);
    }
  });
});
