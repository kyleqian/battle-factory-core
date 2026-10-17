import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../../src/engine/battleResolutionPresentation.ts";
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import {
  LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { prepareLiveMoveSpriteAllocator } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages, iu120Extra, ont193ScriptTail } from "../helpers/iu120Rows.ts";

/** Live age offsets are asserted through the dense proof; durations pin windows. */
const moves = [
  { id: 112, name: "BARRIER", duration: 76 },
  { id: 277, name: "MAGIC_COAT", duration: 76 },
  { id: 182, name: "PROTECT", duration: 123 },
  { id: 115, name: "REFLECT", duration: 79 },
  { id: 243, name: "MIRROR_COAT", duration: 86 },
] as const;

const field = (() => {
  const mon = (name: string) => ({ species: speciesStats.species.find(s => s.name === `SPECIES_${name}`)!.id,
    speciesSymbol: name, name, level: 50, hp: 100, maxHP: 100, gender: "male", status: "none" });
  return { player: mon("CORSOLA"), opponent: mon("ONIX") } as unknown as BattleResolutionDisplayedField;
})();

// [seed, slot, factory win streak, move, expects exact adapter].
// Exact routes have the wall move as the battle's first move body (known
// allocator entry history); fallback routes play an unproved animation first.
// alloc50: seed 58 (streak 14) flipped to exact; it crosses a status animation now audited allocator net-zero (prep50).
// alloc52: seeds 20 (Ice Ball 301 after 242), 64 (Rollout 205, Mega Drain 72 first) and 231 (Mega Drain 72 first) flipped to exact;
// those bodies are audited allocator net-zero by the prep52 receipt (tools/integration/fixtures/prep52/net-zero-audit.json).
// land75: seeds 10 (Barrier) and 260 (Magic Coat) flipped to exact; the bodies before them are audited allocator net-zero by the
// hist73 receipt (tools/integration/fixtures/hist73/net-zero-audit.json); dense ROM check: tools/integration/fixtures/land75/.
const routes: ReadonlyArray<readonly [number, 0 | 1 | 2 | 3, number, number, boolean]> = [
  [21, 3, 0, 112, true], [82, 0, 0, 112, true], [10, 0, 0, 112, true], [67, 2, 0, 112, true],
  [87, 2, 0, 277, true], [447, 0, 0, 277, true], [260, 0, 0, 277, true],
  [38, 3, 0, 182, true], [118, 0, 0, 182, true], [20, 0, 0, 182, true], [64, 2, 0, 182, true],
  [17, 3, 14, 115, true], [58, 3, 14, 115, true],
  [231, 1, 0, 243, true],
  // s10a: seed 67 flipped to exact — it plays Quick Attack 98 first, audited net-zero by the prep44 receipt.
  // Seed 345 plays Bubble Beam 61 first; 61 is audited net-zero (allocator-net-zero-audit-ext.json),
  // so history stays known and Mirror Coat renders the exact adapter after an audited body.
  [345, 0, 0, 243, true],
];

describe("wall-family live adapters", () => {
  it("registers every wall move with its source window and requires allocator history", () => {
    for (const { id, duration } of moves) {
      const request: BattleMoveAnimationRequest = {
        moveId: id, attacker: 0, target: 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
      };
      expect(LIVE_MOVE_ANIMATION_IDS).toContain(id);
      expect(liveMoveAnimationDuration(request)).toBe(duration);
      const input = prepareLiveMoveSpriteAllocator(
        createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove, request,
      ).input;
      expect(input?.historyKnown).toBe(true);
      expect(liveMoveAnimationPresentation(request, field, 0, undefined, input)).not.toBeNull();
      expect(liveMoveAnimationPresentation(request, field, 0)).toBeNull();
    }
  });

  it.each(routes)("seed %i slot %i streak %i move %i adapter=%s through the ordinary route", (seed, slot, streak, moveId, exact) => {
    const on = generatedCommandAnimationReplay(seed, "on", [slot], streak);
    const off = generatedCommandAnimationReplay(seed, "off", [slot], streak);
    const duration = moves.find(row => row.id === moveId)!.duration;
    const body = on.animations.filter(animation => animation.moveId === moveId);
    expect(body).toHaveLength(1);
    const side = body[0]!.attacker === 0 ? "player" : "opponent";
    expect(body[0]!.ages).toEqual(iu120Ages(moveId, duration, side));
    expect(body[0]!.adapterActive).toEqual(Array(duration + iu120Extra(moveId, side) + ont193ScriptTail(moveId)).fill(exact));
    const command = on.commands.find(row => row.type === "move-animation"
      && (row.command as { animation?: { moveId: number } }).animation?.moveId === moveId)!;
    expect(command.spriteInputHistoryKnown === true).toBe(exact);
    const firstIndex = on.requests.findIndex(request => request.moveId === moveId);
    // Exact routes either start the battle's body list or follow audited net-zero bodies.
    if (exact && seed !== 345 && seed !== 67 && seed !== 58 && seed !== 20 && seed !== 64 && seed !== 231
      && seed !== 10 && seed !== 260) expect(firstIndex).toBe(0);
    else expect(firstIndex).toBeGreaterThan(0);
    if (seed === 345) expect(on.requests[0]!.moveId).toBe(61);
    if (seed === 67) expect(on.requests.map(request => request.moveId)).toEqual([98, 112]);
    expect(body[0]!.entryMessage?.visibleCharacters)
      .toBe(body[0]!.entryMessage?.lines.join("").length);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    for (let index = 0; index < on.boundaries.length; index += 1) {
      const a = on.boundaries[index]!, b = off.boundaries[index]!;
      expect(a.rng).toEqual(b.rng);
      const { hitMarker: am, ...ar } = a.rules.rulesContext;
      const { hitMarker: bm, ...br } = b.rules.rulesContext;
      expect(ar).toEqual(br);
      // Scene mode may flip only the hit-marker scene bit (0x80).
      expect((am ^ bm) & ~0x80).toBe(0);
      expect(a.boundary).toEqual(b.boundary);
    }
  }, 60000);
});
