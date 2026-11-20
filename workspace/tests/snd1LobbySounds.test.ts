// snd1 (Kyle's 2026-11-20 report: "gaps in the rigor of the sound"): the Lobby singles-attendant conversation and the pre-battle room briefing
// played no sound. ROM windows: tools/audio/fixtures/snd1-lbrb-*-window.json, tools/audio/soundEventProbe.py (step mode) over the lbrb-* lab
// traces (Battle Scene OFF; the Lobby has no battle scene). Each trace is replayed exactly as tools/compare/appTrace.ts does (the loss-terminal
// app stage at frame 2996, the RNG rebase), and every effective ROM sound after the stage must come on the same frame: the loss terminal's own
// (aud240d), then A at the attendant (TryStartInteractionScript), the `\p` / `\l` page waits, the multichoice and YES/NO answers, the save
// dialog, SE_SAVE, the walk-out warp's SE_EXIT and the briefing's `\p` page. Rules: src/engine/lobbySounds.ts, docs/snd1-playtest-sounds.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface RomEvent { frame: number; kind: string; id: number | null; noop?: boolean }
interface Trace {
  appRoute: "generated-orchestrator";
  appStage: { id: string; frame: number };
  appRngRebase?: { frame: number; rngValue: number };
  segments: Array<{ frames: number; buttons?: string[] }>;
}
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function ours(trace: Trace): string[] {
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: "off" });
  const out: string[] = [];
  for (const advance of traceAdvances(trace.segments)) {
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    if (advance.frame === trace.appStage.frame) state = APP_STAGES[trace.appStage.id]!(state);
    if (trace.appRngRebase?.frame === advance.frame) state = { ...state, rngValue: trace.appRngRebase.rngValue };
    if (advance.frame > trace.appStage.frame) for (const e of result.events) out.push(`${advance.frame}:${e.kind}:${e.id}`);
  }
  return out;
}

const BRANCHES = ["happy-a", "info1", "bcancel", "levelb", "saveno", "saveb", "savedlgno", "overwriteno"] as const;

describe("Lobby attendant + pre-battle briefing: every ROM sound on the ROM frame (lbrb-* traces, Scene OFF)", () => {
  for (const branch of BRANCHES) {
    it(`lbrb-${branch}`, () => {
      const rom = JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/snd1-lbrb-${branch}-window.json`, import.meta.url), "utf8")) as {
        events: RomEvent[];
      };
      const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/lbrb-${branch}-off.json`, import.meta.url), "utf8")) as Trace;
      // From the loss terminal's second page on: the battle-return BGM / SE_EXIT (P+53 / P+79 after P = 3231) are scheduled at the battle's
      // end, which this staged start skips (aud241c pins them on its own windows). A same-frame second SE_SELECT is kept even when the probe
      // flags it `noop` (MSGBOX_YESNO's NO restarts the SE it just started: two calls, one sound; ours emits both calls, as aud240a does).
      const from = 3400;
      const romRows = rom.events
        .filter((e) => (!e.noop || e.kind === "se") && e.frame > from && ["se", "bgm", "fanfare", "continue"].includes(e.kind))
        .map((e) => `${e.frame}:${e.kind}:${e.id}`);
      const mine = ours(trace).filter((row) => /:(se|bgm|fanfare|continue):/.test(row) && Number(row.split(":")[0]) > from);
      expect(mine).toEqual(romRows);
    });
  }

  it("the happy path holds the new sounds: attendant A, page waits, menus, YES/NO, save dialog, SE_SAVE, SE_EXIT, briefing page", () => {
    const rom = JSON.parse(readFileSync(new URL("../tools/audio/fixtures/snd1-lbrb-happy-a-window.json", import.meta.url), "utf8")) as {
      events: RomEvent[];
    };
    const late = rom.events.filter((e) => !e.noop && e.frame >= 5100 && e.kind === "se").map((e) => `${e.frame}:${e.id}`);
    expect(late).toEqual([
      "5153:5", "5253:5", "5353:5", "5553:5", "5653:5", "5753:5", "5853:5", "5953:5", "6268:55", "6353:5", "6520:9", "7053:5",
    ]);
  });
});
