import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import monAnimData3 from "../src/data/gen/dt60-mon-anim-data3.json" with { type: "json" };
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };
import { liveDoubleTeamAttackerStepCounter, liveMoveAnimationPresentation } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// dt60 (ISSUES #158, docs/dt60-double-team-phase.md): Double Team's clones copy the attacker battler sprite, so AnimDoubleTeam's step
// counter starts at the sprite's data[3] (left by its send-out mon animation, executed from source). >= 1 renders one call ahead.
const PROBES = "tools/integration/fixtures/dt60/probes";
const symbolOf = (id: number) => (speciesStats.species as { id: number; name: string }[]).find((s) => s.id === id)!.name.replace(/^SPECIES_/, "");
const FIRST_BODY_ORDER = { known: true as const, free: [4, 3, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22] };
const fixture = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Fixture;
const profileAt0 = (path: string) => {
  const v = liveView(fixture(path), 0);
  const e = v.effect!;
  if (e.type !== "move") throw new Error("expected a move effect");
  const state = liveMoveAnimationPresentation(e.request, v.field, 0, e.paletteInput, e.spriteAllocatorInput, FIRST_BODY_ORDER);
  if (state === null) return null;
  if (state.config.move !== "DOUBLE_TEAM") throw new Error("expected Double Team");
  const { cloneAnchorAge, cloneVisibleEndAge } = state.config.animationProfile;
  return { cloneAnchorAge, cloneVisibleEndAge };
};
const ACCEPTED = { cloneAnchorAge: 0, cloneVisibleEndAge: 129 };
const AHEAD = { cloneAnchorAge: -1, cloneVisibleEndAge: 128 };

describe("dt60 Double Team clone phase gate", () => {
  it("derives each send-out animation's data[3] from source (static call graph and executed source agree)", () => {
    const anims = monAnimData3.anims as Record<string, { writesData3: boolean; finalData3: number }>;
    expect(Object.keys(anims)).toHaveLength(151);
    expect(Object.values(anims).filter((a) => !a.writesData3)).toHaveLength(96);
    for (const a of Object.values(anims)) if (!a.writesData3) expect(a.finalData3).toBe(0);
    expect(anims.ANIM_V_SHAKE_BACK_FAST).toMatchObject({ writesData3: false, finalData3: 0 }); // ONIX player (accepted route)
    expect(anims.ANIM_CONCAVE_ARC_SMALL).toMatchObject({ writesData3: true, finalData3: 6 }); // CHANSEY player RELAXED
    expect(anims.ANIM_V_SQUISH_AND_BOUNCE_SLOW).toMatchObject({ writesData3: true, finalData3: 124 }); // CHANSEY opponent
    expect(anims.ANIM_TUMBLING_FRONT_FLIP!.finalData3).toBe(-1);
  });

  it("derives the attacker sprite's data[3] from species, side and (player) nature", () => {
    expect(liveDoubleTeamAttackerStepCounter("player", "ONIX", 3)).toBe(0); // ADAMANT -> V_SHAKE_BACK_FAST
    expect(liveDoubleTeamAttackerStepCounter("player", "ONIX", 25 * 7 + 3)).toBe(0);
    expect(liveDoubleTeamAttackerStepCounter("player", "ONIX", undefined)).toBeNull();
    expect(liveDoubleTeamAttackerStepCounter("player", "CHANSEY", 7)).toBe(6);
    expect(liveDoubleTeamAttackerStepCounter("player", "SHUCKLE", 23)).toBe(1);
    expect(liveDoubleTeamAttackerStepCounter("player", "METAGROSS", 3)).toBe(0);
    expect(liveDoubleTeamAttackerStepCounter("opponent", "CHANSEY", undefined)).toBe(124);
    expect(liveDoubleTeamAttackerStepCounter("opponent", "GARDEVOIR", undefined)).toBe(120);
    expect(liveDoubleTeamAttackerStepCounter("opponent", "CLEFABLE", undefined)).toBe(0);
    expect(liveDoubleTeamAttackerStepCounter("opponent", "DRAGONAIR", undefined)).toBe(0);
    expect(liveDoubleTeamAttackerStepCounter("opponent", "ARBOK", undefined)).toBe(0);
    expect(liveDoubleTeamAttackerStepCounter("opponent", "MAGNEMITE", undefined)).toBe(-1);
  });

  it("equals every RAM-probed Double Team activation's battler data[3]", () => {
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
        expect(derived, `${name} ${species}`).toBe(measured);
        // the clones inherit it: data[3] after the first callback is (d >= 1 ? 0 : d + 1)
        const clone = body.rows[1].clones[0];
        expect(clone.data[3]).toBe(measured >= 1 ? 0 : measured + 1);
        expect(clone.data[0]).toBe(measured >= 1 ? 1 : 0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(28);
  });

  it("renders the accepted phase at data[3] == 0 and one call ahead at data[3] >= 1", () => {
    expect(profileAt0("tools/integration/fixtures/audit-16/ablation/onix-dt-c1.json")).toEqual(ACCEPTED);
    expect(profileAt0("tools/integration/fixtures/audit-16/fixtures/i152-arbok-double-team-c0.json")).toEqual(ACCEPTED);
    for (const n of ["opp-umbreon", "opp-scyther", "opp-walrein", "opp-clefable", "ply-umbreon", "ply-metagross", "ply-dusclops"]) {
      expect(profileAt0(`tools/integration/fixtures/dt60/fixtures/dt60-${n}-c0.json`), n).toEqual(ACCEPTED);
    }
    for (const path of ["tools/integration/fixtures/audit-16/fixtures/ctl-double-team-ply-c0.json",
      "tools/integration/fixtures/audit-16/fixtures/ctl-double-team-opp-c0.json",
      "tools/integration/fixtures/audit-16/fixtures/outrage-double-team-ply-c3.json",
      "tools/integration/fixtures/dt60/fixtures/dt60-opp-gardevoir-c0.json", "tools/integration/fixtures/dt60/fixtures/dt60-ply-scyther-c0.json",
      "tools/integration/fixtures/dt60/fixtures/dt60-ply-shuckle-c1.json"]) {
      expect(profileAt0(path), path).toEqual(AHEAD);
    }
    // data[3] < 0 (TUMBLING_FRONT_FLIP: MAGNEMITE's front anim, -1) is not proven: decline.
    const umbreon = fixture("tools/integration/fixtures/dt60/fixtures/dt60-opp-umbreon-c0.json");
    const magnemite = { ...umbreon, attacker: { ...umbreon.attacker, species: "MAGNEMITE" } };
    const v = liveView(magnemite, 0);
    const e = v.effect!;
    if (e.type !== "move") throw new Error("expected a move effect");
    expect(liveMoveAnimationPresentation(e.request, v.field, 0, e.paletteInput, e.spriteAllocatorInput, FIRST_BODY_ORDER)).toBeNull();
  });
});
