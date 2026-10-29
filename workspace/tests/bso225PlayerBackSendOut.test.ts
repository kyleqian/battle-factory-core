// bso225 (docs/bso225-player-back-send-out.md): the Scene ON player send-in draws the species' back send-out animation.
// Pins the (species, nature) -> back-animation selector, the ROM-fitted start tick, Factory reducer coverage, and that Scene OFF
// (and an opponent send-in) draws no back animation.
import { describe, expect, it } from "vitest";
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import { BACK_ANIM_NATURE_ORDER, selectBackSendOutAnimation } from "../src/animation/backSendOutAnim";
import { backSendOutFrameAtTick } from "../src/animation/sendOutDispatcher";
import {
  MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED, backAnimNatureName, createBattleResolutionPresentationRenderView,
  midBattleSwitchInAt, midBattleSwitchInBackAnimAt,
} from "../src/engine/battleResolutionPresentationRender";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants";

const pick = (species: string, natureId: number) => selectBackSendOutAnimation(species, natureId);
const family = (species: string, nature: string) => pick(species, BACK_ANIM_NATURE_ORDER.indexOf(nature))?.backAnimSet;

describe("bso225: back send-out selector (3 * GetSpeciesBackAnimSet + nature mod) and the reducers' start tick", () => {
  it("maps (species, nature) to the ROM-proven families", () => {
    // The five staged ROM windows (tools/integration/fixtures/back-send-out/summary.json); nature 6 = NATURE_DOCILE.
    expect(BACK_ANIM_NATURE_ORDER[6]).toBe("NATURE_DOCILE");
    expect(backAnimNatureName(6)).toBe("NATURE_DOCILE");
    expect(backAnimNatureName(6 + 25)).toBe("NATURE_DOCILE"); // GetNature = personality % 25
    expect(backAnimNatureName(undefined)).toBe(BACK_ANIM_NATURE_ORDER[0]);
    const families = ["SHEDINJA", "SKARMORY", "ALAKAZAM", "ONIX", "ENTEI"].map((s) => family(s, "NATURE_DOCILE"));
    expect(families.every((f) => typeof f === "string")).toBe(true);
    expect(new Set(families).size).toBe(5);
    // selector = 3 * GetSpeciesBackAnimSet(species) + sBackAnimNatureModTable[nature]
    expect(pick("BULBASAUR", 0)).toMatchObject({ backAnimSet: "BACK_ANIM_DIP_RIGHT_SIDE", natureMod: 0, selector: "ANIM_H_DIP_TWICE" });
    expect(pick("BULBASAUR", 10)).toMatchObject({ backAnimSet: "BACK_ANIM_DIP_RIGHT_SIDE", natureMod: 2, selector: "ANIM_H_DIP_FAST" });
    expect(pick("TORKOAL", 0)).toMatchObject({ backAnimSet: "BACK_ANIM_SHAKE_GLOW_RED", natureMod: 0, selector: "ANIM_SHAKE_GLOW_RED_FAST" });
    expect(pick("TORKOAL", 10)).toMatchObject({ natureMod: 2, selector: "ANIM_SHAKE_GLOW_RED_SLOW" });
    expect(pick("SKARMORY", 6)).toMatchObject({ backAnimSet: "BACK_ANIM_JOLT_RIGHT", natureMod: 1, selector: "ANIM_JOLT_RIGHT" });
    expect(pick("ENTEI", 6)).toMatchObject({ backAnimSet: "BACK_ANIM_SHAKE_GLOW_RED", natureMod: 1, selector: "ANIM_SHAKE_GLOW_RED" });
  });

  it("covers every Factory (species, nature) pair with a banked reducer", () => {
    const pairs = new Map<string, [string, string]>();
    for (const e of frontierMons.entries as { species: string; nature: string }[]) {
      pairs.set(`${e.species}/${e.nature}`, [e.species.replace(/^SPECIES_/, ""), e.nature]);
    }
    expect(pairs.size).toBe(625);
    const missing = [...pairs.values()].filter(([s, n]) => backSendOutFrameAtTick(s, n, 0) === null).map(([s, n]) => `${s}/${n}`);
    expect(missing).toEqual([]);
  });

  it("starts the reducer at view elapsed 66 and reports nothing before it", () => {
    expect(MID_BATTLE_SWITCH_BACK_ANIM_START_ELAPSED).toBe(66);
    expect(midBattleSwitchInBackAnimAt("SKARMORY", "NATURE_DOCILE", 65)).toBeNull();
    const first = midBattleSwitchInBackAnimAt("SKARMORY", "NATURE_DOCILE", 66)!;
    const tick0 = backSendOutFrameAtTick("SKARMORY", "NATURE_DOCILE", 0)!;
    expect(first.x2).toBe(tick0.x2);
    expect(first.y2).toBe(tick0.y2);
    const later = midBattleSwitchInBackAnimAt("SKARMORY", "NATURE_DOCILE", 66 + 9)!;
    expect(later.x2).toBe(backSendOutFrameAtTick("SKARMORY", "NATURE_DOCILE", 9)!.x2);
  });
});

const mon = (side: "player" | "trainer", battler: 0 | 1, species: number, name: string, personality: number) => Object.freeze({
  species, name, side, battler, partyIndex: 0, level: 50, hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const,
  personality, moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
});

describe("bso225: Scene OFF / opponent / no-rules draw no back animation", () => {
  it("midBattleSwitchInAt: back animation only for a player send-in given the inputs", () => {
    const withBack = midBattleSwitchInAt(100, 0, undefined, undefined, { species: "SKARMORY", nature: "NATURE_DOCILE" });
    expect(withBack.backAnim).not.toBeNull();
    expect(midBattleSwitchInAt(100, 0).backAnim).toBeNull();
    expect(midBattleSwitchInAt(100, 1, undefined, undefined, { species: "SKARMORY", nature: "NATURE_DOCILE" }).backAnim).toBeNull();
  });

  const player = mon("player", 0, 227, "SKARMORY", 6);
  const opponent = mon("trainer", 1, 244, "ENTEI", 6);
  const field = Object.freeze({ player, opponent });
  const command = Object.freeze({
    type: "switch-in", eventSequence: 1, battler: 0, fromPartyIndex: 0, toPartyIndex: 0, incoming: player, incomingStatus1: 0,
    timing: { minimumFrames: 200 }, settleHoldFrames: 7,
  });
  const viewWith = (hitMarker: number | null, elapsed: number) => createBattleResolutionPresentationRenderView({
    field,
    segments: [{ field, beforeRules: hitMarker === null ? null : { rulesContext: { hitMarker } }, afterRules: null, events: [], commands: [command] }],
    segmentIndex: 0, commandIndex: 0, lifecycle: { phase: "presenting", phaseElapsed: elapsed },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
  } as never);
  const frame = (view: ReturnType<typeof viewWith>) => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, view);
    return fb;
  };

  it("the render view carries a back animation on Scene ON only", () => {
    const on = viewWith(0, 100).midBattleSwitchIn;
    expect(on?.backAnim).not.toBeNull();
    expect(viewWith(BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS, 100).midBattleSwitchIn?.backAnim).toBeNull();
    expect(viewWith(null, 100).midBattleSwitchIn?.backAnim).toBeNull();
    expect(viewWith(0, 20).midBattleSwitchIn?.backAnim).toBeNull(); // before the ROM callback starts
  });

  it("Scene OFF and the no-rules path render the same frames; Scene ON draws a different mon once the animation moves it", () => {
    let differs = 0;
    for (let e = 66; e < 140; e += 1) {
      const off = frame(viewWith(BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS, e));
      expect(Buffer.from(off).equals(Buffer.from(frame(viewWith(null, e)))), `elapsed ${e}`).toBe(true);
      if (!Buffer.from(off).equals(Buffer.from(frame(viewWith(0, e))))) differs += 1;
    }
    expect(differs).toBeGreaterThan(0);
  });
});
