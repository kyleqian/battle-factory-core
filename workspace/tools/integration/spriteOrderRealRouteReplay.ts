// Step 2 of the real-route sprite-order validation (docs/sprite-order-real-route.md): replay the production TS plan applier
// (src/engine/spriteOrderProvider.ts) over the events of tools/integration/fixtures/sprite-order-real-route/events/*.json and compare the predicted free
// order F with the ROM-observed F at every move/animation activation edge.  Only the section 2 rule table of docs/sprite-order-gap-causes.md drives the model.
//   run: npx vite-node tools/integration/spriteOrderRealRouteReplay.ts   (writes fixtures/sprite-order-real-route/replay-receipt.json)
// Two modes: strict (an uncovered unit / party menu / unknown plan invalidates for the rest of the trace) and resync (same rules, but after every
// invalidating event the model is re-seeded from the ROM's observed F+occupancy so later edges still test the rule table in isolation).
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, invalidateSpriteOrderState, knownEntrySpriteOrderState, spriteOrderForSlots,
  spriteOrderPlanTableFromFixture, type SpriteOrderPlan, type SpriteOrderPlanCursor, type SpriteOrderState,
} from "../../src/engine/spriteOrderProvider.ts";

const FX = new URL("./fixtures/", import.meta.url);
const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, FX), "utf8"));
const TRACES = ["battle1-turn17-dense", "battle1-switch", "battle1-turn2-dragonbreath", "battle1-grovyle-faint", "battle1-victory"];
const plans = spriteOrderPlanTableFromFixture(read("sprite-order-body-plans.json"));
const anims = read("sprite-order-gap-causes.json").midBattleAnimations.anims as Record<string, { verdict: string; plan: SpriteOrderPlan; args: string[] }>;

const PROMPT_PLAN: SpriteOrderPlan = [{ C: [["n", 0, "f"], ["n", 1, "f"]] }, { D: [["n", 0], ["n", 1]], pw: [782, 782] }];
const BLIP_PLAN: SpriteOrderPlan = [{ C: [["n", 0, "f"]] }, { D: [["n", 0]] }];
const CARRY_PLAN: SpriteOrderPlan = [{ D: [["c", 1, 0]] }];
const CARRY_SHAPE = JSON.stringify(CARRY_PLAN);
const GENERAL = new Map<number, string>([[7, "HELD_ITEM_EFFECT"], [11, "SUN_CONTINUES"], [13, "HAIL_CONTINUES"], [6, "TURN_TRAP"], [20, "FOCUS_PUNCH_SETUP"]]);
const STATUS = new Map<number, string>([[0, "PSN"], [1, "CONFUSION"], [2, "BRN"], [3, "INFATUATION"], [4, "SLP"], [5, "PRZ"], [6, "FRZ"], [7, "CURSE"], [8, "NIGHTMARE"]]);

function animKey(table: string, id: number, arg: number | null): string | null {
  if (table === "gBattleAnims_General") {
    if (id === 1) {
      const hit = Object.entries(anims).find(([key, v]) => key.startsWith("General:B_ANIM_STATS_CHANGE") && arg !== null && v.args.includes(String(arg)));
      return hit ? hit[0] : null;
    }
    const name = GENERAL.get(id);
    return name ? `General:B_ANIM_${name}` : null;
  }
  if (table === "gBattleAnims_StatusConditions") {
    const name = STATUS.get(id);
    return name ? `Status:B_ANIM_STATUS_${name}` : null;
  }
  return null;
}

interface Ev { n: number; k: string; [key: string]: unknown }
const head = (free: readonly number[], n = 24) => free.slice(0, n);
const maskSlots = (mask: string) => { const m = BigInt("0x" + mask); return Array.from({ length: 64 }, (_, s) => s).filter(s => (m >> BigInt(s)) & 1n); };
const freeFromOccupied = (occupied: number[], observedFree: number[]) => observedFree.filter(s => !occupied.includes(s));
const seed = (free: number[], occupied: number[]): SpriteOrderPlanCursor =>
  createSpriteOrderPlanCursor({ known: true, free, pendingDestroyed: [] } as SpriteOrderState, occupied);

interface Edge { frame: number; kind: string; move?: number; side?: string; attacker: number; anim?: string; known: boolean; exact: boolean | null; occupiedMatch: boolean | null;
  consumerOrderExact: boolean | null; trivial: boolean; observedFHead: number[]; predictedFHead: number[] | null; observedFFull?: number[]; predictedFFull?: number[] | null; unitsSincePrevEdge: string[] }

type Mode = "strict" | "resync" | "learned";
const eq = (a: readonly number[] | null | undefined, b: readonly number[] | null | undefined) => JSON.stringify(a) === JSON.stringify(b);
/** Net transform of one unit from ROM states: F_post = prefix ++ (F_pre without prefix/survivors); plan-lite with concrete tokens. Null if not of that form. */
function netPlan(preFree: number[], preOcc: number[], postFree: number[], postOcc: number[]): { plan: SpriteOrderPlan; prefix: number[]; survivors: number[] } | null {
  const survivors = postOcc.filter(s => !preOcc.includes(s));
  for (let j = 0; j <= postFree.length; j++) {
    const prefix = postFree.slice(0, j);
    if (preOcc.some(s => !postOcc.includes(s) && !prefix.includes(s))) continue;
    if (!eq(preFree.filter(s => !prefix.includes(s) && !survivors.includes(s)), postFree.slice(j).filter(s => !preOcc.includes(s) || postFree.slice(j).includes(s)))) continue;
    const created = [...new Set([...survivors, ...prefix.filter(s => preFree.includes(s))])].sort((a, b) => a - b);
    const win: { C?: [string, number, string][]; D?: [string, ...number[]][] }[] = [];
    if (created.length) win.push({ C: created.map((_, k) => ["n", k, "f"]) });
    if (prefix.length) win.push({ D: prefix.map(s => created.includes(s) ? ["n", created.indexOf(s)] : ["o", s]) });
    return { plan: win as unknown as SpriteOrderPlan, prefix, survivors };
  }
  return null;
}
const learnedNets = new Map<string, { plan: SpriteOrderPlan; src: string }>();

function replay(trace: string, mode: Mode) {
  const doc = read(`sprite-order-real-route/events/${trace}.json`);
  const events: Ev[] = doc.events;
  let cursor = createSpriteOrderPlanCursor(knownEntrySpriteOrderState("ordinary-factory"));
  // The probe's rows start at battle ResetSpriteData; the model starts at the known entry stream's end (== first-prompt state), so only events after the
  // entry (first prompt) are applied: the entry clusters (BeginBattleIntro ... Intro_TryShinyAnimShowHealthbox) are the known-entry constant.
  const entryEnd = events.find(e => e.k === "prompt" || e.k === "body" || e.k === "anim")!.n;
  const edges: Edge[] = [];
  const bodyChecks: { frame: number; unit: string; source: string; exact: boolean; occupiedMatch: boolean; observedFHead: number[]; predictedFHead: number[] }[] = [];
  const invalidations: { frame: number; reason: string; event: string }[] = [];
  let sinceEdge: string[] = [];
  const apply = (e: Ev, plan: SpriteOrderPlan | null | undefined, label: string) => {
    const before = cursor.order.known;
    cursor = applySpriteOrderUnitPlan(cursor, plan);
    sinceEdge.push(`${e.n}:${label}${cursor.order.known ? "" : "!"}`);
    if (before && !cursor.order.known) invalidations.push({ frame: e.n, reason: plan ? "plan did not resolve against allocator occupancy" : "no EXACT-PLAN for key", event: label });
  };
  const invalidate = (e: Ev, reason: string, label: string) => {
    if (cursor.order.known) invalidations.push({ frame: e.n, reason, event: label });
    cursor = { ...cursor, order: invalidateSpriteOrderState(cursor.order) };
    sinceEdge.push(`${e.n}:${label}!`);
  };
  let seededFromPre: Ev | null = null; // the event whose own pre-state seeded the model (its edge is then trivially exact)
  const resync = (e: Ev, free: number[], mask: string, pre?: Ev) => { seededFromPre = pre ?? null; cursor = seed(free, maskSlots(mask)); sinceEdge.push(`${e.n}:resync`); };
  const carry = (e: Ev, plan: SpriteOrderPlan, key: string) => {
    // a unit that leaves survivors (+-2 stat animation; Dive-class bodies) has its carried destroy land before any other allocation
    if ((cursor.survivors[cursor.units - 1] ?? []).length > 0) apply(e, key === "gap" ? plan : CARRY_PLAN, "carry-destroy");
  };
  for (let i = 0; i < events.length; i++) {
    const e = events[i]!;
    if (e.n <= entryEnd && e.k === "uncovered") continue; // known entry stream
    if (e.k === "prompt") apply(e, PROMPT_PLAN, "prompt");
    else if (e.k === "blip") apply(e, BLIP_PLAN, "blip");
    else if (e.k === "body" || e.k === "anim") {
      const isBody = e.k === "body";
      const key = isBody ? `${e.move}:${e.side}` : animKey(e.table as string, e.id as number, e.arg as number | null);
      const observedFree = e.obsF as number[];
      const observedOcc = maskSlots(e.obsMask as string);
      const known = cursor.order.known;
      const predicted = known ? [...cursor.order.free] : null;
      const slots = known ? cursor.order.free.length ? Array.from({ length: 64 }, (_, s) => s).filter(s => cursor.order.free.includes(s)).slice(0, 8) : [] : [];
      const consumer = known ? spriteOrderForSlots(cursor.order, slots) : null;
      edges.push({
        frame: e.n, kind: isBody ? "move" : "anim", ...(isBody ? { move: e.move as number, side: e.side as string } : { anim: key ?? `${e.table}:${e.id}:${e.arg}` }), attacker: e.attacker as number,
        known, trivial: seededFromPre === e, exact: known ? JSON.stringify(predicted) === JSON.stringify(observedFree) : null,
        occupiedMatch: known ? JSON.stringify(cursor.occupied) === JSON.stringify(observedOcc) : null,
        consumerOrderExact: consumer ? JSON.stringify(consumer) === JSON.stringify(observedFree.filter(s => slots.includes(s))) : null,
        observedFHead: head(observedFree), predictedFHead: predicted ? head(predicted) : null, observedFFull: observedFree, predictedFFull: predicted, unitsSincePrevEdge: sinceEdge,
      });
      sinceEdge = [];
      if (mode !== "strict" && !known) { resync(e, observedFree, e.obsMask as string); }
      const tablePlan = isBody ? plans.bodies.get(key!) : key ? (anims[key]?.verdict === "EXACT-PLAN" ? anims[key]!.plan : null) : null;
      const learnKey = `${isBody ? "body" : "anim"}:${key}`;
      const learned = mode === "learned" && !tablePlan ? learnedNets.get(learnKey) : undefined;
      const source = tablePlan ? "table" : learned ? `learned@${learned.src}` : "none";
      const nx = events[i + 1];
      apply(e, tablePlan ?? learned?.plan, learnKey);
      if (mode === "learned" && !tablePlan && !learned && nx) {
        const net = netPlan(observedFree, observedOcc, nx.preF as number[], maskSlots(nx.preMask as string));
        if (net) learnedNets.set(learnKey, { plan: net.plan, src: `${trace}:${e.n}` });
      }
      // resync/learned mode: a body/animation without a usable plan leaves the order unknown; re-seed from the ROM state just before the next event
      if (mode !== "strict" && !cursor.order.known && nx) { resync(nx, nx.preF as number[], nx.preMask as string, nx); }
      if (isBody) {
        const after = plans.gapAfterBody.get(key!);
        if (after && JSON.stringify(after) === CARRY_SHAPE) carry(e, after, "gap");
      } else carry(e, CARRY_PLAN, "anim");
      if (source !== "none" && cursor.order.known && nx) {
        // body-level check: predicted F right after the unit vs the ROM state just before the next event (the unit is complete by then)
        bodyChecks.push({ frame: e.n, unit: learnKey, source, exact: eq(cursor.order.free, nx.preF as number[]), occupiedMatch: eq(cursor.occupied, maskSlots(nx.preMask as string)),
          observedFHead: head(nx.preF as number[]), predictedFHead: head(cursor.order.free) });
      }
      // a learned (non-table) net must not cascade into later table checks: re-seed from the observed post-state
      if (source.startsWith("learned") && nx) resync(nx, nx.preF as number[], nx.preMask as string, nx);
    } else if (e.k === "reset") invalidate(e, "party menu / battle reshow ResetSpriteData-class (all sprites freed)", "reset");
    else if (e.k === "prompt-unterminated") invalidate(e, "prompt bounce pair never ended inside the trace (truncated or interrupted)", "prompt-unterminated");
    else if (e.k === "uncovered") {
      invalidate(e, `uncovered unit class: ${String(e.klass).slice(0, 120)}`, "uncovered");
      if (mode !== "strict") resync({ ...e, n: e.last as number } as Ev, e.obsF as number[], e.obsMask as string);
    }
  }
  const mv = edges.filter(x => x.kind === "move");
  const stat = (list: Edge[]) => ({ edges: list.length, known: list.filter(x => x.known).length, trivialSeeded: list.filter(x => x.known && x.trivial).length,
    tested: list.filter(x => x.known && !x.trivial).length, exact: list.filter(x => x.exact === true && !x.trivial).length,
    mismatched: list.filter(x => x.exact === false && !x.trivial).length, occupiedMismatch: list.filter(x => x.occupiedMatch === false && !x.trivial).length,
    consumerOrderMismatch: list.filter(x => x.consumerOrderExact === false && !x.trivial).length });
  const bc = (src: (x: string) => boolean) => { const l = bodyChecks.filter(x => src(x.source)); return { checks: l.length, exact: l.filter(x => x.exact).length, mismatched: l.filter(x => !x.exact).length, occupiedMismatch: l.filter(x => !x.occupiedMatch).length }; };
  return { trace, mode, moveEdges: stat(mv), animEdges: stat(edges.filter(x => x.kind === "anim")), bodyLevel: { table: bc(x => x === "table"), learned: bc(x => x.startsWith("learned")) },
    invalidations, bodyChecks, edges };
}

const out: unknown[] = [];
for (const trace of TRACES) for (const mode of ["strict", "resync", "learned"] as const) out.push(replay(trace, mode));
writeFileSync(new URL("sprite-order-real-route/replay-receipt.json", FX), JSON.stringify({
  schema: "sprite-order-real-route-replay/v1", model: "TS applier src/engine/spriteOrderProvider.ts (spriteOrderPlanTableFromFixture/createSpriteOrderPlanCursor/applySpriteOrderUnitPlan) driven by recorded events",
  planFixtures: ["tools/integration/fixtures/sprite-order-body-plans.json", "tools/integration/fixtures/sprite-order-gap-causes.json (midBattleAnimations)"], results: out,
}, null, 0) + "\n");
for (const r of out as ReturnType<typeof replay>[]) console.log(r.trace, r.mode, JSON.stringify(r.moveEdges), "anim", JSON.stringify(r.animEdges), "body", JSON.stringify(r.bodyLevel), "inval", r.invalidations.length);
