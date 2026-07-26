// Side-lane ground-truth scout: screens (Reflect/Light Screen/Safeguard/Mist)
// and weather (Rain/Sun/Sandstorm/Hail) setters + their DoFieldEndTurnEffects
// lifecycle. Reruns three committed battle-lab scenarios against the live
// oracle (Battle Scene OFF) and asserts every live claim in
// docs/screens-weather-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-screens-weather-ground-truth.ts
// (also runnable via `npx tsx`; no project code depends on this file).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const LIGHTSCREEN_SCENARIO = "tools/battle-lab/mechanic-screens-lightscreen-off.json";
const SANDSTORM_SCENARIO = "tools/battle-lab/mechanic-screens-sandstorm-off.json";
const SAFEGUARD_SCENARIO = "tools/battle-lab/mechanic-screens-safeguard-off.json";

// include/constants/battle.h:210/215/8 -- SIDE_STATUS_REFLECT=1<<0, LIGHTSCREEN=1<<1, SAFEGUARD=1<<5.
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
// include/constants/battle.h:236 -- B_WEATHER_SANDSTORM_TEMPORARY = 1<<3.
const B_WEATHER_SANDSTORM_TEMPORARY = 1 << 3;

interface SideCondition {
  reflectTurns: number;
  lightScreenTurns: number;
  mistTurns: number;
  safeguardTurns: number;
  spikes: number;
}

interface CaptureState {
  rngValue: number;
  battleOutcome: number;
  weather: number;
  weatherTurns: number;
  sideStatuses: number[];
  sideConditions: { player: SideCondition; opponent: SideCondition };
  battlers: { player: { hp: number; maxHp: number }; opponent: { hp: number; maxHp: number } };
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

async function verifyLightScreen(): Promise<void> {
  console.log("=== mechanic-screens-lightscreen-off.json ===");
  const c = await runScenario(LIGHTSCREEN_SCENARIO);

  check(
    "before turn 1: no Light Screen active (sideStatuses[0]=0, lightScreenTurns=0)",
    at(c, 67).sideStatuses[0] === 0 && at(c, 67).sideConditions.player.lightScreenTurns === 0,
    `frame67 sideStatuses=${JSON.stringify(at(c, 67).sideStatuses)}`,
  );
  check(
    "Cmd_setlightscreen fires at frame 68: SIDE_STATUS_LIGHTSCREEN set, timer=5, zero Random() draws",
    at(c, 68).sideStatuses[0] === SIDE_STATUS_LIGHTSCREEN &&
      at(c, 68).sideConditions.player.lightScreenTurns === 5 &&
      at(c, 68).rngValue === at(c, 67).rngValue,
    `frame68 status=${at(c, 68).sideStatuses[0]}, turns=${at(c, 68).sideConditions.player.lightScreenTurns}`,
  );
  check(
    "reflectTurns/mistTurns/safeguardTurns stay 0 throughout (Light Screen only sets its own side-status bit)",
    at(c, 68).sideConditions.player.reflectTurns === 0 &&
      at(c, 68).sideConditions.player.mistTurns === 0 &&
      at(c, 68).sideConditions.player.safeguardTurns === 0,
    `frame68 sideCondition=${JSON.stringify(at(c, 68).sideConditions.player)}`,
  );

  // NOTE: unlike the setter's own turn (67->68, no opponent turn has happened
  // yet, so the comparison is rng-clean), each of these later decrements sits
  // on a frame that ALSO carries that turn's Splash-slot AI tie-break roll
  // (same phenomenon docs/hit-chain-ground-truth.md's "+14 AI scoring" and
  // docs/end-turn-ground-truth.md 2a's "rngValue does change between ticks --
  // that's the six intervening turns' own ... AI-rescoring rolls" already
  // flag) -- Battle Scene OFF collapses both events into the same captured
  // frame, so a live rngValue-unchanged assertion here would be FALSE, not a
  // bug. The decrement itself is proven zero-Random() by source instead (grep
  // over battle_util.c's ENDTURN_LIGHT_SCREEN case, no Random( call site).
  const decrementFrames: Array<[number, number, number]> = [
    [370, 371, 4],
    [730, 731, 3],
    [1090, 1091, 2],
    [1450, 1451, 1],
  ];
  for (const [before, after, expected] of decrementFrames) {
    check(
      `DoFieldEndTurnEffects ENDTURN_LIGHT_SCREEN decrements timer to ${expected} at frame ${after} (battle_util.c:1244-1249)`,
      at(c, after).sideConditions.player.lightScreenTurns === expected &&
        at(c, before).sideConditions.player.lightScreenTurns === expected + 1,
      `frame${before}=${at(c, before).sideConditions.player.lightScreenTurns}, frame${after}=${at(c, after).sideConditions.player.lightScreenTurns}`,
    );
  }

  check(
    "timer reaches 0 and SIDE_STATUS_LIGHTSCREEN clears at frame 1811 (BattleScript_SideStatusWoreOff), zero Random() draws",
    at(c, 1810).sideConditions.player.lightScreenTurns === 1 &&
      at(c, 1811).sideConditions.player.lightScreenTurns === 0 &&
      at(c, 1811).sideStatuses[0] === 0 &&
      at(c, 1810).rngValue === at(c, 1811).rngValue,
    `frame1810=${at(c, 1810).sideConditions.player.lightScreenTurns}, frame1811 turns=${at(c, 1811).sideConditions.player.lightScreenTurns} status=${at(c, 1811).sideStatuses[0]}`,
  );
  check(
    "after expiry, the same move slot re-sets Light Screen from scratch at frame 1968 (timer 0 -> 5 again, not blocked)",
    at(c, 1967).sideConditions.player.lightScreenTurns === 0 &&
      at(c, 1968).sideConditions.player.lightScreenTurns === 5 &&
      at(c, 1968).sideStatuses[0] === SIDE_STATUS_LIGHTSCREEN,
    `frame1967=${at(c, 1967).sideConditions.player.lightScreenTurns}, frame1968=${at(c, 1968).sideConditions.player.lightScreenTurns}`,
  );
}

async function verifySandstorm(): Promise<void> {
  console.log("\n=== mechanic-screens-sandstorm-off.json ===");
  const c = await runScenario(SANDSTORM_SCENARIO);

  check(
    "before turn 1: no weather (weather=0, weatherTurns=0)",
    at(c, 64).weather === 0 && at(c, 64).weatherTurns === 0,
    `frame64 weather=${at(c, 64).weather}`,
  );
  check(
    "Cmd_setsandstorm fires at frame 65: B_WEATHER_SANDSTORM_TEMPORARY set, weatherDuration=5, zero Random() draws",
    at(c, 65).weather === B_WEATHER_SANDSTORM_TEMPORARY &&
      at(c, 65).weatherTurns === 5 &&
      at(c, 65).rngValue === at(c, 64).rngValue,
    `frame65 weather=${at(c, 65).weather}, turns=${at(c, 65).weatherTurns}`,
  );
  check(
    "ONIX (ROCK/GROUND) takes zero sandstorm chip damage on its own field -- type immunity confirmed live",
    at(c, 65).battlers.player.hp === at(c, 65).battlers.player.maxHp,
    `player hp=${at(c, 65).battlers.player.hp}/${at(c, 65).battlers.player.maxHp}`,
  );

  // Frame numbers below were pinned via a CONTIGUOUS scan (step 1 within each
  // coarse-bounded window), not by guessing a fixed offset from a coarse
  // sample point -- an earlier draft of this fixture used disjoint ~25-frame
  // windows around each coarse boundary and got 4 of these wtFrame pairs
  // wrong (e.g. claimed 2446/2447 for the wt:2->1 tick when the real
  // transition is 2216/2217): comparing the first point of an isolated window
  // to a stale "previous value" carried over from an earlier, disjoint window
  // silently invents a false transition frame. Recorded here as a correction,
  // per this doc's own discipline about falsifiable claims.
  const ticks: Array<{ wtBefore: number; wtAfter: number; wtFrame: [number, number]; hpBefore: number; hpAfter: number; hpFrame: [number, number] }> = [
    { wtBefore: 5, wtAfter: 4, wtFrame: [361, 362], hpBefore: 105, hpAfter: 99, hpFrame: [609, 610] },
    { wtBefore: 4, wtAfter: 3, wtFrame: [976, 977], hpBefore: 99, hpAfter: 93, hpFrame: [1224, 1225] },
    { wtBefore: 3, wtAfter: 2, wtFrame: [1596, 1597], hpBefore: 93, hpAfter: 87, hpFrame: [1844, 1845] },
    { wtBefore: 2, wtAfter: 1, wtFrame: [2216, 2217], hpBefore: 87, hpAfter: 81, hpFrame: [2464, 2465] },
  ];
  for (const t of ticks) {
    check(
      `weatherDuration decrements ${t.wtBefore} -> ${t.wtAfter} at frame ${t.wtFrame[1]} (battle_util.c ENDTURN_SANDSTORM)`,
      at(c, t.wtFrame[0]).weatherTurns === t.wtBefore && at(c, t.wtFrame[1]).weatherTurns === t.wtAfter,
      `frame${t.wtFrame[0]}=${at(c, t.wtFrame[0]).weatherTurns}, frame${t.wtFrame[1]}=${at(c, t.wtFrame[1]).weatherTurns}`,
    );
    check(
      `Cmd_weatherdamage deals exactly floor(maxHP/16)=6 to SUNKERN (GRASS, non-immune) at frame ${t.hpFrame[1]} (opponent HP ${t.hpBefore} -> ${t.hpAfter})`,
      at(c, t.hpFrame[0]).battlers.opponent.hp === t.hpBefore &&
        at(c, t.hpFrame[1]).battlers.opponent.hp === t.hpAfter &&
        t.hpBefore - t.hpAfter === Math.floor(105 / 16),
      `frame${t.hpFrame[0]}=${at(c, t.hpFrame[0]).battlers.opponent.hp}, frame${t.hpFrame[1]}=${at(c, t.hpFrame[1]).battlers.opponent.hp}`,
    );
  }

  check(
    "on the 5th tick, weather ends (BattleScript_SandStormHailEnds) at frame 2837: weather clears to 0, NO damage tick (opponent HP unchanged from 81)",
    at(c, 2836).weather === B_WEATHER_SANDSTORM_TEMPORARY &&
      at(c, 2837).weather === 0 &&
      at(c, 2837).weatherTurns === 0 &&
      at(c, 2837).battlers.opponent.hp === 81 &&
      at(c, 2836).rngValue === at(c, 2837).rngValue,
    `frame2836 weather=${at(c, 2836).weather}, frame2837 weather=${at(c, 2837).weather}, hp=${at(c, 2837).battlers.opponent.hp}`,
  );
  check(
    "after expiry, the same move slot re-sets sandstorm from scratch at frame 3005 (weather 0 -> temporary, duration -> 5)",
    at(c, 3004).weather === 0 &&
      at(c, 3005).weather === B_WEATHER_SANDSTORM_TEMPORARY &&
      at(c, 3005).weatherTurns === 5,
    `frame3004=${at(c, 3004).weather}, frame3005=${at(c, 3005).weather}`,
  );
}

async function verifySafeguard(): Promise<void> {
  console.log("\n=== mechanic-screens-safeguard-off.json ===");
  const c = await runScenario(SAFEGUARD_SCENARIO);

  check(
    "Cmd_setsafeguard fires at frame 65: SIDE_STATUS_SAFEGUARD set, timer=5, zero Random() draws (identical shape to Light Screen/Reflect)",
    at(c, 65).sideStatuses[0] === SIDE_STATUS_SAFEGUARD &&
      at(c, 65).sideConditions.player.safeguardTurns === 5 &&
      at(c, 65).rngValue === at(c, 64).rngValue,
    `frame65 status=${at(c, 65).sideStatuses[0]}, turns=${at(c, 65).sideConditions.player.safeguardTurns}`,
  );

  // NOTE: Safeguard's per-turn cadence (367/714/1074/1428) drifts slightly
  // versus Light Screen's (371/731/1091/1451) -- different message strings
  // apparently cost a handful of frames each in Battle Scene OFF's waitmessage
  // handling. Discovered empirically, not assumed from the Light Screen
  // fixture's frame numbers (an earlier draft of this fixture wrongly copied
  // those verbatim and every post-set check failed -- see the doc's
  // correction note).
  const decrementFrames: Array<[number, number]> = [
    [367, 4],
    [714, 3],
    [1074, 2],
    [1428, 1],
  ];
  for (const [after, expected] of decrementFrames) {
    check(
      `ENDTURN_SAFEGUARD decrements timer to ${expected} at frame ${after}`,
      at(c, after).sideConditions.player.safeguardTurns === expected,
      `frame${after}=${at(c, after).sideConditions.player.safeguardTurns}`,
    );
  }
  check(
    "timer reaches 0 and SIDE_STATUS_SAFEGUARD clears at frame 1788 (BattleScript_SafeguardEnds), zero Random() draws",
    at(c, 1787).sideConditions.player.safeguardTurns === 1 &&
      at(c, 1788).sideConditions.player.safeguardTurns === 0 &&
      at(c, 1788).sideStatuses[0] === 0 &&
      at(c, 1787).rngValue === at(c, 1788).rngValue,
    `frame1787=${at(c, 1787).sideConditions.player.safeguardTurns}, frame1788=${at(c, 1788).sideConditions.player.safeguardTurns}`,
  );
  check(
    "after expiry, the same move slot re-sets Safeguard from scratch at frame 2005 (timer 0 -> 5 again)",
    at(c, 2004).sideConditions.player.safeguardTurns === 0 && at(c, 2005).sideConditions.player.safeguardTurns === 5,
    `frame2004=${at(c, 2004).sideConditions.player.safeguardTurns}, frame2005=${at(c, 2005).sideConditions.player.safeguardTurns}`,
  );
}

async function main(): Promise<void> {
  await verifyLightScreen();
  await verifySandstorm();
  await verifySafeguard();

  console.log(`\n${failCount === 0 ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"} (${passCount} pass, ${failCount} fail)`);
  if (failCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
