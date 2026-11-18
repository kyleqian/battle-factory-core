import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// S10A sides: Faint Attack (185) OPPONENT attacker. Dense windows (activation + 4 .. + 224, the player-attacker convention: row -4) from
// fresh direct-mGBA prep22Probe runs of tools/battle-lab/s10aside-faint-attack-*.json: accepted-style pair GROVYLE -> ONIX and the
// alternate elevated GOLBAT -> GOLEM 0 px; DELCATTY -> GOLEM only on the documented restore-fade tail rows 203..218 (its body is one
// frame shorter). Receipt: tools/integration/fixtures/sides-live-receipt.json (tools/integration/sidesLiveReceipt.ts).
const DIR = "tools/integration/fixtures/s10a-live";
const NAMES = readdirSync(DIR).filter((n) => n.startsWith("faint-attack-") && n.endsWith(".json")).sort();
const fixtureAt = (n: string) => JSON.parse(readFileSync(`${DIR}/${n}`, "utf8")) as Fixture;
const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });

describe("S10A sides: Faint Attack (185) opponent attacker", () => {
  it("is live for both attacker sides (fa185 faithful timing; liv2: 226-row player / 227-row opponent window = the ROM window + 1) and no #142 activation row", () => {
    for (const attacker of [0, 1] as const) {
      const req = { moveId: 185, attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 };
      expect(liveMoveAnimationDuration(req as BattleMoveAnimationRequest)).toBe(attacker === 0 ? 226 : 227);
    }
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[185]).toBeUndefined();
  });

  it("has the three opponent-attacker fixtures with 221-row windows starting 4 frames after activation", () => {
    expect(NAMES).toEqual([
      "faint-attack-alt-opponent-delcatty-player-golem.json", "faint-attack-alt-opponent-golbat-player-golem.json",
      "faint-attack-opponent-grovyle-player-onix.json",
    ]);
    for (const n of NAMES) {
      const f = fixtureAt(n);
      expect(existsSync(f.scenario), n).toBe(true);
      expect(f.attacker.geometry.side, n).toBe("opponent");
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1, n).toBe(221);
    }
  });

  it("renders every age through the live adapter (no fallback, no staged-pair throw)", () => {
    for (const n of NAMES) {
      const f = fixtureAt(n);
      for (let age = 0; age < 221; age += 1) {
        const view = liveView(f, age);
        const e = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput: never };
        expect(liveMoveAnimationPresentation(e.request, view.field, age, undefined, undefined, e.spriteOrderInput), `${n} ${age}`).not.toBeNull();
      }
    }
  });

  it("the receipt: accepted-style + alternate pair 0 px, the DELCATTY tail documented, the player fixture unchanged", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/sides-live-receipt.json", "utf8"));
    const windows = receipt.windows.filter((w: { fixture: string }) => w.fixture.includes("faint-attack"));
    expect(windows.map((w: { fixture: string }) => w.fixture).sort()).toEqual(
      [...NAMES.map((n) => `${DIR}/${n}`), "tools/integration/fixtures/prep6-faint-attack-player.json"].sort());
    for (const w of windows) {
      expect(w.ok, w.fixture).toBe(true);
      expect(w.dirty, w.fixture).toBe(false);
      const runs = [...w.invocationA, ...w.invocationB];
      expect(runs).toHaveLength(4);
      const documented = w.fixture.endsWith("faint-attack-alt-opponent-delcatty-player-golem.json");
      for (const r of runs) {
        expect(r.digest, w.fixture).toBe(runs[0].digest);
        expect(r.rows, w.fixture).toBe(221);
        expect(r.affectedAges, w.fixture).toEqual(documented ? Array.from({ length: 16 }, (_, i) => 203 + i) : []);
      }
    }
  });

  it("ordinary route seed 186 / streak 0 / slots [0,0,0]: the opponent's Faint Attack (3rd body) live every age, ON/OFF rules / RNG / facility equal", () => {
    const on = generatedCommandAnimationReplay(186, "on", [0, 0, 0], 0);
    const off = generatedCommandAnimationReplay(186, "off", [0, 0, 0], 0);
    const body = on.animations.find((a) => a.moveId === 185 && a.attacker === 1);
    expect(body?.ages).toEqual(iu120Ages(185, 227, "opponent"));
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
