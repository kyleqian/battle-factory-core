// aud242l: the move-animation SEs behind the Blizzard snowball / ice crystal lifetimes, which depend on both battlers' pic Y (tools/extract/extract-anim-sound-timing.ts, aud242l block;
// docs/aud242-move-anim-sounds.md section 16). Fixtures are committed oracle output of tools/audio/soundEventProbe.py (stepping mode) and carry the replay trace; no emulator is needed.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { blizzardImpactStartAge } from "../src/animation/blizzard.ts";
import timingData from "../src/data/gen/anim-sound-timing.json" with { type: "json" };

interface FixtureEvent {
  frame: number;
  kind: string;
  id: number | null;
  pan: number | null;
  noop?: boolean;
}
interface Fixture {
  frames: number;
  events: FixtureEvent[];
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/aud242l-${name}.json`, import.meta.url), "utf8")) as Fixture;

const OTHER_SES = [5, 12, 13, 14, 16, 90, 239, 245];
const isMoveSe = (e: FixtureEvent | SoundEvent): boolean => e.kind === "se" && !OTHER_SES.includes(e.id as number);
const row = (e: FixtureEvent | SoundEvent): string => `${e.frame}:${e.id}:${e.pan}`;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function ourEvents(rom: Fixture): SoundEvent[] {
  const { appStage } = rom.trace;
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (appStage !== undefined && appStage.frame === 0) state = APP_STAGES[appStage.id]!(state);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}

const BLIZZARD_SES = [153, 154, 137];
const SPECS: Array<{ name: string; delta: number }> = [
  { name: "blizzard-fearow-bulbasaur-opponent", delta: 2 },
  { name: "blizzard-bulbasaur-charizard-opponent", delta: 2 },
  { name: "blizzard-bulbasaur-bulbasaur-opponent", delta: 2 },
  { name: "blizzard-bulbasaur-fearow-player", delta: 2 },
];

describe("move-animation SEs of the aud242l Blizzard lifetimes", () => {
  for (const { name, delta } of SPECS) {
    it(`${name}: panse, SE_M_BLIZZARD2 and 11 ICY_WIND rows at ROM = ours + ${delta}`, () => {
      const rom = fixture(name);
      const ours = ourEvents(rom).filter((e) => isMoveSe(e) && BLIZZARD_SES.includes(e.id as number));
      const theirs = rom.events.filter((e) => e.noop !== true && isMoveSe(e) && BLIZZARD_SES.includes(e.id as number));
      expect(theirs).toHaveLength(13);
      expect(ours.map(row)).toEqual(theirs.map((e) => row({ ...e, frame: e.frame - delta })));
    });
  }
});

// The extractor's own walk of the two sprite chains (tools/extract/extract-anim-sound-timing.ts) against the visual port's ROM-validated chains (src/animation/blizzard.ts):
// for every (attacker pic Y, target pic Y) class the first ICY_WIND row follows the panse row by the port's impact age minus the panse age (45).
describe("Blizzard pic Y classes of the sound timing table", () => {
  const table = timingData as unknown as {
    picYs: number[][];
    picGrids: number[][];
    variants: Array<Array<{ op: string; frame: number; id: number | null }>>;
    moves: Array<{ label: string; variants: number[]; pic?: number[] }>;
  };
  const blizzard = table.moves.find((m) => m.label === "Move_BLIZZARD")!;
  const center = [{ x: 72, y: 80 }, { x: 176, y: 40 }] as const;
  for (const side of [0, 1] as const) {
    it(`${side === 0 ? "player" : "opponent"} attacker: every class's ICY_WIND start equals the visual port's impact age`, () => {
      const [attackerYs, targetYs] = [table.picYs[side]!, table.picYs[1 - side]!];
      const grid = table.picGrids[blizzard.pic![side]!];
      let checked = 0;
      attackerYs.forEach((attackerY, i) => targetYs.forEach((targetY, j) => {
        const ops = table.variants[grid === undefined ? blizzard.variants[side]! : grid[i * targetYs.length + j]!]!;
        const panse = ops.find((o) => o.op === "panse")!;
        const icy = ops.filter((o) => o.op === "playsewithpan" && o.id === 137);
        expect(icy).toHaveLength(11);
        const impact = blizzardImpactStartAge(side === 0 ? "player" : "opponent", { attackerCenter: { x: center[side].x, y: attackerY }, targetCenter: { x: center[1 - side].x, y: targetY } });
        expect(icy[0]!.frame - panse.frame).toBe(impact - 45);
        checked += 1;
      }));
      expect(checked).toBe(attackerYs.length * targetYs.length);
    });
  }
  it("the two sides' grids are not all-equal for the opponent attacker and collapse for the player attacker", () => {
    expect(blizzard.pic![0]).toBe(-1);
    expect(new Set(table.picGrids[blizzard.pic![1]!]).size).toBeGreaterThan(10);
  });
});
