# shd1: Shedinja max HP 1 (CalculateMonStats)

**ROM rule** (`reference/pokeemerald/src/pokemon.c`, `CalculateMonStats`, ~2845): `if (species == SPECIES_SHEDINJA) newMaxHP = 1;`, and after the stats
`if (species == SPECIES_SHEDINJA) { if (currentHP != 0 || oldMaxHP == 0) currentHP = 1; else return; }`. A freshly built mon (HP 0, max 0) therefore has HP 1 / max 1.

**Bug:** `factoryCorpusParty.ts` used the plain formula (88 at Level 50 for set 21).

## Sites changed
- `src/engine/stats.ts`: new `calculateMaxHp(species, base, iv, ev, level)` (303 gives 1, else `calculateHpStat`).
- `src/engine/factoryCorpusParty.ts`: the only max-HP computation in `src/` (every opponent, rental, swap and staged party member goes through it); `hp: maxHP` gives HP 1.
- `tools/integration/{bso225Compare,frs247Production,vis243aCompare}.ts`: presentation compare tools that built a max HP from `calculateHpStat`; now `calculateMaxHp`.
- Already right, no change: `tools/integration/fnt201Production.ts` (`species === 303 ? 1`), the construction-clock model `factoryConstructionClock.ts` (Shedinja branch), `healthboxAssembly.ts`
  (Q_24_8 bar branch for max HP below 48, both scenes), Wonder Guard (`battleScriptHitChainOpcode.ts` and the AI files). `tools/compare/appTrace.ts` `rattataAtLevel` is Rattata only.

## Reachability (the brief's premise is wrong)
Set 21 (`FRONTIER_MON_SHEDINJA`, the only Shedinja set) is in no Factory range: `sInitialRentalMonRanges` (`battle_factory.c:169`) starts at set 110 (Level 50) and 372 (Open).
No rental, opponent, swap or Brain party can hold it, so no Factory battle changes. It appears only through the Mechanic Lab's hand-built parties (`overrides.parties`).

## Evidence
- `tests/factoryCorpusShedinjaHp.test.ts` green (was 94 vs 1 / 88 vs 1).
- `stages/coverage/R057-beat-up-shedinja.json` (Shedinja on the OPPONENT side): ROM match 7 / 7, 0 diff points, `stage.ok` true, Scene OFF and Scene ON.
- `stages/shd1-shedinja-player-side.json` (Shedinja on the PLAYER side, opponent Clefable Beat Up x4, seed 90000, challenge 7, mechanicLab): ROM match 16 / 16 to the end of the battle
  (the player loses), 0 diff points, `stage.ok` true. A factoryLegal battle cannot hold set 21 (above); mechanicLab is the only way.
- Census seeds 0..999, both scenes (`lsd194Census.sh`, base 12c52de1e vs the fix): 0 changed `eventsDigest` in Scene OFF and in Scene ON (`rst197CensusDelta.py`: 1000 identical battles each);
  `sound`, `soundDigest`, `soundCmd` and `soundAnim` identical on all 2000 (T1 sound 0 / 0 / 0). No battle has a Shedinja on either side, consistent with the ranges.
- `npm run typecheck` 0, `npm run build` 0, `npm run test:gate` 362 files / 2844 tests green, 53 files that name Shedinja / the stat helpers / the changed tools plus `lbrd` and `randomRoundSoak` green.
- No re-pins were needed.
