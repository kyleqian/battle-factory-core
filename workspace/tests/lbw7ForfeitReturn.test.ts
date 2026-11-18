// lbw7 (ISSUES #221): the forfeit return (lab frf250b: run -> YES) on the ROM, `lbra-forfeit-off` 304-362.
// ROM facts: the post-battle room first shows at frame 304 (black before, black again 343..361), the Lobby field fades in from 362, and the room
// draws the battle's own opponent class (lab trainer 110, a Black Belt), not the generic Bug Catcher sheet.
import { describe, expect, it } from "vitest";
import "../tools/compare/harnessPlayerName.ts";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import { APP_STAGES } from "../tools/compare/appTrace.ts";
import { loadCompareTrace } from "../tools/compare/traceFile.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { postwinPhase, postwinTailAge } from "../src/engine/postwin.ts";
import { FORFEIT_RETURN_TAIL_LEAD } from "../src/engine/battleForfeit.ts";

const trace = loadCompareTrace("tools/compare/traces/lbra-forfeit-off.json");

function framesAt(frames: readonly number[]): Map<number, EngineState> {
  const want = new Set(frames);
  const out = new Map<number, EngineState>();
  let state = APP_STAGES[trace.appStage!.id]!(createInitialState({ appRoute: trace.appRoute, battleScene: trace.battleScene }));
  for (const a of traceAdvances(trace.segments)) {
    state = tick(state, a.buttons);
    if (trace.appRngRebase?.frame === a.frame) state = { ...state, rngValue: trace.appRngRebase.rngValue };
    if (want.has(a.frame)) out.set(a.frame, state);
  }
  return out;
}

const mean = (fb: Uint8Array): number => {
  let s = 0;
  for (let i = 0; i < fb.length; i += 4) s += fb[i]! + fb[i + 1]! + fb[i + 2]!;
  return s;
};

describe("lbw7 forfeit return tail", () => {
  it("runs the black / room / black tail one tick ahead of the WIN-measured boundaries only after the fade", () => {
    expect(FORFEIT_RETURN_TAIL_LEAD).toBe(1);
    expect(postwinTailAge(36, 1)).toBe(36);
    expect(postwinPhase(postwinTailAge(55, 1))).toBe("blackAfterBattle");
    expect(postwinPhase(postwinTailAge(56, 1))).toBe("battleRoom");
    expect(postwinPhase(postwinTailAge(94, 1))).toBe("battleRoom");
    expect(postwinPhase(postwinTailAge(113, 1))).toBe("blackBeforeCounter");
    expect(postwinPhase(postwinTailAge(114, 1))).toBe("counterRoom");
    expect(postwinPhase(postwinTailAge(56, undefined))).toBe("blackAfterBattle");
  });

  it("shows the room at 304 and the Lobby field at 362 (ROM frames), black between and before", () => {
    const f = framesAt([303, 304, 342, 343, 361, 362, 363]);
    const m = (n: number): number => mean(render(f.get(n)!));
    expect(m(303)).toBe(0);
    expect(m(304)).toBeGreaterThan(0);
    expect(m(342)).toBeGreaterThan(0);
    expect(m(343)).toBe(0);
    expect(m(361)).toBe(0);
    expect(m(362)).toBeGreaterThan(0);
    expect(m(363)).toBeGreaterThan(m(362));
  });

  it("draws the battle's own opponent (trainer 110, Black Belt) in the room, not the generic sheet", () => {
    const state = framesAt([330]).get(330)!;
    expect(state.factoryRoundBattleOrchestrator!.round.rules.currentOpponent.id).toBe("factory-trainer-110");
    const generic = {
      ...state,
      factoryRoundBattleOrchestrator: {
        ...state.factoryRoundBattleOrchestrator!,
        round: {
          ...state.factoryRoundBattleOrchestrator!.round,
          rules: {
            ...state.factoryRoundBattleOrchestrator!.round.rules,
            currentOpponent: { ...state.factoryRoundBattleOrchestrator!.round.rules.currentOpponent, id: "factory-trainer-50", trainerName: "DESTIN" },
          },
        },
      },
    } as EngineState;
    const a = render(state);
    const b = render(generic);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});
