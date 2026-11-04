// S11 aud240a/b: screen sound emitters. Write-only presentation (src/audio/soundEvents.ts):
// nothing here reads engine state or changes a branch's outcome.
import { emitSound, soundCollecting } from "../audio/soundEvents.ts";
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
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
  if (mon.ailment !== undefined && mon.ailment !== null) return CRY_MODE_WEAK;
  const { hp, maxHp } = mon.stats;
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

function scheduleAfter(delay: number, run: () => void, openCry?: true): void {
  if (!soundCollecting()) return;
  if (delay === 0) run();
  else queue.push(openCry ? { frame: currentFrame + delay, run, openCry } : { frame: currentFrame + delay, run });
}

function restoreBgm(bgm: number): void {
  emitSound({ kind: "duck", id: bgm, pan: null, volume: BGM_FULL_VOLUME });
}

/** PlayCry_ByMode: PlayCryInternal ducks the BGM, starts the cry; Task_DuckBGMForPokemonCry restores when the cry ends. */
function playCry(bgm: number, mon: SummarySoundMon): void {
  const species = SPECIES_ID.get(mon.species);
  if (species === undefined) return;
  const mode = summaryCryMode(mon);
  emitSound({ kind: "duck", id: bgm, pan: null, volume: BGM_DUCK_VOLUME });
  emitSound({ kind: "cry", id: species, pan: 0, mode, volume: CRY_VOLUME, priority: CRY_PRIORITY });
  crySerial += 1;
  const serial = crySerial;
  ducking = { serial, bgm };
  // IsCryPlaying turns false one frame after the cry's last sample frame; a WEAK cry's length is known only for the measured species.
  const length = mode === CRY_MODE_WEAK ? WEAK_CRY_FRAMES[species] : SEND_IN_TAIL_OFF_CRY_FRAMES[species];
  if (length === undefined) return;
  scheduleAfter(length + 1, () => {
    if (ducking?.serial !== serial) return;
    ducking = null;
    restoreBgm(bgm);
  });
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
export function scheduleHealFanfare(): void {
  scheduleAfter(1, () => playFanfare(MUS_HEAL, BGM_DRAFT, FANFARE_CONTINUE_DELAY));
}
