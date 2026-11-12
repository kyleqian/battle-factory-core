import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLIZZARD_EFFECT_SPRITE_ORDER_SEED, blizzardAtAge, blizzardEffectOamOrderAtAge, blizzardImpactStartAge } from "../src/animation/blizzard.ts";
import { ICY_WIND_EFFECT_SPRITE_ORDER_SEED, icyWindAtAge, icyWindEffectOamOrderAtAge } from "../src/animation/icyWind.ts";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";
import { RETAINED_BLIZZARD_SLOTS, RETAINED_ICY_WIND_SLOTS, geoiceGeometry } from "../tools/integration/geoiceSlotCheck.ts";

// S10A geoice (docs/icy-wind-blizzard-geometry.md): Icy Wind (196) / Blizzard (59) derive their effect OAM slots and order from the
// reducers' own CreateSprite / DestroySprite / SortSprites replay at the displayed geometry. Dense pairs = species pairs the retained
// slot table did not cover at 7da7bbfa3; ROM rows = fresh direct-mGBA probes (two runs, equal), receipt geoice-live-receipt.json.
const DIR = "tools/integration/fixtures/geoice";
const ROM = JSON.parse(readFileSync(`${DIR}/rom-rows.json`, "utf8")) as {
  cases: Record<string, { startFrame: number; rows: number; romRowsSha256?: string[] }>;
};
const fixture = (name: string) => JSON.parse(readFileSync(`${DIR}/${name}.json`, "utf8")) as Fixture;
const ACCEPTED = {
  icyPlayer: geoiceGeometry("player", "SWINUB", "ONIX"), icyOpponent: geoiceGeometry("opponent", "SWINUB", "ONIX"),
  blizzardPlayer: geoiceGeometry("player", "PELIPPER", "ONIX"), blizzardOpponent: geoiceGeometry("opponent", "PELIPPER", "ONIX"),
};
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as BattleMoveAnimationRequest;

describe("S10A geoice: Icy Wind / Blizzard OAM slots derived from the allocator replay", () => {
  it("the accepted geometry reproduces the retained ROM slot capture exactly (both moves, both sides)", () => {
    for (const side of ["player", "opponent"] as const) {
      const icy = side === "player" ? ACCEPTED.icyPlayer : ACCEPTED.icyOpponent;
      const snowballs = new Map<number, number>(), spikes = new Map<number, number>();
      for (let age = 0; age < 287; age++) {
        const s = icyWindAtAge(age, side, icy);
        for (const b of s.snowballs) snowballs.set(b.callIndex, b.oamSlot);
        for (const b of s.spikes) spikes.set(b.callIndex, b.oamSlot);
      }
      expect([...snowballs].sort((a, b) => a[0] - b[0]).map(([, slot]) => slot)).toEqual(RETAINED_ICY_WIND_SLOTS.snowball);
      expect([...spikes].sort((a, b) => a[0] - b[0]).map(([, slot]) => slot)).toEqual(RETAINED_ICY_WIND_SLOTS.spike[side]);
      const bliz = side === "player" ? ACCEPTED.blizzardPlayer : ACCEPTED.blizzardOpponent;
      const kinds = { snowball: new Map<number, number>(), traveling: new Map<number, number>(), impact: new Map<number, number>() };
      for (let age = 0; age < (side === "player" ? 372 : 361); age++) {
        const s = blizzardAtAge(age, side, bliz);
        for (const b of s.snowballs) kinds.snowball.set(b.callIndex, b.oamSlot);
        for (const b of s.largeCrystals) kinds.traveling.set(b.callIndex, b.oamSlot);
        for (const b of s.impactCrystals) kinds.impact.set(b.callIndex, b.oamSlot);
      }
      const sorted = (m: Map<number, number>) => [...m].sort((a, b) => a[0] - b[0]).map(([, slot]) => slot);
      expect(sorted(kinds.snowball)).toEqual(RETAINED_BLIZZARD_SLOTS.snowball);
      expect(sorted(kinds.traveling)).toEqual(RETAINED_BLIZZARD_SLOTS.traveling[side]);
      expect(sorted(kinds.impact)).toEqual(RETAINED_BLIZZARD_SLOTS.impact);
    }
  });

  it("at the dense pairs the derived slots differ from the retained capture (the old gate declined them)", () => {
    const g = geoiceGeometry("player", "ONIX", "GOLBAT");
    const spikes = new Map<number, number>();
    for (let age = 0; age < 287; age++) for (const b of icyWindAtAge(age, "player", g).spikes) spikes.set(b.callIndex, b.oamSlot);
    expect([...spikes].sort((a, b) => a[0] - b[0]).map(([, slot]) => slot)).not.toEqual(RETAINED_ICY_WIND_SLOTS.spike.player);
  });

  it("the effect order is independent of the inherited sSpriteOrder except the Icy Wind spikes' pixel-disjoint key ties", () => {
    const permutations = [
      [...ICY_WIND_EFFECT_SPRITE_ORDER_SEED].reverse(), [4, 3, 5, 17, 16, 15, 14, 13, 12, 11, 10, 9, 7], // known entry (ROM, ice body first)
    ];
    const g = geoiceGeometry("opponent", "MASQUERAIN", "ONIX");
    for (const seed of permutations) {
      for (let age = 0; age < 287; age++) {
        const key = (seedArg?: readonly number[]) => icyWindEffectOamOrderAtAge(age, "opponent", g, seedArg).map(e => `${e.kind}${e.callIndex}`);
        const base = key(), other = key(seed);
        // Snowballs never tie; only spikes (one y, one subpriority) may reorder, and they sit in disjoint 8-px columns.
        expect(other.filter(k => k.startsWith("snowball")), `${age}`).toEqual(base.filter(k => k.startsWith("snowball")));
        expect([...other].sort(), `${age}`).toEqual([...base].sort());
        const spikes = icyWindAtAge(age, "opponent", g).spikes;
        expect(new Set(spikes.map(s => s.y)).size <= 1 && new Set(spikes.map(s => s.x)).size === spikes.length).toBe(true);
        expect(spikes.every((a, i) => spikes.every((b, j) => i === j || Math.abs(a.x - b.x) >= 8))).toBe(true);
      }
      for (const [side, bg] of [["player", geoiceGeometry("player", "CHARIZARD", "GOLBAT")], ["opponent", geoiceGeometry("opponent", "ZUBAT", "NIDOKING")]] as const) {
        const blizSeed = [...BLIZZARD_EFFECT_SPRITE_ORDER_SEED].reverse();
        for (let age = 0; age < 361; age += 3) {
          expect(blizzardEffectOamOrderAtAge(age, side, bg, blizSeed).map(e => e.oamSlot), `${side} ${age}`)
            .toEqual(blizzardEffectOamOrderAtAge(age, side, bg).map(e => e.oamSlot));
        }
      }
    }
  });

  it("the seam is live at the dense pairs and at a Blizzard geometry whose impact start is not the accepted 197 (lsbz: geometry-derived window)", () => {
    for (const name of ["icy-wind-player-onix-golbat", "icy-wind-opponent-masquerain-onix", "blizzard-player-charizard-golbat",
      "blizzard-opponent-zubat-nidoking"]) {
      const view = liveView(fixture(name), 0);
      const e = view.effect as unknown as { request: BattleMoveAnimationRequest };
      expect(liveMoveAnimationPresentation(e.request, view.field, 0), name).not.toBeNull();
    }
    // ARBOK -> CATERPIE (opponent): impact start 198 -> the ROM body is 361 rows from activation to the last active row
    // (controls/derivation.json). S10A lsbz: the live window is geometry-derived (impact + 164 = 362 rows), so the seam is live
    // (before lsbz it ended at the accepted 197 + 164 = 361 and declined); without a field the accepted 361 stays.
    const arbok = fixture("controls/blizzard-opponent-arbok-caterpie");
    expect(blizzardImpactStartAge("opponent", geoiceGeometry("opponent", "ARBOK", "CATERPIE"))).toBe(198);
    const view = liveView(arbok, 0);
    const arbokRequest = (view.effect as unknown as { request: BattleMoveAnimationRequest }).request;
    expect(liveMoveAnimationPresentation(arbokRequest, view.field, 0)).not.toBeNull();
    expect(liveMoveAnimationDuration(arbokRequest, view.field)).toBe(362);
    expect(liveMoveAnimationDuration(request(59, 1))).toBe(361);
    const derivation = JSON.parse(readFileSync(`${DIR}/controls/derivation.json`, "utf8")) as { case: string; altInterval: { start: number; end: number } }[];
    const interval = derivation.find(d => d.case === "blizzard-opponent-arbok-caterpie")!.altInterval;
    expect(interval.end - interval.start).toBe(361); // impact 197 bodies: 360 (BLASTOISE -> IVYSAUR, ZUBAT -> NIDOKING)
  });

  for (const name of ["icy-wind-player-onix-golbat", "icy-wind-opponent-masquerain-onix", "blizzard-player-charizard-golbat",
    "blizzard-opponent-zubat-nidoking"]) {
    it(`renders every ${name} row identically to the ROM through the production live renderer`, () => {
      const f = fixture(name), rom = ROM.cases[name]!;
      expect(rom.startFrame).toBe(f.denseWindow!.startFrame);
      const rows = f.denseWindow!.endFrame - f.denseWindow!.startFrame + 1;
      expect(rom.romRowsSha256).toHaveLength(rows);
      const rgba = new Uint8Array(240 * 160 * 4), rgb = new Uint8Array(240 * 160 * 3);
      const mismatches: number[] = [];
      for (let age = 0; age < rows; age++) {
        rgba.fill(0);
        renderBattleResolutionLiveView(rgba, liveView(f, age));
        for (let p = 0; p < 240 * 160; p++) { rgb[p * 3] = rgba[p * 4]!; rgb[p * 3 + 1] = rgba[p * 4 + 1]!; rgb[p * 3 + 2] = rgba[p * 4 + 2]!; }
        if (createHash("sha256").update(rgb).digest("hex") !== rom.romRowsSha256![age]) mismatches.push(age);
      }
      expect(mismatches).toEqual([]);
    }, 120_000);
  }
});
