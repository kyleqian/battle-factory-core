import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleKernelSemanticEvent } from "../src/engine/battleDecisionBoundary.ts";
import { advanceLiveSpriteOrderHost, beginLiveSpriteOrderTurn, createLiveSpriteOrderHost } from "../src/engine/liveSpriteOrderHost.ts";
import {
  KNOWN_ENTRY_OCCUPANT_ROLES, SPRITE_ORDER_UNIT_PLAN_TEXTS, applySpriteOrderPresentationEvent, createSpriteOrderTracker,
  decodeSpriteOrderPlan, spriteOrderTrackerRoleIsomorphic, type SpriteOrderPresentationEvent,
} from "../src/engine/spriteOrderEventTransform.ts";
import {
  applySpriteOrderUnitPlan, createSpriteOrderPlanCursor, knownEntrySpriteOrderState,
} from "../src/engine/spriteOrderProvider.ts";

// docs/forced-switch-continuation.md: the ROM continuation after a Roar / Whirlwind body (two identical fresh direct-mGBA runs per scenario;
// fixtures under tools/integration/fixtures/forced-switch/, produced by forcedSwitchRomProbe.py / forcedSwitchOrderFixture.ts).
const FX = new URL("../tools/integration/fixtures/forced-switch/", import.meta.url);
const rom = readdirSync(new URL("rom/", FX)).filter(n => n.endsWith(".json")).sort()
  .map(n => JSON.parse(readFileSync(new URL(`rom/${n}`, FX), "utf8")) as { scenario: string; E: number; events: any[]; spawns: any[] });
const order = JSON.parse(readFileSync(new URL("order-check.json", FX), "utf8")) as Record<string, {
  battlerSlot: number; freedAt: number; ballAt: number; pre: { free: number[]; occupied: number[] };
  afterFree: number[]; afterStart: number[]; afterParticles: number[];
}>;

describe("forced-switch continuation ROM timeline (Roar / Whirlwind, both attacker sides)", () => {
  it("covers both sides of both moves plus the alternates", () => {
    expect(rom.map(r => r.scenario)).toEqual([
      "mechanic-roar-opponent-houndour-player-onix.json", "mechanic-roar-player-houndour-opponent-onix.json",
      "mechanic-whirlwind-opponent-butterfree-player-onix.json", "mechanic-whirlwind-player-butterfree-opponent-onix.json",
      "prep11-roar-alt-vaporeon.json", "prep11-whirlwind-alt-beautifly.json",
    ]);
  });
  for (const r of rom) it(`${r.scenario}: instant removal E+4, party index E+7, species E+9, ball E+10, 15 particles`, () => {
    const at = (kind: string) => r.events.find(e => e.k >= 0 && kind in e)?.k;
    // player-attacker scenarios target the opponent (battler 1); the two `mechanic-*-opponent-*-player-onix` scenarios target the player (battler 0)
    const target = /-opponent-(houndour|butterfree)-player-/.test(r.scenario) ? 0 : 1;
    // the removed battler sprite is freed exactly at E+4 (no recall animation: `returntoball` passes skipAnim = TRUE), healthbox hidden the same frame
    const freed = r.spawns.filter(s => s.ev === "-" && s.k >= 0)[0];
    expect(freed.k).toBe(4);
    const hbHidden = r.events.find(e => e.k >= 0 && e.hb && e.hb[target][5] === 1);
    expect(hbHidden.k).toBe(4);
    expect(r.events.find(e => e.k >= 0 && e.pidx).k).toBe(7);
    expect(r.events.find(e => e.k >= 0 && e.species).k).toBe(9);
    const ball = r.spawns.find(s => s.ev === "+" && s.k >= 0 && s.cb === "SpriteCB_WaitForBattlerBallReleaseAnim");
    expect(ball.k).toBe(10);
    const particles = r.spawns.filter(s => s.ev === "+" && s.cb === "PokeBallOpenParticleAnimation_Step1");
    expect(particles).toHaveLength(15);
    expect(particles[0]!.k - ball.k).toBe(target === 1 ? 18 : 47); // opponent send-in 18 frames after the ball; player send-in (throw) 47
    expect(at("ctrl")).toBeGreaterThanOrEqual(1);
  });
});

describe("sprite-order units: the existing switchInStart / switchInParticles plans model the forced switch", () => {
  for (const [name, o] of Object.entries(order)) it(`${name}: D o<battler> -> switchInStart -> switchInParticles equal the ROM free order`, () => {
    expect(o.freedAt).toBe(4);
    expect(o.ballAt).toBe(10);
    let cursor = createSpriteOrderPlanCursor({ known: true, free: o.pre.free, pendingDestroyed: [] }, o.pre.occupied);
    const steps: [string, string, number[]][] = [
      ["instant free", `Do${o.battlerSlot}`, o.afterFree], ["start", SPRITE_ORDER_UNIT_PLAN_TEXTS.switchInStart, o.afterStart],
      ["particles", SPRITE_ORDER_UNIT_PLAN_TEXTS.switchInParticles, o.afterParticles],
    ];
    for (const [label, text, expected] of steps) {
      cursor = applySpriteOrderUnitPlan(cursor, decodeSpriteOrderPlan(text));
      expect(cursor.order.known, label).toBe(true);
      expect(cursor.order.free, label).toEqual(expected);
    }
  });
});

describe("sprite-order events: forced-switch-out + side-generic switch-in keep the tracker known (production transform + live host)", () => {
  for (const [name, o] of Object.entries(order)) it(`${name}: event-level units equal the ROM free order after each unit`, () => {
    const side = o.battlerSlot === 6 ? "player" as const : "opponent" as const;
    let tracker = createSpriteOrderTracker({ known: true, free: o.pre.free, pendingDestroyed: [] });
    const steps: [SpriteOrderPresentationEvent, number[]][] = [
      [{ kind: "forced-switch-out", side }, o.afterFree],
      [{ kind: "switch-in-start", side }, o.afterStart],
      [{ kind: "switch-in-finish", side }, o.afterParticles],
    ];
    for (const [event, expected] of steps) {
      tracker = applySpriteOrderPresentationEvent(tracker, event);
      expect(tracker.cursor.order.known, event.kind).toBe(true);
      expect(tracker.cursor.order.free, event.kind).toEqual(expected);
    }
    expect(tracker.battlerSlots[side]).not.toBeNull();
    expect(tracker.occupantRoles).toEqual(KNOWN_ENTRY_OCCUPANT_ROLES);
    expect(spriteOrderTrackerRoleIsomorphic(tracker)).toBe(true);
  });

  const ev = (sequence: number, payload: Record<string, unknown>, opcodeName?: string) => Object.freeze({
    sequence, payload: Object.freeze(payload), ...(opcodeName ? { provenance: Object.freeze({ opcodeName }) } : {}),
  }) as unknown as BattleKernelSemanticEvent;
  const hostAfter = (events: BattleKernelSemanticEvent[]) => {
    let host = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 7, true);
    host = advanceLiveSpriteOrderHost(host, { resolutionId: { requestId: 7 }, segmentIndex: 0, segments: [{ events }] },
      Number.POSITIVE_INFINITY);
    return host.tracker;
  };
  for (const [moveId, attacker] of [[46, 0], [46, 1], [18, 0], [18, 1]] as const) {
    it(`live host maps move ${moveId} attacker ${attacker}: RETURNTOBALL -> forced-switch-out, send-in -> switch-in units (known)`, () => {
      const target = attacker === 0 ? 1 : 0;
      const tracker = hostAfter([
        ev(0, { kind: "animation", animationId: "MOVE_ANIMATION", battler: attacker, target, arguments: [String(moveId), "0", "0", "0", "70", "0"] }),
        ev(1, { kind: "set-battler-sprite-visibility", battler: target, invisible: true }, "B_SCR_OP_RETURNTOBALL"),
        ev(2, { kind: "switch", side: target === 0 ? "player" : "opponent", fromPartyIndex: 0, toPartyIndex: 1 }),
        ev(3, { kind: "switch-in-animation", battler: target, partyIndex: 1 }),
      ]);
      expect(tracker.invalidReason).toBeNull();
      expect(tracker.cursor.order.known).toBe(true);
      expect(tracker.lastUnit).toBe("switch-in");
      expect(tracker.battlerSlots[target === 0 ? "player" : "opponent"]).not.toBeNull();
    });
  }
  it("Baton Pass shape (returntoball of the body's attacker) keeps invalidating", () => {
    const tracker = hostAfter([
      ev(0, { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0, target: 1, arguments: ["226", "0", "0", "0", "70", "0"] }),
      ev(1, { kind: "set-battler-sprite-visibility", battler: 0, invisible: true }, "B_SCR_OP_RETURNTOBALL"),
    ]);
    expect(tracker.cursor.order.known).toBe(false);
  });
});
