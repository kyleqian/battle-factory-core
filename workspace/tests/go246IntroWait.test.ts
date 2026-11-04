// go246 (docs/go246-intro-wait.md): the Scene ON battle-start intro waits for the opponent front animation before the player's
// "Go! <mon>!" dispatch and for the player back animation before the first action menu (Intro_TryShinyAnimShowHealthbox, both
// controllers); Scene OFF skips both animations and keeps the cry-bound timeline.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  GENERATED_INTRO_OPPONENT_FRAME_ANIM_TO_DISPATCH, GENERATED_INTRO_OPPONENT_FUNCTION_ANIM_TO_DISPATCH, GENERATED_INTRO_PLAYER_BACK_ANIM_TO_READY,
  generatedIntroOpponentAnimHold, generatedIntroPlayerAnimHold,
} from "../src/engine/battleResolutionPresentationRender";
import { generatedBattleStartCommandReady, generatedBattleStartPlayerReleaseStarted } from "../src/engine/battleScene.ts";
import {
  advanceFactoryRoundBattleStartIntro, beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { GbaButton } from "../src/input.ts";

type Window = { tag: string; seed: number; playerSetIds: number[]; playerPersonalities: number[]; parentDispatchLag: number | null;
  menuLagAfterOpponentHold: number | null; menuLagAfter: number; sceneOffMenuLag: number | null;
  beforeLag0: { opp: number; pm: number }; afterMenuLag6: { opp: number; pm: number } };
const windows = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/go246/intro-windows.json", import.meta.url), "utf8")) as Window[];

// Cry-bound dispatch delays (101 + cry - GROVYLE's 58) of the measured opponent leads.
const OPPONENT = { COMBUSKEN: [281, 125], SABLEYE: [322, 76], RATICATE: [20, 70], ELEKID: [239, 73], BUTTERFREE: [12, 72], SPOINK: [351, 64], ARON: [382, 69], POLIWHIRL: [61, 62], GROVYLE: [278, 101] } as const;

describe("go246: ROM-fitted intro holds", () => {
  it("pins the fitted constants", () => {
    expect(GENERATED_INTRO_OPPONENT_FUNCTION_ANIM_TO_DISPATCH).toBe(44);
    expect(GENERATED_INTRO_OPPONENT_FRAME_ANIM_TO_DISPATCH).toBe(43);
    expect(GENERATED_INTRO_PLAYER_BACK_ANIM_TO_READY).toBe(5);
  });

  it("opponent hold = the ROM's measured \"Go!\" lag behind the cry-bound dispatch (bso226 windows, SPOINK, ARON)", () => {
    const hold = (name: keyof typeof OPPONENT) => generatedIntroOpponentAnimHold(OPPONENT[name][0], OPPONENT[name][1]);
    // bso226's fitted --lag values: wailmer 98, spinda 39, onix 45, koffing 74, yoshi none.
    expect(hold("SABLEYE")).toBe(98);
    expect(hold("RATICATE")).toBe(39);
    expect(hold("ELEKID")).toBe(45);
    expect(hold("BUTTERFREE")).toBe(74);
    expect(hold("COMBUSKEN")).toBe(0);
    // Kyle's report: SPOINK's ANIM_H_JUMPS_V_STRETCH_TWICE ran 137 frames past the app's "Go!".
    expect(hold("SPOINK")).toBe(137);
    expect(hold("ARON")).toBe(128);
    // POLIWHIRL: the sMonAnimationDelayTable term (A 74 + delay 5 - 1 = 78 + 44 beats S 75 + 43); exact at lag 0 (doc section 4).
    expect(hold("POLIWHIRL")).toBe(60);
    // The canonical-anchor opponent (interactive-generated-intro) is cry-bound: no hold.
    expect(hold("GROVYLE")).toBe(0);
  });

  it("player hold = the ROM's measured menu lag minus the scene-independent 6 (Scene OFF has the same 6)", () => {
    const byTag = new Map(windows.map((w) => [w.tag, w]));
    const cry: Record<string, number> = { GRIMER: 30, KOFFING: 58, SPINDA: 35, ONIX: 70, WAILMER: 80 };
    const species: Record<string, number> = { GRIMER: 88, KOFFING: 109, SPINDA: 308, ONIX: 95, WAILMER: 313 };
    for (const [tag, lead] of [["yoshi", "GRIMER"], ["spoink", "GRIMER"], ["aron", "GRIMER"], ["koffing", "KOFFING"], ["spinda", "SPINDA"], ["onix", "ONIX"], ["wailmer", "WAILMER"]] as const) {
      const w = byTag.get(tag)!;
      const hold = generatedIntroPlayerAnimHold(species[lead]!, w.playerPersonalities[0]!, cry[lead]!);
      expect(hold, tag).toBe(w.menuLagAfterOpponentHold! - 6);
      expect(w.menuLagAfter, tag).toBe(6);
    }
    for (const w of windows) if (w.sceneOffMenuLag !== null) expect(w.sceneOffMenuLag, w.tag).toBe(6);
  });

  it("every window's mon-region residual shrinks; SPOINK's player half is exact", () => {
    for (const w of windows) expect(w.afterMenuLag6.opp + w.afterMenuLag6.pm, w.tag).toBeLessThan(w.beforeLag0.opp + w.beforeLag0.pm);
    expect(windows.find((w) => w.tag === "spoink")!.afterMenuLag6).toMatchObject({ opp: 132, pm: 0 });
    expect(windows.find((w) => w.tag === "yoshi")!.afterMenuLag6).toMatchObject({ opp: 12, pm: 0 });
  });
});

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
function record(setId: number, personality?: number): FactoryRentalRecord {
  const set = frontierMons.entries[setId]!;
  const p = personality ?? natureByName.get(set.nature)!;
  const input = { setId, personality: p, fixedIv: 31, abilitySlot: (p & 1) as 0 | 1, otId: 0x89ab_cdef };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

// The SPOINK window: seed 8, GRIMER lead (personality from the ROM capture) vs SPOINK (ANIM_H_JUMPS_V_STRETCH_TWICE).
function spoinkMilestones(battleScene: "on" | "off"): { dispatch: number; ready: number } {
  const w = windows.find((x) => x.tag === "spoink")!;
  const player = w.playerSetIds.map((id, i) => record(id, w.playerPersonalities[i])) as unknown as readonly [FactoryRentalRecord, FactoryRentalRecord, FactoryRentalRecord];
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    battleScene, id: "go246-spoink", rngValue: w.seed, factoryWinStreak: 0, playerTrainerId: 0x89ab_cdef, battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: { type: "currentRecords", playerRentalRecords: player, savedRentalRecords: [...player, record(115), record(135), record(145)] },
  }));
  let dispatch = -1;
  for (let f = 1; f <= 1200; f += 1) {
    const before = state.battleStartIntro!;
    if (dispatch < 0 && generatedBattleStartPlayerReleaseStarted(before)) dispatch = f - 1;
    if (generatedBattleStartCommandReady(before)) return { dispatch, ready: f - 1 };
    state = advanceFactoryRoundBattleStartIntro(state, f === 388 ? new Set<GbaButton>(["A"]) : new Set<GbaButton>());
    if (state.battleStartIntro === null) return { dispatch, ready: f };
  }
  throw new Error("intro never became ready");
}

describe("go246: production intro clock (SPOINK window)", () => {
  it("Scene ON holds \"Go!\" 137 frames and the menu 137 + 6 frames later than Scene OFF", () => {
    const on = spoinkMilestones("on");
    const off = spoinkMilestones("off");
    expect(on.dispatch - off.dispatch).toBe(137);
    expect(on.ready - off.ready).toBe(137 + 6);
  });
});
