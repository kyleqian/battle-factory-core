// S10A policy gaps: what the PLAYABLE engine emits (current HEAD) for (a) the stat-changing moves' first bodies on generated Factory routes and
// (b) battle-start Intimidate; and whether the live order host keeps the order known across them.
//   run: node --experimental-strip-types tools/integration/spriteOrderPolicyGapsEngine.ts [--write]   (fixtures/sprite-order-policy-gaps/engine-evidence.json)
import { readFileSync, writeFileSync } from "node:fs";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import { initializeFreshFactoryBattle } from "../../src/engine/factoryBattleStart.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import type { BattleScriptPartyState } from "../../src/engine/battleScriptRulesContext.ts";
import { prep7Replay } from "./prep7Replay.ts";

const GAPS = new URL("./fixtures/sprite-order-policy-gaps/", import.meta.url);
const natureByName = new Map(naturesData.natures.map(row => [row.name, row.index]));
const member = (setId: number, abilitySlot: 0 | 1 = 0) => createFactoryCorpusPartyMember({
  setId, personality: natureByName.get((frontierMonsData.entries[setId] as { nature: string }).nature)!, fixedIv: 3, abilitySlot });
const party = (active: number, slot: 0 | 1 = 0) => Object.freeze([member(active, slot), member(300), member(301), member(302), member(303), member(304)]) as unknown as BattleScriptPartyState;

const out: Record<string, any> = { schema: "sprite-order-policy-gaps-engine/v1" };
// (b) battle-start Intimidate (set 53 = Ekans, ability slot 0 = Intimidate)
const start = (label: string, playerParty: BattleScriptPartyState, opponentParty: BattleScriptPartyState) => {
  const r = initializeFreshFactoryBattle({ requestId: 1, rngSeed: 3, battleScene: "on", playerParty, opponentParty });
  return { label, nextEventSequence: r.state.nextEventSequence, events: r.events.map(e => ({ sequence: e.sequence, kind: e.payload.kind, opcode: e.provenance?.opcodeName ?? null,
    ...(e.payload.kind === "animation" ? { animationId: (e.payload as any).animationId, arguments: (e.payload as any).arguments, battler: (e.payload as any).battler } : {}),
    ...(e.payload.kind === "stat-stage-change" ? { battler: (e.payload as any).battler, stat: (e.payload as any).stat, from: (e.payload as any).from, to: (e.payload as any).to } : {}) })) };
};
out.battleStart = [start("player Ekans (Intimidate) vs set 300", party(53, 0), party(300)), start("opponent Ekans (Intimidate) vs set 300", party(300), party(53, 0)),
  start("both Intimidate (Ekans vs Ekans)", party(53, 0), party(53, 0)), start("no Intimidate", party(300), party(301))];
// (a) generated routes: first-body stat moves (seeds from the committed prep7 opponent route scan)
const hits = (JSON.parse(readFileSync(new URL("../prep7-opponent-routes-0.json", GAPS), "utf8")).hits as { seed: number; move: string; firstBody: boolean; orderInputKnown: boolean }[])
  .filter(h => ["DOUBLE_TEAM", "FAKE_TEARS", "FEATHER_DANCE"].includes(h.move));
out.routes = hits.map(h => {
  const rep: any = prep7Replay(h.seed, "on", [0], 0, true);
  const first = rep.requests[0];
  const q = rep.requests.find((r: any) => r.attacker === 1 && r.moveId === ({ DOUBLE_TEAM: 104, FAKE_TEARS: 313, FEATHER_DANCE: 297 } as any)[h.move]);
  const window = rep.semanticEvents.filter((s: any) => s.event.payload.kind === "stat-stage-change" || s.event.payload.kind === "animation").slice(0, 4)
    .map((s: any) => `${s.event.sequence}:${s.event.payload.kind}${s.event.payload.animationId ? `:${s.event.payload.animationId}` : ""}:${s.event.provenance?.opcodeName}`);
  return { seed: h.seed, move: h.move, prep7ScanFirstBody: h.firstBody, prep7ScanOrderInputKnown: h.orderInputKnown, nowFirstRequest: first ? [first.moveId, first.attacker, first.orderInput?.known ?? false] : null,
    nowMoveRequestOrderKnown: q ? (q.orderInput?.known ?? false) : null, requestsKnown: rep.requests.map((r: any) => r.orderInput?.known ?? false), eventWindow: window };
});
const rows = out.routes as any[];
out.routeSummary = { routes: rows.length, firstBodyRoutes: rows.filter(r => r.prep7ScanFirstBody).length,
  firstBodyKnownNow: rows.filter(r => r.prep7ScanFirstBody && r.nowMoveRequestOrderKnown).length, firstBodyKnownInPrep7Scan: rows.filter(r => r.prep7ScanFirstBody && r.prep7ScanOrderInputKnown).length };
console.log(JSON.stringify(out.routeSummary), "\n", JSON.stringify(out.battleStart.map((b: any) => [b.label, b.nextEventSequence, b.events.map((e: any) => `${e.sequence}:${e.kind}${e.animationId ? ":" + e.animationId + ":" + e.arguments : ""}`)])));
if (process.argv.includes("--write")) writeFileSync(new URL("engine-evidence.json", GAPS), `${JSON.stringify(out, null, 1)}\n`);
