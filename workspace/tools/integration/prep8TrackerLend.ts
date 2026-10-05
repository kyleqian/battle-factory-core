// prep8: the PRODUCTION order host's lent order (spriteOrderEventTransform.ts: createSpriteOrderTracker(knownEntrySpriteOrderState) + action-prompt/actions-committed + the scenario's bodies as move-animation events, hit-animation after a damaging body,
// spriteOrderTrackerLend at each body's activation edge) against the observed free order of the same lab run (fixtures/prep8-raw: spriteOrderEventProbe.py per-frame sSpriteOrder + occupancy), for every body of the 20 accepted + 6 first-body scenarios.
//   node --experimental-strip-types tools/integration/prep8TrackerLend.ts > tools/integration/fixtures/prep8-tracker-lend.json
import { readFileSync, readdirSync } from "node:fs";
import { createSpriteOrderTracker, applySpriteOrderPresentationEvent, spriteOrderTrackerLend, type SpriteOrderPresentationEvent } from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState, spriteOrderForSlots, spriteOrderWithOccupiedPrefix, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
const FX = "tools/integration/fixtures";
const MV: Record<string, number> = { "aurora-beam": 62, frustration: 218, "horn-drill": 32, "seismic-toss": 69, stockpile: 254, swift: 129, thunderbolt: 85, trick: 271, uproar: 253, "zap-cannon": 192 };
const rd = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const acc = rd(`${FX}/prep8-accepted-configs.json`);
const out: any[] = [];
for (const f of readdirSync(`${FX}/prep8-raw`).filter((x) => x.endsWith(".json")).sort()) {
  const name = f.replace(/\.json$/, ""), key = Object.keys(MV).find((k) => name.startsWith(k))!, mv = MV[key]!, atkSide = name.includes("-player") ? "player" : "opponent", firstbody = name.includes("-fb-");
  const d = rd(`${FX}/prep8-raw/${f}`); const rows = (d.rows as any[]).map((r) => ({ n: r[0], order: [...Buffer.from(r[2], "hex")], mask: BigInt("0x" + r[3]), act: r[4], mv: r[5] }));
  const at = (n: number) => { let best = rows[0]!; for (const r of rows) if (r.n <= n) best = r; else break; return best; };
  // activation rising edges after the last reset: first frame act true per body
  const rises: { n: number; mv: number }[] = []; let prev = false;
  for (const r of rows) { if (r.act && !prev) rises.push({ n: r.n, mv: r.mv }); prev = r.act; }
  const bodies = rises.filter((r) => r.mv !== 0).slice(0, 3);
  let tracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  tracker = applySpriteOrderPresentationEvent(tracker, { kind: "action-prompt" }); tracker = applySpriteOrderPresentationEvent(tracker, { kind: "actions-committed" });
  const per: any[] = [];
  for (const [i, b] of bodies.entries()) {
    const edge = at(b.n - 1), freeObs = edge.order.filter((s: number) => !(edge.mask >> BigInt(s) & 1n));
    const lent = spriteOrderTrackerLend(tracker);
    const o = atkSide === "player" ? "player-back" : "opponent-front", cfg = acc[`${key.toUpperCase().replace(/-/g, "_")}/${o}`]?.config, P = cfg?.animationProfile ?? {};
    let literal: any = null;
    if (lent && b.mv === mv && !firstbody && Array.isArray(P.spriteOrderSeed)) { const seed = P.spriteOrderSeed as number[]; const derived = seed.length === 64 ? [...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, ...lent] : lent.filter((s) => seed.includes(s)); literal = { field: "animationProfile.spriteOrderSeed", length: seed.length, accepted: seed.length === 64 ? seed.slice(0, 20) : seed, lentDerived: seed.length === 64 ? derived.slice(0, 20) : derived, equal: JSON.stringify(seed) === JSON.stringify(derived) }; }
    per.push({ body: i, acceptedLiteralVsLent: literal, moveId: b.mv, riseFrame: b.n, lentKnown: lent !== null, lentEqualsObservedFree: lent ? JSON.stringify(lent) === JSON.stringify(freeObs) : null, observedFreeHead: freeObs.slice(0, 8), lentHead: lent ? lent.slice(0, 8) : null,
      observedFull64: edge.order, trackerInvalidReason: tracker.invalidReason });
    const side = b.mv === mv ? atkSide : atkSide === "player" ? "opponent" : "player";
    const ev: SpriteOrderPresentationEvent[] = [{ kind: "move-animation", moveId: b.mv, attackerSide: side as "player" | "opponent" }];
    if (b.mv === 33 || b.mv === 64) ev.push({ kind: "hit-animation", targetVisible: true }); // damaging first body of the staging (Tackle/Peck hit)
    for (const e of ev) tracker = applySpriteOrderPresentationEvent(tracker, e);
  }
  out.push({ file: name, move: mv, attackerSide: atkSide, firstBodyScenario: firstbody, bodies: per.map(({ observedFull64, ...p }) => p) });
}
console.log(JSON.stringify({ schema: "prep8-tracker-lend/v1", note: "hit-animation (target visible) is applied after Tackle/Peck only; other bodies' hit/blip events are not modelled here (the real orchestrator feeds them)", scenarios: out }, null, 1));
