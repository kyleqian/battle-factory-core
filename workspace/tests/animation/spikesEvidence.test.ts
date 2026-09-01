import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../../tools/compare/fixtures/spikes-evidence.json" with { type: "json" };
import { verifySpikesEvidence } from "../../tools/compare/spikesEvidence.ts";

type Mon = Record<string, unknown> & { species: number; moves: number[]; item: number };

describe("MOVE_SPIKES bilateral dense evidence checkpoint", () => {
  it("pins the full source body, half-open ROM interval, asset/template, and lowest Level-50 carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", fixture.source.audit,
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      move: "MOVE_SPIKES", moveId: 191,
      sourceBounds: { start: "0x082d18cd", endExclusive: "0x082d1924", byteLength: 87, sha256: "298cbadac0aef90b702035bcce3ab005bc05be84b312d4b9d77fd313e960929f", pointerContract: "half-open-byte-interval" },
      graph: { blocks: ["Move_SPIKES"], components: ["asset:ANIM_TAG_SPIKES", "sprite:gSpikesSpriteTemplate", "visualCommand:clearmonbg", "visualCommand:monbg"] },
      carrier: { frontierMon: "FRONTIER_MON_QWILFISH_1", setId: 211, speciesId: 211, itemId: 133, nature: "NATURE_IMPISH" },
      templates: ["gSpikesSpriteTemplate"],
      callbacks: ["AnimSpikes", "AnimSpikes_Step1", "WaitAnimForDuration", "AnimSpikes_Step2", "DestroyAnimSprite"],
      affine: "off-only; gOamData_AffineOff_ObjNormal_16x16; no fresh-affine credit",
      audio: { launch: { soundEffect: "SE_M_JUMP_KICK", id: 143, calls: 2 }, landing: { soundEffect: "SE_M_HORN_ATTACK", id: 166, delayedCalls: 3, delay: 28 } },
    });
    expect(audit.commands).toEqual([
      "loadspritegfx ANIM_TAG_SPIKES", "monbg ANIM_DEF_PARTNER", "playsewithpan SE_M_JUMP_KICK, SOUND_PAN_ATTACKER",
      "waitplaysewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 28", "createsprite gSpikesSpriteTemplate, ANIM_TARGET, 2, 20, 0, 0, 24, 30",
      "delay 10", "playsewithpan SE_M_JUMP_KICK, SOUND_PAN_ATTACKER", "waitplaysewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 28",
      "createsprite gSpikesSpriteTemplate, ANIM_TARGET, 2, 20, 0, -24, 24, 30", "delay 10",
      "waitplaysewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET, 28", "createsprite gSpikesSpriteTemplate, ANIM_TARGET, 2, 20, 0, 24, 24, 30",
      "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "end",
    ]);
  });

  it("replays retained dense state, RGB, normalized maps, source cursors, lifecycles, latches, and cleanup", () => {
    const result = verifySpikesEvidence();
    for (const [side, window] of [["player-back", { startFrame: 67, endFrame: 180 }], ["opponent-front", { startFrame: 71, endFrame: 184 }]] as const) {
      expect(result[side]).toMatchObject({
        sourceWindow: { ...window, frameCount: 114 },
        lifecycle: { creates: "7/19/31", destroys: "84/96/108", sprites: 3 },
        latches: { oam: "113/113", matrices: "113/113", palette: "112/113 + same-row age 4 monbg" },
        sourceRows: 114, rawRgbRows: 114, gameplayRngTransitions: 0, animationRngTransitions: 111, framebufferCompared: true,
      });
      const orientation = fixture.orientations[side];
      expect(orientation.probeJsonSha256).toBe(orientation.repeatProbeJsonSha256);
      expect(orientation.changeMapSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(fixture).toMatchObject({
      status: "exact", coverageCredit: true,
      components: ["asset:ANIM_TAG_SPIKES", "sprite:gSpikesSpriteTemplate", "visualCommand:monbg", "visualCommand:clearmonbg"],
      acceptance: { observedPointerParities: [0, 1], sourceCreationAges: [7, 19, 31], sourceDestroyAges: [84, 96, 108], firstInactiveCleanupAge: 113, affine: "off-only; no fresh-affine credit", reducerRows: 228, typedSeamRows: 228, productionFramebufferRows: 228, framebufferCompared: true },
      evidenceScope: { productionAnimationChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, framebufferCompared: true, coveragePromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true, twiceFreshByteIdentical: true },
      repeatability: { runsPerOrientation: 2, allMatched: true },
      productionAcceptance: { reducerRows: "114/114 + 114/114", typedSeamRows: "114/114 + 114/114", productionFramebufferRows: "114/114 + 114/114", productionFramebufferResidualPixels: 0, manualQueue: null },
    });
  });

  it("stages complete legal parties and grants no sibling or gameplay credit", () => {
    for (const side of ["player-back", "opponent-front"] as const) {
      const scenario = JSON.parse(readFileSync(fixture.orientations[side].scenario, "utf8")) as Record<string, any>;
      expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 1, battleNum: 0 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      const parties = scenario.overrides.parties as { player: Mon[]; opponent: Mon[] };
      const carrier = side === "player-back" ? parties.player[0] : parties.opponent[0];
      const target = side === "player-back" ? parties.opponent[0] : parties.player[0];
      expect(carrier).toMatchObject({ species: 211, nature: 8, item: 133, abilitySlot: 0, moves: [191, 191, 191, 191], ppUps: [0, 0, 0, 0], friendship: 70, gender: "male", shiny: false });
      expect(target).toMatchObject({ species: 95, nature: 23, item: 200, moves: [33, 33, 33, 33] });
      for (const party of [parties.player, parties.opponent]) {
        expect(party).toHaveLength(3);
        expect(new Set(party.map((mon) => mon.species)).size).toBe(3);
        expect(new Set(party.map((mon) => mon.item)).size).toBe(3);
        for (const mon of party) {
          expect(mon).toMatchObject({ level: 50, ppUps: [0, 0, 0, 0], friendship: 70, shiny: false });
          expect(Object.keys(mon.ivs as Record<string, number>)).toHaveLength(6);
          expect(Object.keys(mon.evs as Record<string, number>)).toHaveLength(6);
          for (const transient of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) expect(mon).not.toHaveProperty(transient);
        }
      }
    }
    expect(fixture.controls).toEqual({
      megahorn: "adjacent source-boundary control only; no shared acceptance",
      spikeCannon: "name-neighbor control only; no shared acceptance",
      hazardOwnership: "Spikes side-condition gameplay remains outside this animation evidence checkpoint",
    });
  });

  it("records MOVE_SPIKES alone as exact and fulfills its non-exclusive component track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(222);
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "partial"))
      .toEqual([]);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SPIKES")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual([]);
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "spikes-target-arc")).toEqual({
      id: "spikes-target-arc", representatives: ["MOVE_SPIKES"],
      components: ["asset:ANIM_TAG_SPIKES", "sprite:gSpikesSpriteTemplate", "visualCommand:monbg", "visualCommand:clearmonbg"],
      fulfilled: true,
      goal: "FULFILLED: MOVE_SPIKES independently passes 114/114 player-back plus 114/114 opponent-front source/component/reducer/typed-seam/raw-RGB/shared-production-framebuffer rows (228/228 total) through first inactive cleanup with zero residual pixels. The source-relative compositor uses extracted ANIM_TAG_SPIKES art, typed live species/sides/geometry, generic back/front art, predecessor OAM/matrix latches, the age-4 monbg palette handoff, source painter order, chrome, audio timing, and cleanup without RGB/framebuffer replay or hazard gameplay ownership. MOVE_MEGAHORN and MOVE_SPIKE_CANNON remain independent controls only.",
    });
  });
});
