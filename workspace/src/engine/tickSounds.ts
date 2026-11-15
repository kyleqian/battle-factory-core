// The post-tickEngineState sound block of tick() (core.ts), shared with tools/integration/lsd194Census.ts so the census emits through the same code.
import { soundCollecting } from "../audio/soundEvents.ts";
import { emitBattleEndSounds, emitForfeitEndSounds } from "./battleEndSounds.ts";
import { emitBattleHitSounds } from "./battleHitSounds.ts";
import { emitBattleStartIntroSounds, emitMidBattleSwitchSounds, emitPartySendOutSounds } from "./battleStartSounds.ts";
import { playerFaintReplacementSendOutTimingOfSegment } from "./battleResolutionPresentationRender.ts";
import { emitGeneralAnimSounds, emitMoveAnimSounds, emitStatsChangeSounds } from "./moveAnimSounds.ts";
import type { EngineState } from "./core.ts";

export type TickSoundState = Pick<EngineState, "battleScene" | "factoryRoundBattleOrchestrator">;

/** Emits the diff-based sounds of one tick from the engine state before and after it (a no-op unless a tick is being collected). */
export function emitTickSounds(state: TickSoundState, next: TickSoundState): void {
  const introBefore = state.factoryRoundBattleOrchestrator?.battleStartIntro ?? null;
  if (introBefore !== null && soundCollecting()) {
    emitBattleStartIntroSounds(introBefore, next.factoryRoundBattleOrchestrator?.battleStartIntro ?? null);
  }
  if (soundCollecting()) {
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
    if (orchestratorAfter?.battleResolutionPresentation) {
      emitBattleHitSounds(
        state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null,
        orchestratorAfter.battleResolutionPresentation,
        orchestratorAfter.round.rules.currentOpponent.frontierBrain !== undefined,
      );
    }
    if (orchestratorAfter?.battleResolutionPresentation) emitMoveAnimSounds(orchestratorAfter.battleResolutionPresentation, orchestratorAfter.round.rules.currentOpponent.frontierBrain !== undefined);
    if (orchestratorAfter?.battleResolutionPresentation) emitStatsChangeSounds(orchestratorAfter.battleResolutionPresentation);
    if (orchestratorAfter?.battleResolutionPresentation) emitGeneralAnimSounds(orchestratorAfter.battleResolutionPresentation);
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
