import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveView, type Fixture } from "../../tools/integration/liveAdapterFramebuffer.ts";
import { generatedCommandAnimationReplay } from "../../tools/integration/generatedCommandAnimationReplay.ts";
import { iu120Ages } from "../helpers/iu120Rows.ts";

// S10A Substitute part 3 (docs/next-adapters-prep37.md s1 / s3a.4): the 87-row BODY through the generalised live renderer
// branch; the doll lifecycle and the adapter declines are parts 1-2 (tests/substituteDoll*.test.ts).
const status = JSON.parse(readFileSync("docs/animation-integration-live-status.json", "utf8"));
const NAMES = [
  "substitute-player-golem-opponent-onix", "substitute-opponent-golem-player-onix",
  "substitute-alt-player-persian-slowbro", "substitute-alt-opponent-persian-slowbro",
  "substitute-alt-off-player-persian-slowbro", "substitute-alt-opponent-golbat-slowbro",
];
const fixtureAt = (name: string): Fixture =>
  JSON.parse(readFileSync(`tools/integration/fixtures/s10a-live/${name}.json`, "utf8"));
const strip = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
const expectOnOffParity = (on: ReturnType<typeof generatedCommandAnimationReplay>, off: ReturnType<typeof generatedCommandAnimationReplay>) => {
  expect(on.stalled).toBe(off.stalled);
  expect(off.boundaries).toHaveLength(on.boundaries.length);
  for (let i = 0; i < on.boundaries.length; i += 1) {
    expect(strip(on.boundaries[i]!)).toEqual(strip(off.boundaries[i]!));
    expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
  }
  expect(on.state.facilityState).toEqual(off.state.facilityState);
  expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
};

describe("S10A Substitute body (164) scoped exact", () => {
  it("is a scoped-exact live adapter: 87 rows both sides, #142 row 0, one status entry", () => {
    expect(LIVE_MOVE_ANIMATION_IDS as readonly number[]).toContain(164);
    expect(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS).not.toContain(164);
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).not.toContain(164);
    expect(LIVE_MOVE_OPPONENT_SHADOW_ROW[164]).toBe(0);
    expect((status.implementedAdapters as { id: number }[]).filter((e) => e.id === 164)).toHaveLength(1);
    for (const attacker of [0, 1] as const) {
      expect(liveMoveAnimationDuration({ moveId: 164, attacker, target: (1 - attacker) as 0 | 1, power: 0, damage: 0,
        friendship: 70, multihit: 0, turn: 0 })).toBe(87);
    }
  });

  it("every dense fixture window (any pair, both sides, elevated attacker) is 87 rows and presents a SUBSTITUTE body on every age", () => {
    for (const name of NAMES) {
      const f = fixtureAt(name);
      expect(f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1).toBe(87);
      for (let age = 0; age < 87; age += 1) {
        const view = liveView(f, age);
        const effect = view.effect as unknown as { request: never; age: number };
        const presentation = liveMoveAnimationPresentation(effect.request, view.field, effect.age);
        expect((presentation!.config as { move: string }).move).toBe("SUBSTITUTE");
      }
    }
  });

  // Species audit 12 (docs/live-species-audit-12.md): a shiny attacker was drawn without its shiny palette on ages 0..10.
  it("declines a shiny battler on either side (as the other live adapters do)", () => {
    const OT = 416049562, SHINY = ((OT >>> 16) ^ (OT & 0xffff)) >>> 0;
    for (const name of NAMES.slice(0, 2)) {
      const view = liveView(fixtureAt(name), 0);
      const effect = view.effect as unknown as { request: never; age: number };
      const call = (field = view.field) => liveMoveAnimationPresentation(effect.request, field, effect.age);
      expect(call()).not.toBeNull();
      for (const side of ["player", "opponent"] as const) {
        expect(call({ ...view.field, [side]: { ...view.field[side], personality: SHINY } } as never)).toBeNull();
      }
    }
  });

  // tools/integration/substRouteScan.ts (r3ProfileRouteSearch.ts 164 16 1 4000): seed 11 / streak 35, rentals[0] JYNX subs on turn 1 (slot 3).
  it("route 11/35 JYNX: the body is live on every age, the doll is shown from the next command on, Scene ON/OFF parity", () => {
    let bodyKey: string | null = null;
    const after: { doll: boolean; effect: string | null }[] = [];
    const on = generatedCommandAnimationReplay(11, "on", [3], 35, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting") return;
      const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
      if (command?.type === "move-animation" && command.animation?.moveId === 164 && command.animation.attacker === 0) {
        bodyKey = key;
        return;
      }
      if (bodyKey === null || key === bodyKey || after.length > 0) return;
      const view = createBattleResolutionPresentationRenderView(r);
      after.push({ doll: view.field.player.substituteDoll === true, effect: view.effect?.type ?? null });
    });
    const off = generatedCommandAnimationReplay(11, "off", [3], 35, true, true);
    const bodies = on.animations.filter((a) => a.moveId === 164 && a.attacker === 0);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]!.ages).toEqual(iu120Ages(164, 87));
    expect(bodies[0]!.adapterActive.every(Boolean)).toBe(true);
    // Hand-off: the first frame of the next command shows the doll (applySubstituteDollCommand), not the mon.
    expect(after[0]?.doll).toBe(true);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(off.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectOnOffParity(on, off);
  }, 240000);
});
