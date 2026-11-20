// aud258: Seismic Toss (AnimTask_MoveSeismicTossBg exact 119 + the jumpreteq on AnimTask_GetSeismicTossDamageLevel resolved from the battle's damage; the extractor's damage grid).
// ROM windows = the committed aud242a/b/e fixtures whose opponent / player Seismic Toss (Weak: damage < 33 in those low-level labs) used to be ROM-only rows.
// See docs/aud242-move-anim-sounds.md section 24.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import timing from "../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator" | "canonical-recorded"; battleScene: "on" | "off"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const fixture = (file: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${file}.json`, import.meta.url), "utf8")) as Fixture;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>> };

function ourEvents(rom: Fixture): SoundEvent[] {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (rom.trace.appStage !== undefined) state = APP_STAGES[rom.trace.appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}
const seismic = (events: Array<{ frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }>) =>
  events.filter((e) => e.noop !== true && e.kind === "se" && (e.id === 214 || e.id === 131 || (e.id === 238 && e.pan === 0)));

describe("Seismic Toss (aud258)", () => {
  const entry = timing.moves[69]!;
  const variant = (index: number) => timing.variants[index]!;
  it("the table entry: SE 238 at frame 31 (after the BG fade), then the damage level's rocks; every level ends ungated", () => {
    expect(entry.label).toBe("Move_SEISMIC_TOSS");
    expect(entry.gated[0]).toBe(0);
    const grid = timing.damageGrids[(entry as { damage?: number[] }).damage![0]!]!;
    const rows = grid.map((v) => variant(v).map((o) => `${o.op}:${o.frame}:${(o as { id?: number }).id}`));
    const rock = (frame: number, id: number) => `playsewithpan:${frame}:${id}`;
    expect(rows[0]).toEqual([rock(31, 238), rock(151, 214), rock(169, 131)]);
    expect(rows[1]).toEqual([rock(31, 238), rock(151, 214), rock(167, 131), rock(183, 214)]);
    expect(rows[2]).toEqual([rock(31, 238), rock(151, 131), rock(163, 214), rock(175, 131), rock(187, 214)]);
  });
  const SPECS: Array<{ file: string; opening: number; offset: number }> = [
    { file: "aud242a-swordsdance-opponent", opening: 407, offset: 0 },
    { file: "aud242b-haze-player", opening: 435, offset: 3 },
    { file: "aud242e-counter-player", opening: 101, offset: 0 },
  ];
  for (const spec of SPECS) {
    it(`${spec.file}: the Weak rows (238, 214 at +120, 131 at +138) equal the ROM's in id / pan / gaps; ROM minus ours is ${spec.offset} on every row`, () => {
      const rom = fixture(spec.file);
      const romRows = seismic(rom.events);
      const ours = seismic(ourEvents(rom));
      expect(romRows.map((e) => e.id)).toEqual([238, 214, 131]);
      expect(romRows[0]!.frame).toBe(spec.opening);
      expect(romRows.map((e) => e.frame - spec.opening)).toEqual([0, 120, 138]);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
      expect(romRows.map((e, i) => e.frame - ours[i]!.frame)).toEqual([spec.offset, spec.offset, spec.offset]);
    });
  }

  // Own windows (tools/battle-lab/aud258-*-player-on.json): a Lv50 / Lv100 player Seismic Toss against a Lv12 Rattata (Medium: damage 50, Strong: 100), the engine's damage picks the level.
  const WINDOWS: Array<{ file: string; ids: number[]; gaps: number[]; offset: number }> = [
    { file: "aud258-seismictoss-player", ids: [238, 214, 131, 214], gaps: [0, 120, 136, 152], offset: 0 },
    { file: "aud258-seismictossstrong-player", ids: [238, 131, 214, 131, 214], gaps: [0, 120, 132, 144, 156], offset: 0 },
  ];
  for (const w of WINDOWS) {
    it(`${w.file}: the Medium / Strong rows follow the table's gaps in the ROM and the engine; ROM minus ours is ${w.offset} on every row`, () => {
      const rom = fixture(w.file);
      const romRows = seismic(rom.events);
      const ours = seismic(ourEvents(rom));
      expect(romRows.map((e) => e.id)).toEqual(w.ids);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual(w.gaps);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
      expect(romRows.map((e, i) => e.frame - ours[i]!.frame)).toEqual(romRows.map(() => w.offset));
    });
  }
});

describe("Torment (aud258)", () => {
  const entry = timing.moves.find((m) => m.move === 259)!;
  it("the table entry: SE 186 x6 from the task's steps (calls 1, 26, 51, 66, 81, 96), then SE 194 twice 129 after the first (the task's 128-tick lifetime) and 22 apart, all ungated", () => {
    expect(entry.variants.every((v) => v === entry.variants[0])).toBe(true);
    const rows = timing.variants[entry.variants[0]!]!.map((o) => `${o.op}:${o.frame}:${o.id}:${o.pan}`);
    expect(rows).toEqual([6, 31, 56, 71, 86, 101].map((f) => `playsewithpan:${f}:186:-64`).concat(["playsewithpan:135:194:63", "playsewithpan:157:194:63"]));
    expect((entry as unknown as { move: number }).move).toBe(259);
  });
  it("aud258-torment-player: the engine's eight rows have the ROM's ids / pans and gaps (25 / 25 / 15 / 15 / 15, 129 to the first SE 194, 22 between them)", () => {
    const rom = fixture("aud258-torment-player");
    const pick = (events: Array<{ frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }>) => events.filter((e) => e.noop !== true && e.kind === "se" && (e.id === 186 || e.id === 194));
    const romRows = pick(rom.events);
    const ours = pick(ourEvents(rom));
    expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 25, 50, 65, 80, 95, 129, 151]);
    expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
    expect(romRows.map((e, i) => e.frame - ours[i]!.frame)).toEqual(romRows.map(() => 0)); // lead4: -4 before the script lead was presented ahead of the body
  });

  it("Shock Wave table entry: ungated, the pic-Y grid holds three sweep classes (the SE 118 pair at +71 / +99 / +101 ...)", () => {
    const entry = timing.moves[351]! as unknown as { label: string; gated: number[]; pic: number[] };
    expect(entry.label).toBe("Move_SHOCK_WAVE");
    expect(entry.gated[0]).toBe(0);
    const rows = (v: number) => timing.variants[v]!.map((o) => `${o.op}:${o.frame}:${(o as { id?: number }).id}`);
    const classes = new Set(timing.picGrids[entry.pic[0]!]!.map((v) => rows(v).join(",")));
    expect([...classes].sort()).toEqual([
      "playsewithpan:30:213,task_shockwave_bolt:100:118,task_shockwave_bolt:128:118,playsewithpan:157:221",
      "playsewithpan:30:213,task_shockwave_bolt:101:118,task_shockwave_bolt:129:118,playsewithpan:158:221",
      "playsewithpan:30:213,task_shockwave_bolt:102:118,task_shockwave_bolt:130:118,playsewithpan:159:221",
    ]);
  });

  // Windows (tools/battle-lab/aud258-shockwave*-player-on.json): a Lv50 player Rattata (back pic Y 101: sweep class 364) and a Lv50 Blaziken (88: class 362) against a Lv12 Rattata. SE 213 (charge), the two
  // SE_M_THUNDERBOLT rows of AnimTask_ShockWaveProgressingBolt (the pans are the attacker / target pans split in three: -22, 20) and SE_M_TRI_ATTACK2 after the particle / orb / bolt wait.
  for (const w of [{ file: "aud258-shockwave-player", gaps: [0, 72, 100, 129] }, { file: "aud258-shockwavelow-player", gaps: [0, 70, 98, 127] }]) {
    it(`${w.file}: ids, pans and gaps equal the ROM's; ROM minus ours is 0 on every row`, () => {
      const rom = fixture(w.file);
      const pick = (events: FixtureEvent[]) => events.filter((e) => e.noop !== true && e.kind === "se" && [213, 118, 221].includes(e.id as number));
      const romRows = pick(rom.events);
      const ours = pick(ourEvents(rom));
      expect(romRows.map((e) => `${e.id}:${e.pan}`)).toEqual(["213:-64", "118:-22", "118:20", "221:63"]);
      expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual(w.gaps);
      expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
      expect(romRows.map((e, i) => e.frame - ours[i]!.frame)).toEqual([0, 0, 0, 0]);
    });
  }
});
