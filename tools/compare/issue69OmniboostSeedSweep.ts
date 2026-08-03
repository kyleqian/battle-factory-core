// ISSUES.md #69 bias check: for each of the 25 oracle `seed` values swept in
// docs/issue69-omniboost-off-ground-truth.md (mechanicLab scenario
// tools/compare/fixtures/issue69-omniboost-dense-seed8.json, only "seed"
// varied 1..25), transplant the REAL ROM turn-start rngValue (the oracle's
// own frame-0 capture, i.e. "state.rngValue" before either battler has
// acted -- confirmed by opponent HP still full / statStages still [6,6..]
// at that frame) into the app's own kernel as `rngSeed`, using the SAME
// real BUTTERFREE/RATTATA stats this oracle fixture derives (read off its
// own frame-0 capture), and compares the app's own proc/no-proc decision
// against the oracle's real observed outcome for that same seed. Same
// starting rngValue + same real stats + same move pairing -> if the app's
// hit-chain roll count/order (accuracy, crit, damage-adjust,
// seteffectwithchance) is faithful, the two must decide proc identically,
// seed for seed -- stronger than a rate comparison (see brief).
//
// Run: node --experimental-strip-types tools/compare/issue69OmniboostSeedSweep.ts

import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";

// Real BUTTERFREE/RATTATA computed stats for this exact fixture (read off
// tools/compare/fixtures/issue69-omniboost-dense-seed8.json's own oracle
// frame-0 capture, seed 8 -- overrides.parties derives identical stats for
// every seed since the party spec itself never varies by seed).
const PLAYER = Object.freeze({
  species: 12, // BUTTERFREE
  moveId: 318, // SILVER_WIND
  moves: [318, 60, 92, 18] as const,
  pp: [5, 20, 10, 20] as const,
  ability: 14,
  item: 132,
  friendship: 70,
  attack: 65,
  defense: 70,
  spAttack: 122,
  spDefense: 100,
  speed: 90,
  hp: 146,
  maxHp: 146,
  types: ["TYPE_BUG", "TYPE_FLYING"] as const,
});
const TRAINER = Object.freeze({
  species: 19, // RATTATA
  moveId: 33, // TACKLE
  moves: [33, 33, 33, 33] as const,
  pp: [35, 35, 35, 35] as const,
  ability: 50,
  item: 0,
  friendship: 70,
  attack: 76,
  defense: 55,
  spAttack: 30,
  spDefense: 55,
  speed: 77,
  hp: 105,
  maxHp: 105,
  types: ["TYPE_NORMAL", "TYPE_NORMAL"] as const,
});

// [seed, oracle frame-0 rngValue, oracle observed proc] from the 25-seed
// sweep (tools/compare/fixtures/issue69-omniboost-dense-seed8.json, seed
// 1..25, captureFrames [0, 800], `bin/oracle lab` x25).
const ORACLE_SWEEP: ReadonlyArray<readonly [number, number, boolean]> = [
  [1, 919694434, false], [2, 648273789, false], [3, 3044190370, false],
  [4, 1713614332, false], [5, 1607435670, false], [6, 63592413, false],
  [7, 71598966, false], [8, 4156937941, true], [9, 136398329, false],
  [10, 929654972, false], [11, 4233149815, false], [12, 61630706, true],
  [13, 3202627989, true], [14, 1396097838, true], [15, 3572076586, false],
  [16, 279562405, false], [17, 2415613851, false], [18, 489837098, false],
  [19, 2669678832, true], [20, 2217093304, false], [21, 2802695246, true],
  [22, 3837945, true], [23, 2691241095, false], [24, 2960820435, false],
  [25, 3840474682, false],
];

function appProc(rngSeed: number): boolean {
  const config: FactoryFullTurnConfig = Object.freeze({
    requestId: 1,
    rngSeed,
    player: PLAYER,
    trainer: TRAINER,
  });
  const initial = createFactoryFullTurnBattleState(config);
  if (initial.boundary.kind !== "decision-required") {
    throw new Error("expected the player's command boundary");
  }
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected the trainer's command boundary");
  }
  const transition = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
  });
  const finalStages = transition.state.rules.rulesContext.battlers[0]!.statStages;
  return finalStages[1] === 7;
}

let matches = 0;
let mismatches: number[] = [];
console.log("seed  oracleRng0   oracleProc  appProc  match");
for (const [seed, rng0, oracleProc] of ORACLE_SWEEP) {
  const app = appProc(rng0);
  const match = app === oracleProc;
  if (match) matches++; else mismatches.push(seed);
  console.log(
    `${String(seed).padStart(4)}  ${String(rng0).padStart(10)}  ${String(oracleProc).padStart(10)}  ${String(app).padStart(7)}  ${match ? "MATCH" : "*** MISMATCH ***"}`,
  );
}
console.log();
console.log(`${matches}/${ORACLE_SWEEP.length} seeds matched between oracle (real ROM) and app (same transplanted rngValue).`);
if (mismatches.length > 0) {
  console.log(`MISMATCHED SEEDS (reproducers): ${mismatches.join(", ")}`);
}
const oracleProcCount = ORACLE_SWEEP.filter(([, , p]) => p).length;
console.log(`oracle empirical proc rate: ${oracleProcCount}/${ORACLE_SWEEP.length} = ${(100 * oracleProcCount / ORACLE_SWEEP.length).toFixed(1)}% (source secondaryEffectChance = 10%)`);
