// lrc1: after the player's last Pokémon faints, the loss tail's `returnopponentmon1toball` (BattleScript_LocalBattleLostPrintTrainersWinText,
// battle_scripts_1.s:2962) is the opponent's animated return to ball (VARIOUS_RETURN_OPPONENT_MON1 -> ReturnMonToBall(FALSE) ->
// DoSwitchOutAnimation), both scenes, and the win text follows the ROM's slide by 3 rows. Frames are relative to the loss's SE_BALL_OPEN (B):
// the ROM values are the frame catcher's (docs/lrc1-loss-recall.md, seed 0 Scene OFF battle 7: B = 105600, pink fade 105603, healthbox gone
// 105630, last particle 105642, slide settled 105681, win text 105684; the same offsets in all 8 lost battles of the fcs1 sweep, both scenes;
// the DUSCLOPS loss lab gives the same chain: recall dispatch 2951, SE 2953, slide 2996, text 3037).
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import {
  LOSS_RECALL_LEAD_FRAMES, LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES, LOSS_TAIL_SCRIPT_LABEL, LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES,
  RETURN_TO_BALL_SPAN_FRAMES, type BattleResolutionPresentationState,
} from "../src/engine/battleResolutionPresentation.ts";
import {
  createBattleResolutionPresentationRenderView, midBattleSwitchOutAt,
} from "../src/engine/battleResolutionPresentationRender.ts";
import type { GbaButton } from "../src/input.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: EngineState) => EngineState>;
};

const SE_FAINT = 16;
const SE_SELECT = 5;
const SE_BALL_OPEN = 15;

type Frame = {
  frame: number;
  resolution: BattleResolutionPresentationState | null;
  sounds: Array<{ kind: string; id: number | null }>;
};

/** The aud241c loss stage (the player's last mon faints, the foe keeps its HP), A on the opening boxes, then A every 8 frames after the faint. */
function play(scene: "on" | "off", frames: number): Frame[] {
  let state = APP_STAGES[`aud241c-loss-${scene}`]!(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
  const out: Frame[] = [];
  let faint: number | null = null;
  for (let frame = 1; frame <= frames; frame += 1) {
    const press = frame === 1 || frame === 2 || frame === 21 || frame === 22 || (faint !== null && frame > faint + 30 && (frame - faint) % 8 < 2);
    const buttons = new Set<GbaButton>(press ? ["A"] : []);
    const result = collectSoundTick(state.frame + 1, () => tick(state, buttons));
    state = result.result;
    const sounds = result.events.map((e) => ({ kind: e.kind, id: e.id }));
    if (sounds.some((e) => e.kind === "se" && e.id === SE_FAINT)) faint = frame;
    out.push({ frame, resolution: state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null, sounds });
  }
  return out;
}

function commandAt(f: Frame) {
  const r = f.resolution!;
  const segment = r.segments[r.segmentIndex]!;
  const command = segment.commands[r.commandIndex];
  const event = command === undefined ? undefined : segment.events.find((e) => e.sequence === (command as { eventSequence?: number }).eventSequence);
  return { phase: r.lifecycle.phase, elapsed: r.lifecycle.phaseElapsed, command, event };
}

for (const scene of ["off", "on"] as const) {
  describe(`lrc1 loss recall (Scene ${scene.toUpperCase()})`, () => {
    const frames = play(scene, scene === "on" ? 1100 : 600);
    const ball = frames.filter((f) => f.sounds.some((e) => e.kind === "se" && e.id === SE_BALL_OPEN));
    const at = (rel: number): Frame => frames[ball[0]!.frame + rel - 1]!;
    const view = (rel: number) => createBattleResolutionPresentationRenderView(at(rel).resolution!);

    // lrm1: this stage is a target faint (the foe's Seismic Toss), the ROM's A -> SE_BALL_OPEN is 28 there (lrm1-loss-targetfaint-{on,off}: ROM A 3157 /
    // SE 3185 OFF, 5957 / 5985 ON; T2 s4686 d6 388 -> 416); the 24 of aud241c / aud252 is the player's own Explosion (engine lead 22, an attacker faint).
    it("plays one SE_BALL_OPEN, 28 frames after the last faint box's A (target faint, lrm1)", () => {
      expect(ball).toHaveLength(1);
      const dismiss = frames.filter((f) => f.frame < ball[0]!.frame && f.sounds.some((e) => e.kind === "se" && e.id === SE_SELECT)).at(-1)!;
      expect(ball[0]!.frame - dismiss.frame).toBe(28);
    });

    it("projects the loss tail as switch-out (lead 20 + 32) -> recall receipt (13) -> trainer slide (38 + 3) -> win text", () => {
      const r = at(0).resolution!;
      const commands = r.segments[r.segmentIndex]!.commands;
      const out = commands.findIndex((c) => c.type === "switch-out");
      expect(commands.slice(out).map((c) => c.type)).toEqual(["switch-out", "sprite-visibility", "trainer-slide", "message"]);
      expect(commands[out]).toMatchObject({
        battler: 1, leadFrames: LOSS_RECALL_LEAD_FRAMES, timing: { minimumFrames: LOSS_RECALL_LEAD_FRAMES + RETURN_TO_BALL_SPAN_FRAMES },
      });
      expect(commands[out + 1]).toMatchObject({ battler: 1, visible: false, recall: true, timing: { minimumFrames: LOSS_RECALL_TRAINER_SLIDE_GAP_FRAMES } });
      expect(commands[out + 2]).toMatchObject({ direction: "in", timing: { minimumFrames: 38, holdFrames: LOSS_TRAINER_SLIDE_PRINT_GAP_FRAMES } });
      const events = r.segments[r.segmentIndex]!.events;
      expect(events.find((e) => e.sequence === (commands[out] as { eventSequence: number }).eventSequence)?.provenance?.sourceLabel)
        .toBe(LOSS_TAIL_SCRIPT_LABEL);
    });

    it("keeps the foe at rest through the script rows, then dispatches the recall 2 frames before the ball sound (ROM D = B - 2)", () => {
      for (const rel of [-22, -3]) {
        const v = view(rel);
        expect(commandAt(at(rel)).command?.type, `B${rel}`).toBe("switch-out");
        expect(v.switchOut, `B${rel}`).toBeNull();
        expect(v.visibility.opponent, `B${rel}`).toEqual({ sprite: true, healthbox: true });
        expect(v.midBattleSwitchFade, `B${rel}`).toBeNull();
        expect(v.midBattleSwitchParticles, `B${rel}`).toBeNull();
      }
      expect(view(-2).switchOut).toMatchObject({ battler: 1, elapsed: 0, scale: 256, spriteVisible: true, shadowVisible: true });
    });

    it("draws the ROM's pink fade and particles from B + 3 to B + 42, the shrink, the sprite freed, the healthbox hidden at B + 30", () => {
      // The fade's first nonzero step (BG white-out 2, mon tint 1) and the first particle are the ROM's first changed picture, B + 3.
      expect(view(2).midBattleSwitchFade).toEqual({ bg: 0, obj: 0, objBattler: 1 });
      expect(view(2).midBattleSwitchParticles).toBeNull();
      expect(view(3).midBattleSwitchFade).toEqual({ bg: 2, obj: 1, objBattler: 1 });
      expect(view(3).midBattleSwitchParticles).toMatchObject({ window: "opponent-recall" });
      expect(view(18).midBattleSwitchFade).toEqual({ bg: 16, obj: 16, objBattler: 1 });
      expect(view(14).switchOut?.scale).toBe(256);
      expect(view(15).switchOut?.scale).toBe(304);
      expect(view(24).switchOut).toMatchObject({ scale: 736, spriteVisible: true });
      expect(view(25).switchOut?.spriteVisible).toBe(false);
      expect(view(29).visibility.opponent.healthbox).toBe(true);
      expect(view(30).visibility.opponent).toEqual({ sprite: false, healthbox: false });
      expect(view(42).midBattleSwitchParticles).not.toBeNull();
      expect(view(43).midBattleSwitchParticles).toBeNull();
      expect(view(39).midBattleSwitchFade?.bg).toBe(0);
    });

    it("slides the trainer in from B + 43 (settled B + 81) and starts the win text at B + 84", () => {
      expect(commandAt(at(42)).command?.type).toBe("sprite-visibility");
      expect(commandAt(at(43))).toMatchObject({ elapsed: 0, command: { type: "trainer-slide" } });
      expect(view(43).trainerSlide?.offscreenX2).toBe(76);
      expect(view(80).trainerSlide?.offscreenX2).toBe(2);
      expect(view(81).trainerSlide?.offscreenX2).toBe(0);
      expect(commandAt(at(83)).command?.type).toBe("trainer-slide");
      const text = commandAt(at(84));
      expect(text).toMatchObject({ elapsed: 0, command: { type: "message" } });
      expect(text.event?.payload).toMatchObject({ kind: "message", messageId: "STRINGID_TRAINER1WINTEXT" });
    });
  });
}

describe("lrc1 elevated opponent", () => {
  it("keeps an elevated opponent's shadow for the recall's first 3 rows (SpriteCB_EnemyShadow, gAnimScriptActive; ROM DUSTOX 210929-210931)", () => {
    expect([0, 1, 2, 3, 4].map((elapsed) => midBattleSwitchOutAt(elapsed, 1).shadowVisible)).toEqual([true, true, true, false, false]);
  });
});
