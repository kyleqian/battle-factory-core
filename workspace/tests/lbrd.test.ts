// lbr-d1 (user decision 2026-11-12, handoff item 0b): on the production route the 7th win ends as the ROM does -- warp to the Lobby, the won
// script (congratulations, BP award, exchange, record question, farewell), then free control in the walkable Lobby. No new-draft chain. The
// streak flag stays set (WonChallenge never clears it), so the attendant's next start continues the streak. docs/lbrd-win-lobby-return.md.
import { describe, expect, it } from "vitest";
import { PLAYER_NAME } from "../src/engine/playerName.ts";
import { tick, type EngineState } from "../src/engine/core.ts";
import { advanceFactoryCarry, createInitialFactoryCarry } from "../src/engine/factoryRoundChaining.ts";
import { isFactoryLobbyFacingSinglesAttendant } from "../src/engine/factoryLobbyFreeRoam.ts";
import { FACTORY_ROUND_WON_TERMINAL_PROFILE, isFactoryTerminalRoundWon } from "../src/engine/factoryTerminalPresentation.ts";
import type { FactoryEvent } from "../src/factoryContract.ts";
import { FactorySession } from "../src/factorySession.ts";
import { replayChallenge } from "../src/headless.ts";
import type { GbaButton } from "../src/input.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";
import {
  driveGeneratedRoundToCompletion,
  PLAYER_TRAINER_ID,
  stateAtDecidedRound,
} from "../tools/compare/factoryRoundCarrier.ts";

type Scene = "on" | "off";

interface WonLobby {
  readonly session: FactorySession;
  readonly player: RandomPlayer;
  readonly events: FactoryEvent[];
  readonly lobby: EngineState;
  readonly lastTerminal: NonNullable<EngineState["factoryTerminal"]>;
  readonly rentsBeforeLobby: number;
  readonly sawFarewell: boolean;
}

/**
 * Soak seeds that win their first round with the "winning" policy (scene-identical outcomes); seed 16 also wins the second, seed 0 loses it.
 * lbr-f: the saving -> saved timing fix moved the attendant hand-off cursor, so the deal moved; scan 1..7 on the full file (lbr-f2): only 2 passes (was 10, then 16).
 * lbr-g (#221 E1-E3: the Lobby cursor is now the ROM's after a battle exit and map load) moved the deal again: seed 2's continuation lost; a scan of 0..60 on the
 * mutated sequence (hand-off test, then continuation) found 0, 35 and 47; 0 is WIN_THEN_LOSE_SEED, so 35 (all 15 tests pass).
 * lbw3 (#221 E4: the Lobby NPC wander draws from the shared stream) moved it once more: 35's and 47's continuations lose; scanning 1..13 found 13 (all 15 pass).
 * wsh1 (Wish heal / Future Sight hit / Focus Band holds, Scene OFF 36 / 42 / 40 frames) moved the OFF deal: 13's OFF continuation loses. A scan of 14..60 found no seed
 * that passes every case; 19 wins the continuation in both scenes but its continued challenge loses before a retire prompt, while 13 still reaches the retire, so the
 * retire case keeps 13 (RETIRE_SEED).
 * hpd5 (measured on the hpd4 tip f40209793: the same 3 failures, so hpd4's floor-free foe-hit hold moved the deal, not hpd5's Scene ON-only audited leads): 19's OFF continuation
 * and 13's retire case now lose; a scan of 1..18 on the full file with the seed in both roles found 17 passing every case (13 passes all but the retire), so both use 17.
 */
// hpd8 (shape-A lead + hit tail moved the Scene ON deal): 17 lost the continuation; a scan of 1..24 with the seed in both roles found only 4 passing every case.
const WIN_TWO_SEED = 4;
const RETIRE_SEED = 4;
const WIN_THEN_LOSE_SEED = 0;

function newPlayer(seed: number): RandomPlayer {
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning");
  player.newChallengeFromLobby = false;
  return player;
}

/** Plays the real route from the anchor boot (default `challengeRequest`: the library's hold) to the first walkable Lobby after the 7th win. */
function playToWonLobby(seed: number, scene: Scene): WonLobby {
  const session = new FactorySession({ battleScene: scene });
  const player = newPlayer(seed);
  const events: FactoryEvent[] = [];
  let lastTerminal: WonLobby["lastTerminal"] | null = null;
  let rentsBeforeLobby = 0;
  let sawFarewell = false;
  for (let frame = 1; frame <= 120_000; frame += 1) {
    events.push(...session.tick(player.decide(session.state), frame));
    const state = session.state;
    if (state.factoryRoundBattleOrchestrator !== null) rentsBeforeLobby = state.factoryRoundBattleOrchestrator.facilityState.rentsCount;
    if (state.factoryTerminal !== null) {
      lastTerminal = state.factoryTerminal;
      if (state.factoryTerminal.declineFarewellReleaseAge !== null) sawFarewell = true;
    }
    if (state.lobbyFreeRoam !== null) {
      return { session, player, events, lobby: state, lastTerminal: lastTerminal!, rentsBeforeLobby, sawFarewell };
    }
  }
  throw new Error(`seed ${seed} / ${scene}: never reached the walkable Lobby`);
}

/** Plays on (the player taps A at the attendant, then plays the next challenge) until `stop`; returns the events it produced. */
function playOn(run: WonLobby, stop: (events: FactoryEvent[], state: EngineState) => boolean, limit = 120_000): FactoryEvent[] {
  const events: FactoryEvent[] = [];
  run.player.newChallengeFromLobby = true;
  for (let frame = 1; frame <= limit; frame += 1) {
    events.push(...run.session.tick(run.player.decide(run.session.state), 0));
    if (stop(events, run.session.state)) return events;
  }
  throw new Error("playOn: the stop condition was not reached");
}

const A: ReadonlySet<GbaButton> = new Set(["A"]);
const IDLE: ReadonlySet<GbaButton> = new Set();
const types = (events: readonly FactoryEvent[]): string[] => events.map((event) => event.type);

for (const scene of ["off", "on"] as const) {
  describe(`lbrd: a 7-win ends in the walkable Lobby, the attendant continues the streak (Scene ${scene.toUpperCase()})`, () => {
    const run = playToWonLobby(WIN_TWO_SEED, scene);
    const { session, events, lobby, lastTerminal } = run;

    it("reaches lobbyFreeRoam through the won terminal (BP award, record question, farewell), no chained draft", () => {
      expect(lobby.lobbyFreeRoam).not.toBeNull();
      expect(lobby.pendingGeneratedRound ?? null).toBeNull();
      expect(lobby.appRoute).toBe("generated-orchestrator");
      expect(lastTerminal.profile.outcome).toBe("roundWon");
      expect(lastTerminal.recordPromptReleaseAge).not.toBeNull();
      expect(lastTerminal.recordChoice).not.toBeNull();
      expect(run.sawFarewell).toBe(true);
      expect(isFactoryLobbyFacingSinglesAttendant(lobby.lobbyFreeRoam!)).toBe(true);
    });

    it("the library sees seven battle-ends and one round-end: no challenge-end, no hold", () => {
      expect(types(events)).toEqual([...Array.from({ length: 7 }, () => "battle-end"), "round-end"]);
      expect(events.filter((event) => event.type === "battle-end").map((event) => (event as { streak: number }).streak)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(events[7]).toMatchObject({ type: "round-end", streak: 7 });
      expect(session.ended).toBeNull();
      expect(lobby.attendantRequestHold).toBe(false);
    });

    it("banks the carry at Lobby entry: streak 7, rents kept, 3 BP (first challenge), and marks the streak kept", () => {
      expect(lobby.lobbyStreakKept).toBe(true);
      expect(lobby.factoryCarry).toMatchObject({
        factoryWinStreak: 7,
        rentsCount: run.rentsBeforeLobby,
        battlePoints: 3,
        factorySymbolsCount: 0,
      });
      expect(isFactoryTerminalRoundWon(lastTerminal)).toBe(true);
      expect(lastTerminal).toMatchObject({ battlePointsBeforeAward: 0, displayedBattlePoints: 3, profile: { battlePointAward: 3 } });
    });

    it("the attendant hand-off keeps the streak and the rents, the draft is dealt from the Lobby's live cursor, and no event or hold appears", () => {
      const after: FactoryEvent[] = [];
      let state = lobby;
      let frames = 0;
      let sawEntry = false;
      while ((state.lobbyFreeRoam !== null || state.prebattleEntry !== null) && frames < 8_000) {
        for (const keys of [A, A, IDLE, IDLE, IDLE, IDLE, IDLE, IDLE]) {
          after.push(...session.tick(keys, 0));
          state = session.state;
          frames += 1;
          sawEntry ||= state.prebattleEntry !== null;
          if (state.lobbyFreeRoam === null && state.prebattleEntry === null) break;
        }
      }
      // lbr-e: the continued streak walks the same PreBattleRoom entry (no streak-dependent text) before the draft opens.
      expect(sawEntry).toBe(true);
      expect(state.lobbyFreeRoam).toBeNull();
      expect(state.prebattleEntry).toBeNull();
      expect(after).toEqual([]);
      expect(session.ended).toBeNull();
      expect(state.attendantRequestHold).toBe(false);
      expect(state.pendingGeneratedRound).not.toBeNull();
      expect(state.pendingGeneratedRound!.carry).toEqual(lobby.factoryCarry);
      expect(state.pendingGeneratedRound!.carry.factoryWinStreak).toBe(7);
      expect(state.pendingGeneratedRound!.carry.rentsCount).toBe(run.rentsBeforeLobby);
      // nch231: the new draft is dealt from the Lobby's vblank cursor of the hand-off tick, not the round's end cursor.
      expect(state.pendingGeneratedRound!.rngValueBefore).not.toBe(lobby.factoryRoundBattleOrchestrator?.round.rules.rngValue);
      expect(state.lobbyStreakKept).toBe(false);
    });

    if (scene === "off") {
      it("the next challenge continues from 7: battle-end streaks 8 to 14 and a second round-end, still no challenge-end", () => {
        const more = playOn(run, (produced) => produced.some((event) => event.type === "round-end"));
        const streaks = more.filter((event) => event.type === "battle-end").map((event) => (event as { streak: number }).streak);
        expect(streaks).toEqual([8, 9, 10, 11, 12, 13, 14]);
        expect(more[more.length - 1]).toMatchObject({ type: "round-end", streak: 14 });
        expect(types(more).filter((type) => type !== "battle-end")).toEqual(["round-end"]);
        // The second won round's Lobby entry is swallowed too (no retire event) once the terminal finishes.
        const later = playOn(run, (_produced, state) => state.lobbyFreeRoam !== null);
        expect(later).toEqual([]);
        expect(run.session.ended).toBeNull();
        expect(run.session.state.factoryCarry.factoryWinStreak).toBe(14);
        expect(run.session.state.lobbyStreakKept).toBe(true);
      });

      it("the whole trace replays to the same battles, no end and the same digest", () => {
        const full = run.session.recorder.segmentsFrom();
        const replay = replayChallenge({ battleScene: "off", segments: full });
        expect(replay.ended).toBeNull();
        expect(replay.battles).toEqual(run.session.battles);
        expect(replay.streak).toBe(run.session.streak);
        expect(replay.digest).toBe(run.session.digest());
      });
    }
  });
}

describe("lbrd: a later retire or loss in the continued challenge still ends it (Scene OFF)", () => {
  it("a retire after the continuation emits challenge-end retire exactly once, on its own Lobby-entry frame", () => {
    // hie1 (held-item effect hold) moved the deal: seed 0's continuation now loses its first battle before any retire prompt, so the
    // retire case uses a seed that wins its continuation's first battles (wsh1: RETIRE_SEED, see the seed note above).
    const run = playToWonLobby(RETIRE_SEED, "off");
    expect(run.session.ended).toBeNull();
    run.player.retireRate = 1;
    const more = playOn(run, (_events, state) => state.lobbyFreeRoam !== null && run.session.ended !== null);
    const ends = more.filter((event) => event.type === "challenge-end");
    expect(ends).toHaveLength(1);
    expect(ends[0]).toMatchObject({ type: "challenge-end", reason: "retire" });
    // Whatever the continued challenge won before the retire counts on top of the carried 7.
    const battles = more.filter((event) => event.type === "battle-end");
    expect(battles.every((event) => (event as { result: string }).result === "win")).toBe(true);
    expect((ends[0] as { streak: number }).streak).toBe(7 + battles.length);
    expect(types(more).slice(-1)).toEqual(["challenge-end"]);
    expect(run.session.ended).toBe("retire");
  });

  it("a challenge-2 loss emits battle-end loss + challenge-end loss on the same frame, with the streak at 7 + the battles won", () => {
    const run = playToWonLobby(WIN_THEN_LOSE_SEED, "off");
    const more = playOn(run, (events) => events.some((event) => event.type === "challenge-end"));
    const end = more.find((event) => event.type === "challenge-end")!;
    expect(end).toMatchObject({ type: "challenge-end", reason: "loss" });
    expect(types(more).slice(-2)).toEqual(["battle-end", "challenge-end"]);
    const lossEnd = more[more.length - 2] as { frame: number; streak: number; result: string };
    expect(lossEnd.result).toBe("loss");
    expect(lossEnd.frame).toBe((end as { frame: number }).frame);
    expect(lossEnd.streak).toBe((end as { streak: number }).streak);
    expect(lossEnd.streak).toBeGreaterThanOrEqual(7);
    expect(types(more).filter((type) => type === "challenge-end")).toHaveLength(1);
    expect(run.session.ended).toBe("loss");
    // The loss clears the streak flag as always (lbra): the next Lobby entry resets the carry.
    playOn(run, (_events, state) => state.lobbyFreeRoam !== null);
    expect(run.session.state.factoryCarry.factoryWinStreak).toBe(0);
    expect(run.session.state.factoryCarry.rentsCount).toBe(0);
    expect(run.session.state.lobbyStreakKept).toBe(false);
  });
});

describe("lbrd: the won terminal shows the BP the round awards (3 / 4 / 5, +10 for a Brain win)", () => {
  it("a silver Brain win at streak 21 shows 14 BP on top of the carried total and banks it with the symbol", () => {
    // factoryRoundChaining.test.ts (b): seed 9 chains three real wins, the third against the silver Frontier Brain.
    let carry = createInitialFactoryCarry(PLAYER_TRAINER_ID);
    let seed = 9;
    let round = driveGeneratedRoundToCompletion(carry, seed);
    for (const awarded of [3, 3]) {
      expect(round.round.rules.phase).toBe("roundComplete");
      expect(round.roundOutcome!.battlePointsAwarded).toBe(awarded);
      carry = advanceFactoryCarry(carry, true, round.roundOutcome!, round.facilityState.rentsCount);
      seed = round.round.rules.rngValue;
      round = driveGeneratedRoundToCompletion(carry, seed);
    }
    expect(round.round.rules.phase).toBe("roundComplete");
    expect(round.round.rules.currentOpponent.frontierBrain).toMatchObject({ status: "silver" });
    expect(round.roundOutcome).toMatchObject({ battlePointsAwarded: 14, symbolGranted: true, newSymbolsCount: 1 });
    expect(carry.factoryWinStreak).toBe(14);

    let state: EngineState = stateAtDecidedRound(round, carry);
    for (let i = 0; i < 8_000 && state.lobbyFreeRoam === null; i += 1) {
      state = tick(state, i % 2 === 0 ? A : IDLE);
    }
    const terminal = state.factoryTerminal!;
    expect(state.lobbyFreeRoam).not.toBeNull();
    expect(isFactoryTerminalRoundWon(terminal)).toBe(true);
    expect(terminal).toMatchObject({
      frontierBrain: true,
      battlePointsBeforeAward: carry.battlePoints,
      displayedBattlePoints: carry.battlePoints + 14,
      profile: { battlePointAward: 14, getPoints: [`${PLAYER_NAME} obtained 14 Battle Point(s).`, ""] },
    });
    expect(state.factoryCarry).toMatchObject({
      factoryWinStreak: 21,
      battlePoints: carry.battlePoints + 14,
      factorySymbolsCount: 1,
      rentsCount: round.facilityState.rentsCount,
    });
    expect(state.lobbyStreakKept).toBe(true);
  });

  it("the default won profile is the 3 BP text and keeps its identity", () => {
    expect(FACTORY_ROUND_WON_TERMINAL_PROFILE.battlePointAward).toBe(3);
    expect(FACTORY_ROUND_WON_TERMINAL_PROFILE.getPoints[0]).toBe(`${PLAYER_NAME} obtained 3 Battle Point(s).`);
  });

  it("the won farewell input gates are the ROM's (docs/lbrd2a-won-tail-rom.md): 41 after the farewell text, 74 after the recorded message", () => {
    expect(FACTORY_ROUND_WON_TERMINAL_PROFILE.declineInputDelay).toBe(41);
    expect(FACTORY_ROUND_WON_TERMINAL_PROFILE.recordSavedInputDelay).toBe(74);
  });
});
