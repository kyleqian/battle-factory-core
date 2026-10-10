// land68: the committed Dive 291 vectors for tests/spriteOrderPrep65.test.ts, extracted from prep65's inputs (prep61Probe.py
// --only DIVE,HIDDENHIT, prep61Extract.py units.json; sha256 == fixtures/prep65/units.sha256). Per Dive body: the RAM gRng2Value at the
// activation frame, the words the production tick seam records on a host pinned there (prep65Words.ts / prep65Check.ts hostWords), the ROM
// lend F0, the species, the ROM plan text and allocation windows. Per Dive route: the setup / unleash keys, the hidden window's order events
// (prep65Check.ts's rule) and the ROM unleash lend / the next unit's F0. Read-only use of production.
// usage: node --experimental-strip-types tools/integration/land68DiveVectors.ts <probe-dir> <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { activateLiveMovePresentationRng, liveMovePresentationRngWords, liveMoveRandom2Plan } from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngHostAt } from "../../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import { liveDiveSetupSplashBirth } from "../../src/engine/liveMoveAnimation.ts";
import type { SpriteOrderPresentationEvent } from "../../src/engine/spriteOrderEventTransform.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { attackerSide: "player" | "opponent"; units: Unit[]; identicalAB: boolean; base: string }
// prep65Check.ts SPECIES (the probe bases' species).
const SPECIES: Record<string, { player: number; opponent: number }> = {
  "mechanic-dive-player-chinchou-opponent-onix": { player: 170, opponent: 95 },
  "mechanic-dive-opponent-chinchou-player-onix": { player: 95, opponent: 170 },
  "prep25-dive-alt-player-lanturn-golem": { player: 171, opponent: 76 },
  "prep25-dive-alt-opponent-lanturn-golem": { player: 76, opponent: 171 },
};
const [probeDir, unitsPath, outPath] = process.argv.slice(2);
const jobs = (JSON.parse(readFileSync(unitsPath!, "utf8")) as { jobs: Record<string, Job> }).jobs;
const names = Object.keys(jobs).filter((n) => SPECIES[jobs[n]!.base] !== undefined).sort();

const bodies = names.flatMap((name) => {
  const job = jobs[name]!;
  if (!job.identicalAB) throw new Error(`${name}: A != B`);
  const raw = JSON.parse(readFileSync(join(probeDir!, "raw", `${name}-A.json`), "utf8")) as { extra: number[][] };
  const species = SPECIES[job.base]!;
  return job.units.flatMap((u, index) => {
    const m = /^body (10291|291):(player|opponent)$/.exec(u.label);
    if (u.kind !== "body" || m === null || u.truncated) return [];
    const turn = m[1] === "10291" ? 1 : 0, side = m[2] as "player" | "opponent";
    const ramAt = raw.extra.find((e) => e[0] === u.frame)?.[4];
    if (ramAt === undefined) throw new Error(`${name} f${u.frame}: no RAM gRng2Value`);
    const request = { moveId: 291, turn, attacker: side === "player" ? 0 : 1 };
    const field = { player: { species: species.player }, opponent: { species: species.opponent } } as never;
    const context = turn === 0 ? { diveSetupSplashBirth: liveDiveSetupSplashBirth(field, side) } : undefined;
    if (liveMoveRandom2Plan(request, context) === null) throw new Error(`${name} f${u.frame}: no Random2 plan`);
    const key = `${name}:${u.frame}`;
    const words = liveMovePresentationRngWords({ key,
      host: activateLiveMovePresentationRng(createPresentationRngHostAt(createPresentationRngState(ramAt, "pinned")), request, key, context) });
    if (words === null) throw new Error(`${key}: no words`);
    return [{ job: name, index, key, label: u.label, frame: u.frame, turn, side, species, ramAt, words: { words: words.words, draws: words.draws },
      F0: u.F0, plan: u.plan, strayFChanges: u.strayFChanges, windows: u.windows.map((w) => ({ C: w.C.map(([slot]) => slot), D: w.D, F: w.F })) }];
  });
});
const routes = names.flatMap((name) => {
  const us = jobs[name]!.units;
  const s = bodies.find((b) => b.job === name && b.turn === 0), e = bodies.find((b) => b.job === name && b.turn === 1);
  if (s === undefined || e === undefined || e.index < s.index) return [];
  const units: SpriteOrderPresentationEvent[] = [];
  for (const u of us.slice(s.index + 1, e.index)) {
    if (u.kind === "body") {
      const [mv, side] = u.label.slice(5).split(":");
      units.push({ kind: "move-animation", moveId: Number(mv), attackerSide: side as "player" | "opponent" }, { kind: "hit-animation", targetVisible: false });
    } else if (u.windows.length > 0) {
      units.push({ kind: "action-prompt" }, { kind: "actions-committed" });
    }
  }
  const next = us.slice(e.index + 1).find((u) => u.F0 !== undefined && u.F0.length > 0) ?? null;
  return [{ job: name, side: s.side, species: s.species, setupKey: s.key, unleashKey: e.key, setupF0: s.F0, units, unleashF0: e.F0,
    next: next === null ? null : { label: next.label, frame: next.frame, F0: next.F0 } }];
});
writeFileSync(outPath!, JSON.stringify({ schema: "land68-dive-vectors/v1",
  source: "prep61Probe.py --jobs 12 --only DIVE,HIDDENHIT (two fresh direct-mGBA runs per job, A == B); prep61Extract.py units.json sha256 eaef2df59adb90cb6fcf6f81ba14f0ee65cafcc1107fc907f33272402bfdab1d",
  bodies: bodies.map(({ index: _i, ...b }) => b), routes }) + "\n");
console.log(`${bodies.length} bodies (${bodies.filter((b) => b.turn === 0).length} setup / ${bodies.filter((b) => b.turn === 1).length} unleash), ${routes.length} routes`);
