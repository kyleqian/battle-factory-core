// prep65 (1): does the presentation host record the Dive bodies' Random2 words (setup 291 turn 0, UNLEASH 291 turn 1 = order key 10291)?
// For every Dive body of the prep61 probes (units.json from prep61Extract.py over a fresh prep61Probe.py run; raw/<job>-A.json carries the
// per-frame gRng2Value series), the PRODUCTION tick seam's activation (liveMovePresentationRng.ts activateLiveMovePresentationRng: the
// turn- / side-keyed liveMoveRandom2Plan, the setup's splash birth from the displayed species, liveDiveSetupSplashBirth) is run on a host
// pinned at the RAM gRng2Value of the body's activation frame A (createPresentationRngHostAt, "pinned"), and the recorded words
// (liveMovePresentationRngWords by key) are compared with the RAM words: on every plan frame A + ageOffset the RAM drew 1 + count words
// (the per-frame step first, then the body's draws) and the last `count` equal the recorded draw group; every other frame from A + 1 to
// the last plan frame drew exactly 1 (the per-frame step only).
// usage: node --experimental-strip-types tools/integration/prep65Words.ts <probe-dir> <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { activateLiveMovePresentationRng, liveMovePresentationRngWords, liveMoveRandom2Plan } from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngHostAt } from "../../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import { liveDiveSetupSplashBirth } from "../../src/engine/liveMoveAnimation.ts";

interface Unit { kind: string; label: string; frame: number; truncated: boolean }
interface Job { units: Unit[]; attackerSide: "player" | "opponent"; base: string }
const [probeDir, unitsPath, outPath] = process.argv.slice(2);
const jobs = (JSON.parse(readFileSync(unitsPath!, "utf8")) as { jobs: Record<string, Job> }).jobs;
const lcg = (x: number) => (Math.imul(x, 1103515245) + 24691) >>> 0;
const SPECIES: Record<string, { player: number; opponent: number }> = {
  "mechanic-dive-player-chinchou-opponent-onix": { player: 170, opponent: 95 },
  "mechanic-dive-opponent-chinchou-player-onix": { player: 95, opponent: 170 },
  "prep25-dive-alt-player-lanturn-golem": { player: 171, opponent: 76 },
  "prep25-dive-alt-opponent-lanturn-golem": { player: 76, opponent: 171 },
};
const results: unknown[] = [];
let exact = 0, total = 0;
for (const [name, job] of Object.entries(jobs).sort(([a], [b]) => a.localeCompare(b))) {
  const species = SPECIES[job.base];
  if (species === undefined) continue;
  const raw = JSON.parse(readFileSync(join(probeDir!, "raw", `${name}-A.json`), "utf8")) as { extra: number[][] };
  const value = new Map(raw.extra.map((e) => [e[0]!, e[4]!] as const));
  /** RAM words drawn on frame n: the LCG outputs from the value at n - 1 to the value at n. */
  const wordsOn = (n: number): number[] | null => {
    const before = value.get(n - 1), at = value.get(n);
    if (before === undefined || at === undefined) return null;
    const out: number[] = [];
    for (let v = before, k = 0; v !== at; k++) { if (k > 4096) return null; v = lcg(v); out.push(v >>> 16); }
    return out;
  };
  for (const u of job.units) {
    const m = /^body (10291|291):(player|opponent)$/.exec(u.label);
    if (u.kind !== "body" || m === null || u.truncated) continue;
    const turn = m[1] === "10291" ? 1 : 0, side = m[2] as "player" | "opponent";
    const request = { moveId: 291, turn, attacker: side === "player" ? 0 : 1 };
    const field = { player: { species: species.player }, opponent: { species: species.opponent } } as never;
    const context = turn === 0 ? { diveSetupSplashBirth: liveDiveSetupSplashBirth(field, side) } : undefined;
    const plan = liveMoveRandom2Plan(request, context);
    const at = value.get(u.frame);
    if (plan === null || at === undefined) { results.push({ job: name, label: u.label, frame: u.frame, verdict: "no plan / no RAM value" }); total++; continue; }
    const key = `prep65:${name}:${u.frame}`;
    const host = activateLiveMovePresentationRng(createPresentationRngHostAt(createPresentationRngState(at, "pinned")), request, key, context);
    const recorded = liveMovePresentationRngWords({ host, key });
    const lastAge = plan[plan.length - 1]!.ageOffset;
    const steps: { age: number; ramDraws: number; planCount: number; equal: boolean }[] = [];
    const otherFrames: number[] = [];
    for (let age = 1; age <= lastAge; age++) {
      const ram = wordsOn(u.frame + age);
      const k = plan.findIndex((s) => s.ageOffset === age);
      if (k < 0) { if (ram === null || ram.length !== 1) otherFrames.push(age); continue; }
      const group = recorded?.draws[k] ?? [];
      const count = plan[k]!.count;
      steps.push({ age, ramDraws: ram?.length ?? -1, planCount: count,
        equal: ram !== null && ram.length === count + 1 && JSON.stringify(ram.slice(1)) === JSON.stringify(group) });
    }
    const ok = recorded !== null && steps.length === plan.length && steps.every((s) => s.equal) && otherFrames.length === 0;
    total++; if (ok) exact++;
    results.push({ job: name, label: u.label, frame: u.frame, turn, side, activationValue: at, planSteps: plan.length,
      words: recorded?.words.length ?? 0, verdict: ok ? "RECORDED == RAM" : "DIFF", steps: steps.filter((s) => !s.equal),
      framesWithExtraDraws: otherFrames });
  }
}
writeFileSync(outPath!, JSON.stringify({ schema: "prep65-dive-host-words/v1", exact, total, results }, null, 1) + "\n");
for (const r of results as { job: string; label: string; frame: number; words: number; verdict: string }[]) {
  console.log(`${r.job.padEnd(24)} ${r.label.padEnd(20)} f${r.frame} words ${r.words} ${r.verdict}`);
}
console.log(`${exact}/${total} Dive bodies: the production tick seam's recorded words == the RAM Random2 words (plan frames and per-frame steps)`);
