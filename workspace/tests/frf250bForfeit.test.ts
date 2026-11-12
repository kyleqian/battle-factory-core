// frf250b: RUN -> YES forfeits the match. "<PLAYER> forfeited the match!" prints with the ROM timing, the battle ends as a LOSS
// (B_OUTCOME_FORFEITED falls through to WarpToLobbyLost), the library emits battle-end + challenge-end loss, and the run replays from
// the input trace alone. No RNG is consumed (HandleAction_Run / TryRunFromBattle never call Random). ROM windows: tools/battle-lab/
// frf250b-run-yes-*.json compared through tools/compare/traces/frf250b-run-yes-*.json (Scene OFF 250/250 frames); the sound fixture
// is committed oracle output of tools/audio/soundEventProbe.py. This test needs no emulator.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import {
  FORFEIT_MESSAGE_END_AT,
  FORFEIT_MESSAGE_FIRST_GLYPH_AT,
  FORFEIT_MESSAGE_TEXT,
} from "../src/engine/battleCommandPresentation.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import type { FactoryEvent } from "../src/factoryContract.ts";
import { FactorySession } from "../src/factorySession.ts";
import { replayChallenge } from "../src/headless.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface Fixture {
  frames: number;
  events: Array<{ frame: number; kind: string; id: number | null; noop?: boolean }>;
  trace: {
    route: "generated-orchestrator";
    battleScene: "on" | "off";
    appStage: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}
const rom: Fixture = JSON.parse(
  readFileSync(new URL("../tools/audio/fixtures/frf250b-run-yes-off-window.json", import.meta.url), "utf8"),
) as Fixture;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function replayLab() {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  state = APP_STAGES[rom.trace.appStage.id]!(state);
  const sounds: string[] = [];
  const timeline: string[] = [];
  let last = "";
  let battleEndedAt = -1;
  let callsAtA = -1;
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    for (const e of result.events) sounds.push(`${advance.frame}:${e.kind}:${e.id}`);
    const orchestrator = state.factoryRoundBattleOrchestrator;
    const p = orchestrator?.battleCommandPresentation;
    const desc = p ? `${p.lifecycle.phase}/${p.forfeitCursor}` : orchestrator?.battle ? "battle" : "ended";
    if (desc !== last) timeline.push(`${advance.frame}:${desc}`);
    last = desc;
    if (p?.lifecycle.phase === "forfeit-message" && callsAtA < 0) callsAtA = orchestrator!.battle!.rng.calls;
    if (battleEndedAt < 0 && orchestrator && orchestrator.battle === null) battleEndedAt = advance.frame;
  }
  return { state, sounds, timeline, battleEndedAt, callsAtA };
}

describe("RUN -> YES on the ROM-measured lab window (Scene OFF)", () => {
  const run = replayLab();

  it("walks the measured phases: YES at 131, forfeit message on A, battle over after the 98-tick message", () => {
    expect(run.timeline.filter((t) => !t.startsWith("1:") && !t.startsWith("33:"))).toEqual([
      "65:forfeit-question/1",
      "131:forfeit-question/0",
      "151:forfeit-message/0",
      `${151 + FORFEIT_MESSAGE_END_AT}:ended`,
    ]);
    expect({ first: FORFEIT_MESSAGE_FIRST_GLYPH_AT, end: FORFEIT_MESSAGE_END_AT, text: FORFEIT_MESSAGE_TEXT }).toEqual({
      first: 10,
      end: 98,
      text: "PLAYER forfeited the match!",
    });
  });

  it("emits the ROM's sounds: SE_SELECT on A, then the loss tail (BGM fade, factory BGM, SE_EXIT)", () => {
    const romSounds = rom.events
      .filter((e) => !e.noop && e.frame > 33 && e.kind !== "stop")
      .map((e) => `${e.frame}:${e.kind}:${e.id}`);
    expect(run.sounds).toEqual(romSounds);
    expect(run.sounds).toEqual(["65:se:5", "131:se:5", "151:se:5", "254:fade:476", "300:bgm:469", "326:se:9"]);
  });

  it("ends the round as roundLost and consumes no RNG for the forfeit", () => {
    const orchestrator = run.state.factoryRoundBattleOrchestrator!;
    expect(orchestrator.round.rules.phase).toBe("roundLost");
    expect(orchestrator.round.rules.lastBattle?.outcome).toBe("loss");
    const segment = orchestrator.rngSegments.at(-1)!;
    expect(segment.callEnd - segment.callStart).toBe(run.callsAtA);
  });
});

for (const scene of ["off", "on"] as const) {
  describe(`library: a forfeit is a lost battle (Scene ${scene.toUpperCase()})`, () => {
    function forfeitRun() {
      const session = new FactorySession({ battleScene: scene });
      const player = new RandomPlayer(new Rng(0), new ActionLog(false), "vanilla");
      player.forfeitRate = 1;
      const events: FactoryEvent[] = [];
      let sawForfeit = false;
      for (let frame = 1; frame <= 40_000 && session.ended === null; frame += 1) {
        events.push(...session.tick(player.decide(session.state), frame));
        if (session.state.factoryRoundBattleOrchestrator?.battleCommandPresentation?.lifecycle.phase === "forfeit-message") sawForfeit = true;
      }
      return { session, events, sawForfeit };
    }

    it("emits battle-end loss + challenge-end loss on the same frame, and replays identically from the trace", () => {
      const { session, events, sawForfeit } = forfeitRun();
      expect(sawForfeit).toBe(true);
      expect(events).toEqual([
        { type: "battle-end", result: "loss", streak: 0, frame: session.frame },
        { type: "challenge-end", reason: "loss", streak: 0, frame: session.frame },
      ]);
      const replay = replayChallenge({ battleScene: scene, segments: session.trace() });
      expect(replay).toMatchObject({ streak: 0, ended: "loss", battles: session.battles, digest: session.digest(), frames: session.frame });
      // The decision lives only in the input stream: replaying the same trace twice is identical.
      expect(replayChallenge({ battleScene: scene, segments: session.trace() }).digest).toBe(replay.digest);
    });
  });
}
