// pfr192 (ISSUES #146 remainder; docs/pfr192-player-faint-replacement-production.md): the PLAYER faint-replacement send-in clock is keyed on
// (species, nickname length, nature, scene) instead of partySelect's fixed MAGBY SEND OUT clock.  ROM = the pfr185 fixtures (11 cases x 2 scenes + MAGBY).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay";
import { switchInTiming, SWITCH_IN_SPAN_FRAMES } from "../src/engine/battleResolutionPresentation";
import {
  partySendOutBattleMenuReady, partySendOutPhase, partySendOutReleaseClock, PARTY_SENDOUT_ACTION_MENU_START, PARTY_SENDOUT_BLANK_MESSAGE_START,
  PARTY_SENDOUT_DEFAULT_TIMING,
} from "../src/engine/partySelect";
import { playerFaintReplacementSendOutTiming, sceneOffPlayerForcedSwitchInDuration, sceneOnPlayerForcedSwitchInDuration } from "../src/engine/switchInTail";
import { playerFaintReplacementSendOutTimingOfSegment } from "../src/engine/battleResolutionPresentationRender";

const dir = "tools/integration/fixtures/pfr185";
const rom = [...JSON.parse(readFileSync(`${dir}/rom-rows-r1.json`, "utf8")), ...JSON.parse(readFileSync(`${dir}/magby-rom-rows-r1.json`, "utf8"))] as any[];
const edge = new Map([...JSON.parse(readFileSync(`${dir}/confirm-edge.json`, "utf8")), ...JSON.parse(readFileSync(`${dir}/magby-confirm-edge.json`, "utf8"))].map((e: any) => [e.key, e]));
const timingOf = (id: string, scene: "on" | "off", following = 14) => {
  const r = rom.find((row) => row.id === id && row.scene === scene)!;
  const e = edge.get(`${id}-${scene}`)!;
  const t = playerFaintReplacementSendOutTiming({
    species: r.case.species, nameLength: e.ballFromConfirm - 91, personality: r.case.nature ?? 6, sceneOn: scene === "on", followingFrames: following, goTextChars: 10,
  });
  return { t, e, r };
};

describe("pfr192: keyed player faint-replacement send-in clock vs the ROM", () => {
  it("the first action-menu frame equals the ROM action prompt in all 24 rows (11 cases + MAGBY, both scenes)", () => {
    expect(rom).toHaveLength(24);
    for (const r of rom) {
      const { t, e } = timingOf(r.id, r.scene);
      expect(t.readyAt + 14, `${r.id} ${r.scene}`).toBe(e.promptFromConfirm);
      expect(t.blankStart, `${r.id} ${r.scene} blank = ROM next print + 1 (render lag)`).toBe(e.nextTxtFromConfirm + (r.id.startsWith("castform") ? 0 : 1));
    }
  });

  it("MAGBY Scene ON: the prompt is frame 311 from the SEND OUT confirm, the clock is ready at 297 (turn-end 8 + handoff 6 inside it)", () => {
    const { t, e } = timingOf("magby-n6", "on");
    expect(e.promptFromConfirm).toBe(311);
    expect(t).toMatchObject({ ballShift: 0, releaseExtra: 0, readyAt: 297, blankStart: 305, goTextChars: 10 });
    expect(partySendOutBattleMenuReady(296, t)).toBe(false);
    expect(partySendOutBattleMenuReady(297, t)).toBe(true);
    expect(partySendOutPhase(296, t)).toBe("battleFadeIn");
    expect(partySendOutPhase(297, t)).toBe("actionMenu");
    expect(t.blankStart).toBe(305);
  });

  it("TORKOAL: Scene OFF is floor/cry-bound (208), Scene ON is back-animation-bound (313) and nature does not move OFF", () => {
    const off = timingOf("torkoal-n6", "off"); const on = timingOf("torkoal-n6", "on");
    expect(off.e.promptFromConfirm).toBe(208);
    expect(on.e.promptFromConfirm).toBe(313);
    expect(off.t.readyAt + 14).toBe(208);
    expect(on.t.readyAt + 14).toBe(313);
    for (const id of ["torkoal-n0", "torkoal-n10"]) expect(timingOf(id, "off").t.readyAt).toBe(off.t.readyAt);
    expect(on.t.ballShift).toBe(2);
  });

  it("CASTFORM: the whole post-spawn timeline runs one frame late (ball shift 3 + release extra 1); blank start is the ROM next print itself", () => {
    const off = timingOf("castform-n6", "off"); const on = timingOf("castform-n6", "on");
    expect([off.t.ballShift, off.t.releaseExtra, on.t.ballShift, on.t.releaseExtra]).toEqual([3, 1, 3, 1]);
    expect([off.e.promptFromConfirm, on.e.promptFromConfirm]).toEqual([219, 274]);
    expect([off.t.readyAt + 14, on.t.readyAt + 14]).toEqual([219, 274]);
    expect([off.t.blankStart, on.t.blankStart]).toEqual([213, 268]);
    expect(partySendOutReleaseClock(100, on.t)).toBe(100 - 3 - 1);
  });

  it("a segment that continues with more than `turn-end` keeps the whole clock to the segment's own tail (followingFrames 0)", () => {
    const { t } = timingOf("magby-n6", "on", 0);
    expect(t.readyAt).toBe(311);
  });

  it("the default timing is still the canonical MAGBY constants (turn-15..17 trace paths do not pass a timing)", () => {
    expect(PARTY_SENDOUT_DEFAULT_TIMING).toMatchObject({ ballShift: 0, releaseExtra: 0, readyAt: PARTY_SENDOUT_ACTION_MENU_START, blankStart: PARTY_SENDOUT_BLANK_MESSAGE_START, goTextChars: 10 });
    expect([PARTY_SENDOUT_BLANK_MESSAGE_START, PARTY_SENDOUT_ACTION_MENU_START]).toEqual([305, 311]);
    expect(partySendOutBattleMenuReady(310)).toBe(false);
    expect(partySendOutBattleMenuReady(311)).toBe(true);
  });

  it("control: the voluntary switch-in and opponent replacement timing is unchanged", () => {
    expect(SWITCH_IN_SPAN_FRAMES).toBe(91);
    // vis243a: the voluntary player send-in now waits for the back animation (Scene ON) and the cry, like the forced one.
    expect(switchInTiming(0, 157, true, "TYPHLOSION")).toEqual({ minimumFrames: sceneOnPlayerForcedSwitchInDuration(157, 0) });
    expect(switchInTiming(0, 385, false, "CASTFORM")).toEqual({ minimumFrames: sceneOffPlayerForcedSwitchInDuration(385) });
    expect(switchInTiming(1, 16, false, "PIDGEY")).toMatchObject({ minimumFrames: expect.any(Number) });
  });

  it("real generated routes: the orchestrator's first action-menu frame from the SEND OUT confirm is 91 + name + D + 17 (YANMA OFF 227 / ON 270)", () => {
    for (const [scene, expected] of [["off", 227], ["on", 270]] as const) {
      let confirm: number | null = null; let menu: number | null = null; let fainted = false; let segTiming: ReturnType<typeof playerFaintReplacementSendOutTimingOfSegment> = null;
      try {
        generatedCommandAnimationReplay(9, scene, Array(10).fill(0) as never, 0, true, true, (state, frame) => {
          const r = state.battleResolutionPresentation; const bc = state.battleCommandPresentation;
          if (r && r.lifecycle.phase === "presenting") {
            const c: any = r.segments[r.segmentIndex]!.commands[r.commandIndex];
            if (c?.type === "faint" && c.battler === 0) fainted = true;
          }
          if (!fainted) return;
          if (r?.lifecycle.phase === "presenting-switch-in" && confirm === null) {
            confirm = frame; segTiming = playerFaintReplacementSendOutTimingOfSegment(r.segments[r.segmentIndex]!);
          }
          if (confirm !== null && bc?.lifecycle.phase === "action-menu") { menu = frame; throw new Error("done"); }
        });
      } catch { /* done */ }
      expect(confirm, scene).not.toBeNull();
      expect(menu! - confirm!, scene).toBe(expected);
      expect(segTiming!.readyAt + 14, scene).toBe(expected);
    }
  }, 120000);
});
