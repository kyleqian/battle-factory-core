// usage: node --experimental-strip-types --no-warnings tools/integration/words46RouteScan.ts [fromSeed] [toSeed]
// words46: find ordinary generated-rental routes (generatedCommandAnimationReplay, production presentation seam ticked as core.ts does) where a
// live consumer's order lend resolves through a RAIN_CONTINUES / words marker (presentation faithfulRandomHistory).
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import type { SpriteOrderDeferredLend } from "../../src/engine/spriteOrderEventTransform.ts";
import { createHash } from "node:crypto";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

export function words46Route(seed: number, scene: "on" | "off", slots: readonly (0 | 1 | 2 | 3)[], presentationSeed = 0x808db3eb, digests = false) {
  const fb = new Uint8Array(240 * 160 * 4);
  let session = createPresentationRngSession(presentationSeed);
  const flagged: { requestId: number; moveId: number; attacker: number; age: number; rain: boolean; hostPassed: boolean; digest?: string }[] = [];
  const run = generatedCommandAnimationReplay(seed, scene, slots, 0, true, true, (state) => {
    session = tickLiveMovePresentationRngSession(session, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]?.commands[r.commandIndex];
    if (command?.type !== "move-animation" || !command.animation) return;
    const view = createBattleResolutionPresentationRenderView(r, session.host);
    const e = view.effect;
    if (e?.type !== "move") return;
    const p = liveMoveAnimationPresentation(e.request, view.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng, e.battlerX2Input);
    if (!p?.faithfulRandomHistory) return;
    let d: SpriteOrderDeferredLend | undefined = r.liveMoveSpriteOrderInput?.deferred, rain = false;
    while (d) { if (d.generalAnimation === "RAIN_CONTINUES") rain = true; d = "deferred" in d.activation ? d.activation.deferred : undefined; }
    let digest: string | undefined;
    if (digests) { fb.fill(0); renderBattleResolutionLiveView(fb, view); digest = createHash("sha256").update(fb).digest("hex"); }
    flagged.push({ requestId: r.resolutionId.requestId, moveId: e.request.moveId, attacker: e.request.attacker, age: e.age, rain,
      hostPassed: e.presentationRng?.host === session.host && session.host !== null, ...(digest ? { digest } : {}) });
  });
  return { run, flagged, session };
}

if (process.argv[1]?.endsWith("words46RouteScan.ts")) {
  const from = Number(process.argv[2] ?? 0), to = Number(process.argv[3] ?? 40);
  for (let seed = from; seed <= to; seed += 1) for (const slot of [0, 1, 2, 3] as const) {
    try {
      const { flagged } = words46Route(seed, "on", [slot, slot, slot, slot, slot, slot, slot, slot]);
      const rain = flagged.filter((f) => f.rain);
      if (flagged.length) console.log(seed, slot, "flagged frames", flagged.length, "rain", rain.length, JSON.stringify([...new Set(flagged.map((f) => `${f.moveId}/${f.attacker}${f.rain ? "R" : ""}`))]));
    } catch (e) { /* stalled routes are skipped */ }
  }
}
