/**
 * ISSUES #128 receipt fixtures — three `mechanicLab` `overrides.parties` arms
 * that make the ROM's `RecordAbilityBattle(0, ...)` on battle-start
 * Intimidate/Trace observable, plus the `Cmd_get_ability` draw it removes.
 *
 * Source: `AbilityBattleEffects` tail `battle_util.c:3194-3195` records
 * `(battler, gLastUsedAbility)`, and BOTH battle-start dispatch sites pass the
 * literal `0` (`battle_main.c:3880/3882`), so the record always lands on
 * `BATTLE_HISTORY->abilities[0]` — the PLAYER's slot — whoever the holder is.
 * `Cmd_get_ability` (`battle_ai_script_commands.c`) reads `abilities[battler]`
 * first and returns without drawing when it is non-zero, so a non-zero slot-0
 * record removes one `Random()` per two-ability-player `get_ability`.
 *
 * Arms (player lead is always the two-ability Golduck of Frontier set 418, so
 * every `get_ability AI_TARGET` reaches the `Random() & 1` guess unless a
 * slot-0 record short-circuits it):
 *   intimidate — AI lead Mightyena (set 202 species, Intimidate only)
 *   control    — AI lead Poochyena (same Dark family, single-ability Run Away)
 *   trace      — AI lead Gardevoir (set 813 species, abilitySlot 1 = Trace)
 * Every AI slot carries one move so the Factory AI has exactly one legal
 * choice without any injected decision.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Segment = Readonly<{ frames: number; buttons: readonly string[] }>;

const outputDir = process.argv[2] ?? "tools/battle-lab";

const MOVE_BITE = 44;
const MOVE_PSYCHIC = 94;
const MOVE_HYDRO_PUMP = 56;
const MOVE_DIG = 91;
const MOVE_BRICK_BREAK = 280;
const MOVE_LIGHT_SCREEN = 113;
const MOVE_TACKLE = 33;

const SPECIES_GOLDUCK = 55;
const SPECIES_MILTANK = 241;
const SPECIES_IVYSAUR = 2;
const SPECIES_MURKROW = 198;
const SPECIES_UMBREON = 197;
const SPECIES_MIGHTYENA = 287;
const SPECIES_POOCHYENA = 286;
const SPECIES_GARDEVOIR = 394;

const ivs = { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 } as const;
const evs = { hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 } as const;

function mon(species: number, moves: readonly number[], abilitySlot = 0) {
  return {
    species,
    level: 50,
    nature: 0,
    ivs,
    evs,
    moves,
    ppUps: [0, 0, 0, 0],
    item: 0,
    abilitySlot,
    friendship: 70,
    shiny: false,
  };
}

function trace() {
  const segments: Segment[] = [
    { frames: 2, buttons: ["A"] },
    { frames: 30, buttons: [] },
    ...Array.from({ length: 40 }, () => [
      { frames: 2, buttons: ["A"] } as const,
      { frames: 18, buttons: [] } as const,
    ]).flat(),
  ];
  const totalFrames = segments.reduce((sum, segment) => sum + segment.frames, 0);
  return { segments, captureFrames: [0, totalFrames - 1] };
}

function scenario(aiLead: ReturnType<typeof mon>) {
  return {
    schemaVersion: 1,
    mode: "mechanicLab",
    profile: "battle-scene-off",
    level: 50,
    challengeNum: 4,
    battleNum: 0,
    trainerId: 150,
    playerSetIds: [495, 496, 497],
    opponentSetIds: [498, 499, 500],
    seed: 305419897,
    overrides: {
      parties: {
        // Golduck (Frontier set 418): abilitySlot 0 = ABILITY_DAMP, with
        // ABILITY_CLOUD_NINE in slot 1, so the species is two-ability and every
        // unobserved `get_ability AI_TARGET` must draw.
        player: [
          mon(SPECIES_GOLDUCK, [MOVE_HYDRO_PUMP, MOVE_DIG, MOVE_BRICK_BREAK, MOVE_LIGHT_SCREEN], 0),
          mon(SPECIES_MILTANK, [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE], 0),
          mon(SPECIES_IVYSAUR, [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE], 0),
        ],
        opponent: [
          aiLead,
          mon(SPECIES_MURKROW, [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE], 0),
          mon(SPECIES_UMBREON, [MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE, MOVE_TACKLE], 0),
        ],
      },
    },
    trace: trace(),
  };
}

const arms = [
  ["intimidate", mon(SPECIES_MIGHTYENA, [MOVE_BITE, MOVE_BITE, MOVE_BITE, MOVE_BITE], 0)],
  ["control", mon(SPECIES_POOCHYENA, [MOVE_BITE, MOVE_BITE, MOVE_BITE, MOVE_BITE], 0)],
  ["trace", mon(SPECIES_GARDEVOIR, [MOVE_PSYCHIC, MOVE_PSYCHIC, MOVE_PSYCHIC, MOVE_PSYCHIC], 1)],
] as const;

mkdirSync(outputDir, { recursive: true });
for (const [arm, aiLead] of arms) {
  const path = join(outputDir, `issue128-ability-history-${arm}-off.json`);
  writeFileSync(path, `${JSON.stringify(scenario(aiLead), null, 2)}\n`);
  console.log(path);
}
