// pau2: a script pause before a print (pau1 items 1 and 2). Tier 1: per label, the presented hold equals the source pause.
// KOFail's ROM window is tools/compare/traces/out2-horndrill-{off,on}.json (docs/pau1-script-pauses.md "pau2"); AlreadyPoisoned
// is engine-only here (its ROM pause is the psn4 window in docs/aud249-general-anim-sounds.md).
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

interface Row { frame: number; type: string; hold: number | undefined; text: string }
function commandStarts(stage: string, scene: "on" | "off", segments: Segment[]): Row[] {
  let state = APP_STAGES[stage]!(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
  const rows: Row[] = [];
  let last = "";
  for (const advance of traceAdvances(segments as never)) {
    state = tick(state, advance.buttons as never);
    const presentation = (state as any).factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = presentation?.segments?.[presentation.segmentIndex]?.commands?.[presentation.commandIndex];
    if (command === undefined || presentation.lifecycle.phase !== "presenting") continue;
    const key = `${presentation.segmentIndex}:${presentation.commandIndex}`;
    if (key === last) continue;
    last = key;
    rows.push({ frame: state.frame, type: command.type, hold: command.timing?.holdFrames, text: JSON.stringify(command.lines ?? command.text ?? "") });
  }
  return rows;
}

describe("pau2: the used-move hold takes the source pause (SHORT or LONG)", () => {
  for (const scene of ["off", "on"] as const) {
    it(`KOFail (pause B_WAIT_TIME_LONG = 64 rows): Horn Drill's USEDMOVE holds 64 + 7 (pause + the used-move rows) in Scene ${scene.toUpperCase()}`, () => {
      const rows = commandStarts(`out2-horndrill-${scene}`, scene, [press(2, ["A"]), press(18, []), press(2, ["A"]), press(700, [])]);
      const used = rows.findIndex((r) => r.type === "message" && r.text.includes("used") && r.text.includes("HORN DRILL"));
      expect(used).toBeGreaterThanOrEqual(0);
      expect(rows[used]!.hold).toBe(71);
      expect(rows[used + 1]!.text).toContain("unaffected");
    });
  }
  it("AlreadyPoisoned (pause B_WAIT_TIME_LONG): the second Toxic's USEDMOVE holds at least the 64-row pause", () => {
    const rows = commandStarts("pau2-toxic-off", "off", [press(2, ["A"]), press(18, []), press(2, ["A"]), press(468, []), press(2, ["A"]), press(18, []), press(2, ["A"]), press(600, [])]);
    const used = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.type === "message" && r.text.includes("TOXIC")).find(({ i }) => rows[i + 1]?.text.includes("already"));
    expect(used).toBeDefined();
    expect(used!.r.hold).toBeGreaterThanOrEqual(64);
  });
  it("SafeguardEnds (pause B_WAIT_TIME_SHORT): the anchorless pre-print row is the source pause 32 + the pau3 lead 10, and only on the print after it", () => {
    expect(ANCHORLESS_PRE_PRINT_PAUSE_LABELS).toEqual(["BattleScript_SafeguardEnds"]);
    const program = loadBattleScriptProgram();
    const start = program.labelsAtProgramCounter.findIndex((labels) => labels.includes("BattleScript_SafeguardEnds"));
    expect(program.instructions[start]!.opcodeName).toBe("B_SCR_OP_PAUSE");
    const event = (sourceLabel: string, programCounter: number) => ({ provenance: { sourceLabel, programCounter } }) as never;
    expect(anchorlessPrePrintPauseFrames(event("BattleScript_SafeguardEnds", start + 1))).toBe(42);
    expect(anchorlessPrePrintPauseFrames(event("BattleScript_SafeguardEnds", start + 2))).toBeNull();
    expect(anchorlessPrePrintPauseFrames(event("BattleScript_AlreadyPoisoned", start + 1))).toBeNull();
  });
});
