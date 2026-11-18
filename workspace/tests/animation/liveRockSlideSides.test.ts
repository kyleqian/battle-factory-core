import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";

// S10A sides: Rock Slide (157) PLAYER attacker. Dense windows (activation .. first inactive script row, 138 rows, row 0) from fresh
// direct-mGBA prep22Probe runs of tools/battle-lab/s10aside-rock-slide-*.json: accepted-style ONIX -> GROVYLE, alternate GOLEM -> DELCATTY
// and ONIX -> elevated GOLBAT target (the #142 row-0 hook). Receipt: tools/integration/fixtures/sides-live-receipt.json.
const DIR = "tools/integration/fixtures/s10a-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("rock-slide-") && n.endsWith(".json")).sort();
const fixtureAt = (n: string) => JSON.parse(readFileSync(`${DIR}/${n}`, "utf8")) as Fixture;
const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });

describe("S10A sides: Rock Slide (157) player attacker", () => {
  it("is live for both attacker sides with the same 138-row window and the #142 row 0", () => {
    for (const attacker of [0, 1] as const) {
      const req = { moveId: 157, attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration(req as BattleMoveAnimationRequest)).toBe(138);
    }
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[157]).toBe(0);
  });

  it("has the three player-attacker fixtures with 138-row windows starting at activation", () => {
    expect(NAMES).toEqual([
      "rock-slide-alt-player-golem-opponent-delcatty.json", "rock-slide-alt-player-onix-opponent-golbat.json",
      "rock-slide-player-onix-opponent-grovyle.json",
    ]);
    for (const n of NAMES) {
      const f = fixtureAt(n);
      expect(existsSync(f.scenario), n).toBe(true);
      expect(f.attacker.geometry.side, n).toBe("player");
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1, n).toBe(138);
    }
  });

  it("renders every age through the live adapter (no fallback, no staged-pair throw)", () => {
    for (const n of NAMES) {
      const f = fixtureAt(n);
      for (let age = 0; age < 138; age += 1) {
        const view = liveView(f, age);
        const e = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never };
        expect(liveMoveAnimationPresentation(e.request, view.field, age, undefined, undefined, e.spriteOrderInput), `${n} ${age}`).not.toBeNull();
      }
    }
  });

  it("the receipt proves every window 0 px in two invocations x two fresh runs, plus the unchanged opponent-attacker fixture", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/sides-live-receipt.json", "utf8"));
    const windows = receipt.windows.filter((w: { fixture: string }) => w.fixture.includes("rock-slide"));
    expect(windows.map((w: { fixture: string }) => w.fixture).sort()).toEqual(
      [...NAMES.map((n) => `${DIR}/${n}`), "tools/integration/fixtures/prep7-rock-slide-opponent.json"].sort());
    for (const w of windows) {
      expect(w.ok, w.fixture).toBe(true);
      expect(w.dirty, w.fixture).toBe(false);
      expect(w.documented, w.fixture).toBeUndefined();
      const runs = [...w.invocationA, ...w.invocationB];
      expect(runs).toHaveLength(4);
      for (const r of runs) expect(r, w.fixture).toMatchObject({ rows: 138, exactRows: 138, residualPixels: 0, expectedDuration: 138, digest: runs[0].digest });
    }
  });

  it("ordinary route seed 4 / streak 7 / slot 0: the player's Rock Slide (after the foe's Light Screen) live every age, ON/OFF rules / RNG / facility equal", () => {
    const on = generatedCommandAnimationReplay(4, "on", [0], 7);
    const off = generatedCommandAnimationReplay(4, "off", [0], 7);
    const body = on.animations.find((a) => a.moveId === 157 && a.attacker === 0);
    expect(body?.ages).toEqual(iu120Ages(157, 138)); // hpd8: + the 5-row script lead and the 6-row hit tail
    expect(body?.adapterActive.every(Boolean)).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
  }, 240000);
});
