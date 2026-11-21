// S11 aud241c: the sounds of a Factory singles battle's end (victory BGM, the end fade, the battle-return BGM and SE_EXIT) and the
// A-accepted terminal text boxes. Write-only presentation (src/audio/soundEvents.ts): reads the resolution presentation, never
// changes it. docs/aud241c-battle-end-sounds.md.
import { emitSound } from "../audio/soundEvents.ts";
import { factoryBattleBgm } from "./battleStartSounds.ts";
import { BGM_DRAFT, playSelectSe, scheduleAfter, stopLowHpSound } from "./screenSounds.ts";
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

/** gBattleOutcome's outcome bits (B_OUTCOME_LINK_BATTLE_RAN, 1 << 7, aside). */
const B_OUTCOME_MASK = 0x7f;
const PLAYER_DEFEATED_MESSAGE_ID = "STRINGID_PLAYERDEFEATEDTRAINER1";

/**
 * lha1 (docs/lha1-lowhp-alarm-berry-flash.md): `HandleEndTurn_BattleWon` (battle_main.c:4960-4982) plays the victory BGM (and
 * `BattleStopLowHpSound`) when the turn has ended, after every message and HP bar of the winning turn; the next command of the win script
 * (`BattleScript_FrontierTrainerBattleWon`'s printstring STRINGID_PLAYERDEFEATEDTRAINER1) follows it. The anchor is the turn's last presented
 * command before that print, not counting moveend's one-row sprite-visibility receipts, which are rows inside the delay. Ticks from the
 * tick the presentation leaves the anchor (a button box: its accepted A) to `PlayBGM(victory)`:
 * - a button box (the last "fainted!", the ordinary win): 22 (the aud241c windows; the printer's release, return, moveendall, the
 *   fainted-mon scripts, the turn's end).
 * - an automatic message (its waitmessage hold included), e.g. ROUGH SKIN's "hurt" line after the faint: 19 (catcher seed 2 Scene OFF,
 *   battle 9: the message's last glyph + 64 + 20 on the ROM).
 * - an HP bar or another controller command, e.g. SHELL BELL's heal (the last thing BattleScript_ItemHealHP_Ret shows): 14 (catcher seed 2
 *   Scene OFF battles 10 and 11, seed 10 Scene ON battle 10: the bar's last change + 18 on the ROM, our hp command ends 4 ticks after it).
 */
export const VICTORY_BGM_AFTER_FAINT_DISMISS = 22;
export const VICTORY_BGM_AFTER_AUTOMATIC_MESSAGE = 19;
export const VICTORY_BGM_AFTER_CONTROLLER_COMMAND = 14;
// The loss's `returnopponentmon1toball` SE_BALL_OPEN (aud241c: 22 ticks after the first tick of its command) is the recall `switch-out`'s own
// ball open since lrc1 (battleStartSounds.ts emitMidBattleSwitchSounds; LOSS_RECALL_LEAD_FRAMES + 2 = 22, battleResolutionPresentation.ts).
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

type CommandPosition = Readonly<{ segmentIndex: number; commandIndex: number }>;

function messageIdOf(segment: BattleResolutionSegment, command: BattleResolutionPresentationCommand): string | null {
  if (command.type !== "message") return null;
  const payload = segment.events.find((event) => event.sequence === command.eventSequence)?.payload;
  return payload !== undefined && "messageId" in payload ? (payload.messageId as string) : null;
}

function isBefore(a: CommandPosition, b: CommandPosition): boolean {
  return a.segmentIndex < b.segmentIndex || (a.segmentIndex === b.segmentIndex && a.commandIndex < b.commandIndex);
}

/**
 * lha1: the command `HandleEndTurn_BattleWon`'s PlayBGM is timed from (VICTORY_BGM_AFTER_*) and its delay, or null when the presentation
 * holds no win script from `from` on. Only for B_OUTCOME_WON exactly: sEndTurnFuncsTable sends B_OUTCOME_DREW (WON | LOST, a double KO of
 * both last Pokemon) to HandleEndTurn_BattleLost, which plays no victory BGM (battle_main.c:556-559).
 */
export function victoryBgmAnchor(
  resolution: BattleResolutionPresentationState,
  from: number,
): Readonly<CommandPosition & { delay: number }> | null {
  const { segments } = resolution;
  for (let segmentIndex = from; segmentIndex < segments.length; segmentIndex += 1) {
    const segment = segments[segmentIndex]!;
    const start = segment.commands.findIndex((command) => messageIdOf(segment, command) === PLAYER_DEFEATED_MESSAGE_ID);
    if (start < 0) continue;
    if ((segment.afterRules.rulesContext.battleOutcome & B_OUTCOME_MASK) !== B_OUTCOME_WON) return null;
    // Walk back from the print, across segment starts, over the sprite-visibility receipts and the win tail's draw-nothing holds (wtl1).
    let s = segmentIndex;
    let c = start - 1;
    while (s >= from) {
      if (c < 0) {
        s -= 1;
        c = s >= 0 ? segments[s]!.commands.length - 1 : -1;
        continue;
      }
      const command = segments[s]!.commands[c]!;
      const winTailRow = command.type === "sprite-visibility" || (command.type === "move-animation" && !command.animation);
      if (!winTailRow) {
        const delay = command.type !== "message"
          ? VICTORY_BGM_AFTER_CONTROLLER_COMMAND
          : command.advance === "button" ? VICTORY_BGM_AFTER_FAINT_DISMISS : VICTORY_BGM_AFTER_AUTOMATIC_MESSAGE;
        return Object.freeze({ segmentIndex: s, commandIndex: c, delay });
      }
      c -= 1;
    }
    return null;
  }
  return null;
}

/** Whether any segment from `from` on prints the win script's first line (victoryBgmAnchor's search). */
function holdsWinScript(resolution: BattleResolutionPresentationState, from: number): boolean {
  return resolution.segments.slice(from).some((segment) =>
    segment.commands.some((command) => messageIdOf(segment, command) === PLAYER_DEFEATED_MESSAGE_ID));
}

/**
 * lha1: `HandleEndTurn_BattleWon`'s `BattleStopLowHpSound` + `PlayBGM(victory)`, scheduled on the tick the presentation leaves the turn's last
 * command before the win script (victoryBgmAnchor). Before lha1 it was scheduled from the last "fainted!" box's A, so a SHELL BELL heal after
 * the winning blow (still in the red) ended after the stop and its HandleLowHpMusicChange started SE_LOW_HEALTH again, to the next battle.
 */
function emitVictoryBgm(
  before: BattleResolutionPresentationState,
  after: BattleResolutionPresentationState | null,
  frontierBrain: boolean,
): void {
  const anchor = victoryBgmAnchor(before, before.segmentIndex);
  if (anchor === null) return;
  const at: CommandPosition = { segmentIndex: before.segmentIndex, commandIndex: before.commandIndex };
  if (isBefore(anchor, at)) return;
  // Another resolution (or none) after the tick: everything of this one has been left.
  const now: CommandPosition | null = after === null || after.segments !== before.segments
    ? null
    : { segmentIndex: after.segmentIndex, commandIndex: after.commandIndex };
  if (now !== null && !isBefore(anchor, now)) return;
  scheduleVictoryBgm(anchor.delay, frontierBrain);
}

function scheduleVictoryBgm(delay: number, frontierBrain: boolean): void {
  const victory = frontierBrain ? MUS_VICTORY_GYM_LEADER : MUS_VICTORY_TRAINER;
  scheduleAfter(delay, () => {
    stopLowHpSound();
    emitSound({ kind: "bgm", id: victory, pan: null });
  });
}

/** Called once per collected tick with the round's resolution presentation before and after the tick; write-only. */
export function emitBattleEndSounds(
  before: BattleResolutionPresentationState | null,
  after: BattleResolutionPresentationState | null,
  frontierBrain: boolean,
): void {
  if (before !== null) emitVictoryBgm(before, after, frontierBrain);
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
    // A presentation without the win script's print (none is known in the Factory): the aud241c rule, from the foe's last "fainted!" box.
    if (won && !lost && command.faintBattler === 1 && !holdsWinScript(before!, before!.segmentIndex)) {
      scheduleVictoryBgm(VICTORY_BGM_AFTER_FAINT_DISMISS, frontierBrain);
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

/**
 * frf250b: the forfeit's end sounds (ROM lab: fade 254, MUS_B_FACTORY 300, SE_EXIT 326 for the tick that ends the battle at 249).
 * Same sounds as the lost battle's tail, measured from the forfeit's own end tick.
 */
export const FORFEIT_END_FADE_AFTER_END = 5;
export const FORFEIT_RETURN_BGM_AFTER_END = 51;
export const FORFEIT_SE_EXIT_AFTER_END = 77;

export function emitForfeitEndSounds(
  beforePhase: string | null,
  battleEnded: boolean,
  frontierBrain: boolean,
): void {
  if (beforePhase !== "forfeit-message" || !battleEnded) return;
  const bgm = factoryBattleBgm(frontierBrain);
  scheduleAfter(FORFEIT_END_FADE_AFTER_END, () => emitSound({ kind: "fade", id: bgm, pan: null, player: "BGM", speed: END_FADE_SPEED }));
  scheduleAfter(FORFEIT_RETURN_BGM_AFTER_END, () => emitSound({ kind: "bgm", id: BGM_DRAFT, pan: null }));
  scheduleAfter(FORFEIT_SE_EXIT_AFTER_END, () => emitSound({ kind: "se", id: SE_EXIT, pan: null }));
}
