import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  LIVE_BATTLER_X2_IDLE, LIVE_BATTLER_X2_MOVE_TABLE, advanceLiveBattlerX2Host, applyLiveBattlerX2Event,
  createLiveBattlerX2Host, liveBattlerX2EventsOf, liveBattlerX2MoveRoleClass, liveMoveBattlerX2Input,
  liveTrackedFrontIdleRest, type LiveBattlerX2Event, type LiveBattlerX2History,
} from "../src/engine/liveBattlerX2History.ts";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { liveBattlerAnchors, liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../src/animation/speciesIdleAnim.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };
import { x2TrackerRouteReplay } from "../tools/integration/x2TrackerRouteReplay.ts";

const X2 = "tools/integration/fixtures/x2-history";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const apply = (events: readonly LiveBattlerX2Event[], from: LiveBattlerX2History = LIVE_BATTLER_X2_IDLE) =>
  events.reduce(applyLiveBattlerX2Event, from);
const body = (moveId: number, attackerSide: "player" | "opponent", turn?: number): LiveBattlerX2Event =>
  ({ kind: "move-body", moveId, attackerSide, ...(turn === undefined ? {} : { turn }) });
const event = (sequence: number, payload: unknown) => ({ sequence, payload }) as unknown as BattleKernelSemanticEvent;
const moveAnimation = (sequence: number, battler: 0 | 1, moveId: number, turn = 0) => event(sequence, {
  kind: "animation", animationId: "MOVE_ANIMATION", battler, target: 1 - battler,
  arguments: [String(moveId), String(turn), "0", "0", "70", "0"],
});

describe("live battler x2 history (ISSUES #148, presentation-only)", () => {
  // docs/x2-history-148.md §0.3 spot checks (key move id + role).
  it.each([
    [175, "zeroed", "zeroed"], [33, "keep", "zeroed"], [24, "keep", "zeroed"], [37, "keep", "keep"],
    [310, "keep", "zeroed"], [273, "keep", "keep"], [88, "keep", "zeroed"], [152, "keep", "zeroed"],
    [348, "keep", "zeroed"], [258, "keep", "keep"], [352, "keep", "zeroed"], [318, "keep", "keep"],
    [92, "keep", "keep"], [162, "keep", "zeroed"], [131, "zeroed", "zeroed"], [154, "keep", "zeroed"],
  ] as const)("move %i: attacker %s, target %s", (moveId, attacker, target) => {
    expect(liveBattlerX2MoveRoleClass(moveId, "attacker")).toBe(attacker);
    expect(liveBattlerX2MoveRoleClass(moveId, "target")).toBe(target);
  });

  it("the production table is the measured ONIX-pair table (target census fill-in; keep = unchanged | transient)", () => {
    const pairs = read(`${X2}/move-end-state-x2-onix-pairs.json`).table as Record<string, Record<string, { x2Class: string }>>;
    const census = read(`${X2}/move-end-state-x2.json`).table as Record<string, Record<string, { x2Class: string }>>;
    let checked = 0;
    for (const role of ["attacker", "target"] as const) {
      for (const id of new Set([...Object.keys(pairs), ...Object.keys(census)])) {
        let measured = pairs[id]?.[role]?.x2Class;
        const fill = census[id]?.[role]?.x2Class;
        if ((measured === undefined || measured === "rest0") && ["zeroed", "unchanged", "transient"].includes(fill ?? "")) measured = fill;
        if (measured === undefined || measured === "rest0") continue;
        const parts = measured.replace(/^mixed:/, "").split("+");
        const expected = parts.every((part) => part === "unchanged" || part === "transient") ? "keep"
          : parts.length > 1 ? "unknown" : "zeroed";
        expect([id, role, LIVE_BATTLER_X2_MOVE_TABLE[role][expected === "unknown" ? "mixed" : expected].includes(Number(id))])
          .toEqual([id, role, true]);
        checked += 1;
      }
    }
    expect(checked).toBe(30 + 91 + 1 + 96 + 71 + 4);
  });

  it("mixed and unmeasured moves follow the documented fallback", () => {
    // mixed target rows (Razor Wind, Return, Dive; move 0) -> unknown: consumers keep the species rest.
    for (const moveId of [0, 13, 216, 291]) expect(liveBattlerX2MoveRoleClass(moveId, "target")).toBe("unknown");
    // Unmeasured target: damaging -> zeroed (every hit shakes its target), status -> keep.
    expect(liveBattlerX2MoveRoleClass(7, "target")).toBe("zeroed"); // Fire Punch, power 75
    expect(liveBattlerX2MoveRoleClass(20, "target")).toBe("zeroed"); // Bind (pair run rest0)
    expect(liveBattlerX2MoveRoleClass(14, "target")).toBe("keep"); // Swords Dance (rest0, status)
    expect(liveBattlerX2MoveRoleClass(86, "target")).toBe("keep"); // Thunder Wave
    // A two-turn move's charge turn does not touch the target; its hit turn does.
    expect(liveBattlerX2MoveRoleClass(76, "target", 0)).toBe("keep");
    expect(liveBattlerX2MoveRoleClass(76, "target", 1)).toBe("zeroed");
    // Unmeasured attacker roles keep (attackers use relative tasks); ids outside the move table are unknown.
    expect(liveBattlerX2MoveRoleClass(7, "attacker")).toBe("keep");
    expect(liveBattlerX2MoveRoleClass(9999, "target")).toBe("unknown");
  });

  it("send-in resets a side to idle; zeroed stays until then; unknown never zeroes a consumer", () => {
    const shaken = apply([body(175, "player")]);
    expect(shaken).toEqual({ player: "zeroed", opponent: "zeroed" });
    expect(apply([body(92, "player"), body(258, "opponent")], shaken)).toEqual(shaken); // status / weather keep
    expect(liveMoveBattlerX2Input(shaken)).toEqual({ zeroed: ["player", "opponent"] });
    const sentIn = apply([{ kind: "send-in", side: "opponent" }], shaken);
    expect(sentIn).toEqual({ player: "zeroed", opponent: "idle" });
    expect(liveMoveBattlerX2Input(sentIn)).toEqual({ zeroed: ["player"] });
    const mixed = apply([body(216, "player")], sentIn);
    expect(mixed.opponent).toBe("unknown");
    expect(liveMoveBattlerX2Input(apply([{ kind: "unknown", side: "both", reason: "t" }]))).toBeUndefined();
    expect(liveMoveBattlerX2Input(LIVE_BATTLER_X2_IDLE)).toBeUndefined();
    expect(apply([body(37, "player")])).toBe(LIVE_BATTLER_X2_IDLE); // no-op events keep identity
  });

  it("maps semantic events: send-in, move body, keep animations, unknown general/status animations", () => {
    expect(liveBattlerX2EventsOf(event(1, { kind: "switch-in-animation", battler: 1, partyIndex: 1 })))
      .toEqual([{ kind: "send-in", side: "opponent" }]);
    expect(liveBattlerX2EventsOf(moveAnimation(2, 0, 175))).toEqual([{ kind: "move-body", moveId: 175, attackerSide: "player", turn: 0 }]);
    for (const animationId of ["HIT_ANIMATION", "STATS_CHANGE", "HAIL_CONTINUES"]) {
      expect(liveBattlerX2EventsOf(event(3, { kind: "animation", animationId, battler: 1, target: 0, arguments: [] }))).toEqual([]);
    }
    expect(liveBattlerX2EventsOf(event(4, { kind: "animation", animationId: "TURN_TRAP", battler: 1, target: 0, arguments: [] }))
      .map((e) => e.kind === "unknown" && e.side)).toEqual(["opponent", "player"]);
    // sar131: B_ANIM_STATUS_* rows are source-derived (LIVE_BATTLER_X2_STATUS_ANIMATION): PSN (status 8) zeroes its battler.
    expect(liveBattlerX2EventsOf(event(5, { kind: "status-animation", battler: 1, isStatus2: 0, status: 8 })))
      .toEqual([{ kind: "status-animation", side: "opponent", animation: "PSN" }]);
    expect(liveBattlerX2EventsOf(event(6, { kind: "faint-animation", battler: 1 }))).toEqual([]);
    expect(liveBattlerX2EventsOf(event(7, { kind: "message", text: "x" }))).toEqual([]);
  });

  it("faint + replacement send-in receipt: the host predicts every activation (ONIX idle 1 after the send-in)", () => {
    // tools/integration/fixtures/x2-history/faint-sendin-receipt.json: KRABBY Flail -> PIDGEY (faints), ONIX sent in,
    // ONIX Super Fang (attacker), KRABBY Flail -> ONIX. The resolution events the orchestrator feeds, in order.
    const receipt = read(`${X2}/faint-sendin-receipt.json`) as { bodies: { move: number; start: number; opponentSpecies: number;
      oppRole: string; romX2AtActivation: number }[]; allMatch: boolean };
    expect(receipt.allMatch).toBe(true);
    const events = [
      moveAnimation(1, 0, 175), event(2, { kind: "animation", animationId: "HIT_ANIMATION", battler: 1, target: 1, arguments: [] }),
      event(3, { kind: "faint-animation", battler: 1 }), event(4, { kind: "draw-party-status-summary", battler: 1 }),
      event(5, { kind: "switch-in-animation", battler: 1, partyIndex: 1 }),
      moveAnimation(6, 1, 162), moveAnimation(7, 0, 175),
    ];
    const resolution = { resolutionId: { requestId: 1 }, segmentIndex: 0, segments: [{ events }] };
    const name = (id: number) => speciesStats.species.find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
    let host = createLiveBattlerX2Host();
    const bodySequences = [1, 6, 7];
    receipt.bodies.forEach((row, index) => {
      host = advanceLiveBattlerX2Host(host, resolution, bodySequences[index]!, true);
      const rest = speciesFrontIdleRestOffsetOrZero(name(row.opponentSpecies));
      const predicted = liveTrackedFrontIdleRest("opponent", rest, liveMoveBattlerX2Input(host.history)).x2;
      expect([row.start, predicted]).toEqual([row.start, row.romX2AtActivation]);
      host = advanceLiveBattlerX2Host(host, resolution, bodySequences[index]!);
    });
    expect(host.history.opponent).toBe("zeroed"); // the final Flail zeroes ONIX (romX2AtEnd1 0)
    expect(host.cursor?.drained).toBe(true);
    // A new resolution while one is undrained: its rest is unknown history.
    const partial = advanceLiveBattlerX2Host(createLiveBattlerX2Host(), resolution, 1);
    expect(advanceLiveBattlerX2Host(partial, { ...resolution, resolutionId: { requestId: 2 } }, 0, true).history)
      .toEqual({ player: "unknown", opponent: "unknown" });
  });

  const mon = (name: string, battler: 0 | 1) => ({
    species: speciesStats.species.find((s) => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 120, gender: "male", status: "none", side: battler === 0 ? "player" : "trainer", battler,
    partyIndex: 0, moveIds: [0, 0, 0, 0], currentPP: [0, 0, 0, 0], ppBonuses: 0,
  });
  const fieldOf = (player: string, opponent: string) =>
    ({ player: mon(player, 0), opponent: mon(opponent, 1) }) as unknown as BattleResolutionDisplayedField;

  it("anchors: frontIdleRest {0,0} for a zeroed ONIX / RATTATA opponent; every other species and the player side unchanged", () => {
    const zeroed = { zeroed: ["player", "opponent"] as const };
    for (const species of ["ONIX", "RATTATA"]) {
      const art = createBattleCommandFieldArtView(fieldOf("KRABBY", species));
      expect(liveBattlerAnchors("opponent", art).frontIdleRest).toEqual({ x2: 1, y2: 0 });
      expect(liveBattlerAnchors("opponent", art, zeroed).frontIdleRest).toEqual({ x2: 0, y2: 0 });
      expect(liveBattlerAnchors("opponent", art, { zeroed: ["player"] }).frontIdleRest).toEqual({ x2: 1, y2: 0 });
    }
    for (const species of ["GOLEM", "PIDGEY", "KRABBY"]) {
      const art = createBattleCommandFieldArtView(fieldOf("ONIX", species));
      expect(liveBattlerAnchors("opponent", art, zeroed)).toEqual(liveBattlerAnchors("opponent", art));
      expect(liveBattlerAnchors("player", art, zeroed)).toEqual(liveBattlerAnchors("player", art));
    }
  });

  it("presentation: only an ONIX / RATTATA side carries the override; other battles are byte-identical", () => {
    // Hi Jump Kick 136 (targetInitialX2 from the tracked anchors) and Spike Cannon 131 (renderer reads the battler rest).
    const zeroed = { zeroed: ["player", "opponent"] as const };
    for (const moveId of [136, 131]) {
      const request = { moveId, attacker: 0, target: 1, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 } as const;
      const onix = fieldOf("HITMONLEE", "ONIX");
      const tracked = liveMoveAnimationPresentation(request, onix, 5, undefined, undefined, undefined, undefined, zeroed)!;
      const rest = liveMoveAnimationPresentation(request, onix, 5)!;
      const config = (state: typeof tracked) => state.config as unknown as Record<string, { liveIdleRest?: unknown }>;
      expect(config(tracked).target!.liveIdleRest).toEqual({ x2: 0, y2: 0 });
      expect(config(rest).target!.liveIdleRest).toBeUndefined();
      expect(config(tracked).attacker!.liveIdleRest).toBeUndefined(); // player back sprite rest is 0
      if (moveId === 136) {
        expect((tracked.config as unknown as { targetInitialX2: number }).targetInitialX2).toBe(0);
        expect((rest.config as unknown as { targetInitialX2: number }).targetInitialX2).toBe(1);
      }
      const golem = fieldOf("HITMONLEE", "GOLEM");
      expect(JSON.stringify(liveMoveAnimationPresentation(request, golem, 5, undefined, undefined, undefined, undefined, zeroed)))
        .toBe(JSON.stringify(liveMoveAnimationPresentation(request, golem, 5)));
    }
  });
});

describe("x2 history over ordinary generated routes with ONIX opponents (docs/x2-history-148.md §0.5 seeds 110 / 134)", () => {
  // tools/integration/fixtures/x2-history-tracker/route-replay-110-134.json: later bodies whose input changes (ONIX zeroed).
  it.each([
    // sa125: "1:0:17" -> "1:0:18" (the key is requestId:segment:commandIndex): one Scene ON status-animation command now precedes
    // that body in segment 1:0 (sa125 adds no other command); bodies, inputs and ON / OFF parity unchanged.
    // sar131: + 5 bodies ("5:0:1", "7:0:1", "11:0:1", "13:0:1", "15:0:1") whose ONIX an earlier status animation left unknown and
    // the source-derived status-animation rows (LIVE_BATTLER_X2_STATUS_ANIMATION) now know zeroed (bodies / parity unchanged).
    [110, 14, 10, 8, ["1:0:18", "3:0:1", "5:0:1", "5:0:7", "7:0:1", "11:0:1", "13:0:1", "15:0:1"]],
    [134, 15, 13, 9, ["3:0:9", "5:0:6", "7:0:1", "7:0:5", "9:0:8", "13:0:1", "13:0:8", "15:0:1", "17:0:5"]],
  ] as const)("seed %i: %i bodies, %i with an ONIX opponent, %i inputs changed; Scene ON/OFF logic, RNG, boundaries equal",
    (seed, bodies, rest, changed, keys) => {
      const route = x2TrackerRouteReplay(seed);
      expect(route.stalled).toBe(false);
      expect([route.bodies, route.bodiesWithRestSpeciesOpponent, route.inputChanged]).toEqual([bodies, rest, changed]);
      expect(route.restSpeciesBodies.filter((body) => body.inputChanged).map((body) => body.key)).toEqual(keys);
      // The battle's first ONIX body is always the species rest (send-in idle).
      expect(route.restSpeciesBodies[0]!.zeroed).not.toContain("opponent");
      expect(route.parity.onOffLogicRngBoundaryEqual).toBe(true);
    }, 120_000);
});
