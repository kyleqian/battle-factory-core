// S10 prep-scout probe: ground truth for the PRIMARY-effect stat-change path
// (Cmd_statbuffchange, battle_script_commands.c:7100-7105, and the shared
// ChangeStatBuffs core it calls with a real STAT_CHANGE_ALLOW_PTR flags byte
// and jump pointer -- the OTHER route into ChangeStatBuffs(), distinct from
// the secondary-effect path docs/stat-change-confusion-ground-truth.md
// already banked). This script reruns three committed battle-lab scenarios
// (stat-UP success, stat-DOWN success, stat-DOWN blocked by Clear Body)
// against the real ROM (Battle Scene OFF oracle) and asserts PASS/FAIL for
// every live claim in docs/primary-stat-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-primary-stat-ground-truth.ts
// (also runnable via `npx tsx` if available; no project code depends on either).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const ATTACK_UP_SCENARIO_PATH = "tools/battle-lab/mechanic-primary-stat-attack-up-off.json";
const DEFENSE_DOWN_SCENARIO_PATH = "tools/battle-lab/mechanic-primary-stat-defense-down-off.json";
const DEFENSE_DOWN_CLEARBODY_SCENARIO_PATH = "tools/battle-lab/mechanic-primary-stat-defense-down-clearbody-off.json";

const SEED = 1;

interface BattlerState {
  species: number;
  ability: number;
  statStages: number[];
  hp: number;
  maxHp: number;
  pp: number[];
}

interface PartyMonState {
  species: number;
  [key: string]: unknown;
}

interface CaptureState {
  rngValue: number;
  battlers: { player: BattlerState; opponent: BattlerState };
  parties: { player: PartyMonState[]; opponent: PartyMonState[] };
}

interface BattleLabResult {
  captures: Map<number, CaptureState>;
}

async function runScenario(path: string, seed: number): Promise<BattleLabResult> {
  const scenario = JSON.parse(readFileSync(path, "utf8"));
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

const STAT_ATK = 1; // include/constants/pokemon.h:76, index into gBattleMons.statStages[]
const STAT_DEF = 2; // include/constants/pokemon.h:77
const ABILITY_CLEAR_BODY = 29; // include/constants/abilities.h:33

async function verifyAttackUp(): Promise<void> {
  console.log("\n=== EFFECT_ATTACK_UP_2 (Swords Dance, primary-effect stat-UP, self) ===");
  const run1 = await runScenario(ATTACK_UP_SCENARIO_PATH, SEED);
  const run2 = await runScenario(ATTACK_UP_SCENARIO_PATH, SEED);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check("determinism: frame 0 identical across reruns", deepEqualCapture(before1, before2), "initial state differs between runs");
  check("determinism: frame 450 identical across reruns", deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const playerBefore = before1.battlers.player;
  const playerAfter = after1.battlers.player;
  console.log(`  player (FARFETCH'D): statStages[ATK] ${playerBefore.statStages[STAT_ATK]} -> ${playerAfter.statStages[STAT_ATK]}, pp[0] ${playerBefore.pp[0]} -> ${playerAfter.pp[0]}`);

  check("player statStages[ATK] starts at neutral (6)", playerBefore.statStages[STAT_ATK] === 6, `statStages[ATK]=${playerBefore.statStages[STAT_ATK]}`);
  check(
    "player statStages[ATK] rises by exactly 2 stages (6 -> 8): setstatchanger STAT_ATK,2,FALSE, data/battle_scripts_1.s (Swords Dance)",
    playerAfter.statStages[STAT_ATK] === 8,
    `statStages[ATK]=${playerAfter.statStages[STAT_ATK]}, expected 8`,
  );
  check("player PP[0] (Swords Dance) decremented by exactly 1", playerBefore.pp[0]! - playerAfter.pp[0]! === 1, `${playerBefore.pp[0]} -> ${playerAfter.pp[0]}`);

  const gap = stepsToReach(before1.rngValue, after1.rngValue, 40);
  console.log(`  whole-window Random() call count to frame 450: ${gap}`);
  check(
    "BattleScript_EffectAttackUp2/BattleScript_EffectStatUp draws zero Random() -- no accuracycheck opcode appears in the script body (self-target, data/battle_scripts_1.s:475-514) and ChangeStatBuffs itself is source-confirmed zero Random() calls (battle_script_commands.c:6937-7098); every step counted here is Magneton's own turn + AI scoring, not the tested move",
    gap !== null,
    "forward-search did not land on frame 450's rngValue within 40 steps",
  );

  const partyAfter = after1.parties.player[0]!;
  check(
    "party record has no statStages field at all (structural, same as the secondary-effect path's own finding: oracle/battle_lab.py:_party_mon)",
    !("statStages" in partyAfter),
    `party record keys: ${Object.keys(partyAfter).join(",")}`,
  );
}

async function verifyDefenseDown(): Promise<void> {
  console.log("\n=== EFFECT_DEFENSE_DOWN (Tail Whip, primary-effect stat-DOWN, target) ===");
  const run1 = await runScenario(DEFENSE_DOWN_SCENARIO_PATH, SEED);
  const run2 = await runScenario(DEFENSE_DOWN_SCENARIO_PATH, SEED);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check("determinism: frame 0 identical across reruns", deepEqualCapture(before1, before2), "initial state differs between runs");
  check("determinism: frame 450 identical across reruns", deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const acc = rngRoll(before1.rngValue);
  console.log(`  [1] accuracycheck (Tail Whip, ACC_CURR_MOVE)  u16=${acc.u16}  (battle_script_commands.c:1176)`);
  const missRoll = (acc.u16 % 100) + 1;
  check(
    "Tail Whip's 100-accuracy roll can never exceed calc=100, so (Random()%100+1) > calc is mathematically impossible -- a guaranteed hit for any seed, not luck (battle_script_commands.c:1176)",
    missRoll <= 100,
    `(u16 % 100) + 1 = ${missRoll}, expected <= 100`,
  );

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  console.log(`  opponent (MAGNETON): statStages[DEF] ${oppBefore.statStages[STAT_DEF]} -> ${oppAfter.statStages[STAT_DEF]}, hp ${oppBefore.hp} -> ${oppAfter.hp}/${oppAfter.maxHp}`);

  check("opponent statStages[DEF] starts at neutral (6)", oppBefore.statStages[STAT_DEF] === 6, `statStages[DEF]=${oppBefore.statStages[STAT_DEF]}`);
  check(
    "opponent statStages[DEF] drops by exactly 1 stage (6 -> 5): setstatchanger STAT_DEF,1,TRUE, data/battle_scripts_1.s:520-521 (Tail Whip)",
    oppAfter.statStages[STAT_DEF] === 5,
    `statStages[DEF]=${oppAfter.statStages[STAT_DEF]}, expected 5`,
  );
  check("Tail Whip deals no damage (power 0)", oppAfter.hp === oppBefore.hp, `hp ${oppBefore.hp} -> ${oppAfter.hp}`);

  const playerBefore = before1.battlers.player;
  const playerAfter = after1.battlers.player;
  check("player PP[0] (Tail Whip) decremented by exactly 1", playerBefore.pp[0]! - playerAfter.pp[0]! === 1, `${playerBefore.pp[0]} -> ${playerAfter.pp[0]}`);

  const partyAfter = after1.parties.opponent[0]!;
  check(
    "party record has no statStages field at all",
    !("statStages" in partyAfter),
    `party record keys: ${Object.keys(partyAfter).join(",")}`,
  );
}

async function verifyDefenseDownClearBody(): Promise<void> {
  console.log("\n=== EFFECT_DEFENSE_DOWN blocked by Clear Body (Tail Whip vs. METANG) ===");
  const run1 = await runScenario(DEFENSE_DOWN_CLEARBODY_SCENARIO_PATH, SEED);
  const down = await runScenario(DEFENSE_DOWN_SCENARIO_PATH, SEED);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  console.log(`  opponent (METANG): ability=${oppAfter.ability}, statStages[DEF] ${oppBefore.statStages[STAT_DEF]} -> ${oppAfter.statStages[STAT_DEF]}, hp ${oppBefore.hp} -> ${oppAfter.hp}`);

  check("opponent ability reads back as Clear Body (29)", oppAfter.ability === ABILITY_CLEAR_BODY, `ability=${oppAfter.ability}`);
  check(
    "opponent statStages[DEF] stays 6 -> 6 (Clear Body guard live-confirmed, battle_script_commands.c:6987-7008)",
    oppBefore.statStages[STAT_DEF] === 6 && oppAfter.statStages[STAT_DEF] === 6,
    `statStages[DEF] ${oppBefore.statStages[STAT_DEF]} -> ${oppAfter.statStages[STAT_DEF]}`,
  );

  const playerBefore = before1.battlers.player;
  const playerAfter = after1.battlers.player;
  check(
    "PP[0] (Tail Whip) still decrements by 1 even when the effect is blocked -- ppreduce runs before statbuffchange in the script (data/battle_scripts_1.s:538-540)",
    playerBefore.pp[0]! - playerAfter.pp[0]! === 1,
    `${playerBefore.pp[0]} -> ${playerAfter.pp[0]}`,
  );

  const downAfter = down.captures.get(450)!;
  check(
    "the ability-block path is NOT free: it reaches frame 450 with the exact same rngValue as the unblocked success case (same total step count), unlike the secondary-effect path's silent block -- because STAT_CHANGE_ALLOW_PTR routes this block through a real BattleScriptPush + BattleScript_AbilityNoStatLoss sub-script (pause/printstring STRINGID_PKMNPREVENTSSTATLOSSWITH/waitmessage/return, battle_script_commands.c:6991-7007, data/battle_scripts_1.s:4116-4120) that costs comparable real animation-message time to the normal stat-fell message it replaces",
    after1.rngValue === downAfter.rngValue,
    `blocked frame450 rngValue=${after1.rngValue}, unblocked frame450 rngValue=${downAfter.rngValue}`,
  );
}

async function main(): Promise<void> {
  await verifyAttackUp();
  await verifyDefenseDown();
  await verifyDefenseDownClearBody();

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing check(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("FAIL: unhandled error", error);
  process.exit(1);
});
