import { describe, expect, it } from "vitest";
import {
  createLiveMovePaletteHost, invalidateLiveMovePaletteHost, prepareLiveMovePalette,
} from "../src/engine/liveMoveAnimationPalette.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { playableAnimationReplay } from "../tools/integration/playableAnimationReplay.ts";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";

const request = (moveId: number): BattleMoveAnimationRequest => ({
  moveId, attacker: 0, target: 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});

describe("persistent live move palette inputs", () => {
  it("keeps initial/repeated traces stable but retains Smokescreen's task palette on the next move", () => {
    const initial = createLiveMovePaletteHost();
    const first = prepareLiveMovePalette(initial, request(325));
    const repeat = prepareLiveMovePalette(first.next, request(325));
    const afterSmoke = prepareLiveMovePalette(first.next, request(108));
    const later = prepareLiveMovePalette(afterSmoke.next, request(325));
    expect(first.input.traceScratchUnfadedPalette).toHaveLength(16);
    expect(repeat.input).toEqual(first.input);
    expect(later.input.historyKnown).toBe(true);
    expect(later.input.traceScratchUnfadedPalette).not.toEqual(first.input.traceScratchUnfadedPalette);
    expect(prepareLiveMovePalette(initial, request(325)).input).toEqual(first.input);
  });

  it("keeps scratch history through audited psychic/ghost bodies with no extra OBJ unfaded writes", () => {
    const initial = createLiveMovePaletteHost();
    const expected = prepareLiveMovePalette(initial, request(325)).input;
    let host = initial;
    for (const moveId of [93, 94, 101, 247]) {
      host = prepareLiveMovePalette(host, request(moveId)).next;
      expect(host.historyKnown).toBe(true);
      expect(prepareLiveMovePalette(host, request(325)).input).toEqual(expected);
    }
  });

  it("retains the third and fourth loaded rows from Dynamic Punch for later traces", () => {
    const initial = createLiveMovePaletteHost();
    const expected = prepareLiveMovePalette(initial, request(325)).input;
    const after = prepareLiveMovePalette(initial, request(223));
    expect(after.next.historyKnown).toBe(true);
    expect(after.next.memory.tags.slice(7)).toEqual(Array(9).fill(0xffff));
    expect(prepareLiveMovePalette(after.next, request(325)).input.traceScratchUnfadedPalette)
      .not.toEqual(expected.traceScratchUnfadedPalette);
  });

  it("does not claim complete palette history after unknown resources or switching", () => {
    const initial = createLiveMovePaletteHost();
    const unknown = prepareLiveMovePalette(initial, request(1)).next;
    expect(prepareLiveMovePalette(unknown, request(325)).input).toEqual({ historyKnown: false });
    expect(prepareLiveMovePalette(invalidateLiveMovePaletteHost(initial), request(325)).input)
      .toEqual({ historyKnown: false });
  });

  it("retains one owned host across real draft input and subsequent command resolutions", () => {
    const on = playableAnimationReplay("on");
    const off = playableAnimationReplay("off");
    expect(on.boundaries.slice(1, 3).map(s =>
      s.factoryRoundBattleOrchestrator!.liveMovePaletteHost?.host.historyKnown,
    )).toEqual([true, true]);
    // The third turn KOs Grovyle and sends in Murkrow, invalidating this
    // bounded provider until the switch graphics allocator is implemented.
    expect(on.state.factoryRoundBattleOrchestrator!.liveMovePaletteHost?.host.historyKnown).toBe(false);
    expect(off.state.factoryRoundBattleOrchestrator!.liveMovePaletteHost).toBeUndefined();
    expect(on.boundaries).toHaveLength(4);
    expect(on.observations.filter(a => a.moveId === 325)).toHaveLength(2);
  }, 60000);

  it("invalidates the claim when ordinary party-menu switching changes graphics ownership", () => {
    const replay = generatedCommandAnimationReplay(54, "on", [{ switch: 1 }, 0]);
    expect(replay.state.liveMovePaletteHost?.host.historyKnown).toBe(false);
    expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);
});
