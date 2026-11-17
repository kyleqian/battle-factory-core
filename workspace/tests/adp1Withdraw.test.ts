import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADP1_MOVE_BODY, WITHDRAW_TICKS, approxScriptDuration } from "../src/animation/approxScript.ts";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { liveMoveAnimationDuration, liveMoveApproximateScriptReason } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// adp1 (docs/adp1-withdraw-rocksmash-beatup.md): the live Move_WITHDRAW body, every ROM row of the Scene ON windows.
const FIXTURES = "tools/integration/fixtures/adp1";
const rom = JSON.parse(readFileSync(`${FIXTURES}/rom-rows.json`, "utf8")) as { windows: Record<string, { fixture: string; rows: string[] }> };
const fixture = (name: string) => JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, "utf8")) as Fixture;

describe("adp1 Withdraw", () => {
  it("renders every ROM row of the player and opponent windows exactly", () => {
    for (const name of ["adp1-withdraw-player", "adp1-withdraw-opponent"]) {
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

  it("the body is 75 task callbacks (1 + 22 + 30 + 22) plus the first inactive row, and not an approximate class", () => {
    expect(WITHDRAW_TICKS).toBe(75);
    expect(approxScriptDuration(ADP1_MOVE_BODY[110]!)).toBe(76);
    const view = liveView(fixture("adp1-withdraw-player"), 0);
    const request = view.effect?.type === "move" ? view.effect.request : null;
    expect(liveMoveApproximateScriptReason(request!)).toBeNull();
  });
});
