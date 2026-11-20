// hpb1 (frame catcher 2026-11-20, docs/fcp1-frame-catcher-pictures.md): the player's healthbox after a Pokemon is sent back in. Seed 3
// `full` (Scene ON): CHARMELEON is switched out for PHANPY, PHANPY faints to Petal Dance, CHARMELEON is sent back in, and next turn
// "CHARMELEON used AERIAL ACE!". The ROM shows CHARMELEON's healthbox the whole time (SwitchIn_TryShinyAnimShowHealthbox ->
// SetHealthboxSpriteVisible, battle_controller_player.c:1098-1112); ours hid it for ~1,000 frames because the render view replayed the
// voluntary switch's recall receipt (it hides the healthbox) from the turn's first segment but not the switch-in that showed it again.
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender";

const mon = (species: number, name: string, side: "player" | "trainer", battler: 0 | 1, partyIndex: number) => Object.freeze({
  species, name, side, battler, partyIndex, level: 50, hp: 105, maxHP: 151, gender: "male" as const, status: "none" as const,
  personality: 0, moveIds: [332, 332, 332, 332] as const, currentPP: [20, 20, 20, 20] as const, ppBonuses: 0,
});
const CHARMELEON = mon(5, "CHARMELEON", "player", 0, 0);
const PHANPY = mon(231, "PHANPY", "player", 0, 1);
const GLOOM = mon(44, "GLOOM", "trainer", 1, 0);

const message = (eventSequence: number, line: string) =>
  Object.freeze({ type: "message", eventSequence, lines: [line], advance: "automatic", noCursor: false, timing: { minimumFrames: 13, holdFrames: 0 } });
const switchIn = (eventSequence: number, incoming: typeof CHARMELEON, from: number, to: number) => Object.freeze({
  type: "switch-in", eventSequence, battler: 0, fromPartyIndex: from, toPartyIndex: to, incoming, incomingStatus1: 0,
  timing: switchInTiming(0, incoming.species, true, incoming.name, false, 0), settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES,
});
const recall = (eventSequence: number) =>
  Object.freeze({ type: "sprite-visibility", eventSequence, battler: 0, visible: false, recall: true, timing: { minimumFrames: 1 } });
const segment = (field: object, commands: readonly object[]) =>
  ({ field, beforeRules: { rulesContext: { hitMarker: 0 } }, afterRules: null, events: [], commands }) as never;

/** The turn's resolution: [voluntary switch + Petal Dance + PHANPY faints] [forced send-in of CHARMELEON] [next turn's Aerial Ace]. */
function resolution(sendBackIn: boolean) {
  const first = segment({ player: CHARMELEON, opponent: GLOOM }, [
    message(1, "CHARMELEON, come back!"), recall(2), message(3, "Go! PHANPY!"), switchIn(4, PHANPY, 0, 1),
    message(5, "Foe GLOOM used PETAL DANCE!"), Object.freeze({ type: "faint", eventSequence: 6, battler: 0, timing: { minimumFrames: 30 } }),
    message(7, "PHANPY fainted!"),
  ]);
  const replacement = segment({ player: PHANPY, opponent: GLOOM }, [
    message(8, "Go! CHARMELEON!"), ...(sendBackIn ? [switchIn(9, CHARMELEON, 1, 0)] : []), Object.freeze({ type: "turn-end", timing: { minimumFrames: 8 } }),
  ]);
  const next = segment({ player: CHARMELEON, opponent: GLOOM }, [message(10, "CHARMELEON used AERIAL ACE!")]);
  return { field: { player: CHARMELEON, opponent: GLOOM }, segments: [first, replacement, next] };
}

function playerVisibilityAt(sendBackIn: boolean, segmentIndex: number) {
  const { field, segments } = resolution(sendBackIn);
  const view = createBattleResolutionPresentationRenderView({
    field, segments, segmentIndex, commandIndex: 0, lifecycle: { phase: "presenting", phaseElapsed: 4 },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "switch" }, fadeTick: 0,
  } as never);
  return view.visibility.player;
}

describe("hpb1: a switch-in in an earlier segment of the turn shows the player's healthbox again", () => {
  it("after the voluntary switch, PHANPY's faint and CHARMELEON's send-in, the next turn's text draws CHARMELEON's healthbox", () => {
    expect(playerVisibilityAt(true, 2)).toEqual({ sprite: true, healthbox: true });
  });

  it("a recall with no switch-in after it still hides the healthbox in later segments (the recall receipt is not undone)", () => {
    const { field, segments } = resolution(false);
    const recallOnly = [segment(field, [message(1, "CHARMELEON, come back!"), recall(2)]), segments[2]];
    const view = createBattleResolutionPresentationRenderView({
      field, segments: recallOnly, segmentIndex: 1, commandIndex: 0, lifecycle: { phase: "presenting", phaseElapsed: 4 },
      confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "switch" }, fadeTick: 0,
    } as never);
    expect(view.visibility.player.healthbox).toBe(false);
  });
});
