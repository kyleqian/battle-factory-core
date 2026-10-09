// usage: node --experimental-strip-types --no-warnings tools/integration/words57Route.ts scan [fromSeed] [toSeed]
//        node --experimental-strip-types --no-warnings tools/integration/words57Route.ts parity <seed> <slot> <out.json>
// words57 (docs/next-adapters-words57.md): ordinary generated-rental routes (generatedCommandAnimationReplay, the production presentation seam
// ticked as core.ts does; words46RouteScan.ts's harness) where a live consumer's order lend resolves through a words marker whose chain
// replayed a BATTLE unit (faint / summary / send-out / recall / forced switch-out / send-in). `parity` runs one such route under two
// presentation seeds and Scene ON / OFF: the decision boundaries, rules (the Scene-OFF hit-marker bit aside), gameplay RNG and facility
// state must be identical, and the flagged consumer frames (digests) identical between a fresh repeat of the same seed.
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import type { SpriteOrderDeferredLend } from "../../src/engine/spriteOrderEventTransform.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const BATTLE_UNITS = new Set(["faint", "party-summary-next", "party-summary-hide", "next-mon-send-out", "switch-out", "forced-switch-out",
  "switch-in-start", "switch-in-finish"]);

export function words57Route(seed: number, scene: "on" | "off", slots: readonly (0 | 1 | 2 | 3)[], presentationSeed = 0x808db3eb, digests = false) {
  const fb = new Uint8Array(240 * 160 * 4);
  let session = createPresentationRngSession(presentationSeed);
  const flagged: { requestId: number; moveId: number; attacker: number; age: number; battleUnits: string[]; digest?: string }[] = [];
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
    const units = new Set<string>();
    let d: SpriteOrderDeferredLend | undefined = r.liveMoveSpriteOrderInput?.deferred;
    while (d) {
      for (const u of d.units) if (BATTLE_UNITS.has(u.kind)) units.add(u.kind);
      d = "deferred" in d.activation ? d.activation.deferred : undefined;
    }
    let digest: string | undefined;
    if (digests) { fb.fill(0); renderBattleResolutionLiveView(fb, view); digest = createHash("sha256").update(fb).digest("hex"); }
    flagged.push({ requestId: r.resolutionId.requestId, moveId: e.request.moveId, attacker: e.request.attacker, age: e.age, battleUnits: [...units].sort(),
      ...(digest ? { digest } : {}) });
  });
  return { run, flagged, session };
}

const rulesWithoutSceneMarker = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
const json = (x: unknown) => JSON.stringify(x);

if (process.argv[1]?.endsWith("words57Route.ts")) {
  const mode = process.argv[2];
  if (mode === "scan") {
    const from = Number(process.argv[3] ?? 0), to = Number(process.argv[4] ?? 40);
    for (let seed = from; seed <= to; seed += 1) for (const slot of [0, 1, 2, 3] as const) {
      try {
        const { flagged } = words57Route(seed, "on", [slot, slot, slot, slot, slot, slot, slot, slot]);
        const battle = flagged.filter((f) => f.battleUnits.length > 0);
        if (battle.length) console.log(seed, slot, "battle-unit frames", battle.length, json([...new Set(battle.map((f) => `${f.moveId}/${f.attacker} ${f.battleUnits.join("+")}`))]));
      } catch { /* stalled routes are skipped */ }
    }
  } else if (mode === "parity") {
    const seed = Number(process.argv[3]), slot = Number(process.argv[4]) as 0 | 1 | 2 | 3, out = process.argv[5]!;
    const SLOTS = Array.from({ length: 8 }, () => slot);
    const A = words57Route(seed, "on", SLOTS, 0x1234abcd, true), A2 = words57Route(seed, "on", SLOTS, 0x1234abcd, true);
    const B = words57Route(seed, "on", SLOTS, 0xfeed0042), off = words57Route(seed, "off", SLOTS, 0x1234abcd);
    const battle = A.flagged.filter((f) => f.battleUnits.length > 0);
    const checks = {
      battleUnitConsumerFrames: battle.length,
      consumers: [...new Set(battle.map((f) => `${f.requestId}:${f.moveId}/${f.attacker} ${f.battleUnits.join("+")}`))],
      freshRepeatIdenticalFrames: json(A2.flagged) === json(A.flagged),
      seedsBoundariesIdentical: json(B.run.boundaries) === json(A.run.boundaries),
      seedsFacilityIdentical: json(B.run.state.facilityState) === json(A.run.state.facilityState),
      seedsRngIdentical: B.run.state.round.rules.rngValue === A.run.state.round.rules.rngValue,
      offBoundaryCount: off.run.boundaries.length === A.run.boundaries.length,
      offRulesIdentical: A.run.boundaries.every((b: any, i: number) => json(rulesWithoutSceneMarker(off.run.boundaries[i]!)) === json(rulesWithoutSceneMarker(b))),
      offRngIdentical: A.run.boundaries.every((b: any, i: number) => json(off.run.boundaries[i]!.rng) === json(b.rng) && json(off.run.boundaries[i]!.boundary) === json(b.boundary)),
      offFinalRngIdentical: off.run.state.round.rules.rngValue === A.run.state.round.rules.rngValue,
      offFacilityIdentical: json(off.run.state.facilityState) === json(A.run.state.facilityState),
      boundaries: A.run.boundaries.length, finalRng: A.run.state.round.rules.rngValue,
    };
    writeFileSync(out, `${JSON.stringify({ schema: "words57-route-parity/v1", seed, slot, checks }, null, 1)}\n`);
    console.log(JSON.stringify(checks));
    const ok = battle.length > 0 && Object.entries(checks).every(([k, v]) => typeof v !== "boolean" || v);
    process.exit(ok ? 0 : 1);
  }
}
