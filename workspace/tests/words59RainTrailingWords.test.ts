import { describe, expect, it } from "vitest";
import { GENERAL_RAIN_RANDOM2_PLAN, tickLiveMovePresentationRngSession } from "../src/engine/liveMovePresentationRng.ts";
import {
  advancePresentationRngHost, createPresentationRngSession, presentationRngBodyWords, presentationRngPlanWords, type PresentationRngSession,
} from "../src/engine/presentationRngHost.ts";
import { generalAnimationPresentationRngKey } from "../src/engine/wordsOrderUnits.ts";

// S10A words59 (docs/next-adapters-words59.md (5)): a RAIN_CONTINUES event AFTER its resolution's last command (the end-turn rain after the
// turn's final message, e.g. census battle 52 `general:8:0:87` after `message@86`) had no command at or after it, so the tick seam never
// recorded its sub-stream and every later consumer of its marker declined ("words null"). It is now recorded at that final command's
// activation (where the order host applies the segment's trailing events); trailing events of an EARLIER segment keep the next segment's
// first command (their words do not move).
const ev = (sequence: number, kind: string, extra: object = {}) => Object.freeze({ sequence, payload: { kind, ...extra } });
const rain = (sequence: number) => ev(sequence, "animation", { animationId: "RAIN_CONTINUES", battler: 0, target: 0, arguments: [] });
type Segment = { events: object[]; commands: { type: string; eventSequence: number }[] };
const presenting = (segments: Segment[], segmentIndex: number, commandIndex: number, phaseElapsed: number) => ({ activeBattleCallStart: 7,
  battleResolutionPresentation: { resolutionId: { requestId: 3 }, segmentIndex, commandIndex, segments,
    lifecycle: { phase: "presenting", phaseElapsed } } }) as never;
const run = (segments: Segment[], schedule: [number, number, number][]) => {
  let session: PresentationRngSession = createPresentationRngSession(0x808db3eb);
  const hosts = [];
  for (const [segmentIndex, commandIndex, elapsed] of schedule) {
    const before = session.host;
    session = tickLiveMovePresentationRngSession(session, presenting(segments, segmentIndex, commandIndex, elapsed));
    hosts.push({ before, after: session.host! });
  }
  return { session, hosts };
};

describe("words59: the tick seam records a RAIN_CONTINUES that trails the resolution's last command", () => {
  it("one segment: recorded once at the final command's activation, from the stepped state, consuming nothing", () => {
    const segments = [{ events: [ev(85, "switch-in"), ev(86, "message"), rain(87)],
      commands: [{ type: "switch-in", eventSequence: 85 }, { type: "message", eventSequence: 86 }] }];
    const key = generalAnimationPresentationRngKey(3, 0, 87);
    const schedule: [number, number, number][] = [[0, 0, 0], [0, 0, 1], [0, 0, 2], [0, 1, 0], [0, 1, 1], [0, 1, 2]];
    const { session, hosts } = run(segments, schedule);
    expect(presentationRngBodyWords(hosts[2]!.after, key)).toBeNull(); // not before the final command
    const at = hosts[3]!, stepped = advancePresentationRngHost(at.before!);
    expect(at.after.state).toEqual(stepped.state); // the per-frame step only: nothing scheduled, nothing drawn
    expect(presentationRngBodyWords(at.after, key)).toEqual(presentationRngPlanWords(stepped.state, GENERAL_RAIN_RANDOM2_PLAN));
    expect(hosts[5]!.after.bodies).toBe(at.after.bodies); // re-ticks / repaints never re-record
    expect(session.host!.bodies.map((b) => b.key)).toEqual([key]);
  });

  it("two segments: a rain trailing segment 0 still waits for segment 1's first command (existing words unchanged)", () => {
    const segments = [{ events: [ev(40, "message"), rain(41)], commands: [{ type: "message", eventSequence: 40 }] },
      { events: [ev(50, "message"), rain(51)], commands: [{ type: "message", eventSequence: 50 }, { type: "message", eventSequence: 52 }] }];
    const first = generalAnimationPresentationRngKey(3, 0, 41), second = generalAnimationPresentationRngKey(3, 1, 51);
    const { hosts } = run(segments, [[0, 0, 0], [0, 0, 1], [1, 0, 0], [1, 0, 1], [1, 1, 0]]);
    expect(presentationRngBodyWords(hosts[1]!.after, first)).toBeNull(); // segment 0's final command is not the resolution's last
    expect(presentationRngBodyWords(hosts[2]!.after, first))
      .toEqual(presentationRngPlanWords(advancePresentationRngHost(hosts[2]!.before!).state, GENERAL_RAIN_RANDOM2_PLAN));
    expect(presentationRngBodyWords(hosts[3]!.after, second)).toBeNull(); // between commands 50 and 52: the first command after it
    expect(presentationRngBodyWords(hosts[4]!.after, second)).not.toBeNull();
  });
});
