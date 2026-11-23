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
 * ais4 (the opponent faint replacement's send-in runs the AI timeline, +2 frames per replacement, so every soak trajectory shifts): 17's continuation loses (13 passes all but the retire);
 * a scan of 1..12 on the full file with the seed in both roles found 4 passing every case (15 / 15; seed 2 loses only the continuation), so both use 4.
 */
// hpd8 (shape-A lead + hit tail moved the Scene ON deal): 17 lost the continuation; a scan of 1..24 with the seed in both roles found only 4 passing every case.
// hpf1 (hit -> message / faint-chain / turn-end hp commands are floor-free, ROM-measured): 4 lost the Scene OFF continuation and seed 0 no longer loses its second round; a scan of 13..44
// with the seed in both win roles found 14, 23 and 36 passing all but the challenge-2 loss; a scan of the loss seed 1..24 (win = 14) found 4, 13, 14, 17, 19 losing it. 14 for all three.
// fix 51 (docs/parity-mac/noland-room-scenes.md: the won Lobby's clock starts at the Lobby's map load, ~100 frames later than before, and its award gates are the ROM's) moved the deal again: 17's OFF continuation and 0's loss no longer play out. A scan (win 1..12 on the win / retire cases, loss 1..2 on the loss case) found 2 passing every case in both roles, so all three use 2 (the loss case plays on past the second challenge to the first loss).
// merge of the box's 2026-11-18 run (to cbd64bb34) with the Mac's fixes 44-51: 14's (and fix 51's 2's) continuation loses; a scan of 0..30 with the seed
// in all three roles found only 0 passing every case (4 and 19 fail one case, 2 / 14 / 23 the continuation), so all three use 0.
// btn1 (battle strings with a \p / \l gate wait for a new A / B press: every soak trajectory shifts): 0 lost the Scene OFF first round; a scan of 1..15 with the seed in all three roles
// found only 2 passing every case (15 / 15; 4 and 13 fail 2 cases, 10 and 14 fail 8), so all three use 2.
// merge of pau4 / btn1 / pau5 / hpf5 (pin1; the presented entry scripts, button waits and hp lengths shift every soak trajectory): 2 lost the Scene OFF continuation and the challenge-2 loss
// case. A scan of 0..15 with the seed in all three roles (scratch copies of this file) found only 14 passing every case (15 / 15; 2 and 4 fail 2 cases, 13 fails 3, 10 fails 5, 0 fails 8,
// the rest 12), so all three use 14.
// hcr1 (Scene OFF first used-move print at commit + 6 + u: presentation timing, every OFF soak trajectory shifts a few frames): 14 lost the OFF continuation and fails 8 cases. A scan of 0..15
// with the seed in all three roles (scratch copies of this file) found no seed passing every case: 10 and 4 fail only the retire case, 0 / 2 / 13 fail only the two WIN_TWO-role continuation
// cases, the rest 8 .. 12. Roles are independent cases, so WIN_TWO and WIN_THEN_LOSE use 10 (passes all but the retire) and RETIRE uses 0 (passes the retire and the loss case).
// hcr1b (the first used-move glyph at commit + 7 + u, pixel-exact): 10 / 0 / 10 fail 3 cases. A scan of 0..47 with the seed in all three roles (scratch copies of this file) found 23, 33, 44 and 47
// passing every case (0..15 all fail at least the two WIN_TWO-role continuation cases; 17 and 40 fail only those two, 36 only the retire case), so all three use 23.
// merge of rsw1 + hcr1b + gsp2b (pin2): 23 still passes every case. A scan of 0..22 with the seed in all three roles on the merged tree (scratch copies of this file) found no seed passing all 15 (17 loses only the two WIN_TWO continuation cases), so all three stay 23.
// lbw9 (the Lobby save wait is a timer / held A, the menus clamp: every in-game new challenge is dealt from a later cursor): 23 loses the continuation and the challenge-2 loss case. A scan of 0..31 with the seed
// in all three roles (scratch copies of this file, full-file runs) found 0 and 10 passing all 15 cases (13 fails only the challenge-2 loss case; 4, 14 and 17 fail the two continuation cases), so all three use 0.
// fop1 (docs/fop1-first-opponent-order.md: a new challenge's first opponent is rolled in the ROM's order, so every continuation's first
// trainer moves): 14 lost the continuation in both scenes. A scan of 0..20 with the seed in all three roles (scratch copies of this file)
// found none passing every case: 2 fails only the retire (its continued challenge loses a battle before the retire), 13 only the
// challenge-2 loss (it does not lose), 4 / 10 / 14 / 17 the continuation, the rest 5 to 12. So the continuation and the loss use 2, the retire 13.
// fnt1 (docs/fnt1-fainted-box-clear.md: a "fainted!" box takes the press 2 rows earlier, so the soak player's presses land on new phases):
// 2's Scene OFF continued challenge no longer loses within the 120,000 frames. A scan of 0..20 in the loss role (a scratch copy of this file,
// the loss case alone) found 10 and 19; the continuation (2) and the retire (13) still pass, so only the loss moves, to 10. With the accept edge
// alone undone (isBattleResolutionButtonMessageAcceptable's promptClear lead) 2 passes the loss case again.
// trial-fix-20261121 (fnt1 + lbb1 + msg2 + wbh1 + mvs1 + hdt1 merged on fop1 / sct1): 2's Scene OFF continued challenge no longer
// reaches the second round-end. A scan of 0..20 in the continuation role (scratch copies of this file; retire 13, loss 10 unchanged) found
// 10, 13 and 19 passing every case (15 / 15; 2 and 4 fail the 2 continuation cases, 17 and 20 fail 6, the rest 10), so the continuation uses 10.
// merge of the box's 2026-11-20 run with the Mac's 11-21 fixes: the merge kept the box's 0 / 0 / 0 (lbw9's re-pin; the Mac had 10 / 13 / 10 after trial-fix-20261121). All 15 cases
// pass with 0 in all three roles on the merged tree, so they stay.
// wtl1 (the win tail holds 24 more rows before "Player defeated", ROM P + 26): 0's Scene OFF continuation loses. A scan of 1..28 in the WIN_TWO role (scratch copies of this file) found only 13 passing all 15
// (2 / 4 / 10 fail the two continuation cases, 19 / 23 fail 2 cases, the rest more); RETIRE and the loss keep 0.
// merge of this run's eqk1 (the Earthquake hit-all transition, the Pausex20 before "It doesn't affect", Magnitude) with chg2 / chg3 / hie5: 13's Scene OFF
// continuation loses. A scan of 0..23 in the WIN_TWO role (scratch copies of this file) found 2 and 17 passing all 15 (0 / 4 / 10 / 13 / 19 / 23 fail the two
// continuation cases, 14 / 18 fail 6, the rest 10); RETIRE and the loss keep 0.
// etp1 (33bdace6d, end-turn weather prints take the end-turn rows; the soak player's presses land on new phases): 13's Scene OFF continuation loses. A scan of 0..16 in the WIN_TWO role (scratch copies of this file)
// found only 4 passing all 15 (0 / 2 / 10 fail the two continuation cases, 14 fails 6, the rest 10); RETIRE and the loss keep 0. etp2 found it (the base c114f4410 passes with 13).
// merge of etp1 / etp2 (end-turn prints on the ROM rows) with this run's fold: 2's Scene OFF continuation loses. A scan of 0..23 in the WIN_TWO role (scratch
// copies of this file) found 4 and 19 passing all 15 (0 / 2 / 10 / 13 / 23 fail the two continuation cases, 14 / 17 / 18 fail 6, the rest 10); RETIRE and the loss keep 0.
// merge of the box's night run with the Mac's tdr1 (tri1 / wtl1 / sst1: the battle intro at each transition's own frame, the win tail's
// slide wait, the sandstorm sound): 4 fails the two Scene OFF continuation cases, 0 the challenge-2 loss. A scan of 0..23 with the seed in all
// three roles (scratch copies of this file) found only 10 passing all 15 (23 all but the loss; 2 / 4 / 13 / 14 / 19 the two continuation
// cases, 0 those and the loss, 17 those and the retire, the rest 12). So all three roles use 10.
// abs1 (the Lobby attendant's `\p` pages take a press from the last glyph's frame and its end pages two frames after, as the ROM does; the soak player's presses and the
// Lobby cursor of every new challenge move): 10's Scene OFF continuation loses. A scan of 0..23 (minus 10) in the WIN_TWO role (scratch copies of this file) found 14 and 19
// passing all 15 (0 / 2 / 4 / 13 fail the two continuation cases, 23 fails 1, the rest 10); RETIRE and the loss keep 10.
// swt1 (an opponent faint replacement / AI send-in's next print is 9 frames later, ROM FaintedMonSendOutNew+0x10 release -> next print +12; the soak player's presses land on new phases): 14's Scene OFF first round
// loses (the six WIN_TWO-role cases fail; RETIRE and the loss keep 10). A scan of 0..5 in the WIN_TWO role (scratch copies of this file) found 0 passing all 15 (2 / 4 fail the two continuation cases, 1 / 3 / 5 fail 10).
// ohs1 (Scene OFF pre-move ConfusedNoMore / InLove prints hold 64 + 5 / 64 + 6 before the used print: every OFF soak trajectory with such a print shifts frames): 10's challenge-2 loss case no longer plays out
// (it never loses before the stop condition). A scan of 0..15 (minus 10) in the loss role (scratch copies of this file) found 0, 2 and 4 passing; the WIN_TWO and RETIRE roles still pass on 0 / 10, so only the loss role moves, to 0.
const WIN_TWO_SEED = 0;
const RETIRE_SEED = 10;
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
