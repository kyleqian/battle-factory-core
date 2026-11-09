import { describe, expect, it } from "vitest";
import { diveAtAge, type DiveBody, type DiveGeometry, type DiveProfile, type DiveSide } from "../src/animation/dive.ts";
import { diveAtAge as referenceDiveAtAge } from "./helpers/cln244DiveReference.ts";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Config { body: DiveBody; side: DiveSide; geometry: DiveGeometry; profile: DiveProfile; last: number }

function makeConfig(seed: number): Config {
  const r = rng(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const body: DiveBody = r() < 0.5 ? "setup" : "attack";
  const side: DiveSide = r() < 0.5 ? "player" : "opponent";
  // Every few seeds draw slots from a tiny pool so allocations collide (the overwritten / slot-reuse path).
  const pool = seed % 4 === 3 ? 6 : 64;
  const used = new Set<number>();
  const fresh = (): number => {
    for (;;) {
      const slot = int(0, pool - 1);
      if (!used.has(slot) || pool === 6) { used.add(slot); return slot; }
    }
  };
  const allocation = () => ({ slot: fresh(), matrixNum: int(0, 31), persistentOrder: int(0, 63) });
  const droplets = Array.from({ length: int(4, 8) }, () => ({ ...allocation(),
    velocityX: int(0, 0x1ff), velocityY: int(0, 0x2ff), direction: int(0, 1) as 0 | 1 }));
  const impacts = body === "attack" ? Array.from({ length: 9 }, () => ({ ...allocation(),
    bubbles: [0, 1].map(() => ({ ...allocation(), velocityX: int(256, 511), velocityY: int(0, 255) })) as unknown as
      DiveProfile["impacts"][number]["bubbles"] })) : [];
  const ball = allocation(), splash = allocation();
  const slots = [...new Set([...(body === "setup" ? [ball.slot] : []), splash.slot, ...droplets.map((d) => d.slot),
    ...impacts.flatMap((i) => [i.slot, ...i.bubbles.map((b) => b.slot)])])];
  const seedOrder = slots.slice();
  for (let i = seedOrder.length - 1; i > 0; i -= 1) {
    const j = int(0, i);
    [seedOrder[i], seedOrder[j]] = [seedOrder[j]!, seedOrder[i]!];
  }
  const last = body === "setup" ? int(64, 120) : int(88, 96);
  const point = () => ({ x: int(40, 200), y: int(20, 110) });
  const geometry: DiveGeometry = { attackerCenter: point(), targetCenter: point(),
    attackerPictureOffset: point(), targetPictureOffset: point(),
    attackerRestOffset: { x2: int(-4, 4), y2: int(-4, 4) }, targetRestOffset: { x2: int(-4, 4), y2: int(-4, 4) },
    ...(seed % 3 === 0 ? { attackerBallOffset: point(), targetImpactOffset: point() } : {}) };
  const profile: DiveProfile = { firstInactiveAge: last, attackerSubpriority: int(0, 200),
    targetSubpriority: int(0, 200), ball, splash, droplets, impacts, spriteOrderSeed: seedOrder };
  return { body, side, geometry, profile, last };
}

function shuffled<T>(items: T[], r: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

describe("cln244 Dive incremental hardware order", () => {
  it("matches the from-tick-0 reference at every age, in random and repeated query order, for 40 configs", () => {
    let compared = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const { body, side, geometry, profile, last } = makeConfig(seed);
      const ages = Array.from({ length: last + 12 }, (_, i) => i - 3);
      const r = rng(seed * 7919);
      const queries = [...shuffled(ages, r), ...shuffled(ages, r).slice(0, 30), ages[ages.length - 1]!, ages[0]!];
      for (const age of queries) {
        expect(diveAtAge(age, body, side, geometry, profile), `seed ${seed} age ${age}`)
          .toEqual(referenceDiveAtAge(age, body, side, geometry, profile));
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(3000);
  });

  it("keys on the full input: equal-valued fresh objects share results, and a changed field changes them", () => {
    const base = makeConfig(5);
    const clone = JSON.parse(JSON.stringify(base)) as Config;
    const age = base.last - 1;
    expect(diveAtAge(age, base.body, base.side, clone.geometry, clone.profile))
      .toEqual(diveAtAge(age, base.body, base.side, base.geometry, base.profile));
    const shifted: DiveProfile = { ...base.profile, attackerSubpriority: base.profile.attackerSubpriority + 1,
      targetSubpriority: base.profile.targetSubpriority + 1 };
    for (const side of ["player", "opponent"] as const) for (let a = 0; a <= base.last; a += 1) {
      expect(diveAtAge(a, base.body, side, base.geometry, shifted)).toEqual(
        referenceDiveAtAge(a, base.body, side, base.geometry, shifted));
      expect(diveAtAge(a, base.body, side, base.geometry, base.profile)).toEqual(
        referenceDiveAtAge(a, base.body, side, base.geometry, base.profile));
    }
  });

  it("returns a fresh hardwareOrder array: mutating one result never reaches the next query", () => {
    const { body, side, geometry, profile, last } = makeConfig(9);
    const first = diveAtAge(last - 2, body, side, geometry, profile);
    const copy = [...first.hardwareOrder];
    (first.hardwareOrder as number[]).reverse().push(999);
    expect(diveAtAge(last - 2, body, side, geometry, profile).hardwareOrder).toEqual(copy);
  });

  it("an invalid sprite-order seed still throws on every call", () => {
    const { body, side, geometry, profile } = makeConfig(2);
    const bad = { ...profile, spriteOrderSeed: profile.spriteOrderSeed.slice(1) };
    for (let i = 0; i < 2; i += 1) {
      expect(() => diveAtAge(20, body, side, geometry, bad)).toThrow("permute every live allocation slot");
      expect(() => referenceDiveAtAge(20, body, side, geometry, bad)).toThrow("permute every live allocation slot");
    }
  });

  it("more than the cache bound of distinct configs still matches the reference", () => {
    for (let seed = 100; seed < 140; seed += 1) {
      const { body, side, geometry, profile, last } = makeConfig(seed);
      for (const age of [last, 20, last - 5, 0]) {
        expect(diveAtAge(age, body, side, geometry, profile)).toEqual(
          referenceDiveAtAge(age, body, side, geometry, profile));
      }
    }
    const again = makeConfig(100);
    expect(diveAtAge(again.last, again.body, again.side, again.geometry, again.profile)).toEqual(
      referenceDiveAtAge(again.last, again.body, again.side, again.geometry, again.profile));
  });
});
