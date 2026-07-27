// S10 prep-scout probe: ground truth for the fixed-damage + TYPECALC2
// retaliation opcode cluster (Cmd_dmgtolevel, Cmd_psywavedamageeffect,
// Cmd_counterdamagecalculator, Cmd_mirrorcoatdamagecalculator,
// battle_script_commands.c), covering EFFECT_LEVEL_DAMAGE/EFFECT_PSYWAVE/
// EFFECT_COUNTER/EFFECT_MIRROR_COAT per docs/executable-frontier-census.md.
// This script reruns eight committed battle-lab scenarios (Seismic Toss,
// Psywave, Counter-hit, Counter-fail, Mirror Coat-hit, Mirror Coat-fail) at
// two seeds each against the real ROM (Battle Scene OFF oracle) and asserts
// PASS/FAIL for every live claim in docs/fixed-damage-cluster-ground-truth.md
// and docs/counter-retaliation-design.md.
//
// Run: node --experimental-strip-types tools/probe/verify-fixed-damage-cluster-ground-truth.ts
// (also runnable via `npx tsx` if available; no project code depends on either).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SEISMIC_TOSS_PATH = "tools/battle-lab/mechanic-fixed-damage-seismictoss.json";
const PSYWAVE_PATH = "tools/battle-lab/mechanic-fixed-damage-psywave.json";
const COUNTER_HIT_PATH = "tools/battle-lab/mechanic-fixed-damage-counter-hit.json";
const COUNTER_FAIL_PATH = "tools/battle-lab/mechanic-fixed-damage-counter-fail.json";
const MIRROR_COAT_HIT_PATH = "tools/battle-lab/mechanic-fixed-damage-mirrorcoat-hit.json";
const MIRROR_COAT_FAIL_PATH = "tools/battle-lab/mechanic-fixed-damage-mirrorcoat-fail.json";

interface BattlerState {
  hp: number;
  maxHp: number;
  level: number;
}

interface CaptureState {
  rngValue: number;
  battlers: { player: BattlerState; opponent: BattlerState };
}

interface BattleLabResult {
  captures: Map<number, CaptureState>;
}

async function runScenario(scenarioPath: string, seed: number): Promise<BattleLabResult> {
  const scenario = JSON.parse(readFileSync(scenarioPath, "utf8"));
  scenario.seed = seed;
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
  return { captures };
}

// ISO_RANDOMIZE1 (reference/pokeemerald/include/random.h:16):
// gRngValue = 1103515245 * gRngValue + 24691 (mod 2^32).
function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
}

function rngRoll(value: number): { next: number; u16: number } {
  const next = rngStep(value);
  return { next, u16: next >>> 16 };
}

function stepsToReach(start: number, target: number, maxSteps: number): number | null {
  let value = start;
  for (let i = 1; i <= maxSteps; i++) {
    value = rngStep(value);
    if (value === target) return i;
  }
  return null;
}

let failures = 0;
function check(label: string, condition: boolean, detail: string): void {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL: ${label} -- ${detail}`);
  }
}

function deepEqualCapture(a: CaptureState, b: CaptureState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function verifySeismicTossSeed(seed: number): Promise<void> {
  console.log(`\n=== EFFECT_LEVEL_DAMAGE, seed ${seed}: MOVE_SEISMIC_TOSS (L50) MACHOP -> EEVEE ===`);
  const run1 = await runScenario(SEISMIC_TOSS_PATH, seed);
  const run2 = await runScenario(SEISMIC_TOSS_PATH, seed);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check(`seed ${seed}: determinism, frame 0 identical across reruns`, deepEqualCapture(before1, before2), "initial state differs between runs");
  check(`seed ${seed}: determinism, frame 450 identical across reruns`, deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  const damage = oppBefore.hp - oppAfter.hp;
  console.log(`    attacker level ${before1.battlers.player.level}, opponent hp ${oppBefore.hp} -> ${oppAfter.hp} (dealt ${damage})`);
  check(
    `seed ${seed}: Cmd_dmgtolevel (battle_script_commands.c:7926-7930) deals exactly gBattleMons[attacker].level, unaffected by seed`,
    damage === before1.battlers.player.level,
    `dealt ${damage}, attacker level ${before1.battlers.player.level}`,
  );
  check(`seed ${seed}: attacker (Machop) took no damage -- Seismic Toss is not a recoil/contact-punish move here`, before1.battlers.player.hp === after1.battlers.player.hp, "attacker HP changed");

  const totalCalls = stepsToReach(before1.rngValue, after1.rngValue, 20);
  console.log(`    total Random() calls, frame 0 -> 450: ${totalCalls}`);
  check(
    `seed ${seed}: whole-turn total is exactly 8 Random() calls (1 accuracycheck, dmgtolevel draws none, +7-call downstream hit-chain tail -- tail composition not decomposed by this cluster's scope)`,
    totalCalls === 8,
    `expected 8, found ${totalCalls === null ? "no match within 20 steps" : `step ${totalCalls}`}`,
  );
}

interface PsywaveExpectation {
  seed: number;
  expectedDamage: number;
  expectedDraws: readonly number[];
}

async function verifyPsywaveSeed(expectation: PsywaveExpectation): Promise<void> {
  const { seed, expectedDamage, expectedDraws } = expectation;
  console.log(`\n=== EFFECT_PSYWAVE, seed ${seed}: MOVE_PSYWAVE (80 acc, L50) ABRA -> EEVEE ===`);
  const run1 = await runScenario(PSYWAVE_PATH, seed);
  const run2 = await runScenario(PSYWAVE_PATH, seed);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check(`seed ${seed}: determinism, frame 0 identical across reruns`, deepEqualCapture(before1, before2), "initial state differs between runs");
  check(`seed ${seed}: determinism, frame 450 identical across reruns`, deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const accRoll = rngRoll(before1.rngValue);
  const accHit = (accRoll.u16 % 100) < 80;
  console.log(`    [1] accuracycheck (battle_script_commands.c:1176)  u16=${accRoll.u16}  %100=${accRoll.u16 % 100}  hit=${accHit}`);
  check(`seed ${seed}: Psywave's 80-accuracy roll hits (fixture chosen for a hit)`, accHit, `u16=${accRoll.u16}`);

  let cursor = accRoll.next;
  const draws: number[] = [];
  let draw = 16;
  while (true) {
    const roll = rngRoll(cursor);
    cursor = roll.next;
    draw = roll.u16 % 16;
    draws.push(draw);
    if (draw <= 10) break;
  }
  console.log(`    [2] psywavedamageeffect rejection-sample draws (battle_script_commands.c:7932-7941, "while ((randDamage = Random() % 16) > 10)"): ${JSON.stringify(draws)}`);
  check(`seed ${seed}: rejection-sample draw sequence matches predicted RNG (${JSON.stringify(expectedDraws)})`, JSON.stringify(draws) === JSON.stringify(expectedDraws), `got ${JSON.stringify(draws)}`);

  const level = before1.battlers.player.level;
  const randDamage = draw * 10;
  const expectedFormula = Math.floor((level * (randDamage + 50)) / 100);
  console.log(`    randDamage=${randDamage}  level*${randDamage + 50}/100 = ${expectedFormula}`);

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  const damage = oppBefore.hp - oppAfter.hp;
  console.log(`    opponent hp ${oppBefore.hp} -> ${oppAfter.hp} (dealt ${damage})`);
  check(
    `seed ${seed}: dealt damage equals level * (randDamage + 50) / 100 exactly`,
    damage === expectedFormula,
    `dealt ${damage}, formula gives ${expectedFormula}`,
  );
  check(`seed ${seed}: dealt damage equals this fixture's predicted value (${expectedDamage})`, damage === expectedDamage, `dealt ${damage}, expected ${expectedDamage}`);
}

async function verifyCounterHitSeed(seed: number): Promise<void> {
  console.log(`\n=== EFFECT_COUNTER (hit), seed ${seed}: ELECTRODE Pound -> SHUCKLE, SHUCKLE Counter -> ELECTRODE ===`);
  const run1 = await runScenario(COUNTER_HIT_PATH, seed);
  const run2 = await runScenario(COUNTER_HIT_PATH, seed);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check(`seed ${seed}: determinism, frame 0 identical across reruns`, deepEqualCapture(before1, before2), "initial state differs between runs");
  check(`seed ${seed}: determinism, frame 450 identical across reruns`, deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const playerPhysicalDmg = before1.battlers.player.hp - after1.battlers.player.hp;
  const opponentCounterDmg = before1.battlers.opponent.hp - after1.battlers.opponent.hp;
  console.log(`    Shuckle (player, slower) took ${playerPhysicalDmg} physical dmg from Pound; Electrode (opponent) took ${opponentCounterDmg} from Counter`);

  check(`seed ${seed}: Electrode's Pound actually dealt physical damage this turn (Counter has something to retaliate against)`, playerPhysicalDmg > 0, `playerPhysicalDmg=${playerPhysicalDmg}`);
  check(
    `seed ${seed}: Cmd_counterdamagecalculator (battle_script_commands.c:7943-7966) deals exactly 2x gProtectStructs[attacker].physicalDmg`,
    opponentCounterDmg === playerPhysicalDmg * 2,
    `counter dealt ${opponentCounterDmg}, expected 2x${playerPhysicalDmg}=${playerPhysicalDmg * 2}`,
  );
}

async function verifyCounterFailSeed(seed: number): Promise<void> {
  console.log(`\n=== EFFECT_COUNTER (failure case), seed ${seed}: ELECTRODE Growl (status) -> SHUCKLE, SHUCKLE Counter (should fail) ===`);
  const run1 = await runScenario(COUNTER_FAIL_PATH, seed);
  const run2 = await runScenario(COUNTER_FAIL_PATH, seed);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check(`seed ${seed}: determinism, frame 0 identical across reruns`, deepEqualCapture(before1, before2), "initial state differs between runs");
  check(`seed ${seed}: determinism, frame 450 identical across reruns`, deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const playerHpDelta = before1.battlers.player.hp - after1.battlers.player.hp;
  const opponentHpDelta = before1.battlers.opponent.hp - after1.battlers.opponent.hp;
  console.log(`    Shuckle (player) hp delta ${playerHpDelta}; Electrode (opponent) hp delta ${opponentHpDelta}`);

  check(`seed ${seed}: Growl is a status move -- no physical damage recorded on the player this turn`, playerHpDelta === 0, `playerHpDelta=${playerHpDelta}`);
  check(
    `seed ${seed}: with gProtectStructs[attacker].physicalDmg still 0, Counter fails outright (Cmd_counterdamagecalculator's else branch, T1_READ_PTR jump to BattleScript_FailedFromAtkString) -- zero damage dealt to the opponent`,
    opponentHpDelta === 0,
    `opponentHpDelta=${opponentHpDelta}`,
  );
}

async function verifyMirrorCoatHitSeed(seed: number): Promise<void> {
  console.log(`\n=== EFFECT_MIRROR_COAT (hit), seed ${seed}: ELECTRODE Water Gun -> SHUCKLE, SHUCKLE Mirror Coat -> ELECTRODE ===`);
  const run1 = await runScenario(MIRROR_COAT_HIT_PATH, seed);
  const run2 = await runScenario(MIRROR_COAT_HIT_PATH, seed);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check(`seed ${seed}: determinism, frame 0 identical across reruns`, deepEqualCapture(before1, before2), "initial state differs between runs");
  check(`seed ${seed}: determinism, frame 450 identical across reruns`, deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const playerSpecialDmg = before1.battlers.player.hp - after1.battlers.player.hp;
  const opponentMirrorCoatDmg = before1.battlers.opponent.hp - after1.battlers.opponent.hp;
  console.log(`    Shuckle (player, slower) took ${playerSpecialDmg} special dmg from Water Gun; Electrode (opponent) took ${opponentMirrorCoatDmg} from Mirror Coat`);

  check(`seed ${seed}: Electrode's Water Gun actually dealt special damage this turn (Mirror Coat has something to retaliate against)`, playerSpecialDmg > 0, `playerSpecialDmg=${playerSpecialDmg}`);
  check(
    `seed ${seed}: Cmd_mirrorcoatdamagecalculator (battle_script_commands.c:7969-7990) deals exactly 2x gProtectStructs[attacker].specialDmg`,
    opponentMirrorCoatDmg === playerSpecialDmg * 2,
    `mirror coat dealt ${opponentMirrorCoatDmg}, expected 2x${playerSpecialDmg}=${playerSpecialDmg * 2}`,
  );
}

async function verifyMirrorCoatFailSeed(seed: number): Promise<void> {
  console.log(`\n=== EFFECT_MIRROR_COAT (failure case), seed ${seed}: ELECTRODE Growl (status) -> SHUCKLE, SHUCKLE Mirror Coat (should fail) ===`);
  const run1 = await runScenario(MIRROR_COAT_FAIL_PATH, seed);
  const run2 = await runScenario(MIRROR_COAT_FAIL_PATH, seed);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check(`seed ${seed}: determinism, frame 0 identical across reruns`, deepEqualCapture(before1, before2), "initial state differs between runs");
  check(`seed ${seed}: determinism, frame 450 identical across reruns`, deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const playerHpDelta = before1.battlers.player.hp - after1.battlers.player.hp;
  const opponentHpDelta = before1.battlers.opponent.hp - after1.battlers.opponent.hp;
  console.log(`    Shuckle (player) hp delta ${playerHpDelta}; Electrode (opponent) hp delta ${opponentHpDelta}`);

  check(`seed ${seed}: Growl is a status move -- no special damage recorded on the player this turn`, playerHpDelta === 0, `playerHpDelta=${playerHpDelta}`);
  check(
    `seed ${seed}: with gProtectStructs[attacker].specialDmg still 0, Mirror Coat fails outright (Cmd_mirrorcoatdamagecalculator's else branch, T1_READ_PTR jump to BattleScript_FailedFromAtkString) -- zero damage dealt to the opponent`,
    opponentHpDelta === 0,
    `opponentHpDelta=${opponentHpDelta}`,
  );
}

async function main(): Promise<void> {
  await verifySeismicTossSeed(1);
  await verifySeismicTossSeed(4);

  await verifyPsywaveSeed({ seed: 1, expectedDamage: 75, expectedDraws: [12, 10] });
  await verifyPsywaveSeed({ seed: 4, expectedDamage: 30, expectedDraws: [1] });

  await verifyCounterHitSeed(1);
  await verifyCounterHitSeed(4);

  await verifyCounterFailSeed(1);
  await verifyCounterFailSeed(4);

  await verifyMirrorCoatHitSeed(1);
  await verifyMirrorCoatHitSeed(4);

  await verifyMirrorCoatFailSeed(1);
  await verifyMirrorCoatFailSeed(4);

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing check(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("FAIL: unhandled error", error);
  process.exit(1);
});
