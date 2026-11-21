// aud252: SE_EFFECTIVE of the end-turn weather damage pans by gBattlerTarget (the first present battler: the player), not by the damaged battler.
// Fixture is committed oracle output of tools/audio/soundEventProbe.py (Scene ON Hail lab, 1500-frame window past both end-turn hits); no emulator is needed.
// See docs/aud251-s11-scoreboard-refresh.md "aud252".
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture {
  frames: number;
  events: FixtureEvent[];
  trace: { route: "generated-orchestrator" | "canonical-recorded"; battleScene: "on" | "off"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> };
}

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

const isEffective = (e: FixtureEvent | SoundEvent): boolean => e.kind === "se" && e.id === 13;

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

describe("end-turn weather damage SE_EFFECTIVE (aud252)", () => {
  const rom = JSON.parse(readFileSync(new URL("../tools/audio/fixtures/aud252-hail-damage-player.json", import.meta.url), "utf8")) as Fixture;
  const theirs = rom.events.filter((e) => e.noop !== true && isEffective(e));

  it("the ROM pans both hail hits to the player (-64), the second one damages the opponent", () => {
    expect(theirs.map((e) => `${e.frame}:${e.pan}`)).toEqual(["579:-64", "988:-64", "1136:-64"]);
  });

  it("we play the same three rows with the same pans", () => {
    const ours = ourEvents(rom).filter(isEffective);
    expect(ours.map((e) => e.pan)).toEqual(theirs.map((e) => e.pan));
    // etp2: all three rows are ROM-exact (ROM minus ours 0 / 0 / 0). The weather-loop hit SE is 3 ticks after our hit command (ROM: the row before its hitanimation, which our command precedes by 3 rows),
    // see battleHitSounds WEATHER_LOOP_HIT_SE_AFTER_COMMAND_ROWS; Scene OFF (etp1-hail-off, ROM 262 / 514 / 662) is exact too.
    expect(ours.map((e, i) => theirs[i]!.frame - e.frame)).toEqual([0, 0, 0]);
  });
});
