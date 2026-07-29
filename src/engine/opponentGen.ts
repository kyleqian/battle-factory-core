// Battle-1 opponent personality generation + battle-transition selection —
// pure Random32()-rejection-loop logic ported from
// reference/pokeemerald/src/pokemon.c (CreateMonWithEVSpreadNatureOTID's
// nature-rejection loop, GetNatureFromPersonality) and
// reference/pokeemerald/src/battle_setup.c (GetSpecialBattleTransition's
// RANDOM_TRANSITION pick). Checkpoint-seeded: callers supply an explicit
// starting gRngValue rather than deriving one from the anchor's frame 0 (the
// per-tick stream between them has an unattributed burst - see
// docs/battle-bringup-notes.md §3, ticks 509-511 - wiring this into the tick
// loop is out of scope for this step). See tests/opponentGen.test.ts for the
// RAM-dumped checkpoints this module is pinned against.

import { advanceRngValue } from "./rng.ts";
import naturesData from "../data/gen/natures.json" with { type: "json" };
import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import transitionsFrontierData from "../data/gen/battle-transitions-frontier.json" with { type: "json" };

interface NatureEntry {
  index: number;
  name: string;
}

interface FrontierMonEntry {
  index: number;
  species: string;
  nature: string;
}

interface FrontierTransitionEntry {
  id: number;
  name: string;
}

const NATURES = (naturesData as { natures: NatureEntry[] }).natures;
const NUM_NATURES = NATURES.length;
const NATURE_INDEX_BY_NAME: ReadonlyMap<string, number> = new Map(NATURES.map((n) => [n.name, n.index]));

function natureIndexByName(name: string): number {
  const index = NATURE_INDEX_BY_NAME.get(name);
  if (index === undefined) throw new Error(`unknown nature: ${name}`);
  return index;
}

const FRONTIER_MONS = (frontierMonsData as { entries: FrontierMonEntry[] }).entries;
const FRONTIER_TRANSITIONS = (transitionsFrontierData as { table: FrontierTransitionEntry[] }).table;

/** One Random() call (src/random.c): advances gRngValue, returns its new upper 16 bits. */
export function randomU16(rngValue: number): { rngValue: number; value: number } {
  const next = advanceRngValue(rngValue);
  return { rngValue: next, value: (next >>> 16) & 0xffff };
}

/**
 * Random32() (include/random.h): `#define Random32() (Random() | (Random() << 16))`.
 * The low word comes from whichever Random() call executes FIRST, the high
 * word from the SECOND — confirmed (not assumed) against the RAM-dumped
 * personalities in tests/opponentGen.test.ts; the reverse assignment fails
 * to reproduce any of the three pinned values.
 */
export function randomU32(rngValue: number): { rngValue: number; value: number } {
  const lo = randomU16(rngValue);
  const hi = randomU16(lo.rngValue);
  return { rngValue: hi.rngValue, value: (lo.value | (hi.value << 16)) >>> 0 };
}

/** GetNatureFromPersonality (src/pokemon.c:5498-5501): `personality % NUM_NATURES`. */
export function natureFromPersonality(personality: number): number {
  return personality % NUM_NATURES;
}

export interface RejectionLoopResult {
  /** gRngValue immediately after the successful (accepted) Random32() draw. */
  rngValue: number;
  personality: number;
  /** Number of Random32() draws taken, including the accepted one (>= 1). */
  iterations: number;
}

/**
 * CreateMonWithEVSpreadNatureOTID's nature-rejection loop (src/pokemon.c:2570-2573):
 *   do { i = Random32(); } while (nature != GetNatureFromPersonality(i));
 */
export function rollPersonalityForNature(rngValue: number, targetNature: number): RejectionLoopResult {
  let state = rngValue;
  let iterations = 0;
  let personality: number;
  do {
    const rolled = randomU32(state);
    state = rolled.rngValue;
    personality = rolled.value;
    iterations++;
  } while (natureFromPersonality(personality) !== targetNature);
  return { rngValue: state, personality, iterations };
}

export interface TransitionPickResult {
  rngValue: number;
  /** Index into the 12-entry frontier transition table (src/data/gen/battle-transitions-frontier.json). */
  tableIndex: number;
  /** B_TRANSITION_* id (include/battle_transition.h). */
  transitionId: number;
  /** Raw Random() output the pick was drawn from. */
  raw: number;
}

/**
 * GetSpecialBattleTransition's RANDOM_TRANSITION(sBattleTransitionTable_BattleFrontier)
 * (src/battle_setup.c:863,885,131-145): `table[Random() % ARRAY_COUNT(table)]`, one Random() call.
 */
export function pickFrontierTransition(rngValue: number): TransitionPickResult {
  const drawn = randomU16(rngValue);
  const tableIndex = drawn.value % FRONTIER_TRANSITIONS.length;
  const entry = FRONTIER_TRANSITIONS[tableIndex]!;
  return { rngValue: drawn.rngValue, tableIndex, transitionId: entry.id, raw: drawn.value };
}

function advanceSteps(rngValue: number, steps: number): number {
  let state = rngValue;
  for (let i = 0; i < steps; i++) state = advanceRngValue(state);
  return state;
}

/**
 * gFrontierTempParty for battle 1 (RAM-dumped, docs/battle-bringup-notes.md
 * §5): trainer 50 (DESTIN)'s team, in slot order — indices into
 * src/data/gen/battle-frontier-mons.json's `entries` array.
 */
export const BATTLE_1_FRONTIER_MON_INDICES = [188, 184, 135] as const; // Grovyle / Murkrow / Pidgeotto

/**
 * Canonical battle-1 staging checkpoint and the observed ambient VBlank gaps
 * around FillFactoryFrontierTrainerParty. The values are independently
 * derived and source-executed in tests/opponentGen.test.ts; consumers use
 * these inputs to regenerate the opponent party rather than copying its
 * recorded personalities.
 */
export const BATTLE_1_CANONICAL_OPPONENT_RNG_START = 0x7b9fce20;
export const BATTLE_1_CANONICAL_AMBIENT_GAP_STEPS = [0, 11, 7, 8] as const;

export interface Battle1OpponentGenResult {
  /** One result per BATTLE_1_FRONTIER_MON_INDICES slot, in order. */
  mons: readonly RejectionLoopResult[];
  transition: TransitionPickResult;
}

/**
 * Generates battle 1's 3 opponent personalities (FillFactoryFrontierTrainerParty's
 * per-mon loop, src/battle_tower.c:1862-1880) followed by the transition-select
 * draw (GetSpecialBattleTransition, called immediately after the 3rd mon's
 * loop per docs/battle-bringup-notes.md §4 point 3), from an explicit
 * starting gRngValue.
 *
 * `ambientGapSteps[i]` is a count of plain Random() calls to advance past
 * *before* mon i's rejection loop starts (i=0..2) or before the transition
 * draw (i=3). FillFactoryFrontierTrainerParty's own C loop
 * (src/battle_tower.c:1862-1880) has zero RNG calls between mon iterations —
 * these gaps are NOT part of that loop's shape. They model real per-VBlank
 * Random() consumption landing between these events for a *specific* trace
 * (Random() fires once per VBlank throughout this whole window regardless,
 * since gMain.inBattle is still FALSE — docs/battle-bringup-notes.md §0), and
 * are therefore session/timing-dependent, not a game constant — callers must
 * supply the value for their own trace. Defaults to no gap (the literal
 * back-to-back algorithm exactly as written in source).
 */
export function generateBattle1OpponentTeam(
  startingRngValue: number,
  ambientGapSteps: readonly [number, number, number, number] = [0, 0, 0, 0],
): Battle1OpponentGenResult {
  let state = startingRngValue;
  const mons: RejectionLoopResult[] = [];
  for (let i = 0; i < BATTLE_1_FRONTIER_MON_INDICES.length; i++) {
    state = advanceSteps(state, ambientGapSteps[i]!);
    const monEntry = FRONTIER_MONS[BATTLE_1_FRONTIER_MON_INDICES[i]!]!;
    const result = rollPersonalityForNature(state, natureIndexByName(monEntry.nature));
    mons.push(result);
    state = result.rngValue;
  }
  state = advanceSteps(state, ambientGapSteps[3]!);
  const transition = pickFrontierTransition(state);
  return { mons, transition };
}
