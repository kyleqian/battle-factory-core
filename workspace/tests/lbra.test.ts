// lbra (user decision 2026-11-12, handoff item 0b step 1): on the production route a LOSS, a FORFEIT and a RETIRE all end as the ROM does --
// warp to the Lobby, play the OnFrame LostChallenge result script (record question only when allowed; a forfeit sets disableRecordBattle),
// then hand over free control in the walkable Lobby. No new-draft chain. ROM windows: tools/compare/traces/lbra-*.json (docs/lbra-lobby-return.md).
import { describe, expect, it } from "vitest";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { isFactoryLobbyFacingSinglesAttendant } from "../src/engine/factoryLobbyFreeRoam.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import type { FactoryEvent } from "../src/factoryContract.ts";
import { FactorySession } from "../src/factorySession.ts";
import type { GbaButton } from "../src/input.ts";
import { driveAttendantConversation, driveBriefing } from "./helpers/lobbyAttendant.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

type Kind = "loss" | "forfeit" | "retire";

interface Run {
  readonly session: FactorySession;
  readonly events: FactoryEvent[];
  readonly lobbyFrame: number;
  readonly lobby: EngineState;
  /** Terminal presentation, as seen on the last frame it existed before the Lobby. */
  readonly lastTerminal: NonNullable<EngineState["factoryTerminal"]>;
  readonly carryBeforeEnd: EngineState["factoryCarry"];
  readonly sawRecordPrompt: boolean;
  readonly sawFarewell: boolean;
}

function play(kind: Kind, scene: "on" | "off"): Run {
  const session = new FactorySession({ battleScene: scene, challengeRequest: "continue" });
  const player =
    kind === "retire"
      ? new RandomPlayer(new Rng(1), new ActionLog(false), "winning")
      : new RandomPlayer(new Rng(0), new ActionLog(false), "vanilla");
  if (kind === "forfeit") player.forfeitRate = 1;
  if (kind === "retire") player.retireRate = 1;
  player.newChallengeFromLobby = false;
  const events: FactoryEvent[] = [];
  let lastTerminal: Run["lastTerminal"] | null = null;
  let carryBeforeEnd = session.state.factoryCarry;
  let sawRecordPrompt = false;
  let sawFarewell = false;
  for (let frame = 1; frame <= 60_000; frame += 1) {
    const before = session.state;
    events.push(...session.tick(player.decide(before), frame));
    const state = session.state;
    if (state.lobbyFreeRoam !== null) {
      return {
        session,
        events,
        lobbyFrame: session.frame,
        lobby: state,
        lastTerminal: lastTerminal!,
        carryBeforeEnd,
        sawRecordPrompt,
        sawFarewell,
      };
    }
    if (state.factoryTerminal === null && state.factoryRoundBattleOrchestrator?.roundOutcome == null) {
      carryBeforeEnd = state.factoryCarry;
    }
    const terminal = state.factoryTerminal;
    if (terminal !== null) {
      lastTerminal = terminal;
      if (terminal.recordPromptReleaseAge !== null) sawRecordPrompt = true;
      if (terminal.declineFarewellReleaseAge !== null) sawFarewell = true;
    }
  }
  throw new Error(`${kind}/${scene}: never reached the walkable Lobby`);
}

for (const scene of ["off", "on"] as const) {
  describe(`lbra: loss / forfeit / retire end in the walkable Lobby (Scene ${scene.toUpperCase()})`, () => {
    const runs = {
      loss: play("loss", scene),
      forfeit: play("forfeit", scene),
      retire: play("retire", scene),
    };

    it.each(["loss", "forfeit", "retire"] as const)("%s: reaches lobbyFreeRoam through the loss terminal, no chained draft", (kind) => {
      const run = runs[kind];
      expect(run.lobby.lobbyFreeRoam).not.toBeNull();
      expect(run.lobby.pendingGeneratedRound ?? null).toBeNull();
      expect(run.lobby.appRoute).toBe("generated-orchestrator");
      expect(run.lastTerminal.profile.outcome).toBe("loss");
      expect(run.sawFarewell).toBe(true);
      expect(isFactoryLobbyFacingSinglesAttendant(run.lobby.lobbyFreeRoam!)).toBe(true);
    });

    it("loss and retire ask the record question (YES/NO, answer recorded); the forfeit skips it", () => {
      for (const kind of ["loss", "retire"] as const) {
        expect(runs[kind].sawRecordPrompt).toBe(true);
        expect(runs[kind].lastTerminal.recordDisabled).toBe(false);
        expect(runs[kind].lastTerminal.recordChoice).not.toBeNull();
      }
      // Lobby:77-78 -- disableRecordBattle TRUE jumps straight to EndRecordBattle; battle_main.c:5062 sets it for B_OUTCOME_FORFEITED.
      expect(runs.forfeit.sawRecordPrompt).toBe(false);
      expect(runs.forfeit.lastTerminal.recordDisabled).toBe(true);
      expect(runs.forfeit.lastTerminal.recordChoice).toBeNull();
    });

    it("the loss carry is reset on Lobby entry: streak 0, rents 0, symbols and BP stay", () => {
      for (const kind of ["loss", "forfeit", "retire"] as const) {
        const run = runs[kind];
        expect(run.lobby.factoryCarry).toMatchObject({
          factoryWinStreak: 0,
          rentsCount: 0,
          factorySymbolsCount: run.carryBeforeEnd.factorySymbolsCount,
          battlePoints: run.carryBeforeEnd.battlePoints,
        });
      }
      // The retire follows a won battle (streak 1 in the round); the Lobby carry still starts the next challenge from 0.
      expect(runs.retire.session.streak).toBe(1);
    });

    it("the library challenge-end event keeps its frame: loss/forfeit on the battle-end frame (before the Lobby), retire on the Lobby-entry frame", () => {
      for (const kind of ["loss", "forfeit"] as const) {
        const { events, session, lobbyFrame } = runs[kind];
        expect(events).toEqual([
          { type: "battle-end", result: "loss", streak: 0, frame: events[0]!.frame },
          { type: "challenge-end", reason: "loss", streak: 0, frame: events[0]!.frame },
        ]);
        expect(events[0]!.frame).toBeLessThan(lobbyFrame);
        expect(session.ended).toBe("loss");
      }
      const { events, session, lobbyFrame } = runs.retire;
      expect(events.map((e) => e.type)).toEqual(["battle-end", "challenge-end"]);
      expect(events[1]).toMatchObject({ reason: "retire", streak: 1 });
      // The retire event fires on the frame the Lobby free-roam begins (factorySession.ts, docs/library-package.md); unchanged by lbra.
      expect(events[1]!.frame).toBe(lobbyFrame);
      expect(session.ended).toBe("retire");
    });
  });
}

describe("lbra: a new challenge from the attendant after a loss", () => {
  // nch231 (docs/nch231-new-challenge.md): the ROM Lobby runs on the free-running per-VBlank RNG, so A at the attendant seeds the next
  // draft from the cursor the Lobby advanced -- not from the battle orchestrator's end cursor the removed chain used. Pins the live cursor.
  it.each(["on", "off"] as const)("deals from the live vblank cursor, with the loss carry (scene %s)", (scene) => {
    const run = play("loss", scene);
    let state = run.lobby;
    const idle = new Set<GbaButton>();
    for (let i = 0; i < 90; i += 1) state = tick(state, idle);
    expect(isFactoryLobbyFacingSinglesAttendant(state.lobbyFreeRoam!)).toBe(true);
    const cursor = state.rngValue;
    expect(cursor).not.toBe(createInitialState().rngValue);
    const opened = tick(state, new Set<GbaButton>(["A"]));
    expect(opened.lobbyAttendant).not.toBeNull();
    const drive = driveAttendantConversation(opened);
    expect(drive.state.lobbyFreeRoam).toBeNull();
    expect(drive.state.prebattleEntry).not.toBeNull();
    expect(drive.beforeHandoff.rngValue).not.toBe(cursor);
    // lbr-e: the deal runs after the PreBattleRoom walk, from the cursor at the end of the previous tick.
    const brief = driveBriefing(drive.state);
    const after = brief.state;
    expect(after.pendingGeneratedRound?.rngValueBefore).toBe(brief.beforeDeal.rngValue);
    expect(after.factoryCarry).toMatchObject({ factoryWinStreak: 0, rentsCount: 0 });
  }, 120_000);
});
