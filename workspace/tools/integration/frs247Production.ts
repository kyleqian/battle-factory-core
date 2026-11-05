// frs247: production frames of the PLAYER faint-replacement return (forced party select SEND OUT -> field -> action menu), built from a pfr185-style
// lab scenario's parties.  Shared by frs247Dense.ts (ROM comparison) and tests/frs247FaintReplacementReshow.test.ts.
import speciesStats from "../../src/data/gen/species-stats.json" with { type: "json" };
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../../src/engine/battleScriptSourceConstants.ts";
import { renderBattleResolutionForcedPartySelect, renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES, playerFaintReplacementSendOutTimingOfSegment } from "../../src/engine/battleResolutionPresentationRender.ts";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../../src/engine/battleResolutionPresentation.ts";
import { calculateHpStat } from "../../src/engine/stats.ts";
import * as party from "../../src/engine/partySelect.ts";

const stats = (sid: number) => speciesStats.species.find((s) => s.id === sid)!;
const speciesName = (sid: number) => stats(sid).name.replace(/^SPECIES_/, "");

export type Frs247Scenario = { overrides: { parties: { player: any[]; opponent: any[] } } };

export function frs247ProductionReturn(scenario: Frs247Scenario, sceneOn: boolean, faintNo: number) {
  const parties = scenario.overrides.parties;
  const mk = (b: 0 | 1, m: any, partyIndex: number) => {
    const maxHP = calculateHpStat(stats(m.species).baseHp, m.ivs.hp, m.evs.hp, m.level);
    return Object.freeze({
      species: m.species as number, name: speciesName(m.species), side: b === 0 ? "player" as const : "trainer" as const, battler: b,
      partyIndex, level: m.level as number, hp: maxHP, maxHP, gender: m.gender as "male" | "female", status: "none" as const,
      moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
      personality: b === 0 && partyIndex >= 1 ? (m.nature as number) : 0,
    });
  };
  const incoming = mk(0, parties.player[faintNo], faintNo);
  const field = Object.freeze({ player: incoming, opponent: mk(1, parties.opponent[0], 0) });
  const states = Object.freeze(["fainted", "healthy", "healthy", "empty", "empty", "empty"]);
  const timing = switchInTiming(0, incoming.species, sceneOn, incoming.name, false, incoming.personality);
  const commands = [
    Object.freeze({ type: "party-summary", eventSequence: 1, battler: 0, visible: true, states, timing: { minimumFrames: 7 } }),
    Object.freeze({ type: "message", eventSequence: 2, lines: [`Go! ${incoming.name}!`], advance: "automatic", noCursor: false, timing: { minimumFrames: 13, holdFrames: 0 } }),
    Object.freeze({ type: "party-summary", eventSequence: 3, battler: 0, visible: false, states }),
    Object.freeze({ type: "switch-in", eventSequence: 4, battler: 0, fromPartyIndex: 0, toPartyIndex: faintNo, incoming, incomingStatus1: 0,
      timing, settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES, sceneOn }),
    Object.freeze({ type: "turn-end", timing: { minimumFrames: 8 } }),
  ];
  const segment = { field, beforeRules: { rulesContext: { hitMarker: sceneOn ? 0 : BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } }, afterRules: null, events: [], commands } as never;
  const resolution = (commandIndex: number, phase: string, phaseElapsed: number) => ({
    field, segments: [segment], segmentIndex: 0,
    commandIndex, lifecycle: { phase, phaseElapsed }, confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
  } as never);
  const sendOutTiming = playerFaintReplacementSendOutTimingOfSegment(segment) ?? undefined;
  const partyState = (e: number) => ({ sendOutElapsed: e, elapsed: 400 + e, sendOutTiming } as never);
  let readyE = 0;
  while (!party.partySendOutBattleMenuReady(readyE, sendOutTiming)) readyE += 1;
  const TURN_END = 8;
  const promptE = readyE + TURN_END + BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES;
  const draw = (e: number): Uint8Array => {
    const fb = new Uint8Array(240 * 160 * 4);
    if (e < readyE) {
      renderBattleResolutionForcedPartySelect(fb, createBattleResolutionPresentationRenderView(resolution(0, "presenting-switch-in", e)), partyState(e));
    } else if (e < readyE + TURN_END) {
      renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(resolution(4, "presenting", e - readyE)));
    } else {
      renderBattleResolutionLiveView(fb, createBattleResolutionPresentationRenderView(resolution(5, "next-command-handoff", e - readyE - TURN_END)));
    }
    return fb;
  };
  return { incoming, readyE, promptE, draw };
}
