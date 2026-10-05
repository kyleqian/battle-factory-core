// prep9: the PRODUCTION order host's lent order (spriteOrderEventTransform.ts tracker seeded with knownEntrySpriteOrderState("battle-lab-ordinary-singles"), prompt/commit per turn, each earlier body of the
// scenario as a move-animation event (+ hit-animation after a Tackle), spriteOrderTrackerLend at each body's activation edge) vs the observed free order of the same lab run (fixtures/prep9-raw, spriteOrderEventProbe.py),
// for every body of every prep9 scenario; plus the 64-entry provider order for first bodies vs the observed full order.   usage: node --experimental-strip-types tools/integration/prep9TrackerLend.ts > tools/integration/fixtures/prep9-tracker-lend.json
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createSpriteOrderTracker, applySpriteOrderPresentationEvent, spriteOrderTrackerLend, type SpriteOrderPresentationEvent } from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState, spriteOrderWithOccupiedPrefix, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
const FX = "tools/integration/fixtures", rd = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const manifest = rd(`${FX}/prep9-scenarios/manifest.json`) as { name: string; move: number; side: "player" | "opponent" }[];
const alloc = rd(`${FX}/prep9-allocator.json`);
const out: any[] = [];
for (const m of manifest) {
  const f = `${FX}/prep9-raw/${m.name}.json`; if (!existsSync(f)) continue;
  const d = rd(f); const rows = (d.rows as any[]).map((r) => ({ n: r[0], order: [...Buffer.from(r[2], "hex")], mask: BigInt("0x" + r[3]), act: r[4], mv: r[5] }));
  const at = (n: number) => { let best = rows[0]!; for (const r of rows) if (r.n <= n) best = r; else break; return best; };
  const rises: { n: number; mv: number }[] = []; let prev = false;
  for (const r of rows) { if (r.act && !prev) rises.push({ n: r.n, mv: r.mv }); prev = r.act; }
  const bodies = rises.filter((r) => r.mv !== 0);
  const other = m.side === "player" ? "opponent" : "player";
  let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  const per: any[] = []; let lastEnd = -1e9;
  for (const [i, b] of bodies.entries()) {
    // a new turn starts when the gap since the previous body's rise exceeds 250 rendered frames (turn text + end-turn) -- approximation recorded in the output
    const newTurn = i === 0 || b.n - bodies[i - 1]!.n > 250;
    if (newTurn) { tracker = applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" }); tracker = applySpriteOrderPresentationEvent(tracker, { kind: "actions-committed" }); }
    const edge = at(b.n - 1), freeObs = edge.order.filter((s: number) => !(edge.mask >> BigInt(s) & 1n));
    const lent = spriteOrderTrackerLend(tracker);
    const isTarget = b.mv === m.move;
    per.push({ body: i, moveId: b.mv, riseFrame: b.n, newTurn, lentKnown: lent !== null, lentEqualsObservedFree: lent ? JSON.stringify(lent) === JSON.stringify(freeObs) : null, observedFreeHead: freeObs.slice(0, 8), lentHead: lent ? lent.slice(0, 8) : null, trackerInvalidReason: tracker.invalidReason,
      ...(isTarget ? { observedFull64: edge.order, provider64: i === 0 ? spriteOrderWithOccupiedPrefix(knownEntrySpriteOrderState("battle-lab-ordinary-singles"), KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER) : null,
        lend64: lent ? [...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, ...lent] : null,
        restrictedObserved: (alloc.scenarios[m.name]?.slotSet ?? []).length ? edge.order.filter((s: number) => alloc.scenarios[m.name].slotSet.includes(s)) : null,
        restrictedLend: lent && (alloc.scenarios[m.name]?.slotSet ?? []).length ? lent.filter((s) => alloc.scenarios[m.name].slotSet.includes(s)) : null } : {}) });
    const side = b.mv === 33 || b.mv === 45 || b.mv === 64 ? other : m.side;
    const ev: SpriteOrderPresentationEvent[] = [{ kind: "move-animation", moveId: b.mv, attackerSide: side as "player" | "opponent" }];
    if (b.mv === 33) ev.push({ kind: "hit-animation", targetVisible: true });
    for (const e of ev) tracker = applySpriteOrderPresentationEvent(tracker, e);
    if (isTarget) break; void lastEnd;
  }
  const tb = per.find((p) => p.moveId === m.move);
  out.push({ scenario: m.name, move: m.move, attackerSide: m.side, bodies: per.map(({ observedFull64, provider64, lend64, restrictedObserved, restrictedLend, ...p }) => p),
    targetBody: tb ? { riseFrame: tb.riseFrame, precededBy: per.filter((p) => p.body < tb.body).map((p) => p.moveId), lentKnown: tb.lentKnown, lentEqualsObservedFree: tb.lentEqualsObservedFree, firstBody: tb.body === 0,
      provider64EqualsObserved: tb.provider64 ? JSON.stringify(tb.provider64) === JSON.stringify(tb.observedFull64) : null, lend64EqualsObserved: tb.lend64 ? JSON.stringify(tb.lend64) === JSON.stringify(tb.observedFull64) : null,
      restrictedObserved: tb.restrictedObserved, restrictedLend: tb.restrictedLend, restrictedLendEqualsObserved: tb.restrictedLend ? JSON.stringify(tb.restrictedLend) === JSON.stringify(tb.restrictedObserved) : null } : null });
}
console.log(JSON.stringify({ schema: "prep9-tracker-lend/v1", note: "turn boundaries approximated by a >250-frame gap between body rises; hit-animation applied after Tackle only; Growl (45) has no production body plan", scenarios: out }, null, 1));
