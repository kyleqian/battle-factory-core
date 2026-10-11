import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";
import { describe, expect, it } from "vitest";
import { createInitialState, tick, render } from "../src/engine/core.ts";
import { playableAnimationReplay } from "../tools/integration/playableAnimationReplay.ts";
import { battleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import { land97Ages } from "./helpers/land97LeadAges.ts";

describe("ordinary playable animation queue", () => {
  it("plays damaging and no-hit moves from draft input, resumes commands, and preserves rules/RNG", () => {
    const on = playableAnimationReplay("on");
    const off = playableAnimationReplay("off");
    expect(on.boundaries).toHaveLength(4);
    expect(off.boundaries).toHaveLength(4);
    for (let index = 0; index < on.boundaries.length; index++) {
      const a = on.boundaries[index]!.factoryRoundBattleOrchestrator!.battle!;
      const b = off.boundaries[index]!.factoryRoundBattleOrchestrator!.battle!;
      expect(a.rng).toEqual(b.rng);
      const { hitMarker: am, ...ar } = a.rules.rulesContext;
      const { hitMarker: bm, ...br } = b.rules.rulesContext;
      expect(ar).toEqual(br);
      expect(am ^ bm).toBe(0x80); // HITMARKER_NO_ANIMATIONS is the sole rule input difference.
      expect(a.boundary).toEqual(b.boundary);
      expect(on.boundaries[index]!.sceneOnPresentation).toBeNull();
    }
    expect(on.observations.filter(o => o.moveId === 325)).toHaveLength(2);
    const damaging = on.observations.find(o => o.moveId === 325)!;
    const status = on.observations.find(o => o.moveId === 109)!;
    expect(damaging).toMatchObject({ player: "HAUNTER", opponent: "GROVYLE", attacker: 0 });
    expect(status).toMatchObject({ player: "HAUNTER", opponent: "GROVYLE", attacker: 0 });
    for (const observed of [damaging, status]) {
      expect(observed.samples.map(s => s.age)).toEqual([0, Math.floor(observed.duration! / 2), observed.duration! - 1]);
      expect(new Set(observed.samples.map(s => s.sha256)).size).toBeGreaterThan(1);
    }
    expect(on.trace.battleScene).toBe("on");
    let replay = createInitialState({ battleScene: on.trace.battleScene });
    for (const segment of on.trace.segments) {
      for (let i=0; i<segment.frames; i++) replay = tick(replay, new Set(segment.buttons));
    }
    expect(replay.factoryRoundBattleOrchestrator).toEqual(on.state.factoryRoundBattleOrchestrator);
    expect(render(replay)).toEqual(render(on.state));
  }, 60000);

  it("renders both opponent damaging and no-hit moves from generated command input through cleanup", () => {
    for (const slots of [[3, 3, 3, 3], [0, 1]] as const) {
      const on = generatedCommandAnimationReplay(54, "on", slots);
      const off = generatedCommandAnimationReplay(54, "off", slots);
      expect(on.boundaries).toHaveLength(slots.length + 1);
      for (let i = 0; i < on.boundaries.length; i++) {
        const a = on.boundaries[i]!, b = off.boundaries[i]!;
        expect(a.rng).toEqual(b.rng);
        const { hitMarker: _am, ...ar } = a.rules.rulesContext;
        const { hitMarker: _bm, ...br } = b.rules.rulesContext;
        expect(ar).toEqual(br);
      }
      const expectedMove = slots.length === 4 ? 325 : 109;
      const animation = on.animations.find(a => a.moveId === expectedMove && a.attacker === 1)!;
      expect(animation).toMatchObject({ player: "WAILMER", opponent: "HAUNTER" });
      expect(animation.ages).toEqual(land97Ages(expectedMove, expectedMove === 325 ? 105 : 270));
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    }
  }, 60000);

  it("keeps target, two-turn and multi-hit selectors in the typed controller request", () => {
    expect(battleMoveAnimationRequest(1, 0, ["29", "1", "70", "-31", "200", "3"])).toEqual({
      moveId: 29, attacker: 1, target: 0, turn: 1, power: 70, damage: -31, friendship: 200, multihit: 3,
    });
    expect(() => battleMoveAnimationRequest(0, 1, [])).toThrow("six integer");
    expect(() => battleMoveAnimationRequest(0, undefined, ["29", "0", "70", "17", "90", "0"])).toThrow("singles target");
    expect(() => battleMoveAnimationRequest(0, 1, ["9999999999999999999", "0", "70", "17", "90", "0"])).toThrow("safe integers");
    // oam1: Fury Cutter has one 43-row body for every counter; only the counter-1 (first-body) presentation is live
    // (liveMoveAnimation.ts case 210), every other counter declines to the scene-off view.
    expect(liveMoveAnimationDuration(battleMoveAnimationRequest(0, 1, ["210","0","10","1","0","0"]))).toBe(43);
  });

  it("plays Light Screen from six generated rentals, preserves text/self-target, and resumes after repeat failure", () => {
    // Seeds 84 ([3,3]) and 2 ([0,3]) play a non-live, unaudited move (185,
    // 318, 209) before Light Screen, so allocator history is unknown and the generic bounded
    // fallback renders; 2/45/59/114 ([3,3]) have Light Screen as the first move
    // body with known entry history (exact adapter). s10a: seed 27 plays Faint Attack 185 first, which the
    // prep44 receipt audited net-zero, so it now renders with the exact adapter (was fallback); 84 (318) and
    // 2 [0,3] (209) stay fallback. alloc52: 2 [0,3] flipped to exact (Spark 209 is audited net-zero by the prep52 receipt).
    // land75: 84 flipped to exact (Silver Wind 318 is audited net-zero by the hist73 receipt; dense ROM check tools/integration/fixtures/land75/).
    const routes: ReadonlyArray<readonly [number, readonly (0 | 1 | 2 | 3)[], boolean]> = [
      [2, [3, 3], true], [27, [3, 3], true], [45, [3, 3], true],
      [59, [3, 3], true], [84, [3, 3], true], [114, [3, 3], true],
      [2, [0, 3], true],
    ];
    for (const [seed, slots, exact] of routes) {
      const on = generatedCommandAnimationReplay(seed, "on", slots);
      const off = generatedCommandAnimationReplay(seed, "off", slots);
      const body = on.animations.filter(animation => animation.moveId === 113);
      expect(body).toHaveLength(1);
      expect(body[0]!.ages).toEqual(Array.from({ length: 88 }, (_, age) => age));
      expect(body[0]!.adapterActive).toEqual(Array(88).fill(exact));
      const lsCommand = on.commands.find(row => row.type === "move-animation"
        && (row.command as { animation?: { moveId: number } }).animation?.moveId === 113)!;
      expect(lsCommand.spriteInputHistoryKnown === true).toBe(exact);
      if (!exact) {
        expect(on.requests.some(request => request.moveId !== 113)).toBe(true);
        expect(on.requests.findIndex(request => request.moveId !== 113))
          .toBeLessThan(on.requests.findIndex(request => request.moveId === 113));
      }
      expect(body[0]!.entryMessage?.visibleCharacters)
        .toBe(body[0]!.entryMessage?.lines.join("").length);
      const requests = on.requests.filter(request => request.moveId === 113);
      expect(requests).toHaveLength(1);
      expect(requests[0]!.target).toBe(requests[0]!.attacker);
      expect(on.commands.some(row => row.type === "message"
        && JSON.stringify(row.command).includes("raised SP. DEF"))).toBe(true);
      expect(on.commands.some(row => row.type === "message"
        && JSON.stringify(row.command).includes("But it failed"))).toBe(true);
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      expect(on.boundaries).toHaveLength(3);
      for (let index = 0; index < on.boundaries.length; index += 1) {
        const a = on.boundaries[index]!, b = off.boundaries[index]!;
        expect(a.rng).toEqual(b.rng);
        const { hitMarker: am, ...ar } = a.rules.rulesContext;
        const { hitMarker: bm, ...br } = b.rules.rulesContext;
        expect(ar).toEqual(br);
        expect(am ^ bm).toBe(0x80);
        expect(a.boundary).toEqual(b.boundary);
      }
    }
  }, 60000);

  it("keeps allocator history known across audited net-zero move bodies and falls back after unaudited ones", () => {
    // Re-derived from generated rentals with the net-zero persistence list
    // (tools/integration/fixtures/allocator-net-zero-audit.json). Seed 20
    // plays Crunch 242 (+ Rest 156) before Protect 182; seeds 2 and 59 play
    // Screech 103 / Spite 180 before Light Screen: all audited net-zero, so the
    // exact adapter renders. Seeds 45/47 play Bubble Beam 61 first; it is now
    // audited net-zero (allocator-net-zero-audit-ext.json), so Light Screen
    // renders with the exact adapter (no other unaudited body intervenes).
    // Seeds 50 and 62 cross a status animation before Light Screen. It was
    // fallback while any status animation invalidated the allocator host; SLP,
    // CONFUSION, PSN, PRZ and BRN are now audited net-zero
    // (tools/integration/fixtures/prep50/status-net-zero-audit.json), so the
    // exact adapter renders. FRZ / status2 / switch-in invalidation is unchanged
    // (tests/alloc50StatusAllocator.test.ts).
    const routes: ReadonlyArray<readonly [number, number, readonly (0 | 1 | 2 | 3)[], boolean]> = [
      [182, 20, [3, 3], true], [182, 20, [2, 3], true],
      [113, 59, [1, 3], true], [113, 2, [1, 3], true],
      [113, 47, [0, 3], true], [113, 45, [0, 3], true],
      [113, 50, [2, 3], true], [113, 62, [1, 3], true],
    ];
    for (const [moveId, seed, slots, exact] of routes) {
      const on = generatedCommandAnimationReplay(seed, "on", slots);
      const off = generatedCommandAnimationReplay(seed, "off", slots);
      const body = on.animations.filter(animation => animation.moveId === moveId);
      expect(body).toHaveLength(1);
      expect(body[0]!.adapterActive).toEqual(Array(body[0]!.ages.length).fill(exact));
      expect(on.requests.findIndex(request => request.moveId === moveId)).toBeGreaterThan(0);
      expect(body[0]!.entryMessage?.visibleCharacters)
        .toBe(body[0]!.entryMessage?.lines.join("").length);
      expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
      expect(on.boundaries).toHaveLength(off.boundaries.length);
      for (let index = 0; index < on.boundaries.length; index += 1) {
        const a = on.boundaries[index]!, b = off.boundaries[index]!;
        expect(a.rng).toEqual(b.rng);
        const { hitMarker: am, ...ar } = a.rules.rulesContext;
        const { hitMarker: bm, ...br } = b.rules.rulesContext;
        expect(ar).toEqual(br);
        expect((am ^ bm) & ~0x80).toBe(0);
        expect(a.boundary).toEqual(b.boundary);
      }
    }
  }, 120000);
});
