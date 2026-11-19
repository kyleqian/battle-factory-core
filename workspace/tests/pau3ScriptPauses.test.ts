// pau3: ROM-measured script pauses (docs/pau1-script-pauses.md "pau3"). Windows: tools/compare/traces/pau3-{hjk,rest,safeguard}-{off,on}.json
// (labs tools/battle-lab/pau3-*.json). MoveMissedDoDamage (Hi Jump Kick into Protect) and RestCantSleep (Rest into Uproar) hold the used-move
// message for their LONG pause; SafeguardEnds' print sits 32 + 10 frames behind the previous message's wait (both scenes).
import { describe, expect, it } from "vitest";
import { createInitialState, tick } from "../src/engine/core.ts";
import { ANCHORLESS_PRE_PRINT_PAUSE_LABELS, anchorlessPrePrintPauseFrames } from "../src/engine/battleResolutionPresentation.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};
type Segment = { frames: number; buttons: string[] };
const press = (frames: number, buttons: string[]): Segment => ({ frames, buttons });
const oneTurn = [press(2, ["A"]), press(18, []), press(2, ["A"]), press(700, [])];
const mash = [press(2, ["A"]), press(18, []), press(2, ["A"]), ...Array.from({ length: 110 }, () => [press(28, []), press(2, ["A"])]).flat()];

interface Row { frame: number; type: string; hold: number | undefined; minimum: number | undefined; text: string }
function commandStarts(stage: string, scene: "on" | "off", segments: Segment[], lastFrame: number): Row[] {
  let state = APP_STAGES[stage]!(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
  const rows: Row[] = [];
  let last = "";
  for (const advance of traceAdvances(segments as never)) {
    if (state.frame > lastFrame) break;
    state = tick(state, advance.buttons as never);
    const presentation = (state as any).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = presentation?.segments?.[presentation.segmentIndex]?.commands?.[presentation.commandIndex];
    if (command === undefined || presentation.lifecycle.phase !== "presenting") continue;
    const key = `${presentation.segmentIndex}:${presentation.commandIndex}`;
    if (key === last) continue;
    last = key;
    rows.push({ frame: state.frame, type: command.type, hold: command.timing?.holdFrames, minimum: command.timing?.minimumFrames, text: JSON.stringify(command.lines ?? command.text ?? "") });
  }
  return rows;
}

describe("pau3: LONG pause before the result print (ROM windows: used -> result interval equal in both scenes)", () => {
  for (const scene of ["off", "on"] as const) {
    it(`MoveMissedDoDamage (Hi Jump Kick into Protect): the used message holds 64 + 3, the result print starts 92 frames later (Scene ${scene.toUpperCase()})`, () => {
      const rows = commandStarts(`pau3-hjk-${scene}`, scene, oneTurn, 700);
      const used = rows.findIndex((r) => r.type === "message" && r.text.includes("HI JUMP KICK"));
      expect(used).toBeGreaterThanOrEqual(0);
      expect(rows[used]!.hold).toBe(67);
      expect(rows[used + 1]!.text).toContain("protected itself");
      expect(rows[used + 1]!.frame - rows[used]!.frame).toBe(92);
      expect(rows[used + 2]!.text).toContain("crashed");
    });
    it(`RestCantSleep (Rest into Uproar): the used message holds 64 + 5, the print starts 86 frames later (Scene ${scene.toUpperCase()})`, () => {
      const rows = commandStarts(`pau3-rest-${scene}`, scene, oneTurn, 700);
      const used = rows.findIndex((r) => r.type === "message" && r.text.includes("REST!"));
      expect(used).toBeGreaterThanOrEqual(0);
      expect(rows[used]!.hold).toBe(69);
      expect(rows[used + 1]!.text).toContain("UPROAR kept");
      expect(rows[used + 1]!.frame - rows[used]!.frame).toBe(86);
    });
  }
});

describe("pau3: SafeguardEnds' pre-print row is the pause plus the measured end-turn lead", () => {
  it("anchorless row = 32 + 10 for SafeguardEnds only", () => {
    expect(ANCHORLESS_PRE_PRINT_PAUSE_LABELS).toEqual(["BattleScript_SafeguardEnds"]);
    const program = loadBattleScriptProgram();
    const start = program.labelsAtProgramCounter.findIndex((labels) => labels.includes("BattleScript_SafeguardEnds"));
    const event = (sourceLabel: string, programCounter: number) => ({ provenance: { sourceLabel, programCounter } }) as never;
    expect(anchorlessPrePrintPauseFrames(event("BattleScript_SafeguardEnds", start + 1))).toBe(42);
    expect(anchorlessPrePrintPauseFrames(event("BattleScript_SafeguardEnds", start + 2))).toBeNull();
  });
  for (const [scene, lastFrame] of [["off", 2400], ["on", 2900]] as const) {
    it(`the expiry print comes behind a 42-frame row (Scene ${scene.toUpperCase()}); the ROM's failed-Safeguard print -> expiry print gap is 121 frames`, () => {
      const rows = commandStarts(`pau3-safeguard-${scene}`, scene, mash, lastFrame);
      const expiry = rows.findIndex((r) => r.type === "message" && r.text.includes("no longer"));
      expect(expiry).toBeGreaterThan(1);
      expect(rows[expiry - 1]!.type).toBe("move-animation");
      expect(rows[expiry - 1]!.minimum).toBe(42);
      const failed = rows.slice(0, expiry).map((r, i) => ({ r, i })).filter(({ r }) => r.text.includes("But it failed")).pop()!;
      expect(rows[expiry]!.frame - failed.r.frame).toBe(121);
    });
  }
});
