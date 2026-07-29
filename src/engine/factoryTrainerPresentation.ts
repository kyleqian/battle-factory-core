/**
 * Source-generated Battle Frontier trainer identity as consumed by the
 * Factory presentation layer. Easy Chat speeches retain their source's
 * fixed three-word slots per line; empty slots do not print.
 */

import frontierTrainersData from "../data/gen/battle-frontier-trainers.json" with { type: "json" };
import facilityClassLookupsData from "../data/gen/facility-class-lookups.json" with { type: "json" };

type EasyChatWord = Readonly<{
  source: string;
  text: string | null;
}>;

type FrontierTrainerRow = Readonly<{
  id: number;
  name: string;
  facilityClass: Readonly<{ id: number }>;
  speeches: Readonly<{
    speechBefore: readonly EasyChatWord[];
    speechWin: readonly EasyChatWord[];
    speechLose: readonly EasyChatWord[];
  }>;
}>;

type FacilityClassLookupRow = Readonly<{
  facilityClass: Readonly<{ id: number }>;
  trainerClass: Readonly<{ displayName: string }>;
  trainerPic: Readonly<{ symbol: string }>;
}>;

export interface FactoryTrainerPresentation {
  readonly trainerId: number;
  readonly name: string;
  readonly className: string;
  readonly trainerPic: string;
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

export function getFactoryTrainerPresentation(
  trainerId: number,
): FactoryTrainerPresentation {
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
    name: trainer.name,
    className: facilityClass.trainerClass.displayName,
    trainerPic: facilityClass.trainerPic.symbol,
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

export const CANONICAL_DESTIN_PRESENTATION = getFactoryTrainerPresentation(50);
export const CANONICAL_JENSON_PRESENTATION = getFactoryTrainerPresentation(58);
