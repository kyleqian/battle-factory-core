// S10 step (iv) PREP probe: BattleResolution adapter ground truth. Banks the
// two claims docs/round-controller-outcome-seam.md §4 piece 5 flagged as
// "not confirmed against source/oracle -- verify before implementation"
// (post-battle party status semantics) plus the draw-reachability question,
// for whoever builds the terminal-boundary -> BattleResolution adapter.
//
// Check 1 reruns the ALREADY-COMMITTED tools/battle-lab/mechanic-hit-chain-ko-off.json
// (no new scenario needed -- see docs/faint-outcome-ground-truth.md) and
// asserts every fainted opponent party slot reads status "none" at the
// terminal frame. Check 2 reruns the NEW
// tools/battle-lab/mechanic-party-status-sync-off.json and asserts the
// active mon's real status1 (from using Rest) is visible in its party
// record while still alive, and untouched bench slots keep their pre-battle
// status/HP. Draw reachability (docs/battle-resolution-adapter-ground-truth.md
// §1) has no live check here -- live staging of a positive case was assessed
// as not cheap this session (see that doc's "Staging attempt" note); the
// verdict rests on source citations plus check 1/2's confirmation that the
// party-record sync mechanism this doc's reasoning depends on is real.
//
// Run: node --experimental-strip-types tools/probe/verify-battle-resolution-ground-truth.ts

import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

interface StatusValue {
  kind: string;
  turns?: number;
}

interface PartyMemberState {
  hp: number;
  maxHp: number;
  status: StatusValue;
  status1: number;
}

interface CaptureState {
  battleOutcome: number;
  battlers: {
    player: { hp: number; maxHp: number; status: StatusValue; partyIndex: number };
  };
  parties: {
    player: PartyMemberState[];
    opponent: PartyMemberState[];
  };
}

async function runScenario(scenarioPath: string): Promise<Map<number, CaptureState>> {
  const { readFileSync } = await import("node:fs");
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

let failures = 0;
function check(label: string, condition: boolean, detail: string): void {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL: ${label} -- ${detail}`);
  }
}

async function main(): Promise<void> {
  console.log("=== BattleResolution adapter ground truth ===");

  // --- Check 1: fainted party slots read status "none" at terminal time. ---
  // Reruns the already-committed KO scenario (docs/faint-outcome-ground-truth.md)
  // -- three SUNKERN one-shot by URSARING, terminal frame 1734.
  const koPath = "tools/battle-lab/mechanic-hit-chain-ko-off.json";
  const koCaptures = await runScenario(koPath);
  const terminal = koCaptures.get(1734);
  if (!terminal) {
    check("KO scenario terminal frame 1734 present", false, `frames: ${[...koCaptures.keys()].join(",")}`);
  } else {
    check(
      "KO scenario: battleOutcome == 1 (WON) at terminal frame",
      terminal.battleOutcome === 1,
      `battleOutcome=${terminal.battleOutcome}`,
    );
    terminal.parties.opponent.forEach((mon, i) => {
      check(
        `KO scenario: fainted opponent party slot ${i} reads hp=0`,
        mon.hp === 0,
        `hp=${mon.hp}`,
      );
      check(
        `KO scenario: fainted opponent party slot ${i} reads status "none"`,
        mon.status.kind === "none",
        `status=${JSON.stringify(mon.status)}`,
      );
    });
  }

  // --- Check 2: party record is live-synced during battle (active mon's
  // real status1 visible mid-battle; untouched bench keeps pre-battle
  // status/HP). New scenario committed this session. ---
  const syncPath = "tools/battle-lab/mechanic-party-status-sync-off.json";
  const syncCaptures = await runScenario(syncPath);
  const start = syncCaptures.get(0);
  const after = syncCaptures.get(320);
  if (!start || !after) {
    check("party-status-sync scenario has frames 0 and 320", false, `frames: ${[...syncCaptures.keys()].join(",")}`);
  } else {
    check(
      "frame 0: all three player party slots start at full HP, no status",
      start.parties.player.every((m) => m.hp === m.maxHp && m.status.kind === "none"),
      JSON.stringify(start.parties.player.map((m) => [m.hp, m.status.kind])),
    );

    const active = after.parties.player[0]!;
    check(
      "frame 320: active mon (slot 0) took real damage from the opponent",
      active.hp > 0 && active.hp < active.maxHp,
      `hp=${active.hp}/${active.maxHp}`,
    );
    check(
      "frame 320: active mon's party record shows real status1 (asleep from its own Rest)",
      active.status.kind === "sleep",
      `status=${JSON.stringify(active.status)}`,
    );
    check(
      "frame 320: active mon's party record status matches the live battler struct (proves the party slice is synced in real time, not just at battle end)",
      active.status.kind === after.battlers.player.status.kind && active.hp === after.battlers.player.hp,
      `party=${JSON.stringify(active.status)}/${active.hp} battler=${JSON.stringify(after.battlers.player.status)}/${after.battlers.player.hp}`,
    );

    for (const slotIndex of [1, 2]) {
      const bench = after.parties.player[slotIndex]!;
      check(
        `frame 320: never-sent-out bench slot ${slotIndex} keeps full pre-battle HP`,
        bench.hp === bench.maxHp,
        `hp=${bench.hp}/${bench.maxHp}`,
      );
      check(
        `frame 320: never-sent-out bench slot ${slotIndex} keeps pre-battle status "none"`,
        bench.status.kind === "none",
        `status=${JSON.stringify(bench.status)}`,
      );
    }
  }

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
