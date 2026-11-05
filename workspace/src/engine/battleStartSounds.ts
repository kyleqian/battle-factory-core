// aud241a: the Factory singles battle start's sounds (docs/aud241a-battle-start-sounds.md). Write-only: every function reads
// presentation state and calls emitSound, which is a no-op unless a tick is being collected.
import { emitSound } from "../audio/soundEvents.ts";
import {
  OPP_CREATE_TICK,
  OPP_ICON_X2,
  PLAYER_CREATE_TICK,
  PLAYER_ICON_X2,
  generatedBattleIntroSourceClock,
  generatedBattleStartOpponentHandoffTick,
  generatedPlayerDispatchDelay,
  generatedPlayerVisualLag,
} from "./battleScene.ts";
import type { BattleResolutionPresentationCommand, BattleResolutionPresentationState, PartyBallState } from "./battleResolutionPresentation.ts";
import type { FactoryBattleStartIntroState } from "./factoryBattleStartIntro.ts";
import { partySendOutReleaseClock, type PartySelectState, type PartySendOutTiming } from "./partySelect.ts";
import {
  BGM_BATTLE,
  BGM_DRAFT,
  BGM_FRONTIER_BRAIN,
  SE_BALL_TRAY_BALL,
  SE_BALL_TRAY_ENTER,
  SE_BALL_TRAY_EXIT,
  cryModeFor,
  playBallOpenSe,
  playSelectSe,
  playSendOutCry,
  startBattleBgm,
} from "./screenSounds.ts";

/** SOUND_PAN_ATTACKER / SOUND_PAN_TARGET (include/constants/battle.h) as the tray's PlaySE{1,2}WithPanning pans. */
const TRAY_PAN_OPPONENT = -64;
const TRAY_PAN_PLAYER = 63;
/** Task_PlayCryWhenReleasedFromBall's cry pans (pokeball.c): the opponent's is +25, the player's -25. */
const CRY_PAN_OPPONENT = 25;
const CRY_PAN_PLAYER = -25;

/**
 * The battle-start party-summary tray's SE ticks (RAM ticks, the `tableX2` index space): the two bars are created at
 * `PLAYER_CREATE_TICK` / `OPP_CREATE_TICK` (`SE_BALL_TRAY_ENTER`, pan 0), and each icon's callback plays its SE on the tick
 * its x2 first reaches 0 (`SpriteCB_StatusSummaryBalls_Enter`): BALL at pan 63 / -64 (player / opponent) for a real slot,
 * EXIT for an empty one. Ticks are table ends, so the ROM's tick-by-tick x2 history is the single source.
 */
export interface BallTraySoundTick {
  readonly tick: number;
  readonly kind: "enter" | "ball" | "exit";
  readonly side: "player" | "opponent";
}
export function ballTraySoundTicks(
  summaries: Readonly<{ player: readonly PartyBallState[]; opponent: readonly PartyBallState[] }>,
): readonly BallTraySoundTick[] {
  const out: BallTraySoundTick[] = [
    { tick: PLAYER_CREATE_TICK, kind: "enter", side: "player" },
    { tick: OPP_CREATE_TICK, kind: "enter", side: "opponent" },
  ];
  for (let i = 0; i < 6; i += 1) {
    out.push({
      tick: PLAYER_CREATE_TICK + PLAYER_ICON_X2[i]!.length - 1,
      kind: summaries.player[i] === "empty" ? "exit" : "ball",
      side: "player",
    });
    out.push({
      tick: OPP_CREATE_TICK + OPP_ICON_X2[i]!.length - 1,
      kind: summaries.opponent[5 - i] === "empty" ? "exit" : "ball",
      side: "opponent",
    });
  }
  return out.sort((a, b) => a.tick - b.tick);
}

/**
 * Source-clock spans measured on the ROM (docs/aud241a-battle-start-sounds.md, fixtures `intro-yoshi-*` / `intro-magneton-*`):
 * the opponent's SE_BALL_OPEN falls 17 ticks after the opponent controller handoff and its cry 17 later; the player's ball
 * opens 77 ticks after the throw becomes visible (the "Go! <mon>!" dispatch plus `generatedPlayerVisualLag`, which carries the
 * line length) and its cry 13 later. The dispatch is `generatedPlayerDispatchDelay` (which already carries go246's Scene ON
 * animation hold), so ON and OFF each follow their own timeline.
 */
const OPPONENT_BALL_OPEN_AFTER_HANDOFF = 17;
const CRY_AFTER_BALL_OPEN_OPPONENT = 17;
const PLAYER_BALL_OPEN_AFTER_THROW_VISIBLE = 77;
const CRY_AFTER_BALL_OPEN_PLAYER = 13;

/** GetBattleBGM: the Factory Head's class plays MUS_VS_FRONTIER_BRAIN, every other Factory trainer class MUS_VS_TRAINER. */
export function factoryBattleBgm(frontierBrain: boolean): number {
  return frontierBrain ? BGM_FRONTIER_BRAIN : BGM_BATTLE;
}

function introBgm(intro: FactoryBattleStartIntroState): number {
  return factoryBattleBgm(intro.isSilverBrainReveal || intro.isGoldBrainReveal);
}

/** PlayBattleBGM at the battle transition start: m4aMPlayAllStop (the room's map BGM), then the battle BGM. */
export function emitBattleStartBgm(frontierBrain: boolean): void {
  startBattleBgm(BGM_DRAFT, factoryBattleBgm(frontierBrain));
}

/**
 * Called once per collected tick with the intro before and after the tick (`after` null when the tick ended the intro).
 * Every sound is keyed to the source clock the presentation already owns, so each scene follows its own timeline.
 */
export function emitBattleStartIntroSounds(
  before: FactoryBattleStartIntroState,
  after: FactoryBattleStartIntroState | null,
): void {
  if (before.acknowledgedElapsed === null && after !== null && after.acknowledgedElapsed !== null) playSelectSe();
  const clockBefore = generatedBattleIntroSourceClock(before.elapsed, before.sceneAssemblyDisplayLag);
  const clockAfter = after === null
    ? clockBefore + 1
    : generatedBattleIntroSourceClock(after.elapsed, after.sceneAssemblyDisplayLag);
  if (clockAfter === clockBefore) return;
  const crossed = (tick: number): boolean => clockBefore < tick && tick <= clockAfter;
  const { command } = before;
  for (const entry of ballTraySoundTicks(command.partySummaries)) {
    if (!crossed(entry.tick)) continue;
    if (entry.kind === "enter") emitSound({ kind: "se", id: SE_BALL_TRAY_ENTER, pan: 0, player: "SE12" });
    else if (entry.kind === "ball") {
      emitSound({
        kind: "se",
        id: SE_BALL_TRAY_BALL,
        pan: entry.side === "player" ? TRAY_PAN_PLAYER : TRAY_PAN_OPPONENT,
        player: "SE1",
      });
    } else {
      emitSound({
        kind: "se",
        id: SE_BALL_TRAY_EXIT,
        pan: entry.side === "player" ? TRAY_PAN_PLAYER : TRAY_PAN_OPPONENT,
        player: "SE2",
      });
    }
  }
  const handoff = generatedBattleStartOpponentHandoffTick(before);
  if (handoff === null) return;
  const bgm = introBgm(before);
  const sendOut = (side: "player" | "opponent", pan: number): void => {
    const mon = command.parties[side][command.activePartyIndexes[side]];
    playSendOutCry(bgm, mon.species, cryModeFor(mon.hp, mon.maxHP, mon.status1 !== 0), pan);
  };
  const opponentOpen = handoff + OPPONENT_BALL_OPEN_AFTER_HANDOFF;
  const playerOpen = handoff
    + generatedPlayerDispatchDelay(before)
    + generatedPlayerVisualLag(command.text.playerSendOut[0].length)
    + PLAYER_BALL_OPEN_AFTER_THROW_VISIBLE;
  if (crossed(opponentOpen)) playBallOpenSe();
  if (crossed(opponentOpen + CRY_AFTER_BALL_OPEN_OPPONENT)) sendOut("opponent", CRY_PAN_OPPONENT);
  if (crossed(playerOpen)) playBallOpenSe();
  if (crossed(playerOpen + CRY_AFTER_BALL_OPEN_PLAYER)) sendOut("player", CRY_PAN_PLAYER);
}

/**
 * Mid-battle recall / send-in sounds (docs/aud241a-battle-start-sounds.md). SE_BALL_OPEN is `AnimateBallOpenParticles` in
 * `SpriteCB_ReleaseMonFromBall` (the tick the mon is released; the emerge follows one tick later) and the cry
 * `Task_PlayCryWhenReleasedFromBall` plays 16 ticks later, when the emerge's affine animation ended. Measured on the ROM: the
 * recall's ball open is 2 ticks into the `switch-out` command and the Scene OFF voluntary player send-in's release is 47 ticks into
 * the `switch-in` command (fixture `switch-player-off-window.json`, exact over the window). The opponent's release is placed one tick
 * before its mon becomes visible (elapsed 19, `midBattleSwitchInAt`), the same relation the player has (mon visible 48, release 47);
 * the ROM's SE-to-cry spacing of an opponent faint replacement (fixture `switch-opponent-replacement-off-window.json`) is the same 16.
 * The command's `sendInVisualDelay` shifts both.
 */
const SWITCH_OUT_BALL_OPEN_ELAPSED = 2;
const SWITCH_IN_BALL_OPEN_ELAPSED_PLAYER = 47;
const SWITCH_IN_BALL_OPEN_ELAPSED_OPPONENT = 18;
const SWITCH_IN_CRY_AFTER_BALL_OPEN = 16;

function currentCommand(
  resolution: BattleResolutionPresentationState | null,
): Readonly<{ command: BattleResolutionPresentationCommand; elapsed: number }> | null {
  if (resolution === null || resolution.lifecycle.phase !== "presenting") return null;
  const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
  return command === undefined ? null : { command, elapsed: resolution.lifecycle.phaseElapsed };
}

/** Called once per collected tick with the round's resolution presentation before and after the tick; write-only. */
export function emitMidBattleSwitchSounds(
  before: BattleResolutionPresentationState | null,
  after: BattleResolutionPresentationState | null,
  frontierBrain: boolean,
): void {
  const now = currentCommand(after);
  if (now === null) return;
  const { command, elapsed } = now;
  if (command.type !== "switch-out" && command.type !== "switch-in") return;
  const prior = currentCommand(before);
  const previous = prior !== null && prior.command === command ? prior.elapsed : -1;
  const crossed = (tick: number): boolean => previous < tick && tick <= elapsed;
  if (command.type === "switch-out") {
    if (command.skipAnimation !== true && command.targetAtRest !== true && crossed(SWITCH_OUT_BALL_OPEN_ELAPSED)) playBallOpenSe();
    return;
  }
  const open = (command.battler === 0 ? SWITCH_IN_BALL_OPEN_ELAPSED_PLAYER : SWITCH_IN_BALL_OPEN_ELAPSED_OPPONENT)
    + (command.sendInVisualDelay ?? 0);
  if (crossed(open)) playBallOpenSe();
  if (crossed(open + SWITCH_IN_CRY_AFTER_BALL_OPEN)) {
    const { incoming } = command;
    playSendOutCry(
      factoryBattleBgm(frontierBrain),
      incoming.species,
      cryModeFor(incoming.hp, incoming.maxHP, command.incomingStatus1 !== 0),
      command.battler === 0 ? CRY_PAN_PLAYER : CRY_PAN_OPPONENT,
    );
  }
}

/**
 * The player's party-menu send-out (a faint replacement or forced selection), counted from the SEND OUT confirm. Measured on the
 * canonical trace's MAGBY replacement (ROM window 20771..21063, confirm at 20771): SE_BALL_OPEN at confirm + 143, the cry 16 later at
 * pan -25 and the restore 42 after it. The release clock is ball-relative, so `PartySendOutTiming` carries a longer nickname or
 * CASTFORM's late release into both.
 */
const PARTY_SEND_OUT_BALL_OPEN_RELEASE_CLOCK = 143;

export function emitPartySendOutSounds(
  before: PartySelectState | null,
  after: PartySelectState | null,
  timing: PartySendOutTiming | null,
  frontierBrain: boolean,
): void {
  if (after === null || after.sendOutElapsed === null || after.cursor === "cancel") return;
  const clockOf = (elapsed: number): number => partySendOutReleaseClock(elapsed, timing ?? undefined);
  const previous = before?.sendOutElapsed ?? null;
  const previousClock = previous === null ? Number.NEGATIVE_INFINITY : clockOf(previous);
  const clock = clockOf(after.sendOutElapsed);
  const crossed = (tick: number): boolean => previousClock < tick && tick <= clock;
  if (crossed(PARTY_SEND_OUT_BALL_OPEN_RELEASE_CLOCK)) playBallOpenSe();
  if (crossed(PARTY_SEND_OUT_BALL_OPEN_RELEASE_CLOCK + SWITCH_IN_CRY_AFTER_BALL_OPEN)) {
    const mon = after.party[after.cursor];
    playSendOutCry(factoryBattleBgm(frontierBrain), mon.speciesId, cryModeFor(mon.hp, mon.maxHp, mon.status !== "none"), CRY_PAN_PLAYER);
  }
}
