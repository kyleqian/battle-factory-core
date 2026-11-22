// aud249: the SEs of the General_* / Status_* animations the live presentation runs (status conditions, weather continues), Scene ON only.
// Fixtures are committed oracle output of tools/audio/soundEventProbe.py (the Scene ON flatter / swagger windows contain two Status_Confusion plays); needs no emulator.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import timing from "../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { moveAnimOpRows, type TimedOp } from "../src/engine/moveAnimSounds.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator" | "canonical-recorded"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES, labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
  labBackedStage: (scenario: string, state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>;
};

const CONFUSION = 176;
const load = (name: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;

function ourEvents(rom: Fixture, scene: "on" | "off"): SoundEvent[] {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: scene });
  if (rom.trace.appStage !== undefined && rom.trace.appStage.frame === 0) {
    const stage = APP_STAGES[rom.trace.appStage.id];
    state = stage !== undefined ? stage(state) : labBackedStage(`${rom.trace.appStage.id}.json`, state);
  }
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}

const variant = (label: string, side: 0 | 1): readonly TimedOp[] => timing.general.find((g) => g.label === label) === undefined ? [] : (timing.variants[timing.general.find((g) => g.label === label)!.variants[side]!] as unknown as TimedOp[]);

describe("General / Status animation sound table (aud249)", () => {
  it("decodes the status conditions and the weather continues scripts, both attacker sides", () => {
    const poison = variant("Status_Poison", 0)[0]!;
    expect([poison.op, poison.id, poison.wait, poison.times]).toEqual(["loopsewithpan", 148, 13, 6]);
    expect(variant("Status_Confusion", 1)[0]!.id).toBe(CONFUSION);
    expect(variant("Status_Burn", 0)[0]!.id).toBe(144);
    expect(variant("Status_Paralysis", 0)[0]!.id).toBe(119);
    expect(variant("Status_Sleep", 0)[0]!.id).toBe(197);
    expect(variant("Status_Infatuation", 0).map((o) => o.id)).toEqual([212, 212, 212]);
    expect(variant("Status_Freeze", 0).map((o) => o.id)).toEqual([137, 242]);
    expect(variant("General_Rain", 0)[0]!.id).toBe(127);
    expect(variant("General_CastformChange", 0).map((o) => o.id)).toEqual([203, 204]);
    expect(variant("General_HeldItemEffect", 0)[0]!.id).toBe(152);
  });

  it("the status / General launches loop at wait + 1 for every gap (ROM confusion rows are 14 apart); a move body keeps its first gap at wait", () => {
    const op = variant("Status_Confusion", 0)[0]!;
    const ctx = { attackerSide: "opponent", targetSide: "opponent", statusAnimActive: true } as const;
    expect(moveAnimOpRows(op, ctx, true).map((r) => r.offset)).toEqual([0, 14, 28, 42, 56, 70]);
    expect(moveAnimOpRows(op, ctx).map((r) => r.offset)).toEqual([0, 13, 27, 41, 55, 69]);
  });

  it("statusAnimActive forces every pan to the animated battler's side", () => {
    const op = variant("Status_Infatuation", 0)[0]!;
    const rows = moveAnimOpRows(op, { attackerSide: "player", targetSide: "player", statusAnimActive: true });
    expect(rows[0]!.emission.pan).toBe(-64);
    expect(moveAnimOpRows(op, { attackerSide: "opponent", targetSide: "opponent", statusAnimActive: true })[0]!.emission.pan).toBe(63);
  });

  // ROM frame minus ours of the animation's first row, per window and play. sta5: the status script age is 0 (the ROM's gAnimScriptActive rise row) behind an STA5 body, 7 elsewhere;
  // the Flatter / Swagger / Spore / Toxic bodies carry their script lead + tail and the stat-print -> launch message holds its 6 rows (docs/aud249-general-anim-sounds.md sta4 / sta5). What is left of the
  // confusion windows is the 2 pre-print rows (sta5 step 3, deferred: the sound clock must be decoupled first). sta3: the second play lands on the first play's residual (second == first),
  // tests/sta3PreMoveStatusTiming.test.ts.
  const WINDOWS: ReadonlyArray<{ name: string; first: number; second: number }> = [
    { name: "aud242c-flatter-player", first: 0, second: 0 },
    { name: "aud242f-swagger-player", first: 0, second: 0 },
  ];
  for (const { name, first, second } of WINDOWS) {
    it(`${name}: both confusion plays have the ROM's six rows (id, pan, 14-frame spacing) at ${first} / ${second} frames residual`, () => {
      const rom = load(name);
      const theirs = rom.events.filter((e) => e.noop !== true && e.kind === "se" && e.id === CONFUSION);
      const ours = ourEvents(rom, "on").filter((e) => e.kind === "se" && e.id === CONFUSION);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(theirs.map((e) => `${e.id}:${e.pan}`));
      const gaps = (rows: Array<{ frame: number }>) => rows.slice(1, 6).map((r, i) => r.frame - rows[i]!.frame);
      expect(gaps(ours)).toEqual([14, 14, 14, 14, 14]);
      expect(gaps(theirs)).toEqual([14, 14, 14, 14, 14]);
      expect(gaps(ours.slice(6))).toEqual(gaps(theirs.slice(6)));
      expect(theirs[0]!.frame - ours[0]!.frame).toBe(first);
      expect(theirs[6]!.frame - ours[6]!.frame).toBe(second);
    });
  }

  // psn2: the script's `end` waits for the loopsewithpan task (battle_anim.c:482), so a 6th Status_Poison SE 148 past the 71-row window plays on the age-7 path (docs/aud249 psn1 / psn2);
  // behind the Toxic body (age 0) it is age 70 of 71, inside the window.
  it("aud242e-toxic-player: the poison tick plays the ROM's six SE 148 rows at the 14-frame spacing (the 6th is age 70 of the 71-frame window), exact vs ROM (sta5; was first row +10)", () => {
    const rom = load("aud242e-toxic-player");
    const theirs = rom.events.filter((e) => e.noop !== true && e.kind === "se" && e.id === 148 && e.frame >= 270);
    const ours = ourEvents(rom, "on").filter((e) => e.kind === "se" && e.id === 148 && e.frame >= 270);
    expect(theirs.map((e) => e.frame)).toEqual([296, 310, 324, 338, 352, 366]);
    expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(theirs.map((e) => `${e.id}:${e.pan}`));
    expect(ours.map((e) => e.frame)).toEqual(theirs.map((e) => e.frame));
  });
  // hit2: General_Hail plays on the body's own clock like General_Sandstorm (sst1); on the move-body clock its ten SE 242 rows were all 8 late (lab etp1-hail-on, ROM frames 767 + 9n).
  it("hit2-hail-on: the end-turn Hail's ten SE 242 rows are the ROM's (767 + 9n), exact (was +8)", () => {
    const rom = load("hit2-hail-on");
    const theirs = rom.events.filter((e) => e.noop !== true && e.kind === "se" && e.id === 242 && e.frame >= 700);
    const ours = ourEvents(rom, "on").filter((e) => e.kind === "se" && e.id === 242 && e.frame >= 700);
    expect(theirs.map((e) => e.frame)).toEqual([767, 776, 785, 794, 803, 812, 821, 830, 839, 848]);
    expect(ours.map((e) => `${e.frame}:${e.pan}`)).toEqual(theirs.map((e) => `${e.frame}:${e.pan}`));
  });
});
