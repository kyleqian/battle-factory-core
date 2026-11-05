// S11 aud240a/b: screen sound emitters. Write-only presentation (src/audio/soundEvents.ts):
// nothing here reads engine state or changes a branch's outcome.
import { emitSound, soundCollecting } from "../audio/soundEvents.ts";
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import { FAINT_CRY_RESTORE_FRAMES } from "../data/faintCryFrames.ts";
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../data/sendInTailOff.ts";

/** SE_SELECT (include/constants/songs.h), pan-less `PlaySE`. */
export const SE_SELECT = 5;

/** One `PlaySE(SE_SELECT)` on the tick being collected. */
export function playSelectSe(): void {
  emitSound({ kind: "se", id: SE_SELECT, pan: null });
}

/** SE_FAILURE (include/constants/songs.h), pan-less `PlaySE`. */
export const SE_FAILURE = 32;

/** One `PlaySE(SE_FAILURE)` on the tick being collected. */
export function playFailureSe(): void {
  emitSound({ kind: "se", id: SE_FAILURE, pan: null });
}

// ---- aud240b: summary-screen cries, BGM duck and the stop events ----

/** MUS_B_FACTORY: the draft screen's BGM (the ROM probe names the duck target). */
export const BGM_DRAFT = 469;
/** MUS_VS_TRAINER: the in-battle BGM the oracle's battle windows duck. No BGM state exists in the engine yet. */
export const BGM_BATTLE = 476;
/** include/constants/pokemon.h CRY_MODE_*, the PlayCry_ByMode mode argument. */
export const CRY_MODE_NORMAL = 0;
export const CRY_MODE_FAINT = 5;
export const CRY_MODE_WEAK = 11;
/** m4aMPlayVolumeControl(&gMPlayInfo_BGM, TRACKS_ALL, volume): PlayCryInternal's duck and the restore. */
export const BGM_DUCK_VOLUME = 85;
export const BGM_FULL_VOLUME = 0x100;
/** PlayCry_ByMode(species, 0 pan, ...): volume 120, priority 10 (m4a PlayCryInternal arguments, oracle-probed). */
const CRY_VOLUME = 120;
const CRY_PRIORITY = 10;
/** CRY_MODE_WEAK cry lengths in frames (species id -> same unit as SEND_IN_TAIL_OFF_CRY_FRAMES). Only oracle-measured species: Onix, tools/audio/fixtures/summary-party-window.json. */
const WEAK_CRY_FRAMES: Readonly<Record<number, number>> = { 95: 78 };

/** Ticks from the accepted input to each summary sound (oracle-probed, tools/audio/fixtures/summary-*.json). */
export const SUMMARY_OPEN_CRY_DELAY = 63;
export const SUMMARY_CLOSE_STOP_DELAY = 22;
export const SUMMARY_MON_CHANGE_STOP_DELAY = 1;
export const SUMMARY_MON_CHANGE_CRY_DELAY_INFO = 21;
export const SUMMARY_MON_CHANGE_CRY_DELAY_OTHER = 22;

const SPECIES_ID = new Map(
  (speciesStatsData as { species: { id: number; name: string }[] }).species.map((row) => [row.name, row.id]),
);

/** The slice of a summary presentation the cry decision reads (FactoryRentalPresentation satisfies it). */
export interface SummarySoundMon {
  readonly species: string;
  readonly stats: { readonly hp: number; readonly maxHp: number };
  readonly ailment?: string | null;
}

/** battle_gfx_sfx_util.c ShouldPlayNormalMonCry: any status or an HP bar at or below yellow plays the WEAK cry. */
export function summaryCryMode(mon: SummarySoundMon): number {
  return cryModeFor(mon.stats.hp, mon.stats.maxHp, mon.ailment !== undefined && mon.ailment !== null);
}

/** ShouldPlayNormalMonCry (battle_gfx_sfx_util.c): any STATUS1 or a yellow-or-worse HP bar plays the WEAK cry. */
export function cryModeFor(hp: number, maxHp: number, hasStatus: boolean): number {
  if (hasStatus) return CRY_MODE_WEAK;
  if (hp === maxHp) return CRY_MODE_NORMAL;
  // GetHPBarLevel: GetScaledHPFraction(hp, maxHp, 48) <= 48 * 50 / 100 is yellow or worse.
  const fraction = hp > 0 ? Math.max(1, Math.floor((hp * 48) / maxHp)) : 0;
  return fraction > 24 ? CRY_MODE_NORMAL : CRY_MODE_WEAK;
}

interface Scheduled {
  readonly frame: number;
  readonly run: () => void;
  readonly openCry?: true;
}

let currentFrame = 0;
let queue: Scheduled[] = [];
let crySerial = 0;
let ducking: { readonly serial: number; readonly bgm: number } | null = null;

/** Called once at the top of each engine tick being collected. A frame that does not advance means a new run: drop stale state. */
export function beginScreenSoundTick(frame: number): void {
  if (!soundCollecting()) return;
  if (frame <= currentFrame) {
    queue = [];
    ducking = null;
    lowHpPlaying = false;
  }
  currentFrame = frame;
  queue = queue.filter((entry) => entry.frame >= frame);
}

/** Called once at the end of each collected tick: runs what came due on this frame, in scheduling order. */
export function runScheduledScreenSounds(): void {
  if (!soundCollecting()) return;
  for (let index = 0; index < queue.length; index += 1) {
    const entry = queue[index]!;
    if (entry.frame !== currentFrame) continue;
    queue.splice(index, 1);
    index -= 1;
    entry.run();
  }
}

export function scheduleAfter(delay: number, run: () => void, openCry?: true): void {
  if (!soundCollecting()) return;
  if (delay === 0) run();
  else queue.push(openCry ? { frame: currentFrame + delay, run, openCry } : { frame: currentFrame + delay, run });
}

function restoreBgm(bgm: number): void {
  emitSound({ kind: "duck", id: bgm, pan: null, volume: BGM_FULL_VOLUME });
}

/** PlayCry_ByMode: PlayCryInternal ducks the BGM, starts the cry; Task_DuckBGMForPokemonCry restores when the cry ends. */
function startCry(bgm: number, species: number, mode: number, pan: number, restoreDelay?: number): void {
  emitSound({ kind: "duck", id: bgm, pan: null, volume: BGM_DUCK_VOLUME });
  emitSound({ kind: "cry", id: species, pan, mode, volume: CRY_VOLUME, priority: CRY_PRIORITY });
  crySerial += 1;
  const serial = crySerial;
  ducking = { serial, bgm };
  // IsCryPlaying turns false one frame after the cry's last sample frame; a WEAK cry's length is known only for the measured species.
  const length = restoreDelay ?? (mode === CRY_MODE_WEAK ? WEAK_CRY_FRAMES[species] : SEND_IN_TAIL_OFF_CRY_FRAMES[species]);
  if (length === undefined) return;
  scheduleAfter(restoreDelay ?? length + 1, () => {
    if (ducking?.serial !== serial) return;
    ducking = null;
    restoreBgm(bgm);
  });
}

/** Task_PlayCryWhenReleasedFromBall: the send-out cry at pan +25 (opponent) / -25 (player), NORMAL or WEAK by the mon's HP and status. */
export function playSendOutCry(bgm: number, species: number, mode: number, pan: number): void {
  startCry(bgm, species, mode, pan);
}

/** aud241b: `PlayCry_ByMode(species, CRY_MODE_FAINT)` (`playfaintcry`): the BGM duck, the cry, the restore when the cry ends (fitted per species). */
export function playFaintCry(bgm: number, species: number, pan: number): void {
  startCry(bgm, species, CRY_MODE_FAINT, pan, FAINT_CRY_RESTORE_FRAMES[species]);
}

/** include/constants/songs.h: Cmd_effectivenesssound's SEs, dofaintanimation's SE_FAINT and the low-HP loop. */
export const SE_NOT_EFFECTIVE = 12;
export const SE_EFFECTIVE = 13;
export const SE_SUPER_EFFECTIVE = 14;
export const SE_FAINT = 16;
export const SE_LOW_HEALTH = 90;
/** SOUND_PAN_TARGET / SOUND_PAN_ATTACKER: PlaySE12WithPanning(se, BattleGetSide(battler) == player ? -64 : +63). */
export const SE_PAN_PLAYER = -64;
export const SE_PAN_OPPONENT = 63;

/** One `PlaySE12WithPanning(se, pan)` on the tick being collected. */
export function playPannedSe(se: number, pan: number): void {
  emitSound({ kind: "se", id: se, pan });
}

let lowHpPlaying = false;

/** GetHPBarLevel == HP_BAR_RED: a non-full bar whose 48-pixel fraction is 1..9. */
function hpBarIsRed(hp: number, maxHp: number): boolean {
  if (hp <= 0 || hp === maxHp) return false;
  return Math.max(1, Math.floor((hp * 48) / maxHp)) <= 9;
}

/**
 * HandleLowHpMusicChange (battle_gfx_sfx_util.c) in singles: a red bar starts SE_LOW_HEALTH unless it is already playing; any other
 * bar clears the flag and `m4aSongNumStop(SE_LOW_HEALTH)`, which the oracle logs as a no-op unless the song was playing. Only the
 * effective events are emitted (the no-op stops are ROM log noise, `noop: true`).
 */
export function handleLowHpMusicChange(hp: number, maxHp: number): void {
  if (!soundCollecting()) return;
  if (hpBarIsRed(hp, maxHp)) {
    if (lowHpPlaying) return;
    lowHpPlaying = true;
    emitSound({ kind: "se", id: SE_LOW_HEALTH, pan: null });
    return;
  }
  if (!lowHpPlaying) return;
  lowHpPlaying = false;
  emitSound({ kind: "stop", id: SE_LOW_HEALTH, pan: null });
}

export const SE_BALL_OPEN = 15;
export const SE_BALL_TRAY_ENTER = 114;
export const SE_BALL_TRAY_BALL = 115;
export const SE_BALL_TRAY_EXIT = 116;
/** MUS_VS_FRONTIER_BRAIN, the Factory Head's battle BGM (GetBattleBGM). */
export const BGM_FRONTIER_BRAIN = 471;

/** One pan-less `PlaySE(SE_BALL_OPEN)` (battle_anim_throw.c) on the tick being collected. */
export function playBallOpenSe(): void {
  emitSound({ kind: "se", id: SE_BALL_OPEN, pan: null });
}

/** m4aMPlayAllStop then PlayBGM: the battle BGM replaces the map BGM (the same frame on the canonical Battle 2 trace; some labs show one frame between). */
export function startBattleBgm(previousBgm: number, battleBgm: number): void {
  emitSound({ kind: "stop", id: previousBgm, pan: null, player: "BGM" });
  emitSound({ kind: "bgm", id: battleBgm, pan: null });
}

function playCry(bgm: number, mon: SummarySoundMon): void {
  const species = SPECIES_ID.get(mon.species);
  if (species === undefined) return;
  startCry(bgm, species, summaryCryMode(mon), 0);
}

/** StopCryAndClearCrySongs; a cry that was still playing makes the duck task restore the BGM on the same frame. */
function stopCry(): void {
  emitSound({ kind: "stop", id: null, pan: null, player: "cry" });
  if (ducking !== null) {
    const { bgm } = ducking;
    ducking = null;
    restoreBgm(bgm);
  }
}

/** pokemon_summary_screen.c:1523-1524 (ShowPokemonSummaryScreenHandleDeoxys): the close path's stop and unconditional BGM volume restore. */
function closeSummarySounds(bgm: number): void {
  stopCry();
  restoreBgm(bgm);
}

/** The summary screen's mon source: slot -> the presentation the cry is chosen from. */
export interface SummarySoundContext {
  readonly bgm: number;
  readonly monFor: (slot: number) => SummarySoundMon | undefined;
}

/** SpriteCB_Pokemon's first PlayMonCry after the entry fade settles. */
export function scheduleSummaryOpenCry(context: SummarySoundContext, slot: number): void {
  scheduleAfter(
    SUMMARY_OPEN_CRY_DELAY,
    () => {
      const mon = context.monFor(slot);
      if (mon !== undefined) playCry(context.bgm, mon);
    },
    true,
  );
}

interface SummaryScreenView {
  readonly transition: { readonly direction: string } | null;
  readonly isOpen: boolean;
  readonly page: string;
  readonly selectedSlot: number;
  readonly monTransition: unknown;
}

/** Diffs one summary step: an accepted mon change or an accepted close schedules the ROM's task sounds. */
export function scheduleSummaryStepSounds(
  before: SummaryScreenView,
  after: SummaryScreenView,
  context: SummarySoundContext,
): void {
  if (after.monTransition !== null && before.monTransition === null && after.selectedSlot !== before.selectedSlot) {
    const slot = after.selectedSlot;
    scheduleAfter(SUMMARY_MON_CHANGE_STOP_DELAY, stopCry);
    scheduleAfter(
      before.page === "info" ? SUMMARY_MON_CHANGE_CRY_DELAY_INFO : SUMMARY_MON_CHANGE_CRY_DELAY_OTHER,
      () => {
        const mon = context.monFor(slot);
        if (mon !== undefined) playCry(context.bgm, mon);
      },
    );
  }
  if (before.transition === null && before.isOpen && after.transition?.direction === "toDraft") {
    // Task_HandleInput runs before the sprite callback that plays the entry cry: a close accepted on or before that frame preempts it.
    queue = queue.filter((entry) => !(entry.openCry && entry.frame >= currentFrame));
    scheduleAfter(SUMMARY_CLOSE_STOP_DELAY, () => closeSummarySounds(context.bgm));
  }
}

// ---- aud240d: script fanfares and SEs ----

/** include/constants/songs.h numbers of the Factory script sounds. */
export const SE_SAVE = 55;
export const SE_POKENAV_CALL = 263;
export const MUS_HEAL = 368;
export const MUS_OBTAIN_B_POINTS = 459;
export const MUS_OBTAIN_SYMBOL = 466;
/** Frames from a fanfare's start to Task_Fanfare's m4aMPlayContinue(BGM) (oracle-probed, tools/audio/fixtures/heal-window.json). */
export const FANFARE_CONTINUE_DELAY = 160;

/** PlaySE(se) on the tick being collected. */
export function playScriptSe(se: number): void {
  emitSound({ kind: "se", id: se, pan: null });
}

/** PlayFanfareByFanfareNum: m4aMPlayStop(BGM), the fanfare, then m4aMPlayContinue(BGM) when its task ends. */
function playFanfare(fanfare: number, bgm: number, continueDelay: number): void {
  emitSound({ kind: "stop", id: bgm, pan: null, player: "BGM" });
  emitSound({ kind: "fanfare", id: fanfare, pan: null });
  scheduleAfter(continueDelay, () => emitSound({ kind: "continue", id: bgm, pan: null, player: "BGM" }));
}

/** The heal scene's `playfanfare MUS_HEAL` (the postwin heal dismiss), one tick after the accepted A. */
export function scheduleHealFanfare(frontierBrain = false): void {
  scheduleAfter(1, () => playFanfare(MUS_HEAL, BGM_DRAFT, FANFARE_CONTINUE_DELAY));
  if (frontierBrain) scheduleAfter(1 + POKENAV_CALL_AFTER_HEAL_FANFARE, () => playScriptSe(SE_POKENAV_CALL));
}

/** Ticks from the heal fanfare start to the Brain branch's `playse SE_POKENAV_CALL` (continue +3 in tools/audio/fixtures/brain-heal-setup-window.json). */
export const POKENAV_CALL_AFTER_HEAL_FANFARE = 163;

/** Ticks from the terminal's party restore to the script's `playse SE_SAVE` (factory_save, then the SE; tools/audio/fixtures/loss-terminal-window.json and seventh-win-window.json). */
export const TERMINAL_SAVE_AFTER_RESTORE = 122;
/** Ticks from the record menu's YES to SaveBattle's `playse SE_SAVE` (same fixture; the postwin record YES is POSTWIN_RECORD_YES_SAVE_DELAY). */
export const TERMINAL_RECORD_YES_SAVE_DELAY = 19;
/** Ticks from MSGBOX_GETPOINTS' fanfare start to the BGM continue (the 312-frame counter; tools/audio/fixtures/seventh-win-window.json). */
export const BP_FANFARE_CONTINUE_DELAY = 313;

/** The slice of a factory terminal presentation the sound diff reads. */
export interface TerminalSoundView {
  readonly profile: {
    readonly outcome: string;
    readonly statusClearDelayFromSecondRelease?: number;
    readonly restoreDelayFromExchangeRelease?: number;
    readonly battlePointMutationDelay?: number;
  };
  readonly secondPageReleaseAge?: number | null;
  readonly firstPageReleaseAge?: number | null;
  readonly congratsScrollReleaseAge?: number | null;
  readonly awardScrollReleaseAge?: number | null;
  readonly awardReleaseAge?: number | null;
  readonly exchangeReleaseAge?: number | null;
  readonly recordPromptReleaseAge: number | null;
  readonly recordMenuCursorChangedAge: number | null;
  readonly recordChoice: string | null;
}

const newlySet = (before: number | null | undefined, after: number | null | undefined): boolean =>
  (before ?? null) === null && (after ?? null) !== null;

/**
 * Diffs one terminal step. Every accepted A on a paged text box (`\p` / `\l`, TextPrinterWaitWithDownArrow) and on a
 * menu is SE_SELECT; a MSGBOX_DEFAULT wait (waitbuttonpress) is silent. The script's fanfare and SE_SAVE steps are scheduled.
 */
export function scheduleTerminalStepSounds(before: TerminalSoundView, after: TerminalSoundView): void {
  if (!soundCollecting()) return;
  if (after.profile.outcome === "loss") {
    if (newlySet(before.firstPageReleaseAge, after.firstPageReleaseAge)) playSelectSe();
    if (newlySet(before.secondPageReleaseAge, after.secondPageReleaseAge)) {
      playSelectSe();
      scheduleAfter((after.profile.statusClearDelayFromSecondRelease ?? 0) + TERMINAL_SAVE_AFTER_RESTORE, () => playScriptSe(SE_SAVE));
    }
  } else {
    if (newlySet(before.congratsScrollReleaseAge, after.congratsScrollReleaseAge)) playSelectSe();
    if (newlySet(before.awardScrollReleaseAge, after.awardScrollReleaseAge)) playSelectSe();
    if (newlySet(before.awardReleaseAge, after.awardReleaseAge)) {
      scheduleAfter(after.profile.battlePointMutationDelay ?? 1, () => playFanfare(MUS_OBTAIN_B_POINTS, BGM_DRAFT, BP_FANFARE_CONTINUE_DELAY));
    }
    if (newlySet(before.exchangeReleaseAge, after.exchangeReleaseAge)) {
      playSelectSe();
      scheduleAfter((after.profile.restoreDelayFromExchangeRelease ?? 0) + TERMINAL_SAVE_AFTER_RESTORE, () => playScriptSe(SE_SAVE));
    }
  }
  if (newlySet(before.recordPromptReleaseAge, after.recordPromptReleaseAge)) playSelectSe();
  if (after.recordMenuCursorChangedAge !== before.recordMenuCursorChangedAge) playSelectSe();
  if (before.recordChoice === null && after.recordChoice !== null) {
    playSelectSe();
    if (after.recordChoice === "yes") scheduleAfter(TERMINAL_RECORD_YES_SAVE_DELAY, () => playScriptSe(SE_SAVE));
  }
}

/** Ticks from the postwin record menu's accepted YES to SaveBattle's `playse SE_SAVE` (oracle-probed, tools/audio/fixtures/postwin-record-window.json). */
export const POSTWIN_RECORD_YES_SAVE_DELAY = 20;

/** The postwin RECORD question's accepted YES. */
export function schedulePostwinRecordYesSave(): void {
  scheduleAfter(POSTWIN_RECORD_YES_SAVE_DELAY, () => playScriptSe(SE_SAVE));
}
