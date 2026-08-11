// S10 step (iv) PREP probe: forced-switch (non-terminal faint fork) ground
// truth. Reruns the committed tools/battle-lab/mechanic-forced-switch-ai-choice-off.json
// (URSARING one-shots a SUNKERN; the opponent's other two bench slots -- PIDGEY
// and MACHOP -- are both healthy, chosen so "next living index" (PIDGEY,
// partyIndex 1) and "AI's best type/damage matchup" (MACHOP, partyIndex 2)
// predict DIFFERENT outcomes) against the live oracle and asserts every claim
// in docs/forced-switch-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-forced-switch-ground-truth.ts

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

interface BattlerState {
  species: number;
  partyIndex: number;
  hp: number;
  maxHp: number;
  statStages: number[];
  status: { kind: string };
}

interface CaptureState {
  rngValue: number;
  battleOutcome: number;
  battlers: { player: BattlerState; opponent: BattlerState };
}

async function runScenario(scenarioPath: string): Promise<Map<number, CaptureState>> {
  const scenario = JSON.parse(readFileSync(scenarioPath, "utf8"));
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

// ISO_RANDOMIZE1 (reference/pokeemerald/include/random.h:16):
// gRngValue = 1103515245 * gRngValue + 24691 (mod 2^32).
function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
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

const SPECIES_SUNKERN = 191;
const SPECIES_PIDGEY = 16;
const SPECIES_MACHOP = 66;
const B_OUTCOME_WON = 1;

async function main(): Promise<void> {
  console.log("=== Forced-switch (non-terminal faint fork) ground truth ===");
  const path = "tools/battle-lab/mechanic-forced-switch-ai-choice-off.json";
  const run1 = await runScenario(path);
  const run2 = await runScenario(path);

  const F_START = 0;
  const F_PRE_KILL = 234; // mid hit-chain: post-roll-3 (adjustnormaldamage), pre-roll-4
  const F_KILL = 235; // datahpupdate already applied; HP 0
  const F_KILL_ROLLS_DONE = 240; // 4th roll (seteffectwithchance) landed
  const F_SWITCH_DANCE_END = 475; // still mid-dance, one frame before partyIndex flips
  const F_PARTYINDEX_FLIP = 476; // gBattlerPartyIndexes committed
  const F_REBUILD_DONE = 478; // species/hp/stats fully rebuilt
  const F_IDLE = 600; // real decision phase reached, no further RNG drift yet
  const F_NEXT_HIT_START = 700;
  const F_NEXT_HIT_DONE = 894;
  const F_TERMINAL = 1000;

  check(
    "determinism: frame 0 identical across reruns",
    deepEqualCapture(run1.get(F_START)!, run2.get(F_START)!),
    "initial state differs between runs",
  );
  check(
    "determinism: final frame identical across reruns",
    deepEqualCapture(run1.get(F_TERMINAL)!, run2.get(F_TERMINAL)!),
    "final state differs between runs",
  );

  const start = run1.get(F_START)!;
  const preKill = run1.get(F_PRE_KILL)!;
  const kill = run1.get(F_KILL)!;
  const killRollsDone = run1.get(F_KILL_ROLLS_DONE)!;
  const switchDanceEnd = run1.get(F_SWITCH_DANCE_END)!;
  const partyIndexFlip = run1.get(F_PARTYINDEX_FLIP)!;
  const rebuildDone = run1.get(F_REBUILD_DONE)!;
  const idle = run1.get(F_IDLE)!;
  const nextHitStart = run1.get(F_NEXT_HIT_START)!;
  const nextHitDone = run1.get(F_NEXT_HIT_DONE)!;

  // --- Claim: battle stays non-terminal throughout (this is the whole point
  // of the non-terminal fork -- the opponent still has living party members
  // after SUNKERN faints, so gBattleOutcome must never flip). ---
  check("battleOutcome never flips (non-terminal fork, opponent has 2 healthy bench mons)", idle.battleOutcome === 0 && nextHitDone.battleOutcome === 0, `idle=${idle.battleOutcome} nextHitDone=${nextHitDone.battleOutcome}`);

  // --- Claim: datahpupdate (HP->0) fires before the hit chain's own 4th
  // roll (seteffectwithchance) completes -- direct confirmation of the
  // documented linear opcode order (...healthbarupdate, datahpupdate,
  // critmessage, resultmessage, seteffectwithchance, tryfaintmon...). ---
  check(
    "kill frame: opponent HP is already 0 while rngValue is still the pre-4th-roll value",
    kill.battlers.opponent.hp === 0 && kill.rngValue === preKill.rngValue,
    `hp=${kill.battlers.opponent.hp} rng kill=${kill.rngValue} preKill=${preKill.rngValue}`,
  );
  check(
    "the 4th roll (seteffectwithchance) lands a few frames after the HP update, not before",
    killRollsDone.rngValue !== kill.rngValue,
    `rngValue unchanged from kill (${kill.rngValue}) through rolls-done frame`,
  );

  // --- Claim: the entire switch-in send-out script
  // (BattleScript_FaintedMonSendOutNew) draws ZERO Random() calls, for a
  // bench with THREE DIFFERENT species (SUNKERN/PIDGEY/MACHOP, none with an
  // ability that fires Random() on switch-in) -- extends
  // docs/faint-outcome-ground-truth.md's same-species finding to a
  // mixed-species bench. ---
  check(
    "switch-in dance draws ZERO Random() calls (rngValue unchanged from the kill's 4th roll through the dance's end)",
    killRollsDone.rngValue === switchDanceEnd.rngValue,
    `rngValue ${killRollsDone.rngValue} -> ${switchDanceEnd.rngValue}`,
  );

  // --- Claim: gBattlerPartyIndexes (getswitchedmondata) commits before the
  // full gBattleMons struct rebuild (switchindataupdate) is observable --
  // two distinct, sequential state-change moments, not one atomic write. ---
  check(
    "gBattlerPartyIndexes flips to the new slot (2) before species/HP are rebuilt",
    partyIndexFlip.battlers.opponent.partyIndex === 2 && partyIndexFlip.battlers.opponent.species === SPECIES_SUNKERN,
    `partyIndex=${partyIndexFlip.battlers.opponent.partyIndex} species=${partyIndexFlip.battlers.opponent.species} (expected stale species ${SPECIES_SUNKERN} still cached this frame)`,
  );
  check(
    "species/hp/stats fully rebuilt to the new mon shortly after",
    rebuildDone.battlers.opponent.species === SPECIES_MACHOP && rebuildDone.battlers.opponent.hp === rebuildDone.battlers.opponent.maxHp,
    `species=${rebuildDone.battlers.opponent.species} hp=${rebuildDone.battlers.opponent.hp}/${rebuildDone.battlers.opponent.maxHp}`,
  );

  // --- THE headline claim: the AI sends MACHOP (partyIndex 2, FIGHTING --
  // super-effective vs. URSARING's NORMAL/NORMAL, per
  // GetMostSuitableMonToSwitchInto's type/damage scoring), skipping over the
  // healthy PIDGEY (partyIndex 1, NORMAL/FLYING -- merely neutral vs.
  // NORMAL) entirely. This disambiguates "next living index" (would be
  // PIDGEY) from "AI's best-matchup pick" (MACHOP) -- the oracle shows the
  // latter. ---
  check(
    "AI sends MACHOP (partyIndex 2, best type matchup), NOT PIDGEY (partyIndex 1, next index)",
    idle.battlers.opponent.species === SPECIES_MACHOP && idle.battlers.opponent.partyIndex === 2,
    `species=${idle.battlers.opponent.species} partyIndex=${idle.battlers.opponent.partyIndex} (PIDGEY=${SPECIES_PIDGEY}@1, MACHOP=${SPECIES_MACHOP}@2)`,
  );

  // --- Claim: the freshly-switched-in mon reads neutral stat stages and no
  // status -- consistent with SwitchInClearSetData's unconditional reset
  // (battle_main.c:3152-3258). ---
  check(
    "freshly-switched-in MACHOP reads neutral stat stages ([6]*8) and no status",
    idle.battlers.opponent.statStages.every((stage) => stage === 6) && idle.battlers.opponent.status.kind === "none",
    `statStages=${JSON.stringify(idle.battlers.opponent.statStages)} status=${idle.battlers.opponent.status.kind}`,
  );

  // --- Claim: the battle genuinely resumes to a real decision phase -- a
  // SECOND real attack (URSARING's Strength again) lands on the newly
  // switched-in MACHOP later in the trace, proving HandleTurnActionSelectionState
  // was really re-entered, not a stuck/idle machine. ---
  check(
    "a second real attack lands on the switched-in MACHOP later (proves the battle resumed, not stalled)",
    nextHitDone.battlers.opponent.hp < idle.battlers.opponent.hp && nextHitDone.battlers.opponent.hp > 0,
    `hp before=${idle.battlers.opponent.hp} after=${nextHitDone.battlers.opponent.hp}`,
  );
  check(
    "that second hit chain's own 4-roll sequence is a genuine forward LCG walk from the post-switch idle value",
    stepsToReach(nextHitStart.rngValue, nextHitDone.rngValue, 8) !== null,
    `no short forward match from ${nextHitStart.rngValue} to ${nextHitDone.rngValue}`,
  );

  check("battleOutcome stays non-terminal even after the second hit (still 2 living opponent slots)", nextHitDone.battleOutcome !== B_OUTCOME_WON, `battleOutcome=${nextHitDone.battleOutcome}`);

  await runPlayerSideChecks();
  await runPartyOrderRamChecks();

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

// Player-side forced switch: tools/battle-lab/mechanic-forced-switch-player-choice-off.json
// is the mirror of the AI-choice scenario above (opponent's URSARING one-shots
// the player's SUNKERN; player bench slots 1/2 are PIDGEY/MACHOP, both
// healthy) plus a RAM-probe-derived button recipe (see
// tools/probe/dump-forced-switch-party-menu.py and docs/forced-switch-ground-truth.md
// §3) that opens the forced party menu, navigates past the fainted slot 0,
// and picks slot 2 (MACHOP) -- deliberately NOT slot 1 (PIDGEY, "next living
// index") -- so this disambiguates genuine player choice the same way §2a
// disambiguates the AI's choice.
async function runPlayerSideChecks(): Promise<void> {
  const path = "tools/battle-lab/mechanic-forced-switch-player-choice-off.json";
  const run1 = await runScenario(path);
  const run2 = await runScenario(path);

  const SPECIES_MACHOP = 66;
  const PARTY_INDEX_PIDGEY = 1; // "next living index" -- the alternative this rung disambiguates against

  const F_START = 0;
  const F_PRE_KILL = 235; // still mid hit-chain, pre-4th-roll
  const F_KILL = 240; // datahpupdate already applied; HP 0
  const F_ROLLS_DONE = 250; // 4th roll landed
  const F_MENU_NAV_DONE = 660; // player has navigated to slot 2 and confirmed; still mid-dance
  const F_PARTYINDEX_FLIP = 680; // gBattlerPartyIndexes committed to slot 2
  const F_REBUILD_DONE = 700; // species/hp/stats fully rebuilt
  const F_RESUME_IDLE = 800; // real decision phase reached again
  const F_SECOND_HIT_DONE = 1200; // opponent's next Strength lands on the newly-switched MACHOP
  const F_TERMINAL = 1300;

  check(
    "player-side: determinism across reruns (frame 0)",
    deepEqualCapture(run1.get(F_START)!, run2.get(F_START)!),
    "initial state differs between runs",
  );
  check(
    "player-side: determinism across reruns (final frame)",
    deepEqualCapture(run1.get(F_TERMINAL)!, run2.get(F_TERMINAL)!),
    "final state differs between runs",
  );

  const preKill = run1.get(F_PRE_KILL)!;
  const kill = run1.get(F_KILL)!;
  const rollsDone = run1.get(F_ROLLS_DONE)!;
  const menuNavDone = run1.get(F_MENU_NAV_DONE)!;
  const partyIndexFlip = run1.get(F_PARTYINDEX_FLIP)!;
  const rebuildDone = run1.get(F_REBUILD_DONE)!;
  const resumeIdle = run1.get(F_RESUME_IDLE)!;
  const secondHitDone = run1.get(F_SECOND_HIT_DONE)!;

  check(
    "player-side kill: player HP is already 0 while rngValue is still the pre-4th-roll value",
    kill.battlers.player.hp === 0 && kill.rngValue === preKill.rngValue,
    `hp=${kill.battlers.player.hp} rng kill=${kill.rngValue} preKill=${preKill.rngValue}`,
  );
  check(
    "player-side: the 4th roll lands a few frames after the HP update, not before",
    rollsDone.rngValue !== kill.rngValue,
    `rngValue unchanged from kill (${kill.rngValue}) through rolls-done frame`,
  );

  // --- Claim: the forced party-menu dance (fainted-message dismissal +
  // navigation + submenu commit) draws ZERO Random() calls, same as the
  // AI-choice dance in §2b -- even though this half is driven by real
  // player button input, not a synchronous AI algorithm. ---
  check(
    "player-side: the entire forced-menu button dance draws ZERO Random() calls",
    rollsDone.rngValue === menuNavDone.rngValue,
    `rngValue ${rollsDone.rngValue} -> ${menuNavDone.rngValue}`,
  );

  check(
    "player-side: gBattlerPartyIndexes flips to the new slot (2) before species/HP are rebuilt",
    partyIndexFlip.battlers.player.partyIndex === 2,
    `partyIndex=${partyIndexFlip.battlers.player.partyIndex}`,
  );

  // --- THE headline claim: pressing DOWN,DOWN,A,A from the fainted slot 0
  // lands on slot 2 (MACHOP), not slot 1 (PIDGEY, "next living index") --
  // proving this is a genuine player choice, distinguishable from a
  // default-first-healthy autopick, exactly mirroring how §2a disambiguates
  // the AI's own choice. ---
  check(
    "player-side: player's button sequence picks MACHOP at partyIndex 2, NOT PIDGEY at partyIndex 1",
    rebuildDone.battlers.player.species === SPECIES_MACHOP &&
      rebuildDone.battlers.player.partyIndex === 2 &&
      rebuildDone.battlers.player.partyIndex !== PARTY_INDEX_PIDGEY,
    `species=${rebuildDone.battlers.player.species} partyIndex=${rebuildDone.battlers.player.partyIndex}`,
  );
  check(
    "player-side: species/hp fully rebuilt to the new mon (MACHOP at full HP)",
    rebuildDone.battlers.player.species === SPECIES_MACHOP && rebuildDone.battlers.player.hp === rebuildDone.battlers.player.maxHp,
    `species=${rebuildDone.battlers.player.species} hp=${rebuildDone.battlers.player.hp}/${rebuildDone.battlers.player.maxHp}`,
  );

  // --- Claim: switch-in state reset is symmetric with the AI side (§2a) --
  // the freshly-switched player mon reads neutral stat stages and no
  // status, consistent with SwitchInClearSetData's unconditional reset. ---
  check(
    "player-side: freshly-switched-in MACHOP reads neutral stat stages ([6]*8) and no status",
    rebuildDone.battlers.player.statStages.every((stage) => stage === 6) && rebuildDone.battlers.player.status.kind === "none",
    `statStages=${JSON.stringify(rebuildDone.battlers.player.statStages)} status=${rebuildDone.battlers.player.status.kind}`,
  );

  check(
    "player-side: battle stays non-terminal through the switch (player still has PIDGEY on the bench)",
    resumeIdle.battleOutcome === 0,
    `battleOutcome=${resumeIdle.battleOutcome}`,
  );

  // --- Claim: the battle genuinely resumes to a real decision phase after
  // a PLAYER-driven forced switch, same as the AI-driven case in §2 -- a
  // second real attack (URSARING's Strength again) lands on the newly
  // switched-in MACHOP later in the trace. ---
  check(
    "player-side: a second real attack lands on the switched-in MACHOP later (proves the battle resumed, not stalled)",
    secondHitDone.rngValue !== resumeIdle.rngValue && secondHitDone.battlers.player.hp < resumeIdle.battlers.player.hp,
    `rng idle=${resumeIdle.rngValue} after=${secondHitDone.rngValue}; hp idle=${resumeIdle.battlers.player.hp} after=${secondHitDone.battlers.player.hp}`,
  );
}

// --- 2026-07-25 addition: pin the gBattlePartyCurrentOrder/gBattlerPartyIndexes
// RAM bytes that settle whether the SwitchPartyOrder permutation (§4 slice 3's
// SWITCHHANDLEORDER) is a no-op for singles, or diverges from raw-array
// indexing on the forced-switch mechanical path. See docs/forced-switch-
// ground-truth.md's dated correction section for the full writeup; this
// reruns tools/probe/dump-forced-switch-party-order.py (a raw-EWRAM probe,
// not the battle-lab HTTP capture schema, since gBattlePartyCurrentOrder
// isn't part of that schema) via tools/run-mgba-probe.py and asserts the
// exact byte sequences that writeup cites.

interface PartyOrderReading {
  gBattlePartyCurrentOrder: [number, number, number];
  gBattlerPartyIndexes: [number, number, number, number];
  battler0Species: number;
  battler1Species: number;
}

function findMgbaVenvPython(scriptDir: string): string {
  let dir = scriptDir;
  for (;;) {
    const candidate = path.join(dir, "oracle", "emerald_core.py");
    if (existsSync(candidate)) {
      const venvPython = path.join(path.dirname(dir), "vendor", "mgba-venv", "bin", "python");
      return existsSync(venvPython) ? venvPython : "python3";
    }
    const parent = path.dirname(dir);
    if (parent === dir) return "python3";
    dir = parent;
  }
}

function runPartyOrderProbe(scenarioPath: string, ticks: number[]): Record<string, PartyOrderReading> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const worktreeRoot = path.resolve(scriptDir, "..", "..");
  const venvPython = findMgbaVenvPython(scriptDir);
  const tmpDir = mkdtempSync(path.join(tmpdir(), "forced-switch-party-order-"));
  const outputPath = path.join(tmpDir, "probe.json");
  try {
    execFileSync(
      "python3",
      [
        "tools/run-mgba-probe.py",
        outputPath,
        "--",
        venvPython,
        "tools/probe/dump-forced-switch-party-order.py",
        outputPath,
        scenarioPath,
        ...ticks.map(String),
      ],
      { cwd: worktreeRoot, stdio: ["ignore", "pipe", "pipe"] },
    );
    const payload = JSON.parse(readFileSync(outputPath, "utf8")) as { readings: Record<string, PartyOrderReading> };
    return payload.readings;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function runPartyOrderRamChecks(): Promise<void> {
  // AI-choice fixture: opponent (battler 1) SUNKERN (raw index 0) faints,
  // AI picks MACHOP (raw index 2).
  const ai = runPartyOrderProbe("tools/battle-lab/mechanic-forced-switch-ai-choice-off.json", [0, 470, 476, 478]);

  check(
    "RAM: battle start -- gBattlePartyCurrentOrder is the identity permutation ([0x01,0x23,0x45])",
    JSON.stringify(ai["0"].gBattlePartyCurrentOrder) === JSON.stringify([1, 35, 69]) &&
      JSON.stringify(ai["0"].gBattlerPartyIndexes) === JSON.stringify([0, 0, 0, 0]),
    `order=${JSON.stringify(ai["0"].gBattlePartyCurrentOrder)} partyIndexes=${JSON.stringify(ai["0"].gBattlerPartyIndexes)}`,
  );
  check(
    "RAM: SWITCHHANDLEORDER's SwitchPartyOrder call already swapped positions 0/2 in gBattlePartyCurrentOrder ([0x21,0x03,0x45]) BEFORE gBattlerPartyIndexes commits (still [0,0,0,0])",
    JSON.stringify(ai["470"].gBattlePartyCurrentOrder) === JSON.stringify([33, 3, 69]) &&
      JSON.stringify(ai["470"].gBattlerPartyIndexes) === JSON.stringify([0, 0, 0, 0]) &&
      ai["470"].battler1Species === SPECIES_SUNKERN,
    `order=${JSON.stringify(ai["470"].gBattlePartyCurrentOrder)} partyIndexes=${JSON.stringify(ai["470"].gBattlerPartyIndexes)} species=${ai["470"].battler1Species}`,
  );
  check(
    "RAM: GETSWITCHEDMONDATA commits gBattlerPartyIndexes[1] to the RAW index 2 (not a position), order table unchanged",
    JSON.stringify(ai["476"].gBattlerPartyIndexes) === JSON.stringify([0, 2, 0, 0]) &&
      JSON.stringify(ai["476"].gBattlePartyCurrentOrder) === JSON.stringify([33, 3, 69]),
    `partyIndexes=${JSON.stringify(ai["476"].gBattlerPartyIndexes)} order=${JSON.stringify(ai["476"].gBattlePartyCurrentOrder)}`,
  );
  check(
    "RAM: SWITCHINDATAUPDATE rebuilds battler1 directly from gEnemyParty[2] (MACHOP) -- raw-index lookup, no permutation indirection",
    ai["478"].battler1Species === SPECIES_MACHOP,
    `species=${ai["478"].battler1Species}`,
  );

  // Player-choice fixture: player (battler 0) SUNKERN (raw index 0) faints,
  // player navigates to and picks MACHOP (raw index 2) -- same mechanism,
  // opposite side, proving the permutation's shape isn't AI-specific.
  const player = runPartyOrderProbe("tools/battle-lab/mechanic-forced-switch-player-choice-off.json", [0, 655, 680, 700]);

  check(
    "RAM (player side): battle start -- gBattlePartyCurrentOrder is also the identity permutation",
    JSON.stringify(player["0"].gBattlePartyCurrentOrder) === JSON.stringify([1, 35, 69]) &&
      JSON.stringify(player["0"].gBattlerPartyIndexes) === JSON.stringify([0, 0, 0, 0]),
    `order=${JSON.stringify(player["0"].gBattlePartyCurrentOrder)} partyIndexes=${JSON.stringify(player["0"].gBattlerPartyIndexes)}`,
  );
  check(
    "RAM (player side): the party-menu commit already swapped positions 0/2 in gBattlePartyCurrentOrder before gBattlerPartyIndexes[0] commits",
    JSON.stringify(player["655"].gBattlePartyCurrentOrder) === JSON.stringify([33, 3, 69]) &&
      JSON.stringify(player["655"].gBattlerPartyIndexes) === JSON.stringify([0, 0, 0, 0]),
    `order=${JSON.stringify(player["655"].gBattlePartyCurrentOrder)} partyIndexes=${JSON.stringify(player["655"].gBattlerPartyIndexes)}`,
  );
  check(
    "RAM (player side): gBattlerPartyIndexes[0] commits to the RAW index 2, identical shape to the AI side",
    JSON.stringify(player["680"].gBattlerPartyIndexes) === JSON.stringify([2, 0, 0, 0]) &&
      JSON.stringify(player["680"].gBattlePartyCurrentOrder) === JSON.stringify([33, 3, 69]),
    `partyIndexes=${JSON.stringify(player["680"].gBattlerPartyIndexes)} order=${JSON.stringify(player["680"].gBattlePartyCurrentOrder)}`,
  );
  check(
    "RAM (player side): battler0 rebuilds directly from gPlayerParty[2] (MACHOP)",
    player["700"].battler0Species === SPECIES_MACHOP,
    `species=${player["700"].battler0Species}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
