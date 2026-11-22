// lha1 (docs/lha1-lowhp-alarm-berry-flash.md, fcr2 finding 3): HandleEndTurn_BattleWon's BattleStopLowHpSound + PlayBGM(victory) come when
// the winning turn has ended, after every message and HP bar after the last faint (battle_main.c:4960-4982). Before lha1 the victory BGM
// was scheduled from the last "fainted!" box's A, so a SHELL BELL heal that ended in the red turned SE_LOW_HEALTH on again
// (HandleLowHpMusicChange, battle_gfx_sfx_util.c:1090-1103) and it beeped to the next battle. Staged on APP_STAGES["lha1-*"]: the player
// (in the red after the foe's first hit) knocks out the foe's last Pokemon; the anchors' delays are the ROM's (catcher seed 2 Scene OFF
// battles 9-11, seed 10 Scene ON battle 10).
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import {
  emitBattleEndSounds,
  MUS_VICTORY_TRAINER,
  VICTORY_BGM_AFTER_AUTOMATIC_MESSAGE,
  VICTORY_BGM_AFTER_CONTROLLER_COMMAND,
  VICTORY_BGM_AFTER_FAINT_DISMISS,
  victoryBgmAnchor,
} from "../src/engine/battleEndSounds.ts";
import { beginScreenSoundTick, runScheduledScreenSounds } from "../src/engine/screenSounds.ts";
import type { BattleResolutionPresentationState } from "../src/engine/battleResolutionPresentation.ts";
import type { GbaButton } from "../src/input.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: EngineState) => EngineState>;
};

const SE_SELECT = 5;
const SE_FAINT = 16;
const SE_LOW_HEALTH = 90;

interface Row {
  frame: number;
  /** The presented command at the end of the tick: `type` or `message:<first line>`. */
  at: string;
  events: readonly SoundEvent[];
}

const pressed = (frame: number): boolean => frame === 1 || frame === 21 || (frame > 60 && frame % 12 === 0);

function play(stage: string, scene: "on" | "off", frames = 1400, collect = true): { rows: Row[]; state: string } {
  let state = APP_STAGES[stage]!(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
  const rows: Row[] = [];
  for (let frame = 1; frame <= frames; frame += 1) {
    const buttons = new Set<GbaButton>(pressed(frame) ? ["A"] : []);
    let events: readonly SoundEvent[] = [];
    if (collect) {
      const result = collectSoundTick(state.frame + 1, () => tick(state, buttons));
      state = result.result;
      events = result.events;
    } else {
      state = tick(state, buttons);
    }
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null;
    const command = resolution?.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
    const at = command === undefined ? "none" : command.type === "message" ? `message:${command.lines[0]}` : command.type;
    rows.push({ frame: state.frame, at, events });
  }
  return { rows, state: JSON.stringify(state) };
}

const framesOf = (rows: readonly Row[], kind: string, id: number): number[] =>
  rows.filter((row) => row.events.some((event) => event.kind === kind && event.id === id)).map((row) => row.frame);
/** The first frame at which the presented command is `at` (after `from`). */
const firstAt = (rows: readonly Row[], at: string, from = 0): number => rows.find((row) => row.frame > from && row.at === at)!.frame;

interface Case {
  stage: string;
  /** The turn's last command before "Player defeated" (the anchor) and the frame the presentation leaves it. */
  anchorLeft: (rows: readonly Row[]) => number;
  delay: number;
}

const PLAYER_DEFEATED = "message:Player defeated";
const cases: readonly Case[] = [
  // The ordinary win: "fainted!" is the last box; its A (the frame the next command starts) + 22, unchanged from aud241c.
  { stage: "lha1-red-win", anchorLeft: (rows) => framesOf(rows, "se", SE_SELECT).find((frame) => frame > framesOf(rows, "se", SE_FAINT).at(-1)!)!, delay: 22 },
  // SHELL BELL: the heal's HP bar is the last command (BattleScript_ItemHealHP_Ret ends with healthbarupdate / datahpupdate).
  { stage: "lha1-shellbell-win", anchorLeft: (rows) => firstAt(rows, PLAYER_DEFEATED), delay: 14 },
  // ROUGH SKIN: "hurt" with its waitmessage is the last command; the win tail's draw-nothing hold (wtl1) and moveend's two receipts follow it.
  { stage: "lha1-roughskin-win", anchorLeft: (rows) => firstAt(rows, "move-animation", firstAt(rows, "message:Foe RATTATA’s ROUGH SKIN")), delay: 19 },
];

describe("lha1: the victory BGM after the winning turn's last command, and no low-HP alarm after it", () => {
  it("the delays are the measured ROM constants", () => {
    expect([VICTORY_BGM_AFTER_FAINT_DISMISS, VICTORY_BGM_AFTER_AUTOMATIC_MESSAGE, VICTORY_BGM_AFTER_CONTROLLER_COMMAND]).toEqual([22, 19, 14]);
  });

  for (const scene of ["off", "on"] as const) {
    for (const { stage, anchorLeft, delay } of cases) {
      it(`${stage}-${scene}: SE_LOW_HEALTH once before the KO, stopped with MUS_VICTORY_TRAINER ${delay} ticks after the anchor, never again`, () => {
        const { rows } = play(`${stage}-${scene}`, scene);
        const victory = framesOf(rows, "bgm", MUS_VICTORY_TRAINER);
        const alarm = framesOf(rows, "se", SE_LOW_HEALTH);
        const stops = framesOf(rows, "stop", SE_LOW_HEALTH);
        const faint = framesOf(rows, "se", SE_FAINT);
        expect(victory).toHaveLength(1);
        expect(faint).toHaveLength(1);
        // The foe's first hit put the player in the red; nothing turns the alarm on again.
        expect(alarm).toHaveLength(1);
        expect(alarm[0]!).toBeLessThan(faint[0]!);
        expect(stops).toEqual(victory);
        expect(victory[0]! - anchorLeft(rows)).toBe(delay);
        // HandleEndTurn_BattleWon precedes the win script: the music plays before "Player defeated" is dismissed.
        const playerDefeated = firstAt(rows, PLAYER_DEFEATED);
        expect(victory[0]!).toBeLessThan(framesOf(rows, "se", SE_SELECT).find((frame) => frame > playerDefeated)!);
        // ...and after the turn's last HP bar (the heal / the ROUGH SKIN damage) has ended.
        const lastHpBar = rows.filter((row) => row.at === "hp").at(-1)!.frame;
        expect(victory[0]!).toBeGreaterThan(lastHpBar);
      });
    }
  }

  it("collecting sounds does not change the engine state (all six stages)", () => {
    for (const scene of ["off", "on"] as const) {
      for (const { stage } of cases) {
        expect(play(`${stage}-${scene}`, scene, 1400, true).state, `${stage}-${scene}`).toBe(play(`${stage}-${scene}`, scene, 1400, false).state);
      }
    }
  });
});

describe("lha1: only B_OUTCOME_WON plays the victory BGM", () => {
  // A minimal won / drawn segment: the foe's last "fainted!" box (button) and, for the win, the win script's print.
  function resolution(outcome: number, winScript: boolean, commandIndex: number): BattleResolutionPresentationState {
    const faint = { type: "message", eventSequence: 1, lines: ["Foe RATTATA", "fainted!"], advance: "button", faintBattler: 1, noCursor: false, timing: { minimumFrames: 24, holdFrames: 0 } };
    const defeated = { type: "message", eventSequence: 2, lines: ["Player defeated", "LADY ZOE!"], advance: "button", noCursor: false, timing: { minimumFrames: 24, holdFrames: 0 } };
    return {
      segments: [{
        afterRules: { rulesContext: { battleOutcome: outcome } },
        events: [
          { sequence: 1, payload: { kind: "message", messageId: "STRINGID_TARGETFAINTED" } },
          { sequence: 2, payload: { kind: "message", messageId: winScript ? "STRINGID_PLAYERDEFEATEDTRAINER1" : "STRINGID_TRAINER1WINTEXT" } },
        ],
        commands: [faint, defeated],
      }],
      segmentIndex: 0,
      commandIndex,
      lifecycle: { phase: commandIndex === 0 ? "awaiting-message-dismiss" : "presenting", phaseElapsed: 0 },
    } as unknown as BattleResolutionPresentationState;
  }
  function dismissSounds(outcome: number, winScript: boolean): string[] {
    const events: string[] = [];
    for (let frame = 1; frame <= 30; frame += 1) {
      events.push(...collectSoundTick(frame, () => {
        beginScreenSoundTick(frame);
        if (frame === 1) emitBattleEndSounds(resolution(outcome, winScript, 0), resolution(outcome, winScript, 1), false);
        runScheduledScreenSounds();
      }).events.map((event) => `${event.frame}:${event.kind}:${event.id}`));
    }
    return events;
  }

  it("a win (1): the anchor is the faint box, 22 ticks", () => {
    expect(victoryBgmAnchor(resolution(1, true, 0), 0)).toEqual({ segmentIndex: 0, commandIndex: 0, delay: 22 });
    expect(dismissSounds(1, true)).toEqual(["1:se:5", "23:bgm:412"]);
  });

  it("a draw (WON | LOST, a double KO of both last Pokemon) goes to HandleEndTurn_BattleLost: no victory BGM", () => {
    expect(victoryBgmAnchor(resolution(3, true, 0), 0)).toBeNull();
    expect(dismissSounds(3, false)).toEqual(["1:se:5"]);
  });
});
