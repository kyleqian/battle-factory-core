/**
 * a13fix render identity: renders the production live view (tools/integration/liveAdapterFramebuffer.ts liveView) of each fixture at every
 * body age 0 .. duration (+2 tail rows) and prints one digest per fixture. Run on two src trees (the fix and its revert) to prove the fix is
 * render-neutral on previously-green windows: identical digests = identical framebuffers on every row, so their committed px receipts hold.
 *   node --experimental-strip-types --no-warnings tools/integration/a13fixRenderIdentity.ts fixture.json... > digests.tsv
 * Env passes through (POKEBENCH_LIVE_ORDER_INPUT=none for fixtures without an order input, as speciesAudit13Check.ts).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";

for (const path of process.argv.slice(2)) {
  const f = JSON.parse(readFileSync(path, "utf8")) as Fixture;
  let line: string;
  try {
    let orderNone = false;
    try { liveView(f, 0); } catch (e) { if (!String(e).includes("Sprite order unknown")) throw e; orderNone = true; }
    const view = (age: number) => {
      if (orderNone) process.env.POKEBENCH_LIVE_ORDER_INPUT = "none";
      try { return liveView(f, age); } finally { if (orderNone) delete process.env.POKEBENCH_LIVE_ORDER_INPUT; }
    };
    const v0 = view(0);
    const effect = v0.effect as { request: BattleMoveAnimationRequest } | null;
    const duration = effect ? liveMoveAnimationDuration(effect.request, v0.field) : 0;
    const digest = createHash("sha256");
    const rgba = new Uint8Array(240 * 160 * 4);
    for (let age = 0; age < duration; age++) { rgba.fill(0); renderBattleResolutionLiveView(rgba, view(age)); digest.update(rgba); }
    line = `${path}\t${effect ? "live" : "fallback"}\t${duration}\t${digest.digest("hex").slice(0, 32)}`;
  } catch (e) {
    line = `${path}\terror\t-\t${String(e).split("\n")[0]!.slice(0, 120)}`;
  }
  console.log(line);
}
