import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, liveMoveAnimationDuration, liveMoveAnimationPresentation, liveMoveSubstituteDollDeclines,
} from "../src/engine/liveMoveAnimation.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

// S10A Substitute part 2 (docs/next-adapters-prep37.md s3b): every live adapter declines (fallback) while the displayed
// defender or attacker is the Substitute doll. Routes from tools/integration/substRouteScan.ts over the
// r3ProfileRouteSearch.ts 164 16 1 4000 candidates (rentals[0] knows Substitute; turn 1 = Substitute, then slot + 1).
const withoutDolls = (f: BattleResolutionDisplayedField): BattleResolutionDisplayedField => {
  const { substituteDoll: _p, ...player } = f.player;
  const { substituteDoll: _o, ...opponent } = f.opponent;
  return { player, opponent };
};

type Seen = { request: string; direction: "attacker" | "defender" | null; declined: boolean; liveWithoutDoll: boolean; ages: number };
function route(seed: number, streak: number, slots: readonly (0 | 1 | 2 | 3)[], scene: "on" | "off") {
  const seen: Seen[] = [];
  let key = "";
  const run = generatedCommandAnimationReplay(seed, scene, slots, streak, true, true, (state) => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    if (command?.type !== "move-animation" || !command.animation) return;
    const view = createBattleResolutionPresentationRenderView(r);
    const a = command.animation;
    const current = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    if (current !== key) {
      key = current;
      const doll = (b: number) => (b === 0 ? view.field.player : view.field.opponent).substituteDoll === true;
      seen.push({
        request: `${a.moveId}:${a.attacker}->${a.target}`,
        direction: doll(a.attacker) ? "attacker" : doll(a.target) ? "defender" : null,
        declined: liveMoveAnimationDuration(a, view.field) === null,
        liveWithoutDoll: liveMoveAnimationDuration(a, withoutDolls(view.field)) !== null,
        ages: 0,
      });
    }
    const effect = view.effect?.type === "move" ? view.effect : null;
    if (effect && liveMoveSubstituteDollDeclines(effect.request, view.field)) {
      expect(liveMoveAnimationPresentation(effect.request, view.field, effect.age, effect.paletteInput,
        effect.spriteAllocatorInput, effect.spriteOrderInput)).toBeNull();
    }
    seen.at(-1)!.ages += 1;
  });
  return { run, seen };
}

const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};
function expectParity(on: ReturnType<typeof route>["run"], off: ReturnType<typeof route>["run"]) {
  expect(on.stalled).toBe(off.stalled);
  expect(off.boundaries).toHaveLength(on.boundaries.length);
  for (let i = 0; i < on.boundaries.length; i += 1) {
    expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
    expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
    expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
  }
  expect(on.state.facilityState).toEqual(off.state.facilityState);
  expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
}

describe("live adapters decline while the Substitute doll is shown", () => {
  it("unit: either side flagged declines every request direction (duration and presentation)", () => {
    const { run } = route(11, 35, [3], "on");
    const mon = run.state.battleCommandPresentation!.field;
    const plain = withoutDolls(mon);
    const req = (attacker: 0 | 1): BattleMoveAnimationRequest => ({ moveId: 188, attacker, target: attacker === 0 ? 1 : 0, turn: 0 } as unknown as BattleMoveAnimationRequest);
    expect(LIVE_MOVE_ANIMATION_IDS).toContain(188);
    for (const attacker of [0, 1] as const) {
      expect(liveMoveSubstituteDollDeclines(req(attacker), plain)).toBe(false);
      expect(liveMoveAnimationDuration(req(attacker), plain)).not.toBeNull();
      for (const flagged of ["player", "opponent"] as const) {
        const field = { ...plain, [flagged]: { ...plain[flagged], substituteDoll: true } } as BattleResolutionDisplayedField;
        expect(liveMoveSubstituteDollDeclines(req(attacker), field)).toBe(true);
        expect(liveMoveAnimationDuration(req(attacker), field)).toBeNull();
        expect(liveMoveAnimationPresentation(req(attacker), field, 0)).toBeNull();
      }
    }
  }, 240000);

  it.each([
    // Defender: the opponent's Sludge Bomb (live 188) hits the player's doll; the doll breaks (fade message) the same turn.
    ["JYNX 11/35 defender", 11, 35, [3, 0, 0] as const, "188:1->0", "defender" as const],
    // Attacker (player): CRADILY subs on turn 1 (after the opponent's Rain Dance), then Solar Beam (live 76) from behind the doll.
    ["CRADILY 144/35 player attacker", 144, 35, [0, 1, 1] as const, "76:0->1", "attacker" as const],
    // Attacker (opponent): the opponent JYNX subs too and uses Solar Beam (live 76) from behind its doll.
    ["JYNX 87/35 opponent attacker", 87, 35, [3, 0, 0] as const, "76:1->0", "attacker" as const],
  ])("route %s: the live body declines to the fallback, the battle reaches the next prompt, Scene ON/OFF parity", (_n, seed, streak, slots, request, direction) => {
    const on = route(seed, streak, slots, "on");
    const off = route(seed, streak, slots, "off");
    const hit = on.seen.find((s) => s.request === request && s.direction === direction)!;
    expect(hit).toBeDefined();
    expect(hit.declined).toBe(true);
    // The same request with the doll removed would have been live: the decline is the doll's.
    expect(hit.liveWithoutDoll).toBe(true);
    // Every doll-involved body declined; every other live body is unaffected by the gate.
    for (const s of on.seen) expect(s.direction === null ? true : s.declined).toBe(true);
    expect(on.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(off.run.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expectParity(on.run, off.run);
  }, 240000);
});
