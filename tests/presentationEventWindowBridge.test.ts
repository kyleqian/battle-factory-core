import { describe, expect, it } from "vitest";
import {
  EFFECT_STAT_DOWN_SCRIPT_LABEL,
  EFFECT_STAT_UP_AFTER_ATK_CANCELER_SCRIPT_LABEL,
  FAINT_TARGET_SCRIPT_LABEL,
  STAT_DOWN_PRINT_STRING_SCRIPT_LABEL,
  resolveDoubleTeamKickoffPresentationWindowContent,
  resolveFaintPresentationWindowContent,
  resolveFeatherDanceKickoffPresentationWindowContent,
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

  it("finds the DOUBLE_TEAM kickoff window's own message + evasion-rise content from a stream with unrelated noise events", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, EFFECT_STAT_UP_AFTER_ATK_CANCELER_SCRIPT_LABEL),
      event({ kind: "set-battler-pp-data", battler: 1, movePosition: 0, pp: 13 }, "BattleScript_EffectEvasionUp"),
      event({ kind: "stat-stage-change", battler: 1, stat: "evasion", from: 7, to: 8, requestedMagnitude: 1 }, EFFECT_STAT_UP_AFTER_ATK_CANCELER_SCRIPT_LABEL),
      event({ kind: "animation", animationId: "MOVE_ANIMATION", battler: 1, arguments: ["104", "0", "0", "0", "0", "0"] }, "BattleScript_EffectEvasionUp"),
      event({ kind: "message", messageId: "STRINGID_DEFENDERSSTATROSE", substitutions: [] }, "BattleScript_StatUpMessage"),
    ];

    const content = resolveDoubleTeamKickoffPresentationWindowContent(events);
    expect(content).toEqual({
      message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
      statChange: { battler: 1, stat: "evasion", from: 7, to: 8 },
    });
  });

  it("returns null when no stat-stage-change event carries the stat-up script's own sourceLabel (no evasion rise actually happened)", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, EFFECT_STAT_UP_AFTER_ATK_CANCELER_SCRIPT_LABEL),
    ];
    expect(resolveDoubleTeamKickoffPresentationWindowContent(events)).toBeNull();
  });

  it("returns null when no message event carries the stat-up script's own sourceLabel", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "stat-stage-change", battler: 1, stat: "evasion", from: 7, to: 8, requestedMagnitude: 1 }, EFFECT_STAT_UP_AFTER_ATK_CANCELER_SCRIPT_LABEL),
      event({ kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, "BattleScript_HitFromAtkCanceler"),
    ];
    expect(resolveDoubleTeamKickoffPresentationWindowContent(events)).toBeNull();
  });

  it("finds the FEATHER_DANCE kickoff window's own message + ATK-drop + stat-fell content from a stream with unrelated noise events, reading from TWO sourceLabels", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, EFFECT_STAT_DOWN_SCRIPT_LABEL),
      event({ kind: "set-battler-pp-data", battler: 1, movePosition: 2, pp: 14 }, EFFECT_STAT_DOWN_SCRIPT_LABEL),
      event({ kind: "stat-stage-change", battler: 0, stat: "attack", from: 6, to: 4, requestedMagnitude: 2 }, EFFECT_STAT_DOWN_SCRIPT_LABEL),
      event({ kind: "animation", animationId: "MOVE_ANIMATION", battler: 1, arguments: ["297", "0", "0", "0", "0", "0"] }, "BattleScript_StatDownDoAnim"),
      event({ kind: "message", messageId: "STRINGID_DEFENDERSSTATFELL", substitutions: [] }, STAT_DOWN_PRINT_STRING_SCRIPT_LABEL),
    ];

    const content = resolveFeatherDanceKickoffPresentationWindowContent(events);
    expect(content).toEqual({
      message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
      statChange: { battler: 0, stat: "attack", from: 6, to: 4 },
      statFellMessage: { messageId: "STRINGID_DEFENDERSSTATFELL", substitutions: [] },
    });
  });

  it("preserves an opponent-target accuracy drop for the SAND_ATTACK banner instead of assuming the earlier attack-stat shape", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, EFFECT_STAT_DOWN_SCRIPT_LABEL),
      event({ kind: "stat-stage-change", battler: 0, stat: "accuracy", from: 6, to: 5, requestedMagnitude: 1 }, EFFECT_STAT_DOWN_SCRIPT_LABEL),
      event({ kind: "animation", animationId: "STATS_CHANGE", battler: 0, arguments: ["27"] }, "BattleScript_StatDownDoAnim"),
      event({ kind: "message", messageId: "STRINGID_DEFENDERSSTATFELL", substitutions: [] }, STAT_DOWN_PRINT_STRING_SCRIPT_LABEL),
    ];

    const content = resolveFeatherDanceKickoffPresentationWindowContent(events);
    expect(content).toEqual({
      message: { messageId: "STRINGID_USEDMOVE", substitutions: [] },
      statChange: { battler: 0, stat: "accuracy", from: 6, to: 5 },
      statFellMessage: { messageId: "STRINGID_DEFENDERSSTATFELL", substitutions: [] },
    });
  });

  it("returns null when no message event carries the separate stat-fell script's own sourceLabel (the two-sourceLabel signal this window's own shape genuinely needs)", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, EFFECT_STAT_DOWN_SCRIPT_LABEL),
      event({ kind: "stat-stage-change", battler: 0, stat: "attack", from: 6, to: 4, requestedMagnitude: 2 }, EFFECT_STAT_DOWN_SCRIPT_LABEL),
    ];
    expect(resolveFeatherDanceKickoffPresentationWindowContent(events)).toBeNull();
  });

  it("returns null when no stat-stage-change event carries the stat-down script's own sourceLabel", () => {
    const events: BattleScriptSemanticEvent[] = [
      event({ kind: "message", messageId: "STRINGID_USEDMOVE", substitutions: [] }, EFFECT_STAT_DOWN_SCRIPT_LABEL),
      event({ kind: "message", messageId: "STRINGID_DEFENDERSSTATFELL", substitutions: [] }, STAT_DOWN_PRINT_STRING_SCRIPT_LABEL),
    ];
    expect(resolveFeatherDanceKickoffPresentationWindowContent(events)).toBeNull();
  });
});
