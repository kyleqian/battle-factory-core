import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderProductionBodyPlan,
  spriteOrderStatAnimationPlan, spriteOrderStatusAnimationName, spriteOrderTrackerLend, type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import { SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_BODIES, SPRITE_ORDER_PRODUCTION_PLANS } from "../src/engine/spriteOrderProductionPlans.ts";
import {
  KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";
import { SOURCE_CONFIRMED_ABS_INVARIANT, encodeSpriteOrderPlan, renderSpriteOrderProductionTableFromFixtures } from "../tools/integration/spriteOrderProductionTable.ts";
import { REAL_ROUTE_TRACES, replayCrossBodyTrace } from "../tools/integration/spriteOrderCrossBodyReplay.ts";
import { replayCrossBodyCorpus } from "../tools/integration/spriteOrderCrossBodyCorpusReplay.ts";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../tools/integration/fixtures/${name}`, import.meta.url), "utf8"));
const known = () => createSpriteOrderTracker(knownEntrySpriteOrderState("ordinary-factory"));
const run = (events: readonly SpriteOrderPresentationEvent[]) =>
  events.reduce((tracker, event) => applySpriteOrderPresentationEvent(tracker, event), known());

describe("production sprite-order plan table (generated, pinned)", () => {
  it("regenerates byte-identically from the evidence JSON", () => {
    const committed = readFileSync(new URL("../src/engine/spriteOrderProductionPlans.ts", import.meta.url), "utf8");
    expect(renderSpriteOrderProductionTableFromFixtures()).toBe(committed);
    // + prep43 (fixtures/prep43/plan-rows.json, appended): Dig 91 / 10091, Brick Break 280 / 10280 bodies, 5 plans.
    // + prep45 (fixtures/prep45/plan-rows.json, appended): 15 bodies, 11 plans (BRN's text = STATUS_INFATUATION's, deduped).
    // + plans48 (fixtures/plans48/plan-rows.json, appended): 17 bodies, 7 plans (FRZ / NIGHTMARE / CURSED = "Cf;D0", ITEM_KNOCKOFF = "Cf",
    //   Razor Leaf / Struggle opponent = the 75:player / 165:player texts, Razor Wind's unleash = Leech Seed's text: deduped).
    // + plans51 (fixtures/plans51/plan-rows.json, appended): Outrage 200 both sides + FOCUS_BAND, 2 plans (docs/next-adapters-plans51.md).
    // + plans54 (fixtures/plans54/plan-rows.json, appended): Fury Cutter's counter keys 210 / 10210 / 20210 / 30210 both sides, 8 bodies,
    //   0 plans ("Cf;D0" / "Cff;D1;D0" deduped; docs/next-adapters-plans54.md).
    // + prep61 (fixtures/prep61/plan-rows.json, appended; fly63): Fly 19 / 10019 and Bounce 340 / 10340 both sides, 8 bodies, 0 plans
    //   (all four texts already in the table; docs/next-adapters-prep61.md).
    // + ret80 (fixtures/ret80/plan-rows.json, appended): Return's ReturnStrongest key 30216 both sides, 2 bodies, 1 plan
    //   (docs/ret80-return-order.md).
    // + ret88 (fixtures/ret88/plan-rows.json, appended): Return's ReturnWeak key 40216 both sides, 2 bodies, 1 plan
    //   (docs/ret88-return-weak.md).
    expect(Object.keys(SPRITE_ORDER_PRODUCTION_BODIES)).toHaveLength(554);
    expect(SPRITE_ORDER_PRODUCTION_PLANS).toHaveLength(224);
  });

  it("decodes every EXACT-PLAN (move, side) body of the ext table to the fixture plan", () => {
    const bodies = fixture("sprite-order-body-plans-ext.json").bodies as Record<string, { verdict: string; plan: unknown }>;
    // Rows merged from the policy-gaps relative-y plans and the rely table (confirmed tier + the source-confirmed abs-invariant allowlist) cover keys the ext table leaves non-EXACT.
    const extra: Record<string, { verdict: string; plan: unknown; tier?: string }> = {
      ...fixture("sprite-order-policy-gaps/relative-y-plans.json").bodies, ...fixture("sprite-order-body-plans-rely.json").bodies,
      ...fixture("prep28/plan-rows.json").bodies, ...fixture("prep28/plan-rows-sky-attack.json").bodies,
      ...fixture("prep43/plan-rows.json").bodies, ...fixture("prep45/plan-rows.json").bodies, ...fixture("plans48/plan-rows.json").bodies,
      ...fixture("plans51/plan-rows.json").bodies, ...fixture("plans54/plan-rows.json").bodies, ...fixture("prep61/plan-rows.json").bodies, ...fixture("plans69/plan-rows.json").bodies,
      ...fixture("ret80/plan-rows.json").bodies, ...fixture("ret88/plan-rows.json").bodies,
    };
    // cf78: in-place overrides (Needle Arm 302's SortSprites tie): the fixture plan with an FDERIVED last destroy group (priority words only).
    const overrides = fixture("cf78/plan-overrides.json").bodies as Record<string, { verdict: string; plan: readonly { pw?: unknown }[] }>;
    let exact = 0;
    for (const [key, row] of Object.entries(bodies)) {
      const [move, side] = key.split(":");
      if (side !== "player" && side !== "opponent") continue;
      const plan = spriteOrderProductionBodyPlan(Number(move), side);
      const merged = extra[key] !== undefined && ((extra[key]!.tier ?? "confirmed") === "confirmed" || SOURCE_CONFIRMED_ABS_INVARIANT.has(key)) ? extra[key]! : undefined;
      const override = overrides[key];
      if (override !== undefined) {
        expect(plan, key).toEqual(override.plan);
        expect(override.plan.map(({ pw: _pw, ...window }) => window), key).toEqual(row.verdict === "EXACT-PLAN" ? row.plan : merged!.plan);
        if (row.verdict === "EXACT-PLAN") exact += 1;
        continue;
      }
      if (row.verdict !== "EXACT-PLAN" && merged) {
        expect(plan, key).toEqual(merged.plan);
        continue;
      }
      // Transform (144) hands the battler sprite to another owner: refused. Substitute (164) is order-neutral (no createsprite in
      // Move_SUBSTITUTE; its measured EXACT plan is empty).
      if (row.verdict !== "EXACT-PLAN" || move === "144") {
        expect(plan, key).toBeNull();
        continue;
      }
      exact += 1;
      expect(plan, key).toEqual(row.plan);
      expect(decodeSpriteOrderPlan(encodeSpriteOrderPlan(row.plan as never))).toEqual(row.plan);
    }
    expect(exact).toBe(381);
    expect(spriteOrderProductionBodyPlan(164, "player")).toEqual([]);
    expect(spriteOrderProductionBodyPlan(164, "opponent")).toEqual([]);
  });

  it("stat classes equal every observed per-argument plan; multiple +-2 is class 2 (scf117)", () => {
    const anims = fixture("sprite-order-gap-causes.json").midBattleAnimations.anims as Record<string, { verdict: string; plan: unknown; args: string[] }>;
    for (const [key, row] of Object.entries(anims)) {
      if (!key.startsWith("General:B_ANIM_STATS_CHANGE[")) continue;
      for (const arg of row.args) expect(spriteOrderStatAnimationPlan(Number(arg)), key).toEqual(row.plan);
    }
    // scf117: multiple +-2 (56 / 58) is class 2 (stat101 Memento 58 receipt: Screech's slot rows exactly).
    expect(spriteOrderStatAnimationPlan(56)).toEqual(spriteOrderStatAnimationPlan(47));
    expect(spriteOrderStatAnimationPlan(58)).toEqual(spriteOrderStatAnimationPlan(47));
    expect(spriteOrderStatAnimationPlan(0)).toBeNull();
  });
});

describe("sprite-order presentation-event transform", () => {
  it("prompt cycle is the bounce pair: idempotent at the known entry, move menu is a no-op", () => {
    const after = run([{ kind: "action-prompt" }, { kind: "move-menu" }, { kind: "action-prompt" }, { kind: "actions-committed" }]);
    expect(after.cursor.order.free).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    expect(spriteOrderTrackerLend(after)).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    const open = run([{ kind: "action-prompt" }]);
    expect(open.promptPair).toEqual([3, 4]);
    expect(spriteOrderTrackerLend(open)).toBeNull();
    expect(run([{ kind: "actions-committed" }]).cursor.order.known).toBe(false);
  });

  it("blip and +-1 stat move the lowest free slot to the head; +-2 carries its destroy", () => {
    const head = [3, ...KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER.filter(slot => slot !== 3)];
    expect(run([{ kind: "hit-animation", targetVisible: true }]).cursor.order.free).toEqual(head);
    // prep61 (fly63): the hit on a hidden (semi-invulnerable) battler completes at once (no DoHitAnimHealthboxEffect): known, no allocation.
    const hiddenHit = run([{ kind: "hit-animation", targetVisible: false }]);
    expect(hiddenHit.cursor.order.known).toBe(true);
    expect(hiddenHit.cursor.order.free).toEqual(known().cursor.order.free);
    expect(hiddenHit.cursor.occupied).toEqual(known().cursor.occupied);
    expect(run([{ kind: "stat-animation", argument: 22 }]).cursor.order.free).toEqual(head);
    const plus2 = run([{ kind: "stat-animation", argument: 39 }]);
    expect(plus2.cursor.order.free).toEqual(head);
    expect(plus2.cursor.occupied).toEqual(known().cursor.occupied);
  });

  it("refuses everything the evidence does not model", () => {
    for (const event of [
      { kind: "move-animation", moveId: 351, attackerSide: "player" },
      { kind: "move-animation", moveId: 144, attackerSide: "player" },
      { kind: "status-animation", status: "WRAPPED" },
      { kind: "general-animation", animation: "HAIL_CONTINUES" },
      { kind: "general-animation", animation: "STATUS_SLP" },
      { kind: "invalidate", reason: "faint" },
    ] as const) {
      const after = run([event]);
      expect(after.cursor.order.known, JSON.stringify(event)).toBe(false);
      expect(spriteOrderTrackerLend(after)).toBeNull();
      expect(applySpriteOrderPresentationEvent(after, { kind: "action-prompt" }).cursor.order.known).toBe(false);
    }
  });

  it("applies EXACT bodies exactly like the plan applier and keeps the known-entry occupancy", () => {
    const tracker = run([{ kind: "move-animation", moveId: 104, attackerSide: "opponent" }]);
    const direct = applySpriteOrderUnitPlan(createSpriteOrderPlanCursor(knownEntrySpriteOrderState("ordinary-factory")),
      spriteOrderProductionBodyPlan(104, "opponent"));
    expect(tracker.cursor.order.free).toEqual(direct.order.free);
    expect(spriteOrderTrackerLend(tracker)).toEqual(direct.order.free);
  });

  it("prep43 EXACT plans: CONFUSION, LEECH_SEED_DRAIN, SANDSTORM_CONTINUES (= Sandstorm 201), Dig / Brick Break per choosetwoturnanim branch", () => {
    const rows = fixture("prep43/plan-rows.json") as { bodies: Record<string, { plan: unknown }>; anims: Record<string, { plan: unknown }> };
    const text = (plan: unknown) => encodeSpriteOrderPlan(plan as never);
    const at = (name: string) => SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS[name]!];
    expect(at("STATUS_CONFUSION")).toBe("Cfffff;D1,2,0,3,4");
    expect(at("LEECH_SEED_DRAIN")).toBe("Cf;D0;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;Cf;Cf;D3;D5;D4;D6;D7;D8;Cf;Cf;Cf;D9;Cf;D10;D11;D12");
    expect(at("SANDSTORM_CONTINUES")).toBe(text(spriteOrderProductionBodyPlan(201, "player")));
    expect(SPRITE_ORDER_PRODUCTION_ANIMS.HAIL_CONTINUES).toBeUndefined();
    expect(SPRITE_ORDER_PRODUCTION_ANIMS.RAIN_CONTINUES).toBeUndefined();
    for (const side of ["player", "opponent"] as const) {
      expect(text(spriteOrderProductionBodyPlan(91, side))).toBe("Cff;Cffff;D3,2,5,4;Cffff;D7,6,9,8;Cffff;D11,10,13,12;Cffff;D15,14,17,16;Cffff;D19,18,21,20;D1,0");
      expect(text(spriteOrderProductionBodyPlan(10091, side))).toBe("Cff;Cf;D2;D1,0");
      expect(text(spriteOrderProductionBodyPlan(280, side))).toBe("Cf;Cf/D0;D1;Cf;Cf;D2;D3;Cf;D4;Cff;D5;D6;Cf;D7");
      expect(text(spriteOrderProductionBodyPlan(10280, side))).toBe("Cf;Cf;Cf/D0;D2;Cf;Cf;D3;D4;Cf;D5;Cff;D1;D6;D7;Cffff;D10,11,8,9;Cf;D12");
      expect(spriteOrderProductionBodyPlan(202, side)).toBeNull(); // Giga Drain: species-geometry key (blocked)
    }
    for (const [key, row] of Object.entries(rows.bodies)) {
      const [move, side] = key.split(":") as [string, "player" | "opponent"];
      expect(spriteOrderProductionBodyPlan(Number(move), side), key).toEqual(row.plan);
    }
    // The tracker applies each unit exactly like the plan applier from the known entry and stays known (one survivor at most).
    const direct = (plan: unknown) => applySpriteOrderUnitPlan(createSpriteOrderPlanCursor(knownEntrySpriteOrderState("ordinary-factory")), plan as never);
    for (const [event, plan] of [
      [{ kind: "status-animation", status: "CONFUSION" }, rows.anims["Status:B_ANIM_STATUS_CONFUSION"]!.plan],
      [{ kind: "general-animation", animation: "LEECH_SEED_DRAIN" }, rows.anims["General:B_ANIM_LEECH_SEED_DRAIN"]!.plan],
      [{ kind: "general-animation", animation: "SANDSTORM_CONTINUES" }, rows.anims["General:B_ANIM_SANDSTORM_CONTINUES"]!.plan],
      [{ kind: "move-animation", moveId: 10280, attackerSide: "opponent" }, rows.bodies["10280:opponent"]!.plan],
    ] as const) {
      const tracker = run([event as SpriteOrderPresentationEvent]);
      expect(tracker.cursor.order.known, JSON.stringify(event)).toBe(true);
      expect(tracker.cursor.order.free, JSON.stringify(event)).toEqual(direct(plan).order.free);
    }
    // STATUS_PRZ (re-taken spark slots) keeps the order known: one survivor, carried.
    expect(run([{ kind: "status-animation", status: "PRZ" }]).cursor.order.known).toBe(true);
  });

  it("prep45 EXACT plans: BRN, TURN_TRAP per trap move, WISH / INGRAIN / FUTURE_SIGHT, Solar Beam per choosetwoturnanim branch", () => {
    const rows = fixture("prep45/plan-rows.json") as { bodies: Record<string, { plan: unknown }>; anims: Record<string, { plan: unknown }> };
    const text = (plan: unknown) => encodeSpriteOrderPlan(plan as never);
    const at = (name: string) => SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS[name]!];
    // BRN's plan text is STATUS_INFATUATION's (the generator dedupes it); INGRAIN_HEAL is LEECH_SEED_DRAIN's orb core; FUTURE_SIGHT_HIT is empty.
    expect(SPRITE_ORDER_PRODUCTION_ANIMS.STATUS_BRN).toBe(SPRITE_ORDER_PRODUCTION_ANIMS.STATUS_INFATUATION);
    expect(at("STATUS_BRN")).toBe("Cf;Cf;Cf;D0;D1");
    expect(SPRITE_ORDER_PRODUCTION_ANIMS.INGRAIN_HEAL).toBe(SPRITE_ORDER_PRODUCTION_ANIMS.LEECH_SEED_DRAIN);
    expect(at("FUTURE_SIGHT_HIT")).toBe("");
    expect(at("TURN_TRAP_FIRE_SPIN")).toBe("Cf;Cf;Cf;Cf;Cf;Cf;Cf;D1;Cf;D2;D0;Cf;Cf;D3;Cf;D4;Cf;D7;D5;D8;D6;D9;D10");
    expect(at("TURN_TRAP_WHIRLPOOL")).toBe("Cff;Cf;Cf;Cf;Cf;Cf;D0;Cf;Cf;Cf;Cf;Cf;Cf;D2;D3;D1;D4;Cf/D5;D8;D6;D9;D7;D10;D13;D11;D12");
    expect(at("TURN_TRAP_SAND_TOMB")).toBe("Cff;Cf;Cf;Cf;Cf;Cf;D0;Cf;D2;Cf;D3;D1;Cf;Cf;D4;Cf;D5;Cf;D8;D6;D9;D7;D10;D11;Cf;D12");
    expect(at("TURN_TRAP_BIND")).toBe("Cf;Cf;D0,1");
    expect(at("WISH_HEAL")).toBe("Cf;Cf;D0;D1;Cf;Cf;Cf;D2;Cf;D3;D4");
    // Clamp's own Status_Clamp branch is not probed: the bare TURN_TRAP stays unplanned (invalidates).
    expect(SPRITE_ORDER_PRODUCTION_ANIMS.TURN_TRAP).toBeUndefined();
    for (const [key, row] of Object.entries(rows.anims)) {
      const name = key.replace(/^(Status|General):B_ANIM_/, "");
      expect(at(name), key).toBe(text(row.plan));
    }
    for (const [key, row] of Object.entries(rows.bodies)) {
      const [move, side] = key.split(":") as [string, "player" | "opponent"];
      expect(spriteOrderProductionBodyPlan(Number(move), side), key).toEqual(row.plan);
    }
    // Five one-sided plans gain the other side with the identical text; Dragon Dance stays side-keyed.
    for (const move of [135, 236, 315, 345]) expect(text(spriteOrderProductionBodyPlan(move, "opponent")), `${move}`).toBe(text(spriteOrderProductionBodyPlan(move, "player")));
    expect(text(spriteOrderProductionBodyPlan(349, "player"))).toBe("Cfffff;Cf;D2,5,1,3,0,4");
    expect(text(spriteOrderProductionBodyPlan(349, "opponent"))).toBe("Cfffff;Cf;D0,4,2,5,1,3");
    // Solar Beam's two choosetwoturnanim branches allocate differently: the 10076 key is load-bearing.
    expect(text(spriteOrderProductionBodyPlan(10076, "player"))).not.toBe(text(spriteOrderProductionBodyPlan(76, "player")));
    for (const event of [
      { kind: "status-animation", status: "BRN" }, { kind: "general-animation", animation: "TURN_TRAP_BIND" },
      { kind: "general-animation", animation: "WISH_HEAL" }, { kind: "move-animation", moveId: 10076, attackerSide: "opponent" },
    ] as const) expect(run([event as SpriteOrderPresentationEvent]).cursor.order.known, JSON.stringify(event)).toBe(true);
    expect(run([{ kind: "general-animation", animation: "TURN_TRAP" }]).cursor.order.known).toBe(false);
  });

  it("plans48 EXACT plans: FRZ / NIGHTMARE / CURSED / ITEM_KNOCKOFF, Ice Punch, Razor Leaf, Snore, Struggle, Grudge, Razor Wind / Present per branch, Attract", () => {
    // ROM receipts (fixtures/plans48/units.json: direct mGBA, every job twice fresh, A == B): every probed instance of a landed unit
    // has the production plan text, per side; check.json is the per-frame check of the same plans (plans48Check.ts).
    const rows = fixture("plans48/plan-rows.json") as { bodies: Record<string, { plan: unknown }>; anims: Record<string, { plan: unknown }> };
    const units = fixture("plans48/units.json") as { jobs: Record<string, { unit: string; identicalAB: boolean; units: { kind: string; label: string; plan: string; truncated: boolean }[] }> };
    const check = fixture("plans48/check.json") as { notIdenticalAB: number; results: Record<string, { instances: number; matched: number }>;
      attract: { instances: { split: string; endStateEqualsA: boolean }[]; boundaryEquivalence: { starts: number; equivalent: number } } };
    const text = (plan: unknown) => encodeSpriteOrderPlan(plan as never);
    const at = (name: string) => SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS[name]!];
    expect(check.notIdenticalAB).toBe(0);
    for (const [label, result] of Object.entries(check.results)) expect(result.matched, label).toBe(result.instances);
    const observed = new Map<string, Set<string>>();
    const seen = (key: string, plan: string) => (observed.get(key) ?? observed.set(key, new Set()).get(key)!).add(plan);
    for (const job of Object.values(units.jobs)) {
      expect(job.identicalAB).toBe(true);
      let razorWind = 0;
      for (const unit of job.units) {
        if (unit.kind !== "body" || unit.truncated) continue;
        const body = /^body (\d+):(\w+)$/.exec(unit.label);
        if (unit.label === "status NIGHTMARE" && unit.plan === at("STATUS_SLP")) continue; // the sleep units of the Nightmare jobs
        if (["status FRZ", "status NIGHTMARE", "status CURSED"].includes(unit.label)) seen(`STATUS_${unit.label.slice(7)}`, unit.plan);
        else if (unit.label === "general ITEM_KNOCKOFF") seen("ITEM_KNOCKOFF", unit.plan);
        else if (body && [8, 75, 173, 288].includes(Number(body[1]))) seen(`${body[1]}:${body[2]}`, unit.plan);
        else if (body && Number(body[1]) === 165) seen("165", unit.plan);
        // Present: PresentDamage allocates 6 sprites, PresentHeal 14 (the ROM's gAnimMoveDmg is not in the probe rows)
        else if (body && Number(body[1]) === 217) seen(`${(unit.plan.match(/C/g) ?? []).length === 6 ? 217 : 20217}:${body[2]}`, unit.plan);
        else if (body && Number(body[1]) === 13) seen(`${razorWind++ === 0 ? 13 : 10013}:${body[2]}`, unit.plan);
        else if (body && Number(body[1]) === 213) seen("213", unit.plan);
      }
    }
    for (const name of ["STATUS_FRZ", "STATUS_NIGHTMARE", "STATUS_CURSED", "ITEM_KNOCKOFF"]) expect([...observed.get(name)!], name).toEqual([at(name)]);
    for (const key of ["8:player", "8:opponent", "75:player", "75:opponent", "173:player", "173:opponent", "288:player", "288:opponent",
      "13:player", "13:opponent", "10013:player", "10013:opponent", "217:player", "217:opponent", "20217:player", "20217:opponent"]) {
      const [move, side] = key.split(":") as [string, "player" | "opponent"];
      expect([...observed.get(key)!], key).toEqual([text(spriteOrderProductionBodyPlan(Number(move), side))]);
    }
    for (const [key, row] of Object.entries(rows.anims)) expect(at(key.replace(/^(Status|General):B_ANIM_/, "")), key).toBe(text(row.plan));
    for (const [key, row] of Object.entries(rows.bodies)) {
      const [move, side] = key.split(":") as [string, "player" | "opponent"];
      expect(spriteOrderProductionBodyPlan(Number(move), side), key).toEqual(row.plan);
    }
    // Attract (18 instances, 9 species pairs per side): the ROM shows the production plan A or B = one rising heart fewer before the
    // frame boundary (the 8 createsprite commands run in one script frame); A and B leave the same order after the unit from any start.
    const attractA = text(spriteOrderProductionBodyPlan(213, "player"));
    expect(text(spriteOrderProductionBodyPlan(213, "opponent"))).toBe(attractA);
    expect([...observed.get("213")!].sort()).toEqual([attractA, attractA.replace(";Cff;Cffffff;", ";Cf;Cfffffff;")].sort());
    expect(check.attract.instances).toHaveLength(18);
    expect(check.attract.instances.every(instance => instance.endStateEqualsA && instance.split !== "none")).toBe(true);
    expect(check.attract.boundaryEquivalence.equivalent).toBe(check.attract.boundaryEquivalence.starts);
    // Struggle (both sides, 4 instances): the extract's text; the opponent side takes the base table's 165:player text (its
    // P-annotated destroy pair resolves to the same order: check.json "body 165" is per-frame exact with that text).
    expect([...observed.get("165")!]).toEqual(["Cff;D1,0;Cf;D2"]);
    expect(text(spriteOrderProductionBodyPlan(165, "opponent"))).toBe(text(spriteOrderProductionBodyPlan(165, "player")));
    expect(check.results["body 165"]!.instances).toBe(4);
    // Grudge stays side-keyed (4 attacker species per side, one plan each); Razor Wind's branches allocate differently.
    expect(text(spriteOrderProductionBodyPlan(288, "player"))).not.toBe(text(spriteOrderProductionBodyPlan(288, "opponent")));
    expect(text(spriteOrderProductionBodyPlan(10013, "player"))).not.toBe(text(spriteOrderProductionBodyPlan(13, "player")));
    expect(text(spriteOrderProductionBodyPlan(20217, "opponent"))).not.toBe(text(spriteOrderProductionBodyPlan(217, "opponent")));
    // Knock Off's item bag survives General_ItemKnockoff: carried, the order stays known.
    for (const event of [
      { kind: "status-animation", status: "FRZ" }, { kind: "status-animation", status: "NIGHTMARE" }, { kind: "status-animation", status: "CURSED" },
      { kind: "general-animation", animation: "ITEM_KNOCKOFF" }, { kind: "move-animation", moveId: 8, attackerSide: "player" },
      { kind: "move-animation", moveId: 173, attackerSide: "opponent" }, { kind: "move-animation", moveId: 10013, attackerSide: "opponent" },
      { kind: "move-animation", moveId: 213, attackerSide: "player" }, { kind: "move-animation", moveId: 20217, attackerSide: "player" },
      { kind: "move-animation", moveId: 165, attackerSide: "opponent" },
    ] as const) expect(run([event as SpriteOrderPresentationEvent]).cursor.order.known, JSON.stringify(event)).toBe(true);
    // Not landed (docs/next-adapters-plans48.md): Shock Wave (2 opponent-side plans over 4 species), Clamp. Fly (hidden attacker) landed
    // with prep61's setup / unleash keys (fly63, tests/spriteOrderFly63.test.ts).
    expect(spriteOrderProductionBodyPlan(351, "opponent")).toBeNull();
    expect(spriteOrderProductionBodyPlan(19, "player")).toEqual(decodeSpriteOrderPlan("Cf;D0"));
  });

  it("maps status animations as InitAndLaunchChosenStatusAnimation does", () => {
    expect(spriteOrderStatusAnimationName(false, 0x8)).toBe("PSN");
    expect(spriteOrderStatusAnimationName(false, 0x80 | 0x100)).toBe("PSN");
    expect(spriteOrderStatusAnimationName(false, 0x3)).toBe("SLP");
    expect(spriteOrderStatusAnimationName(false, 0x40)).toBe("PRZ");
    expect(spriteOrderStatusAnimationName(false, 0x10)).toBe("BRN");
    expect(spriteOrderStatusAnimationName(true, 0x00010000)).toBe("INFATUATION");
    expect(spriteOrderStatusAnimationName(true, 0x2)).toBe("CONFUSION");
    expect(spriteOrderStatusAnimationName(false, 0)).toBeNull();
  });
});

describe("strict real-route replay (docs/sprite-order-real-route.md events; no resync)", () => {
  it("knows more than the first edge in every trace and never mismatches", () => {
    const counts: Record<string, unknown> = {};
    const invalidations: Record<string, unknown> = {};
    for (const trace of REAL_ROUTE_TRACES) {
      const strict = replayCrossBodyTrace(trace, "strict");
      counts[trace] = [strict.moveEdges.known, strict.moveEdges.exact, strict.moveEdges.mismatched];
      expect(strict.moveEdges.mismatched).toBe(0);
      expect(strict.moveEdges.occupiedMismatch).toBe(0);
      expect(strict.animEdges.mismatched).toBe(0);
      for (const edge of strict.edges.filter(row => row.known)) expect(edge.exact && edge.occupiedMatch && edge.lent).toBe(true);
      invalidations[trace] = strict.firstInvalidation;
    }
    expect(counts).toEqual({ "battle1-turn17-dense": [10, 10, 0], "battle1-switch": [10, 10, 0], "battle1-turn2-dragonbreath": [4, 4, 0],
      "battle1-grovyle-faint": [10, 10, 0], "battle1-victory": [10, 10, 0] });
    expect(invalidations["battle1-turn2-dragonbreath"]).toEqual({ frame: 3336, reason: "uncovered: HandleTurnActionSelectionState" });
    expect(invalidations["battle1-victory"]).toEqual({ frame: 6519, reason: "uncovered: RunTurnActionsFunctions" });
  });

  it("resync mode (rules in isolation): every tested edge exact, 91 move edges", () => {
    let tested = 0;
    for (const trace of REAL_ROUTE_TRACES) {
      const resync = replayCrossBodyTrace(trace, "resync");
      expect(resync.moveEdges.mismatched + resync.animEdges.mismatched).toBe(0);
      expect(resync.moveEdges.occupiedMismatch + resync.animEdges.occupiedMismatch).toBe(0);
      tested += resync.moveEdges.tested;
      expect(resync.moveEdges.exact).toBe(resync.moveEdges.tested);
    }
    expect(tested).toBe(91);
  });

  it("occupied prefix (Rock Throw's 64-entry seed) is the known-entry order at every body edge with the known occupants", () => {
    let matched = 0;
    for (const trace of REAL_ROUTE_TRACES) {
      const raw = fixture(`sprite-order-real-route/raw/${trace}-0.json`) as { rows: [number, number, string, string][] };
      const events = fixture(`sprite-order-real-route/events/${trace}.json`).events as { n: number; k: string }[];
      for (const body of events.filter(event => event.k === "body")) {
        const row = raw.rows.filter(candidate => candidate[0] <= body.n).at(-1)!;
        const order = Array.from({ length: 64 }, (_, index) => parseInt(row[2].slice(index * 2, index * 2 + 2), 16));
        const mask = BigInt(`0x${row[3]}`);
        const occupied = order.filter(slot => (mask >> BigInt(slot)) & 1n);
        if ([...occupied].sort((a, b) => a - b).join() !== [...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER].sort((a, b) => a - b).join()) continue;
        expect(occupied, `${trace} ${body.n}`).toEqual(KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
        matched += 1;
      }
    }
    expect(matched).toBe(44);
  });

  it("BattleLab corpus (committed + ext event tables): every edge the transform knows is exact", () => {
    // Turn-keyed like the host (Dig / Brick Break choosetwoturnanim branch, prep43): known 1130 -> 1136, all exact.
    // prep45 plans (+ Solar Beam keyed like Dig): known 1136 -> 1143 (7 later edges), all exact.
    // plans48 plans (+ Razor Wind keyed like Dig, Present by its branch): known 1143 -> 1159 (16 later edges), all exact.
    // plans54 Fury Cutter rows (210 / 10210 / 20210 / 30210): known 1159 -> 1173 (14 later edges after Fury Cutter bodies), all exact. The
    // corpus has no furyCutterCounter, so every 210 body is fed the counter-1 "Cf;D0" plan; "Cff;D1;D0" (counters 2+) leaves the same
    // free order at the next edge, so the edge counts do not depend on the key (the per-frame windows do: tests/spriteOrderPlans54.test.ts).
    // prep61 Fly / Bounce rows (+ 19 / 340 keyed like Dig; fly63): known 1173 -> 1181 (8 later edges), all exact.
    const corpus = replayCrossBodyCorpus({ turnKeyed: true });
    expect({ scenarios: corpus.scenarios, skipped: corpus.skipped, edges: corpus.edges, mismatched: corpus.mismatched })
      .toEqual({ scenarios: 573, skipped: 19, edges: 1366, mismatched: 0 });
    expect(corpus.exact).toBe(corpus.known);
    expect(corpus.known).toBe(1183);
    expect(corpus.laterKnown).toBe(629);
    // Without the turn key the Dig unleash body is fed the setup plan: exactly the edge after it (unit 5) in the two Dig scenarios; the
    // Bounce unleash body likewise gets the setup plan (prep61: unit 9 of the player-side Spoink scenario).
    const unkeyed = replayCrossBodyCorpus();
    expect({ known: unkeyed.known, exact: unkeyed.exact, mismatched: unkeyed.mismatched }).toEqual({ known: 1183, exact: 1179, mismatched: 4 });
    // ... and without the Present key the PresentHeal body is fed the PresentDamage plan (plans48).
    expect(unkeyed.mismatches).toEqual([
      { file: "217-mechanic-present-opponent-delibird-player-onix-0.json", unit: 7, mv: 33 },
      { file: "340-mechanic-bounce-player-spoink-onix-0.json", unit: 9, mv: 0 },
      { file: "91-mechanic-dig-opponent-vibrava-player-chansey-0.json", unit: 5, mv: 45 },
      { file: "91-mechanic-dig-player-vibrava-opponent-chansey-0.json", unit: 5, mv: 45 },
    ]);
  });
});
