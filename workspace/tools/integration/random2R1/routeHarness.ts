/**
 * Random2 R1 surrogate routes: an ordinary generated-rental battle (generatedCommandAnimationReplay, the prep11 §4 recipe)
 * driven with the PRODUCTION presentation seam (tickLiveMovePresentationRngSession, exactly what core.ts tick runs after
 * each logical frame) and rendered through the production live view with the session host (read-only). Records every
 * faithful-random body: key, activation, ages, adapter-active per age, words + provenance, per-frame RGBA digests.
 */
import { createHash } from "node:crypto";
import "../../../src/engine/monPicPixelsInstall.ts";
import { generatedCommandAnimationReplay } from "../generatedCommandAnimationReplay.ts";
import {
  createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt,
} from "../../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../../src/engine/battleScene.ts";
import { liveMoveAnimationPresentation } from "../../../src/engine/liveMoveAnimation.ts";
import {
  liveMovePresentationRngBodyKey, liveMoveRandom2Plan, tickLiveMovePresentationRngSession,
} from "../../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngSession, presentationRngBodyWords } from "../../../src/engine/presentationRngHost.ts";

export interface Random2RouteBody {
  key: string; moveId: number; attacker: number; turn: number; power: number;
  activationHostFrame: number | null; provenance: string | null; words: readonly number[] | null;
  ages: number[]; active: boolean[]; frameDigests: string[];
}

export function random2Route(
  seed: number, battleScene: "on" | "off", slots: readonly (0 | 1 | 2 | 3)[], streak: number, presentationSeed: number,
) {
  let session = createPresentationRngSession(presentationSeed);
  const bodies = new Map<string, Random2RouteBody>();
  const fb = new Uint8Array(240 * 160 * 4);
  const run = generatedCommandAnimationReplay(seed, battleScene, slots, streak, false, true, (state) => {
    session = tickLiveMovePresentationRngSession(session, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]?.commands[r.commandIndex];
    if (command?.type !== "move-animation" || !command.animation || liveMoveRandom2Plan(command.animation) === null) return;
    const key = liveMovePresentationRngBodyKey(r);
    const view = createBattleResolutionPresentationRenderView(r, session.host);
    const effect = view.effect;
    if (effect?.type !== "move") throw new Error("move command without a move effect");
    const presentation = liveMoveAnimationPresentation(effect.request, view.field, effect.age, effect.paletteInput,
      effect.spriteAllocatorInput, effect.spriteOrderInput, effect.presentationRng);
    const record = presentationRngBodyWords(session.host, key);
    const host = session.host!;
    const body = bodies.get(key) ?? {
      key, moveId: command.animation.moveId, attacker: command.animation.attacker, turn: command.animation.turn,
      power: command.animation.power,
      activationHostFrame: host.bodies.find((b) => b.key === key)?.activationFrame ?? null,
      provenance: record?.provenance ?? null, words: record?.words ?? null, ages: [], active: [], frameDigests: [],
    };
    body.ages.push(effect.age);
    body.active.push(presentation !== null);
    fb.fill(0);
    renderBattleResolutionLiveView(fb, view);
    body.frameDigests.push(createHash("sha256").update(fb).digest("hex"));
    bodies.set(key, body);
  });
  return { run, bodies: [...bodies.values()], session };
}
