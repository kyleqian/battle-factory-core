// soak111: per-seed RandomPlayer decision / action logs for the decoupling
// proof (docs/soak111-decoupled-cooldown.md). Runs the soak's own runSeed()
// as the soak pins do (`stopAtFirstRoundDecision`, the CLI's `--first-round`;
// `renderEvery: 0`; the policy's default frame budget), captures every driver
// note through the `onNote` seam, and writes per seed:
//   <logs-dir>/seed-<n>.decisions.txt  every NON-mash note, "b<battle> t<turn> <what>" (frame dropped)
//   <logs-dir>/seed-<n>.canonical.txt  every note, frame dropped, mash " (B)" dropped, consecutive
//                                      identical mash notes collapsed to one
//   <logs-dir>/seed-<n>.frames.txt     "<frame> <what>" for every note (raw, frame-bearing)
// and a JSON summary (outcome, endState, battle, turn, frames, note counts, sha256s).
// Mash notes are exactly the labels RandomPlayer.pressAdvance() emits: their
// count and A/B choice depend on presentation length (press stream), so they
// are the only notes allowed to differ between two presentation variants.
//   node --experimental-strip-types --no-warnings tools/integration/soak111Decoupling.ts \
//     --policy=full --seeds=0..11,27 --logs-dir=<dir> --out=<summary.json>
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { runSeed, type SoakPolicy } from "../soak/randomRoundSoakDriver.ts";

const MASH = /^(battleScene A|battleRoom A|prebattleRoom A|intro A|rejection dismiss|party message dismiss|resolution advance|forced-party message dismiss|postwin room advance|postwin brain call-scene box \d+|postwin brain one-liner \(AskSwapBeforeHead\)|postwin advance)( \(B\))?$/;

function flag(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function parseSeeds(spec: string): number[] {
  const seeds: number[] = [];
  for (const part of spec.split(",")) {
    const [lo, hi] = part.split("..").map(Number);
    for (let s = lo!; s <= (hi ?? lo!); s += 1) seeds.push(s);
  }
  return seeds;
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const policy = (flag("policy") ?? "full") as SoakPolicy;
const seeds = parseSeeds(flag("seeds") ?? "0..11,27");
const logsDir = flag("logs-dir");
const out = flag("out");
if (!logsDir || !out) throw new Error("--logs-dir=<dir> and --out=<json> are required");
mkdirSync(logsDir, { recursive: true });

const rows = [];
for (const seed of seeds) {
  const notes: { frame: number; battle: number; turn: number; what: string }[] = [];
  const result = runSeed(seed, {
    policy,
    renderEvery: 0,
    stopAtFirstRoundDecision: true,
    onNote: (n) => notes.push({ ...n }),
  });
  const decisions: string[] = [];
  const canonical: string[] = [];
  let lastMash: string | null = null;
  let mash = 0;
  for (const n of notes) {
    const isMash = MASH.test(n.what);
    if (isMash) {
      mash += 1;
      const label = `b${n.battle} t${n.turn} ${n.what.replace(/ \(B\)$/, "")}`;
      if (label !== lastMash) canonical.push(label);
      lastMash = label;
      continue;
    }
    lastMash = null;
    const line = `b${n.battle} t${n.turn} ${n.what}`;
    decisions.push(line);
    canonical.push(line);
  }
  const decisionsText = decisions.join("\n") + "\n";
  const canonicalText = canonical.join("\n") + "\n";
  writeFileSync(`${logsDir}/seed-${seed}.decisions.txt`, decisionsText);
  writeFileSync(`${logsDir}/seed-${seed}.canonical.txt`, canonicalText);
  writeFileSync(`${logsDir}/seed-${seed}.frames.txt`, notes.map((n) => `${n.frame} ${n.what}`).join("\n") + "\n");
  const row = {
    seed,
    outcome: result.outcome,
    endState: result.endState ?? null,
    battle: result.battle,
    turn: result.turn,
    frames: result.frames,
    errorMessage: result.errorMessage ?? null,
    notes: notes.length,
    mashNotes: mash,
    decisionNotes: decisions.length,
    canonicalLines: canonical.length,
    decisionsSha256: sha(decisionsText),
    canonicalSha256: sha(canonicalText),
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
writeFileSync(out, JSON.stringify({ policy, seeds, rows }, null, 2) + "\n");
