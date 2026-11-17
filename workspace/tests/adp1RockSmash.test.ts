import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADP1_MOVE_BODY, approxScriptDuration } from "../src/animation/approxScript.ts";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { liveMoveAnimationDuration, liveMoveApproximateScriptReason } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// adp1 (docs/adp1-withdraw-rocksmash-beatup.md): the live Move_ROCK_SMASH body, every ROM row of the Scene ON windows.
const FIXTURES = "tools/integration/fixtures/adp1";
const rom = JSON.parse(readFileSync(`${FIXTURES}/rom-rows.json`, "utf8")) as { windows: Record<string, { fixture: string; rows: string[] }> };
const fixture = (name: string) => JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, "utf8")) as Fixture;

describe("adp1 Rock Smash", () => {
  it("renders every ROM row of the player and opponent windows exactly", () => {
    for (const name of ["adp1-rock-smash-player", "adp1-rock-smash-opponent"]) {
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

  it("is 78 rows (last body row 76) and not an approximate class", () => {
    expect(approxScriptDuration(ADP1_MOVE_BODY[249]!)).toBe(78);
    const request = (() => { const v = liveView(fixture("adp1-rock-smash-player"), 0); return v.effect?.type === "move" ? v.effect.request : null; })();
    expect(liveMoveApproximateScriptReason(request!)).toBeNull();
  });
});
