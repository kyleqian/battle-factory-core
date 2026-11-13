// spark62: copy of words57Parity.ts that also reports, per faithful consumer, whether its frames are identical between presentation
// seeds A and B (Spark reads only the lend's `known`, so its frames must be seed-independent).
// usage: node --experimental-strip-types --no-warnings tools/integration/spark62Parity.ts <battleIndex> <out.json>
// words57 (docs/next-adapters-words57.md): Scene ON / OFF and presentation-seed parity on a live-share census battle (liveShareCensus.ts's
// orchestrator, input policy and presentation seam, battle i: seed = i, streak = (i * 11) % 49) where a consumer goes live through the
// words-deferred replay past battle units. Runs: ON with presentation seed A (twice, fresh), ON with seed B, OFF with seed A. At every
// command submission the logical state (round rules minus the Scene-OFF hit-marker bit, gameplay RNG value, facility state) is recorded;
// they must be identical across all runs; the faithful-random consumer frames (rendered framebuffer digests) must be identical between
// the two fresh seed-A runs. Exit 1 otherwise.
import { writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";

const FRAME_BUDGET = 200000;
const hash = (x: unknown) => createHash("sha256").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex");

function play(battle: number, scene: "on" | "off", presentationSeed: number) {
  const seed = battle, streak = (battle * 11) % 49;
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: scene,
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  const fb = new Uint8Array(240 * 160 * 4);
  let rng = createPresentationRngSession(presentationSeed);
  let frame = 0, ended = false;
  const slotUses = [0, 0, 0, 0];
  const logical: string[] = [];
  const faithful: string[] = [];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    if (command?.type !== "move-animation") return;
    const view = createBattleResolutionPresentationRenderView(r, rng.host);
    const e = view.effect;
    if (e?.type !== "move") return;
    const p = liveMoveAnimationPresentation(e.request, view.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput, e.presentationRng, e.battlerX2Input);
    if (!p?.faithfulRandomHistory) return;
    fb.fill(0); renderBattleResolutionLiveView(fb, view);
    faithful.push(`${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex} ${e.request.moveId}/${e.request.attacker} age ${e.age} ${hash(Buffer.from(fb))}`);
  };
  const snapshot = () => {
    const rules = (state as any).round?.rules;
    const masked = rules ? { ...rules, rulesContext: rules.rulesContext ? { ...rules.rulesContext, hitMarker: rules.rulesContext.hitMarker & ~0x80 } : undefined } : null;
    logical.push(hash({ rules: masked, rng: rules?.rngValue, facility: (state as any).facilityState }));
  };
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    if (scene === "on") observe();
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended) step([button]); if (!ended) step(); };
  const forcedSelector = () => {
    const selector = state.battleForcedPartySelect;
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!ended && !predicate()) {
      const selector = forcedSelector();
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  until(() => phase() === "action-menu");
  while (!ended) {
    snapshot();
    const forcedSlot = state.battleCommandPresentation?.forcedMove?.decision.moveSlot ?? null;
    pulse("A");
    if (forcedSlot !== null) {
      slotUses[forcedSlot]!++;
      if (phase() === "no-moves-message") {
        until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
        pulse("A");
      }
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
      continue;
    }
    until(() => phase() === "fight-menu");
    if (ended) break;
    const menu = state.battleCommandPresentation!;
    const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
    const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
    slotUses[slot]!++;
    for (let i = 0; i < 4; i++) {
      const cursor = state.battleCommandPresentation!.fightCursor;
      if (cursor === slot) break;
      pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
    }
    pulse("A");
    until(() => !state.battleCommandPresentation);
    until(() => phase() === "action-menu");
  }
  snapshot();
  return { logical, faithful, frames: frame, rulesSeen: Boolean((state as any).round?.rules?.rngValue !== undefined), final: hash({ rng: (state as any).round?.rules?.rngValue, facility: (state as any).facilityState }) };
}

const battle = Number(process.argv[2]), out = process.argv[3]!;
const A = play(battle, "on", 0x1234abcd), A2 = play(battle, "on", 0x1234abcd), B = play(battle, "on", 0xfeed0042), off = play(battle, "off", 0x1234abcd);
const checks = {
  decisionSnapshots: A.logical.length, faithfulRandomFrames: A.faithful.length, rulesPresent: A.logical.length > 0 && A.rulesSeen,
  faithfulConsumers: [...new Set(A.faithful.map((f) => f.split(" age")[0]))],
  freshRepeatIdenticalFrames: JSON.stringify(A2.faithful) === JSON.stringify(A.faithful),
  seedBLogicalIdentical: JSON.stringify(B.logical) === JSON.stringify(A.logical) && B.final === A.final,
  seedBFaithfulFramesDiffer: JSON.stringify(B.faithful) !== JSON.stringify(A.faithful),
  sceneOffLogicalIdentical: JSON.stringify(off.logical) === JSON.stringify(A.logical) && off.final === A.final,
  final: A.final,
  perConsumerSeedBIdenticalFrames: Object.fromEntries([...new Set(A.faithful.map((f) => f.split(" age")[0]))].map((c) => {
    const pick = (rows: string[]) => rows.filter((f) => f.startsWith(`${c} age`));
    return [c, { frames: pick(A.faithful).length, identical: JSON.stringify(pick(A.faithful)) === JSON.stringify(pick(B.faithful)) }];
  })),
};
writeFileSync(out, `${JSON.stringify({ schema: "spark62-parity/v1", battle, seed: battle, streak: (battle * 11) % 49, checks }, null, 1)}\n`);
console.log(JSON.stringify(checks));
process.exit(checks.faithfulRandomFrames > 0 && checks.freshRepeatIdenticalFrames && checks.seedBLogicalIdentical && checks.sceneOffLogicalIdentical ? 0 : 1);
