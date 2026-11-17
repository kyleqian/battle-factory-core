import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADP1_MOVE_BODY, approxScriptDuration } from "../src/animation/approxScript.ts";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { liveMoveAnimationDuration, liveMoveApproximateScriptReason } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// adp1 (docs/adp1-withdraw-rocksmash-beatup.md): the live Move_BEAT_UP body, every ROM row of the Scene ON windows.
const FIXTURES = "tools/integration/fixtures/adp1";
const rom = JSON.parse(readFileSync(`${FIXTURES}/rom-rows.json`, "utf8")) as { windows: Record<string, { fixture: string; rows: string[] }> };
const fixture = (name: string) => JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, "utf8")) as Fixture;

describe("adp1 Beat Up", () => {
  it("renders every ROM row of the player and opponent windows, hit 0 (Left) and hit 1 (Right) exactly", () => {
    for (const name of ["adp1-beat-up-player", "adp1-beat-up-opponent", "adp1-beat-up-player-b1", "adp1-beat-up-opponent-b1"]) {
      const window = rom.windows[name]!;
      const f = fixture(name);
      const view0 = liveView(f, 0);
      expect(view0.effect?.type === "move" && liveMoveAnimationDuration(view0.effect.request, view0.field)).toBe(window.rows.length);
      window.rows.forEach((sha, age) => {
        const rgba = new Uint8Array(240 * 160 * 4);
        renderBattleResolutionLiveView(rgba, liveView(f, age));
        const rgb = new Uint8Array(240 * 160 * 3);
        for (let p = 0; p < 240 * 160; p++) rgb.set(rgba.subarray(p * 4, p * 4 + 3), p * 3);
        expect(createHash("sha256").update(rgb).digest("hex"), `${name} age ${age}`).toBe(sha);
      });
    }
  });

  it("is 40 rows per hit (Left on even turns, Right on odd) and not an approximate class", () => {
    expect(approxScriptDuration(ADP1_MOVE_BODY[251]!)).toBe(40);
    expect(approxScriptDuration("BEAT_UP_RIGHT")).toBe(40);
    for (const name of ["adp1-beat-up-player", "adp1-beat-up-player-b1"]) {
      const request = (() => { const v = liveView(fixture(name), 0); return v.effect?.type === "move" ? v.effect.request : null; })();
      expect(liveMoveApproximateScriptReason(request!)).toBeNull();
    }
  });
});
