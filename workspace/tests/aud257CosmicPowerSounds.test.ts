// aud257: Cosmic Power's SE_M_MORNING_SUN 228 (SoundTask_PlaySE1WithPanning after `delay 70`) was gated behind AnimTask_BlendNonAttackerPalettes; the extractor now ports its lifetime
// (battle_anim_utility_funcs.c:725-739 + Step2 :169-198). ROM window = tools/audio/fixtures/aud257-cosmicpower-player.json (committed soundEventProbe.py output; no emulator needed).
// See docs/aud242-move-anim-sounds.md section 23.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import timing from "../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface Fixture { frames: number; events: Array<{ frame: number; kind: string; id: number | null; pan: number | null }>; trace: { route: "generated-orchestrator"; battleScene: "on"; appStage: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const rom = JSON.parse(readFileSync(new URL("../tools/audio/fixtures/aud257-cosmicpower-player.json", import.meta.url), "utf8")) as Fixture;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>> };

function ourEvents(): SoundEvent[] {
  let state = APP_STAGES[rom.trace.appStage.id]!(createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene }));
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
  }
  return events;
}
const moveRows = (events: Array<{ frame: number; kind: string; id: number | null; pan: number | null }>) =>
  events.filter((e) => e.kind === "se" && (e.id === 243 || e.id === 228));

describe("Cosmic Power SE rows (aud257)", () => {
  it("the table entry is ungated: SE 243 twice at frame 3 and SE 228 at frame 128 (pan -64, the attacker)", () => {
    const entry = timing.moves[322]!;
    expect(entry.label).toBe("Move_COSMIC_POWER");
    expect(entry.gated[0]).toBe(0);
    expect(timing.variants[entry.variants[0]!]).toEqual([
      { op: "soundtask_se2", frame: 3, id: 243, pan: 0 }, { op: "playsewithpan", frame: 3, id: 243, pan: 0 }, { op: "soundtask_se1", frame: 128, id: 228, pan: -64 },
    ]);
  });
  it("engine rows equal the ROM's rows in id / pan and in the 125-frame gap; every row sits 5 frames after the ROM's (flat presentation offset)", () => {
    const romRows = moveRows(rom.events);
    const ours = moveRows(ourEvents());
    expect(romRows.map((e) => `${e.id}:${e.pan}`)).toEqual(["243:0", "243:0", "228:-64"]);
    expect(ours.map((e) => `${e.id}:${e.pan}`)).toEqual(romRows.map((e) => `${e.id}:${e.pan}`));
    expect(romRows[2]!.frame - romRows[0]!.frame).toBe(125);
    expect(ours[2]!.frame - ours[0]!.frame).toBe(125);
    expect(ours.map((e, i) => e.frame - romRows[i]!.frame)).toEqual([5, 5, 5]);
  });
  it("Sweet Kiss (rank 7): gAngelSpriteTemplate lifetime 99 resolves the waitforvisualfinish, so the Attract SE 226 lands 50 frames after the third Heal Bell (ROM T2 rows)", () => {
    const entry = timing.moves[186]!;
    expect(entry.label).toBe("Move_SWEET_KISS");
    expect(entry.gated[0]).toBe(0);
    expect(timing.variants[entry.variants[0]!]).toEqual([
      { op: "playsewithpan", frame: 6, id: 195, pan: 63 }, { op: "playsewithpan", frame: 31, id: 195, pan: 63 },
      { op: "playsewithpan", frame: 56, id: 195, pan: 63 }, { op: "playsewithpan", frame: 106, id: 226, pan: 63 },
    ]);
  });
});
