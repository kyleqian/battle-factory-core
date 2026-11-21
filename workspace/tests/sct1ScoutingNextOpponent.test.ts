// sct1 (docs/sct1-scouting-next-opponent.md): the attendant's report after a win describes the NEXT opponent, the one `AskSwapMon`
// rolls at the GO ON answer (pre-battle room scripts.inc:137-144), and before battle 21 / 42 the Factory Head's call scene plays instead,
// chosen from the battle number (`frontier_getbrainstatus`, scripts.inc:54-80) -- it used to read the trainer just beaten for both.
//
// Each case reaches a real postwin through the production tick path (the soak driver's strong-route player plays the battle; core
// creates the postwin), then presses through the room itself: A on every other frame, B (NO) on the swap offer.

import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import type { GbaButton } from "../src/input.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import { createFactoryCorpusParty, createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { getFactoryOpponentCommentary } from "../src/engine/factoryCommentary.ts";
import {
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
  factoryRoundNextBattleBrainStatus,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  CALL_SCENE_BOX_TEXTS,
  INITIAL_POSTWIN_STATE,
  POSTWIN_BRAIN_CANT_TELL_TEXT,
  POSTWIN_SCOUTING_INPUT_READY_DELAYS,
  POSTWIN_SCOUTING_LINES,
  POSTWIN_SCOUTING_LINES_BEFORE_ROLL,
  postwinDialogueInputReady,
  postwinDialogueVisibleChars,
  postwinScoutingInputReadyDelay,
  type PostwinState,
} from "../src/engine/postwin.ts";
import { MUS_HEAL, POKENAV_CALL_AFTER_HEAL_FANFARE, SE_POKENAV_CALL } from "../src/engine/screenSounds.ts";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";
import type { SoakCoverageCollector } from "../tools/soak/randomRoundSoakCoverage.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

/** The soak tests' strong trio (randomRoundSoak.test.ts `strongRouteRecord`). */
function strongRouteRecord(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 31, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

function liveRoundState(rngValue: number, factoryWinStreak: number): EngineState {
  const playerRentalRecords = [strongRouteRecord(664), strongRouteRecord(678), strongRouteRecord(527)] as const;
  const orchestrator = beginFactoryRoundBattleStartIntro(
    createFactoryRoundBattleOrchestrator({
      id: `sct1-${rngValue}-${factoryWinStreak}`,
      rngValue,
      factoryWinStreak,
      playerTrainerId: PLAYER_TRAINER_ID,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords,
        savedRentalRecords: [...playerRentalRecords, strongRouteRecord(1), strongRouteRecord(2), strongRouteRecord(3)],
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

class Captured extends Error {}

/** Plays the round's first battle with the soak driver's strong-route player; returns the first tick core has created the postwin on. */
function firstPostwin(rngValue: number, factoryWinStreak: number): EngineState {
  let captured: EngineState | null = null;
  const observer = {
    beginSeed: () => {},
    recordPlayerFightCommit: () => {},
    observe: (state: EngineState) => {
      if (captured === null && state.postwin !== null && state.factoryRoundBattleOrchestrator?.round.rules.phase === "presentingBattleWin") {
        captured = state;
        throw new Captured();
      }
    },
  } as unknown as SoakCoverageCollector;
  const result = runSeed(rngValue, {
    testPolicy: "strong-route",
    policy: "winning",
    stateFactory: () => liveRoundState(rngValue, factoryWinStreak),
    maxFrames: 30_000,
    renderEvery: 0,
    coverage: observer,
  });
  if (captured === null) throw new Error(`no postwin reached: ${result.outcome} ${result.errorMessage ?? ""}`);
  const id = (captured as EngineState).factoryRoundBattleOrchestrator!.config.id;
  if (id !== `sct1-${rngValue}-${factoryWinStreak}`) throw new Error(`the staged round was lost (postwin of ${id})`);
  return captured;
}

const A: ReadonlySet<GbaButton> = new Set(["A"]);
const B: ReadonlySet<GbaButton> = new Set(["B"]);
const NONE: ReadonlySet<GbaButton> = new Set();

type Step = Readonly<{ before: EngineState; after: EngineState; events: readonly SoundEvent[] }>;

/** Presses through the postwin (A every other frame; B, NO, on the swap offer) up to the tick the swap offer's NO is taken. */
function pressThroughPostwin(start: EngineState, maxTicks = 4_000): Step[] {
  const steps: Step[] = [];
  let state = start;
  for (let i = 0; i < maxTicks; i += 1) {
    const postwin = state.postwin;
    if (postwin === null || postwin.swapDeclineElapsed !== null) break;
    const buttons = i % 2 === 1 ? NONE : postwin.dialoguePage === 4 && postwin.swapCursorPos !== null ? B : A;
    const { result, events } = collectSoundTick(state.frame + 1, () => tick(state, buttons));
    steps.push({ before: state, after: result, events });
    state = result;
  }
  return steps;
}

function pageLines(postwin: PostwinState, page: 2 | 3): readonly [string, string] {
  return postwin.scoutingLines[page - 1]!;
}

describe("sct1: the scouting report after a win names the next opponent", () => {
  it("fills pages 2 and 3 at the GO ON answer from the opponent rolled there, which is the one fought next, not the one beaten", () => {
    // rngValue 1: the beaten trainer and the next one differ in both lines (a scan of 1..40: 14 such seeds), and the next one's pages
    // are not the canonical lengths ("...WATER type." 67 characters, "...free-spirited and unrestrained." 70).
    const postwin0 = firstPostwin(1, 0);
    const beaten = postwin0.factoryRoundBattleOrchestrator!.round.rules.currentOpponent;
    expect(postwin0.postwin!.frontierBrain).toBe(false);
    expect(postwin0.postwin!.scoutingLines).toEqual(POSTWIN_SCOUTING_LINES_BEFORE_ROLL);

    const steps = pressThroughPostwin(postwin0);
    const goOn = steps.find((step) => step.before.postwin!.dialoguePage === 0 && step.after.postwin!.dialoguePage === 1)!;
    expect(goOn).toBeDefined();
    // Up to the GO ON answer no opponent is rolled and nothing reads the pages.
    for (const step of steps.slice(0, steps.indexOf(goOn))) {
      expect(step.after.postwin!.scoutingLines).toEqual(POSTWIN_SCOUTING_LINES_BEFORE_ROLL);
      expect(step.after.factoryRoundBattleOrchestrator!.pendingNextOpponent).toBeNull();
    }
    const rolled = goOn.after.factoryRoundBattleOrchestrator!.pendingNextOpponent!;
    expect(rolled).not.toBeNull();
    if (rolled.kind !== "ordinary") throw new Error("expected an ordinary trainer rolled at the GO ON");
    const next = getFactoryOpponentCommentary(createFactoryCorpusParty(rolled.generation.opponents));
    const old = getFactoryOpponentCommentary(createFactoryCorpusParty(beaten.rentalRecords!));
    expect(next.favoriteTypeLines).not.toEqual(old.favoriteTypeLines);
    expect(next.battleStyleLines).not.toEqual(old.battleStyleLines);

    const page2 = steps.find((step) => step.after.postwin!.dialoguePage === 2)!.after.postwin!;
    const page3 = steps.find((step) => step.after.postwin!.dialoguePage === 3)!.after.postwin!;
    expect(pageLines(page2, 2)).toEqual(next.favoriteTypeLines);
    expect(pageLines(page3, 3)).toEqual(next.battleStyleLines);
    expect(page3.scoutingLines[0]).toEqual(POSTWIN_SCOUTING_LINES[0]);
    expect(page3.scoutingLines[3]).toEqual(POSTWIN_SCOUTING_LINES[3]);

    // Each page takes A from its last character + 3 (MSGBOX_DEFAULT), whatever its length.
    for (const page of [2, 3] as const) {
      const lines = pageLines(page3, page);
      const accepted = steps.find((step) => step.before.postwin!.dialoguePage === page && step.after.postwin!.dialoguePage === page + 1)!;
      const delay = accepted.before.postwin!.elapsed + 1 - accepted.before.postwin!.dialoguePageEdgeElapsed!;
      expect(delay).toBeGreaterThanOrEqual(postwinScoutingInputReadyDelay(lines));
      expect(delay).toBeLessThanOrEqual(postwinScoutingInputReadyDelay(lines) + 1);
    }

    // The swap offer answered NO publishes that same opponent as the next battle's.
    const last = steps.at(-1)!.after;
    const fought = last.factoryRoundBattleOrchestrator!.round.rules.currentOpponent;
    expect(fought.rentalRecords).toEqual(rolled.generation.opponents);
    expect(fought.trainerName).toBe(rolled.generation.trainerName);
    expect(last.factoryRoundBattleOrchestrator!.round.rules.battleIndex).toBe(1);
  });

  it("a page's accept delay follows its own text: last character + 3 (the canonical [72, 74, 72] are its 66 / 68 / 66 characters)", () => {
    expect(POSTWIN_SCOUTING_INPUT_READY_DELAYS).toEqual([72, 74, 72]);
    const electric = ["The TRAINER is apparently skilled", "in the handling of the ELECTRIC type."] as const; // 70 characters
    const state: PostwinState = {
      ...INITIAL_POSTWIN_STATE,
      scoutingLines: [POSTWIN_SCOUTING_LINES[0], electric, POSTWIN_SCOUTING_LINES[2], POSTWIN_SCOUTING_LINES[3]],
      continuationConfirmElapsed: 9_000,
      dialoguePage: 2,
      dialoguePageEdgeElapsed: 10_000,
    };
    const at = (delay: number): PostwinState => ({ ...state, elapsed: 10_000 + delay });
    expect(postwinScoutingInputReadyDelay(electric)).toBe(76);
    expect(postwinDialogueVisibleChars(at(73))).toBe(70); // last character: first glyph +4, one a frame
    expect(postwinDialogueInputReady(at(75))).toBe(false);
    expect(postwinDialogueInputReady(at(76))).toBe(true);
  });
});

describe("sct1: before the Factory Head, the call scene from the battle number", () => {
  it("plays SE_POKENAV_CALL, the five call boxes, AskReadyForHead, and 'I can't tell you anything...' with no opponent rolled", () => {
    // Streak 19 entering the round: the next battle (index 1) is the 21st (streak 20 + 1 = 21, silver Head; frontier_util.c:1657-1698),
    // the battle just won (index 0) an ordinary trainer's.
    const postwin0 = firstPostwin(1, 19);
    const orchestrator0 = postwin0.factoryRoundBattleOrchestrator!;
    expect(orchestrator0.round.rules.battleIndex).toBe(0);
    expect(orchestrator0.round.rules.currentOpponent.frontierBrain).toBeUndefined();
    expect(factoryRoundNextBattleBrainStatus(orchestrator0)).toBe("silver");
    expect(postwin0.postwin!.frontierBrain).toBe(true);

    const steps = pressThroughPostwin(postwin0);
    const pages = [...new Set(steps.map((step) => step.after.postwin!.callScenePage))];
    expect(pages).toEqual([0, 1, 2, 3, 4, 5]);
    expect(CALL_SCENE_BOX_TEXTS[0]![0]).toBe("Excuse me! Excuse me, please!");
    const dialoguePages = [...new Set(steps.map((step) => step.after.postwin!.dialoguePage))];
    expect(dialoguePages).toEqual([0, 1, 4]); // no scouting pages: AskSwapBeforeHead's one line, then the swap offer
    expect(POSTWIN_BRAIN_CANT_TELL_TEXT[0]).toBe("I’m terribly sorry, but I can’t tell you");

    // The call sound once, 163 frames after the heal fanfare (ROM, the fcr2 Head run: MUS_HEAL 258,746, SE_POKENAV_CALL 258,909).
    const events = steps.flatMap((step) => step.events);
    const fanfare = events.filter((event) => event.kind === "fanfare" && event.id === MUS_HEAL);
    const call = events.filter((event) => event.kind === "se" && event.id === SE_POKENAV_CALL);
    expect(fanfare).toHaveLength(1);
    expect(call).toHaveLength(1);
    expect(call[0]!.frame - fanfare[0]!.frame).toBe(POKENAV_CALL_AFTER_HEAL_FANFARE);
    expect(POKENAV_CALL_AFTER_HEAL_FANFARE).toBe(163);

    // GO ON rolls nothing (AskSwapBeforeHead, scripts.inc:370-376); the Head is rolled when the swap offer is answered.
    const goOn = steps.find((step) => step.before.postwin!.dialoguePage === 0 && step.after.postwin!.dialoguePage === 1)!;
    expect(goOn.after.factoryRoundBattleOrchestrator!.pendingNextOpponent).toBeNull();
    expect(goOn.after.postwin!.scoutingLines).toEqual(POSTWIN_SCOUTING_LINES_BEFORE_ROLL);
    const last = steps.at(-1)!.after.factoryRoundBattleOrchestrator!;
    expect(last.round.rules.battleIndex).toBe(1);
    expect(last.round.rules.currentOpponent.frontierBrain?.status).toBe("silver");
  });

  it("reads the next battle from the round's streak and the battle just won: silver before 21, gold before 42, the return battles after", () => {
    const after = (factoryWinStreak: number, battleIndex: number, factorySymbolsCount: 0 | 1 | 2) =>
      factoryRoundNextBattleBrainStatus({
        config: { factoryWinStreak, factorySymbolsCount },
        round: { rules: { battleIndex } },
      } as unknown as Parameters<typeof factoryRoundNextBattleBrainStatus>[0]);
    expect(after(14, 5, 0)).toBe("silver"); // battle 20 won, round 3
    expect(after(14, 4, 0)).toBe("not-ready"); // battle 19 won
    expect(after(35, 5, 1)).toBe("gold"); // battle 41 won, round 6
    expect(after(35, 5, 0)).toBe("not-ready"); // no silver symbol yet: battle 42 is an ordinary trainer's
    expect(after(14, 5, 2)).toBe("streak");
    expect(after(35, 5, 2)).toBe("streak-long");
  });

  it("an ordinary next battle keeps the ordinary route after a win over any trainer", () => {
    const postwin0 = firstPostwin(1, 0);
    expect(factoryRoundNextBattleBrainStatus(postwin0.factoryRoundBattleOrchestrator!)).toBe("not-ready");
    expect(postwin0.postwin!.frontierBrain).toBe(false);
  });
});
