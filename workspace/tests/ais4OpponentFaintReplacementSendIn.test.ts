// ais4: the opponent's faint-replacement send-in (BattleScript_FaintedMonSendOutNew) runs the AI-switch timeline: ball throw 2 frames after the
// shared timeline, tint hold 22, SE_BALL_OPEN / cry on the ROM's frames, and no long-nickname lag frame (RATTATA, 7 glyphs, has none in the ROM).
// ROM frames: tools/audio/fixtures/obr251-opponent-faint-{off,on}-window.json (A at 501) and tools/compare/traces/obr251-opponent-faint-*.json.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { applyTraceStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  applyTraceStage: (trace: unknown, state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>;
};

interface Fixture { frames: number; events: Array<{ frame: number; kind: string; id: number | null; pan: number | null }> }
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;

for (const scene of ["off", "on"] as const) {
  describe(`opponent faint replacement send-in, Scene ${scene.toUpperCase()} (ais4)`, () => {
    const trace = read<{ route: "generated-orchestrator"; battleScene: "on" | "off"; appRoute?: string; segments: Array<{ frames: number; buttons?: string[] }> }>(`../tools/compare/traces/obr251-opponent-faint-${scene}.json`);
    const rom = read<Fixture>(`../tools/audio/fixtures/obr251-opponent-faint-${scene}-window.json`);
    const commands: Array<{ frame: number; command: Record<string, unknown> | undefined; elapsed: number }> = [];
    const sounds: SoundEvent[] = [];
    let state = createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
    state = applyTraceStage({ ...trace, appStage: { id: `aud241b-opponent-faint-${scene}`, frame: 0, opponentTrainerId: 110 } }, state);
    for (const advance of traceAdvances(trace.segments)) {
      if (advance.frame > rom.frames) break;
      const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
      state = result.result;
      sounds.push(...result.events);
      const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      const command = resolution?.segments[resolution.segmentIndex]?.commands[resolution.commandIndex] as Record<string, unknown> | undefined;
      if (command?.type === "switch-in") commands.push({ frame: advance.frame, command, elapsed: resolution!.lifecycle.phaseElapsed });
    }

    it("the switch-in command carries the 2-frame AI lead and the AI tint flag, and no long-nickname lag", () => {
      const command = commands[0]!.command!;
      expect(command.aiSwitch).toBe(true);
      expect(command.sendInVisualDelay).toBe(2);
      expect(command.sendInLagElapsed).toBeUndefined();
    });

    it("SE_BALL_OPEN and the NORMAL cry land on the ROM's frames", () => {
      const ours = (kind: string) => sounds.filter((event) => event.kind === kind && event.frame >= 600).map((event) => event.frame);
      const romFrames = (kind: string, id?: number) => rom.events.filter((event) => event.kind === kind && event.frame >= 600 && (id === undefined || event.id === id)).map((event) => event.frame);
      expect(romFrames("se", 15)).toEqual([681]);
      expect(ours("se")).toEqual(romFrames("se", 15));
      expect(romFrames("cry")).toEqual([697]);
      expect(ours("cry")).toEqual(romFrames("cry"));
    });
  });
}
