// prep61: is the Dive SETUP body's sprite order a function of its RAM-read Random2 words (prep46 method)? For every Dive setup body
// (`body 291:<side>`) of the prep61 probes: the words drawn on the droplet-birth frame are read from the probe's per-frame gRng2Value
// series (prep61EventProbe.py extra list: the LCG steps between consecutive values, gRng2Value = 1103515245 x + 24691, word = x >> 16), and
// the accepted reducer (src/animation/dive.ts diveAtAge, its persistent hardwareOrder) is run with the live adapter's profile
// (liveMoveAnimation.ts liveDiveSetupProfile: droplet velocities from words 2i / 2i+1, alternating direction, battler subpriorities) on
// the ROM's own slots, the ROM lend (sSpriteOrder one row before the ball's allocation) and liveBattlerAnchors geometry of the job's
// species. Prediction: the droplet destroy group's order (the last allocation window) = hardwareOrder at the age before it, restricted to
// the destroyed slots. Also with the words of a DIFFERENT body (control: must not match in general).
// usage: node --experimental-strip-types tools/integration/prep61DiveWords.ts <probe-dir> <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { diveAtAge, type DiveProfile } from "../../src/animation/dive.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; windows: Win[]; truncated: boolean; ram: { rng2: string } }
interface Job { units: Unit[]; attackerSide: "player" | "opponent"; ops: (string | number)[][]; base: string }

const [probeDir, unitsPath, outPath] = process.argv.slice(2);
const jobs = (JSON.parse(readFileSync(unitsPath!, "utf8")) as { jobs: Record<string, Job> }).jobs;
const lcg = (x: number) => (Math.imul(x, 1103515245) + 24691) >>> 0;
/** Words drawn on frame n: the LCG outputs from the value before n to the value at n (at most 4096 steps). */
function wordsOnFrame(extra: number[][], n: number): number[] | null {
  let before: number | undefined, at: number | undefined;
  for (const e of extra) { if (e[0]! < n) before = e[4]; if (e[0]! <= n) at = e[4]; }
  if (before === undefined || at === undefined) return null;
  const words: number[] = [];
  for (let v = before, k = 0; v !== at; k++) { if (k > 4096) return null; v = lcg(v); words.push(v >>> 16); }
  return words;
}
/** sSpriteOrder at frame n (the last raw row at or before n). */
function orderAt(rows: unknown[][], n: number): number[] {
  let hex = "";
  for (const r of rows) if ((r[0] as number) <= n) hex = r[2] as string;
  return Array.from({ length: 64 }, (_, i) => parseInt(hex.slice(2 * i, 2 * i + 2), 16));
}
const SPECIES: Record<string, { player: number; opponent: number }> = {
  "mechanic-dive-player-chinchou-opponent-onix": { player: 170, opponent: 95 },
  "mechanic-dive-opponent-chinchou-player-onix": { player: 95, opponent: 170 },
  "prep25-dive-alt-player-lanturn-golem": { player: 171, opponent: 76 },
  "prep25-dive-alt-opponent-lanturn-golem": { player: 76, opponent: 171 },
};

interface Body { plan: string; job: string; side: "player" | "opponent"; start: number; len: number; ballSlot: number; splashSlot: number; dropSlots: number[];
  birthAge: number; destroyAge: number; romDestroy: number[]; words: number[]; seed: number[]; species: { player: number; opponent: number } }
const bodies: Body[] = [];
for (const [name, job] of Object.entries(jobs)) {
  const species = SPECIES[job.base];
  if (species === undefined) continue;
  const raw = JSON.parse(readFileSync(join(probeDir!, "raw", `${name}-A.json`), "utf8")) as { rows: unknown[][]; extra: number[][] };
  job.units.forEach((u, i) => {
    if (u.kind !== "body" || !/^body 291:/.test(u.label) || u.truncated) return;
    const next = job.units[i + 1];
    const w = u.windows;
    // DiveSetUp: ball (window 0), its destroy, the splash + 10 droplets in one window, the splash destroy, then the droplet group.
    if (w.length !== 5 || w[2]!.C.length !== 11) return;
    const birth = w[2]!.f, last = w[4]!;
    const words = wordsOnFrame(raw.extra, birth);
    if (words === null) return;
    bodies.push({ plan: u.plan, job: name, side: job.attackerSide, start: u.frame, len: (next?.frame ?? u.frame) - u.frame, ballSlot: w[0]!.C[0]![0],
      splashSlot: w[2]!.C[0]![0], dropSlots: w[2]!.C.slice(1).map(([s]) => s), birthAge: birth - u.frame, destroyAge: last.f - u.frame,
      romDestroy: last.D, words, seed: orderAt(raw.rows, w[0]!.f - 1), species });
  });
}

function predict(b: Body, words: readonly number[]): number[] | string {
  const art = createBattleCommandFieldArtView({ player: { species: b.species.player }, opponent: { species: b.species.opponent } } as never);
  const foe = b.side === "player" ? "opponent" as const : "player" as const;
  const aa = liveBattlerAnchors(b.side, art), ta = liveBattlerAnchors(foe, art);
  const slots = [b.ballSlot, b.splashSlot, ...b.dropSlots];
  const profile: DiveProfile = {
    firstInactiveAge: b.birthAge + 50, attackerSubpriority: b.side === "player" ? 30 : 40, targetSubpriority: b.side === "player" ? 40 : 30,
    ball: { slot: b.ballSlot, matrixNum: 0, persistentOrder: 0 }, splash: { slot: b.splashSlot, matrixNum: 0, persistentOrder: 0 },
    droplets: b.dropSlots.map((slot, i) => {
      const v1 = words[2 * i]! & 0x1ff, v2 = words[2 * i + 1]! & 0x7f;
      return { slot, matrixNum: 0, persistentOrder: 0, velocityX: v1 % 2 ? 736 + v1 : 736 - v1, velocityY: v2 % 2 ? 896 + v2 : 896 - v2,
        direction: (i % 2) as 0 | 1 };
    }),
    impacts: [], spriteOrderSeed: b.seed.filter((s) => slots.includes(s)),
  };
  const geometry = { attackerCenter: aa.spriteCenter, targetCenter: ta.spriteCenter, attackerPictureOffset: aa.battlePositionCenter,
    targetPictureOffset: ta.battlePositionCenter, attackerRestOffset: aa.frontIdleRest, targetRestOffset: ta.frontIdleRest,
    attackerBallOffset: { x: aa.battlePositionCenter.x, y: aa.picOffsetPoint.y - 16 } };
  try {
    const order = diveAtAge(b.destroyAge - 1, "setup", b.side, geometry, profile).hardwareOrder;
    return order.filter((s) => b.romDestroy.includes(s));
  } catch (error) { return String(error); }
}

const results = bodies.map((b, k) => {
  // Which 20 of the frame's words are the droplets' (the frame's draws may start with another consumer's): try every 20-word window.
  const fits: number[] = [];
  for (let off = 0; off + 20 <= b.words.length; off++) {
    const p = predict(b, b.words.slice(off, off + 20));
    if (Array.isArray(p) && JSON.stringify(p) === JSON.stringify(b.romDestroy)) fits.push(off);
  }
  const tail = predict(b, b.words.slice(-20));
  const other = bodies[(k + 1) % bodies.length]!;
  const control = predict(b, other.words.slice(-20));
  // The whole plan (production encoding: n0 ball, n1 splash, n2.. droplets in creation order): constant prefix + the predicted group.
  const n = (slot: number) => [b.ballSlot, b.splashSlot, ...b.dropSlots].indexOf(slot);
  const planText = Array.isArray(tail) ? `Cf;D0;C${"f".repeat(11)};D1;D${tail.map(n).join(",")}` : null;
  return { job: b.job, side: b.side, frame: b.start, wordsOnBirthFrame: b.words.length, romDestroy: b.romDestroy,
    predictedLast20: tail, exactLast20: JSON.stringify(tail) === JSON.stringify(b.romDestroy), romPlan: b.plan, predictedPlan: planText,
    planExact: planText === b.plan, fittingOffsets: fits,
    controlOtherBodyWords: { from: other.job, exact: JSON.stringify(control) === JSON.stringify(b.romDestroy) } };
});
writeFileSync(outPath!, JSON.stringify({ schema: "prep61-dive-words/v1", results }, null, 1) + "\n");
for (const r of results) {
  console.log(`${r.job.padEnd(24)} f${r.frame} ${r.side.padEnd(8)} words@birth ${r.wordsOnBirthFrame} ROM D[${r.romDestroy}] last20 ${r.exactLast20 ? "EXACT" : `MISS ${JSON.stringify(r.predictedLast20)}`} fits ${JSON.stringify(r.fittingOffsets)} control ${r.controlOtherBodyWords.exact ? "MATCHES" : "differs"}`);
}
console.log(`${results.filter(r => r.exactLast20).length}/${results.length} Dive setup bodies: droplet destroy order == reducer(RAM words); whole plan text == ROM: ${results.filter(r => r.planExact).length}/${results.length}`);
