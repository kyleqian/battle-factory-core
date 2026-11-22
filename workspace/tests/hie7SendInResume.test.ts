// hie7 (docs/aud251-s11-scoreboard-refresh.md "hie7"): the segment after the player's forced send-in starts on the ROM's exec row, 6 frames before the action
// prompt (hie6m / g180m / t68m: item exec / next print at B + D + 11 against the prompt's B + D + 17), and the controller is idle there, so the held-item
// restart lead and the Leech Seed drain launch lag (LEECH_SEED_DRAIN_SCRIPT_AGE stays 7 elsewhere) do not apply.  Hermetic.
import { describe, expect, it } from "vitest";
import {
  BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES, LEECH_SEED_DRAIN_BODY_START_AGE, LEECH_SEED_DRAIN_SCRIPT_AGE, playerFaintReplacementSendOutTimingOfSegment,
} from "../src/engine/battleResolutionPresentationRender";
import { sceneOnPlayerForcedSwitchInDuration } from "../src/engine/switchInTail";
import { HELD_ITEM_EFFECT_AFTER_SEND_IN_LEAD_FRAMES, HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES } from "../src/engine/battleResolutionPresentation";
import { LEECH_SEED_DRAIN_SCRIPT_AGE as MOVE_ANIM_SOUNDS_AGE } from "../src/engine/moveAnimSounds";

const segmentWith = (rest: any[]): any => ({
  beforeRules: { rulesContext: { hitMarker: 0 } },
  commands: [
    { type: "message", lines: ["Go! YANMA!"] },
    { type: "switch-in", battler: 0, incoming: { species: 193, name: "YANMA", personality: 0 } },
    ...rest,
  ],
});
const heldItem = { type: "held-item-effect" };
const turnEnd = { type: "turn-end", timing: { minimumFrames: 40 } };

describe("hie7: the post-send-in resume lead", () => {
  const bare = playerFaintReplacementSendOutTimingOfSegment(segmentWith([]))!;

  it("a bare action prompt after the send-in keeps the ROM prompt (readyAt unchanged)", () => {
    expect(bare).not.toBeNull();
    expect(bare.readyAt).toBe(91 + "YANMA".length + sceneOnPlayerForcedSwitchInDuration(193, 0) + 17);
  });

  it("any other continuing script resumes 6 frames before the prompt", () => {
    for (const rest of [[heldItem], [{ type: "general-animation", animation: "LEECH_SEED_DRAIN" }], [heldItem, turnEnd]]) {
      const t = playerFaintReplacementSendOutTimingOfSegment(segmentWith(rest))!;
      expect(t.readyAt, JSON.stringify(rest.map((c) => c.type))).toBe(bare.readyAt - 6);
    }
  });

  it("a lone turn-end keeps its own frames + handoff lead (not the 6-frame lead)", () => {
    const t = playerFaintReplacementSendOutTimingOfSegment(segmentWith([turnEnd]))!;
    expect(t.readyAt).toBe(bare.readyAt - (40 + BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES));
  });

  it("an opponent switch-in has no player send-in clock", () => {
    const s = segmentWith([heldItem]);
    s.commands[1].battler = 1;
    expect(playerFaintReplacementSendOutTimingOfSegment(s)).toBeNull();
  });
});

describe("hie7: no controller-launch lag after the send-in", () => {
  it("the held-item restart lead is 0 after the send-in against 15 elsewhere; the drain age constant stays 7 globally", () => {
    expect(HELD_ITEM_EFFECT_AFTER_SEND_IN_LEAD_FRAMES).toBe(0);
    expect(HELD_ITEM_EFFECT_RESTART_LEAD_FRAMES).toBe(15);
    expect(LEECH_SEED_DRAIN_SCRIPT_AGE).toBe(7);
    expect(MOVE_ANIM_SOUNDS_AGE).toBe(7);
    expect(LEECH_SEED_DRAIN_BODY_START_AGE).toBe(21);
  });
});
