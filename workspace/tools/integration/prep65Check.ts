// prep65 (2): the TEMPORARY Dive words-unit patch (fixtures/prep65/prep65-temp-src.diff) checked against the ROM. Run with the patch applied.
// (a) Per body (every Dive setup `291:<side>` / unleash `10291:<side>` of the prep61 probes): the patched liveDiveWordsPlanText over the
//     body's words as the PRODUCTION tick seam records them (host pinned at the RAM gRng2Value of the activation frame, prep65Words.ts),
//     the ROM lend (F0) and the job's species, must equal the ROM plan text, and prep61Check's per-frame checkUnit (the production cursor
//     through every allocation window: created / destroyed / F == ROM) must pass. Control: another body's words.
// (b) Lend vectors through the production resolveSpriteOrderDeferredLend + liveWordsOrderDeferredCarry + LIVE_WORDS_ORDER_DEFERRED_REPLAY:
//     a setup marker (activation = the ROM setup lend, bodySpecies, turn 0) whose units are the hidden window's order events (a gap with
//     allocation windows = action-prompt + actions-committed; another battler's body = its move-animation, then its hit on the hidden
//     battler = hit-animation targetVisible false) must lend the ROM unleash lend; the nested unleash marker (activation = the setup
//     marker, turn 1) must lend the ROM free order after the unleash body (the next unit's F0). Controls: a species-free marker declines.
// usage: node --experimental-strip-types tools/integration/prep65Check.ts <probe-dir> <units.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { activateLiveMovePresentationRng, liveMovePresentationRngWords, liveMoveRandom2Plan } from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngHostAt, type PresentationRngWords } from "../../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";
import * as live from "../../src/engine/liveMoveAnimation.ts";
import { decodeSpriteOrderPlan, resolveSpriteOrderDeferredLend, type SpriteOrderDeferredLend, type SpriteOrderPresentationEvent } from "../../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../../src/engine/spriteOrderProvider.ts";

interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Unit { kind: string; label: string; frame: number; F0: number[]; truncated: boolean; strayFChanges: number; plan: string; windows: Win[] }
interface Job { attackerSide: "player" | "opponent"; units: Unit[]; identicalAB: boolean; base: string }
const planText = (live as unknown as { liveDiveWordsPlanText?: typeof live.liveDiveWordsPlanText }).liveDiveWordsPlanText;
if (planText === undefined) throw new Error("liveDiveWordsPlanText missing: apply fixtures/prep65/prep65-temp-src.diff first");
const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// prep61Check.ts checkUnit (copied: that script runs at import).
function checkUnit(unit: Unit, text: string) {
  const plan = decodeSpriteOrderPlan(text);
  const start = createSpriteOrderPlanCursor({ known: true, free: unit.F0, pendingDestroyed: [] });
  const problems: string[] = [];
  if (unit.windows.length !== plan.length) problems.push(`window count ${unit.windows.length} != plan ${plan.length}`);
  if (unit.strayFChanges !== 0) problems.push(`${unit.strayFChanges} F changes without allocation`);
  let frames = 0, cursor = start;
  for (let k = 0; k < Math.min(plan.length, unit.windows.length); k++) {
    const before = cursor;
    cursor = applySpriteOrderUnitPlan(start, plan.slice(0, k + 1));
    const rom = unit.windows[k]!;
    if (!cursor.order.known) { problems.push(`window ${k} f${rom.f}: plan did not resolve`); break; }
    const created = cursor.occupied.filter(slot => !before.occupied.includes(slot));
    const destroyed = before.occupied.filter(slot => !cursor.occupied.includes(slot));
    const romCreated = rom.C.map(([slot]) => slot).sort((l, r) => l - r);
    const romDestroyed = [...rom.D].sort((l, r) => l - r);
    if (!same(created, romCreated) || !same(destroyed, romDestroyed) || !same(cursor.order.free, rom.F)) {
      problems.push(`window ${k} f${rom.f}: created ${created}/${romCreated} destroyed ${destroyed}/${romDestroyed} F ${same(cursor.order.free, rom.F) ? "==" : "!="}`);
    }
    frames += 1;
  }
  const survivors = cursor.order.known ? cursor.occupied.filter(slot => !start.occupied.includes(slot)) : [];
  if (survivors.length > 0) problems.push(`${survivors.length} survivors`);
  return { problems, frames };
}

const SPECIES: Record<string, { player: number; opponent: number }> = {
  "mechanic-dive-player-chinchou-opponent-onix": { player: 170, opponent: 95 },
  "mechanic-dive-opponent-chinchou-player-onix": { player: 95, opponent: 170 },
  "prep25-dive-alt-player-lanturn-golem": { player: 171, opponent: 76 },
  "prep25-dive-alt-opponent-lanturn-golem": { player: 76, opponent: 171 },
};
const [probeDir, unitsPath, outPath] = process.argv.slice(2);
const jobs = (JSON.parse(readFileSync(unitsPath!, "utf8")) as { jobs: Record<string, Job> }).jobs;
const names = Object.keys(jobs).filter((n) => SPECIES[jobs[n]!.base] !== undefined).sort();

/** The words the production tick seam records for a Dive body, on a host pinned at the RAM value of its activation frame. */
function hostWords(name: string, u: Unit, turn: number, side: "player" | "opponent"): PresentationRngWords | null {
  const raw = JSON.parse(readFileSync(join(probeDir!, "raw", `${name}-A.json`), "utf8")) as { extra: number[][] };
  const at = raw.extra.find((e) => e[0] === u.frame)?.[4];
  if (at === undefined) return null;
  const species = SPECIES[jobs[name]!.base]!;
  const request = { moveId: 291, turn, attacker: side === "player" ? 0 : 1 };
  const field = { player: { species: species.player }, opponent: { species: species.opponent } } as never;
  const context = turn === 0 ? { diveSetupSplashBirth: live.liveDiveSetupSplashBirth(field, side) } : undefined;
  if (liveMoveRandom2Plan(request, context) === null) return null;
  const key = `prep65:${name}:${u.frame}`;
  return liveMovePresentationRngWords({ key,
    host: activateLiveMovePresentationRng(createPresentationRngHostAt(createPresentationRngState(at, "pinned")), request, key, context) });
}

interface BodyRef { name: string; index: number; unit: Unit; turn: number; side: "player" | "opponent"; words: PresentationRngWords | null }
const bodies: BodyRef[] = [];
for (const name of names) {
  const job = jobs[name]!;
  if (!job.identicalAB) throw new Error(`${name}: A != B`);
  job.units.forEach((u, index) => {
    const m = /^body (10291|291):(player|opponent)$/.exec(u.label);
    if (u.kind !== "body" || m === null || u.truncated) return;
    const turn = m[1] === "10291" ? 1 : 0, side = m[2] as "player" | "opponent";
    bodies.push({ name, index, unit: u, turn, side, words: hostWords(name, u, turn, side) });
  });
}
const perBody = bodies.map((b, k) => {
  const species = SPECIES[jobs[b.name]!.base]!;
  const text = planText(b.turn, b.side, b.unit.F0, b.words, species);
  const r = text === null ? { problems: ["no plan text"], frames: 0 } : checkUnit(b.unit, text);
  const other = bodies.slice(k + 1).concat(bodies.slice(0, k)).find((o) => o.turn === b.turn && o.side === b.side) ?? null;
  const control = other === null ? null : planText(b.turn, b.side, b.unit.F0, other.words, species);
  return { job: b.name, label: b.unit.label, frame: b.unit.frame, planEqualsRom: text === b.unit.plan, perFrameExact: r.problems.length === 0,
    allocationFrames: r.frames, problems: r.problems, controlOtherWords: other === null ? null : { from: `${other.name}@${other.unit.frame}`, planEqualsRom: control === b.unit.plan } };
});

// (b) lend vectors
const carry = live.liveWordsOrderDeferredCarry((key) => bodies.find((b) => `${b.name}:${b.unit.frame}` === key)?.words ?? null,
  { player: { x: 0, y: 0 }, opponent: { x: 0, y: 0 } });
const vectors = names.flatMap((name) => {
  const job = jobs[name]!, us = job.units, species = SPECIES[job.base]!;
  const s = bodies.find((b) => b.name === name && b.turn === 0), e = bodies.find((b) => b.name === name && b.turn === 1);
  if (s === undefined || e === undefined || e.index < s.index) return [];
  const units: SpriteOrderPresentationEvent[] = [];
  const applied: string[] = [];
  for (const u of us.slice(s.index + 1, e.index)) {
    if (u.kind === "body") {
      const [mv, side] = u.label.slice(5).split(":");
      units.push({ kind: "move-animation", moveId: Number(mv), attackerSide: side as "player" | "opponent" }, { kind: "hit-animation", targetVisible: false });
      applied.push(`${u.label} + hidden hit`);
    } else if (u.windows.length > 0) {
      units.push({ kind: "action-prompt" }, { kind: "actions-committed" });
      applied.push("prompt cycle");
    }
  }
  const setupMarker: SpriteOrderDeferredLend = { key: `${name}:${s.unit.frame}`, moveId: 291, attackerSide: s.side, turn: 0, bodySpecies: species,
    activation: { free: s.unit.F0 }, units };
  const unleashMarker: SpriteOrderDeferredLend = { key: `${name}:${e.unit.frame}`, moveId: 291, attackerSide: e.side, turn: 1, bodySpecies: species,
    activation: { deferred: setupMarker }, units: [] };
  const next = us.slice(e.index + 1).find((u) => u.F0 !== undefined && u.F0.length > 0);
  const lendAtUnleash = resolveSpriteOrderDeferredLend(setupMarker, carry, live.LIVE_WORDS_ORDER_DEFERRED_REPLAY);
  const lendAfterUnleash = resolveSpriteOrderDeferredLend(unleashMarker, carry, live.LIVE_WORDS_ORDER_DEFERRED_REPLAY);
  const { bodySpecies: _s, ...speciesFree } = setupMarker;
  const controlSpeciesFree = resolveSpriteOrderDeferredLend(speciesFree, carry, live.LIVE_WORDS_ORDER_DEFERRED_REPLAY);
  return [{ job: name, side: s.side, hiddenWindow: applied,
    unleashLendEqualsRom: lendAtUnleash !== null && same(lendAtUnleash, e.unit.F0),
    postUnleashEqualsRom: next === undefined ? null : lendAfterUnleash !== null && same(lendAfterUnleash, next.F0),
    postUnleashAgainst: next === undefined ? null : `${next.label}@f${next.frame}`, controlSpeciesFreeDeclines: controlSpeciesFree === null }];
});
const summary = {
  bodies: perBody.length, planEqualsRom: perBody.filter((b) => b.planEqualsRom).length, perFrameExact: perBody.filter((b) => b.perFrameExact).length,
  allocationFrames: perBody.reduce((n, b) => n + b.allocationFrames, 0),
  controlOtherWordsEqual: perBody.filter((b) => b.controlOtherWords?.planEqualsRom).length,
  vectors: vectors.length, unleashLendExact: vectors.filter((v) => v.unleashLendEqualsRom).length,
  postUnleash: vectors.filter((v) => v.postUnleashEqualsRom !== null).length, postUnleashExact: vectors.filter((v) => v.postUnleashEqualsRom === true).length,
  speciesFreeDeclines: vectors.filter((v) => v.controlSpeciesFreeDeclines).length,
};
writeFileSync(outPath!, JSON.stringify({ schema: "prep65-dive-patch-check/v1", summary, perBody, vectors }, null, 1) + "\n");
for (const b of perBody) console.log(`${b.job.padEnd(24)} ${b.label.padEnd(20)} f${b.frame} plan ${b.planEqualsRom ? "== ROM" : "DIFF"} per-frame ${b.perFrameExact ? "EXACT" : b.problems.slice(0, 2).join(" | ")} (${b.allocationFrames} windows) control ${b.controlOtherWords?.planEqualsRom ? "MATCHES" : "differs"}`);
for (const v of vectors) console.log(`vector ${v.job.padEnd(24)} [${v.hiddenWindow.join(", ")}] unleash lend ${v.unleashLendEqualsRom ? "== ROM" : "DIFF"} post-unleash ${v.postUnleashEqualsRom === null ? "-" : v.postUnleashEqualsRom ? "== ROM" : "DIFF"} species-free ${v.controlSpeciesFreeDeclines ? "declines" : "RESOLVES"}`);
console.log(JSON.stringify(summary));
