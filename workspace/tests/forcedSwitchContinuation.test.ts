import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPRITE_ORDER_UNIT_PLAN_TEXTS, decodeSpriteOrderPlan } from "../src/engine/spriteOrderEventTransform.ts";
import { applySpriteOrderUnitPlan, createSpriteOrderPlanCursor } from "../src/engine/spriteOrderProvider.ts";

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
