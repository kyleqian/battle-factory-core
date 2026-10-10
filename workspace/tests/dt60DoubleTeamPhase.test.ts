import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import monAnimData3 from "../src/data/gen/dt60-mon-anim-data3.json" with { type: "json" };
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };
import { liveDoubleTeamAttackerStepCounter, liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// dt60 (ISSUES #158, docs/dt60-double-team-phase.md): Double Team's clones copy the attacker battler sprite, so AnimDoubleTeam's step
// counter starts at the sprite's data[3] (left by its send-out mon animation). Production renders only the source-derived 0 phase.
const PROBES = "tools/integration/fixtures/dt60/probes";
const symbolOf = (id: number) => (speciesStats.species as { id: number; name: string }[]).find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const FIRST_BODY_ORDER = { known: true as const, free: [4, 3, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] };
const fixture = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Fixture;
const liveAt0 = (path: string) => {
  const v = liveView(fixture(path), 0);
  const e = v.effect!;
  if (e.type !== "move") throw new Error("expected a move effect");
  return liveMoveAnimationPresentation(e.request, v.field, 0, e.paletteInput, e.spriteAllocatorInput, FIRST_BODY_ORDER) !== null;
};

describe("dt60 Double Team clone phase gate", () => {
  it("classifies the send-out animations from source (static call graph)", () => {
    const anims = monAnimData3.anims as Record<string, { writesData3: boolean }>;
    expect(Object.keys(anims)).toHaveLength(151);
    expect(Object.values(anims).filter((a) => !a.writesData3)).toHaveLength(96);
    expect(anims.ANIM_V_SHAKE_BACK_FAST!.writesData3).toBe(false); // ONIX player (accepted route)
    expect(anims.ANIM_CONCAVE_ARC_SMALL!.writesData3).toBe(true); // CHANSEY player RELAXED
    expect(anims.ANIM_V_SQUISH_AND_BOUNCE_SLOW!.writesData3).toBe(true); // CHANSEY opponent
  });

  it("derives the attacker sprite's data[3] = 0 only for animations that never write it", () => {
    expect(liveDoubleTeamAttackerStepCounter("player", "ONIX", 3)).toBe(0); // ADAMANT -> V_SHAKE_BACK_FAST
    expect(liveDoubleTeamAttackerStepCounter("player", "ONIX", 25 * 7 + 3)).toBe(0);
    expect(liveDoubleTeamAttackerStepCounter("player", "ONIX", undefined)).toBeNull();
    expect(liveDoubleTeamAttackerStepCounter("player", "CHANSEY", 7)).toBeNull();
    expect(liveDoubleTeamAttackerStepCounter("player", "SHUCKLE", 23)).toBeNull();
    expect(liveDoubleTeamAttackerStepCounter("player", "METAGROSS", 3)).toBe(0);
    expect(liveDoubleTeamAttackerStepCounter("opponent", "CHANSEY", undefined)).toBeNull();
    expect(liveDoubleTeamAttackerStepCounter("opponent", "GARDEVOIR", undefined)).toBeNull();
    expect(liveDoubleTeamAttackerStepCounter("opponent", "DRAGONAIR", undefined)).toBe(0);
    expect(liveDoubleTeamAttackerStepCounter("opponent", "ARBOK", undefined)).toBe(0);
  });

  it("agrees with every RAM-probed Double Team activation (derived 0 => measured 0; measured != 0 => not derived)", () => {
    let checked = 0;
    for (const name of readdirSync(PROBES).filter((n) => n.endsWith(".json"))) {
      const probe = JSON.parse(readFileSync(join(PROBES, name), "utf8"));
      const scenarioPath = [`tools/integration/fixtures/dt60/scenarios/${probe.scenario}`, `tools/integration/fixtures/audit-16/scenarios/${probe.scenario}`,
        `tools/integration/fixtures/prep7-scenarios/${probe.scenario}`].find((p) => { try { readFileSync(p); return true; } catch { return false; } })!;
      const parties = JSON.parse(readFileSync(scenarioPath, "utf8")).overrides.parties;
      for (const body of probe.bodies) {
        const side = body.attacker === 0 ? "player" : "opponent";
        const lead = parties[side][0];
        const species = symbolOf(lead.species);
        expect(body.species[body.attacker]).toBe(lead.species);
        const measured = body.pre.battlers[body.attacker].data[3] as number;
        const derived = liveDoubleTeamAttackerStepCounter(side, species, lead.nature);
        if (derived === 0) expect(measured, `${name} ${species}`).toBe(0);
        if (measured !== 0) expect(derived, `${name} ${species}`).toBeNull();
        // the clones inherit it: data[3] after the first callback is (d >= 1 ? 0 : d + 1)
        const clone = body.rows[1].clones[0];
        expect(clone.data[3]).toBe(measured >= 1 ? 0 : measured + 1);
        expect(clone.data[0]).toBe(measured >= 1 ? 1 : 0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(28);
  });

  it("keeps the proven zero-phase routes live and declines the one-call-ahead species", () => {
    expect(liveAt0("tools/integration/fixtures/audit-16/ablation/onix-dt-c1.json")).toBe(true);
    for (const n of ["opp-umbreon", "opp-scyther", "opp-walrein", "ply-umbreon", "ply-metagross", "ply-dusclops"]) {
      expect(liveAt0(`tools/integration/fixtures/dt60/fixtures/dt60-${n}-c0.json`), n).toBe(true);
    }
    expect(liveAt0("tools/integration/fixtures/audit-16/fixtures/i152-arbok-double-team-c0.json")).toBe(true);
    for (const path of ["tools/integration/fixtures/audit-16/fixtures/ctl-double-team-ply-c0.json",
      "tools/integration/fixtures/audit-16/fixtures/ctl-double-team-opp-c0.json",
      "tools/integration/fixtures/dt60/fixtures/dt60-opp-gardevoir-c0.json", "tools/integration/fixtures/dt60/fixtures/dt60-ply-scyther-c0.json",
      "tools/integration/fixtures/dt60/fixtures/dt60-ply-shuckle-c0.json", "tools/integration/fixtures/dt60/fixtures/dt60-opp-clefable-c0.json"]) {
      expect(liveAt0(path), path).toBe(false);
    }
  });
});
