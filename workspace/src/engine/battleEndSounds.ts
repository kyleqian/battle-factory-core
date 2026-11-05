// S11 aud241c: the sounds of a Factory singles battle's end (victory BGM, the end fade, the battle-return BGM and SE_EXIT) and the
// A-accepted terminal text boxes. Write-only presentation (src/audio/soundEvents.ts): reads the resolution presentation, never
// changes it. docs/aud241c-battle-end-sounds.md.
import { emitSound } from "../audio/soundEvents.ts";
import { factoryBattleBgm } from "./battleStartSounds.ts";
import { BGM_DRAFT, playBallOpenSe, playSelectSe, scheduleAfter, stopLowHpSound } from "./screenSounds.ts";
import type {
  BattleResolutionPresentationCommand,
  BattleResolutionPresentationState,
  BattleResolutionSegment,
} from "./battleResolutionPresentation.ts";

/** include/constants/songs.h. */
export const MUS_VICTORY_TRAINER = 412;
export const MUS_VICTORY_GYM_LEADER = 354;
export const SE_EXIT = 9;
/** B_OUTCOME_WON / B_OUTCOME_LOST (include/constants/battle.h). */
const B_OUTCOME_WON = 1;
const B_OUTCOME_LOST = 2;
/** `FadeOutMapMusic(5)` (HandleEndTurn_FinishBattle): m4aMPlayFadeOut speed. */
const END_FADE_SPEED = 5;

/** Ticks from the dismiss (A) of the last "fainted!" box to `PlayBGM(victory)` (attacker-faint path, all four win windows). */
export const VICTORY_BGM_AFTER_FAINT_DISMISS = 22;
/** Ticks from the dismiss of the last "fainted!" box of a loss to `returnopponentmon1toball`'s SE_BALL_OPEN. */
export const OPPONENT_BALL_OPEN_AFTER_FAINT_DISMISS = 24;
/** Ticks from P (the A on the trainer's lose / win text) to each end sound. */
export const END_FADE_AFTER_TEXT_DISMISS = 6;
export const RETURN_BGM_AFTER_TEXT_DISMISS = 53;
/** The Frontier Brain win's return BGM comes one tick earlier (unexplained, docs/aud241c-fixtures.md). */
export const RETURN_BGM_AFTER_TEXT_DISMISS_BRAIN_WIN = 52;
export const SE_EXIT_AFTER_TEXT_DISMISS = 79;

function currentButtonMessage(
  resolution: BattleResolutionPresentationState | null,
): Readonly<{ command: Extract<BattleResolutionPresentationCommand, { type: "message" }>; segment: BattleResolutionSegment; messageId: string | null }> | null {
  if (resolution === null) return null;
  const segment = resolution.segments[resolution.segmentIndex];
  const command = segment?.commands[resolution.commandIndex];
  if (segment === undefined || command === undefined || command.type !== "message" || command.advance !== "button") return null;
  const payload = segment.events.find((event) => event.sequence === command.eventSequence)?.payload;
  return { command, segment, messageId: payload !== undefined && "messageId" in payload ? (payload.messageId as string) : null };
}

/** Called once per collected tick with the round's resolution presentation before and after the tick; write-only. */
export function emitBattleEndSounds(
  before: BattleResolutionPresentationState | null,
  after: BattleResolutionPresentationState | null,
  frontierBrain: boolean,
): void {
  const prior = currentButtonMessage(before);
  if (prior === null) return;
  const next = after === null ? null : currentButtonMessage(after);
  // The accepted A is the only way out of a button message: the presentation then points at another command, segment or nothing.
  if (next !== null && next.command === prior.command) return;
  const { command, segment, messageId } = prior;
  const outcome = segment.afterRules.rulesContext.battleOutcome;
  const won = (outcome & B_OUTCOME_WON) !== 0;
  const lost = (outcome & B_OUTCOME_LOST) !== 0;
  const bgm = factoryBattleBgm(frontierBrain);
  playSelectSe();
  if (command.faintBattler !== undefined) {
    if (won && command.faintBattler === 1) {
      const victory = frontierBrain ? MUS_VICTORY_GYM_LEADER : MUS_VICTORY_TRAINER;
      scheduleAfter(VICTORY_BGM_AFTER_FAINT_DISMISS, () => {
        stopLowHpSound();
        emitSound({ kind: "bgm", id: victory, pan: null });
      });
    } else if (lost && command.faintBattler === 0 && segment.afterRules.rulesContext.battlers[1]!.hp !== 0) {
      scheduleAfter(OPPONENT_BALL_OPEN_AFTER_FAINT_DISMISS, playBallOpenSe);
    }
    return;
  }
  const winText = messageId === "STRINGID_TRAINER1LOSETEXT" && won;
  const lossText = messageId === "STRINGID_TRAINER1WINTEXT" && lost;
  if (!winText && !lossText) return;
  const brainWin = winText && frontierBrain;
  const fading = winText ? (frontierBrain ? MUS_VICTORY_GYM_LEADER : MUS_VICTORY_TRAINER) : bgm;
  scheduleAfter(END_FADE_AFTER_TEXT_DISMISS, () => emitSound({ kind: "fade", id: fading, pan: null, player: "BGM", speed: END_FADE_SPEED }));
  scheduleAfter(brainWin ? RETURN_BGM_AFTER_TEXT_DISMISS_BRAIN_WIN : RETURN_BGM_AFTER_TEXT_DISMISS, () =>
    emitSound({ kind: "bgm", id: BGM_DRAFT, pan: null }),
  );
  if (!brainWin) scheduleAfter(SE_EXIT_AFTER_TEXT_DISMISS, () => emitSound({ kind: "se", id: SE_EXIT, pan: null }));
}
