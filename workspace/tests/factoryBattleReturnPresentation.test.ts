// Slice 1 of docs/post-terminal-return-to-lobby-ground-truth.md §5: the
// 108-tick shared return-to-field span (dismiss+8 -> dismiss+115) is one
// outcome-agnostic mechanism -- the same `postwinPhase` machine and the same
// `elapsed` starting convention serve both a WIN round
// (`createPostwinStateFromRound`) and a LOSS/roundCompleted round
// (`createBattleReturnHoldState`), with no WIN/LOSS branch inside the
// mechanism itself. These pins are dismiss-relative: `elapsed` is 1 on the
// tick `finishBattle` completes (dismiss+2, per the two-tick real dismiss
// press docs/terminal-seam-win-window-probe.md §5 cites -- one tick later
// than the canonical Turn17 route's own one-tick press), so
// `dismissOffset = elapsed + 1` throughout.
import { describe, expect, it } from "vitest";
import type { BattleParty } from "../src/engine/battleScenario.ts";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  createGeneratedFactoryRoundController,
  resolveRoundBattle,
} from "../src/engine/roundController.ts";
import type { BattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender.ts";
import {
  advancePostwin,
  createBattleReturnHoldState,
  createPostwinStateFromRound,
  postwinPhase,
  POSTWIN_BATTLE_BLACK_AGE,
  POSTWIN_BATTLE_FADE_FIRST_AGE,
  POSTWIN_BATTLE_ROOM_FIRST_AGE,
  POSTWIN_COUNTER_ROOM_FIRST_AGE,
  POSTWIN_SECOND_BLACK_AGE,
  type PostwinState,
} from "../src/engine/postwin.ts";
import {
  fastFadeUpdatesForLocalTick,
} from "../src/engine/battleScene.ts";

const FROZEN_VIEW = {} as unknown as BattleResolutionPresentationRenderView;

function winRoundPostwin(): PostwinState {
  const generated = generateFactoryOpponent({
    rngValue: 3,
    factoryWinStreak: 0,
    battleIndex: 0,
    storedTrainerIds: [],
    savedRentalSetIds: [110, 155, 140, 168, 197, 147],
    playerTrainerId: 0x1234_5678,
    battleTowerLevel50WinStreak: 0,
  });
  const battleParty = (prefix: string): BattleParty =>
    generated.party.map((member, index) => ({
      id: `${prefix}-${index}`,
      species: member.speciesName,
      maxHp: member.maxHP,
      hp: member.hp,
      status: "none" as const,
    })) as unknown as BattleParty;
  let round = createGeneratedFactoryRoundController({
    id: "slice1-shared-return-win",
    playerParty: battleParty("player"),
    playerRentalRecords: generated.opponents,
    opponent: {
      id: "slice1-shared-return-opponent",
      trainerName: generated.trainerName,
      party: battleParty("opponent"),
      rentalRecords: generated.opponents,
    },
    rngValue: generated.rngValue,
  });
  round = completeBattlePresentation(round, {
    commandId: round.presentation!.command.commandId,
  });
  round = advanceRoundController(round);
  round = resolveRoundBattle(round, {
    outcome: "win",
    playerParty: round.rules.playerParty,
    opponentParty: round.rules.currentOpponent.party,
    rngValue: round.rules.rngValue,
  });
  return createPostwinStateFromRound(round, FROZEN_VIEW);
}

describe("slice 1: shared 108-tick return-to-field span (dismiss+8 -> dismiss+115)", () => {
  it("starts both a WIN round and a LOSS/roundCompleted round's shared state at the same elapsed convention", () => {
    const win = winRoundPostwin();
    const loss = createBattleReturnHoldState(FROZEN_VIEW);
    expect(win.elapsed).toBe(1);
    expect(loss.elapsed).toBe(1);
    expect(win.elapsed).toBe(loss.elapsed);
  });

  it("pins every doc-cited sub-span boundary (dismiss-relative) through postwinPhase, the one shared phase machine", () => {
    // docs/post-terminal-return-to-lobby-ground-truth.md §3, dismissOffset = age + 1.
    const boundaries: ReadonlyArray<readonly [number, string]> = [
      [2, "battleHold"], // dismiss+2: quote still held
      [7, "battleHold"], // dismiss+7: last held tick
      [8, "battleFade"], // dismiss+8: 30-tick fade to black starts
      [37, "battleFade"], // dismiss+37: last fade tick
      [38, "blackAfterBattle"], // dismiss+38: black hold starts
      [57, "blackAfterBattle"], // dismiss+57: last black-before-room tick
      [58, "battleRoom"], // dismiss+58: battle-room fade-in starts
      [96, "battleRoom"], // dismiss+96: last battle-room tick
      [97, "blackBeforeCounter"], // dismiss+97: second black hold starts
      [115, "blackBeforeCounter"], // dismiss+115: last in-scope tick (this slice's own bound)
      [116, "counterRoom"], // dismiss+116: OUT of this slice -- destination diverges here
    ];
    for (const [dismissOffset, expectedPhase] of boundaries) {
      const age = dismissOffset - 1;
      expect(postwinPhase(age), `dismiss+${dismissOffset} (age ${age})`).toBe(expectedPhase);
    }
    // Same numbers, restated as the exported age constants this mechanism
    // pins them to -- if any of these ever drift, the table above must move
    // with them (and so must the ground-truth doc).
    expect(POSTWIN_BATTLE_FADE_FIRST_AGE).toBe(7);
    expect(POSTWIN_BATTLE_BLACK_AGE).toBe(37);
    expect(POSTWIN_BATTLE_ROOM_FIRST_AGE).toBe(57);
    expect(POSTWIN_SECOND_BLACK_AGE).toBe(96);
    expect(POSTWIN_COUNTER_ROOM_FIRST_AGE).toBe(115);
  });

  it("advances a WIN and a LOSS/roundCompleted state through the identical phase sequence, tick for tick, through dismiss+115 (no WIN/LOSS branch)", () => {
    let win = winRoundPostwin();
    let loss = createBattleReturnHoldState(FROZEN_VIEW);
    const phases: string[] = [];
    for (let dismissOffset = 2; dismissOffset <= 115; dismissOffset += 1) {
      expect(win.elapsed, `dismiss+${dismissOffset}`).toBe(loss.elapsed);
      const winPhase = postwinPhase(win.elapsed);
      expect(winPhase, `dismiss+${dismissOffset}`).toBe(postwinPhase(loss.elapsed));
      phases.push(winPhase);
      win = advancePostwin(win);
      loss = advancePostwin(loss);
    }
    // The full 114-tick phase sequence lands on every sub-span this slice
    // claims, in order, with the exact doc-cited durations.
    expect(phases.filter((p) => p === "battleHold")).toHaveLength(6);
    expect(phases.filter((p) => p === "battleFade")).toHaveLength(30);
    expect(phases.filter((p) => p === "blackAfterBattle")).toHaveLength(20);
    expect(phases.filter((p) => p === "battleRoom")).toHaveLength(39);
    expect(phases.filter((p) => p === "blackBeforeCounter")).toHaveLength(19);
    expect(phases).toHaveLength(114);
  });

  it("pins the BeginFastPaletteFade(3) BG/OBJ update schedule the battleFade phase renders with", () => {
    // docs/post-terminal-return-to-lobby-ground-truth.md §3(1); oracle-
    // confirmed per-tick against win-terminal-window-off frames 5018-5029
    // this session (BG updates every tick, OBJ every other tick, both
    // starting from the same first fade tick).
    expect(fastFadeUpdatesForLocalTick(1)).toEqual({ bgUpdates: 1, objUpdates: 1 });
    expect(fastFadeUpdatesForLocalTick(2)).toEqual({ bgUpdates: 2, objUpdates: 1 });
    expect(fastFadeUpdatesForLocalTick(3)).toEqual({ bgUpdates: 2, objUpdates: 2 });
    expect(fastFadeUpdatesForLocalTick(30)).toEqual({ bgUpdates: 16, objUpdates: 15 });
  });
});
