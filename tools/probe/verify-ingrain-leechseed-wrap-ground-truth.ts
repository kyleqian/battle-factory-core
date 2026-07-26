// S10 prep-scout probe: ground truth for docs/ingrain-leechseed-wrap-ground-truth.md
// (end-turn-ground-truth.md §4 slice 5 -- Ingrain B1, Leech Seed B4, Wrap-family
// damage B10, plus their SETTER moves). Reruns three committed battle-lab
// scenarios against the live oracle (Battle Scene OFF) and asserts every live
// claim in the doc.
//
// Run: node --experimental-strip-types tools/probe/verify-ingrain-leechseed-wrap-ground-truth.ts
// (also runnable via `npx tsx`; no project code depends on this file).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const LEECH_SEED_SCENARIO = "tools/battle-lab/mechanic-leechseed-drain-off.json";
const INGRAIN_SCENARIO = "tools/battle-lab/mechanic-ingrain-heal-off.json";
const WRAP_SCENARIO = "tools/battle-lab/mechanic-wrap-damage-off.json";

// include/constants/battle.h:159 (STATUS3_LEECHSEED = 1<<2), :167 (STATUS3_ROOTED = 1<<10).
const STATUS3_LEECHSEED = 1 << 2;
const STATUS3_ROOTED = 1 << 10;
// include/constants/battle.h:140-141 (STATUS2_WRAPPED = 1<<13|1<<14|1<<15, WRAPPED_TURN(num) = num<<13).
const STATUS2_WRAPPED_MASK = (1 << 13) | (1 << 14) | (1 << 15);
function wrappedTurnsRemaining(status2: number): number {
  return (status2 & STATUS2_WRAPPED_MASK) >>> 13;
}

interface BattlerVolatile {
  confusionTurns: number;
  leechSeededBy: "player" | "opponent" | null;
  perishSongTurns: number;
}

interface BattlerState {
  species: number;
  status1: number;
  status2: number;
  status3: number;
  hp: number;
  maxHp: number;
  volatile: BattlerVolatile;
}

interface CaptureState {
  rngValue: number;
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
  console.log("=== mechanic-leechseed-drain-off.json (player BRELOOM Leech Seed x4 vs opponent WYNAUT Splash x4) ===");
  const leechSeed = await runScenario(LEECH_SEED_SCENARIO);

  const preSet = at(leechSeed, 0);
  const postSet = at(leechSeed, 480);
  check(
    "Leech Seed lands turn 1: opponent gains STATUS3_LEECHSEED (bit 2) + volatile.leechSeededBy='player', nothing at frame 0",
    preSet.battlers.opponent.status3 === 0 &&
      (postSet.battlers.opponent.status3 & STATUS3_LEECHSEED) !== 0 &&
      postSet.battlers.opponent.volatile.leechSeededBy === "player",
    `frame0 status3=${preSet.battlers.opponent.status3}, frame480 status3=${postSet.battlers.opponent.status3}, leechSeededBy=${postSet.battlers.opponent.volatile.leechSeededBy}`,
  );

  const preTick1 = at(leechSeed, 480);
  const tick1 = at(leechSeed, 826);
  const maxHp = preTick1.battlers.opponent.maxHp;
  const expectedDrain = Math.floor(maxHp / 8) || 1;
  check(
    "end-turn Leech Seed drain tick 1 fires the SAME turn the seed was set (frame 480 -> 826), exactly floor(maxHP/8)",
    preTick1.battlers.opponent.hp - tick1.battlers.opponent.hp === expectedDrain,
    `480 hp=${preTick1.battlers.opponent.hp}, 826 hp=${tick1.battlers.opponent.hp}, maxHp=${maxHp}, expected=${expectedDrain}`,
  );
  check(
    "Leech Seed drain tick 1 draws ZERO Random() calls (battle_util.c ENDTURN_LEECH_SEED case; rngValue identical 480 -> 826)",
    preTick1.rngValue === tick1.rngValue,
    `480 rng=${preTick1.rngValue}, 826 rng=${tick1.rngValue}`,
  );

  const preTick2 = at(leechSeed, 2039);
  const tick2 = at(leechSeed, 2040);
  check(
    "Leech Seed drain tick 2 (recurrence, turn 2) deals the SAME flat drain as tick 1, still seeded",
    tick1.battlers.opponent.hp - tick2.battlers.opponent.hp === expectedDrain &&
      (tick2.battlers.opponent.status3 & STATUS3_LEECHSEED) !== 0,
    `2039 hp=${preTick2.battlers.opponent.hp}, 2040 hp=${tick2.battlers.opponent.hp}, status3=${tick2.battlers.opponent.status3}`,
  );
  check(
    "Leech Seed drain tick 2 also draws ZERO Random() calls (rngValue identical 2039 -> 2040)",
    preTick2.rngValue === tick2.rngValue,
    `2039 rng=${preTick2.rngValue}, 2040 rng=${tick2.rngValue}`,
  );

  console.log("\n=== mechanic-ingrain-heal-off.json (player CRADILY Ingrain x4 vs opponent MAGIKARP Pound x4) ===");
  const ingrain = await runScenario(INGRAIN_SCENARIO);

  const preHit = at(ingrain, 0);
  const postHit = at(ingrain, 520);
  check(
    "opponent's real Pound hit (not injected) drops player below full HP before Ingrain is used",
    postHit.battlers.player.hp < preHit.battlers.player.hp && postHit.battlers.player.status3 === 0,
    `frame0 hp=${preHit.battlers.player.hp}, frame520 hp=${postHit.battlers.player.hp}`,
  );

  const postRoot = at(ingrain, 650);
  check(
    "trysetroots sets STATUS3_ROOTED (bit 10) on the player the same turn Ingrain is used",
    (postRoot.battlers.player.status3 & STATUS3_ROOTED) !== 0,
    `frame650 status3=${postRoot.battlers.player.status3}`,
  );

  const preTick1i = at(ingrain, 929);
  const tick1i = at(ingrain, 930);
  const playerMaxHp = preTick1i.battlers.player.maxHp;
  check(
    "end-turn Ingrain heal tick 1 fires the SAME turn rooted (frame 929 -> 930), heal capped at maxHP (not blindly +maxHP/16)",
    tick1i.battlers.player.hp === playerMaxHp && tick1i.battlers.player.hp - preTick1i.battlers.player.hp < Math.floor(playerMaxHp / 16) + 1,
    `929 hp=${preTick1i.battlers.player.hp}, 930 hp=${tick1i.battlers.player.hp}, maxHp=${playerMaxHp}`,
  );
  check(
    "Ingrain heal tick 1 draws ZERO Random() calls (rngValue identical 929 -> 930)",
    preTick1i.rngValue === tick1i.rngValue,
    `929 rng=${preTick1i.rngValue}, 930 rng=${tick1i.rngValue}`,
  );

  const preTick2i = at(ingrain, 2127);
  const tick2i = at(ingrain, 2128);
  check(
    "Ingrain heal tick 2 (recurrence, after a second real Pound hit) again heals back to exactly maxHP",
    preTick2i.battlers.player.hp < playerMaxHp && tick2i.battlers.player.hp === playerMaxHp,
    `2127 hp=${preTick2i.battlers.player.hp}, 2128 hp=${tick2i.battlers.player.hp}, maxHp=${playerMaxHp}`,
  );
  check(
    "Ingrain heal tick 2 also draws ZERO Random() calls (rngValue identical 2127 -> 2128)",
    preTick2i.rngValue === tick2i.rngValue,
    `2127 rng=${preTick2i.rngValue}, 2128 rng=${tick2i.rngValue}`,
  );

  console.log("\n=== mechanic-wrap-damage-off.json (player TENTACOOL Wrap x4 vs opponent WYNAUT Splash x4) ===");
  const wrap = await runScenario(WRAP_SCENARIO);

  const preHitW = at(wrap, 0);
  const postHitW = at(wrap, 540);
  check(
    "Wrap's own direct hit lands turn 1 (normal EFFECT_HIT damage, independent of the DoT) and sets STATUS2_WRAPPED",
    postHitW.battlers.opponent.hp < preHitW.battlers.opponent.hp && (postHitW.battlers.opponent.status2 & STATUS2_WRAPPED_MASK) !== 0,
    `frame0 hp=${preHitW.battlers.opponent.hp}, frame540 hp=${postHitW.battlers.opponent.hp}, status2=${postHitW.battlers.opponent.status2}`,
  );
  check(
    "Wrap's duration roll (Random() & 3) + 3 lands in [3,6]; this seed/RNG-state combo draws 6 (the max)",
    wrappedTurnsRemaining(postHitW.battlers.opponent.status2) === 6,
    `turns=${wrappedTurnsRemaining(postHitW.battlers.opponent.status2)}`,
  );

  const preDecrement1 = at(wrap, 797);
  const postDecrement1 = at(wrap, 798);
  check(
    "end-turn tick 1: status2 -= WRAPPED_TURN(1) decrements 6 -> 5 BEFORE the damage roll (battle_util.c ENDTURN_WRAP)",
    wrappedTurnsRemaining(preDecrement1.battlers.opponent.status2) === 6 &&
      wrappedTurnsRemaining(postDecrement1.battlers.opponent.status2) === 5,
    `797 turns=${wrappedTurnsRemaining(preDecrement1.battlers.opponent.status2)}, 798 turns=${wrappedTurnsRemaining(postDecrement1.battlers.opponent.status2)}`,
  );

  const preDamage1 = at(wrap, 938);
  const damage1 = at(wrap, 939);
  const wrapMaxHp = preDamage1.battlers.opponent.maxHp;
  const expectedWrapDmg = Math.floor(wrapMaxHp / 16) || 1;
  check(
    "end-turn tick 1 damage is exactly floor(maxHP/16), same turn as the decrement (battle_util.c:1607)",
    preDamage1.battlers.opponent.hp - damage1.battlers.opponent.hp === expectedWrapDmg,
    `938 hp=${preDamage1.battlers.opponent.hp}, 939 hp=${damage1.battlers.opponent.hp}, maxHp=${wrapMaxHp}, expected=${expectedWrapDmg}`,
  );
  check(
    "end-turn tick 1 (decrement + damage together) draws ZERO Random() calls (rngValue identical 797 -> 798 -> 939)",
    preDecrement1.rngValue === postDecrement1.rngValue && postDecrement1.rngValue === damage1.rngValue,
    `797 rng=${preDecrement1.rngValue}, 798 rng=${postDecrement1.rngValue}, 939 rng=${damage1.rngValue}`,
  );

  const decrement2 = at(wrap, 1920);
  const decrement3 = at(wrap, 3160);
  check(
    "the WRAPPED counter keeps decrementing by exactly 1 every end-turn while still trapped (6 -> 5 -> 4 -> 3 observed)",
    wrappedTurnsRemaining(decrement2.battlers.opponent.status2) === 4 &&
      wrappedTurnsRemaining(decrement3.battlers.opponent.status2) === 3,
    `frame1920 turns=${wrappedTurnsRemaining(decrement2.battlers.opponent.status2)}, frame3160 turns=${wrappedTurnsRemaining(decrement3.battlers.opponent.status2)}`,
  );
  const tick3Pre = at(wrap, 3164);
  const tick3Post = at(wrap, 3295);
  check(
    "a later recurrence (tick 3, counter=3) again deals exactly floor(maxHP/16)",
    tick3Pre.battlers.opponent.hp - tick3Post.battlers.opponent.hp === expectedWrapDmg,
    `3164 hp=${tick3Pre.battlers.opponent.hp}, 3295 hp=${tick3Post.battlers.opponent.hp}`,
  );

  console.log(`\n${passCount} PASS, ${failCount} FAIL`);
  if (failCount > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
