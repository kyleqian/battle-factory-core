// soak111: natural-seed search for ISSUES #89's shape (docs/soak111-decoupled-cooldown.md §4):
// a full-policy soak run whose player commits Baton Pass (move 226) and then
// reaches the PLAYER-side mid-turn openpartyscreen halt -- the forced party
// selector opening while its outgoing slot is still alive (Baton Pass's own
// switch; a faint-driven selector's outgoing slot has fainted). Observes the
// soak's own runSeed() through the observation-only `coverage` seam
// (`observe(state)` every tick; never a decision input), with the #89 pin's
// options (`stopAtFirstRoundDecision`, `renderEvery: 0`).
//   node --experimental-strip-types --no-warnings tools/integration/soak111BatonPassSearch.ts \
//     --seeds=0..49 --max-frames=200000 --stop-after=3 --out=<shard.jsonl>
import { appendFileSync, writeFileSync } from "node:fs";
import type { EngineState } from "../../src/engine/core.ts";
import { runSeed } from "../soak/randomRoundSoakDriver.ts";

const BATON_PASS = 226;

function flag(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const [lo, hi] = (flag("seeds") ?? "0..9").split("..").map(Number);
const maxFrames = Number(flag("max-frames") ?? 200_000);
const stopAfter = Number(flag("stop-after") ?? 3);
const out = flag("out");
if (!out) throw new Error("--out=<jsonl> is required");
writeFileSync(out, "");
let hits = 0;
for (let seed = lo!; seed <= hi! && hits < stopAfter; seed += 1) {
  let frame = 0;
  let batonPassCommits = 0;
  let lastBatonPassFrame: number | null = null;
  let halt: { frame: number; battleIndex: number | null; outgoingPartyIndex: number; species: string } | null = null;
  const observer = {
    beginSeed(): void {},
    recordPlayerFightCommit(moveId: number): void {
      if (moveId === BATON_PASS) {
        batonPassCommits += 1;
        lastBatonPassFrame = frame;
      }
    },
    observe(state: EngineState): void {
      frame = state.frame;
      const orch = state.factoryRoundBattleOrchestrator;
      const selector = orch?.battleForcedPartySelect ?? null;
      if (halt !== null || selector === null || lastBatonPassFrame === null) return;
      const outgoing = selector.party.find((m) => m.partyIndex === selector.request.faintedPartyIndex);
      if (outgoing !== undefined && !outgoing.fainted) {
        halt = {
          frame: state.frame,
          battleIndex: orch?.round.rules.battleIndex ?? null,
          outgoingPartyIndex: outgoing.partyIndex,
          species: outgoing.species,
        };
      }
    },
  };
  const result = runSeed(seed, {
    policy: "full",
    maxFrames,
    renderEvery: 0,
    stopAtFirstRoundDecision: true,
    // Duck-typed: runSeed only calls beginSeed / observe / recordPlayerFightCommit.
    coverage: observer as never,
  });
  const row = {
    seed,
    hit: halt !== null,
    batonPassCommits,
    halt,
    outcome: result.outcome,
    endState: result.endState ?? null,
    frames: result.frames,
    battle: result.battle,
    turn: result.turn,
    errorMessage: result.errorMessage ?? null,
  };
  if (row.hit) hits += 1;
  appendFileSync(out, JSON.stringify(row) + "\n");
}
