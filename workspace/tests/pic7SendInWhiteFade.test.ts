// pic7 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): the background flash at a send-out. Kyle saw the battle background go
// fully white for ~8 frames when he sent MAGBY in; on his build that was the canonical sample battle's recorded field palette. The ROM
// does whiten the field at every send-out: SpriteCB_ReleaseMonFromBall calls LaunchBallFadeMonTask(TRUE, battler, 14, ballId)
// (pokeball.c:758), whose BeginNormalPaletteFade(14, 0, 0, 16, RGB_WHITE) (battle_anim_throw.c:2058) fades BG palettes 1-3 to white,
// and Task_FadeMon_ToNormal fades them back once that fade ends. ROM lab tools/battle-lab/pic7-player-faint-send-in-{on,off}.json
// (a level-12 RATTATA faints to Seismic Toss, SEND OUT on slot 2 at trace frame 760; the two scenes are frame-identical until the Scene
// ON back animation): ROM_PLATFORM below is the opponent platform pixel (230, 60) at e = frame - 761 (the forced selector's clock,
// pfr192). Scene ON already drew it frame-exact through path A; Scene OFF drew no fade at all (and MAGBY's ball arc for every species).
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } from "../src/engine/battleScriptSourceConstants";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation";
import { createBattleResolutionPresentationRenderView, playerFaintReplacementSendOutTimingOfSegment } from "../src/engine/battleResolutionPresentationRender";
import { renderBattleResolutionForcedPartySelect } from "../src/engine/battleScene";

/** ROM, pic7 lab, both scenes: the platform pixel (230, 60) as 0xRRGGBB for e = 140..190. */
const ROM_PLATFORM: readonly number[] = [
  13026997, 13026997, 13026997, 13026997, 13026997, 13026997, 13026997, 13027005, 13027005, 13553350, 13553350, 14079694, 14079694,
  14606038, 14606038, 15198174, 15198174, 15724519, 15724519, 16250863, 16250863, 16777215, 16777215, 16777215, 16777215, 16777215,
  16777215, 16777215, 16777215, 16777215, 16250863, 16250863, 15724519, 15724519, 15198174, 15198174, 14606038, 14606038, 14079694,
  14079694, 13553350, 13553350, 13027005, 13027005, 13026997, 13026997, 13026997, 13026997, 13026997, 13026997, 13026997,
];

const mon = (side: "player" | "trainer", battler: 0 | 1, partyIndex: number) => Object.freeze({
  species: 19, name: "RATTATA", side, battler, partyIndex, level: 50, hp: 105, maxHP: 105, gender: "female" as const, status: "none" as const,
  personality: 0, moveIds: [69, 69, 69, 69] as const, currentPP: [20, 20, 20, 20] as const, ppBonuses: 0,
});

function sendIn(sceneOn: boolean) {
  const incoming = mon("player", 0, 1);
  const field = Object.freeze({ player: incoming, opponent: mon("trainer", 1, 0) });
  const states = Object.freeze(["fainted", "healthy", "healthy", "empty", "empty", "empty"]);
  const commands = [
    Object.freeze({ type: "party-summary", eventSequence: 1, battler: 0, visible: true, states, timing: { minimumFrames: 7 } }),
    Object.freeze({ type: "message", eventSequence: 2, lines: ["Go! RATTATA!"], advance: "automatic", noCursor: false, timing: { minimumFrames: 13, holdFrames: 0 } }),
    Object.freeze({ type: "party-summary", eventSequence: 3, battler: 0, visible: false, states }),
    Object.freeze({ type: "switch-in", eventSequence: 4, battler: 0, fromPartyIndex: 0, toPartyIndex: 1, incoming, incomingStatus1: 0,
      timing: switchInTiming(0, 19, sceneOn, "RATTATA", false, 0), settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES, sceneOn }),
    Object.freeze({ type: "turn-end", timing: { minimumFrames: 8 } }),
  ];
  const segment = { field, beforeRules: { rulesContext: { hitMarker: sceneOn ? 0 : BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS } }, afterRules: null, events: [], commands } as never;
  const timing = playerFaintReplacementSendOutTimingOfSegment(segment)!;
  return (e: number): Uint8Array => {
    const view = createBattleResolutionPresentationRenderView({
      field, segments: [segment], segmentIndex: 0, commandIndex: 0, lifecycle: { phase: "presenting-switch-in", phaseElapsed: e },
      confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    } as never);
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionForcedPartySelect(fb, view, { sendOutElapsed: e, elapsed: 400 + e, sendOutTiming: timing } as never);
    return fb;
  };
}

const pixel = (fb: Uint8Array, x: number, y: number): number => {
  const o = (y * 240 + x) * 4;
  return fb[o]! * 65536 + fb[o + 1]! * 256 + fb[o + 2]!;
};

describe("pic7: the send-out whitens the field background as the ROM does, in both scenes", () => {
  for (const sceneOn of [true, false]) {
    it(`Scene ${sceneOn ? "ON" : "OFF"}: the platform pixel follows the ROM's white fade frame for frame (e 140..190)`, () => {
      const frame = sendIn(sceneOn);
      expect(ROM_PLATFORM.map((_, i) => pixel(frame(140 + i), 230, 60))).toEqual(ROM_PLATFORM);
    });
  }

  it("Scene OFF draws Scene ON's send-in until the back animation starts (the ROM's two scenes are frame-identical there)", () => {
    const on = sendIn(true);
    const off = sendIn(false);
    for (const e of [100, 120, 140, 150, 160, 163]) expect(Buffer.from(off(e)).equals(Buffer.from(on(e))), `e ${e}`).toBe(true);
  });
});
