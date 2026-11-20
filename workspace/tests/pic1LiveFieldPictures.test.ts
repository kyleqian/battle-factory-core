// pic1 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): a faint-replacement send-in of a live MAGBY draws the live field.
// Kyle's IVYSAUR fainted and he sent MAGBY (65/138) against DELIBIRD; the forced send-out drew the canonical sample battle's recorded
// field (MURKROW) and its full-HP MAGBY healthbox because the renderer took `name === "MAGBY" && species === 240` for the sample battle.
// The ROM has no such branch: the send-out (pokeball.c SpriteCB_PlayerMonSendOut_1/_2, keyed only on the mon's Y_PIC_OFFSET) and the
// healthbox (UpdateHealthBarsAttribute from gBattleMons[battler].hp) read the battler that is actually there.
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation";
import { createBattleResolutionPresentationRenderView, playerFaintReplacementSendOutTimingOfSegment } from "../src/engine/battleResolutionPresentationRender";
import { renderBattleResolutionForcedPartySelect } from "../src/engine/battleScene";
import { recordDraws, setCanonicalSampleStrict, withLiveRender } from "../src/engine/drawRecord";
import { clearContainedPresentationErrors, containedPresentationErrors } from "../src/engine/presentationContainment";

const mon = (side: "player" | "trainer", battler: 0 | 1, species: number, name: string, partyIndex: number, hp: number, maxHP: number) => Object.freeze({
  species, name, side, battler, partyIndex, level: 50, hp, maxHP, gender: "male" as const, status: "none" as const,
  personality: 6, moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
});
const MAGBY = mon("player", 0, 240, "MAGBY", 1, 65, 138);
const DELIBIRD = mon("trainer", 1, 225, "DELIBIRD", 2, 138, 138);

function forcedSendIn(sceneOn: boolean) {
  const field = Object.freeze({ player: MAGBY, opponent: DELIBIRD });
  const states = Object.freeze(["fainted", "healthy", "healthy", "empty", "empty", "empty"]);
  const commands = [
    Object.freeze({ type: "party-summary", eventSequence: 1, battler: 0, visible: true, states, timing: { minimumFrames: 7 } }),
    Object.freeze({ type: "message", eventSequence: 2, lines: ["Go! MAGBY!"], advance: "automatic", noCursor: false, timing: { minimumFrames: 13, holdFrames: 0 } }),
    Object.freeze({ type: "party-summary", eventSequence: 3, battler: 0, visible: false, states }),
    Object.freeze({ type: "switch-in", eventSequence: 4, battler: 0, fromPartyIndex: 0, toPartyIndex: 1, incoming: MAGBY, incomingStatus1: 0,
      timing: switchInTiming(0, MAGBY.species, sceneOn, MAGBY.name, false, MAGBY.personality), settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES, sceneOn }),
    Object.freeze({ type: "turn-end", timing: { minimumFrames: 8 } }),
  ];
  const segment = { field, beforeRules: { rulesContext: { hitMarker: sceneOn ? 0 : BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } }, afterRules: null, events: [], commands } as never;
  const timing = playerFaintReplacementSendOutTimingOfSegment(segment)!;
  const view = (e: number) => createBattleResolutionPresentationRenderView({
    field, segments: [segment], segmentIndex: 0, commandIndex: 0, lifecycle: { phase: "presenting-switch-in", phaseElapsed: e },
    confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
  } as never);
  return { timing, view };
}

describe("pic1: a live MAGBY send-in draws the live field, not the canonical sample battle", () => {
  for (const sceneOn of [false, true]) {
    it(`Scene ${sceneOn ? "ON" : "OFF"}: every frame of the send-out draws DELIBIRD and MAGBY 65/138, never a sample`, () => {
      const { view, timing } = forcedSendIn(sceneOn);
      const pics = new Set<string>();
      const playerBoxes = new Set<string>();
      for (let e = 0; e < 300; e += 1) {
        // the party list's own frames (submenu hold, fade out) draw the menu, not the field
        if (["submenuHold", "fadingOut"].includes(view(e).switchIn!.phase)) continue;
        const { record } = recordDraws(() => withLiveRender(() => {
          const fb = new Uint8Array(240 * 160 * 4);
          renderBattleResolutionForcedPartySelect(fb, view(e), { sendOutElapsed: e, elapsed: 400 + e, sendOutTiming: timing } as never);
        }));
        expect(record.canonicalSamples, `e ${e}`).toEqual([]);
        for (const pic of record.monPics) pics.add(pic.species);
        for (const box of record.healthboxes) {
          if (box.side === "player") playerBoxes.add(`${box.name} ${box.currentHp}/${box.maxHp}`);
          else expect(box.name, `e ${e}`).toBe("DELIBIRD");
        }
      }
      expect([...pics].sort()).toEqual(["DELIBIRD", "MAGBY"]);
      expect([...playerBoxes]).toEqual(["MAGBY 65/138"]);
    });
  }

  it("the live route refuses the canonical sample: drawing it inside a live render throws", async () => {
    const { drawTurn15MagbyHealthbox } = await import("../src/engine/battleScene");
    expect(() => withLiveRender(() => drawTurn15MagbyHealthbox(new Uint8Array(240 * 160 * 4), 0))).toThrow(/canonical sample battle's MAGBY 138 healthbox/);
    // outside a live render (the legacy canonical party menu) it still draws and is recorded
    const { record } = recordDraws(() => drawTurn15MagbyHealthbox(new Uint8Array(240 * 160 * 4), 0));
    expect(record.canonicalSamples).toEqual(["MAGBY 138 healthbox"]);
  });

  it("outside strict mode (the browser) a live-route sample is a contained presentation error, not a crash", async () => {
    const { drawTurn15MagbyHealthbox } = await import("../src/engine/battleScene");
    clearContainedPresentationErrors();
    setCanonicalSampleStrict(false);
    try {
      expect(() => withLiveRender(() => drawTurn15MagbyHealthbox(new Uint8Array(240 * 160 * 4), 0))).not.toThrow();
    } finally {
      setCanonicalSampleStrict(true);
    }
    expect(containedPresentationErrors().map((e) => [e.site, e.commandType, e.message])).toEqual([
      ["draw", "canonical-sample", "CanonicalSampleInLiveRenderError: live render reached the canonical sample battle's MAGBY 138 healthbox"],
    ]);
    clearContainedPresentationErrors();
  });
});
