// S10 prep-scout probe: end-turn ground truth (BattleTurnPassed and everything
// it drives -- TurnValuesCleanUp, DoFieldEndTurnEffects, DoBattlerEndTurnEffects,
// HandleWishPerishSongOnTurnEnd, and the faint re-entry into the already-landed
// HandleFaintedMonActions orchestration). Reruns two committed battle-lab
// scenarios against the live oracle (Battle Scene OFF) and asserts every live
// claim in docs/end-turn-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-end-turn-ground-truth.ts
// (also runnable via `npx tsx`; no project code depends on this file).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const BURN_SCENARIO = "tools/battle-lab/mechanic-endturn-burn-off.json";
const KO_SCENARIO = "tools/battle-lab/mechanic-endturn-toxic-ko-off.json";

// include/constants/battle.h:117/121/122 (STATUS1_BURN=1<<4, STATUS1_TOXIC_POISON=1<<7, STATUS1_TOXIC_TURN(1)=1<<8).
const STATUS1_BURN = 1 << 4;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_TOXIC_TURN_1 = (1 << 7) | (1 << 8);

interface BattlerState {
  species: number;
  status1: number;
  hp: number;
  maxHp: number;
  partyIndex: number;
}

interface PartyMonState {
  species: number;
  status1: number;
  hp: number;
}

interface CaptureState {
  rngValue: number;
  battleOutcome: number;
  battlers: { player: BattlerState; opponent: BattlerState };
  parties: { player: PartyMonState[]; opponent: PartyMonState[] };
}

async function runScenario(path: string): Promise<Map<number, CaptureState>> {
  const scenario = JSON.parse(readFileSync(path, "utf8"));
  const url = `${oracleUrlForProfile("battle-scene-off")}/v1/battle-lab/run`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(scenario),
  });
  if (!response.ok) {
    throw new Error(`battle-lab run failed: HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as { captures: Array<{ frame: number; state: CaptureState }> };
  const captures = new Map<number, CaptureState>();
  for (const capture of payload.captures) captures.set(capture.frame, capture.state);
  return captures;
}

let passCount = 0;
let failCount = 0;
function check(label: string, condition: boolean, detail: string): void {
  if (condition) {
    passCount++;
    console.log(`PASS: ${label}`);
  } else {
    failCount++;
    console.log(`FAIL: ${label} -- ${detail}`);
  }
}

function at(captures: Map<number, CaptureState>, frame: number): CaptureState {
  const state = captures.get(frame);
  if (!state) throw new Error(`missing capture at frame ${frame}`);
  return state;
}

async function main(): Promise<void> {
  console.log("=== End-turn ground truth: mechanic-endturn-burn-off.json ===");
  const burn = await runScenario(BURN_SCENARIO);

  const preApply = at(burn, 482);
  const postApply = at(burn, 483);
  check(
    "Will-O-Wisp lands: opponent status1 gains exactly STATUS1_BURN (1<<4) at frame 483, nothing at 482",
    preApply.battlers.opponent.status1 === 0 && postApply.battlers.opponent.status1 === STATUS1_BURN,
    `482=${preApply.battlers.opponent.status1}, 483=${postApply.battlers.opponent.status1}`,
  );

  const preTick1 = at(burn, 861);
  const tick1 = at(burn, 862);
  const maxHp = tick1.battlers.opponent.maxHp;
  const expectedTickDamage = Math.floor(maxHp / 8) || 1;
  check(
    "end-turn burn tick 1 lands at frame 862 (not 861), maxHP=105",
    preTick1.battlers.opponent.hp === maxHp && tick1.battlers.opponent.hp === maxHp - expectedTickDamage,
    `861 hp=${preTick1.battlers.opponent.hp}, 862 hp=${tick1.battlers.opponent.hp}, maxHp=${maxHp}`,
  );
  check(
    "burn tick 1 damage is exactly floor(maxHP/8) (battle_util.c:1553, ENDTURN_BURN)",
    maxHp - tick1.battlers.opponent.hp === expectedTickDamage,
    `damage=${maxHp - tick1.battlers.opponent.hp}, expected=${expectedTickDamage}`,
  );
  check(
    "burn tick 1 draws ZERO Random() calls (rngValue identical 861 -> 862)",
    preTick1.rngValue === tick1.rngValue,
    `861 rng=${preTick1.rngValue}, 862 rng=${tick1.rngValue}`,
  );
  check(
    "burn tick 1: party-record HP sync (parties.opponent[0].hp mirrors battlers.opponent.hp)",
    tick1.parties.opponent[0]!.hp === tick1.battlers.opponent.hp,
    `party hp=${tick1.parties.opponent[0]!.hp}, battler hp=${tick1.battlers.opponent.hp}`,
  );

  const preTick2 = at(burn, 2065);
  const tick2 = at(burn, 2066);
  check(
    "end-turn burn tick 2 (recurrence) lands at frame 2066, deals the SAME flat 13 damage as tick 1 (not increasing)",
    preTick2.battlers.opponent.hp === tick1.battlers.opponent.hp &&
      tick1.battlers.opponent.hp - tick2.battlers.opponent.hp === expectedTickDamage,
    `2065 hp=${preTick2.battlers.opponent.hp}, 2066 hp=${tick2.battlers.opponent.hp}`,
  );
  check(
    "burn tick 2 also draws ZERO Random() calls (rngValue identical 2065 -> 2066)",
    preTick2.rngValue === tick2.rngValue,
    `2065 rng=${preTick2.rngValue}, 2066 rng=${tick2.rngValue}`,
  );
  check(
    "burn status1 (STATUS1_BURN) is unchanged across both ticks -- burn has no counter, unlike toxic",
    preApply.battlers.opponent.status1 === 0 &&
      tick1.battlers.opponent.status1 === STATUS1_BURN &&
      tick2.battlers.opponent.status1 === STATUS1_BURN,
    `tick1 status1=${tick1.battlers.opponent.status1}, tick2 status1=${tick2.battlers.opponent.status1}`,
  );

  console.log("\n=== End-turn ground truth: mechanic-endturn-toxic-ko-off.json ===");
  const ko = await runScenario(KO_SCENARIO);

  const preToxic = at(ko, 478);
  const postToxic = at(ko, 479);
  check(
    "Toxic lands on SHEDINJA (1 HP always): status1 gains STATUS1_TOXIC_POISON (1<<7) at frame 479",
    preToxic.battlers.opponent.status1 === 0 && postToxic.battlers.opponent.status1 === STATUS1_TOXIC_POISON,
    `478=${preToxic.battlers.opponent.status1}, 479=${postToxic.battlers.opponent.status1}`,
  );
  check(
    "SHEDINJA's maxHP is exactly 1 (the scenario's whole premise -- floor(1/16) clamps to 1 dmg, one-shotting it on the FIRST toxic tick)",
    postToxic.battlers.opponent.maxHp === 1,
    `maxHp=${postToxic.battlers.opponent.maxHp}`,
  );

  const preCounterTick = at(ko, 751);
  const counterTick = at(ko, 752);
  check(
    "first toxic tick's counter increment (status1 -> TOXIC_TURN(1)) lands at frame 752, HP not yet written",
    preCounterTick.battlers.opponent.status1 === STATUS1_TOXIC_POISON &&
      counterTick.battlers.opponent.status1 === STATUS1_TOXIC_TURN_1 &&
      counterTick.battlers.opponent.hp === 1,
    `751 status1=${preCounterTick.battlers.opponent.status1}, 752 status1=${counterTick.battlers.opponent.status1}, 752 hp=${counterTick.battlers.opponent.hp}`,
  );

  const preDeath = at(ko, 904);
  const death = at(ko, 905);
  check(
    "the deferred HP write from that SAME tick lands at frame 905 (hp 1 -> 0) -- counter-increment and datahpupdate are separate frames of one BattleScriptExecute",
    preDeath.battlers.opponent.hp === 1 && death.battlers.opponent.hp === 0,
    `904 hp=${preDeath.battlers.opponent.hp}, 905 hp=${death.battlers.opponent.hp}`,
  );
  check(
    "from the counter-increment (752) to the deferred HP write (905), zero further Random() calls -- note frame 751 is mid-turn (that turn's own repeated-Toxic accuracy roll still pending), so 751->752 itself is NOT part of this claim",
    counterTick.rngValue === death.rngValue,
    `752 rng=${counterTick.rngValue}, 905 rng=${death.rngValue}`,
  );

  const preClear = at(ko, 989);
  const clear = at(ko, 990);
  check(
    "cleareffectsonfaint clears status1 to 0 at frame 990 (BattleScript_FaintAttacker, battle_main.c FaintClearSetData)",
    preClear.battlers.opponent.status1 === STATUS1_TOXIC_TURN_1 && clear.battlers.opponent.status1 === 0,
    `989 status1=${preClear.battlers.opponent.status1}, 990 status1=${clear.battlers.opponent.status1}`,
  );
  check(
    "battleOutcome stays 0 through the whole KO (non-terminal -- 2 more SUNKERN on the bench)",
    death.battleOutcome === 0 && clear.battleOutcome === 0,
    `death outcome=${death.battleOutcome}, clear outcome=${clear.battleOutcome}`,
  );

  const switching = at(ko, 1333);
  const switched = at(ko, 1335);
  check(
    "the non-terminal switch-in dance completes by frame 1335: opponent species flips SHEDINJA(303) -> SUNKERN(191), partyIndex 0 -> 1",
    switching.battlers.opponent.partyIndex === 1 &&
      switched.battlers.opponent.species === 191 &&
      switched.battlers.opponent.hp === switched.battlers.opponent.maxHp,
    `1333 partyIndex=${switching.battlers.opponent.partyIndex}, 1335 species=${switched.battlers.opponent.species}, hp=${switched.battlers.opponent.hp}/${switched.battlers.opponent.maxHp}`,
  );
  check(
    "the ENTIRE fainted-actions + switch-in dance (getexp short-circuit, HandleFaintedMon, switch fork) draws ZERO Random() calls, same as the in-turn KO precedent (docs/faint-outcome-ground-truth.md §2b)",
    counterTick.rngValue === switched.rngValue,
    `752 rng=${counterTick.rngValue}, 1335 rng=${switched.rngValue}`,
  );

  console.log(`\n${failCount === 0 ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"} (${passCount} pass, ${failCount} fail)`);
  if (failCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
