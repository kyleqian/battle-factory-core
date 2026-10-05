// Writes tools/integration/fixtures/order-cross-body-live-receipt.json: evidence of the cross-body sprite-order host
// (A transform + table, B strict real-route / corpus replays, C host == pure transform, D later-body consumer routes).
//   run: node --experimental-strip-types tools/integration/orderCrossBodyReceipt.ts '<gates JSON>'
// Gate outcomes / bundle delta / tested commit are passed in (they come from the serialized final gates).
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { REAL_ROUTE_TRACES, replayCrossBodyTrace } from "./spriteOrderCrossBodyReplay.ts";
import { replayCrossBodyCorpus } from "./spriteOrderCrossBodyCorpusReplay.ts";
import { ORDER_CONSUMER_MOVES, findConsumerRoutes, scanRoute } from "./orderCrossBodyRouteScan.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS } from "../../src/engine/spriteOrderProductionPlans.ts";

const git = (args: string) => execSync(`git ${args}`, { encoding: "utf8" }).trim();
const gates = JSON.parse(process.argv[2] ?? "{}");
const table = readFileSync(new URL("../../src/engine/spriteOrderProductionPlans.ts", import.meta.url), "utf8");

const strict = REAL_ROUTE_TRACES.map(trace => {
  const result = replayCrossBodyTrace(trace, "strict");
  return { trace, moveEdges: result.moveEdges, animEdges: result.animEdges, firstInvalidation: result.firstInvalidation,
    knownEdges: result.edges.filter(edge => edge.known).map(edge => ({ frame: edge.frame, kind: edge.kind, key: edge.key, exact: edge.exact })) };
});
const resync = REAL_ROUTE_TRACES.map(trace => {
  const result = replayCrossBodyTrace(trace, "resync");
  return { trace, moveEdges: result.moveEdges, animEdges: result.animEdges };
});
const { otherSamples: _samples, ...corpus } = replayCrossBodyCorpus();

const routeRows = ([
  [12, [1, 3], 215, "Heal Bell player, 2nd body after Faint Attack"],
  [186, [0, 0, 0], 215, "Heal Bell opponent, 5th body"],
  [16, [2, 3], 288, "Grudge player, 3rd body after opponent Light Screen + Spite"],
  [59, [1, 1, 1], 288, "Grudge opponent, 2nd body after Spite"],
  [112, [3, 3], 88, "Rock Throw opponent, 4th body after Agility, Defense Curl, Agility"],
  [16, [1, 3], 288, "DECLINE: Grudge after an unmodelled Confuse Ray body"],
] as const).map(([seed, slots, moveId, label]) => {
  const route = scanRoute(seed, slots as unknown as (0 | 1 | 2 | 3)[]);
  const off = generatedCommandAnimationReplay(seed, "off", slots as unknown as (0 | 1 | 2 | 3)[], 0, true);
  const body = route.bodies.find(row => row.moveId === moveId)!;
  const anim = route.consumers.find(row => row.moveId === moveId)!;
  let rulesEqual = route.on.boundaries.length === off.boundaries.length;
  for (let index = 0; rulesEqual && index < off.boundaries.length; index += 1) {
    const a = route.on.boundaries[index]!, b = off.boundaries[index]!;
    const { hitMarker: am, ...ar } = a.rules.rulesContext;
    const { hitMarker: bm, ...br } = b.rules.rulesContext;
    rulesEqual = JSON.stringify(a.rng) === JSON.stringify(b.rng) && JSON.stringify(ar) === JSON.stringify(br)
      && (am ^ bm) === 0x80 && JSON.stringify(a.boundary) === JSON.stringify(b.boundary);
  }
  return {
    label, seed, streak: 0, slots, consumer: `${ORDER_CONSUMER_MOVES[moveId]} (${moveId})`, side: body.side, bodyIndex: body.index,
    earlierBodies: route.bodies.filter(row => row.index < body.index).map(row => `${row.moveId}:${row.side}`),
    orderKnown: body.known, equalsPureTransform: body.agrees, adapterActiveAges: anim.activeEveryAge ? anim.ages : 0, ages: anim.ages,
    adapterActiveAny: anim.activeAny, endPhase: route.phase, onOffRulesRngBoundariesEqual: rulesEqual,
  };
});
const routes = findConsumerRoutes(200);
const scanSeeds = 200;
let bodies = 0, later = 0, laterKnown = 0, mismatch = 0, hostDeclines = 0, errors = 0;
for (let seed = 0; seed < scanSeeds; seed += 1) {
  let result;
  try { result = scanRoute(seed, [0, 0, 0]); } catch { errors += 1; continue; }
  bodies += result.bodies.length;
  later += result.bodies.filter(body => body.index > 0).length;
  laterKnown += result.bodies.filter(body => body.index > 0 && body.known).length;
  mismatch += result.bodies.filter(body => body.mismatch).length;
  hostDeclines += result.bodies.filter(body => !body.agrees && !body.mismatch).length;
}

const receipt = {
  schema: "order-cross-body-live-receipt/v1",
  claim: "Production tracks the free-slot sSpriteOrder across bodies from the known entry while every unit since is modelled (docs/sprite-order-gap-causes.md section 2); order consumers render as later bodies whenever the tracked order is known and decline otherwise. Presentation-only: rules/RNG/turn order/facility state unchanged. Not whole-playable arbitrary-history framebuffer exactness.",
  testedCode: { commit: gates.testedCommit ?? git("rev-parse HEAD"), srcTree: gates.srcTree ?? git("rev-parse HEAD:workspace/src") },
  api: {
    transform: "src/engine/spriteOrderEventTransform.ts: createSpriteOrderTracker(order), applySpriteOrderPresentationEvent(tracker, event), spriteOrderTrackerLend(tracker), spriteOrderProductionBodyPlan(moveId, side), spriteOrderStatAnimationPlan(arg), spriteOrderStatusAnimationName(isStatus2, status), decodeSpriteOrderPlan(text)",
    events: ["action-prompt", "actions-committed", "move-menu", "move-animation{moveId, attackerSide}", "hit-animation{targetVisible}", "stat-animation{argument}", "status-animation{status}", "general-animation{animation}", "invalidate{reason}"],
    host: "src/engine/liveSpriteOrderHost.ts: createLiveSpriteOrderHost, beginLiveSpriteOrderTurn, advanceLiveSpriteOrderHost, lendLiveSpriteOrder, invalidateLiveSpriteOrderHost",
  },
  productionTable: {
    module: "src/engine/spriteOrderProductionPlans.ts", generator: "tools/integration/spriteOrderProductionTable.ts",
    sources: ["tools/integration/fixtures/sprite-order-body-plans-ext.json (EXACT-PLAN bodies)", "tools/integration/fixtures/sprite-order-gap-causes.json midBattleAnimations (EXACT-PLAN)"],
    bodies: Object.keys(SPRITE_ORDER_PRODUCTION_BODIES).length, distinctPlans: SPRITE_ORDER_PRODUCTION_PLANS.length,
    sourceBytes: Buffer.byteLength(table), pinnedBy: "tests/spriteOrderEventTransform.test.ts (byte-identical regeneration)",
  },
  bundle: gates.bundle ?? null,
  realRouteStrict: strict,
  realRouteResync: resync,
  realRouteNote: "Strict (no resync) from knownEntrySpriteOrderState('ordinary-factory'): previous table knew 1 edge per trace; the ext table + transform know 3 move edges (104:opponent, 157:player, 283:opponent) + 1 stat-animation edge per trace, all exact; the first invalidation is the 283:opponent (Endeavor) body, still NOT-OBSERVED in the plan corpus.",
  corpusReplay: { ...corpus, note: "Gap windows classified by shape (blip / prompt / empty); other gap shapes (mostly prompt pairs unterminated at trace end, carries after unmodelled units) and mv-0 bodies invalidate. spriteOrderBodyPlansExt.py keyed-gap replay: 1366 edges / 1053 exact; the transform knows 1044 (9 later edges sit behind unattributable gaps and are declined, never mispredicted)." },
  hostEqualsPureTransform: { seeds: scanSeeds, slots: [0, 0, 0], errors, bodies, laterBodies: later, laterKnown, mismatch, hostDeclines,
    previousPolicy: "first body only: 0 later bodies known",
    hostDeclinesNote: "seed 43: the retained opponent-locked (Rollout) continuation; the host invalidates (real prompt not modelled), the event-only prediction cannot see that boundary." },
  routes: routeRows,
  consumerRouteScan: { seeds: routes.seeds, leadMonConsumerSeeds: routes.seedsWithConsumer, seedsWithKnownLaterConsumerBody: routes.seedsWithKnownLater,
    laterConsumerBodies: routes.routes.length, known: routes.routes.filter(row => row.known).length,
    knownActiveEveryAge: routes.routes.filter(row => row.known && row.activeEveryAge).length,
    unknownActiveAny: routes.routes.filter(row => !row.known && row.activeAny).length,
    byConsumer: Object.fromEntries(Object.entries(ORDER_CONSUMER_MOVES).map(([id, name]) => [name, {
      laterBodies: routes.routes.filter(row => row.consumer === Number(id)).length,
      known: routes.routes.filter(row => row.consumer === Number(id) && row.known).length }])) },
  invalidations: [
    "move body without an EXACT plan for (move, attacker side) (NEEDS-KEYS / not observed; incl. moves without a live adapter), Substitute 164, Transform 144",
    "status animations other than PSN/PRZ/SLP/INFATUATION; general animations other than HELD_ITEM_EFFECT/SUN_CONTINUES/FOCUS_PUNCH_SETUP; stat args 56/58",
    "faint, switch, switch-in send-out, party status summary draw/hide, trainer slide in/out, battle outcome, return-to-ball recall",
    "a battler hidden by the semi-invulnerable toggle; a hit animation on a hidden target",
    "party menu open (incl. B-cancel) and the presenting-switch-in phase",
    "command resolution without an action prompt (locked player action), retained opponent-locked continuation, resolution not fully applied, drive receipt installed without presentation",
    "battle start with battle-start script events (Intimidate-class entries: not modelled, kept invalid)",
  ],
  denseHarness: gates.dense ?? null,
  gates: gates.gates ?? null,
  commands: [
    "node --experimental-strip-types tools/integration/spriteOrderProductionTable.ts",
    "node --experimental-strip-types tools/integration/orderCrossBodyRouteScan.ts 200 0,0,0",
    "node --experimental-strip-types tools/integration/orderCrossBodyRouteScan.ts routes 200",
    "node --experimental-strip-types tools/integration/spriteOrderCrossBodyCorpusReplay.ts",
    "node --experimental-strip-types tools/integration/orderCrossBodyReceipt.ts '<gates JSON>'",
  ],
};
writeFileSync(new URL("./fixtures/order-cross-body-live-receipt.json", import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ strict: strict.map(row => [row.trace, row.moveEdges.known, row.moveEdges.exact, row.moveEdges.mismatched]), corpus: [corpus.edges, corpus.known, corpus.exact, corpus.mismatched], host: { bodies, later, laterKnown, mismatch, hostDeclines }, routes: routeRows.map(row => [row.label, row.orderKnown, row.adapterActiveAges, row.onOffRulesRngBoundariesEqual, row.endPhase]) }));
