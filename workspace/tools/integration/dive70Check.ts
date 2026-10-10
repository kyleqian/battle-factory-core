// dive70: per fixture (tools/integration/fixtures/dive70/*.json), through the PRODUCTION seams only: the order host's lend at the attack
// activation (the setup's word-free deferred marker, resolved by the render seam's carry) == the ROM sSpriteOrder at the activation frame
// (prep22Probe.py atActivation.spriteOrder); the live presentation exists at every age of the 93-row window; the duration is 93; the
// 56 words come from the pinned host (activation value = RAM gRng2Value). usage: dive70Check.ts fixture.json... (prints JSON lines)
import { readFileSync } from "node:fs";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import {
  liveBattlerAnchors, liveMoveAnimationDuration, liveMoveAnimationPresentation, LIVE_WORDS_ORDER_DEFERRED_REPLAY, liveWordsOrderDeferredCarry,
} from "../../src/engine/liveMoveAnimation.ts";
import { liveMovePresentationRngWords, type LiveMovePresentationRngInput } from "../../src/engine/liveMovePresentationRng.ts";
import { resolveSpriteOrderDeferredLend, type SpriteOrderDeferredLend } from "../../src/engine/spriteOrderEventTransform.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

for (const path of process.argv.slice(2)) {
  const f = JSON.parse(readFileSync(path, "utf8")) as Fixture & { dive70: { romSpriteOrderAtActivation: number[] } };
  const view = liveView(f, 0);
  const e = view.effect as unknown as { request: BattleMoveAnimationRequest; spriteOrderInput?: { known: boolean; free: readonly number[];
    deferred?: SpriteOrderDeferredLend }; presentationRng?: LiveMovePresentationRngInput };
  const art = view.fieldArt;
  const anchors = { player: liveBattlerAnchors("player", art).picOffsetPoint, opponent: liveBattlerAnchors("opponent", art).picOffsetPoint };
  const host = e.presentationRng?.host ?? null;
  const deferred = e.spriteOrderInput?.deferred;
  const resolved = deferred === undefined ? null : resolveSpriteOrderDeferredLend(deferred,
    liveWordsOrderDeferredCarry((key) => liveMovePresentationRngWords({ host, key }), anchors), LIVE_WORDS_ORDER_DEFERRED_REPLAY);
  const full = resolved === null ? null : [...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, ...resolved];
  const words = liveMovePresentationRngWords(e.presentationRng);
  let live = 0;
  for (let age = 0; age < 93; age += 1) {
    const v = liveView(f, age), x = v.effect as unknown as typeof e & { battlerX2Input?: never; spriteAllocatorInput?: never };
    if (liveMoveAnimationPresentation(x.request, v.field, age, undefined, x.spriteAllocatorInput as never, x.spriteOrderInput as never,
      x.presentationRng, x.battlerX2Input) !== null) live += 1;
  }
  console.log(JSON.stringify({ fixture: path, side: f.attacker.geometry.side, attacker: f.attacker.species, target: f.target.species,
    deferredMarker: deferred === undefined ? null : { key: deferred.key, moveId: deferred.moveId, turn: deferred.turn, units: deferred.units },
    lendEqualsRom: full !== null && JSON.stringify(full) === JSON.stringify(f.dive70.romSpriteOrderAtActivation),
    duration: liveMoveAnimationDuration(e.request, view.field), liveAges: live,
    words: words === null ? null : { count: words.words.length, draws: words.draws.map((d) => d.length) } }));
}
