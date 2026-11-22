// Tier-1 pin for the random-play soak driver (tools/soak/randomRoundSoak.ts).
//
// Pins the currently-green soak surface: a seeded random player, driving the
// production play path (createInitialState + tick, real button presses only)
// through draft -> prebattle room -> battle room -> generated battle-start
// intro, reaches battle 1's first interactive action menu without any engine
// throw, for a small fixed seed set. Seeds that crash deeper in the round are
// cataloged in docs/soak-crash-catalog.md, NOT pinned here — as of 2026-08-08
// every soaked seed crashes inside battle 1's resolution presentation, so the
// full-round surface cannot be pinned green yet. When those engine defects
// close, extend this pin toward full rounds.

import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { GbaButton } from "../src/input.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { BattleSubmittedDecision } from "../src/engine/battleDecisionBoundary.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  beginFactoryRoundBattleStartIntro,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  advanceFactoryRoundPresentation,
  submitFactoryRoundPlayerDecision,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  createInitialFactoryCarry,
  type FactoryCarry,
} from "../src/engine/factoryRoundChaining.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import type { FactoryRentalRoster } from "../src/engine/factorySwap.ts";
import { getFactoryFrontierBrainStatus } from "../src/engine/frontierBrainStatus.ts";
import {
  buildWinningSwapPlan,
  createStartCarryState,
  isPlayerVoluntarySwitchTrapped,
  pickWinningFightSlot,
  pickWinningSwitchRow,
  resolveMaxFrames,
  scoreFactorySwapCandidate,
  validateStartCarry,
  RandomPlayer,
  Rng,
  runSeed,
} from "../tools/soak/randomRoundSoakDriver.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";

const PIN_SEEDS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function strongRouteRecord(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function createSevenWinLiveState(): EngineState {
  const playerRentalRecords = [
    strongRouteRecord(664),
    strongRouteRecord(678),
    strongRouteRecord(527),
  ] as const;
  const orchestrator = beginFactoryRoundBattleStartIntro(
    createFactoryRoundBattleOrchestrator({
      id: "seven-win-live-seam-seed-21",
      rngValue: 21,
      factoryWinStreak: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords,
        savedRentalRecords: [
          ...playerRentalRecords,
          strongRouteRecord(1),
          strongRouteRecord(2),
          strongRouteRecord(3),
        ],
      },
    }),
  );
  return {
    ...createInitialState(),
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: orchestrator.round.rules.rngValue,
  };
}

// ---------------------------------------------------------------------------
// Orchestrator-level round carrier (mirrors factoryRoundChaining.test.ts's
// own driveGeneratedRoundToCompletion/driveTerminalToNextDraft/
// stateAtDecidedRound helpers) -- reused below to reach a chained-then-lost
// run: round 1 wins (the known-strong 664/678/527 trio) carrying the streak
// to 7, then round 2 loses (arbitrary generated rentals, same recipe as that
// file's "(c)" case), the cheapest deterministic way to exercise the exact
// scenario where the old carriedWinStreak snapshot lies.
// ---------------------------------------------------------------------------

function acknowledgeAndAdvance(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
}

function choosePlayerDecision(
  state: FactoryRoundBattleOrchestratorState,
): BattleSubmittedDecision {
  const boundary = state.battle?.boundary;
  if (boundary?.kind !== "decision-required" || boundary.request.side !== "player") {
    throw new Error("expected a player decision");
  }
  if (boundary.request.kind === "forced-switch") {
    return { kind: "switch", partyIndex: boundary.request.legalPartyIndexes[0]! };
  }
  const active = state.battle!.rules.rulesContext.battlers[0]!;
  const preferredSlot = active.partyIndex === 1 && active.isFirstTurn === 2 ? 3 : 0;
  return boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move" && decision.moveSlot === preferredSlot,
  ) ?? boundary.request.legalDecisions.find(
    (decision) => decision.kind === "use-move",
  )!;
}

function driveGeneratedRoundToCompletion(
  carry: FactoryCarry,
  seed: number,
  // "strong" (the known-reliable 664/678/527 trio) drives a win; "weak"
  // rents whatever the live generator pulls into slots 0/1/2 -- not tuned to
  // win, used below to reach a scripted roundLost regardless of carry.
  partyStrength: "strong" | "weak" = "strong",
): FactoryRoundBattleOrchestratorState {
  const playerRecords = [strongRouteRecord(664), strongRouteRecord(678), strongRouteRecord(527)] as const;
  const savedRentalRecords = [
    ...playerRecords,
    strongRouteRecord(1),
    strongRouteRecord(2),
    strongRouteRecord(3),
  ] as const;
  let state = createFactoryRoundBattleOrchestrator({
    id: `random-round-soak-depth-carrier-${seed}`,
    rngValue: seed,
    factoryWinStreak: carry.factoryWinStreak,
    playerTrainerId: carry.playerTrainerId,
    battleTowerLevel50WinStreak: 0,
    factorySymbolsCount: carry.factorySymbolsCount,
    facilityState: { rentsCount: carry.rentsCount },
    rentals: partyStrength === "strong"
      ? { type: "currentRecords", playerRentalRecords: playerRecords, savedRentalRecords }
      : { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  });
  for (
    let budget = 0;
    budget < 1_000
      && state.round.rules.phase !== "roundComplete"
      && state.round.rules.phase !== "roundLost";
    budget += 1
  ) {
    if (state.battle !== null) {
      state = submitFactoryRoundPlayerDecision(state, choosePlayerDecision(state));
      continue;
    }
    if (
      state.round.rules.phase === "presentingBattleStart"
      || state.round.rules.phase === "presentingBattleWin"
      || state.round.rules.phase === "presentingSwapResult"
    ) {
      state = acknowledgeAndAdvance(state);
      continue;
    }
    if (state.round.rules.phase === "awaitingSwapDecision") {
      const commandId = state.round.presentation?.command.commandId;
      if (commandId === undefined) throw new Error("expected swap-offer presentation command");
      state = completeFactoryRoundPresentation(state, { commandId });
      state = chooseFactoryRoundSwap(state, { type: "decline" });
      continue;
    }
    throw new Error(`unexpected carrier phase ${state.round.rules.phase}`);
  }
  return state;
}

/** tick()s a decided round's terminal forward, holding A every other frame
 * (the record menu's cursor stays at its default NO), until it chains into
 * the next generated draft. */
function driveTerminalToNextDraft(state: EngineState, maxTicks = 3_000): EngineState {
  let s = state;
  const A: ReadonlySet<GbaButton> = new Set(["A"]);
  const NONE: ReadonlySet<GbaButton> = new Set();
  for (let i = 0; i < maxTicks; i += 1) {
    if (s.pendingGeneratedRound !== null) return s;
    s = tick(s, i % 2 === 0 ? A : NONE);
  }
  throw new Error(`terminal did not chain into the next draft within ${maxTicks} ticks`);
}

function stateAtDecidedRound(
  round: FactoryRoundBattleOrchestratorState,
  carry: FactoryCarry,
): EngineState {
  return { ...createInitialState(), factoryCarry: carry, factoryRoundBattleOrchestrator: round };
}

describe("random round soak driver (green milestone pin)", () => {
  it("reaches battle 1's first action menu crash-free for the pinned seeds", () => {
    for (const seed of PIN_SEEDS) {
      const result = runSeed(seed, {
        maxFrames: 6_000,
        renderEvery: 8,
        stopAtFirstActionMenu: true,
      });
      expect(result, `seed ${seed}: ${result.errorMessage ?? result.hangSurface ?? ""}`)
        .toMatchObject({
          seed,
          outcome: "OK",
          endState: "milestone:first-action-menu",
          battle: 1,
        });
      // The whole draft->intro route runs ~1.4-1.6k frames; a blowout here
      // means the driver lost its way (a driver bug, not an engine bug).
      expect(result.frames).toBeLessThan(4_000);
    }
  });

  it("also reaches the milestone under the vanilla policy", () => {
    const result = runSeed(11, {
      maxFrames: 6_000,
      renderEvery: 8,
      policy: "vanilla",
      stopAtFirstActionMenu: true,
    });
    expect(result).toMatchObject({
      outcome: "OK",
      endState: "milestone:first-action-menu",
    });
  });

  it("is deterministic per seed", () => {
    const first = runSeed(3, { maxFrames: 6_000, stopAtFirstActionMenu: true });
    const second = runSeed(3, { maxFrames: 6_000, stopAtFirstActionMenu: true });
    expect(second.frames).toBe(first.frames);
    expect(second.outcome).toBe(first.outcome);
    expect(second.lastActions).toEqual(first.lastActions);
  });

  it("also reaches the milestone under the winning policy", () => {
    const result = runSeed(12, {
      maxFrames: 6_000,
      renderEvery: 8,
      policy: "winning",
      stopAtFirstActionMenu: true,
    });
    expect(result).toMatchObject({
      outcome: "OK",
      endState: "milestone:first-action-menu",
    });
  });

  it("is deterministic per seed under the winning policy", () => {
    // A deeper run than the milestone determinism pin above: the winning
    // policy's two overrides (fight-move power ranking, voluntary-switch
    // decline) both live well past battle 1's first action menu, so this
    // exercises them across a whole round's worth of ticks.
    const options = {
      maxFrames: 600_000,
      renderEvery: 0,
      policy: "winning" as const,
      stopAtFirstRoundDecision: true,
    } as const;
    const first = runSeed(12, options);
    const second = runSeed(12, options);
    expect(second).toEqual(first);
  });

  it("earns all seven generated wins through the live tick/render and terminal seams", () => {
    const options = {
      maxFrames: 200_000,
      renderEvery: 16,
      testPolicy: "strong-route" as const,
      stateFactory: createSevenWinLiveState,
      collectDiagnostics: true,
      // This pin cares only about THIS round's own 7-win mechanics, not
      // in-session chaining (factoryRoundChaining.ts): strong-route always
      // wins, so without this the terminal's default-NO decline (PROGRESS
      // ~1271) would keep chaining into fresh rounds indefinitely.
      stopAtFirstRoundDecision: true,
    };
    const first = runSeed(21, options);
    const second = runSeed(21, options);

    expect(first).toMatchObject({
      outcome: "OK",
      endState: "roundComplete",
      // ISSUES #93's fix (factoryRoundBattleOrchestrator.ts) stopped handing
      // a forced-switch resolution off to the party selector at the fainted
      // battler's own message -- real Cmd_moveend item effects (this seed's
      // own trailing commands) now present in full first, matching source's
      // actual HandleFaintedMonActions ordering. That is strictly more
      // frames/render calls per forced switch this seed hits.
      //
      // ISSUES #95's fix (battleResolutionPresentation.ts) then moved these
      // counters again: an attack animation may no longer pair with a hit
      // animation from a LATER script execution, so this seed's non-damaging
      // moves stopped publishing bogus multi-frame move-animation commands
      // built from an unrelated end-of-turn tick's hit. The strong-route
      // policy reads presentation state, so the seed's own move choices --
      // and with them the battle/turn counters below -- are a genuine new
      // trajectory, not a driver regression. It still earns all seven wins,
      // and both settled re-runs stay deterministic
      // (`expect(second).toEqual(first)` below).
      //
      // ISSUES #99's driver fix (randomRoundSoakDriver.ts's onPostwin) then
      // moved these counters a third time: strong-route is a non-exploring
      // policy (same `explores` semantics as vanilla), so it always declines
      // the swap offer -- but the pre-fix bug made every non-exploring
      // policy accept every swap by accident (the frozen continuation-menu
      // branch pressed A on the swap menu's default YES cursor). Fixed, this
      // seed now genuinely declines every swap and skips the swap screen's
      // extra frames entirely, settling into a shorter, different trajectory.
      //
      // ISSUES #115's fix (battleResolutionPresentation.ts) then moved these
      // counters a fourth time: a post-switch-in message now names the
      // battler slot's CURRENT occupant instead of a stale pre-switch
      // snapshot, and the typewriter print duration depends on the printed
      // name's own length -- a genuinely different (correct) string, not a
      // driver regression.
      //
      // ISSUES #131's fix (battleEndTurnOrchestration.ts) then moved them a
      // fifth time: ENDTURN_ORDER (battle_util.c:1199-1218) re-sorts
      // gBattlerByTurnOrder by CURRENT effective speed at the top of every
      // end-turn pass and draws Random() & 1 on an exact tie
      // (battle_main.c:4728) -- so this seed's end-turn traversal, its RNG
      // stream, and with them the strong-route policy's own move choices are
      // a genuine new (correct) trajectory. ROM receipt:
      // tools/probe/receipts/issue131-endturn-order-off.json. It still earns
      // all seven wins and both re-runs stay identical.
      //
      // The union of the OTHER three end-turn source fixes then moved them a
      // sixth time: TurnValuesCleanUp(FALSE)'s isFirstTurn/rechargeTimer decay
      // (ISSUES #130) makes Fake Out fail from turn 2 and gates Speed Boost on
      // the switch-in turn, the field loop is case-major (#132), and the
      // per-turn end-turn STATUS2_FLINCHED clear (#133) stops a shadowed
      // flinch costing a mon a second turn. ROM receipt:
      // tools/probe/receipts/gate6-first-turn-decay-off.json. The round is
      // shorter in frames but runs more turns (5 -> 9), because turns that
      // used to be spent flinched now execute; the terminal record menu is no
      // longer reached before `stopAtFirstRoundDecision` fires. It still earns
      // all seven wins and both re-runs stay identical.
      //
      // ISSUES #140 moved them a seventh time: GetMoveTarget's
      // MOVE_TARGET_SELECTED do/while now runs on HandleAction_UseMove's four
      // re-target branches (forced Struggle / Encore), so every forced action
      // in the round shifts the cursor. frames 37_239 -> 37_260, turn 9 -> 3,
      // renderCalls 2_681 -> 2_671, and the terminal record menu IS reached
      // before `stopAtFirstRoundDecision` fires again (false -> true). ROM
      // receipt: tools/probe/receipts/issue140-getmovetarget-off.json. It still
      // earns all seven wins and both re-runs stay identical.
      //
      // sc106 (the `stats-change` presentation command, 76 / 90 frames per
      // played stat animation) then moved them to 37_499 / 2_679 (same seven
      // wins, turn 3); soak111 (docs/soak111-decoupled-cooldown.md) moved
      // them to 37_569 / 2_679: the driver's press cooldowns now come from
      // their own seeded stream and the forced party selector waits out its
      // input-dead entry fade instead of mashing into it, so only the frames
      // between the same presses move. Same seven wins, turn 3. olnd113
      // (ISSUES #167, docs/olnd113-scene-off-pauses-live.md) moved them to
      // 38_358 / 2_727: Scene OFF no-hit bodies now present their
      // BattleScript_Pausex20 span and misses / failed moves hold "X used Y!"
      // over the source `pause B_WAIT_TIME_SHORT` (presentation only). Same
      // battle 7, turn 3, seven wins and diagnostics. scf117 (ISSUES #166, the
      // post-stats-change hold, docs/scf117-stats-change-finish.md): frames
      // unchanged, renderCalls 2_727 -> 2_728; everything else identical.
      // off121 (the Scene OFF `status` command ends at the next print,
      // docs/off121-status-command.md): frames 38_358 -> 37_645, renderCalls
      // 2_728 -> 2_697; same battle 7, turn 3, seven wins and diagnostics.
      // offs152 (the Scene OFF opponent send-in tail + forced switch-out,
      // docs/offs152-scene-off-send-in-tail.md): frames 37_645 -> 37_332,
      // renderCalls 2_697 -> 2_667; same battle 7, turn 3, seven wins and diagnostics.
      // chg161 (the charge-turn empty box, docs/chg161-charge-turn-print.md): frames only, 37_332 -> 37_302,
      // renderCalls 2_667 -> 2_654; same battle 7, turn 3, end state and diagnostics.
      // msg175 (the "used" print lasts its printable length, no 24-frame floor): frames 37_302 -> 37_298,
      // renderCalls 2_654 -> 2_655; same battle 7, turn 3, end state and diagnostics.
      // trn178 (the Scene OFF action-transition pause, docs/trn178-action-transition-live.md): frames 37_298 -> 37_738,
      // renderCalls 2_655 -> 2_694; same battle 7, turn 3, end state and diagnostics.
      // pfr192 (the player faint-replacement send-in clock keyed on species / name length / nature / scene): frames 37_738 -> 37_536,
      // renderCalls 2_694 -> 2_688; same battle 7, turn 3, end state and diagnostics.
      // lsd194 (docs/lsd194-print-floor-and-drain.md section 8), measured on three archived trees with tools/integration/lsd194SoakPins.ts:
      // the floor drop (b3031fe6c, WAITMESSAGE_LONG_TIMING 24 -> 0: short prints are L + 64) frames 37_536 -> 37_456, renderCalls 2_688 -> 2_675;
      // the Leech Seed drain rows (5f4744a67: the held lead + the bar+2 rule replacing the 28-row hp floors) frames 37_456 -> 37_478, renderCalls 2_675 -> 2_681;
      // same battle 7, turn 3, end state and diagnostics.
      // lsd196 (dba78b960: a stat between two prints presents its ROM rows) frames 37_478 -> 37_467, renderCalls 2_681 -> 2_674 (fewer
      // frames although stat rows only grow: the jittered press cooldown draws shift with presentation length); rst197 (Rest pause) moves
      // neither; measured with lsd194SoakPins.ts on 028e909a4 / dba78b960 / 6310217a3 / 5e9e7ab6c. Same battle 7, turn 3, end state.
      // rep203 (docs/fnt201-faint-timing.md): fnt201 (the faint script lead: playfaintcry + pause, the player slide, the pre-cry rows) frames
      // 37_467 -> 39_117, renderCalls 2_674 -> 2_782; hpb202 (the Q24.8 bar port, maxHp < 48) adds 0 here (measured with lsd194SoakPins.ts on
      // 5021eb05e / 00bc66214 / the union e7f6d136d: 39_117 / 2_782 on both fnt201-only and the union). Same battle 7, turn 3, end state.
      // obr251 (docs/obr251-opponent-party-summary.md; the draw hold on each opponent faint replacement): frames only + render calls,
      // 39_117 -> 40_796, renderCalls 2_782 -> 2_891; same battle 7, turn 3, end state, outcome (re-pinned by cln242 from the failing
      // full-suite shard; frame-only delta).
      // enc276 (docs/enc276-forced-turn-no-menu.md; a forced Encore / Struggle turn skips the move menu, Struggle prints its no-moves
      // message): frames only + render calls, 40_796 -> 41_021, renderCalls 2_891 -> 2_895; same battle 7, turn 3, end state, diagnostics.
      // lbr-d1 (docs/lbrd-win-lobby-return.md): the won terminal no longer chains into a draft at the record answer, it plays the
      // farewell and hands over the walkable Lobby, and the first-decision snapshot now runs to that Lobby entry: frames 41_021 -> 41_068,
      // renderCalls 2_895 -> 2_899, terminalRecordChoice null -> "no" (the mashed A answers the default NO); same battle 7, turn 3, end state.
      // hie1 (ISSUES #220 step 1; the held-item effect presented, here Scene OFF's `playanimation B_ANIM_HELD_ITEM_EFFECT` Pausex20 hold):
      // frames only + render calls, 41_068 -> 41_099, renderCalls 2_899 -> 2_907; same battle 7, turn 3, end state, diagnostics.
      // wsh1 (the Wish heal / Future Sight hit / Focus Band general-animation commands, 201 / 172 / 129 frames in Scene ON): frames only + render calls, 41_099 -> 41_221, renderCalls 2_907 -> 2_913; same battle 7, turn 3, end state, diagnostics.
      // hpd5 (measured on the hpd4 tip f40209793, before any hpd5 change; hpd5's Scene ON-only audited leads add 0 here): the hpd4 floor-free foe-hit hold,
      // frames only + render calls, 41_221 -> 41_240, renderCalls 2_913 -> 2_914; same battle 7, turn 3, end state, diagnostics.
      // kno3 (Knock Off's item-knocked-off animation: the ON command 71 / 101 frames + the SE gate, the OFF 35-row Pausex20 hold, the floor-free hit bar and the 4 post-print rows):
      // frames only + render calls, 41_240 -> 41_376, renderCalls 2_914 -> 2_916; same battle 7, turn 3, end state, diagnostics.
      // ais4 (the opponent faint replacement's send-in runs the AI timeline): frames only + render calls, 41_376 -> 41_369, renderCalls 2_916 -> 2_913; same battle 7, turn 3, end state, diagnostics.
      // hpf1 (floor-free hit -> message / faint-chain / turn-end hp commands): frames + render calls, 41_369 -> 41_351, renderCalls 2_913 -> 2_918; same battle 7, turn 3, end state, diagnostics.
      // hpf2 (heal / recoil / drain hp -> print holds, hit -> end-turn print: ROM-measured): frames + render calls, 41_351 -> 41_048, renderCalls 2_918 -> 2_892; same battle 7, turn 3, end state, diagnostics.
      // fix 51 (docs/parity-mac/noland-room-scenes.md: the won Lobby's clock starts at the Lobby's map load, not the battle's end; the award gates
      // 70 / 44): frames only + render calls, 41_240 -> 41_332, renderCalls 2_914 -> 2_920; same battle 7, turn 3, end state, diagnostics.
      // merge of the box's 2026-11-18 run (to cbd64bb34) with the Mac's fixes 44-51 (fix 50: the battle intro's prompt two frames earlier; fix 51: the won
      // Lobby's clock): frames + render calls, 41_048 (box) / 41_332 (Mac) -> 41_151, renderCalls 2_892 / 2_920 -> 2_898; same battle 7, turn 3, end state, diagnostics.
      // pau4 (the battle-start Intimidate / Trace entry scripts presented: the blocks run between the player release and the first menu, per battle with an
      // entry lead): frames + render calls, 41_151 -> 43_437, renderCalls 2_898 -> 3_045; same battle 7, turn 3, end state, diagnostics.
      // merge of pau4 / btn1 / pau5 / hpf5 (pin1; hpf5's tick / wrap / weather / Substitute hp lengths, docs/hpd1-hp-hold.md "hpf5"): frames + render calls,
      // 43_437 -> 43_336, renderCalls 3_045 -> 3_042; same battle 7, turn 3, end state, diagnostics.
      // pic8 (the forced party menu's clock starts at the faint message's dismiss edge, 2 frames earlier per forced switch; ROM lab
      // pic7-player-faint-send-in-on): frames + render calls, 43_336 -> 43_334, renderCalls 3_042 -> 3_044; same battle 7, turn 3, end state, diagnostics.
      // hcr1 (the Scene OFF first used-move print at commit + 6 + u, docs/aud251-s11-scoreboard-refresh.md): frames + render calls, 43_334 -> 43_411, renderCalls 3_044 -> 3_043; same battle 7, turn 3, end state, diagnostics.
      // hcr1b (the Scene OFF first used-move glyph at commit + 7 + u, pixel-exact): frames + render calls, 43_411 -> 43_559, renderCalls 3_043 -> 3_056; same battle 7, turn 3, end state, diagnostics.
      // fsc1 (the Scene OFF invisible-target hit completes in 2 frames; the hit-all loop's EMPTYSTRING3 box is timed by kernel rows): frames + render calls, 43_559 -> 43_550, renderCalls 3_056 -> 3_054; same battle 7, turn 3, end state, diagnostics.
      // chg1 (the Scene OFF two-turn move timing: charge box lead, hide split, miss tail, locked continuations): frames + render calls, 43_550 -> 43_557, renderCalls 3_054 -> 3_066; same battle 7, turn 3, end state, diagnostics.
      // wbh1 (docs/wbh1-battle-start-white-herb.md): a later battle-start entry script starts on its own kernel rows after the previous one's
      // pop (2 frames earlier than pau4's ENTRY_SCRIPT_GAP_ROWS; this seed has a two-script battle start, not a White Herb: with the old
      // gap restored the pin holds): render calls only, 3_044 -> 3_043; frames 43_334, battle 7, turn 3, end state, diagnostics unchanged.
      // fnt1 (docs/fnt1-fainted-box-clear.md: a "fainted!" / "Player defeated" box takes the press from the row after its last glyph, 2 rows
      // earlier, as the ROM's `\p` wait): frames only, 43_334 -> 43_323; same battle 7, turn 3, end state, diagnostics, render calls. With the
      // accept edge alone undone (isBattleResolutionButtonMessageAcceptable's promptClear lead) the old pin passes again.
      // merge of the box's 2026-11-20 run with the Mac's 11-21 fixes (box f5274b48a: hcr1 / hcr1b / fsc1 / chg1 ...; Mac ea3220630: wbh1 / fnt1 / lrc1 ...): frames + render calls,
      // 43_557 (box) / 43_323 (Mac) -> 43_500, renderCalls 3_066 / 3_043 -> 3_043; same battle 7, turn 3, end state, diagnostics; both runs identical.
      // fch1 (the AI faint replacement choice costs 0..4 extra script frames, GetMostSuitableMonToSwitchInto work model; the aud241b stage's opponent bench is now Seismic Toss x4 as in the ROM labs): render calls only (a one-frame trajectory shift), 3_043 -> 3_042; frames 43_500, battle 7, turn 3, end state, diagnostics unchanged. A trajectory pin, not a ROM frame.
      // wtl1 (the win tail's 24 draw-nothing rows before "Player defeated", ROM P + 26; seven wins): frames + render calls, 43_500 -> 43_638, renderCalls 3_042 -> 3_059; same battle 7, turn 3, end state, diagnostics. A trajectory pin, not a ROM frame.
      // etp1 (end-turn prints take the ROM end-turn rows, both scenes; labs docs/etp1-end-turn-prints.md): frames + render calls, 43_638 -> 43_732, renderCalls 3_059 -> 3_055; same battle 7, turn 3, end state, diagnostics. A trajectory pin, not a ROM frame.
      // merge of the box's night run with the Mac's tdr1 (tri1: the battle intro at each transition's own frame; wtl1: the win tail's slide
      // wait; sst1: the sandstorm sound): frames + render calls, 43_732 -> 43_693, renderCalls 3_055 -> 3_052; same battle 7, turn 3, end
      // state, diagnostics. A trajectory pin, not a ROM frame.
      frames: 43_693,
      battle: 7,
      turn: 3,
      diagnostics: {
        roundPhase: "roundComplete",
        battleIndex: 6,
        lastBattleOutcome: "win",
        opponentGenerationCount: 7,
        battleRngSegmentCount: 7,
        terminalOutcome: "roundWon",
        terminalRecordMenuInputReadyReached: true,
        terminalRecordChoice: "no",
        renderCalls: 3_052,
      },
    });
    expect(second).toEqual(first);
  });

  it("ISSUES #85: keeps the genuine switched-in HP at a later damage-command start", () => {
    // Seed 0 voluntarily switches BUTTERFREE -> BAYLEEF on turn 8, then
    // MURKROW's same-turn FLY drains BAYLEEF 153 -> 66. The parent replayed
    // the settled 66-HP command field as the switch-in's initial display and
    // crashed while committing the preceding hit command at frame 4697.
    const result = runSeed(0, { maxFrames: 4_698, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /battle resolution HP command starts at .* displayed/,
    );
    expect(result.frames).toBeGreaterThan(4_697);
  });

  it("ISSUES #85: resets the display ledger when a healthy active replaces a statused one", () => {
    // Seed 6 reaches Pidgeotto after the previously active opponent carried
    // burn display state. The parent retained that old status across the
    // switch and failed the genuine next-command handoff at frame 6632.
    // The same family formerly recurred after the forced-send-out seam at
    // frame 7797, so keep this focused pin beyond both handoffs.
    const result = runSeed(6, { maxFrames: 7_798, renderEvery: 0 });
    expect(result.errorMessage).not.toBe(
      "resolution handoff battler 1 display does not match the genuine next boundary",
    );
    expect(result.frames).toBeGreaterThan(7_797);
  });

  it("ISSUES #86: commits every typed switch-in in one forced continuation", () => {
    // Seed 45's forced selection resumes through both the player's chosen
    // replacement and the opponent's automatic replacement. The source
    // receipt contains a complete switch transition for each battler; the
    // display ledger must consume both before the forced-send-out handoff.
    const result = runSeed(45, { maxFrames: 6_621, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /forced-switch-in battler 1 changed party without a completed switch transition/,
    );
    expect(result.frames).toBeGreaterThan(6_620);
  });

  it("ISSUES #86: waits for the requested battler's faint message before forced selection", () => {
    // Seed 16's turn has two faint receipts in source order: player QUILAVA
    // KOs opponent PHANPY, the automatic opponent 1 -> 2 switch completes,
    // then sandstorm KOs QUILAVA and requests the player's forced switch.
    // The earlier opponent faint dismissal must not steal the later player's
    // forced-selector handoff and strand the typed opponent switch command.
    const result = runSeed(16, { maxFrames: 28_562, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /forced-switch-in battler 1 changed party without a completed switch transition/,
    );
    expect(result.frames).toBeGreaterThan(28_561);
  });

  it("ISSUES #86: a later faint resets stale forced-switch choice ownership", () => {
    // Seed 14 completes one player forced switch on turn 18. On turn 19 the
    // new active faints; source ChooseMonToSendOut resets monToSwitchIntoId
    // before opening a fresh selector instead of reusing the previous slot.
    const result = runSeed(14, { maxFrames: 9_485, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /switch-in message has no preceding switch\/post-switch field/,
    );
    expect(result.frames).toBeGreaterThan(9_484);
  });

  it("ISSUES #88: a locked multi-turn battler that faints before its continuation falls back to a fresh resolution", () => {
    // Seed 0's chained round 2 (only reachable now that terminal-decline
    // chains into a fresh generated round, PROGRESS ~1271) has its opponent
    // charge a two-turn move on turn 4, setting STATUS2_MULTIPLETURNS. The
    // player's faster turn-5 move then KOs that same battler before its
    // continuation can print — FaintClearSetData (battle_main.c:3272) zeroes
    // status2 on faint, so the locked continuation genuinely never fires.
    // The parent treated the missing receipt as a broken invariant and threw;
    // it must now fall back to a fresh resolution identity instead.
    const result = runSeed(0, { policy: "vanilla", maxFrames: 32_000, renderEvery: 0 });
    expect(result.errorMessage ?? "").not.toMatch(
      /locked action continuation receipt has no immutable matching action snapshot/,
    );
    expect(result.frames).toBeGreaterThan(31_771);
  });

  it("ISSUES #89: seed 3's mid-turn Baton Pass openpartyscreen halt resumes through the forced party selector", () => {
    // History: seed 27 (full policy) selected Baton Pass mid-turn and used to
    // crash at round 1 battle 1 turn 10, frame 30798, on an unimplemented
    // BattleScript_EffectBatonPass / B_SCR_OP_OPENPARTYSCREEN machine-barrier
    // (driveTrainerBoundary had no handling for a player-side mid-action
    // openpartyscreen halt). It's now a resumable player-choice halt that
    // hands off to the forced party selector instead of hard-failing, so the
    // whole round plays out to a genuine finish.
    //
    // soak111 (docs/soak111-decoupled-cooldown.md) moved the pin to seed 226:
    // seed 27's random game had already drifted off Baton Pass (on bddc3d69c
    // it commits Baton Pass zero times and is in postwin at frame 30798, so
    // its frame bound alone no longer exercised the halt), sc106's
    // stats-change frames re-rolled it again, and soak111's decoupled
    // press-cooldown stream gives every exploring seed a new trajectory.
    // tools/integration/soak111BatonPassSearch.ts (removed by cln237; restored as tools/soak/batonPassSearch.ts, the one-command re-pin
    // scanner: `--seeds A:B --parallel N`) scanned full-policy seeds
    // for a run that commits Baton Pass and then opens the forced party
    // selector on a still-living outgoing slot (Baton Pass's own switch);
    // seed 226 is the first whose halt lands inside the first round itself
    // (battle 4, LEDIAN, frame 54509) rather than in the chained round of the
    // post-decision grace window. Unlike the old frame-only bound, this pin
    // OBSERVES the halt through the observation-only coverage seam, so a
    // future trajectory drift fails loudly instead of silently dropping the
    // coverage. `stopAtFirstRoundDecision` snapshots THIS round's own decided
    // outcome (see ISSUES #104's note in the history of this pin).
    //
    // fsw235 (the forced party menu's three-slot + CANCEL cursor, the
    // voluntary menu's already-in-battle refusal and the soak policies that
    // wander both menus) re-rolled every exploring seed again: seed 226 now
    // loses in battle 3 before its Baton Pass battle. A scan of full-policy
    // seeds 0..4199 for the same joint event (a Baton Pass commit followed by
    // a forced-selector halt on a still-living outgoing slot, first round
    // only) found 447 and 739; 447 runs into the 80,000-frame budget still in
    // battle 1, so 739, whose round plays out to a genuine loss in battle 3,
    // is the pin.
    //
    // pmo239 (the party menus list rows in the ROM's battle order; the soak's
    // forced-menu walk now stops on the first legal row the menu shows, so the
    // exploring policies' decisions moved again): seed 739 no longer commits
    // Baton Pass in its first round. Re-scanned full-policy seeds 0..300
    // (soak111BatonPassSearch.ts, 80,000 frames): the lowest seeds with a Baton
    // Pass commit followed by a forced-selector halt on a still-living
    // outgoing slot are 19, 30, 32, 57, 58, 63, 79, 149, 188, 204, 211, 224,
    // 234 and 242, and every one of them halts in the post-decision grace
    // window (battleIndex 0 of the chained round, after the first round's
    // decided outcome), none inside the first round itself. Seed 19 is the
    // pin; unlike the pre-pmo239 pin its halt frame is therefore past the
    // snapshotted first-round result, so the `frames > haltFrame` bound is
    // gone and the observed halt plus the clean errorMessage carry the pin.
    //
    // vis243a (the voluntary player send-in now waits for the species' back animation / cry instead of a fixed 91 + 11 -- the soak's
    // presentation clock, so the exploring policy's press timings land on different phases): seed 19 no longer commits Baton Pass in its
    // first round (it now plays 50860 frames / battle 3 / turn 12 with zero Baton Pass commits). Re-scanned full-policy seeds 0..127
    // (the removed soak111BatonPassSearch.ts, restored from 54c5686f0^ as scratch, 80,000 frames, same options as this pin): the first
    // hits are 28, 30, 32, 57, 63, 64, 118 and 127, all halting in the post-decision grace window like 19 did. Seed 30 is the pin
    // (the lowest hit that, like 19, ends in battle 2 as a genuine loss; Baton Pass commits 3, halt frame 59170 in battleIndex 0 of the chained round).
    //
    // frf250a (BAG prints its message and RUN opens the forfeit prompt instead of being silent no-ops; the exploring policy
    // presses both, so its press timings land on new phases): seed 30 no longer commits Baton Pass (58851 frames / battle 2 /
    // turn 53, zero commits). Re-scanned full-policy seeds 0..35 (the removed soak111BatonPassSearch.ts as scratch, 80,000
    // frames, same options): seed 32 is the first hit (Baton Pass commits 2, halt frame 15434 on AIPOM in battleIndex 0 of the
    // chained round, first round a genuine loss in battle 1 at 13311). Seed 32 is the pin.
    let frame = 0;
    let batonPassCommitFrame: number | null = null;
    let haltFrame: number | null = null;
    const observer = {
      beginSeed(): void {},
      recordPlayerFightCommit(moveId: number): void {
        if (moveId === 226 && batonPassCommitFrame === null) batonPassCommitFrame = frame;
      },
      observe(state: EngineState): void {
        frame = state.frame;
        const selector = state.factoryRoundBattleOrchestrator?.battleForcedPartySelect ?? null;
        if (haltFrame !== null || selector === null || batonPassCommitFrame === null) return;
        const outgoing = selector.party.find((m) => m.partyIndex === selector.request.faintedPartyIndex);
        if (outgoing !== undefined && !outgoing.fainted) haltFrame = state.frame;
      },
    };
    //
    // lbra (every loss now ends in the walkable Lobby, as the ROM does, and the soak walks back to the attendant instead of the
    // old loss -> new-draft chain; the next challenge's RNG is the live vblank-advanced cursor, so every exploring seed re-rolled
    // again, and `stopAtFirstRoundDecision` now stops AT the Lobby, before any later round): the pin is re-found with a full-policy scan
    // of seeds 0..39 (80,000 frames, default options, scratch .integration/evidence/lbra/scan.ts). Hits (Baton Pass commit followed by a
    // forced-selector halt on a still-living outgoing slot): 11, 21, 24, 37. Seed 11 is the pin (commit 49491, halt 49531, after
    // two Lobby new challenges); the run plays on through the Lobby to the frame budget.
    //
    // rps278 (lbr-b: the attendant conversation takes frames and the Lobby vblank RNG keeps running, so each new challenge is dealt
    // from a later cursor): seed 11 no longer commits Baton Pass at all. Re-scanned full-policy seeds 0..39 (same options: 80,000
    // frames, default options, same joint event + clean errorMessage + OK + >= 1 Lobby new challenge). Hits: 3, 5, 13, 14, 29, 38.
    // Seed 3 is the pin (lowest; Baton Pass commits 3, first commit 48916, halt 48956, two Lobby new challenges). Details and the
    // mutation check: docs/rps278-soak-repin.md.
    //
    // lbr-e (the in-game new challenge now walks the PreBattleRoom entry and is dealt after the walk, from the cursor of ROM frame 6660
    // instead of the hand-off tick's): seed 3 no longer commits Baton Pass. Re-scanned full-policy seeds 0..13 (same options and joint
    // event; scratch .integration/evidence/lbre/scan.ts): seed 12 is the first and lowest hit (commit 31364, halt 31613, four Lobby new
    // challenges). docs/lbre-prebattle-briefing.md "Re-pins".
    //
    // lbr-g (#221 E1-E3: the Lobby cursor is the ROM's after a battle exit / map load, so every Lobby new-challenge deal moved): seed 12 no longer
    // hits. Re-scanned full-policy seeds 0..30 (same options and joint event): seeds 1, 3 and 6 hit among others; seed 1 is the lowest
    // (commit 24897, halt 25611).
    //
    // lbw3 (#221 E4: the Lobby woman / fat man wander draws from the shared stream, so every Lobby new-challenge deal moved again): seed 1
    // no longer commits Baton Pass. Re-scanned full-policy seeds 0..19 (same options and joint event; scratch .integration/evidence/lbw3/scan.ts):
    // hits 0, 3, 7, 8, 14, 15, 17; seed 0 is the lowest (commit 68728, halt 69116, one Lobby new challenge).
    //
    // ais1 / ais2 (the AI's mid-battle switch prints "<TRAINER> withdrew <MON>!" and runs the opponent return-to-ball, plus one
    // more tray frame; the exploring policy's press timings land on the new phases, a new trajectory as at fsw235 / pmo239 / frf250a):
    // seed 0 no longer commits Baton Pass. Re-scanned full-policy seeds 0..79 (tools/soak/batonPassSearch.ts --seeds 0:80 --parallel 8,
    // 80,000 frames, same options and joint event; ~50 s): hits 3, 8, 14, 15, 17, 19, 31, 33, 44, 55, 71, 77, all candidates. Seed 3 is
    // the lowest (Baton Pass commits 5, first commit 45772, halt 55096 on MAWILE in battleIndex 1, one Lobby new challenge).
    //
    // pau2 (the used-move hold takes pause LONG; SafeguardEnds' pause row; a new exploring trajectory as at ais1): seed 3 no longer
    // halts. Re-scanned full-policy seeds 0..79 (tools/soak/batonPassSearch.ts --seeds 0:80 --parallel 8): hits 28, 32, 43, 44, 55, 64, 71, 78.
    // Seed 28 is the lowest (Baton Pass commits 2, first commit 44638, halt 44677 on AIPOM in battleIndex 0, three Lobby new challenges).
    //
    // hpf1 (floor-free hit -> message / faint-chain / turn-end hp commands; the exploring presses land on new phases): seed 28 no longer commits Baton Pass.
    // Re-scanned full-policy seeds 0..47 (tools/soak/batonPassSearch.ts --seeds 0:48 --parallel 8): hits 4, 6, 7, 11, 12, 15, 17, 29, all candidates; seed 4 is the lowest.
    //
    // btn1 (battle strings with a `\p` / `\l` gate wait for a new A / B press; the exploring policy's presses land on new phases): seed 4 no longer commits Baton Pass.
    // Re-scanned full-policy seeds 0..29 (tools/soak/batonPassSearch.ts --seeds 0:30 --parallel 3): only 12 is a candidate (Baton Pass commits 4, first commit 32465, halt 32505 on MAWILE in battleIndex 0, one Lobby new challenge).
    //
    // merge of pau4 / btn1 / pau5 / hpf5 (pin1; the exploring presses land on new phases again): seed 12 no longer halts (4 commits, none a halt).
    // Re-scanned full-policy seeds 0..29 (tools/soak/batonPassSearch.ts --seeds 0:30 --parallel 3): candidates 7, 15, 16, 25, 26. Seed 7 is the lowest
    // (Baton Pass commits 4, first commit 32227, halt 33039 on MAWILE in battleIndex 0, two Lobby new challenges).
    // pic9 (the switch-out / send-in lines follow the foe's HP, so their print lengths and the exploring presses moved): seed 7 no longer
    // halts. Re-scanned full-policy seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 4): candidates 15, 16, 27, 39. Seed 15
    // is the lowest (Baton Pass commits 3, first commit 59892, halt 59932 on MAWILE in battleIndex 0, two Lobby new challenges).
    // flow1 (the move menu opens on the first move after a switch-in; the exploring policy's fight presses after a switch pick other
    // moves): seed 15 no longer commits Baton Pass (with the cursor fix undone it hits again with the numbers above). Re-scanned full-policy
    // seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 4): candidates 12, 13, 16, 27, 31, 36. Seed 12 is the lowest
    // (Baton Pass commits 1, first commit 74877, halt 75141 on MAWILE in battleIndex 0, two Lobby new challenges).
    // hcr1b (the Scene OFF used-move glyph at commit + 7 + u; the exploring presses land on new phases): seed 12 no longer commits Baton Pass.
    // Re-scanned full-policy seeds 0..29 (tools/soak/batonPassSearch.ts --seeds 0:30 --parallel 4): candidates 3, 10, 16, 17, 20, 23, 24, 26. Seed 3 is the lowest
    // (Baton Pass commits 2, first commit 49232, halt 49444 on MAWILE in battleIndex 0, three Lobby new challenges).
    // gsp2 (Scene ON wake-up presentation rule: the turn-start status head, the wake-up print / icon timing; the exploring presses land
    // on new phases): seed 12 no longer commits Baton Pass (0 commits, 80,000 frames in battle 1). Re-scanned full-policy seeds 0..39
    // (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 3, same options): candidates 6, 16, 35, 38. Seed 6 is the lowest
    // (Baton Pass commits 4, first commit 61360, halt 61558 on LEDIAN in battleIndex 0, three Lobby new challenges). Pin 12 -> 6.
    // merge of rsw1 + hcr1b + gsp2b (pin2; the exploring presses land on new phases again, the two rules together): seed 6 no longer commits Baton Pass
    // (0 commits). Re-scanned full-policy seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 3, same options): candidates 3, 10, 16, 17, 20, 23,
    // 24, 26, 36. Seed 3 is the lowest (Baton Pass commits 2, first commit 49232, halt 49444 on MAWILE in battleIndex 0, three Lobby new challenges). Pin 6 -> 3.
    // fsc1 (the Scene OFF invisible-target hit completes in 2 frames, the hit-all loop's EMPTYSTRING3 box is timed by kernel rows: shifts the soak's press phases): seed 3 no longer commits Baton Pass
    // (0 commits). Re-scanned full-policy seeds 0..29 (tools/soak/batonPassSearch.ts --seeds 0:30 --parallel 3, same options): candidates 6, 27, 28. Seed 6 is the lowest (Baton Pass commits 6,
    // first commit 47503, halt 47543 on MAWILE in battleIndex 0, one Lobby new challenge). Pin 3 -> 6.
    // chg1 (the Scene OFF two-turn move timing: charge box lead, hide split, miss tail, locked continuations; the exploring presses land on new phases):
    // seed 6 no longer commits Baton Pass (0 commits, battle 4 turn 8 at 80,000 frames). Re-scanned full-policy seeds 0..39 (tools/soak/batonPassSearch.ts
    // --seeds 0:40 --parallel 3, same options; ~48 s): candidates 28, 33, 37, all OK with no openpartyscreen / machine-barrier error. Seed 28 is the lowest
    // (Baton Pass commits 4, first commit 57044, halt 57248 on MAWILE in battleIndex 1, one Lobby new challenge). Pin 6 -> 28.
    // lrc1 (the loss tail runs the opponent's animated return to ball and the win text prints 67 frames later; the exploring policy's presses
    // after every loss land on new phases, and the Lobby deals from a later cursor): seed 12 no longer commits Baton Pass. Re-scanned full-policy
    // seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 8): candidates 3, 6, 14, 28, 32, 36. Seed 3 is the lowest
    // (Baton Pass commits 1, first commit 23967, halt 24569 on MAWILE in battleIndex 0, three Lobby new challenges).
    // merge of the box's 2026-11-20 run with the Mac's 11-21 fixes (the box had 28 after chg1, the Mac 3 after lrc1; the exploring presses land on new phases with both sides' rules): neither
    // commits Baton Pass on the merged tree (0 commits each). Re-scanned full-policy seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 4,
    // same options): candidates 4, 8, 10, 11, 13, 16, 27, 36, 39, all OK with no openpartyscreen / machine-barrier error. Seed 4 is the lowest
    // (Baton Pass commits 1, first commit 78369, halt 78671 on AIPOM in battleIndex 0, three Lobby new challenges; the halt is 1,329 frames inside the budget).
    // stc1 (Scene OFF confusion self-hit: its print's first glyph 5 script rows later, +2 rows to the hit; ROM seeds 7295 / 7682; the exploring presses land on new phases):
    // seed 4 no longer commits Baton Pass. Re-scanned full-policy seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 8, same options): candidates 11, 13, 27, 36, 39,
    // all OK with no openpartyscreen / machine-barrier error. Seed 11 is the lowest (Baton Pass commits 3, first commit 46848, halt 47063 on AIPOM in battleIndex 0, two Lobby new challenges). Pin 4 -> 11.
    // hcr3 (Icy Wind's hp keeps the stat command's 4-row tail instead of the 28-row floor, Double-Edge's recoil hp / print follow the ROM rows, and the faint SE clips its hpd4 compensation at 0; the exploring presses land on new phases): seed 4 no longer commits Baton Pass.
    // Re-scanned full-policy seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 4, same options): candidates 8, 10, 11, 13, 16, 27, 36, 39, all OK. Seed 8 is the lowest.
    // merge stc1 + hcr3 (fold-a): re-scanned seeds 0..39 on the combined tree (batonPassSearch.ts --seeds 0:40 --parallel 4): candidates 11, 13, 27, 36, 39 (stc1's set). Pin 11.
    // etp1 (end-turn prints take the ROM end-turn rows, Roar / Whirlwind's dragged-out press; the exploring presses land on new phases): seed 11 no longer commits Baton Pass.
    // Re-scanned full-policy seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 4, same options): candidates 5, 16, 20, 24, 25. Seed 5 is the lowest
    // (Baton Pass commits 1, first commit 69217, halt 69257 on MAWILE in battleIndex 0, two Lobby new challenges). Pin 11 -> 5.
    // merge of the box's night run with the Mac's tdr1 (tri1 / wtl1 / sst1; the exploring presses land on new phases): seed 5 no longer commits
    // Baton Pass. Re-scanned full-policy seeds 0..39 (tools/soak/batonPassSearch.ts --seeds 0:40 --parallel 6, same options): candidates 16,
    // 20, 25, 27, 35. Seed 16 is the lowest (Baton Pass commits 1, first commit 66442, halt 66482 on LEDIAN in battleIndex 0, two Lobby new
    // challenges). Pin 5 -> 16.
    const result = runSeed(16, {
      maxFrames: 80_000,
      renderEvery: 0,
      coverage: observer as never,
    });
    expect(result.errorMessage ?? "").not.toMatch(/openpartyscreen|machine-barrier/i);
    expect(batonPassCommitFrame).not.toBeNull();
    expect(haltFrame).not.toBeNull();
    expect(result.outcome).toBe("OK");
    expect(result.lobbyNewChallenges ?? 0).toBeGreaterThanOrEqual(1);
  });

  // ISSUES #86's original concern (a forced replacement's terminal weather
  // continuation) was pinned at seed 27 battle 4 turn 16: MURKROW forced in
  // at 4 HP, then the same genuine reducer receipt runs sandstorm damage,
  // faints MURKROW, and returns a terminal trainer-win boundary without
  // demanding an intervening player command. The #89 fix changes seed 27's
  // RNG-consumption trajectory from turn 10 onward (Baton Pass's switch no
  // longer crashes, so it now actually happens and consumes RNG); post-fix,
  // seed 27 loses in battle 1 itself (confirmed via runSeed(27, {maxFrames:
  // 80_000, collectDiagnostics: true}) -> battleIndex 0, never reaches
  // battle 4) and never revisits the documented scenario. A bounded search
  // for a fresh repro of the same mechanism — an instrumented sweep of
  // seeds 0:350 (full policy) and 0:150 (vanilla) through the production
  // soak driver, plus seeds 0:3200 through a second, decision-level harness
  // (driveGeneratedRoundToCompletion-style: deterministic first-legal-move/
  // first-legal-switch policy, no rendering), all checking the exact source
  // condition (a forced-switch segment with commands after the last typed
  // switch-in whose overall receipt is a terminal boundary) — found no
  // fresh occurrence in ~3,700 seed/policy trials. The underlying fix itself
  // (advanceFactoryRoundBattleResolution's nextCommandIndex resume branch,
  // factoryRoundBattleOrchestrator.ts ~2090-2114) is untouched and still
  // guarded by the three sibling ISSUES #86 pins above (seeds 45/16/14, each
  // exercising the same "commands after switch-in" resume path for a
  // non-terminal continuation); only the terminal-specific variant lost its
  // natural repro. Left unpinned rather than fabricating a synthetic/injected
  // state the game could never actually reach — see PROGRESS.md for the
  // search performed and this as an explicit open follow-up.

  it("ISSUES #92: winning gets a larger default frame budget than full/vanilla", () => {
    // "winning" chains multiple complete rounds back-to-back (its
    // continuation roll keeps re-entering GO ON), so per-seed frame cost
    // stacks across rounds and can legitimately exceed a single round's
    // budget without stalling. docs/soak-winning-sweep-2026-08-16.md (seeds
    // 0:60) found seed 49 HANGing at the old flat 600_000 default despite
    // settling cleanly at frame 693,051 given more room; docs/
    // soak-winning-sweep-2026-08-16-part2.md (seeds 60:120) confirmed no
    // seed needs more than that. "full"/"vanilla" soak a single round, so
    // ISSUES #90's 600_000 stays their default.
    expect(resolveMaxFrames("full")).toBe(600_000);
    expect(resolveMaxFrames("vanilla")).toBe(600_000);
    expect(resolveMaxFrames("winning")).toBe(1_000_000);
    expect(resolveMaxFrames("winning")).toBeGreaterThan(693_051);
    // An explicit maxFrames always overrides the policy default.
    expect(resolveMaxFrames("winning", 42)).toBe(42);
    expect(resolveMaxFrames("full", 42)).toBe(42);
  });
});

describe("real max-depth tracking (Milestone M-A step 1)", () => {
  it("maxCarriedWinStreak/maxBattleDepth survive a later loss where the old carriedWinStreak snapshot resets to 0", () => {
    // Round 1 wins with the scripted-strong trio, carrying the streak to 7.
    const carry0 = createInitialFactoryCarry(0x89ab_cdef);
    const round1 = driveGeneratedRoundToCompletion(carry0, 17);
    expect(round1.round.rules.phase).toBe("roundComplete");
    const chained1 = driveTerminalToNextDraft(stateAtDecidedRound(round1, carry0));
    const carry1 = chained1.factoryCarry;
    expect(carry1.factoryWinStreak).toBe(7);

    // Round 2 (carry-in 7) loses with an unscripted, arbitrary-strength
    // party -- same recipe as factoryRoundChaining.test.ts's "(c)" case.
    const round2Lost = driveGeneratedRoundToCompletion(carry1, 17, "weak");
    expect(round2Lost.round.rules.phase).toBe("roundLost");
    const initialState = stateAtDecidedRound(round2Lost, carry1);

    // Let the soak driver run forward from that decided round2 loss: within
    // a few thousand frames the default policy declines the record menu
    // and the run re-chains into a fresh round 3 (carry reset to 0 on the
    // loss), so by the time diagnostics are captured, the OLD snapshot field
    // has already forgotten the streak-7 depth this run actually reached.
    //
    // rps278 (lbr-b): the loss now ends in the Lobby and the attendant conversation has to play out before the next draft, so a
    // fresh round 3 is no longer entered inside 2,000 frames (diagnostics.carriedWinStreak was still null there). Probed this exact
    // state: carriedWinStreak is null at <= 2,500 frames and the fresh round 3 (carry 0, presentingBattleStart) exists at 3,000;
    // it stays 0 through every probed budget up to 20,000. 6,000 sits in the middle of that stable range (2x the first-hit frame),
    // so a few hundred frames of future conversation drift cannot flip it back to null.
    const result = runSeed(999, {
      maxFrames: 6_000,
      renderEvery: 0,
      policy: "vanilla",
      stateFactory: () => initialState,
      collectDiagnostics: true,
    });

    expect(result.diagnostics?.carriedWinStreak).toBe(0);
    expect(result.maxCarriedWinStreak).toBeGreaterThanOrEqual(7);
    expect(result.maxBattleDepth).toBeGreaterThanOrEqual(7);
  });
});

describe("ISSUES #99 (soak driver swap-offer misroute) — swap offer answered by its own branch", () => {
  // Regression pin for the fix in randomRoundSoakDriver.ts's onPostwin:
  // the continuation-menu branch used to stay "live" (continuationCursorPos
  // !== null) forever after GO ON was confirmed, so its A presses answered
  // the dialoguePage-4 swap offer instead of the swap-offer branch below it
  // -- vanilla accepted every swap despite its own "declined" doc comment,
  // and full/winning accepted ~85% instead of a 50/50 roll.
  it("vanilla policy always declines the swap offer and never enters the swap screen", () => {
    const notes: string[] = [];
    // Seed 0 wins a battle and reaches the swap-offer menu inside 32,000 frames
    // under this policy's always-GO-ON continuation; capped well short of
    // vanilla's 600,000-frame default full-round budget. (lbra: seed 0 used to
    // get there through the old loss -> new-draft chain; its first challenge
    // is a battle-1 loss, so its second challenge now starts from the Lobby with
    // a different RNG and did not reach a swap offer in 32,000 frames, so the pin
    // moved to seed 1.
    // rps278: lbr-b's attendant conversation moved every Lobby deal again; seed 1's
    // first swap offer is now at frame 37,226, past the window. Scan of vanilla seeds 0..11
    // (80,000 frames): all 12 reach one and every offer is "NO" with no swap screen;
    // first-offer frames 0: 16,867, 1: 37,226, 2: 38,334, 3: 36,681, 4: 20,724,
    // 5: 18,356, 6: 23,881, 7: 39,275, 8: 41,477, 9: 22,423, 10: 19,522, 11: 17,823.
    // Seed 0 is the lowest that is inside 32,000 with a wide margin, so the window is kept.)
    // lbr-g (#221 E1-E3, the Lobby cursor is the ROM's): seed 0 no longer reaches a swap offer inside 32,000 frames; scan of vanilla seeds 0..6
    // under the same window: 1, 2, 3 reach offers (all "NO", no swap screen), so the lowest (1) is pinned.
    // lbb1 (docs/lbb1-lobby-b-press.md: the Lobby terminal's pages and farewell take B, which the driver presses there at 12%, so the
    // Lobby's length and with it the next challenge's deal move): seed 1's first offer is now at 50,093. Scan of vanilla seeds 0..11
    // (80,000 frames): all 12 reach one, every offer "NO", no swap screen; first-offer frames 0: 23,816, 1: 50,093, 2: 21,726,
    // 3: 17,933, 4: 32,470, 5: 17,041, 6: 21,019, 7: 19,422, 8: 22,150, 9: 44,215, 10: 20,581, 11: 22,262. Seed 0 is the lowest
    // inside 32,000, so it is pinned again and the window kept.
    // merge of the box's 2026-11-20 run with the Mac's 11-21 fixes: seed 0's first offer is now at 43,736, past the window. Scan of vanilla seeds 0..11 (80,000 frames): all 12 reach
    // one, every offer "NO", no swap screen; first-offer frames 0: 43,736, 1: 42,095, 2: 19,289, 3: 19,995, 4: 24,332, 5: 50,195, 6: 17,830,
    // 7: 19,695, 8: 25,204, 9: 23,902, 10: 25,116, 11: 27,633. Seed 2 is the lowest inside 32,000 with a wide margin, so it is pinned and the window kept.
    runSeed(2, {
      policy: "vanilla",
      maxFrames: 32_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    const swapOfferNotes = notes.filter((note) => note.startsWith("swap offer:"));
    expect(swapOfferNotes.length).toBeGreaterThan(0);
    expect(swapOfferNotes.every((note) => note === "swap offer: NO")).toBe(true);
    expect(notes.some((note) => note.startsWith("swap screen:"))).toBe(false);
  });

  it("winning policy's swap-offer menu is reached and logs its own decision", () => {
    const notes: string[] = [];
    runSeed(0, {
      policy: "winning",
      maxFrames: 15_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    expect(notes.some((note) => note.startsWith("swap offer:"))).toBe(true);
  });

  it("both YES and NO swap-offer decisions occur across a small fixed seed set (full policy)", () => {
    // Moved from "winning" to "full" by M-B step 2 part B, rung 1: "winning"
    // now always declines (see the describe block below), so "full" is the
    // policy that still exercises both branches of this menu.
    // frf250a (BAG / RUN now show their ROM screens; new exploring trajectories): seeds 0..6 reach only a YES (seed 6) inside
    // 20,000 frames, seed 7 answers NO, so the set is 0..7.
    const swapOfferNotes: string[] = [];
    for (let seed = 0; seed < 8; seed += 1) {
      runSeed(seed, {
        policy: "full",
        maxFrames: 20_000,
        renderEvery: 0,
        onNote: (entry) => {
          if (entry.what.startsWith("swap offer:")) swapOfferNotes.push(entry.what);
        },
      });
    }
    expect(swapOfferNotes).toContain("swap offer: YES");
    expect(swapOfferNotes).toContain("swap offer: NO");
  });
});

describe("Milestone M-B step 2: effectiveness-aware winning policy", () => {
  it("(a) picks the type-effectiveness winner over raw higher power (SURF resisted vs VINE_WHIP super-effective+STAB)", () => {
    // SURF (Water, power 95) vs a Water defender: resisted 0.5x, no STAB
    // (attacker is Grass) -> score 47.5. VINE_WHIP (Grass, power 35) vs the
    // same Water defender: super-effective 2x and STAB (attacker is Grass)
    // -> score 105. The lower-power, on-type move should win.
    const slot = pickWinningFightSlot({
      legalSlots: [true, true, false, false],
      moveIds: [57, 22, 0, 0], // MOVE_SURF, MOVE_VINE_WHIP
      attackerTypes: ["TYPE_GRASS", "TYPE_GRASS"],
      defenderTypes: ["TYPE_WATER", "TYPE_WATER"],
    });
    expect(slot).toBe(1);
  });

  it("(b) falls back to highest-power/lowest-slot when every legal move scores 0 (immune or non-damaging)", () => {
    // GROWL (Normal, power 0) is non-damaging -> score 0. TACKLE (Normal,
    // power 35) and HYPER_BEAM (Normal, power 150) are both immune (0x)
    // against a Ghost defender -> score 0. Every legal slot scores 0, so
    // the fallback rule (highest power, ties to the lower slot) applies:
    // HYPER_BEAM's 150 beats TACKLE's 35 and GROWL's 0.
    const slot = pickWinningFightSlot({
      legalSlots: [true, true, true, false],
      moveIds: [45, 33, 63, 0], // MOVE_GROWL, MOVE_TACKLE, MOVE_HYPER_BEAM
      attackerTypes: ["TYPE_NORMAL", "TYPE_NORMAL"],
      defenderTypes: ["TYPE_GHOST", "TYPE_GHOST"],
    });
    expect(slot).toBe(2);
  });

  // ISSUES #125: the winning-like fallback (every legal slot scores 0) must
  // not repeat a pure stat-stage status move whose target stage is already
  // maxed. Neutral stages (6 = DEFAULT_STAT_STAGE, matching the engine's raw
  // 0..12 stat-stage convention) everywhere except the one stat under test.
  const NEUTRAL_STAT_STAGES = {
    atk: 6, def: 6, speed: 6, spAtk: 6, spDef: 6, acc: 6, evasion: 6,
  } as const;

  it("(d) [#125] skips a maxed self-boost slot for the next non-maxed status slot", () => {
    // DOUBLE_TEAM (evasion UP, self) at slot 0 with evasion already at +6
    // (raw stage 12) is a no-op; GROWL (attack DOWN, foe) at slot 1 with the
    // foe's attack stage still neutral (6) still has something to do. Both
    // score 0 (non-damaging), so without the lever slot 0 would win the
    // power tie (today's fallback, see test (b)); with the lever slot 1 wins.
    const slot = pickWinningFightSlot({
      legalSlots: [true, true, false, false],
      moveIds: [104, 45, 0, 0], // MOVE_DOUBLE_TEAM, MOVE_GROWL
      attackerTypes: ["TYPE_NORMAL", "TYPE_NORMAL"],
      defenderTypes: ["TYPE_NORMAL", "TYPE_NORMAL"],
      attackerStatStages: { ...NEUTRAL_STAT_STAGES, evasion: 12 },
      defenderStatStages: NEUTRAL_STAT_STAGES,
    });
    expect(slot).toBe(1);
  });

  it("(e) [#125] stages omitted reproduces today's fallback exactly (DOUBLE_TEAM wins the slot-0 tie)", () => {
    // Same legal slots as (d), stages omitted: identical to pre-#125
    // behaviour -- the maxed-skip lever never engages without stage input.
    const slot = pickWinningFightSlot({
      legalSlots: [true, true, false, false],
      moveIds: [104, 45, 0, 0], // MOVE_DOUBLE_TEAM, MOVE_GROWL
      attackerTypes: ["TYPE_NORMAL", "TYPE_NORMAL"],
      defenderTypes: ["TYPE_NORMAL", "TYPE_NORMAL"],
    });
    expect(slot).toBe(0);
  });

  it("(f) [#125] falls back to today's highest-power/lowest-slot rule when every status slot is maxed", () => {
    // DOUBLE_TEAM (evasion UP, self, already +6) and SWORDS_DANCE (attack
    // UP x2, self, already +6) are both maxed no-ops; with no non-maxed
    // legal slot left, the lever must not invent a new rule -- it falls
    // back to the original highest-power/lowest-slot pick (both power 0,
    // ties to slot 0), exactly like test (b)'s fallback shape.
    const slot = pickWinningFightSlot({
      legalSlots: [true, true, false, false],
      moveIds: [104, 14, 0, 0], // MOVE_DOUBLE_TEAM, MOVE_SWORDS_DANCE
      attackerTypes: ["TYPE_NORMAL", "TYPE_NORMAL"],
      defenderTypes: ["TYPE_NORMAL", "TYPE_NORMAL"],
      attackerStatStages: { ...NEUTRAL_STAT_STAGES, evasion: 12, atk: 12 },
      defenderStatStages: NEUTRAL_STAT_STAGES,
    });
    expect(slot).toBe(0);
  });

  it("(c) leaves \"full\" byte-identical for two seeds (winning-only change)", () => {
    const options = {
      maxFrames: 600_000,
      renderEvery: 0,
      policy: "full" as const,
      stopAtFirstRoundDecision: true,
    };
    // Recorded on the pre-change tree (this milestone's step 2 commit);
    // re-pinned by soak111 (docs/soak111-decoupled-cooldown.md): the soak
    // driver's press cooldowns moved to their own seeded stream, so the
    // decision stream -- and with it this exploring policy's whole random
    // game -- is a new (now presentation-length-independent) trajectory.
    // Before: seed 0 11955 / turn 20, seed 1 14345 / battle 1 turn 29 (sc106
    // alone had already moved them to 14186 / 24 and 12272 / 23). olnd113
    // (ISSUES #167, the Scene OFF pause / miss hold) moved the frames only:
    // 16321 -> 17591, 25321 -> 27061; decision and canonical logs identical
    // to 8cc0c3a34's (soak111Decoupling.ts), same battle / turn. scf117 (the
    // post-stats-change hold): frames only, seed 1 27061 -> 27052; decision and
    // canonical logs identical to c1ddccc74's for both seeds. off121 (the
    // Scene OFF `status` command ends at the next print): frames only,
    // 17591 -> 17557 and 27052 -> 26869; decision and canonical logs
    // identical to 61e1128ab's for both seeds. offs152 (the Scene OFF opponent
    // send-in tail + forced switch-out): frames only, 17557 -> 17423 and
    // 26869 -> 26878 (a cry-bound send-in outlasts the old 102); same battle /
    // turn / end state.
    // chg161 (the charge-turn empty box): frames only, 17423 -> 17242; same battle / turn / end state.
    expect(runSeed(0, options)).toMatchObject({
      // msg175: 17242 -> 17232 (shorter used prints); trn178 (the Scene OFF action-transition pause): 17232 -> 17493; same battle / turn / end state.
      // pfr192 (the keyed player faint-replacement send-in clock): 17493 -> 17175; same battle / turn / end state.
      // lsd194 (docs/lsd194-print-floor-and-drain.md section 8): the floor drop alone (no Leech Seed in this trajectory): 17175 -> 17125; same battle / turn / end state.
      // rep203: fnt201 (the faint script lead) 17125 -> 17485; hpb202 adds 0 (lsd194SoakPins.ts on 5021eb05e / 00bc66214 / e7f6d136d); same battle / turn / end state.
      // fsw235 (the forced party menu's ROM cursor model + the policies' random party-menu walks): the exploring policy's
      // decision ticks in the forced menu (and their "A on the fainted slot" rolls) are no longer one DOWN apart, so its
      // random game is a new trajectory: 17485 / turn 30 -> 14107 / turn 23 (the wander rolls themselves come from the
      // press-timing stream, so "vanilla" below only moves frames). The voluntary menu's SHIFT on the active row then
      // stopped being a silent no-op (gText_PkmnAlreadyInBattle, the same fsw235 commit): the exploring game dismisses a
      // message where it used to back out, so a new trajectory again: 14107 / battle 1 turn 23 -> 42311 / battle 3 turn 14.
      // pmo239 (party menus in the ROM's battle order; the soak's forced-menu walk stops on the first legal row it shows, the
      // voluntary walk maps the rolled raw party index to its menu row): a new exploring trajectory, 42311 / battle 3 turn 14 -> 37753 / battle 2 turn 26.
      // vis243a (the voluntary player send-in waits for the species' back animation / cry; exploring policy's press timings move with the
      // presentation clock, as at fsw235): 37753 / turn 26 -> 38729 / turn 28; same battle 2 / roundLost / depth 1.
      // aud240b (A on the summary Info page closes it, pokemon_summary_screen.c:1556-1560, draft + swap summaries; the exploring
      // policy presses A there): 38729 / turn 28 -> 43417 / turn 39; same battle 2 / roundLost / depth 1. Supervisor-checked: with both
      // A-close sites undone the old pin passes again.
      // frf250a (BAG prints its message, RUN opens the forfeit prompt; the exploring policy presses both, so a new trajectory
      // as at fsw235): 43417 / turn 39 -> 39078 / turn 25; same battle 2 / roundLost / depth 1.
      // obr251 (the opponent faint-replacement party-summary draw hold): frames only, 39078 -> 39466; same battle 2 / roundLost / depth 1 / turn 25
      // (re-pinned by cln242 from the failing full-suite shard).
      // flw252 (the party menu ignores input until its open fade settles; refusal messages wait for their printer): the exploring
      // policy's party-menu walks / message dismisses now spend different presses, so a new trajectory as at fsw235:
      // 39466 / battle 2 turn 25 / depth 1 -> 18446 / battle 1 turn 23 / depth 0; roundLost. Pre-flw252 tree (e28adda1a^) still gives 39466.
      // lbra: frames only, 18446 -> 18523; the snapshot is now taken when the walkable Lobby opens (the loss's record answer plays the ROM farewell first, +77 frames) instead of at the old chain; same battle / turn / end state.
      // ais1 (the AI's mid-battle switch prints "<TRAINER> withdrew <MON>!" and runs the opponent return-to-ball, so the exploring
      // policy's press timings land on new phases, a new trajectory as at fsw235): 18523 / battle 1 turn 23 / depth 0 -> 38094 / battle 2
      // turn 22 / depth 1; roundLost. ais2 (one more opponent tray frame on AI switches) does not move it again; seed 1 is unmoved by both,
      // and the "vanilla" / "winning" pins did not move (only the exploring policy presses during the new messages).
      // sta3 (the action transition into a pre-move confusion / sleep print and its 3 launch rows; the exploring policy's presses land on
      // new phases again): 38094 / turn 22 -> 37771 / turn 20; same battle 2 / depth 1 / roundLost.
      // wsh1 (Wish / Future Sight / Focus Band presented as commands): frames only, 37771 -> 37806; same battle 2 / depth 1 / roundLost / turn 20.
      // hpd5 (measured on the hpd4 tip f40209793; the floor-free foe-hit hold): frames only, 37806 -> 37811; same battle 2 / depth 1 / roundLost / turn 20.
      // pau2 (the used-move hold takes pause LONG; SafeguardEnds' pause row; the exploring policy's presses land on new phases, a new trajectory as at fsw235):
      // 37811 / turn 20 -> 39649 / turn 24; same battle 2 / depth 1 / roundLost (master-at-start 8516a6da1 gives 37811).
      // ais4 (the opponent faint replacement send-in is 2 frames longer): frames only, 39649 -> 39712; same battle 2 / depth 1 / roundLost / turn 24.
      // hpd8 + ais4 merged (26477cf4b; ais4 was pinned on a base without lbw8's Lobby NPC release and hpd8; together they move the exploring presses): 39712 / turn 24 -> 40342 / turn 20; same battle 2 / depth 1 / roundLost.
      // hpf1 (hit -> message / faint-chain / turn-end hp commands are floor-free, ROM-measured): 40342 / turn 20 -> 39622 / turn 24 (exploring presses land on new phases); same battle 2 / depth 1 / roundLost.
      // merge of the box's 2026-11-18 run with the Mac's fixes 44-51: frames only, 39622 -> 39365; same battle 2 / depth 1 / roundLost / turn 24.
      // merge of pau4 / btn1 / pau5 / hpf5 (pin1; the exploring presses land on new phases, a new trajectory as at fsw235): 39365 / battle 2 / depth 1 / turn 24 -> 18678 / battle 1 / depth 0 / turn 23; still roundLost.
      // pic6 + pic8 (B in the battle party menu fades out and in over 78 frames, ROM lab pic6-party-cancel; the forced menu's clock starts
      // 2 frames earlier, pic7 lab): frames only, 18678 -> 19042; same battle 1 / depth 0 / turn 23 / roundLost.
      // pic9 (the switch lines follow the foe's HP; new print lengths move the exploring presses): 19042 / turn 23 -> 22844 / turn 30;
      // same battle 1 / depth 0 / roundLost.
      // hcr1 (the Scene OFF used-move print lead u - 3): frames only, 22844 -> 22840; same battle 1 / depth 0 / turn 30 / roundLost.
      // hcr1b (the used-move glyph at commit + 7 + u): frames only, 22840 -> 22858; same battle 1 / depth 0 / turn 30 / roundLost.
      // chg1 (the Scene OFF two-turn move timing; the exploring presses land on new phases, a new trajectory as at fsw235): 22858 / battle 1 / depth 0 / turn 30
      // -> 67929 / battle 3 / depth 2 / turn 20; still OK / roundLost (no errorMessage; the scan above has 40 full-policy seeds OK).
      // lrc1 (the loss tail's opponent recall plays the ROM's animated return to ball, its recall receipt holds to the trainer slide and the slide's printstring is 3 rows later: the win text prints 67 frames later): frames only, 22844 -> 22897; same battle 1 / depth 0 / turn 30 / roundLost.
      // fnt1 (docs/fnt1-fainted-box-clear.md: the "fainted!" box takes the press 2 rows earlier, from the row after its last glyph; the exploring
      // presses land on new phases, a new trajectory as at fsw235): 22897 / battle 1 / depth 0 / turn 30 -> 39277 / battle 2 / depth 1 / turn 22;
      // still roundLost. With the accept edge undone (isBattleResolutionButtonMessageAcceptable's promptClear lead) the old pin passes again.
      // lbb1 (the boxes of the Lobby terminal, the postwin and the rooms take B as A; the exploring policy presses B there): frames only,
      // 22897 -> 22843; decision notes identical to 6817b6a8c's (press-stream notes aside); same battle 1 / depth 0 / turn 30 / roundLost.
      // trial-fix-20261121 (fnt1 + lbb1 together): frames only, 39277 -> 39259; same battle 2 / depth 1 / turn 22 / roundLost.
      // merge of the box's 2026-11-20 run with the Mac's 11-21 fixes: the box's chg1 trajectory (67929 / battle 3 / depth 2 / turn 20; the Mac had 39259 / battle 2 / depth 1 / turn 22):
      // frames only against the box, 67929 -> 67984; same battle 3 / depth 2 / turn 20 / roundLost.
      // gsp3 (the end-of-turn poison / burn tick's print -> launch rows 95 / 98 as the ROM, gsp3-{toxic,willowisp}-player-on rows 1576 -> 1671 / 1547 -> 1645;
      // the exploring presses land on new phases): 67984 / turn 20 -> 68529 / turn 21; same battle 3 / depth 2 / OK / roundLost.
      // wtl1 (the win tail's 24 draw-nothing rows before "Player defeated"; the exploring presses land on new phases): 68529 / battle 3 / depth 2 / turn 21 -> 75721 / battle 4 / depth 3 / turn 21; still OK / roundLost.
      // wtl1 item 2 (the turn-end weather print's 10 rows after MoveEnd, ROM rain labs: stat fall 425 -> 435, hit 323 -> 333): frames only, 75721 -> 75618; same battle 4 / depth 3 / turn 21 / roundLost. A trajectory pin, not a ROM frame.
      // etp1 (end-turn prints take the ROM end-turn rows; the exploring presses land on new phases): 75618 / battle 4 / depth 3 / turn 21 -> 57508 / battle 3 / depth 2 / turn 12; roundLost. A trajectory pin, not a ROM frame.
      // merge of etp1 / etp2 with this run's fold (eqk1, chg2 / chg3, hie5, fnt2, trn226, msw2): 57508 (etp1) -> 94125 / battle 4 / depth 3 / turn 18; roundLost.
      // merge with the Mac's tdr1 (tri1 / wtl1 / sst1; the exploring presses land on new phases): 94125 / battle 4 / depth 3 / turn 18 ->
      // 68945 / battle 3 / depth 2 / turn 21; still OK / roundLost. A trajectory pin, not a ROM frame.
      frames: 68945,
      outcome: "OK",
      endState: "roundLost",
      maxBattleDepth: 2,
      battle: 3,
      turn: 21,
    });
    expect(runSeed(1, options)).toMatchObject({
      // msg175: 26878 -> 26810 (shorter used prints); trn178 (the Scene OFF action-transition pause): 26810 -> 27058; same battle / turn / end state.
      // pfr192 (the keyed player faint-replacement send-in clock): 27058 -> 26866; same battle / turn / end state.
      // lsd194: the floor drop alone: 26866 -> 26804; same battle / turn / end state.
      // lsd196 (second-stat rows): 26804 -> 26817; rst197 does not move it (lsd194SoakPins.ts); same battle / turn / end state.
      // rep203: fnt201 (the faint script lead) 26817 -> 27295; hpb202 adds 0 (lsd194SoakPins.ts on 5021eb05e / 00bc66214 / e7f6d136d); same battle / turn / end state.
      // fsw235: a new trajectory for the exploring policy (see seed 0): 27295 / battle 2 turn 9 -> 25899 / battle 2 turn 6,
      // then 25899 / battle 2 turn 6 -> 38842 / battle 2 turn 33 with the voluntary menu's already-in-battle refusal.
      // pmo239: a new exploring trajectory (see seed 0): 38842 / battle 2 turn 33 -> 17862 / battle 1 turn 31.
      // vis243a (see seed 0): 17862 / turn 31 -> 21359 / turn 37; same battle 1 / roundLost / depth 0.
      // frf250a (see seed 0): 21359 / battle 1 turn 37 -> 58240 / battle 3 turn 25; roundLost, depth 2.
      // obr251 (the opponent faint-replacement party-summary draw hold; the exploring policy reads presentation state, so a new trajectory,
      // see seed 0): 58240 / battle 3 turn 25 / depth 2 -> 36610 / battle 2 turn 23 / depth 1; roundLost. Re-pinned by cln242 from the
      // failing full-suite shard (the supervisor should confirm the trajectory change).
      // flw252 (see seed 0): 36610 / battle 2 turn 23 / depth 1 -> 21881 / battle 1 turn 35 / depth 0; roundLost. Pre-flw252 tree gives 36610.
      // lbra: frames only, 21881 -> 21940; the snapshot is now taken when the walkable Lobby opens (the loss's record answer plays the ROM farewell first, +59 frames) instead of at the old chain; same battle / turn / end state.
      // sta3 (the action transition into a pre-move print + its 3 launch rows): frames only, 21940 -> 21985; same battle 1 / turn 35 / roundLost.
      // hpd5 (measured on the hpd4 tip f40209793; the floor-free foe-hit hold changes the exploring policy's press phases): 21985 / turn 35 -> 28708 / turn 46; same battle 1 / depth 0 / roundLost.
      // hpf1: 28708 / turn 46 -> 56022 / turn 15 (battle 1 / depth 0 -> battle 3 / depth 2; the exploring presses land on new phases); still roundLost.
      // hpf2: 56022 / turn 15 -> 92558 / turn 27 (battle 3 / depth 2 -> battle 5 / depth 4; the exploring presses land on new phases); still roundLost.
      // btn1 (gated battle strings wait for A / B; the exploring policy presses B at 6%): 92558 / turn 27 -> 95264 / turn 29; same battle 5 / depth 4 / roundLost (seed 0 is unmoved).
      // merge of pau4 / btn1 / pau5 / hpf5 (pin1; the exploring presses land on new phases): 95264 / battle 5 / depth 4 / turn 29 -> 111059 / battle 6 / depth 5 / turn 19; still roundLost.
      // btn2 (Substitute fade lead / release-to-moveendall rows / the gate accepts 2 rows earlier; presentation timing): frames only, 111059 -> 111140; same battle 6 / depth 5 / turn 19 / roundLost.
      // pic6 + pic8 (the party-menu cancel fade, the forced menu's earlier clock; see seed 0): frames only, 111140 -> 113091; same battle 6 / depth 5 / turn 19 / roundLost.
      // pic9 (the switch lines follow the foe's HP, so the exploring presses land on new phases): 113091 / battle 6 / depth 5 -> 60400 / battle 3 /
      // depth 2; same turn 19, still roundLost.
      // flow1 (the move menu opens on the first move after a switch-in, battle_util.c:299-300 / battle_main.c:3203-3204; ROM-checked by the
      // frame catcher, docs/flow1-menu-cursors-and-locked-switch-recall.md): the exploring policy's fight presses after its switches pick
      // other moves, so a new trajectory: 60400 / turn 19 -> 61456 / turn 22; same battle 3 / depth 2 / roundLost. The cursor fix alone moves
      // it (with it undone the old pin passes; the recall fix alone leaves it). Seed 0 is unmoved.
      // rsw1 (the room after the swap screen: black hold, fade, "Thank you!" waits for A; docs/rsw1-swap-return-room.md): frames only,
      // 61456 -> 61528 (the player's press lands on the new wait; a rule change, not a bug); same battle 3 / depth 2 / turn 22 / roundLost.
      // hcr1 (the Scene OFF used-move print lead u - 3; the exploring presses land on new phases): 61456 / turn 22 -> 60534 / turn 19; same battle 3 / depth 2 / roundLost.
      // hcr1b (the used-move glyph at commit + 7 + u): frames only, 60534 -> 64227; same turn 19, battle 3 / depth 2 / roundLost.
      // merge of rsw1 + hcr1b + gsp2b (pin2): frames only, 64227 -> 64299; same turn 19, battle 3 / depth 2 / roundLost.
      // chg1 (the Scene OFF two-turn move timing): frames only, 64299 -> 64365; same battle 3 / depth 2 / turn 19 / roundLost.
      // lrc1 (the loss tail runs the opponent's animated recall, see seed 0): frames only, 61456 -> 61504; same battle 3 / depth 2 / turn 22 / roundLost.
      // sct1 (docs/sct1-scouting-next-opponent.md: each scouting page takes A from its own last character + 3, and the pages are the next
      // opponent's, so their lengths and the exploring presses after them move): 61504 / turn 22 -> 58793 / turn 19; same battle 3 /
      // depth 2 / roundLost. With the old fixed [72, 74, 72] accept delays (and the new text) the old pin passes again; seed 0 is unmoved.
      // lbb1 (see seed 0): frames only, 58793 -> 58758; decision notes identical to 6817b6a8c's once the press-stream notes (the party
      // wander and forced-menu DOWN rolls) are set aside; same battle 3 / depth 2 / turn 19 / roundLost.
      // msg2 (docs/msg2-roar-wish-messages.md: Roar / Whirlwind's dragged-out release -> moveendall is 4 rows, the box clears 1 row
      // earlier, so the exploring presses after it land 1 row earlier), measured on the combined tree (trial-fix-20261121 e12015ff1 +
      // msg2): frames only, 58758 -> 58763; same battle 3 / depth 2 / turn 19 / roundLost. With RELEASE_TO_MOVEEND_ROWS.STRINGID_PKMNWASDRAGGEDOUT
      // back at 5 the old pin passes again (on msg2's own base the same tail moved 58793 -> 58798); seed 0 is unmoved.
      // merge of the box's 2026-11-20 run with the Mac's 11-21 fixes: frames only, 64365 (box) / 58763 (Mac) -> 60582; same battle 3 / depth 2 / turn 19 / roundLost on all three.
      // stc1 (Scene OFF confusion self-hit +7 rows to the hit, ROM 204 / 199 after the commit): frames only, 60582 -> 60525; same battle 3 / depth 2 / turn 19 / roundLost.
      // hcr3 (Icy Wind's hp keeps the stat command's 4-row tail, Double-Edge's recoil hp / print follow the ROM rows, the faint SE clips its hpd4 compensation at 0): frames only, 60582 -> 58672; same battle 3 / depth 2 / turn 19 / roundLost.
      // merge stc1 + hcr3 (fold-a): frames only, 60525 (stc1) / 58672 (hcr3) -> 58579; same battle / depth / turn / end state.
      // gsp3 (the end-of-turn poison / burn tick's print -> launch rows 95 / 98 as the ROM, gsp3-{toxic,willowisp}-player-on): frames only, 58579 -> 58583; same battle 3 / depth 2 / turn 19 / roundLost.
      // fnt2 (a super-effective / crit drain's heal bar waits the ROM's 6 script rows after the print; lab fnt2-absorb-se ROM SE 16 580, both scenes): frames only, 58583 -> 58615; same battle 3 / depth 2 / turn 19 / roundLost.
      // etp1 (end-turn prints take the ROM end-turn rows; the exploring presses land on new phases): 58583 / turn 19 -> 57984 / turn 15; same battle 3 / depth 2 / roundLost. A trajectory pin, not a ROM frame.
      // merge of etp1 / etp2 with this run's fold: frames only, 58615 (fnt2) / 57984 (etp1) -> 57984; same battle 3 / depth 2 / turn 15 / roundLost.
      // merge with the Mac's tdr1 (tri1 / wtl1 / sst1): frames only, 57984 -> 57651; same battle 3 / depth 2 / turn 15 / roundLost.
      frames: 57651,
      outcome: "OK",
      endState: "roundLost",
      maxBattleDepth: 2,
      battle: 3,
      turn: 15,
    });
  });

  it("(c) leaves \"vanilla\" byte-identical for two seeds (winning-only change)", () => {
    const options = {
      maxFrames: 600_000,
      renderEvery: 0,
      policy: "vanilla" as const,
      stopAtFirstRoundDecision: true,
    };
    // Recorded on the pre-change tree (this milestone's step 2 commit).
    // soak111 (docs/soak111-decoupled-cooldown.md) re-pinned the frames
    // only: vanilla's decisions are fixed, and the driver's press cooldowns
    // now come from their own seeded stream (8499 -> 8683 here, 8550 -> 8670
    // for seed 1; sc106 alone had moved them to 8625 / 8661). Same turn 16.
    // olnd113 (ISSUES #167, the Scene OFF pause / miss hold): frames only,
    // 8683 -> 9143 and 8670 -> 9205; decision logs identical to 8cc0c3a34's.
    // scf117 (the post-stats-change hold): frames only, seed 0 9143 -> 9145;
    // decision and canonical logs identical to c1ddccc74's for both seeds.
    // off121 (the Scene OFF `status` command): frames only, 9145 -> 9130 and
    // 9205 -> 9033; decision and canonical logs identical to 61e1128ab's.
    expect(runSeed(0, options)).toMatchObject({
      // msg175: 9130 -> 9128 (shorter used prints); trn178 (the Scene OFF action-transition pause): 9128 -> 9154; same battle / turn / end state.
      // pfr192 (the keyed player faint-replacement send-in clock): 9154 -> 8928; same battle / turn / end state.
      // lsd194 (docs/lsd194-print-floor-and-drain.md section 8): the floor drop alone: 8928 -> 8895; same battle / turn / end state.
      // rep203: fnt201 (the faint script lead) 8895 -> 9140; hpb202 adds 0 (lsd194SoakPins.ts on 5021eb05e / 00bc66214 / e7f6d136d); same battle / turn / end state.
      // fsw235 (the forced party menu opens on slot 0, so a slot-0 replacement needs no DOWN and a slot-2 one needs two): frames
      // only, 9140 -> 9134; decision notes identical apart from the menu presses; same battle / turn / end state.
      // lbra: frames only, 9134 -> 9185; the snapshot is now taken when the walkable Lobby opens (the loss's record answer plays the ROM farewell first, +51 frames) instead of at the old chain; same battle / turn / end state.
      // hie1 (the Scene OFF held-item effect hold): frames only, 9185 -> 9212; same battle / turn / end state.
      // hpd5 (measured on the hpd4 tip f40209793; the floor-free foe-hit hold): frames only, 9212 -> 9219; same end state.
      // hpf1: frames only, 9219 -> 9228; same end state.
      // merge of the box's 2026-11-18 run with the Mac's fixes 44-51: frames only, 9228 -> 9209; same end state.
      // pic8 (the forced party menu's clock starts at the faint message's dismiss edge: 2 frames earlier per forced switch, ROM lab pic7): frames only, 9209 -> 9205; same end state.
      // lrc1 (the loss tail's opponent recall plays the ROM's animated return to ball, its recall receipt holds to the trainer slide and the slide's printstring is 3 rows later: the win text prints 67 frames later): frames only, 9205 -> 9319; same battle 1 / turn 16 / end state (the terminal presses land on new phases after the longer tail).
      // lbb1 (the loss terminal's pages and farewell take B as A; the driver's terminal presses are 12% B): frames only, 9319 -> 9300;
      // decision notes identical to 6817b6a8c's; same battle 1 / turn 16 / end state. Seed 1 is unmoved.
      // merge with the Mac's tdr1 (tri1: the battle intro at the drawn transition's own frame): frames only, 9300 -> 9336; same battle 1 /
      // turn 16 / end state.
      frames: 9336,
      outcome: "OK",
      endState: "roundLost",
      maxBattleDepth: 0,
      battle: 1,
      turn: 16,
    });
    // ISSUES #104 (engine half, fixed): the old 16970 pin was a grace-expiry
    // artifact -- seed 1's random terminal presses landed on the record
    // prompt's YES/cancel answer, which used to dead-end forever (no
    // declineFarewellReleaseAge, no re-chain), so the driver's 9000-frame
    // grace window ran out before the snapshot ever refreshed past the
    // dead-end tick. Now that YES/cancel arm the same continuation as NO
    // (factoryTerminalPresentation.ts's advanceFactoryTerminalRecordPrompt),
    // the round genuinely re-chains right after the answer is given, so the
    // frozen last-pre-chain snapshot lands much earlier, at the real frame.
    expect(runSeed(1, options)).toMatchObject({
      // msg175: 9033 -> 8946 (shorter used prints); trn178 (the Scene OFF action-transition pause): 8946 -> 9232; same battle / turn / end state.
      // pfr192 (the keyed player faint-replacement send-in clock): 9232 -> 8979; same battle / turn / end state.
      // lsd194: the floor drop alone: 8979 -> 8920; same battle / turn / end state.
      // rep203: fnt201 (the faint script lead) 8920 -> 9190; hpb202 adds 0 (lsd194SoakPins.ts on 5021eb05e / 00bc66214 / e7f6d136d); same battle / turn / end state.
      // fsw235: frames only (the menu presses), 9190 -> 9186; same battle / turn / end state.
      // lbra: frames only, 9186 -> 9233; the snapshot is now taken when the walkable Lobby opens (the loss's record answer plays the ROM farewell first, +47 frames) instead of at the old chain; same battle / turn / end state.
      // hie1 (the Scene OFF held-item effect hold): frames only, 9233 -> 9271; same battle / turn / end state.
      // hpf1: frames only, 9271 -> 9404; same end state.
      // pic8 (the forced party menu's clock starts at the faint message's dismiss edge, ROM lab pic7): frames only, 9404 -> 9400; same end state.
      // lrc1 (see seed 0): frames only, 9400 -> 9350 (the random terminal presses after the 67-frame-longer loss tail answer the record prompt sooner); same battle 1 / turn 16 / end state.
      // merge with the Mac's tdr1 (tri1, see seed 0): frames only, 9350 -> 9315; same battle 1 / turn 16 / end state.
      frames: 9315,
      outcome: "OK",
      endState: "roundLost",
      maxBattleDepth: 0,
      battle: 1,
      turn: 16,
    });
  });
});

describe("Milestone M-B step 2 part B, rung 1: winning declines every swap offer", () => {
  it("never enters the swap screen and every swap-offer note reads NO", () => {
    const notes: string[] = [];
    // Seed 0 reaches the swap-offer menu under "winning" well within 20,000
    // frames (the pre-fix ISSUES #99 pin above confirms this for seed 0).
    runSeed(0, {
      policy: "winning",
      maxFrames: 20_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    const swapOfferNotes = notes.filter((note) => note.startsWith("swap offer:"));
    expect(swapOfferNotes.length).toBeGreaterThan(0);
    expect(swapOfferNotes.every((note) => note === "swap offer: NO")).toBe(true);
    expect(notes.some((note) => note.startsWith("swap screen:"))).toBe(false);
  });
});

describe("winning-swap policy (opt-in swap-screen coverage instrument)", () => {
  it("(a) answers the swap offer YES and reaches the swap screen's input-ready state", () => {
    const notes: string[] = [];
    // Same seed 0 as the "winning declines" pin above: winning-swap reuses
    // "winning"'s exploration/decision rolls verbatim up to the swap offer,
    // so it reaches the same offer at essentially the same frame.
    runSeed(0, {
      policy: "winning-swap",
      maxFrames: 25_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    const swapOfferNotes = notes.filter((note) => note.startsWith("swap offer:"));
    expect(swapOfferNotes.length).toBeGreaterThan(0);
    expect(swapOfferNotes.every((note) => note === "swap offer: YES")).toBe(true);
    // The swap screen only logs a decision once inputReady, so any
    // "swap screen (winning):" note is direct proof the screen was reached
    // and became interactive.
    expect(notes.some((note) => note.startsWith("swap screen (winning):"))).toBe(true);
  });

  // Real Factory Frontier-set scores (battle-frontier-mons.json x
  // species-stats.json x species-types.json x moves.json), hand-verified:
  // KAKUNA/SILCOON (Harden only) = 205, MAGIKARP (Flail) = 207,
  // REGISTEEL (best move Ancient Power, no STAB) = 1095,
  // REGIROCK #762 (best move Earthquake, STAB) = 1100,
  // METAGROSS #835 (best move Meteor Mash, STAB) = 1120.
  it("(b1) scores real Frontier sets with the documented formula", () => {
    expect(scoreFactorySwapCandidate(9)).toBe(205); // KAKUNA
    expect(scoreFactorySwapCandidate(11)).toBe(205); // SILCOON
    expect(scoreFactorySwapCandidate(6)).toBe(207); // MAGIKARP
    expect(scoreFactorySwapCandidate(786)).toBe(1095); // REGISTEEL
    expect(scoreFactorySwapCandidate(762)).toBe(1100); // REGIROCK
    expect(scoreFactorySwapCandidate(835)).toBe(1120); // METAGROSS
  });

  it("(b2) selects the lowest-scoring rental row and ranks outscoring opponents best-first (staged known scores)", () => {
    const rentalMons = [
      { monId: 9, personality: 0, ivs: 0, abilityNum: 0 }, // player row 0: KAKUNA, 205 -- worst
      { monId: 6, personality: 0, ivs: 0, abilityNum: 0 }, // player row 1: MAGIKARP, 207
      { monId: 786, personality: 0, ivs: 0, abilityNum: 0 }, // player row 2: REGISTEEL, 1095
      { monId: 11, personality: 0, ivs: 0, abilityNum: 0 }, // opponent row 0: SILCOON, 205 -- ties worst, does not outscore
      { monId: 835, personality: 0, ivs: 0, abilityNum: 0 }, // opponent row 1: METAGROSS, 1120 -- best
      { monId: 762, personality: 0, ivs: 0, abilityNum: 0 }, // opponent row 2: REGIROCK, 1100
    ] as unknown as FactoryRentalRoster;
    const plan = buildWinningSwapPlan(rentalMons);
    expect(plan.worstPlayerRow).toBe(0);
    expect(plan.worstPlayerScore).toBe(205);
    expect(plan.opponentQueue).toEqual([1, 2]);
  });

  it("(b3) declines when no opponent mon outscores the worst rental", () => {
    const rentalMons = [
      { monId: 786, personality: 0, ivs: 0, abilityNum: 0 }, // player row 0: REGISTEEL, 1095 -- worst
      { monId: 835, personality: 0, ivs: 0, abilityNum: 0 }, // player row 1: METAGROSS, 1120
      { monId: 762, personality: 0, ivs: 0, abilityNum: 0 }, // player row 2: REGIROCK, 1100
      { monId: 9, personality: 0, ivs: 0, abilityNum: 0 }, // opponent row 0: KAKUNA, 205
      { monId: 6, personality: 0, ivs: 0, abilityNum: 0 }, // opponent row 1: MAGIKARP, 207
      { monId: 11, personality: 0, ivs: 0, abilityNum: 0 }, // opponent row 2: SILCOON, 205
    ] as unknown as FactoryRentalRoster;
    const plan = buildWinningSwapPlan(rentalMons);
    expect(plan.worstPlayerRow).toBe(0);
    expect(plan.opponentQueue).toEqual([]);
  });

  it("(c) \"winning\" is unaffected -- still declines every swap offer and never enters the swap screen", () => {
    const notes: string[] = [];
    runSeed(0, {
      policy: "winning",
      maxFrames: 20_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    const swapOfferNotes = notes.filter((note) => note.startsWith("swap offer:"));
    expect(swapOfferNotes.length).toBeGreaterThan(0);
    expect(swapOfferNotes.every((note) => note === "swap offer: NO")).toBe(true);
    expect(notes.some((note) => note.startsWith("swap screen"))).toBe(false);
  });
});

describe("Milestone M-B step 2 part C (tightened by part C2): winning switches out of a truly-walled matchup", () => {
  // MOVE_TACKLE (Normal, power 35) is 0x-immune against a Ghost defender;
  // MOVE_LICK (Ghost, power 20) is 2x super-effective (with STAB) against
  // that same Ghost defender -- confirmed against this repo's own
  // type-effectiveness table, mirroring how the part 2a pins above prove
  // the analogous Water/Grass combo. MOVE_SURF (Water, power 95) is only
  // 0.5x resisted (NOT immune) against a Water defender -- part C2's
  // tightening: a merely resisted active no longer counts as walled.
  const GHOST: readonly [string, string] = ["TYPE_GHOST", "TYPE_GHOST"];
  const WATER: readonly [string, string] = ["TYPE_WATER", "TYPE_WATER"];
  const GRASS: readonly [string, string] = ["TYPE_GRASS", "TYPE_GRASS"];
  const walledActive = { activeMoveIds: [33, 0, 0, 0], activeLegalSlots: [true, false, false, false] };
  const qualifyingBench = [
    { row: 1 as const, fainted: false, active: false, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
  ];

  it("(a) resisted-only active (0.5x, not immune) -> NO switch, even with a qualifying bench", () => {
    const row = pickWinningSwitchRow({
      activeMoveIds: [57, 0, 0, 0], // MOVE_SURF, 0.5x resisted vs Water -- not walled since part C2
      activeLegalSlots: [true, false, false, false],
      defenderTypes: WATER,
      bench: [
        { row: 1 as const, fainted: false, active: false, moveIds: [22, 0, 0, 0], types: GRASS, hp: 100, maxHp: 100 },
      ],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });

  it("(b) all-immune active + qualifying bench at 80% HP -> switch", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [{ ...qualifyingBench[0]!, hp: 80 }],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBe(1);
  });

  it("(c) same all-immune active + qualifying bench but at 30% HP -> no switch", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [{ ...qualifyingBench[0]!, hp: 30 }],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });

  it("bench at exactly 50% HP still switches (inclusive boundary)", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [{ ...qualifyingBench[0]!, hp: 50 }],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBe(1);
  });

  it("active has a >= 1x move (not walled) -> null even with a qualifying bench", () => {
    const row = pickWinningSwitchRow({
      activeMoveIds: [33, 0, 0, 0], // MOVE_TACKLE, neutral 1x vs Water
      activeLegalSlots: [true, false, false, false],
      defenderTypes: WATER,
      bench: qualifyingBench,
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });

  it("only one healthy party member remains -> null", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: qualifyingBench,
      healthyCount: 1,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });

  it("already switched against this opponent this battle -> null (no ping-pong)", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: qualifyingBench,
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: true,
    });
    expect(row).toBeNull();
  });

  it("picks the best-scoring qualifying row, ties to the lower row regardless of bench order", () => {
    // Row 2 and row 1 both carry LICK -> the same 20 x 2 x 1.5(STAB) = 60
    // score. Row 2 is listed FIRST in `bench` to prove the tie-break is
    // an explicit lower-row rule, not an artifact of iteration order.
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [
        { row: 2 as const, fainted: false, active: false, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
        { row: 1 as const, fainted: false, active: false, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
      ],
      healthyCount: 3,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBe(1);
  });

  it("skips fainted and active bench candidates even when they'd qualify", () => {
    const row = pickWinningSwitchRow({
      ...walledActive,
      defenderTypes: GHOST,
      bench: [
        { row: 0 as const, fainted: false, active: true, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
        { row: 1 as const, fainted: true, active: false, moveIds: [122, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
      ],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
    });
    expect(row).toBeNull();
  });
});

describe("ISSUES #125 lever 2: forced-Struggle (all four slots at 0 PP) widens the switch trigger", () => {
  const NORMAL: readonly [string, string] = ["TYPE_NORMAL", "TYPE_NORMAL"];
  const GHOST: readonly [string, string] = ["TYPE_GHOST", "TYPE_GHOST"];
  // Every slot illegal (0 PP): the real forced-Struggle state.
  const allZeroPp = { activeMoveIds: [0, 0, 0, 0], activeLegalSlots: [false, false, false, false] };

  it("(a) active all-0-PP + bench mon with a usable damaging move -> switch, even below the 50% HP floor / below the 2x qualifier / with the ping-pong guard already tripped", () => {
    const row = pickWinningSwitchRow({
      ...allZeroPp,
      defenderTypes: NORMAL,
      bench: [
        // MOVE_TACKLE (Normal, power 35): only neutral (1x, not >= 2x) vs a
        // Normal defender, and this candidate is at 10% HP -- both would
        // disqualify it under the pre-lever-2 walled-switch criteria.
        { row: 1 as const, fainted: false, active: false, moveIds: [33, 0, 0, 0], movePp: [35, 0, 0, 0], types: NORMAL, hp: 10, maxHp: 100 },
      ],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: true,
      forcedStruggle: true,
    });
    expect(row).toBe(1);
  });

  it("(b) active all-0-PP + bench with only 0-PP or 0x-immune moves -> no switch", () => {
    const row = pickWinningSwitchRow({
      ...allZeroPp,
      defenderTypes: GHOST,
      bench: [
        // MOVE_TACKLE is 0x-immune vs Ghost even with PP.
        { row: 1 as const, fainted: false, active: false, moveIds: [33, 0, 0, 0], movePp: [35, 0, 0, 0], types: NORMAL, hp: 100, maxHp: 100 },
        // MOVE_LICK would be super-effective vs Ghost, but it's out of PP.
        { row: 2 as const, fainted: false, active: false, moveIds: [122, 0, 0, 0], movePp: [0, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
      ],
      healthyCount: 3,
      alreadySwitchedAgainstThisOpponent: false,
      forcedStruggle: true,
    });
    expect(row).toBeNull();
  });

  it("(c) active with any usable damaging move (not forced-Struggle) -> today's behaviour unchanged, no switch despite a qualifying bench", () => {
    const row = pickWinningSwitchRow({
      activeMoveIds: [33, 0, 0, 0], // MOVE_TACKLE, neutral 1x vs Water, legal (has PP) -- not walled
      activeLegalSlots: [true, false, false, false],
      defenderTypes: ["TYPE_WATER", "TYPE_WATER"],
      bench: [
        { row: 1 as const, fainted: false, active: false, moveIds: [122, 0, 0, 0], movePp: [10, 0, 0, 0], types: GHOST, hp: 100, maxHp: 100 },
      ],
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: false,
      forcedStruggle: false,
    });
    expect(row).toBeNull();
  });
});

describe("ISSUES #125 lever 2 regression (394f22df): forced-Struggle switch must agree with the party screen's own trap gate", () => {
  // Mirrors `isVoluntarySwitchTrapped`
  // (src/engine/factoryBattleScriptFullTurnDecision.ts:2085-2114), the check
  // `legalCommandDecisions` runs unconditionally -- forced Struggle or not --
  // before it will ever publish a "switch" decision for the player battler.
  const ABILITY_NONE = 0;
  const ABILITY_SHADOW_TAG = 23;
  const ABILITY_LEVITATE = 26;
  const ABILITY_MAGNET_PULL = 42;
  const ABILITY_ARENA_TRAP = 71;
  const STATUS2_WRAPPED = 1 << 13;
  const STATUS2_ESCAPE_PREVENTION = 1 << 26;
  const STATUS3_ROOTED = 1 << 10;
  const GRASS: readonly [string, string] = ["TYPE_GRASS", "TYPE_GRASS"];
  const FLYING: readonly [string, string] = ["TYPE_FLYING", "TYPE_FLYING"];
  const STEEL: readonly [string, string] = ["TYPE_STEEL", "TYPE_STEEL"];

  function trapContext(input: Readonly<{
    activeStatus2?: number;
    activeStatus3?: number;
    activeTypes?: readonly [string, string];
    activeAbility?: number;
    opponentAbility?: number;
    opponentHp?: number;
    absentBattlerFlags?: number;
  }> = {}): BattleScriptRulesContext {
    return {
      battlers: [
        {
          partyIndex: 0,
          status2: input.activeStatus2 ?? 0,
          status3: input.activeStatus3 ?? 0,
          types: input.activeTypes ?? GRASS,
          ability: input.activeAbility ?? ABILITY_NONE,
        },
        {
          partyIndex: 1,
          hp: input.opponentHp ?? 100,
          ability: input.opponentAbility ?? ABILITY_NONE,
        },
      ],
      absentBattlerFlags: input.absentBattlerFlags ?? 0,
    } as unknown as BattleScriptRulesContext;
  }

  it("seed 406 shape: opponent Shadow Tag traps a Grass active with all slots at 0 PP", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ opponentAbility: ABILITY_SHADOW_TAG }),
    )).toBe(true);
  });

  it("two-phase agreement: the shared trap gate forbids the exact row pickWinningSwitchRow would otherwise pick under forcedStruggle", () => {
    const rules = trapContext({ opponentAbility: ABILITY_SHADOW_TAG });
    const NORMAL: readonly [string, string] = ["TYPE_NORMAL", "TYPE_NORMAL"];
    const bench = [
      { row: 1 as const, fainted: false, active: false, moveIds: [33, 0, 0, 0], movePp: [35, 0, 0, 0], types: NORMAL, hp: 10, maxHp: 100 },
    ];
    // Proves the disagreement this regression exhibited: on its own,
    // pickWinningSwitchRow (mirroring test (a) above) picks row 1 even
    // though the party screen can never legally accept it while trapped.
    expect(pickWinningSwitchRow({
      activeMoveIds: [0, 0, 0, 0],
      activeLegalSlots: [false, false, false, false],
      defenderTypes: NORMAL,
      bench,
      healthyCount: 2,
      alreadySwitchedAgainstThisOpponent: true,
      forcedStruggle: true,
    })).toBe(1);
    // `computeSwitchRow`'s actual gate: check the shared predicate first and
    // skip `pickWinningSwitchRow` entirely when trapped, so no row is ever
    // proposed -- agreeing with the party screen's own refusal.
    const row = isPlayerVoluntarySwitchTrapped(rules)
      ? null
      : pickWinningSwitchRow({
        activeMoveIds: [0, 0, 0, 0],
        activeLegalSlots: [false, false, false, false],
        defenderTypes: NORMAL,
        bench,
        healthyCount: 2,
        alreadySwitchedAgainstThisOpponent: true,
        forcedStruggle: true,
      });
    expect(row).toBeNull();
  });

  it("not trapped when the opponent has no trapping ability (carry-14 seeds 116/418 shape)", () => {
    expect(isPlayerVoluntarySwitchTrapped(trapContext())).toBe(false);
  });

  it("own WRAPPED_MASK status2 traps regardless of the opponent", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ activeStatus2: STATUS2_WRAPPED }),
    )).toBe(true);
  });

  it("own ESCAPE_PREVENTION status2 (Mean Look/Block) traps regardless of the opponent", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ activeStatus2: STATUS2_ESCAPE_PREVENTION }),
    )).toBe(true);
  });

  it("own ROOTED status3 (Ingrain) traps regardless of the opponent", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ activeStatus3: STATUS3_ROOTED }),
    )).toBe(true);
  });

  it("Arena Trap traps a grounded active", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ opponentAbility: ABILITY_ARENA_TRAP }),
    )).toBe(true);
  });

  it("Arena Trap does NOT trap a Flying-type active", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ opponentAbility: ABILITY_ARENA_TRAP, activeTypes: FLYING }),
    )).toBe(false);
  });

  it("Arena Trap does NOT trap a Levitate active", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ opponentAbility: ABILITY_ARENA_TRAP, activeAbility: ABILITY_LEVITATE }),
    )).toBe(false);
  });

  it("Magnet Pull traps a Steel-type active but not a non-Steel active", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ opponentAbility: ABILITY_MAGNET_PULL, activeTypes: STEEL }),
    )).toBe(true);
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ opponentAbility: ABILITY_MAGNET_PULL }),
    )).toBe(false);
  });

  it("a fainted/absent opponent never traps, even with a trapping ability", () => {
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ opponentAbility: ABILITY_SHADOW_TAG, opponentHp: 0 }),
    )).toBe(false);
    expect(isPlayerVoluntarySwitchTrapped(
      trapContext({ opponentAbility: ABILITY_SHADOW_TAG, absentBattlerFlags: 1 << 1 }),
    )).toBe(false);
  });
});

describe("ISSUES #104 (driver): continuous-play outcome semantics retuned -- OK = frame budget reached while progressing, HANG = no progress for stallFrames", () => {
  // The engine half (4ca688b7) made the terminal record prompt's YES and
  // B-cancel answers continue exactly like NO, so a decided round now
  // ALWAYS re-chains into a fresh draft almost immediately -- the old
  // per-round grace timer's own expiry-HANG branch (PROGRESS ~1367's
  // seeds 328/34 pins, now retargeted below) is dead: master's own
  // consequence is that a continuous-play run never stops on its own
  // (`lobbyFreeRoam` is unreachable under the generated-orchestrator
  // route), so every seed used to run to `maxFrames` and get reported HANG
  // even while actively, honestly playing the whole time. Generic stall
  // detection (any of round identity, `battleIndex`, the player's turn
  // counter, the input-owning surface, or the decided-round phase going
  // `stallFrames` frames without moving) replaces it.
  it("(a) stall detection fires on the first frame with zero progress, and does not false-positive at the default window", () => {
    // stallFrames: 1 is the cheapest exact trip: frame 1 always "progresses"
    // (the surface baseline starts empty), so frame 2 -- the first frame
    // whose progress signals are unchanged from frame 1 -- is caught
    // immediately, deterministically, regardless of seed/policy.
    const stalled = runSeed(0, {
      policy: "winning",
      stallFrames: 1,
      maxFrames: 5_000,
      renderEvery: 0,
    });
    expect(stalled.outcome).toBe("HANG");
    expect(stalled.hangSurface).toBeTruthy();
    expect(stalled.frames).toBeLessThanOrEqual(3);

    // Positive control: the same seed at the DEFAULT stall window
    // (30_000) never gets close to stalling within a much smaller budget --
    // ordinary draft/battle/postwin play moves at least one progress
    // signal many times a second.
    const control = runSeed(0, {
      policy: "winning",
      maxFrames: 10_000,
      renderEvery: 0,
    });
    expect(control.outcome).not.toBe("HANG");
  });

  it("(b) a winning seed genuinely chains through >= 2 full round wins (carry >= 14), reported OK once --max-rounds is reached", () => {
    // Seed 34 winning: PROGRESS ~1367 found this seed reaches carry 14 --
    // TWO chained round wins, i.e. two separate decide -> continue ->
    // re-chain cycles -- well before its own eventual terminal dead-end
    // (now fixed). `maxRounds: 3` is a cheap, deterministic bound: it stops
    // right after the 3rd round decision instead of running to a multi-
    // hundred-thousand-frame budget, and is comfortably past the 2 wins
    // needed to prove carry >= 14 was genuinely reached, not just claimed.
    // thr153: ISSUES #141a (the THRASH lock-in re-run) leaves seed 34 at
    // carry 7; re-scanned seeds 0..10 / 34..44 under the same options:
    // seeds 1, 3 and 40 chain two round wins, so the lowest (1) is pinned.
    // fsw235 (the forced party menu's ROM cursor model + the policies' random
    // party-menu walks, which "winning" also explores): seed 1 now loses its
    // first round; re-scanned seeds 0..39: seeds 3, 13, 20 and 34 chain two
    // round wins, so the lowest (3) is pinned.
    // pmo239 (the party menus list rows in the ROM's battle order, so the soak's UI-faithful row walks pick different mons): seed 3
    // now carries 7; re-scanned seeds 0..12: only seed 2 chains two round wins (carry 14), so it is pinned.
    // parity-mac (docs/parity-mac/STATUS.md "Re-pins"): the battle-rule fixes of that lane move every trajectory; seed 2 now carries 7.
    // Re-scanned seeds 0..30 under the same options: seeds 0, 10, 16, 17 and 19 chain two round wins, so the lowest (0) is pinned.
    // lbr-d1 (a won round now returns to the Lobby and the draft is dealt from the Lobby's live cursor at the attendant, with the
    // streak kept): seed 0 now carries 7; re-scanned seeds 0..23 under the same options: seeds 10 and 13 chain two round wins
    // (carry 14), so the lowest (10) is pinned.
    // lbr-e (the attendant hand-off walks the PreBattleRoom entry and deals after the walk): seed 10 now carries 7; re-scanned seeds 0..39
    // under the same options: seeds 16, 19 and 35 chain two round wins (carry 14), so the lowest (16) is pinned.
    // hie1 (the held-item effect presented: every Leftovers / berry print moves later, so the soak's random presses land differently):
    // seed 16 now carries 7; re-scanned seeds 0..80 under the same options: seeds 47, 50, 61 and 70 chain two round wins (carry 14),
    // so the lowest (47) is pinned.
    // lbr-g (#221 E1-E3, the Lobby cursor is the ROM's): seed 47 now carries 7; re-scanned seeds 0..54 under the same options: seeds 13, 16, 36
    // and 40 chain two round wins (carry 14), so the lowest (13) is pinned.
    // hpd5 (measured on the hpd4 tip f40209793: seed 13 carries 7 there too; the floor-free foe-hit hold shifts the soak's press phases): re-scanned seeds 0..31 under the same options
    // (tools/soak/randomRoundSoak.ts --policy winning --max-rounds 3 --render-every 0): only seed 4 chains two round wins (carry 14), so it is pinned.
    // ais4 (the opponent faint replacement's send-in runs the AI timeline, +2 frames per replacement): seed 4 now carries 7; re-scanned seeds 0..10 under the same options: only seed 2 chains two round wins (carry 14), so it is pinned.
    // ais4 merged onto lbw8 + hpd8 (master 26477cf4b; ais4 was pinned without them): seed 2 now carries 7; re-scanned seeds 0..23 under the same options: only seed 14 chains two round wins (carry 14), so it is pinned.
    // hpf1 (floor-free hit -> message / faint-chain / turn-end hp commands): seed 14 now carries 7; re-scanned seeds 0..39 under the same options: seeds 0, 2, 23, 27 and 36 chain two round wins (carry 14), so the lowest (0) is pinned.
    // merge of the box's 2026-11-18 run with the Mac's fixes 44-51: seed 0 now carries 7; re-scanned seeds 0..39 under the same options: seeds 13, 14 and 19 chain two round wins (carry 14), so the lowest (13) is pinned.
    // pau4 (the battle-start entry scripts presented, so the soak's random presses land differently): seed 13 now carries 7; re-scanned seeds 0..39 under the same options
    // (tools/soak/randomRoundSoak.ts --policy winning --max-rounds 3 --render-every 0): seeds 4, 14 and 19 chain two round wins (carry 14), so the lowest (4) is pinned.
    // btn1 (gated battle strings wait for a new A / B press): seed 4 now carries 7; re-scanned seeds 0..29 under the same options (tools/soak/randomRoundSoak.ts --policy winning --max-rounds 3 --render-every 0 --seeds 0:30 --parallel 3):
    // only seed 13 chains two round wins (carry 14), so it is pinned.
    // pau5 (the mid-battle Intimidate / Trace switch-in scripts presented): seed 13 now carries 7; re-scanned seeds 0..159 under the same options (tools/soak/randomRoundSoak.ts --policy winning --max-rounds 3 --render-every 0 --seeds 0:160 --parallel 3):
    // seeds 47, 63, 70, 97, 102, 106 ... chain two round wins (carry 14; none in 0..39), so the lowest (47) is pinned.
    // merge of pau4 / btn1 / pau5 / hpf5 (pin1; hpf5's tick / wrap / weather / Substitute hp lengths shift the soak's press phases): seed 47 still carries 14, but lower seeds now do too; re-scanned seeds 0..49
    // under the same options (tools/soak/randomRoundSoak.ts --policy winning --max-rounds 3 --render-every 0 --seeds 0:50 --parallel 3): seeds 14, 17, 27 and 47 chain two round wins (carry 14), so the lowest (14) is pinned.
    // pic6 + pic8 (the battle party menu's cancel fade and the forced menu's earlier clock shift the soak's press phases): seed 14 now carries 7; re-scanned seeds
    // 0..49 under the same options: seeds 10, 17, 27 and 47 chain two round wins (carry 14), so the lowest (10) is pinned.
    // trp1 (the end-of-turn trap animation's 68 .. 110 Scene ON / 35 Scene OFF rows shift the soak's press phases): seed 10 now carries 7;
    // re-scanned seeds 0..49 under the same options: seeds 13, 27 and 47 chain two round wins (carry 14), so the lowest (13) is pinned.
    // merge of flow1 + trp1 (flow1's move cursor reset after a switch-in moves the soak's fight presses as well): seed 13 now carries 7;
    // re-scanned seeds 0..49 under the same options (--seeds 0:50 --parallel 4): seeds 19 and 47 chain two round wins (carry 14), so the lowest (19) is pinned.
    // hcr1b (the Scene OFF used-move glyph at commit + 7 + u): seed 19 now carries 7; re-scanned seeds 0..49 under the same options (--seeds 0:50 --parallel 4):
    // seeds 0, 10, 14 and 47 chain two round wins (carry 14), so the lowest (0) is pinned.
    // lbw9 (the Lobby save wait is a timer / held A, the menus clamp: every in-game new challenge is dealt from a later cursor): seed 0 now carries 7;
    // re-scanned seeds 0..49 under the same options (--seeds 0:50 --parallel 3): seeds 13, 19, 23 and 40 chain two round wins (carry 14), so the lowest (13) is pinned.
    // fsc1 (the Scene OFF invisible-target hit completes in 2 frames, the hit-all loop's EMPTYSTRING3 box is timed by kernel rows): seed 13 now carries 7;
    // re-scanned seeds 0..49 under the same options (--seeds 0:50 --parallel 3): seeds 19, 23 and 40 chain two round wins (carry 14), so the lowest (19) is pinned.
    // fop1 (a new challenge's first opponent is rolled in the ROM's order, so round 2's first trainer moves): seed 19 now carries 7;
    // re-scanned seeds 0..49 under the same options (--seeds 0:50 --parallel 4): seeds 13, 14 and 23 chain two round wins (carry 14), so the lowest (13) is pinned.
    // merge of the box's 2026-11-20 run with the Mac's 11-21 fixes: the merge kept the box's 19 (after fsc1); it chains two round wins on the merged tree (this test passes), so it stays.
    // wtl1 (the win tail holds 24 more rows before "Player defeated", ROM P + 26): seed 19 now carries 7; re-scanned seeds 0..49 under the same options (--seeds 0:50 --parallel 4):
    // seeds 0, 10, 13, 17, 40, 47 and 49 chain two round wins (carry 14), so the lowest (0) is pinned.
    const result = runSeed(0, {
      policy: "winning",
      maxRounds: 3,
      renderEvery: 0,
    });
    expect(result.outcome).toBe("OK");
    expect(result.endState).toBe("max-rounds");
    expect(result.maxCarriedWinStreak).toBeGreaterThanOrEqual(14);
  });
});

describe("ROADMAP S10 soak semantics: the milestone modes follow the same OK/HANG rule as continuous play", () => {
  // 2026-08-24 defect: `stopAtFirstRoundDecision` `continue`d past the
  // generic in-loop stall check and then returned HANG unconditionally at
  // budget exhaustion ("neither milestone was ever reached"), so a first
  // round that never decides but keeps genuinely progressing was reported
  // `HANG ... stuck at resolution:presenting`. The concrete class is
  // ISSUES #123's proven-not-an-engine-bug stalemate (all PP spent, forced
  // Struggle vs Struggle at +6/+6 evasion against Leftovers/Ingrain
  // regeneration, no Gen-3 turn cap): seeds 116/418 at `--policy winning
  // --vary-rng --first-round --start-carry 14` advance a turn every ~600
  // frames right up to the 1,000,000-frame budget, and the SAME stalemate
  // without `--first-round` already read `OK ... budget`. HANG means stuck,
  // never merely undecided.
  it("(a) --first-round + budget reached while still progressing is OK/\"budget\", not HANG", () => {
    // Seed 0 "winning" needs far more than 5,000 frames to decide its first
    // round (its own pins above settle in the tens of thousands), so this
    // budget lands mid-round with every progress signal still moving --
    // exactly the shape seeds 116/418 hold for a million frames, at ~0.1s
    // instead of ~25s.
    const result = runSeed(0, {
      policy: "winning",
      stopAtFirstRoundDecision: true,
      maxFrames: 5_000,
      renderEvery: 0,
    });
    expect(result.outcome).toBe("OK");
    expect(result.endState).toBe("budget");
    // The snapshot is the final frame's, exactly as continuous play reports
    // it (`seed 116 OK b2 t1699 1000000f ... budget`).
    expect(result.frames).toBe(5_000);
    expect(result.hangSurface).toBeUndefined();
  });

  it("(b) --first-round still reports HANG on a genuine zero-progress stall, from inside the loop", () => {
    // Same cheapest-exact-trip construction as the ISSUES #104 pin above:
    // `stallFrames: 1` makes frame 2 -- the first frame whose progress
    // signals are unchanged -- the stall, so the HANG lands ~3 frames in,
    // three orders of magnitude short of the budget. Before the fix this
    // mode had no in-loop stall check at all and could only ever HANG by
    // exhausting `maxFrames`.
    const stalled = runSeed(0, {
      policy: "winning",
      stopAtFirstRoundDecision: true,
      stallFrames: 1,
      maxFrames: 5_000,
      renderEvery: 0,
    });
    expect(stalled.outcome).toBe("HANG");
    expect(stalled.hangSurface).toBeTruthy();
    expect(stalled.frames).toBeLessThanOrEqual(3);
  });

  it("(c) --milestone shares the rule: a budget reached while progressing is OK/\"budget\", and the milestone pins still fail on it", () => {
    // `stopAtFirstActionMenu` sat in the same post-loop branch, and nothing
    // pinned its budget exhaustion as HANG, so it gets the same semantics:
    // "the action menu never arrived" is not evidence of a stall by itself.
    // The mode's own target stays readable from `endState` -- 500 frames is
    // well short of the ~1.4-1.6k-frame draft->intro route, so the
    // milestone pins above (which assert endState
    // "milestone:first-action-menu") would still fail here.
    const result = runSeed(0, {
      policy: "winning",
      stopAtFirstActionMenu: true,
      maxFrames: 500,
      renderEvery: 0,
    });
    expect(result.outcome).toBe("OK");
    expect(result.endState).toBe("budget");
    expect(result.endState).not.toBe("milestone:first-action-menu");
  });
});

// Fabricates only the fields RandomPlayer.trackProgress reads
// (round.rules.battleIndex, config.id, battleCommandPresentation.request.
// requestId) -- a mechanism-level probe of the driver's own bookkeeping, not
// a claim the engine can reach this exact shape.
function fakeOrchestratorState(
  battleIndex: number,
  roundId: string,
  requestId: string,
): EngineState {
  return {
    factoryRoundBattleOrchestrator: {
      round: { rules: { battleIndex } },
      config: { id: roundId },
      battleCommandPresentation: { request: { requestId } },
    },
  } as unknown as EngineState;
}

describe("Papercuts: soak driver resets per-battle labels/policy state on round identity, not just battleIndex", () => {
  it("a round lost at battle 1 followed by the next round's battle 1 resets the turn label to 1 and clears the switched-set", () => {
    const player = new RandomPlayer(new Rng(1), undefined as any, "vanilla");

    // Round 1, battle 1 (battleIndex 0): three distinct turns tick by, and
    // the "winning" ping-pong guard records a switch against opponent 5.
    (player as any).trackProgress(fakeOrchestratorState(0, "round-1", "r1-turn-a"));
    (player as any).trackProgress(fakeOrchestratorState(0, "round-1", "r1-turn-b"));
    (player as any).trackProgress(fakeOrchestratorState(0, "round-1", "r1-turn-c"));
    expect(player.turn).toBe(3);
    (player as any).switchedAgainstOpponentIndices.add(5);

    // Round 2's battle 1 is ALSO battleIndex 0 -- the case a plain
    // battleIndex-change check misses.
    (player as any).trackProgress(fakeOrchestratorState(0, "round-2", "r2-turn-a"));

    expect(player.turn).toBe(1);
    expect((player as any).switchedAgainstOpponentIndices.has(5)).toBe(false);
    expect((player as any).switchedAgainstOpponentIndices.size).toBe(0);
  });
});

describe("--start-carry (opt-in: boot the first chained round from a carried win streak)", () => {
  it("0 (or omitted) is byte-identical to createInitialState()", () => {
    expect(createStartCarryState(0)).toEqual(createInitialState());
  });

  it("rejects anything that isn't a multiple of 7 in 0..49", () => {
    expect(() => validateStartCarry(28)).not.toThrow();
    expect(() => validateStartCarry(49)).not.toThrow();
    expect(() => validateStartCarry(1)).toThrow(/bad --start-carry/);
    expect(() => validateStartCarry(-7)).toThrow(/bad --start-carry/);
    expect(() => validateStartCarry(56)).toThrow(/bad --start-carry/);
    expect(() => validateStartCarry(7.5)).toThrow(/bad --start-carry/);
    expect(() => createStartCarryState(50)).toThrow(/bad --start-carry/);
  });

  it("28 boots the first orchestrator at factoryWinStreak 28, first opponent generated at challengeNum 4", () => {
    const result = runSeed(0, {
      policy: "winning",
      stateFactory: () => createStartCarryState(28),
      stopAtFirstActionMenu: true,
      collectDiagnostics: true,
      renderEvery: 0,
    });
    expect(result.outcome).toBe("OK");
    expect(result.diagnostics?.carriedWinStreak).toBe(28);
    expect(result.diagnostics?.firstOpponentChallengeNum).toBe(4);
  });

  it("42 boots the first orchestrator at factoryWinStreak 42 -- its OWN 7th battle is NOT the brain, precisely because gold was already earned crossing streak 41 inside the round that carries 35 -> 42, not the round that starts AT 42", () => {
    const result = runSeed(0, {
      policy: "winning",
      stateFactory: () => createStartCarryState(42),
      stopAtFirstActionMenu: true,
      collectDiagnostics: true,
      renderEvery: 0,
    });
    expect(result.outcome).toBe("OK");
    expect(result.diagnostics?.carriedWinStreak).toBe(42);
    expect(result.diagnostics?.firstOpponentChallengeNum).toBe(6);
    // A round starting at carry 42 already has both symbols banked
    // (factorySymbolsCountForStartCarry: >= 42 -> 2), so every one of its 7
    // battles (battleIndex 0..6, winStreak 42..48) checks the gold-plus
    // "streak-long" branch, which only trips at +21 multiples past 42 (63,
    // 84, ...) -- none of which this round reaches.
    for (let battleIndex = 0; battleIndex <= 6; battleIndex += 1) {
      expect(
        getFactoryFrontierBrainStatus({
          battleMode: "singles",
          winStreak: 42 + battleIndex,
          symbolsCount: 2,
        }),
      ).toBe("not-ready");
    }
    // Contrast: the round that actually carries the streak from 35 up to 42
    // hits gold on ITS OWN 7th battle (battleIndex 6, winStreak 41, only
    // one symbol banked yet) -- that round is `--start-carry 35`, not 42.
    expect(
      getFactoryFrontierBrainStatus({
        battleMode: "singles",
        winStreak: 35 + 6,
        symbolsCount: 1,
      }),
    ).toBe("gold");
  });
});
