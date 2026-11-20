import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleCommandFieldBattler } from "../src/engine/battleCommandPresentation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import {
  battleResolutionCommandDuration, createBattleResolutionPresentationRenderView, substituteDollAtCommandStart,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView, renderBattleResolutionSceneOffView } from "../src/engine/battleScene.ts";
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE, liveBattlerX2EventsOf } from "../src/engine/liveBattlerX2History.ts";
import {
  substituteFadeCommandRows, substituteFadeDuration, substituteFadeLayerAt, substituteFadeRenderView, substituteFadeScriptRows,
  SUBSTITUTE_FADE_LEAD_ROWS,
} from "../src/engine/liveSubstituteFade.ts";
import { dominantLiveMoveTimingPhase, LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS, LIVE_MOVE_TIMING_POLICY, LIVE_STATUS_ANIMATION_TIMING_POLICY } from "../src/engine/liveMoveTimingPolicy.ts";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

// S10A Substitute fade (docs/next-adapters-prep39.md; receipt tools/integration/fixtures/fade-live-receipt.json, ROM pixels through
// tools/integration/fadeLiveCheck.ts): General_SubstituteFade presented live, Scene ON and OFF, presentation timing only.
const mon = (side: "player" | "trainer", battler: 0 | 1, species: number, doll: boolean) =>
  Object.freeze({ side, battler, partyIndex: 0, species, name: "X", level: 50, gender: "male", hp: 10, maxHP: 10,
    status: "none", moveIds: [164, 0, 0, 0], currentPP: [10, 0, 0, 0], ppBonuses: 0,
    ...(doll ? { substituteDoll: true } : {}) }) as unknown as BattleCommandFieldBattler;
const field = (playerDoll: boolean, opponentDoll: boolean): BattleResolutionDisplayedField => Object.freeze({
  player: mon("player", 0, 53, playerDoll), opponent: mon("trainer", 1, 42, opponentDoll),
});
const fadeCommand = (battler: 0 | 1) => Object.freeze({
  type: "substitute-fade", eventSequence: 2, battler, timing: { minimumFrames: substituteFadeCommandRows(battler === 0 ? "player" : "opponent") },
}) as never;
const message = (advance: "button" | "automatic") => Object.freeze({ type: "message", eventSequence: 1, lines: ["a", "b"], advance,
  noCursor: false, timing: { minimumFrames: 1, holdFrames: 0 } });
const stateAt = (f: BattleResolutionDisplayedField, battler: 0 | 1, age: number, extra: Record<string, unknown> = {}) => ({
  field: f, segments: [{ field: f, beforeRules: null, afterRules: null, events: [], commands: [message("button"), fadeCommand(battler)] }],
  segmentIndex: 0, commandIndex: 1, lifecycle: { phase: "presenting", phaseElapsed: age }, confirmHandoff: null, opponentTrainer: null,
  sourceDecision: { kind: "use-move" }, fadeTick: 0, ...extra,
}) as never;

describe("General_SubstituteFade source rows (prep39 model, dominant VBlank phase)", () => {
  it("script rows 103 / 101; the body adds the first inactive row and the 2-row OAM tail; btn2: the command leads it by 11 rows", () => {
    expect([substituteFadeScriptRows("player"), substituteFadeScriptRows("opponent")]).toEqual([103, 101]);
    expect([substituteFadeDuration("player"), substituteFadeDuration("opponent")]).toEqual([106, 104]);
    expect(SUBSTITUTE_FADE_LEAD_ROWS).toBe(11);
    expect([substituteFadeCommandRows("player"), substituteFadeCommandRows("opponent")]).toEqual([117, 115]);
  });

  it("doll latch, BG copy (alpha every 3 rows, white per row two rows late), invisible, slide back from swap row 0", () => {
    expect(substituteFadeLayerAt("player", 0)).toEqual({ kind: "doll" });
    expect(substituteFadeLayerAt("player", 1)).toEqual({ kind: "doll" });
    expect(substituteFadeLayerAt("player", 2)).toEqual({ kind: "bg-copy", eva: 16, evb: 0, white: 0, blend: false });
    expect(substituteFadeLayerAt("player", 4)).toEqual({ kind: "bg-copy", eva: 16, evb: 0, white: 0, blend: true });
    expect(substituteFadeLayerAt("player", 7)).toEqual({ kind: "bg-copy", eva: 15, evb: 1, white: 3, blend: true });
    expect(substituteFadeLayerAt("player", 20)).toMatchObject({ kind: "bg-copy", white: 16 });
    expect(substituteFadeLayerAt("player", 51)).toEqual({ kind: "bg-copy", eva: 1, evb: 15, white: 16, blend: true });
    expect(substituteFadeLayerAt("player", 52)).toEqual({ kind: "none" });
    expect(substituteFadeLayerAt("player", 84)).toEqual({ kind: "none" });
    expect(substituteFadeLayerAt("player", 85)).toEqual({ kind: "mon", x2: -100 });
    expect(substituteFadeLayerAt("player", 103)).toEqual({ kind: "mon", x2: -10 });
    expect(substituteFadeLayerAt("player", 105)).toEqual({ kind: "mon", x2: 0 });
    expect(substituteFadeLayerAt("opponent", 83)).toEqual({ kind: "none" });
    expect(substituteFadeLayerAt("opponent", 84)).toEqual({ kind: "mon", x2: 95 });
    expect(substituteFadeLayerAt("opponent", 102)).toEqual({ kind: "mon", x2: 5 });
    expect(substituteFadeLayerAt("opponent", 103)).toEqual({ kind: "mon", x2: 0 });
  });
});

describe("the fade command in the presentation queue (rung a)", () => {
  it("clears the doll at its own start, lasts its duration and draws the fade effect only over a shown doll", () => {
    const subbed = field(true, false);
    expect(substituteDollAtCommandStart(subbed, fadeCommand(0)).player.substituteDoll).toBeUndefined();
    expect(battleResolutionCommandDuration(fadeCommand(0), subbed)).toBe(117);
    expect(battleResolutionCommandDuration(fadeCommand(1), subbed)).toBe(115);
    const view = createBattleResolutionPresentationRenderView(stateAt(subbed, 0, 30 + SUBSTITUTE_FADE_LEAD_ROWS));
    expect(view.effect).toMatchObject({ type: "substitute-fade", battler: 0, age: 30 });
    expect(view.field.player.substituteDoll).toBeUndefined();
    // No doll shown at the fade's start (e.g. Scene OFF before the next prompt): the ordinary field for its rows.
    expect(createBattleResolutionPresentationRenderView(stateAt(field(false, false), 0, 30)).effect).toBeNull();
  });

  it("renders the BG copy / hidden / slide rows on the Scene OFF compositor and the live seam alike", () => {
    const subbed = field(false, true);
    const fb = (age: number, live: boolean) => {
      const out = new Uint8Array(240 * 160 * 4);
      (live ? renderBattleResolutionLiveView : renderBattleResolutionSceneOffView)(out, createBattleResolutionPresentationRenderView(stateAt(subbed, 1, age + SUBSTITUTE_FADE_LEAD_ROWS)));
      return Buffer.from(out).toString("base64");
    };
    for (const age of [0, 10, 40, 60, 90, 103]) expect(fb(age, true)).toBe(fb(age, false));
    const frames = [0, 10, 40, 60, 90].map((age) => fb(age + SUBSTITUTE_FADE_LEAD_ROWS, false));
    expect(new Set(frames).size).toBe(5);
    // Elevated GOLBAT: the shadow stays hidden through script rows + 1, back on the command's last row.
    const viewAt = (age: number) => substituteFadeRenderView(createBattleResolutionPresentationRenderView(stateAt(subbed, 1, age + SUBSTITUTE_FADE_LEAD_ROWS)))!.view;
    expect(viewAt(102).postBodyShadowHidden).toBe(true);
    expect(viewAt(103).postBodyShadowHidden).toBe(false);
    expect(viewAt(60).visibility.opponent.sprite).toBe(false);
    expect(viewAt(90).fieldArt.opponent.origin.x).toBe(createBattleResolutionPresentationRenderView(stateAt(subbed, 1, 90 + SUBSTITUTE_FADE_LEAD_ROWS)).fieldArt.opponent.origin.x + 65);
  });

  it("x2 history: the fade leaves the fading battler at x2 0 (RATTATA's idle rest does not return)", () => {
    const events = liveBattlerX2EventsOf({ sequence: 1, payload: { kind: "animation", animationId: "SUBSTITUTE_FADE", battler: 1, target: 1 } } as never);
    expect(events).toEqual([{ kind: "substitute-fade", side: "opponent" }]);
    expect(applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, events[0]!)).toEqual({ player: "idle", opponent: "zeroed" });
  });
});

describe("btn2: the fade's lead and its message box (ROM subp1m-subfade, both scenes)", () => {
  const withScene = (age: number, hitMarker: number | null) => {
    const base = stateAt(field(true, false), 0, age) as any;
    const segment = hitMarker === null ? base.segments[0] : { ...base.segments[0], beforeRules: { rulesContext: { hitMarker } } };
    return { ...base, segments: [segment] } as never;
  };
  const NO_ANIMATIONS = 0x80;
  it("the doll stays shown (fade age 0) for the 11 lead rows, then the fade body starts", () => {
    for (const age of [0, 5, SUBSTITUTE_FADE_LEAD_ROWS]) {
      expect(createBattleResolutionPresentationRenderView(stateAt(field(true, false), 0, age)).effect).toMatchObject({ type: "substitute-fade", age: 0 });
    }
    expect(createBattleResolutionPresentationRenderView(stateAt(field(true, false), 0, SUBSTITUTE_FADE_LEAD_ROWS + 7)).effect).toMatchObject({ age: 7 });
  });

  it("Scene OFF: the box is empty from the fade's first row; Scene ON: the damaged print stays", () => {
    for (const age of [0, 40, 116]) {
      expect(createBattleResolutionPresentationRenderView(withScene(age, NO_ANIMATIONS)).message).toBeNull();
      expect(createBattleResolutionPresentationRenderView(withScene(age, 0)).message).toMatchObject({ lines: ["a", "b"] });
    }
  });
});

describe("btn2: the released print's cursor stays frozen (ROM, both scenes)", () => {
  const scene = (hitMarker: number, extra: Record<string, unknown>) => {
    const base = stateAt(field(true, false), 0, 40, extra) as any;
    return { ...base, segments: [{ ...base.segments[0], beforeRules: { rulesContext: { hitMarker } } }] } as never;
  };
  it("Scene ON: the damaged print keeps the cursor at its press-time age through the fade; none without the release record", () => {
    const released = { releasedWaitCursor: { segmentIndex: 0, commandIndex: 0, age: 4 } };
    expect(createBattleResolutionPresentationRenderView(scene(0, released)).waitCursor).toEqual({ age: 4 });
    expect(createBattleResolutionPresentationRenderView(scene(0, {})).waitCursor).toBeNull();
    expect(createBattleResolutionPresentationRenderView(scene(0, { releasedWaitCursor: { segmentIndex: 0, commandIndex: 3, age: 4 } })).waitCursor).toBeNull();
    // Scene OFF: the fade cleared the box, so no cursor.
    expect(createBattleResolutionPresentationRenderView(scene(0x80, released)).waitCursor).toBeNull();
  });
});

describe("D4 policy: the fade's documented alternate VBlank phases (rung c)", () => {
  const policy = LIVE_STATUS_ANIMATION_TIMING_POLICY.SUBSTITUTE_FADE!;
  it("ships the dominant phase of each BLDALPHA step and of the blendoff (the later row; 222 / 2 steps, 12 / 2 windows)", () => {
    expect(policy.animation).toBe("General_SubstituteFade");
    expect(policy.parameters.map((p) => [p.kind, p.age, p.chosen, p.alternatives.map((a) => a.measured)])).toEqual([
      ["bg-write-row", 6, "event", [222, 2]], ["bg-write-row", 62, "event", [12, 2]],
    ]);
    for (const p of policy.parameters) expect(dominantLiveMoveTimingPhase(p.alternatives)).toEqual({ phase: p.chosen, tie: false });
    // The shipped phase: BLDALPHA (16 - k, k) reads the previous row's step (row 7 = k 1; the early phase would show k 2 on row 9).
    expect(substituteFadeLayerAt("player", 9)).toMatchObject({ eva: 15, evb: 1 });
    expect(substituteFadeLayerAt("player", 10)).toMatchObject({ eva: 14, evb: 2 });
  });

  it("a status animation, not a move body: no faithful-timing adapter or move policy entry is added (counts unchanged)", () => {
    expect(Object.keys(LIVE_MOVE_TIMING_POLICY)).not.toContain("164");
    expect(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS).not.toContain(164);
  });

  it("the committed receipt's residual rows are exactly the policy's documented alternate-phase steps", () => {
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/fade-live-receipt.json", "utf8")) as {
      passes: { results: { window: string; verdict: string; totalPx: number; nonZero: { age: number; px: number }[] }[] }[];
    };
    for (const pass of receipt.passes) {
      expect(pass.results).toHaveLength(14);
      const residual = pass.results.filter((r) => r.totalPx > 0);
      expect(residual.map((r) => [r.window, r.verdict, r.nonZero.map((n) => [n.age, n.px])])).toEqual([
        ["prep39-on-player-persian-onix@3822", "alternate-phase-documented", [[27, 271], [45, 271]]],
      ]);
      expect(residual.flatMap((r) => r.nonZero)).toHaveLength(policy.parameters[0]!.alternatives[1]!.measured);
    }
  });
});

const rulesWithoutSceneMarker = (v: { rules: any }) => {
  const rc = v.rules.rulesContext;
  return { ...v.rules, rulesContext: { ...rc, hitMarker: rc.hitMarker & ~0x80 } };
};

describe("ordinary route: a substitute breaks", () => {
  it("JYNX 11/35 [Substitute, ...]: the opponent's Sludge Bomb breaks the player's doll; the fade plays 11 + 106 rows before the faded message, next prompt with the mon, Scene ON/OFF parity", () => {
    const seen = { fadeRows: 0, effectRows: 0, boxRows: [] as number[], afterFade: [] as string[], prevType: [] as string[], nextType: [] as string[], dollAfter: [] as boolean[] };
    const on = generatedCommandAnimationReplay(11, "on", [3, 0, 0], 35, true, true, (state) => {
      const r = state.battleResolutionPresentation;
      if (r?.lifecycle.phase !== "presenting") return;
      const commands = r.segments[r.segmentIndex]!.commands;
      const command = commands[r.commandIndex];
      if (command?.type !== "substitute-fade") return;
      const view = createBattleResolutionPresentationRenderView(r);
      seen.fadeRows += 1;
      if (view.message !== null) seen.boxRows.push(r.lifecycle.phaseElapsed);
      if (view.effect?.type === "substitute-fade") seen.effectRows += 1;
      if (r.lifecycle.phaseElapsed === 0) {
        seen.prevType.push(`${commands[r.commandIndex - 1]?.type}:${(commands[r.commandIndex - 1] as { advance?: string }).advance}`);
        const next = commands[r.commandIndex + 1] as { type: string; substituteFadeBattler?: number };
        seen.nextType.push(`${next.type}:${next.substituteFadeBattler}`);
        for (const piece of commands.slice(r.commandIndex + 1, r.commandIndex + 3) as unknown as { advance: string; promptGate?: boolean; timing: { holdFrames: number } }[]) {
          seen.afterFade.push(`${piece.advance}:${piece.promptGate === true}:${piece.timing.holdFrames}`);
        }
      }
      const fb = new Uint8Array(240 * 160 * 4);
      renderBattleResolutionLiveView(fb, view);
    });
    const off = generatedCommandAnimationReplay(11, "off", [3, 0, 0], 35, true, true);
    expect(on.requests.map((q) => `${q.moveId}:${q.attacker}`).slice(0, 2)).toEqual(["164:0", "188:1"]);
    expect(seen.fadeRows).toBe(117);
    expect(seen.effectRows).toBe(117);
    // btn2: Scene ON keeps the damaged print through the fade (the ROM's frozen cursor aside); the faded print's trailing
    // `waitmessage B_WAIT_TIME_LONG` is a 64-row hold piece.
    expect(seen.boxRows).toHaveLength(117);
    expect(seen.afterFade).toEqual(["button:true:0", "automatic:true:64"]);
    // The queue presents STRINGID_SUBSTITUTEDMG as a button piece (btn1: its `\\p` waits for a new A / B, subp1m); the ROM's frozen cursor is outside the fade's claim.
    expect(seen.prevType).toEqual(["message:button"]);
    expect(seen.nextType).toEqual(["message:0"]);
    expect(on.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.state.battleCommandPresentation?.field.player.substituteDoll).toBeUndefined();
    expect(off.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
    expect(on.stalled).toBe(off.stalled);
    expect(off.boundaries).toHaveLength(on.boundaries.length);
    for (let i = 0; i < on.boundaries.length; i += 1) {
      expect(rulesWithoutSceneMarker(on.boundaries[i]!)).toEqual(rulesWithoutSceneMarker(off.boundaries[i]!));
      expect(on.boundaries[i]!.rng).toEqual(off.boundaries[i]!.rng);
      expect(on.boundaries[i]!.boundary).toEqual(off.boundaries[i]!.boundary);
    }
    expect(on.state.facilityState).toEqual(off.state.facilityState);
    expect(on.state.round.rules.rngValue).toBe(off.state.round.rules.rngValue);
  }, 240000);
});
