// Dev-time extractor for the Summary screen's front-sprite idle animation
// data: the six S9 anchor rentals first, then every other species in the
// Battle Frontier mon table (every Factory rental and opponent, both Level 50
// and Open sets; sfa214). It follows the exact source path used by
// PokemonSummaryDoMonAnimation:
//
//   pokemon.c:sMonAnimationDelayTable -> delay (implicit table entries are 0)
//   pokemon.c:sMonFrontAnimIdsTable   -> animation id/type
//   pokemon_animation.c:sMonAnimFunctions -> movement callback
//   front_pic_anims.h                 -> StartSpriteAnim(..., 1) frame program
//                                        (gMonFrontAnimsPtrTable names it)
//   species_info.h .noFlip            -> IsMonSpriteNotFlipped = sDontFlip
//
// Spinda is deliberately the exceptional single-frame species in
// HasTwoFramesAnimation, so it has no index-1 frame program. This extractor
// records that fact rather than fabricating one. Run with:
//   node --experimental-strip-types tools/extract/extract-summary-front-animation.ts
//
// Never imported at runtime - the production build consumes only the generated
// JSON under src/data/gen/.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DEFAULT_OUTPUT = join(RUN_ROOT, "src", "data", "gen", "summary-front-animation.json");

const ANCHOR_SPECIES = ["ONIX", "MAGBY", "VOLBEAT", "ELECTRIKE", "SPINDA", "SWABLU"] as const;

type Frame = { frame: number; duration: number };
type SpeciesAnimation = {
  species: string;
  delay: number;
  motion: { id: number; type: string; callback: string };
  startsSecondSpriteFrame: boolean;
  spriteFrameProgram: Frame[] | null;
  noFlip: boolean;
};

export type SummaryFrontAnimationData = {
  schema: "summary-front-animation/v1";
  species: SpeciesAnimation[];
};

function initializer(source: string, tableName: string): string {
  const start = source.indexOf(tableName);
  if (start < 0) throw new Error(`source table not found: ${tableName}`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n};", open);
  if (open < 0 || close < 0) throw new Error(`could not read initializer: ${tableName}`);
  return source.slice(open + 1, close);
}

function tableValue(table: string, species: string): string | undefined {
  const match = new RegExp(`\\[SPECIES_${species} - 1\\]\\s*=\\s*([^,\\n]+)`).exec(table);
  return match?.[1]?.trim();
}

function macroNumber(source: string, name: string): number {
  const match = new RegExp(`^#define\\s+${name}\\s+(\\d+)\\s*$`, "m").exec(source);
  if (!match) throw new Error(`animation id macro not found: ${name}`);
  return Number(match[1]);
}

function callbackForType(source: string, type: string): string {
  const match = new RegExp(`\\[${type}\\]\\s*=\\s*(\\w+)`).exec(initializer(source, "sMonAnimFunctions"));
  if (!match) throw new Error(`animation callback not found: ${type}`);
  return match[1]!;
}

function frameProgram(source: string, animationName: string): Frame[] {
  const declaration = new RegExp(
    `static const union AnimCmd ${animationName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`,
  ).exec(source);
  if (!declaration) throw new Error(`sprite frame program not found: ${animationName}`);
  const frames = [...declaration[1]!.matchAll(/ANIMCMD_FRAME\((\d+),\s*(\d+)\)/g)].map((match) => ({
    frame: Number(match[1]),
    duration: Number(match[2]),
  }));
  if (frames.length === 0) throw new Error(`sprite frame program has no frames: ${animationName}`);
  return frames;
}

function excludedFromTwoFrames(pokemonC: string): Set<string> {
  const match = /bool8 HasTwoFramesAnimation\(u16 species\)\s*\{\s*return \((.*?)\);\s*\}/s.exec(pokemonC);
  if (!match) throw new Error("HasTwoFramesAnimation body not found");
  return new Set([...match[1]!.matchAll(/species != SPECIES_(\w+)/g)].map((entry) => entry[1]!));
}

function frontAnimationName(frontPicAnimsH: string, species: string): string {
  const match = new RegExp(`\\[SPECIES_${species}\\]\\s*=\\s*sAnims_(\\w+)`).exec(
    initializer(frontPicAnimsH, "gMonFrontAnimsPtrTable"),
  );
  if (!match) throw new Error(`front anims pointer not found: SPECIES_${species}`);
  return match[1]!;
}

function notFlippedSpecies(speciesInfoH: string): Set<string> {
  const result = new Set<string>();
  for (const block of speciesInfoH.split(/\n    \[SPECIES_/).slice(1)) {
    const name = /^(\w+)\]/.exec(block)?.[1];
    if (name && /\.noFlip\s*=\s*TRUE/.test(block)) result.add(name);
  }
  return result;
}

/** Anchors first, then every other Battle Frontier species in mon-table order. */
export function summaryFrontAnimationSpeciesList(frontierMons: { entries: ReadonlyArray<{ species: string }> }): string[] {
  const species: string[] = [...ANCHOR_SPECIES];
  for (const entry of frontierMons.entries) {
    const name = entry.species.replace(/^SPECIES_/, "");
    if (!species.includes(name)) species.push(name);
  }
  return species;
}

export function buildSummaryFrontAnimationData(sources: {
  pokemonC: string;
  pokemonAnimationC: string;
  pokemonAnimationH: string;
  frontPicAnimsH: string;
  speciesInfoH: string;
  speciesList: readonly string[];
}): SummaryFrontAnimationData {
  const delayTable = initializer(sources.pokemonC, "sMonAnimationDelayTable");
  const frontAnimationTable = initializer(sources.pokemonC, "sMonFrontAnimIdsTable");
  const noSecondFrame = excludedFromTwoFrames(sources.pokemonC);
  const notFlipped = notFlippedSpecies(sources.speciesInfoH);

  return {
    schema: "summary-front-animation/v1",
    species: sources.speciesList.map((species) => {
      const animationName = frontAnimationName(sources.frontPicAnimsH, species);
      const type = tableValue(frontAnimationTable, species);
      if (!type?.startsWith("ANIM_")) throw new Error(`front animation type not found: SPECIES_${species}`);
      const delayText = tableValue(delayTable, species);
      const delay = delayText === undefined ? 0 : Number(delayText);
      if (!Number.isInteger(delay) || delay < 0) throw new Error(`invalid animation delay for SPECIES_${species}: ${delayText}`);

      const startsSecondSpriteFrame = !noSecondFrame.has(species);
      return {
        species: `SPECIES_${species}`,
        delay,
        motion: {
          id: macroNumber(sources.pokemonAnimationH, type),
          type,
          callback: callbackForType(sources.pokemonAnimationC, type),
        },
        startsSecondSpriteFrame,
        spriteFrameProgram: startsSecondSpriteFrame
          ? frameProgram(sources.frontPicAnimsH, `sAnim_${animationName}_1`)
          : null,
        noFlip: notFlipped.has(species),
      };
    }),
  };
}

function readSources() {
  return {
    pokemonC: readFileSync(join(REF, "src", "pokemon.c"), "utf8"),
    pokemonAnimationC: readFileSync(join(REF, "src", "pokemon_animation.c"), "utf8"),
    pokemonAnimationH: readFileSync(join(REF, "include", "pokemon_animation.h"), "utf8"),
    frontPicAnimsH: readFileSync(join(REF, "src", "data", "pokemon_graphics", "front_pic_anims.h"), "utf8"),
    speciesInfoH: readFileSync(join(REF, "src", "data", "pokemon", "species_info.h"), "utf8"),
    speciesList: summaryFrontAnimationSpeciesList(
      JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "battle-frontier-mons.json"), "utf8")),
    ),
  };
}

function main(): void {
  const data = `${JSON.stringify(buildSummaryFrontAnimationData(readSources()))}\n`;
  const outputArg = process.argv.slice(2).find((arg) => arg.startsWith("--out="));
  const output = outputArg?.slice("--out=".length) ?? DEFAULT_OUTPUT;
  if (output === "-") {
    process.stdout.write(data);
    return;
  }
  writeFileSync(resolve(output), data);
  console.log(`wrote ${resolve(output)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
