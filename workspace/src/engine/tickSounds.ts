// The post-tickEngineState sound block of tick() (core.ts), shared with tools/integration/lsd194Census.ts so the census emits through the same code.
import { setSoundTickLead, soundCollecting } from "../audio/soundEvents.ts";
import { emitBattleEndSounds, emitForfeitEndSounds } from "./battleEndSounds.ts";
import { emitBattleHitSounds, emitDoubleTeamStatsChangeSound } from "./battleHitSounds.ts";
import { emitBattleStartIntroSounds, emitMidBattleSwitchSounds, emitPartySendOutSounds } from "./battleStartSounds.ts";
import { usedMoveAnimSoundLeadOf, usedMoveBodySoundLeadOf } from "./battleResolutionPresentation.ts";
import { playerFaintReplacementSendOutTimingOfSegment } from "./battleResolutionPresentationRender.ts";
import { ENTRY_STATS_CHANGE_SE_AGE, emitGeneralAnimSounds, emitMoveAnimSounds, emitStatsChangeSounds } from "./moveAnimSounds.ts";
import { factoryBattleStartEntryFrame } from "./factoryBattleStartEntry.ts";
import type { EngineState } from "./core.ts";

export type TickSoundState = Pick<EngineState, "battleScene" | "factoryRoundBattleOrchestrator">;

/** Emits the diff-based sounds of one tick from the engine state before and after it (a no-op unless a tick is being collected). */
export function emitTickSounds(state: TickSoundState, next: TickSoundState): void {
  const introBefore = state.factoryRoundBattleOrchestrator?.battleStartIntro ?? null;
  if (introBefore !== null && soundCollecting()) {
    emitBattleStartIntroSounds(introBefore, next.factoryRoundBattleOrchestrator?.battleStartIntro ?? null);
  }
  if (soundCollecting()) {
    // snd3: the battle-start entry scripts (Intimidate's B_ANIM_STATS_CHANGE plays in both scenes) are presented from the intro, not
    // from battleResolutionPresentation, so their stat SE is emitted from the entry phase's synthetic resolution frame; wbh1: so are
    // the White Herb's General_HeldItemEffect SEs (Scene ON only, emitGeneralAnimSounds tests HITMARKER_NO_ANIMATIONS).
    const entryAfter = next.factoryRoundBattleOrchestrator?.battleStartIntro?.entry;
    if (entryAfter) {
      const entryFrame = factoryBattleStartEntryFrame(entryAfter);
      emitStatsChangeSounds(entryFrame, ENTRY_STATS_CHANGE_SE_AGE);
      emitGeneralAnimSounds(entryFrame);
    }
    emitPartySendOutSounds(
      state.battleScene?.resolutionOwner?.forcedPartySelect ?? null,
      next.battleScene?.resolutionOwner?.forcedPartySelect ?? null,
      null,
      false,
    );
    const orchestratorAfter = next.factoryRoundBattleOrchestrator;
    if (orchestratorAfter?.battleForcedPartySelect) {
      const resolution = orchestratorAfter.battleResolutionPresentation;
      emitPartySendOutSounds(
        state.factoryRoundBattleOrchestrator?.battleForcedPartySelect ?? null,
        orchestratorAfter.battleForcedPartySelect,
        resolution ? playerFaintReplacementSendOutTimingOfSegment(resolution.segments[resolution.segmentIndex]!) : null,
        orchestratorAfter.round.rules.currentOpponent.frontierBrain !== undefined,
      );
    }
    if (orchestratorAfter?.battleResolutionPresentation) {
      emitMidBattleSwitchSounds(
        state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null,
        orchestratorAfter.battleResolutionPresentation,
        orchestratorAfter.round.rules.currentOpponent.frontierBrain !== undefined,
      );
    }
    const presentationAfter = orchestratorAfter?.battleResolutionPresentation;
    setSoundTickLead(presentationAfter?.usedMoveSoundLead ?? 0);
    if (presentationAfter) {
      emitBattleHitSounds(
        state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null,
        presentationAfter,
        orchestratorAfter.round.rules.currentOpponent.frontierBrain !== undefined,
      );
    }
    setSoundTickLead(presentationAfter ? usedMoveBodySoundLeadOf(presentationAfter) : 0);
    if (presentationAfter) emitMoveAnimSounds(presentationAfter, orchestratorAfter.round.rules.currentOpponent.frontierBrain !== undefined);
    setSoundTickLead(presentationAfter ? usedMoveAnimSoundLeadOf(presentationAfter) : 0);
    if (presentationAfter) emitStatsChangeSounds(presentationAfter);
    setSoundTickLead(presentationAfter ? usedMoveAnimSoundLeadOf(presentationAfter) : 0);
    if (presentationAfter) emitDoubleTeamStatsChangeSound(presentationAfter);
    setSoundTickLead(presentationAfter?.usedMoveScriptSoundLead ?? 0);
    if (presentationAfter) emitGeneralAnimSounds(presentationAfter);
    setSoundTickLead(0);
    emitForfeitEndSounds(
      state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phase ?? null,
      orchestratorAfter !== null && orchestratorAfter !== undefined && orchestratorAfter.battle === null,
      orchestratorAfter?.round.rules.currentOpponent.frontierBrain !== undefined,
    );
    const resolutionBefore = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null;
    if (resolutionBefore !== null && orchestratorAfter !== null && orchestratorAfter !== undefined) {
      emitBattleEndSounds(
        resolutionBefore,
        orchestratorAfter.battleResolutionPresentation ?? null,
        orchestratorAfter.round.rules.currentOpponent.frontierBrain !== undefined,
      );
    }
  }
}
