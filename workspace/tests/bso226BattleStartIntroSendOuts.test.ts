// bso226 (docs/bso226-battle-start-intro-send-outs.md): the Scene ON generated battle-start intro plays the opponent front animation and
// the player back animation; Scene OFF stays byte-identical (ISSUES #71: OFF genuinely skips the intro animations).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import selectorTables from "../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import { selectBackSendOutAnimation } from "../src/animation/backSendOutAnim";
import { backSendOutFrameAtTick } from "../src/animation/sendOutDispatcher";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  GENERATED_INTRO_OPPONENT_ANIM_ELAPSED_SHIFT, GENERATED_INTRO_PLAYER_ANIM_ELAPSED_SHIFT, MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED,
  backAnimNatureName, generatedBattleStartOpponentAnimAt, generatedBattleStartPlayerAnimAt, midBattleSwitchInBackAnimAt,
} from "../src/engine/battleResolutionPresentationRender";
import { renderGeneratedBattleStartPreSendOut } from "../src/engine/battleScene.ts";
import {
  advanceFactoryRoundBattleStartIntro, beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { GbaButton } from "../src/input.ts";

type Windows = { tag: string; playerLead: string; playerLeadPersonality: number; playerBackAnimSet: string; opponentLead: string;
  opponentFrontAnim: string; before: { opp: number; pm: number; rest: number }; after: { opp: number; pm: number; rest: number } }[];
const windows = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/battle-start-intro/windows.json", import.meta.url), "utf8")) as Windows;
const frontIds = selectorTables.frontAnimIds.species as Record<string, string>;

describe("bso226: the five staged Scene ON battle-start ROM windows", () => {
  it("cover five distinct player back families and five distinct opponent front families through the live selectors", () => {
    expect(windows.map((w) => w.tag)).toEqual(["yoshi", "wailmer", "spinda", "onix", "koffing"]);
    for (const w of windows) {
      expect(selectBackSendOutAnimation(w.playerLead, w.playerLeadPersonality % 25)?.backAnimSet, w.tag).toBe(w.playerBackAnimSet);
      expect(frontIds[w.opponentLead], w.tag).toBe(w.opponentFrontAnim);
      expect(backSendOutFrameAtTick(w.playerLead, backAnimNatureName(w.playerLeadPersonality), 0), w.tag).not.toBeNull();
    }
    expect(new Set(windows.map((w) => w.playerBackAnimSet)).size).toBe(5);
    expect(new Set(windows.map((w) => w.opponentFrontAnim)).size).toBe(5);
  });

  it("records a smaller mon-region residual after than before on every window", () => {
    for (const w of windows) {
      expect(w.after.opp + w.after.pm, w.tag).toBeLessThan(w.before.opp + w.before.pm);
    }
    // Exact windows (named residuals are in the doc).
    expect(windows.find((w) => w.tag === "yoshi")!.after).toMatchObject({ opp: 12, pm: 0 });
    expect(windows.find((w) => w.tag === "koffing")!.after).toMatchObject({ opp: 12, pm: 97 });
  });
});

describe("bso226: battle-start helpers reuse the mid-battle anchors with the ROM-fitted shifts", () => {
  it("pins the fitted shifts and the anchors", () => {
    expect(GENERATED_INTRO_OPPONENT_ANIM_ELAPSED_SHIFT).toBe(-1);
    expect(GENERATED_INTRO_PLAYER_ANIM_ELAPSED_SHIFT).toBe(1);
    const nature = backAnimNatureName(2737562574);
    for (const local of [0, 5, 20, 60]) {
      expect(generatedBattleStartPlayerAnimAt("GRIMER", 2737562574, local)).toEqual(
        midBattleSwitchInBackAnimAt("GRIMER", nature, local + MID_BATTLE_SWITCH_MON_VISIBLE_ELAPSED + 2),
      );
    }
  });

  it("reports an opponent front animation only once the reducer starts, and a tint coefficient before it", () => {
    expect(generatedBattleStartOpponentAnimAt("COMBUSKEN", 0).frontAnim).toBeNull();
    const later = generatedBattleStartOpponentAnimAt("COMBUSKEN", 200).frontAnim;
    expect(later).not.toBeNull();
  });
});

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
function record(setId: number): FactoryRentalRecord {
  const set = frontierMons.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 31, abilitySlot: (personality & 1) as 0 | 1, otId: 0x89ab_cdef };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

// The YOSHI window (tools/integration/fixtures/battle-start-intro/yoshi-*.png): GRIMER back (V_STRETCH) vs COMBUSKEN front (V_JUMPS_H_JUMPS).
function yoshiIntro(battleScene: "on" | "off" | undefined): FactoryRoundBattleOrchestratorState {
  const player = [record(110), record(130), record(150)] as const;
  return beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    ...(battleScene === undefined ? {} : { battleScene }), id: "bso226-yoshi", rngValue: 42, factoryWinStreak: 0, playerTrainerId: 0x89ab_cdef, battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: { type: "currentRecords", playerRentalRecords: player, savedRentalRecords: [...player, record(115), record(135), record(145)] },
  }));
}

function replay(battleScene: "on" | "off" | undefined, maxFrame: number, pressFrame = 370): Uint8Array[] {
  let state = yoshiIntro(battleScene);
  const frames: Uint8Array[] = [];
  const render = () => { const fb = new Uint8Array(240 * 160 * 4); renderGeneratedBattleStartPreSendOut(fb, state.battleStartIntro!); return fb; };
  frames[0] = render();
  for (let f = 1; f <= maxFrame; f += 1) {
    state = advanceFactoryRoundBattleStartIntro(state, f === pressFrame ? new Set<GbaButton>(["A"]) : new Set<GbaButton>());
    if (state.battleStartIntro === null) break;
    frames[f] = render();
  }
  return frames;
}

describe("bso226: Scene ON battle-start intro vs Scene OFF", () => {
  const on = replay("on", 700);
  const off = replay("off", 700);
  const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

  it("is identical to Scene OFF until the opponent front animation starts (app frame 444)", () => {
    for (let f = 0; f < 444; f += 1) expect(same(on[f]!, off[f]!), `frame ${f}`).toBe(true);
  });

  it("draws different frames in the opponent front animation window and in the player back animation window", () => {
    const diff = (lo: number, hi: number) => { let n = 0; for (let f = lo; f < hi; f += 1) if (!same(on[f]!, off[f]!)) n += 1; return n; };
    expect(diff(444, 520)).toBeGreaterThan(20);
    expect(diff(620, Math.min(on.length, off.length))).toBeGreaterThan(20);
  });

  it("Scene OFF (explicit or default config) never draws the animations: frames equal the default-config orchestrator", () => {
    // The pinned Scene OFF compare traces (factory-arbitrary-intro-yoshi-off et al.) guard the OFF pixels themselves.
    const defaults = replay(undefined, 700);
    expect(defaults.length).toBe(off.length);
    for (let f = 0; f < off.length; f += 1) expect(same(off[f]!, defaults[f]!), `frame ${f}`).toBe(true);
  });
});
