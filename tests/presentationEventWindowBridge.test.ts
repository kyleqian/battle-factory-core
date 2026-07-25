import { describe, expect, it } from "vitest";
import {
  FAINT_TARGET_SCRIPT_LABEL,
  resolveFaintPresentationWindowContent,
} from "../src/engine/presentationEventWindowBridge.ts";
import type {
  BattleScriptEventProvenance,
  BattleScriptSemanticEvent,
  BattleScriptSemanticEventPayload,
} from "../src/engine/battleScriptEvents.ts";

let sequence = 0;
function provenance(sourceLabel: string): BattleScriptEventProvenance {
  return Object.freeze({
    programCounter: sequence,
    opcodeId: 0,
    opcodeName: "TEST",
    dispatcher: "test",
    sourceLabel,
    sourceStatementLine: 0,
    instructionExecution: sequence,
  });
}
function event(payload: BattleScriptSemanticEventPayload, sourceLabel: string): BattleScriptSemanticEvent {
  sequence += 1;
  return Object.freeze({ ...payload, sequence, provenance: provenance(sourceLabel) }) as BattleScriptSemanticEvent;
}

describe("presentationEventWindowBridge (S10 presentation-seam checkpoint, gap 7)", () => {
  it("finds the fainted-window content from a stream with unrelated noise events", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, "BattleScript_HitFromAtkCanceler"),
      event({ kind: "play-se", battler: 1, songId: 5 }, "BattleScript_HitFromAtkCanceler"),
      event({ kind: "hp-change", battler: 1, from: 1, to: 0 }, "BattleScript_HitFromAtkCanceler"),
      event({ kind: "play-faint-cry", battler: 1 }, FAINT_TARGET_SCRIPT_LABEL),
      event({ kind: "faint-animation", battler: 1 }, FAINT_TARGET_SCRIPT_LABEL),
      event(
        { kind: "message", messageId: "STRINGID_TARGETFAINTED", substitutions: [] },
        FAINT_TARGET_SCRIPT_LABEL,
      ),
    ];

    const content = resolveFaintPresentationWindowContent(events);
    expect(content).toEqual({
      faintedBattler: 1,
      message: { messageId: "STRINGID_TARGETFAINTED", substitutions: [] },
    });
  });

  it("returns null when there is no hp-change{to:0} (nothing fainted)", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "hp-change", battler: 1, from: 100, to: 58 }, "BattleScript_HitFromAtkCanceler"),
      event(
        { kind: "message", messageId: "STRINGID_TARGETFAINTED", substitutions: [] },
        FAINT_TARGET_SCRIPT_LABEL,
      ),
    ];
    expect(resolveFaintPresentationWindowContent(events)).toBeNull();
  });

  it("returns null when no message event carries the fainted script's own sourceLabel", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "hp-change", battler: 1, from: 1, to: 0 }, "BattleScript_HitFromAtkCanceler"),
      event({ kind: "message", messageId: "STRINGID_TARGETFAINTED", substitutions: [] }, "BattleScript_MoveEnd"),
    ];
    expect(resolveFaintPresentationWindowContent(events)).toBeNull();
  });
});
