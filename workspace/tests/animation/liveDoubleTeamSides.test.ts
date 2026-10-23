import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_OPPONENT_SHADOW_GAP_ROWS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
  liveMoveOpponentShadowReturn,
} from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";

// S10A sides: Double Team (104) OPPONENT attacker. Dense windows (activation + 1 .. + 230, the player-attacker convention: row -1) from fresh
// direct-mGBA prep22Probe runs of tools/battle-lab/s10aside-double-team-*.json: accepted pair GROVYLE -> ONIX, alternate DELCATTY -> GOLEM,
// elevated GOLBAT opponent attacker, and the player attacker ONIX against an elevated GOLBAT target (the #142 gap rows). Receipt:
// tools/integration/fixtures/sides-live-receipt.json (tools/integration/sidesLiveReceipt.ts, two invocations x two fresh runs, 0 px).
const DIR = "tools/integration/fixtures/s10a-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("double-team-") && n.endsWith(".json")).sort();
const fixtureAt = (n: string) => JSON.parse(readFileSync(`${DIR}/${n}`, "utf8")) as Fixture;
const RECEIPT = "tools/integration/fixtures/sides-live-receipt.json";
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
const render = (f: Fixture, age: number) => {
  const fb = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(fb, liveView(f, age));
  return fb;
};
const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });

describe("S10A sides: Double Team (104) opponent attacker", () => {
  it("is live for both attacker sides with the same 239-row window (230 + the tmr136 stats-change tail) and no #142 activation row", () => {
    for (const attacker of [0, 1] as const) {
      const req = { moveId: 104, attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 };
      // tmr136 (ISSUES #166): + 9 rows (rel 69..77 of the owned General_StatsChange; tools/integration/fixtures/tmr136-live-receipt.json).
      expect(liveMoveAnimationDuration(req as BattleMoveAnimationRequest)).toBe(239);
    }
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[104]).toBeUndefined();
  });

  it("re-shows an elevated opponent's shadow only on the script-end .. stat-unit gap rows 158..161", () => {
    expect(LIVE_MOVE_OPPONENT_SHADOW_GAP_ROWS[104]).toEqual([158, 161]);
    const req = { moveId: 104 } as BattleMoveAnimationRequest;
    expect([156, 157, 158, 161, 162, 229].map((a) => liveMoveOpponentShadowReturn(req, a))).toEqual([false, false, true, true, false, false]);
  });

  it("has the four dense fixtures (accepted pair, alternate pair, elevated attacker, elevated target) with 230-row windows", () => {
    expect(NAMES).toEqual([
      "double-team-alt-opponent-delcatty-player-golem.json", "double-team-alt-opponent-golbat-player-golem.json",
      "double-team-alt-player-onix-opponent-golbat.json", "double-team-opponent-grovyle-player-onix.json",
    ]);
    for (const n of NAMES) {
      const f = fixtureAt(n);
      expect(existsSync(f.scenario), n).toBe(true);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1, n).toBe(230);
      expect(f.attacker.geometry.side === "opponent" || n.includes("player-onix-opponent-golbat"), n).toBe(true);
    }
  });

  it("renders every age of the opponent-attacker windows through the live adapter (no fallback, no staged-pair throw)", () => {
    for (const n of NAMES) {
      const f = fixtureAt(n);
      for (let age = 0; age < 230; age += 1) {
        const view = liveView(f, age);
        const e = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never };
        expect(liveMoveAnimationPresentation(e.request, view.field, age, undefined, undefined, e.spriteOrderInput), `${n} ${age}`).not.toBeNull();
      }
    }
  });

  it("draws the elevated GOLBAT shadow on rows 158..161 in either role and never for a non-elevated opponent", () => {
    for (const n of ["double-team-alt-opponent-golbat-player-golem.json", "double-team-alt-player-onix-opponent-golbat.json"]) {
      const f = fixtureAt(n);
      for (const age of [0, 157, 162]) expect(shadowPixels(render(f, age)), `${n} ${age}`).toBeLessThan(200);
      for (const age of [158, 161]) expect(shadowPixels(render(f, age)), `${n} ${age}`).toBe(200);
    }
    expect(shadowPixels(render(fixtureAt("double-team-opponent-grovyle-player-onix.json"), 158))).toBeLessThan(200);
  });

  it("the receipt proves every window 0 px in two invocations x two fresh runs, plus the unchanged player-attacker fixture", () => {
    const receipt = JSON.parse(readFileSync(RECEIPT, "utf8"));
    expect(receipt.schema).toBe("sides-live-receipt/v2");
    const windows = receipt.windows.filter((w: { fixture: string }) => w.fixture.includes("double-team"));
    expect(windows.map((w: { fixture: string }) => w.fixture).sort()).toEqual(
      [...NAMES.map((n) => `${DIR}/${n}`), "tools/integration/fixtures/prep7-double-team-player.json"].sort());
    for (const w of windows) {
      expect(w.ok, w.fixture).toBe(true);
      expect(w.dirty, w.fixture).toBe(false);
      expect(w.documented, w.fixture).toBeUndefined();
      const runs = [...w.invocationA, ...w.invocationB];
      expect(runs).toHaveLength(4);
      for (const r of runs) expect(r, w.fixture).toMatchObject({ rows: 230, exactRows: 230, residualPixels: 0, expectedDuration: 230, digest: runs[0].digest });
    }
  });

  it("ordinary route seed 3014 / streak 14 (the opponent's first body is Double Team): live every age, ON/OFF rules / RNG / facility equal", () => {
    const on = generatedCommandAnimationReplay(3014, "on", [2], 14);
    const off = generatedCommandAnimationReplay(3014, "off", [2], 14);
    const body = on.animations.find((a) => a.moveId === 104 && a.attacker === 1);
    expect(body?.ages).toEqual(Array.from({ length: 244 }, (_, age) => age)); // tmr136: 230 + 9 rows; tl205: + the 5 script-tail rows
    expect(body?.adapterActive.every(Boolean)).toBe(true); // the tail rows hold the last body age (liveMoveUniversalRowAge), so the adapter stays active
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(on.boundaries.length).toBeGreaterThan(0);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
  }, 240000);
});
