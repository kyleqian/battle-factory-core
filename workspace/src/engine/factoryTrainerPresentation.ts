/**
 * Source-generated Battle Frontier trainer identity as consumed by the
 * Factory presentation layer. Easy Chat speeches retain their source's
 * fixed three-word slots per line; empty slots do not print.
 */

import frontierTrainersData from "../data/gen/battle-frontier-trainers.json" with { type: "json" };
import facilityClassLookupsData from "../data/gen/facility-class-lookups.json" with { type: "json" };
import { TRAINER_FRONTIER_BRAIN } from "./factoryAiMaskSelection.ts";
import { expandRomGlyphCodes } from "./font.ts";
import {
  frontierBrainSymbolTier,
  type FrontierBrainStatus,
  type FrontierBrainSymbolTier,
} from "./frontierBrainStatus.ts";

type EasyChatWord = Readonly<{
  source: string;
  text: string | null;
}>;

type FrontierTrainerRow = Readonly<{
  id: number;
  sourceId: string;
  name: string;
  facilityClass: Readonly<{ id: number; source: string }>;
  speeches: Readonly<{
    speechBefore: readonly EasyChatWord[];
    speechWin: readonly EasyChatWord[];
    speechLose: readonly EasyChatWord[];
  }>;
}>;

type FacilityClassLookupRow = Readonly<{
  facilityClass: Readonly<{ id: number; symbol: string }>;
  trainerClass: Readonly<{ id: number; symbol: string; displayName: string }>;
  trainerPic: Readonly<{ id: number; symbol: string }>;
}>;

export interface FactoryTrainerPresentation {
  readonly trainerId: number;
  readonly trainerSourceId: string;
  readonly name: string;
  readonly facilityClassId: number;
  readonly facilityClass: string;
  readonly trainerClassId: number;
  readonly trainerClass: string;
  readonly className: string;
  readonly trainerPicIndex: number;
  readonly trainerPic: string;
  /** Trainer (not battler-mon) gender, for message pronoun text. Only sourced for the Frontier Brain today (`IsFrontierBrainFemale`, §2.3); `null` for the ordinary corpus, which carries no such field. */
  readonly gender: "male" | "female" | null;
  readonly speechBefore: readonly [string, string];
  readonly speechWin: readonly [string, string];
  readonly speechLose: readonly [string, string];
}

const TRAINERS =
  (frontierTrainersData as unknown as { entries: readonly FrontierTrainerRow[] }).entries;
const FACILITY_CLASSES =
  (facilityClassLookupsData as unknown as { entries: readonly FacilityClassLookupRow[] }).entries;

function displayEasyChatWord(text: string): string {
  // The extracted catalog preserves source spelling. The normal font's
  // apostrophe glyph is the localized right-single-quote character.
  return text.replaceAll("'", "’");
}

export function formatFactoryEasyChatSpeech(
  words: readonly EasyChatWord[],
): readonly [string, string] {
  if (words.length !== 6) {
    throw new Error(`Factory Easy Chat speech must contain 6 slots, got ${words.length}`);
  }
  const line = (start: number) => words
    .slice(start, start + 3)
    .flatMap((word) => word.text === null ? [] : [displayEasyChatWord(word.text)])
    .join(" ");
  return Object.freeze([line(0), line(3)] as const);
}

/**
 * `TRAINER_FRONTIER_BRAIN` (1022, `include/constants/trainers.h:12`) is not a
 * row of the ordinary 300-trainer `gFacilityTrainers` corpus above -- the ROM
 * itself routes the Factory's brain through `gTrainers[TRAINER_NOLAND]`
 * directly (`sFrontierBrainTrainerIds[FRONTIER_FACILITY_FACTORY] =
 * TRAINER_NOLAND`, `frontier_util.c:719-728`), a structurally distinct table
 * (`TRAINERS_COUNT` 855 vs the Factory's 300). Ported here as a source-cited
 * special case rather than folded into the generated corpus, per
 * `docs/noland-brain-staging-design.md` §1/§2.3, and re-verified directly
 * against `reference/pokeemerald` this session:
 * - pic/class/name: `GetFrontierBrainTrainerPicIndex`/`…Class`/
 *   `CopyFrontierBrainTrainerName` (`frontier_util.c:2443-2481`) all read
 *   `gTrainers[TRAINER_NOLAND]` (`src/data/trainers.h:9712-9722`):
 *   `.trainerPic = TRAINER_PIC_FACTORY_HEAD_NOLAND` (86,
 *   `include/constants/trainers.h:105`; `.size = 8, .y_offset = 1`,
 *   `src/data/trainer_graphics/front_pic_tables.h:89`), `.trainerClass =
 *   TRAINER_CLASS_FACTORY_HEAD` (0x3e = 62,
 *   `include/constants/trainers.h:350`; display name "FACTORY HEAD",
 *   `src/data/text/trainer_class_names.h:64`), `.trainerName = "NOLAND"`.
 * - gender: `IsFrontierBrainFemale()` (`frontier_util.c:2483-2487`) reads
 *   `sFrontierBrainObjEventGfx[FRONTIER_FACILITY_FACTORY][1]` = `FALSE`
 *   (`frontier_util.c:674`) -- male.
 * - end-of-battle lines (hdl1, docs/hdl1-head-lines-bike-sprite.md): `CopyFrontierTrainerText` (`frontier_util.c:1695-1774`) sends
 *   `TRAINER_FRONTIER_BRAIN` to `CopyFrontierBrainText` (`:2607-2631`) instead of the Easy Chat rows, which copies
 *   `sFrontierBrainPlayerLostTexts` / `sFrontierBrainPlayerWonTexts` (`:774-785`) at the symbol tier `GetFronterBrainSymbol` gives
 *   (`:2587-2604`, `frontierBrainSymbolTier`): `gText_NolandWonSilver` / `gText_NolandDefeatSilver` at Silver (battle 21),
 *   `gText_NolandWonGold` / `gText_NolandDefeatGold` at Gold (battle 42 and every 21 after), `data/text/frontier_brain.inc:30-44`.
 *   "Won" is Noland's line when he wins, so it is `speechWin` (`STRINGID_TRAINER1WINTEXT`, the player lost) and "Defeat" is
 *   `speechLose` (`STRINGID_TRAINER1LOSETEXT`, the player won), the same fields the ordinary corpus's `speechWin` / `speechLose` fill.
 *   Each line is the source string split at its `\n`; `BufferStringBattle` adds the `PAUSE_UNTIL_PRESS` after it (`battle_message.c:
 *   2741-2748`) for every trainer alike. The apostrophe is charmap.txt's B4 glyph (`'` and `’` both, :87-88), carried as `’` as
 *   `displayEasyChatWord` does. Until hdl1 these were empty tuples under a comment calling them absent source data; the Head then
 *   slid in over an empty box (docs/fcr2-catcher-round2.md finding 2).
 * - `speechBefore` stays empty: `CopyFrontierTrainerText(FRONTIER_BEFORE_TEXT)` would also copy the player-lost line for the brain, but
 *   the Factory never asks for it (`BattleOpponent` goes to `BattleNoland` before `palace_getopponentintro`,
 *   `BattleFrontier_BattleFactoryBattleRoom/scripts.inc:74-76`; his speech is the walk-up script's), and `battleRoomQuote` never reads it.
 */
const NOLAND_END_OF_BATTLE_LINES: Readonly<Record<
  FrontierBrainSymbolTier,
  Readonly<{ speechWin: readonly [string, string]; speechLose: readonly [string, string] }>
>> = Object.freeze({
  silver: Object.freeze({
    // gText_NolandWonSilver (frontier_brain.inc:31-33) / gText_NolandDefeatSilver (:35-37).
    speechWin: Object.freeze(["Way to work!", "That was a good lesson, eh?"] as const),
    speechLose: Object.freeze(["Good job!", "You know what you’re doing!"] as const),
  }),
  gold: Object.freeze({
    // gText_NolandWonGold (:39-41) / gText_NolandDefeatGold (:43-44, one line).
    speechWin: Object.freeze(["Hey, hey, hey!", "You’re finished already?"] as const),
    speechLose: Object.freeze(["What happened here?", ""] as const),
  }),
});

function frontierBrainPresentation(tier: FrontierBrainSymbolTier): FactoryTrainerPresentation {
  return Object.freeze({
    trainerId: TRAINER_FRONTIER_BRAIN,
    trainerSourceId: "TRAINER_NOLAND",
    name: "NOLAND",
    facilityClassId: -1,
    facilityClass: "N/A",
    trainerClassId: 0x3e,
    trainerClass: "TRAINER_CLASS_FACTORY_HEAD",
    className: "FACTORY HEAD",
    trainerPicIndex: 86,
    trainerPic: "TRAINER_PIC_FACTORY_HEAD_NOLAND",
    gender: "male",
    speechBefore: Object.freeze(["", ""]) as readonly [string, string],
    speechWin: NOLAND_END_OF_BATTLE_LINES[tier].speechWin,
    speechLose: NOLAND_END_OF_BATTLE_LINES[tier].speechLose,
  });
}

const FRONTIER_BRAIN_PRESENTATIONS: Readonly<Record<FrontierBrainSymbolTier, FactoryTrainerPresentation>> = Object.freeze({
  silver: frontierBrainPresentation("silver"),
  gold: frontierBrainPresentation("gold"),
});

/**
 * The Factory Head's presentation for one Head battle's status (its symbol tier picks his end-of-battle lines). The trainer id alone
 * carries no tier (the ROM reads it from the save's symbols and streak), so `getFactoryTrainerPresentation(TRAINER_FRONTIER_BRAIN)`
 * without a status gives the Silver tier, battle 21's; a round's opponent passes its own status (`factoryTrainerPresentationForOpponent`).
 */
export function getFrontierBrainPresentation(
  status: Exclude<FrontierBrainStatus, "not-ready">,
): FactoryTrainerPresentation {
  return FRONTIER_BRAIN_PRESENTATIONS[frontierBrainSymbolTier(status)];
}

export function getFactoryTrainerPresentation(
  trainerId: number,
  frontierBrainStatus: Exclude<FrontierBrainStatus, "not-ready"> = "silver",
): FactoryTrainerPresentation {
  if (trainerId === TRAINER_FRONTIER_BRAIN) return getFrontierBrainPresentation(frontierBrainStatus);
  const trainer = TRAINERS[trainerId];
  if (trainer === undefined || trainer.id !== trainerId) {
    throw new Error(`missing Battle Frontier trainer ${trainerId}`);
  }
  const facilityClass = FACILITY_CLASSES.find(
    (entry) => entry.facilityClass.id === trainer.facilityClass.id,
  );
  if (facilityClass === undefined) {
    throw new Error(
      `Battle Frontier trainer ${trainerId} has missing facility class ${trainer.facilityClass.id}`,
    );
  }
  return Object.freeze({
    trainerId,
    trainerSourceId: trainer.sourceId,
    name: trainer.name,
    facilityClassId: facilityClass.facilityClass.id,
    facilityClass: facilityClass.facilityClass.symbol,
    trainerClassId: facilityClass.trainerClass.id,
    trainerClass: facilityClass.trainerClass.symbol,
    // trainer_class_names.h spells three classes with the PK MN glyph pair (`_("{PKMN} BREEDER")`, :6; RANGER :54; TRAINER :2):
    // the display name carries those two glyphs, not the brace code's six letters (pkm1, docs/pkm1-pkmn-glyphs.md).
    className: expandRomGlyphCodes(facilityClass.trainerClass.displayName),
    trainerPicIndex: facilityClass.trainerPic.id,
    trainerPic: facilityClass.trainerPic.symbol,
    gender: null,
    speechBefore: formatFactoryEasyChatSpeech(trainer.speeches.speechBefore),
    speechWin: formatFactoryEasyChatSpeech(trainer.speeches.speechWin),
    speechLose: formatFactoryEasyChatSpeech(trainer.speeches.speechLose),
  });
}

export function getFactoryTrainerPresentationByName(
  trainerName: string,
): FactoryTrainerPresentation {
  const trainer = TRAINERS.find((entry) => entry.name === trainerName);
  if (trainer === undefined) {
    throw new Error(`missing Battle Frontier trainer named ${trainerName}`);
  }
  return getFactoryTrainerPresentation(trainer.id);
}

/**
 * Generated round opponents carry their source trainer id in their stable
 * `factory-trainer-N` identity. Simplified fixture opponents deliberately
 * return null rather than being mistaken for generated semantic state.
 */
export function factoryTrainerPresentationForOpponent(
  opponent: Readonly<{
    id: string;
    trainerName: string;
    frontierBrain?: Readonly<{ status: Exclude<FrontierBrainStatus, "not-ready"> }>;
  }> | undefined,
): FactoryTrainerPresentation | null {
  if (opponent === undefined) return null;
  const match = /^factory-trainer-(\d+)$/.exec(opponent.id);
  if (match === null) return null;
  const trainerId = Number(match[1]);
  // hdl1: the Head's lines follow his battle's symbol tier, so a generated Head opponent must carry its status (generatedOpponent,
  // factoryRoundBattleOrchestrator.ts, always sets it); an ordinary trainer must not.
  if ((trainerId === TRAINER_FRONTIER_BRAIN) !== (opponent.frontierBrain !== undefined)) {
    throw new Error(
      `generated trainer identity mismatch: ${opponent.id} ${opponent.frontierBrain === undefined ? "has no" : "has a"} Frontier Brain status`,
    );
  }
  const presentation = getFactoryTrainerPresentation(trainerId, opponent.frontierBrain?.status);
  if (presentation.name !== opponent.trainerName) {
    throw new Error(
      `generated trainer identity mismatch: ${opponent.id} is ${presentation.name}, got ${opponent.trainerName}`,
    );
  }
  return presentation;
}

export const CANONICAL_DESTIN_PRESENTATION = getFactoryTrainerPresentation(50);
export const CANONICAL_JENSON_PRESENTATION = getFactoryTrainerPresentation(58);
export const CANONICAL_NOLAND_PRESENTATION =
  getFactoryTrainerPresentation(TRAINER_FRONTIER_BRAIN);
