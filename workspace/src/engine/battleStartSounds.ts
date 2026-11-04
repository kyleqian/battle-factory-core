// aud241a: the Factory singles battle start's sounds (docs/aud241a-battle-start-sounds.md). Write-only: every function reads
// presentation state and calls emitSound, which is a no-op unless a tick is being collected.
import { emitSound } from "../audio/soundEvents.ts";
import {
  ballTraySoundTicks,
  generatedBattleIntroSourceClock,
  generatedBattleStartOpponentHandoffTick,
  generatedPlayerDispatchDelay,
  generatedPlayerVisualLag,
} from "./battleScene.ts";
import type { FactoryBattleStartIntroState } from "./factoryBattleStartIntro.ts";
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
