// snd145 (S10A, ISSUES #146 remainder; docs/send-in-tail-model.md, docs/snd145-send-in-tail-live.md): the generated species-keyed
// send-in tail (src/data/sendInTail.ts) pinned against the committed 339-species direct-mGBA sweep (two identical runs, Scene OFF;
// k = frames after the body end, send-in start = k10) and the committed source-extracted tables it was generated from.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SEND_IN_TAIL_ANIM_IDS,
  SEND_IN_TAIL_FRONT_ANIM_DURATION,
  SEND_IN_TAIL_SPECIES,
  sendInTail,
} from "../src/data/sendInTail.ts";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation.ts";
import {
  midBattleSwitchFadeAt,
  midBattleSwitchInAt,
  midBattleSwitchParticleSchedulesAt,
  midBattleSwitchSendInFadeAt,
  midBattleSwitchSendInParticlesAt,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { opponentSwitchInDuration, opponentSwitchInHealthboxSlideElapsed, sceneOnPlayerForcedSwitchInDuration } from "../src/engine/switchInTail.ts";

const FX = "tools/integration/fixtures";
const json = (path: string) => JSON.parse(readFileSync(`${FX}/${path}`, "utf8"));
type Row = { species: number; slide: number | null; txt: number | null };
function sweep(name: string): Row[] {
  return sweepAt(`forced-switch/${name}`);
}
function sweepAt(path: string): Row[] {
  const rows: Row[] = [];
  for (const line of readFileSync(`${FX}/${path}`, "utf8").split("\n")) {
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts[1] === "FAILED") continue;
    const field = (key: string) => {
      const m = new RegExp(`${key} (\\d+)`).exec(line);
      return m ? Number(m[1]) : null;
    };
    rows.push({ species: Number(parts[0]), slide: field("hbslide"), txt: field("txtStart") });
  }
  return rows;
}

describe("snd145 send-in tail table", () => {
  it("is the committed source tables (S, animId, delay) for every Factory species, with the fitted A", () => {
    const tables = json("send-in-tail/front-anim-tables.json") as Record<string, [string, number]>;
    const frames = json("send-in-tail/front-sprite-frames.json") as Record<string, number>;
    const ids = json("forced-switch/factory-species-ids.json") as number[];
    expect(Object.keys(SEND_IN_TAIL_SPECIES).length).toBe(376);
    for (const species of ids) {
      const [s, anim, delay] = SEND_IN_TAIL_SPECIES[species]!;
      expect([s, SEND_IN_TAIL_ANIM_IDS[anim], delay]).toEqual([frames[String(species)] ?? 0, ...tables[String(species)]!]);
    }
    // offs152 R5: ids no swept species dominated take the ported reducer's terminal tick + 1 (fixtures/offs152/anim-duration-terminal.json).
    expect({ ...SEND_IN_TAIL_FRONT_ANIM_DURATION })
      .toEqual({ ...json("offs152/anim-duration-terminal.json"), ...json("send-in-tail/anim-duration.json") });
  });

  it("offs152 R5: the 37 species the first sweep could not stage (27 genderless, 10 male-only; Scene ON, r1 == r2): 36 / 37", () => {
    const rows = [
      ...sweepAt("offs152/species-sweep-opponent-target-genderless-on.txt"),
      ...sweepAt("offs152/species-sweep-opponent-target-male-only-on.txt"),
    ];
    expect(rows.length).toBe(37);
    const wrong = rows.filter((r) => sendInTail(r.species, "opponent").slideStart !== r.slide! - 10
      || sendInTail(r.species, "opponent").messageStart !== r.txt! - 10);
    // UNOWN (201): the ROM is 6 frames earlier (slide 55 = the ZIGZAG_FAST callback; the staged letter form's frame animation is
    // shorter than sAnim_Unown_1's 61): form-dependent, not modelled.
    expect(wrong.map((r) => r.species)).toEqual([201]);
  });

  it("reproduces the opponent healthbox slide of all 338 swept species and the message start (slide + 26 or the measured cry-bound offset)", () => {
    const rows = sweep("species-sweep-opponent-target.txt").filter((r) => r.slide !== null);
    expect(rows.length).toBe(338);
    const slideMismatches = rows.filter((r) => sendInTail(r.species, "opponent").slideStart !== r.slide! - 10);
    expect(slideMismatches).toEqual([]);
    const withText = rows.filter((r) => r.txt !== null);
    const messageMismatches = withText.filter((r) => sendInTail(r.species, "opponent").messageStart !== r.txt! - 10);
    expect(messageMismatches).toEqual([]);
    // The closed form alone (slide + 26) holds for all but the 7 cry-bound species.
    expect(withText.filter((r) => r.txt! - r.slide! === 26).length).toBe(withText.length - 7);
    // Range: send-in +70 .. +234; spot checks over the frame-dominated / function-dominated / delayed / Castform classes.
    expect(Math.min(...rows.map((r) => r.slide! - 10))).toBe(70);
    expect(Math.max(...rows.map((r) => r.slide! - 10))).toBe(234);
    expect(sendInTail(385, "opponent").slideStart).toBe(sweep("species-sweep-opponent-target.txt").find((r) => r.species === 385)!.slide! - 10);
  });

  it("keeps the player slide constant (+65, Castform +66) and leaves the cry-bound player message unmodelled", () => {
    const rows = sweep("species-sweep-player-target.txt").filter((r) => r.slide !== null);
    expect(rows.length).toBe(339);
    expect(rows.filter((r) => sendInTail(r.species, "player").slideStart !== r.slide! - 10)).toEqual([]);
    expect(sendInTail(1, "player").messageStart).toBeNull();
  });
});

describe("snd145 live switch-in tail (R2 timing, R3 send-in fade / particles)", () => {
  // TAILLOW (function-dominated, 70 / 96: dense Scene ON 0 px), SPHEAL (frame-dominated, 234), SALAMENCE (delayed), TYPHLOSION
  // (delayed + cry-bound message +50), CASTFORM (+1).
  const cases: [number, number, number][] = [[304, 70, 96], [341, 234, 260], [397, 145, 171], [157, 95, 145], [385, 139, 165]];
  it("gives every opponent switch-in the species' slide start and duration; the player's window is the forced rule + 11 (vis243a) with slide 66", () => {
    for (const [species, slide, total] of cases) {
      expect([opponentSwitchInHealthboxSlideElapsed(species), opponentSwitchInDuration(species)]).toEqual([slide, total]);
      expect(switchInTiming(1, species).minimumFrames + SWITCH_IN_WAITSTATE_HOLD_FRAMES).toBe(total);
      expect(midBattleSwitchInAt(slide - 1, 1, slide).healthboxDx).toBeNull();
      expect(midBattleSwitchInAt(slide, 1, slide).healthboxDx).toBe(-110);
      expect(midBattleSwitchInAt(slide + 22, 1, slide).healthboxDx).toBe(0);
      // vis243a: the player send-in is back-animation / cry-bound too (Scene ON default), not the old calibrated 91.
      expect(switchInTiming(0, species)).toEqual({ minimumFrames: sceneOnPlayerForcedSwitchInDuration(species, 0) });
    }
    // Scene OFF skips the front animation (HITMARKER_NO_ANIMATIONS -> SKIP_FRONT_ANIM): the calibrated span stays.
    // offs152: Scene OFF opponent send-ins use the OFF tail (tests/offs152SendInTailOff.test.ts), not the calibrated 91-frame span.
    expect(switchInTiming(1, 341, false, "SPHEAL")).toEqual({ minimumFrames: 62 - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
    expect(midBattleSwitchInAt(33, 1).healthboxDx).toBe(-110);
    expect(midBattleSwitchInAt(65, 0).healthboxDx).toBeNull();
    expect(midBattleSwitchInAt(66, 0).healthboxDx).toBe(110);
  });

  it("keys the opponent send-in fade / particles to the switch-in elapsed (ROM: white in from 19, 8-frame plateau, no stolen tick)", () => {
    const bg = Array.from({ length: 60 }, (_, e) => midBattleSwitchSendInFadeAt(e, 1)?.bg ?? null);
    expect(bg.slice(16, 58)).toEqual([
      null, 0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14, 16, 16, 16, 16, 16, 16, 16, 16,
      14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0, 0,
    ]);
    expect(midBattleSwitchSendInFadeAt(30, 1)!.obj).toBe(0);
    expect(midBattleSwitchSendInParticlesAt(16, 1)).toBeNull();
    expect(midBattleSwitchSendInParticlesAt(19, 1)!.schedules.map((p) => [p.i, p.age])).toEqual([[0, 0]]);
    expect(midBattleSwitchSendInParticlesAt(43, 1)!.schedules.map((p) => p.i)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(midBattleSwitchSendInParticlesAt(44, 1)!.schedules.map((p) => p.i)).not.toContain(0);
    expect(midBattleSwitchSendInParticlesAt(59, 1)).toBeNull();
  });

  it("keeps the player send-in windows identical to the voluntary fixture's trace windows (switch-in starts at 1140)", () => {
    for (let e = 0; e < 102; e += 1) {
      const trace = 1140 + e;
      expect(midBattleSwitchSendInFadeAt(e, 0)).toEqual(trace >= 1187 ? midBattleSwitchFadeAt(trace) : null);
      const particles = midBattleSwitchSendInParticlesAt(e, 0);
      expect(particles?.schedules ?? null).toEqual(trace >= 1187 ? midBattleSwitchParticleSchedulesAt(trace, "send-in") : null);
    }
  });
});

describe("snd145 CASTFORM whole-send-in delay", () => {
  it("shifts CASTFORM's ball / fade / particles one frame (its slide / duration already carry the +1); other species 0", async () => {
    const { opponentSwitchInVisualDelay } = await import("../src/engine/switchInTail.ts");
    expect(opponentSwitchInVisualDelay(385)).toBe(1);
    expect([304, 341, 95, 397, 157].map(opponentSwitchInVisualDelay)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("snd145 opponent faint-replacement turn-end hold", () => {
  it("is 11 frames: the ROM draws the action menu 17 frames after the species' send-in tail (production's handoff shows 6 blank frames)", async () => {
    const { OPPONENT_FAINT_REPLACEMENT_TURN_END_FRAMES } = await import("../src/engine/battleResolutionPresentation.ts");
    const { BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES } = await import("../src/engine/battleResolutionPresentationRender.ts");
    expect(OPPONENT_FAINT_REPLACEMENT_TURN_END_FRAMES + BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES).toBe(17);
  });
});
