import { describe, expect, it } from "vitest";
import {
  createLiveMovePaletteHost, invalidateLiveMovePaletteHost, prepareLiveMovePalette,
} from "../src/engine/liveMoveAnimationPalette.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { playableAnimationReplay } from "../tools/integration/playableAnimationReplay.ts";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { advanceFactoryRoundBattleCommand } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import paletteData from "../src/data/gen/live-animation-palette-resources.json" with { type: "json" };

const request = (moveId: number): BattleMoveAnimationRequest => ({
  moveId, attacker: 0, target: 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});

describe("persistent live move palette inputs", () => {
  it("keeps conditional paralysis moves unknown until status palette ownership is modeled", () => {
    for (const moveId of [9, 290]) {
      const prepared = prepareLiveMovePalette(createLiveMovePaletteHost(), request(moveId));
      expect(prepared.input.historyKnown).toBe(false);
      expect(prepared.next.historyKnown).toBe(false);
    }
  });
  it("models the audited physical/support batch through cleanup and later scratch allocation", () => {
    const expectedLoads = new Map<number, readonly string[]>([
      [42, ["ANIM_TAG_NEEDLE", "ANIM_TAG_IMPACT"]],
      [65, ["ANIM_TAG_IMPACT", "ANIM_TAG_WHIRLWIND_LINES"]],
      [74, []],
      [75, ["ANIM_TAG_LEAF", "ANIM_TAG_RAZOR_LEAF", "ANIM_TAG_IMPACT"]],
      [114, []],
      [151, []],
      [302, ["ANIM_TAG_GREEN_SPIKE", "ANIM_TAG_IMPACT", "ANIM_TAG_HANDS_AND_FEET"]],
      [319, ["ANIM_TAG_METAL_SOUND_WAVES"]],
    ]);
    const initial = createLiveMovePaletteHost();
    for (const [moveId, loads] of expectedLoads) {
      const plan = paletteData.plans[String(moveId) as keyof typeof paletteData.plans];
      expect(plan.loads).toEqual(loads);
      expect(plan).toMatchObject({ callbackAudit: { objUnfaded: "unchanged" } });
      const after = prepareLiveMovePalette(initial, request(moveId));
      expect(after.next.historyKnown).toBe(true);
      expect(after.next.memory.tags.slice(7)).toEqual(Array(9).fill(0xffff));
      expect(prepareLiveMovePalette(after.next, request(325)).input).toMatchObject({ historyKnown: true });
    }
  });

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

  it("keeps musical-note rainbow writes out of later Shadow Punch unfaded input", () => {
    for (const moveId of [47, 320]) {
      const initial = createLiveMovePaletteHost();
      const after = prepareLiveMovePalette(initial, request(moveId));
      expect(after.next.historyKnown).toBe(true);
      expect(after.next.memory.tags.slice(7)).toEqual(Array(9).fill(0xffff));
      const offset = 256 + 9 * 16;
      expect(after.next.memory.unfaded.slice(offset, offset + 16))
        .toEqual(initial.memory.unfaded.slice(offset, offset + 16));
      expect(after.next.memory.faded.slice(offset + 1, offset + 6))
        .not.toEqual(initial.memory.faded.slice(offset + 1, offset + 6));
      expect(prepareLiveMovePalette(after.next, request(325)).input)
        .toEqual(prepareLiveMovePalette(initial, request(325)).input);
    }
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
    )).toEqual([true, false]);
    expect(on.semanticEvents.some(({ event }) =>
      (event as { payload?: { kind?: string } }).payload?.kind === "status-animation"
    )).toBe(true);
    // The second boundary crossed a real status-animation event, and the
    // third turn also KOs Grovyle and sends in Murkrow. Both graphics paths
    // remain outside this bounded provider.
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

  it("invalidates retained history at an actual unmodeled status-animation event", () => {
    const on = generatedCommandAnimationReplay(549, "on", [2]);
    const off = generatedCommandAnimationReplay(549, "off", [2]);
    const statusAnimations = on.semanticEvents.filter(({ event }) =>
      (event as { payload?: { kind?: string } }).payload?.kind === "status-animation"
    );
    expect(on.requests.some(({ moveId, attacker }) => moveId === 122 && attacker === 0)).toBe(true);
    expect(on.commands.find(({ command }) =>
      (command as { type?: string; animation?: { moveId?: number } }).type === "move-animation"
      && (command as { animation?: { moveId?: number } }).animation?.moveId === 122
    )).toMatchObject({
      paletteInputHistoryKnown: true,
      retainedPaletteHistoryKnown: true,
    });
    expect(statusAnimations).toHaveLength(1);
    expect(statusAnimations[0]!.event).toMatchObject({
      sequence: 15,
      payload: { kind: "status-animation", battler: 1, isStatus2: 0, status: 64 },
      provenance: { opcodeName: "B_SCR_OP_STATUSANIMATION" },
    });
    expect(on.commands.find(({ type }) => type === "status")).toMatchObject({
      command: { eventSequence: 14, battler: 1, before: 0, after: 64 },
      retainedPaletteHistoryKnown: true,
    });
    expect(on.commands.find(({ command }) =>
      (command as { eventSequence?: number }).eventSequence === 16
    )).toMatchObject({ retainedPaletteHistoryKnown: false });
    expect(on.state.battle?.rules.rulesContext.battlers[1]!.status1).toBe(64);
    expect(on.state.liveMovePaletteHost?.host.historyKnown).toBe(false);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(off.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.boundaries).toHaveLength(2);
    expect(off.boundaries).toHaveLength(2);
    for (let index = 0; index < on.boundaries.length; index += 1) {
      const { hitMarker: onMarker, ...onRules } = on.boundaries[index]!.rules.rulesContext;
      const { hitMarker: offMarker, ...offRules } = off.boundaries[index]!.rules.rulesContext;
      expect(onRules).toEqual(offRules);
      expect(on.boundaries[index]!.rng).toEqual(off.boundaries[index]!.rng);
      expect(onMarker ^ offMarker).toBe(0x80);
    }
  }, 60000);

  it("invalidates palette ownership on party entry even when cancelling before the first move", () => {
    for (const mode of ["on", "off"] as const) {
      const replay = playableAnimationReplay(mode);
      // Cover both lazy initialization and an already retained, known host.
      for (const boundary of replay.boundaries.slice(0, 2)) {
        const initial = boundary.factoryRoundBattleOrchestrator!;
        let state = initial;
        const step = (...buttons: ("A" | "B" | "DOWN")[]) => {
          state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
        };
        step("DOWN");
        step();
        step("A");
        for (let ticks = 0; ticks < 100 && (state.battlePartySelect?.openElapsed ?? -1) < 62; ticks++) step();
        expect(state.battlePartySelect).not.toBeNull();
        expect(state.liveMovePaletteHost?.host.historyKnown).toBe(mode === "on" ? false : undefined);
        step("B");
        for (let ticks = 0; ticks < 100 && state.battlePartySelect !== null; ticks++) step();
        expect(state.battlePartySelect).toBeNull();
        expect(state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
        expect(state.battle).toBe(initial.battle);
        expect(state.aiHistory).toBe(initial.aiHistory);
        if (mode === "on") {
          expect(state.liveMovePaletteHost?.battleCallStart).toBe(state.activeBattleCallStart);
          expect(prepareLiveMovePalette(state.liveMovePaletteHost!.host, request(325)).input)
            .toEqual({ historyKnown: false });
        } else expect(state.liveMovePaletteHost).toBeUndefined();
      }
    }
  }, 60000);
});
