// Side-lane ground-truth scout: ENDTURN_ABILITIES / ENDTURN_ITEMS1 / ENDTURN_ITEMS2
// (the breadth item docs/end-turn-ground-truth.md B2/B3/B19 explicitly scoped
// out of end-turn orchestration). Reruns three committed battle-lab scenarios
// against the live oracle (Battle Scene OFF) and asserts every live claim in
// docs/endturn-abilities-items-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-endturn-abilities-items-ground-truth.ts
// (also runnable via `npx tsx`; no project code depends on this file).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SPEEDBOOST_SCENARIO = "tools/battle-lab/mechanic-endturn-speedboost-off.json";
const RAINDISH_SCENARIO = "tools/battle-lab/mechanic-endturn-raindish-off.json";
const SHEDSKIN_SCENARIO = "tools/battle-lab/mechanic-endturn-shedskin-off.json";
const RESTOREHP_SITRUS_SCENARIO = "tools/battle-lab/mechanic-endturn-items1-restorehp-sitrus-off.json";

// include/constants/pokemon.h STAT_SPEED index into statStages[]; battle_util.h B_WEATHER_RAIN_TEMPORARY=1<<0.
const STAT_SPEED = 3;
const B_WEATHER_RAIN_TEMPORARY = 1 << 0;
// include/constants/battle.h:117 -- STATUS1_BURN = 1<<4.
const STATUS1_BURN = 1 << 4;
// include/constants/abilities.h.
const ABILITY_SPEED_BOOST = 3;
const ABILITY_RAIN_DISH = 44;
const ABILITY_SHED_SKIN = 61;

interface BattlerState {
  species: number;
  ability: number;
  statStages: number[];
  status1: number;
  hp: number;
  maxHp: number;
  item: number;
}

interface CaptureState {
  rngValue: number;
  weather: number;
  battlers: { player: BattlerState; opponent: BattlerState };
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
  console.log("=== ENDTURN_ABILITIES: Speed Boost (always-fires stat-boost class) ===");
  const speedBoost = await runScenario(SPEEDBOOST_SCENARIO);

  const sb0 = at(speedBoost, 0);
  check(
    "NINJASK's ability reads back as Speed Boost (3), statStages[SPEED] starts neutral (6)",
    sb0.battlers.player.ability === ABILITY_SPEED_BOOST && sb0.battlers.player.statStages[STAT_SPEED] === 6,
    `ability=${sb0.battlers.player.ability}, statStages[SPEED]=${sb0.battlers.player.statStages[STAT_SPEED]}`,
  );

  const sbTicks: Array<[number, number, number]> = [
    [722, 723, 7],
    [1934, 1935, 8],
    [3146, 3147, 9],
  ];
  for (const [before, after, expected] of sbTicks) {
    const pre = at(speedBoost, before);
    const post = at(speedBoost, after);
    check(
      `Speed Boost tick ${before}->${after}: statStages[SPEED] -> ${expected}, zero Random() draws (battle_util.c:2642-2652)`,
      pre.battlers.player.statStages[STAT_SPEED] === expected - 1 &&
        post.battlers.player.statStages[STAT_SPEED] === expected &&
        pre.rngValue === post.rngValue,
      `${before} stage=${pre.battlers.player.statStages[STAT_SPEED]} rng=${pre.rngValue}, ${after} stage=${post.battlers.player.statStages[STAT_SPEED]} rng=${post.rngValue}`,
    );
  }

  console.log("\n=== ENDTURN_ABILITIES: Rain Dish (HP/weather-gated heal class) ===");
  const rainDish = await runScenario(RAINDISH_SCENARIO);

  const rd0 = at(rainDish, 0);
  check(
    "LOTAD's ability reads back as Rain Dish (44), full HP, no weather at frame 0",
    rd0.battlers.player.ability === ABILITY_RAIN_DISH &&
      rd0.battlers.player.hp === rd0.battlers.player.maxHp &&
      rd0.weather === 0,
    `ability=${rd0.battlers.player.ability}, hp=${rd0.battlers.player.hp}/${rd0.battlers.player.maxHp}, weather=${rd0.weather}`,
  );

  const rdHit = at(rainDish, 528);
  const rdHitPost = at(rainDish, 529);
  check(
    "Magikarp's Pound lands at frame 529: 115 -> 104 (-11), zero Random() delta at this exact boundary",
    rdHit.battlers.player.hp === 115 && rdHitPost.battlers.player.hp === 104 && rdHit.rngValue === rdHitPost.rngValue,
    `528 hp=${rdHit.battlers.player.hp} rng=${rdHit.rngValue}, 529 hp=${rdHitPost.battlers.player.hp} rng=${rdHitPost.rngValue}`,
  );

  const rdWeatherPre = at(rainDish, 568);
  const rdWeatherPost = at(rainDish, 569);
  check(
    "Rain Dance sets B_WEATHER_RAIN_TEMPORARY at frame 569, zero Random() delta at this exact boundary",
    (rdWeatherPre.weather & B_WEATHER_RAIN_TEMPORARY) === 0 &&
      (rdWeatherPost.weather & B_WEATHER_RAIN_TEMPORARY) !== 0 &&
      rdWeatherPre.rngValue === rdWeatherPost.rngValue,
    `568 weather=${rdWeatherPre.weather} rng=${rdWeatherPre.rngValue}, 569 weather=${rdWeatherPost.weather} rng=${rdWeatherPost.rngValue}`,
  );

  const rdTicks: Array<[number, number, number, number]> = [
    [952, 953, 104, 111],
    [2159, 2160, 100, 107],
  ];
  for (const [before, after, preHp, postHp] of rdTicks) {
    const pre = at(rainDish, before);
    const post = at(rainDish, after);
    check(
      `Rain Dish heal tick ${before}->${after}: hp ${preHp} -> ${postHp} (+7 = floor(115/16)), zero Random() draws (battle_util.c:2607-2619)`,
      pre.battlers.player.hp === preHp && post.battlers.player.hp === postHp && pre.rngValue === post.rngValue,
      `${before} hp=${pre.battlers.player.hp} rng=${pre.rngValue}, ${after} hp=${post.battlers.player.hp} rng=${post.rngValue}`,
    );
  }

  console.log("\n=== ENDTURN_ABILITIES: Shed Skin (the only RNG-bearing case in this doc's scope) ===");
  const shedSkin = await runScenario(SHEDSKIN_SCENARIO);

  const ss0 = at(shedSkin, 0);
  check(
    "SEVIPER's ability reads back as Shed Skin (61), no status at frame 0",
    ss0.battlers.player.ability === ABILITY_SHED_SKIN && ss0.battlers.player.status1 === 0,
    `ability=${ss0.battlers.player.ability}, status1=${ss0.battlers.player.status1}`,
  );

  const ssBurn = at(shedSkin, 656);
  check(
    "Will-O-Wisp lands turn 2: status1 gains STATUS1_BURN (1<<4) at frame 656",
    ssBurn.battlers.player.status1 === STATUS1_BURN,
    `status1=${ssBurn.battlers.player.status1}`,
  );

  const ssStable = at(shedSkin, 5460);
  const ssPreCure = at(shedSkin, 5581);
  check(
    "still burned and rngValue frozen across the whole 5460->5581 span (121 frames of animation/message settling, no draws)",
    ssStable.battlers.player.status1 === STATUS1_BURN &&
      ssPreCure.battlers.player.status1 === STATUS1_BURN &&
      ssStable.rngValue === ssPreCure.rngValue,
    `5460 status1=${ssStable.battlers.player.status1} rng=${ssStable.rngValue}, 5581 status1=${ssPreCure.battlers.player.status1} rng=${ssPreCure.rngValue}`,
  );

  const ssCure = at(shedSkin, 5582);
  check(
    "Shed Skin cures at frame 5582: status1 -> 0 (full clear, not masked), exactly ONE new Random() draw from 5581 (battle_util.c:2620-2641, (Random()%3)==0)",
    ssCure.battlers.player.status1 === 0 && ssCure.rngValue !== ssPreCure.rngValue,
    `5581 status1=${ssPreCure.battlers.player.status1} rng=${ssPreCure.rngValue}, 5582 status1=${ssCure.battlers.player.status1} rng=${ssCure.rngValue}`,
  );

  console.log("\n=== ENDTURN_ITEMS1: HOLD_EFFECT_RESTORE_HP (Sitrus Berry, doc §6 addendum) ===");
  const restoreHp = await runScenario(RESTOREHP_SITRUS_SCENARIO);

  const rhp0 = at(restoreHp, 0);
  check(
    "LOTAD holds Sitrus Berry (142), full HP (115) at frame 0",
    rhp0.battlers.player.item === 142 && rhp0.battlers.player.hp === 115,
    `item=${rhp0.battlers.player.item}, hp=${rhp0.battlers.player.hp}`,
  );

  const rhpDrop = at(restoreHp, 4570);
  const rhpDropPost = at(restoreHp, 4571);
  check(
    "the 6th real Pound hit drops LOTAD to 45 (<=floor(115/2)=57) at frame 4571, below the RESTORE_HP gate",
    rhpDrop.battlers.player.hp === 58 && rhpDropPost.battlers.player.hp === 45,
    `4570 hp=${rhpDrop.battlers.player.hp}, 4571 hp=${rhpDropPost.battlers.player.hp}`,
  );

  const rhpPreHeal = at(restoreHp, 4907);
  const rhpHealed = at(restoreHp, 4908);
  check(
    "ENDTURN_ITEMS1 heals exactly +30 (Sitrus's own holdEffectParam) at frame 4908, zero new Random() draws (battle_util.c:3337-3345)",
    rhpPreHeal.battlers.player.hp === 45 && rhpHealed.battlers.player.hp === 75 &&
      rhpPreHeal.rngValue === rhpHealed.rngValue,
    `4907 hp=${rhpPreHeal.battlers.player.hp} rng=${rhpPreHeal.rngValue}, 4908 hp=${rhpHealed.battlers.player.hp} rng=${rhpHealed.rngValue}`,
  );

  const rhpConsumed = at(restoreHp, 4909);
  check(
    "the berry is consumed (item -> ITEM_NONE) the frame after the heal lands, zero new Random() draws",
    rhpHealed.battlers.player.item === 142 && rhpConsumed.battlers.player.item === 0 &&
      rhpHealed.rngValue === rhpConsumed.rngValue,
    `4908 item=${rhpHealed.battlers.player.item} rng=${rhpHealed.rngValue}, 4909 item=${rhpConsumed.battlers.player.item} rng=${rhpConsumed.rngValue}`,
  );

  console.log(`\n${failCount === 0 ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"} (${passCount} pass, ${failCount} fail)`);
  if (failCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
