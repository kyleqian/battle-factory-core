// Tier-1 pins for the FIGHT (move-select) submenu's state machine
// (docs/battle-turn-notes.md §11) - open/nav/close, cursor index, JOY_NEW
// gating (no auto-repeat), and the B-close cycle-phase continuation. Pure
// logic/state only, per this run's Tier-1/Tier-2 split - pixel parity lives
// in tools/compare/traces/fight-submenu.json (234/235, one attributed
// anomaly - see docs/battle-menu-notes.md's new section).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CLOSED_FIGHT_SUBMENU_STATE,
  FIGHT_SUBMENU_CLOSE_DELAY,
  FIGHT_SUBMENU_OPEN_DELAY,
  FIGHT_CONFIRM_TEXT_DELAY,
  TURN_KICKOFF_LINE1,
  TURN_KICKOFF_LINE2,
  TURN_KICKOFF_TEXT_TOTAL,
  advanceFightSubmenuDisplay,
  closeFightSubmenu,
  confirmFightMove,
  moveFightCursor,
  openFightSubmenu,
  turnKickoffTextStartTick,
  turnKickoffTextVisibleChars,
  turnKickoffBounceTick,
  type FightSubmenuState,
} from "../src/engine/battleMenu.ts";
import {
  INITIAL_BATTLE_SCENE_STATE,
  TICK0 as SCENE_TICK0,
  TURN5_SITRUS_MENU_REOPEN_GATE_DELAY,
  TURN13_SWITCHIN_MENU_REDRAW_AFTER_DISMISS,
  TURN16_FIRE_PUNCH_MENU_REDRAW_DELAY,
  TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET,
  TURN6_FEATHERDANCE_LINE1,
  TURN6_FEATHERDANCE_LINE2,
  TURN6_FEATHERDANCE_TEXT_TOTAL,
  turn6FeatherDanceTextStartTick,
  turn6FeatherDanceTextVisibleChars,
  turn6KickoffBounceTick,
  turn5SitrusResettledBounceTick,
} from "../src/engine/battleScene.ts";
import { menuIdleBounce } from "../src/engine/battleMenu.ts";
import { createInitialState, render, tick, type EngineState } from "../src/engine/core.ts";
import { rockSlideOpponentHp, currentPPForActiveMon, currentPPForActiveMonFromLatest } from "../src/engine/battleMenu.ts";
import { rentalMoveset } from "../src/engine/battleSetup.ts";
import {
  resolveTurn1CompletedResolutionNextCommandHandoff,
  resolveTurn1LatestCompletedCommandHandoff,
} from "../src/engine/turn1ResolutionAdapter.ts";
import {
  isTurn2LatestCompletedCommandLifecycleActive,
  resolveTurn2CompletedResolutionNextCommandHandoff,
  resolveTurn2LatestCompletedCommandHandoff,
} from "../src/engine/turn2ResolutionAdapter.ts";
import {
  isTurn3NextCommandHandoffReady,
  isTurn3NextCommandLifecycleActive,
  resolveTurn3CompletedResolutionNextCommandHandoff,
} from "../src/engine/turn3ResolutionAdapter.ts";
import {
  isTurn4NextCommandHandoffReady,
  resolveTurn4CompletedResolutionNextCommandHandoff,
} from "../src/engine/turn4ResolutionAdapter.ts";
import {
  CANONICAL_FORCED_SWITCH_PARTY,
  CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
} from "../src/engine/partySelect.ts";
import { CANONICAL_OPPONENT_FLY_RESOLUTION } from "../src/engine/turn15FlyResolutionAdapter.ts";
import { resolveTurn13CompletedResolutionNextCommandHandoff, resolveTurn13LatestCompletedCommandHandoff } from "../src/engine/turn13ResolutionAdapter.ts";
import {
  createOpponentFaintPresentationOwner,
  storeOpponentFaintDismiss,
  type OpponentFaintPresentationOwner,
} from "../src/engine/opponentFaintPresentationOwner.ts";
import {
  resolveTurn5CompletedResolutionNextCommandHandoff,
  resolveTurn5LatestCompletedCommandHandoff,
} from "../src/engine/turn5ResolutionAdapter.ts";
import {
  resolveTurn6CompletedResolutionNextCommandHandoff,
  resolveTurn6LatestCompletedCommandHandoff,
} from "../src/engine/turn6ResolutionAdapter.ts";
import {
  resolveTurn7CompletedResolutionNextCommandHandoff,
  resolveTurn7LatestCompletedCommandHandoff,
} from "../src/engine/turn7ResolutionAdapter.ts";
import {
  resolveTurn8CompletedResolutionNextCommandHandoff,
  resolveTurn8LatestCompletedCommandHandoff,
} from "../src/engine/turn8ResolutionAdapter.ts";
import {
  resolveTurn9CompletedResolutionNextCommandHandoff,
  resolveTurn9LatestCompletedCommandHandoff,
} from "../src/engine/turn9ResolutionAdapter.ts";
import {
  resolveTurn10CompletedResolutionNextCommandHandoff,
  resolveTurn10LatestCompletedCommandHandoff,
} from "../src/engine/turn10ResolutionAdapter.ts";
import {
  resolveTurn11CompletedResolutionNextCommandHandoff,
  resolveTurn11LatestCompletedCommandHandoff,
} from "../src/engine/turn11ResolutionAdapter.ts";
import {
  resolveTurn12CompletedResolutionNextCommandHandoff,
  resolveTurn12LatestCompletedCommandHandoff,
} from "../src/engine/turn12ResolutionAdapter.ts";
import {
  createNextCommandReopenGuard,
  isLatestCompletedCommandLifecycleActive,
  latestCompletedCommandPresentationEpoch,
  withNextCommandReopenGuard,
  type LatestCompletedCommandHandoff,
} from "../src/engine/nextCommandHandoff.ts";
import { CANONICAL_FIRE_PUNCH_RESOLUTION } from "../src/engine/turn16FirePunchResolutionAdapter.ts";
import {
  beginBattleSceneForcedPartySelect,
  createBattleSceneResolutionOwner,
} from "../src/engine/battleSceneResolutionOwner.ts";
import type { GbaButton } from "../src/input.ts";

/** Onix's real moveset (`battleSetup.ts`'s own rental-pool lookup) - every `openFightSubmenu` call below needs this now that it threads the S8 `activeMonMoveset` plumbing (docs/battle-menu-notes.md §13c) through explicitly, rather than each test re-deriving it from a fully-played draft screen. */
const ONIX_MOVESET = rentalMoveset("ONIX");
const TURN1_HANDOFF = resolveTurn1CompletedResolutionNextCommandHandoff(1308);
const TURN1_LATEST_HANDOFF = resolveTurn1LatestCompletedCommandHandoff(1308);
const TURN2_HANDOFF = resolveTurn2CompletedResolutionNextCommandHandoff(2197);
const TURN2_LATEST_HANDOFF = resolveTurn2LatestCompletedCommandHandoff(2197);
const TURN3_HANDOFF = resolveTurn3CompletedResolutionNextCommandHandoff(3172);
const TURN4_HANDOFF = resolveTurn4CompletedResolutionNextCommandHandoff(4312);

describe("battleMenu: moveFightCursor (HandleInputChooseMove's DPAD guards, §11 finding 2)", () => {
  it("RIGHT/DOWN/LEFT/UP loop 0(ROCK_SLIDE)->1(BIND)->3(SANDSTORM)->2(DRAGON_BREATH)->0(ROCK_SLIDE), matching the nav groundtruth trace exactly", () => {
    let cursor: 0 | 1 | 2 | 3 = 0;
    cursor = moveFightCursor(cursor, "RIGHT");
    expect(cursor).toBe(1);
    cursor = moveFightCursor(cursor, "DOWN");
    expect(cursor).toBe(3);
    cursor = moveFightCursor(cursor, "LEFT");
    expect(cursor).toBe(2);
    cursor = moveFightCursor(cursor, "UP");
    expect(cursor).toBe(0);
  });

  it("guards block escaping the 2x2 grid the wrong way (no-ops, not wraps)", () => {
    expect(moveFightCursor(0, "LEFT")).toBe(0); // bit0 already clear
    expect(moveFightCursor(0, "UP")).toBe(0); // bit1 already clear
    expect(moveFightCursor(1, "RIGHT")).toBe(1); // bit0 already set
    expect(moveFightCursor(2, "DOWN")).toBe(2); // bit1 already set
  });

  it("held-repeat check: repeatedly applying DOWN from ROCK_SLIDE (JOY_NEW fires once) moves to DRAGON_BREATH and STAYS - no wraparound cycling even if called again", () => {
    // §11's own held-repeat finding: this engine gates DOWN application on
    // JOY_NEW at the core.ts call site (tested below), not inside
    // moveFightCursor itself - this pins the pure function's own half: a
    // second DOWN from the same slot 2 is a no-op (bit1 already set), so
    // even a caller that mistakenly re-applied it every held frame would
    // still land on a stable value, not cycle.
    let cursor: 0 | 1 | 2 | 3 = 0;
    cursor = moveFightCursor(cursor, "DOWN");
    expect(cursor).toBe(2);
    cursor = moveFightCursor(cursor, "DOWN");
    expect(cursor).toBe(2);
  });
});

describe("battleMenu: FightSubmenuState open/close/display-lag", () => {
  it("CLOSED_FIGHT_SUBMENU_STATE starts unopened at ROCK_SLIDE", () => {
    expect(CLOSED_FIGHT_SUBMENU_STATE).toEqual({
      openElapsed: null,
      cursor: 0,
      displayCursor: 0,
      closeElapsed: null,
      confirmElapsed: null,
      activeMonMoveset: ONIX_MOVESET,
      reopenedFromClose: false,
    });
  });

  it("openFightSubmenu sets openElapsed and resets cursor/displayCursor to ROCK_SLIDE", () => {
    const state = openFightSubmenu(847, ONIX_MOVESET);
    expect(state).toEqual({ openElapsed: 847, cursor: 0, displayCursor: 0, closeElapsed: null, confirmElapsed: null, activeMonMoveset: ONIX_MOVESET, reopenedFromClose: false });
  });

  it("openFightSubmenu's optional initialCursor persists the prior turn's own cursor position (S7 slice F, docs/battle-turn-notes.md §13: turn 3's reopen rests on slot 2, DRAGON_BREATH, where turn 2's own confirm left it)", () => {
    const state = openFightSubmenu(3846, ONIX_MOVESET, 2);
    expect(state).toEqual({ openElapsed: 3846, cursor: 2, displayCursor: 2, closeElapsed: null, confirmElapsed: null, activeMonMoveset: ONIX_MOVESET, reopenedFromClose: false });
  });

  it("closeFightSubmenu is a no-op if not open, or already closing", () => {
    expect(closeFightSubmenu(CLOSED_FIGHT_SUBMENU_STATE, 100)).toBe(CLOSED_FIGHT_SUBMENU_STATE);
    const opened = openFightSubmenu(847, ONIX_MOVESET);
    const closing = closeFightSubmenu(opened, 1007);
    expect(closing.closeElapsed).toBe(1007);
    expect(closeFightSubmenu(closing, 2000)).toBe(closing); // already closing - unchanged
  });

  it("advanceFightSubmenuDisplay lags displayCursor by exactly one call behind cursor, and is a no-op while closed", () => {
    expect(advanceFightSubmenuDisplay(CLOSED_FIGHT_SUBMENU_STATE)).toBe(CLOSED_FIGHT_SUBMENU_STATE);
    let state: FightSubmenuState = { ...openFightSubmenu(847, ONIX_MOVESET), cursor: 1 }; // simulate a same-tick RIGHT press: cursor updated, displayCursor not yet
    expect(state.displayCursor).toBe(0);
    state = advanceFightSubmenuDisplay(state); // next tick, no new input: catches up
    expect(state.displayCursor).toBe(1);
    expect(advanceFightSubmenuDisplay(state)).toBe(state); // already caught up - stable
  });

  it("timing constants match the pixel-fit groundtruth derivation (docs/battle-turn-notes.md §11 / battle-menu-notes.md's new section)", () => {
    expect(FIGHT_SUBMENU_OPEN_DELAY).toBe(5); // press 1887 -> reveal 1892
    expect(FIGHT_SUBMENU_CLOSE_DELAY).toBe(6); // press 2047 -> reveal 2053
  });
});

/**
 * A synthetic EngineState with `battleScene` already in the settled action-menu idle window, `elapsed` chosen so the FIRST tick() call below lands on trace tick `firstTickAbsolute` (see the `+1` convention noted in core.ts's own fightSubmenu block). Other fields are inert pass-throughs for this branch of tick() (verified by reading core.ts: the battleScene branch returns early using only battleScene/keyRepeat) - EXCEPT `draftScreen`, which core.ts's `openFightSubmenu` call sites now read (S8 engine dependency, docs/battle-menu-notes.md §13c): `selectedIds: [1, 2, 3, 0, 0, 0]` reproduces the real anchor trace's own fully-confirmed ONIX/MAGBY/BAYLEEF pick order (the same shape `tests/confirmDecline.test.ts` pins for a real played-through draft screen), so `chosenMonSpecies` resolves to Onix's lead exactly as every committed trace's own real button script does.
 */
function stateAtTick(firstTickAbsolute: number): EngineState {
  const initial = createInitialState({ appRoute: "canonical-recorded" });
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: { elapsed: firstTickAbsolute - SCENE_TICK0 - 1, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn3NextCommandHandoff: null, turn4NextCommandHandoff: null, latestCompletedCommandHandoff: null, opponentFaintPresentationOwner: null, },
  };
}

function press(state: EngineState, buttons: GbaButton[]): EngineState {
  return tick(state, new Set(buttons));
}

describe("battleMenu: FIGHT submenu wired through core.ts's tick() (JOY_NEW gating, 1-tick lag, B-close resume)", () => {
  it("consumes the generic turn-12 reopen guard only after the opponent-faint continuation completes", () => {
    const initial = createInitialState({ appRoute: "canonical-recorded" });
    const retained = resolveTurn13LatestCompletedCommandHandoff();
    const retainedOwner = retained.content?.retainedResolution?.owner;
    if (retainedOwner === undefined) {
      throw new Error("turn-13 generic receipt lost its retained FLY owner");
    }
    const turn13 = withNextCommandReopenGuard(
      retained,
      createNextCommandReopenGuard({
        minimumConfirmElapsed: 0,
        successor: { resolutionOwner: retainedOwner },
      }),
    );
    const turn12 = withNextCommandReopenGuard(
      resolveTurn12LatestCompletedCommandHandoff(),
      createNextCommandReopenGuard({
        minimumConfirmElapsed: 0,
        minimumOpponentFaintContinuationElapsed:
          TURN13_SWITCHIN_MENU_REDRAW_AFTER_DISMISS,
        successor: { handoff: turn13, resolutionOwner: retainedOwner },
      }),
    );
    // This synthetic late-turn fixture must still be later than every
    // retained predecessor epoch, including the completed-turn-3 reset.
    const turn13Confirmed = confirmFightMove(openFightSubmenu(5000, ONIX_MOVESET, 2), 5001);
    const sceneAt = (
      opponentFaintPresentationOwner: OpponentFaintPresentationOwner | null = null,
    ) => ({
      ...initial,
      draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        elapsed: 20_000,
        sendOutPressElapsed: 380,
        fightSubmenu: turn13Confirmed,
        turn3NextCommandHandoff: TURN3_HANDOFF,
        turn4NextCommandHandoff: TURN4_HANDOFF,
        latestCompletedCommandHandoff: turn12,
        opponentFaintPresentationOwner,
      },
    });

    const notYet = tick(
      sceneAt(storeOpponentFaintDismiss(createOpponentFaintPresentationOwner(), 20_001 - 290)),
      new Set(["A"]),
    );
    expect(notYet.battleScene!.latestCompletedCommandHandoff).toBe(turn12);

    const state = tick(
      sceneAt(storeOpponentFaintDismiss(createOpponentFaintPresentationOwner(), 20_001 - 291)),
      new Set(["A"]),
    );

    expect(state.battleScene!.latestCompletedCommandHandoff).toMatchObject(
      resolveTurn13LatestCompletedCommandHandoff(),
    );
    expect(state.battleScene!.latestCompletedCommandHandoff?.reopenGuard).toBeDefined();
    expect(state.battleScene!.fightSubmenu.cursor).toBe(2);
    expect(state.battleScene!.resolutionOwner).toBe(retainedOwner);
  });

  it("dispatcher slices 3-7: the turn-13 fixture publishes both early generic epochs before each guard-owned bridge", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn13-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    const publications: LatestCompletedCommandHandoff[] = [];
    let prior = state.battleScene?.latestCompletedCommandHandoff ?? null;
    for (const segment of trace.segments) {
      for (let frame = 0; frame < segment.frames; frame += 1) {
        state = press(state, segment.buttons ?? []);
        const latest = state.battleScene?.latestCompletedCommandHandoff ?? null;
        if (latest !== prior && latest !== null) publications.push(latest);
        prior = latest;
      }
    }

    const expected = [
      TURN1_LATEST_HANDOFF,
      TURN2_LATEST_HANDOFF,
      resolveTurn5LatestCompletedCommandHandoff(),
      resolveTurn6LatestCompletedCommandHandoff(),
      resolveTurn7LatestCompletedCommandHandoff(),
      resolveTurn8LatestCompletedCommandHandoff(),
      resolveTurn9LatestCompletedCommandHandoff(),
      resolveTurn10LatestCompletedCommandHandoff(),
      resolveTurn11LatestCompletedCommandHandoff(),
      resolveTurn12LatestCompletedCommandHandoff(),
    ];
    expect(publications).toHaveLength(expected.length);
    for (const [index, publication] of publications.entries()) {
      expect(publication).toMatchObject(expected[index]!);
      if (latestCompletedCommandPresentationEpoch(publication) !== null) {
        expect(publication.reopenGuard).toBeUndefined();
      } else {
        expect(publication.reopenGuard).toBeDefined();
      }
    }
  });

  it("dispatcher slice 2: turn-13 fallback and locked/following PP precedence agree on generic and legacy paths", () => {
    const latest = resolveTurn13LatestCompletedCommandHandoff();
    const legacy = resolveTurn13CompletedResolutionNextCommandHandoff();
    const onix = rentalMoveset("ONIX");
    const legacyArgs = [
      TURN1_HANDOFF,
      TURN2_HANDOFF,
      TURN3_HANDOFF,
      TURN4_HANDOFF,
      resolveTurn5CompletedResolutionNextCommandHandoff(),
      resolveTurn6CompletedResolutionNextCommandHandoff(),
      resolveTurn7CompletedResolutionNextCommandHandoff(),
      resolveTurn8CompletedResolutionNextCommandHandoff(),
      resolveTurn9CompletedResolutionNextCommandHandoff(),
      resolveTurn10CompletedResolutionNextCommandHandoff(),
      resolveTurn11CompletedResolutionNextCommandHandoff(),
      resolveTurn12CompletedResolutionNextCommandHandoff(),
      legacy,
    ] as const;
    const legacyFallback = currentPPForActiveMon(onix, ...legacyArgs);
    expect(currentPPForActiveMonFromLatest(onix, latest)).toEqual(legacyFallback);
    expect(legacyFallback[2]).toBe(18);

    const locked = CANONICAL_OPPONENT_FLY_RESOLUTION.chargeResolution;
    const legacyLocked = currentPPForActiveMon(onix, ...legacyArgs, locked);
    const genericLocked = currentPPForActiveMonFromLatest(onix, latest, locked);
    expect(genericLocked).toEqual(legacyLocked);
    expect(genericLocked[2]).toBe(
      locked.segments[0]!.afterRules.rulesContext.battlers[0]!.pp[2],
    );

    const following = CANONICAL_FIRE_PUNCH_RESOLUTION.resolution;
    const magby = rentalMoveset("MAGBY");
    const legacyFollowing = currentPPForActiveMon(magby, ...legacyArgs, locked, following);
    const genericFollowing = currentPPForActiveMonFromLatest(magby, latest, locked, following);
    expect(genericFollowing).toEqual(legacyFollowing);
    expect(genericFollowing).toEqual(
      following.segments.at(-1)!.afterRules.rulesContext.battlers[0]!.pp,
    );
  });

  it("completed forced SEND OUT resets the stale turn-15 choice and the next A opens ordinary FIGHT with MAGBY's real moveset", () => {
    const initial = createInitialState({ appRoute: "canonical-recorded" });
    const staleTurn15Choice = confirmFightMove(openFightSubmenu(19000, ONIX_MOVESET, 2), 19030);
    const resolutionOwner = beginBattleSceneForcedPartySelect(
      createBattleSceneResolutionOwner(
        CANONICAL_OPPONENT_FLY_RESOLUTION.strikeResolution,
      ),
      CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
      CANONICAL_FORCED_SWITCH_PARTY,
    );
    let state: EngineState = {
      ...initial,
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        elapsed: 20000,
        sendOutPressElapsed: 380,
        fightSubmenu: staleTurn15Choice,
        resolutionOwner: Object.freeze({
          resolution: resolutionOwner.resolution,
          followingPresentation: null,
          forcedPartySelect: {
            ...resolutionOwner.forcedPartySelect!,
            elapsed: 500,
            cursor: "magby",
            submenuOpen: true,
            sendOutElapsed: 310,
          },
        }),
      },
    };

    state = press(state, []);
    expect(state.battleScene!.resolutionOwner!.forcedPartySelect!.sendOutElapsed).toBe(311);
    expect(state.battleScene!.fightSubmenu).toMatchObject({
      openElapsed: null,
      confirmElapsed: null,
      activeMonMoveset: rentalMoveset("MAGBY"),
    });

    state = press(state, ["A"]);
    expect(state.battleScene!.fightSubmenu).toMatchObject({
      openElapsed: 20002,
      cursor: 0,
      confirmElapsed: null,
      activeMonMoveset: rentalMoveset("MAGBY"),
    });
  });

  it("turn 17's canonical A edges create a fresh epoch, preserve the confirmation-relative redraw anchor, and confirm FIRE_PUNCH", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn17-rung1.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    let frame = 0;
    let atOpen: EngineState | null = null;
    let atConfirm: EngineState | null = null;
    for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) {
        state = press(state, seg.buttons ?? []);
        if (frame === 21773) atOpen = state;
        if (frame === 21801) atConfirm = state;
        frame += 1;
      }
    }
    expect(atOpen!.battleScene).toMatchObject({
      terminalResolution: null,
      resolutionOwner: {
        followingPresentation: {
          resolution: CANONICAL_FIRE_PUNCH_RESOLUTION.resolution,
          confirmElapsed: 20774 - SCENE_TICK0,
          menuRedrawElapsed: 21725 - SCENE_TICK0,
        },
      },
      fightSubmenu: {
        openElapsed: 21774 - SCENE_TICK0,
        confirmElapsed: null,
        cursor: 0,
      },
    });
    expect(atConfirm!.battleScene!.fightSubmenu.confirmElapsed).toBe(21802 - SCENE_TICK0);
    expect(atOpen!.battleScene!.resolutionOwner!.followingPresentation!.menuRedrawElapsed).toBe(
      20774 - SCENE_TICK0 + TURN16_FIRE_PUNCH_MENU_REDRAW_DELAY,
    );
    expect(atConfirm!.battleScene!.terminalResolution!.menuRedrawElapsed).toBe(
      21725 - SCENE_TICK0,
    );
  });

  it("turn 17's FIRE_PUNCH-default submenu shows the one prior use: 14/15 PP", () => {
    const magby = rentalMoveset("MAGBY");
    expect(currentPPForActiveMon(
      magby,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      CANONICAL_FIRE_PUNCH_RESOLUTION.resolution,
    )[0]).toBe(14);
  });

  it("turn 17's reopened-but-unconfirmed submenu renders MAGBY/MURKROW's real settled state, not drawTurn16FightSubmenuWindow's pre-turn-16 defaults (docs/turn17-rung1-residual-notes.md's named fix)", () => {
    // The gap between the turn-16->17 reopen and turn 17's own confirm
    // (`fightSubmenu.confirmElapsed === null`, frames 21774-21801 of this
    // same trace) used to fall into a fallback that hardcoded MAGBY at full
    // HP/never-used PP and drew no burn badge for MURKROW - all three
    // self-correct instantly at the next confirm, which is exactly why the
    // wrong values were easy to miss without a pin dense in this window.
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn17-rung1.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    let frame = 0;
    let atGap: EngineState | null = null;
    for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) {
        state = press(state, seg.buttons ?? []);
        if (frame === 21786) atGap = state; // mid-gap: MOVE list settled, still unconfirmed
        frame += 1;
      }
    }
    expect(atGap!.battleScene!.fightSubmenu.confirmElapsed).toBeNull();
    expect(atGap!.battleScene!.resolutionOwner!.followingPresentation!.menuRedrawElapsed).not.toBeNull();
    const fb = render(atGap!);
    const pixelAt = (x: number, y: number): [number, number, number] => {
      const o = (y * 240 + x) * 4;
      return [fb[o]!, fb[o + 1]!, fb[o + 2]!];
    };
    // Oracle-matched RGB triples, sampled from this exact trace/frame
    // (tools/compare/traces/turn17-rung1.json, frame 21786) - each differs
    // from the pre-fix fallback's rendered color at the same coordinate.
    expect(pixelAt(20, 32)).toEqual([231, 115, 82]); // MURKROW's BRN badge (was the cream no-status background)
    expect(pixelAt(216, 92)).toEqual([74, 66, 90]); // MAGBY's HP bar stops at 79/138 (was filled green to 138/138)
    expect(pixelAt(210, 128)).toEqual([255, 255, 255]); // PP digit reads 14 (was inking a "5", i.e. 15)
  });

  it("A on the settled action menu opens the submenu at the exact next tick, JOY_NEW only (a held A the following tick doesn't re-open/no-op differently)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(847); // TICK0(1040)+847=1887
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
  });

  it("nav is JOY_NEW-gated - holding DOWN for many ticks moves the cursor exactly once, then holds (no auto-repeat, §11 finding 2)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // opens at 1887, reveal at 1892
    for (let i = 0; i < 5; i += 1) state = press(state, []); // 1888-1892: DMA-wait elapses, submenu now interactive
    state = press(state, ["DOWN"]); // 1893: first DOWN - JOY_NEW fires
    expect(state.battleScene!.fightSubmenu.cursor).toBe(2); // ROCK_SLIDE -> DRAGON_BREATH
    for (let i = 0; i < 20; i += 1) state = press(state, ["DOWN"]); // held for 20 more ticks
    expect(state.battleScene!.fightSubmenu.cursor).toBe(2); // unchanged - no JOY_REPEAT
  });

  it("displayCursor lags cursor by exactly 1 tick after a nav press", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["RIGHT"]); // cursor updates same tick
    expect(state.battleScene!.fightSubmenu.cursor).toBe(1);
    expect(state.battleScene!.fightSubmenu.displayCursor).toBe(0); // pixel content still lags
    state = press(state, []);
    expect(state.battleScene!.fightSubmenu.displayCursor).toBe(1); // caught up one tick later
  });

  it("B closes the submenu (records closeElapsed) without resetting cursor - the resumed action menu shows whatever slot was last selected, moot since move confirmation is out of scope, but the state itself must survive", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["RIGHT"]);
    state = press(state, []);
    state = press(state, ["B"]);
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.closeElapsed).not.toBeNull();
    expect(sm.cursor).toBe(1);
  });

  it("a B press before the open DMA-wait completes is ignored (HandleInputChooseMove isn't polling yet)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // reveal not until 1892
    state = press(state, ["B"]); // 1888 - too early
    expect(state.battleScene!.fightSubmenu.closeElapsed).toBeNull();
  });

  it("A on ROCK_SLIDE (cursor 0) confirms the move (records confirmElapsed) instead of closing", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // opens at 1887
    for (let i = 0; i < 5; i += 1) state = press(state, []); // reveal at 1892
    state = press(state, ["A"]); // 1893: confirm on ROCK_SLIDE (cursor still 0)
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.confirmElapsed).not.toBeNull();
    expect(sm.closeElapsed).toBeNull();
    expect(sm.cursor).toBe(0);
  });

  it("A on a still-unmodeled slot does NOT confirm (SANDSTORM's own confirm timing/text is unverified) - it's simply ignored, the submenu stays open and interactive", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["RIGHT"]); // -> BIND (cursor 1)
    state = press(state, []);
    state = press(state, ["DOWN"]); // -> SANDSTORM (cursor 3)
    state = press(state, []);
    state = press(state, ["A"]); // confirm attempt on a non-ROCK_SLIDE/BIND/DRAGON_BREATH slot
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.confirmElapsed).toBeNull();
    expect(sm.cursor).toBe(3);
  });

  it("once confirmed, no further input (nav, B) mutates the submenu - HandleInputChooseMove is no longer polling (source-confirmed, battleMenu.ts's Slice 7 doc)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["A"]); // confirm
    const confirmedSm = state.battleScene!.fightSubmenu;
    state = press(state, ["B"]);
    state = press(state, ["LEFT"]);
    state = press(state, ["RIGHT"]);
    expect(state.battleScene!.fightSubmenu).toEqual(confirmedSm);
  });
});

describe("battleMenu: ISSUES #25 - a B-close no longer strands the submenu forever; a fresh A-press reopens it, cursor persisted, at every turn epoch", () => {
  it("turn 1 epoch (pre-confirm): B-close then A before the close redraw settles is still ignored (the gate itself, not just the reopen, is pixel-timed)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // opens at 1887
    for (let i = 0; i < 5; i += 1) state = press(state, []); // reveal at 1892
    state = press(state, ["RIGHT"]); // nav to BIND (cursor 1)
    state = press(state, []); // displayCursor catches up
    state = press(state, ["B"]); // close
    expect(state.battleScene!.fightSubmenu.closeElapsed).not.toBeNull();
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 2; i += 1) state = press(state, []); // one tick short of settled
    state = press(state, ["A"]); // too early - still stranded pre-fix-style
    expect(state.battleScene!.fightSubmenu.openElapsed).not.toBeNull(); // (never actually became null - `closeFightSubmenu` doesn't touch it)
    expect(state.battleScene!.fightSubmenu.closeElapsed).not.toBeNull(); // still "closed, not yet reopenable"
    expect(state.battleScene!.fightSubmenu.cursor).toBe(1); // untouched by the rejected press
  });

  it("turn 1 epoch (pre-confirm): once the close redraw settles, a fresh A REOPENS the submenu with the cursor PERSISTED (not reset to ROCK_SLIDE) and reopenedFromClose=true, without publishing either completed-turn receipt (ISSUES #25's own exact reported scenario)", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]); // opens at 1887
    for (let i = 0; i < 5; i += 1) state = press(state, []); // reveal at 1892
    state = press(state, ["RIGHT"]); // nav to BIND (cursor 1)
    state = press(state, []);
    state = press(state, ["B"]); // close
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []); // settle
    state = press(state, ["A"]); // reopen
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.openElapsed).not.toBeNull();
    expect(sm.closeElapsed).toBeNull();
    expect(sm.confirmElapsed).toBeNull();
    expect(sm.cursor).toBe(1); // persisted at BIND, exactly where the B-close left it
    expect(sm.displayCursor).toBe(1);
    expect(sm.reopenedFromClose).toBe(true);
    expect(state.battleScene!.latestCompletedCommandHandoff ?? null).toBeNull(); // no completion receipt has published before confirmation
    expect(state.battleScene!.turn3NextCommandHandoff).toBeNull();
    expect(state.battleScene!.turn4NextCommandHandoff ?? null).toBeNull();
  });

  it("the reopened submenu is fully interactive again: nav + a second close + a second reopen (close->reopen->nav->close->reopen cycling) keeps persisting the cursor each time", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["B"]); // close at ROCK_SLIDE (cursor 0, never navigated yet)
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []);
    state = press(state, ["A"]); // reopen #1
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    for (let i = 0; i < FIGHT_SUBMENU_OPEN_DELAY; i += 1) state = press(state, []); // this reopen's own settle
    state = press(state, ["DOWN"]); // nav to DRAGON_BREATH (cursor 2)
    expect(state.battleScene!.fightSubmenu.cursor).toBe(2);
    state = press(state, []);
    state = press(state, ["B"]); // close #2, cursor still 2
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []);
    state = press(state, ["A"]); // reopen #2
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.cursor).toBe(2); // persisted across BOTH close/reopen cycles
    expect(sm.reopenedFromClose).toBe(true);
    expect(state.battleScene!.latestCompletedCommandHandoff ?? null).toBeNull(); // still pre-confirm after 2 full cycles
  });

  it("turn-2's 2901 A-open consumes the immutable turn-1 receipt, and a same-turn B-close/A-reopen retains its 1308 DoBounceEffect epoch", () => {
    const initial = createInitialState({ appRoute: "canonical-recorded" });
    let state: EngineState = {
      ...initial,
      draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
      battleScene: {
        ...INITIAL_BATTLE_SCENE_STATE,
        elapsed: 1860,
        sendOutPressElapsed: 380,
        latestCompletedCommandHandoff: TURN1_LATEST_HANDOFF,
        fightSubmenu: {
          openElapsed: 847,
          cursor: 0,
          displayCursor: 0,
          closeElapsed: null,
          confirmElapsed: 879,
          activeMonMoveset: ONIX_MOVESET,
          reopenedFromClose: false,
        },
      },
    };

    state = press(state, ["A"]);
    let scene = state.battleScene!;
    expect(scene.fightSubmenu.openElapsed).toBe(1861);
    expect(scene.latestCompletedCommandHandoff).toBe(TURN1_LATEST_HANDOFF);
    expect(scene.latestCompletedCommandHandoff?.content?.presentationEpoch?.elapsed).toBe(1308);
    expect(isLatestCompletedCommandLifecycleActive(
      scene.latestCompletedCommandHandoff,
      scene.fightSubmenu.openElapsed,
    )).toBe(true);

    for (let i = 0; i < FIGHT_SUBMENU_OPEN_DELAY; i += 1) state = press(state, []);
    state = press(state, ["B"]);
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []);
    state = press(state, ["A"]);

    scene = state.battleScene!;
    expect(scene.fightSubmenu.reopenedFromClose).toBe(true);
    expect(scene.latestCompletedCommandHandoff).toBe(TURN1_LATEST_HANDOFF);
    expect(scene.latestCompletedCommandHandoff?.content?.presentationEpoch?.elapsed).toBe(1308);
    expect(isLatestCompletedCommandLifecycleActive(
      scene.latestCompletedCommandHandoff,
      scene.fightSubmenu.openElapsed,
    )).toBe(true);
  });

  it("turn 3 epoch (post-confirm reopen): the SAME same-turn close/reopen mechanism retains the completed-turn-2 receipt and its immutable epoch", () => {
    let state = stateAtTurn3Reopen(3846);
    state = press(state, ["A"]); // turn-epoch reopen for turn 3, cursor persisted at 2 (DRAGON_BREATH)
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN2_LATEST_HANDOFF);
    expect(isTurn2LatestCompletedCommandLifecycleActive(
      state.battleScene!.latestCompletedCommandHandoff,
      state.battleScene!.fightSubmenu.openElapsed,
    )).toBe(true);
    for (let i = 0; i < 5; i += 1) state = press(state, []); // FIGHT_SUBMENU_OPEN_DELAY settle
    state = press(state, ["UP"]); // nav 2(DRAGON_BREATH) -> 0(ROCK_SLIDE)
    state = press(state, []);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    state = press(state, ["B"]); // same-turn close
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []); // settle
    state = press(state, ["A"]); // ISSUES #25's own reopen branch, NOT a turn-epoch branch
    const sm = state.battleScene!.fightSubmenu;
    expect(sm.openElapsed).not.toBeNull();
    expect(sm.closeElapsed).toBeNull();
    expect(sm.cursor).toBe(0); // persisted at ROCK_SLIDE, where the nav+close left it
    expect(sm.reopenedFromClose).toBe(true);
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN2_LATEST_HANDOFF);
    expect(state.battleScene!.latestCompletedCommandHandoff!.content!.presentationEpoch!.elapsed).toBe(2197);
    expect(isTurn2LatestCompletedCommandLifecycleActive(
      state.battleScene!.latestCompletedCommandHandoff,
      state.battleScene!.fightSubmenu.openElapsed,
    )).toBe(true); // same-turn reopen continues, never replaces, the epoch
    expect(state.battleScene!.turn3NextCommandHandoff).toBeNull(); // no turn-3 completion has occurred in this cycle
  });

  it("turn 4's B-close/A-reopen retains the completed-turn-3 receipt object and its 3172 epoch", () => {
    let state = stateAtTurn3Confirm();
    while (state.battleScene!.elapsed < 3171) state = press(state, []);
    state = press(state, ["A"]); // first consumable input at the receipt reset opens turn 4

    const handoff = state.battleScene!.turn3NextCommandHandoff;
    expect(handoff).toEqual(TURN3_HANDOFF);
    expect(state.battleScene!.fightSubmenu.openElapsed).not.toBeNull();

    for (let i = 0; i < FIGHT_SUBMENU_OPEN_DELAY; i += 1) state = press(state, []);
    state = press(state, ["B"]);
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []);
    state = press(state, ["A"]);

    const scene = state.battleScene!;
    expect(scene.fightSubmenu.reopenedFromClose).toBe(true);
    expect(scene.turn3NextCommandHandoff).toBe(handoff);
    expect(scene.turn3NextCommandHandoff!.presentationEpoch.elapsed).toBe(3172);
    expect(isTurn3NextCommandLifecycleActive(
      scene.turn3NextCommandHandoff,
      scene.fightSubmenu.openElapsed,
    )).toBe(true);
  });
});

/** Turn 2's own real confirm tick (`battleScene.test.ts`'s own `TURN2_PRESS_TICK`, same fixture) - DRAGON_BREATH confirmed on cursor slot 2, well past `DRAGONBREATH_MENU_REDRAW_DELAY`'s own 391-tick settle by the time these tests press a fresh A. */
const TURN2_PRESS_TICK = 2945;

/** A synthetic EngineState already past turn 2's source-owned reset (both receipts present, turn-2 submenu confirmed on cursor 2) before the fresh A opens FIGHT for turn 3. */
function stateAtTurn3Reopen(firstTickAbsolute: number): EngineState {
  const initial = createInitialState({ appRoute: "canonical-recorded" });
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: firstTickAbsolute - SCENE_TICK0 - 1,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 1861,
        cursor: 2,
        displayCursor: 2,
        closeElapsed: null,
        confirmElapsed: TURN2_PRESS_TICK - SCENE_TICK0,
        activeMonMoveset: rentalMoveset("ONIX"),
        reopenedFromClose: false,
      },
      latestCompletedCommandHandoff: firstTickAbsolute >= 3237 ? TURN2_LATEST_HANDOFF : TURN1_LATEST_HANDOFF,
      turn3NextCommandHandoff: null, turn4NextCommandHandoff: null,                     opponentFaintPresentationOwner: null,     },
  };
}

describe("battleMenu: turn 3's FIGHT-submenu reopen wired through core.ts's tick() (S7 slice F, docs/battle-turn-notes.md §13)", () => {
  it("A on the resettled action menu after turn 2 resolves reopens FIGHT for turn 3, cursor PERSISTED at slot 2 (DRAGON_BREATH, turn 2's own confirmed slot) - NOT reset to slot 0 the way turn 1->2's own reopen coincidentally was", () => {
    let state = stateAtTurn3Reopen(3846);
    state = press(state, ["A"]);
    const sm = state.battleScene!.fightSubmenu;
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN2_LATEST_HANDOFF);
    expect(isTurn2LatestCompletedCommandLifecycleActive(
      state.battleScene!.latestCompletedCommandHandoff,
      state.battleScene!.fightSubmenu.openElapsed,
    )).toBe(true);
    expect(sm.openElapsed).toBe(3846 - SCENE_TICK0);
    expect(sm.cursor).toBe(2);
    expect(sm.displayCursor).toBe(2);
    expect(sm.confirmElapsed).toBeNull(); // fresh submenu, not still turn 2's own confirmed one
  });

  it("UP nav flips the persisted cursor 2(DRAGON_BREATH)->0(ROCK_SLIDE) same-tick, matching §13's own ground truth, then A confirms ROCK_SLIDE again for turn 3", () => {
    let state = stateAtTurn3Reopen(3846);
    state = press(state, ["A"]); // reopen
    for (let i = 0; i < 5; i += 1) state = press(state, []); // FIGHT_SUBMENU_OPEN_DELAY settle
    state = press(state, ["UP"]);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).not.toBeNull();
  });

  it("a fresh A press before turn 2's source-owned choose-action reset is ignored", () => {
    // Reset is at 3237; this state intentionally has no receipt yet.
    let state = stateAtTurn3Reopen(3200);
    state = press(state, ["A"]);
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN1_LATEST_HANDOFF);
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(1861); // unchanged - still turn 2's own long-settled submenu
  });
});

describe("battleMenu: turn kickoff text (S7 slice A, docs/battle-turn-notes.md §9's 2nd A press through tick 1964)", () => {
  it("FIGHT_CONFIRM_TEXT_DELAY matches the pixel-fit groundtruth (press 1919 -> first glyph 1929)", () => {
    expect(FIGHT_CONFIRM_TEXT_DELAY).toBe(10);
    expect(turnKickoffTextStartTick(1919)).toBe(1929);
  });

  it("the message is \"Foe GROVYLE used\\nDOUBLE TEAM!\" - Grovyle (the opponent) outspeeds Onix and moves first, regardless of which move Onix selected", () => {
    expect(TURN_KICKOFF_LINE1).toBe("Foe GROVYLE used");
    expect(TURN_KICKOFF_LINE2).toBe("DOUBLE TEAM!");
    expect(TURN_KICKOFF_TEXT_TOTAL).toBe(28); // 17 + 12 - \n is free, not counted
  });

  it("turnKickoffTextVisibleChars prints 1 char/tick including 3 pixel-silent-but-charged spaces (indices 3/11/22), completing at tick 1956", () => {
    const pressTick = 1919;
    const start = turnKickoffTextStartTick(pressTick); // 1929
    expect(turnKickoffTextVisibleChars(start - 1, pressTick)).toBe(0);
    for (let i = 0; i < TURN_KICKOFF_TEXT_TOTAL; i += 1) {
      expect(turnKickoffTextVisibleChars(start + i, pressTick)).toBe(i + 1);
    }
    expect(turnKickoffTextVisibleChars(start + TURN_KICKOFF_TEXT_TOTAL - 1, pressTick)).toBe(28); // tick 1956, fully printed
    expect(turnKickoffTextVisibleChars(start + TURN_KICKOFF_TEXT_TOTAL + 50, pressTick)).toBe(28); // static hold well past tick 1964
  });

  it("turnKickoffBounceTick stays live for 3 ticks after the press, then freezes (pixel-fit grid-searched against this session's own dense oracle probe - see battleMenu.ts's Slice 7 doc)", () => {
    const pressTick = 1919;
    expect(turnKickoffBounceTick(1919, pressTick)).toBe(1919 - 2); // still live (FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT=2)
    expect(turnKickoffBounceTick(1921, pressTick)).toBe(1921 - 2); // still live
    const frozen = turnKickoffBounceTick(1922, pressTick);
    expect(turnKickoffBounceTick(1930, pressTick)).toBe(frozen); // frozen - same value regardless of t
    expect(turnKickoffBounceTick(1964, pressTick)).toBe(frozen);
  });

  it("confirmFightMove is idempotent and a no-op unless the submenu is open, not closing, and not already confirmed", () => {
    expect(confirmFightMove(CLOSED_FIGHT_SUBMENU_STATE, 100)).toBe(CLOSED_FIGHT_SUBMENU_STATE); // not open
    const opened = openFightSubmenu(847, ONIX_MOVESET);
    const confirmed = confirmFightMove(opened, 879);
    expect(confirmed.confirmElapsed).toBe(879);
    expect(confirmFightMove(confirmed, 2000)).toBe(confirmed); // already confirmed - unchanged
    const closing = closeFightSubmenu(opened, 1007);
    expect(confirmFightMove(closing, 1100)).toBe(closing); // already closing - unchanged
  });

  it("RNG ledger stays flat across the whole confirm-through-1964 window (docs/battle-turn-notes.md §9 point 3: gRngValue is flat 1880-2309, DOUBLE_TEAM's clone animation consumes zero Random() calls) - this slice's own state machine never calls any RNG function, pure/deterministic given only ticks and button input", () => {
    let state = stateAtTick(1887);
    state = press(state, ["A"]);
    for (let i = 0; i < 5; i += 1) state = press(state, []);
    state = press(state, ["A"]); // confirm at 1893
    for (let i = 0; i < 80; i += 1) state = press(state, []); // idle through tick 1964+
    // Replaying the identical button script twice from the identical start
    // state must produce identical fightSubmenu/battleScene state - i.e. no
    // hidden nondeterminism (RNG or otherwise) snuck into this slice's own
    // code, matching the ground truth's own "zero Random() calls" finding.
    let replay = stateAtTick(1887);
    replay = press(replay, ["A"]);
    for (let i = 0; i < 5; i += 1) replay = press(replay, []);
    replay = press(replay, ["A"]);
    for (let i = 0; i < 80; i += 1) replay = press(replay, []);
    expect(replay.battleScene!.fightSubmenu).toEqual(state.battleScene!.fightSubmenu);
  });
});

/** A synthetic EngineState at turn 3's own confirm (cursor 0, ROCK_SLIDE selected by the player, with the completed-turn-2 receipt already active). */
function stateAtTurn3Confirm(): EngineState {
  const initial = createInitialState({ appRoute: "canonical-recorded" });
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: 3891 - SCENE_TICK0,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 3846 - SCENE_TICK0,
        cursor: 0,
        displayCursor: 0,
        closeElapsed: null,
        confirmElapsed: 3891 - SCENE_TICK0,
        activeMonMoveset: ONIX_MOVESET,
        reopenedFromClose: false,
      },
      latestCompletedCommandHandoff: TURN2_LATEST_HANDOFF,
      turn3NextCommandHandoff: null, turn4NextCommandHandoff: null,                     opponentFaintPresentationOwner: null,     },
  };
}

describe("battleMenu: turn 3's ENDEAVOR resolution (S7 slice G, docs/battle-turn-notes.md §20)", () => {
  it("replaying turn3-endeavor-off.json's own committed button script (reopen/UP-nav/confirm - byte-identical segments to the retired turn3-menu.json, ISSUES #39 rank-6 slice 3) lands turn 3's own confirm at tick 3891, matching TURN3_CONFIRM_PRESS_TICK's own doc", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn3-endeavor-off.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    const target = 3896 - SCENE_TICK0; // turn3-menu.json's own committed capture-range end; the retiring trace's segments continue well past this (through turn 4's own reopen), unlike the deleted turn3-menu.json which stopped here
    outer: for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) {
        state = press(state, seg.buttons ?? []);
        if (state.battleScene !== null && state.battleScene.elapsed >= target) break outer;
      }
    }
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(3891 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN2_LATEST_HANDOFF);
  });

  it("engine state stays well-formed (turn-2 receipt, cursor 0) through the whole ENDEAVOR-again window - a pure smoke/determinism check, pixel parity lives in tools/compare/traces/turn3-endeavor-off.json", () => {
    let state = stateAtTurn3Confirm();
    for (let i = 0; i < 190; i += 1) state = press(state, []);
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN2_LATEST_HANDOFF);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    // Replaying the identical idle window twice from the identical start
    // state must produce byte-identical battleScene state - no hidden
    // nondeterminism in the new turn-3 ENDEAVOR draw/dispatch path.
    let replay = stateAtTurn3Confirm();
    for (let i = 0; i < 190; i += 1) replay = press(replay, []);
    expect(replay.battleScene).toEqual(state.battleScene);
  });
});

describe("battleMenu/battleScene: turn 3's ROCK_SLIDE resolution (S7 slice H, docs/battle-turn-notes.md §21)", () => {
  it("publishes the completed-turn-3 receipt on elapsed 3172, after the rejected handler-install tick and before any turn-4 reopen", () => {
    let state = stateAtTurn3Confirm();
    while (state.battleScene!.elapsed < 3171) state = press(state, []);
    expect(state.battleScene!.turn3NextCommandHandoff ?? null).toBeNull();

    state = press(state, []);

    const handoff = state.battleScene!.turn3NextCommandHandoff;
    expect(state.battleScene!.elapsed).toBe(3172);
    expect(isTurn3NextCommandHandoffReady(handoff)).toBe(true);
    expect(handoff).toMatchObject({
      playerPp: [8, 20, 19, 10],
      persistedMoveSlot: 0,
      hp: { player: 88, opponent: 41 },
      presentationEpoch: { elapsed: 3172 },
    });
  });

  it("the synthetic TURN3_ROCKSLIDE_PRESS_TICK anchor (3687) reuses rockSlideOpponentHp unchanged for Grovyle's own 88->41 drain, matching the RAM-probed schedule exactly", () => {
    const pressTick = 3687; // 4080 - ROCK_SLIDE_TEXT_DELAY(393), battleScene.ts's own TURN3_ROCKSLIDE_PRESS_TICK
    expect(rockSlideOpponentHp(pressTick + 596, pressTick, 88, 41)).toBe(88); // still full, one tick before the drain-start sentinel
    expect(rockSlideOpponentHp(pressTick + 597, pressTick, 88, 41)).toBe(88); // drain-start sentinel tick itself (ROCK_SLIDE_HP_DRAIN_START_DELAY)
    expect(rockSlideOpponentHp(pressTick + 598, pressTick, 88, 41)).toBe(87); // first 1-HP-unit decrement
    expect(rockSlideOpponentHp(pressTick + 644, pressTick, 88, 41)).toBe(41); // pressTick+597+(88-41): drain reaches its settled endpoint
    expect(rockSlideOpponentHp(pressTick + 700, pressTick, 88, 41)).toBe(41); // clamped, well past settle
  });

  it("replaying turn3-rockslide-off.json's own idle window renders ROCK_SLIDE's kickoff text hard-cutting the message box at tick 4043 (not 4042), text-clearing at 4205, and hard-cutting to the resettled menu at 4212 - ISSUES #39 rank-6 slice 3's own fresh OFF-pinned anchors (superseding the retired ON-fit 4080/4349/4356 trio)", () => {
    let state = stateAtTurn3Confirm();
    // stateAtTurn3Confirm() starts at battleScene.elapsed = 3891 - SCENE_TICK0 (the confirm tick itself); advance to each
    // boundary tick by pressing idle frames the same number of times as the elapsed-tick delta.
    const frameAt = (targetTick: number): Uint8Array => {
      let s = state;
      const target = targetTick - SCENE_TICK0;
      while (s.battleScene!.elapsed < target) s = press(s, []);
      return render(s);
    };
    const before4043 = frameAt(4042);
    const at4043 = frameAt(4043);
    expect(before4043).not.toEqual(at4043); // ROCK_SLIDE's own kickoff text hard-cuts the message box here (TURN3_OFF_ROCKSLIDE_TEXT_DELAY), not a tick earlier/later

    const before4205 = frameAt(4204);
    const at4205 = frameAt(4205);
    expect(before4205).not.toEqual(at4205); // TURN3_OFF_ROCKSLIDE_TEXT_CLEAR_DELAY(518): the message box goes blank

    const before4212 = frameAt(4211);
    const at4212 = frameAt(4212);
    expect(before4212).not.toEqual(at4212); // TURN3_OFF_ROCKSLIDE_MENU_REDRAW_DELAY(525): hard cut to the resettled action menu
  });

  it("engine state stays well-formed and deterministic through the whole ROCK_SLIDE window (turn-1/turn-2 receipts unchanged, cursor still 0) - pixel parity lives in tools/compare/traces/turn3-rockslide-off.json", () => {
    let state = stateAtTurn3Confirm();
    for (let i = 0; i < 999; i += 1) state = press(state, []); // 3891 -> 4890, this slice's own committed trace boundary (before tick 4892, turn 4's own input, out of scope)
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN2_LATEST_HANDOFF);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    let replay = stateAtTurn3Confirm();
    for (let i = 0; i < 999; i += 1) replay = press(replay, []);
    expect(replay.battleScene).toEqual(state.battleScene);
  });
});

describe("battleMenu/battleScene: turn 4's FIGHT-submenu reopen (S7 slice I, docs/battle-turn-notes.md §13/§22)", () => {
  it("replaying turn4-doubleteam-off.json's own committed button script (reopen, NO nav needed, confirm - byte-identical segments to the retired turn4-menu.json, ISSUES #39 rank-6 slice 4) lands turn 4's own confirm at tick 4925, cursor persisted at 0 (ROCK_SLIDE, unchanged since turn 3), while consuming the immutable completed-turn-3 receipt", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn4-doubleteam-off.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    const target = 4934 - SCENE_TICK0; // turn4-menu.json's own committed capture-range end; the retiring trace's segments continue well past this (through turn 5's own reopen), unlike the deleted turn4-menu.json which stopped here
    outer: for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) {
        state = press(state, seg.buttons ?? []);
        if (state.battleScene !== null && state.battleScene.elapsed >= target) break outer;
      }
    }
    // 4893, not 4892: the "last frame of the 2-frame hold" convention every
    // other CONFIRM/OPEN press tick in this dossier already uses (`newKeys`
    // fires on the FIRST held frame, but `battleScene.elapsed+1` at THAT
    // tick's own `tick()` call lands one tick later in trace-tick terms -
    // same lag `TURN1/2/3_CONFIRM_PRESS_TICK`'s own docs describe).
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(4893 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(4925 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN2_LATEST_HANDOFF);
    expect(state.battleScene!.turn3NextCommandHandoff).toEqual(TURN3_HANDOFF);
    expect(isTurn3NextCommandLifecycleActive(
      state.battleScene!.turn3NextCommandHandoff,
      state.battleScene!.fightSubmenu.openElapsed,
    )).toBe(true);
  });

  it("the turn-4 reopen stays closed until the source-owned completed-turn-3 receipt publishes at elapsed 3172 - an earlier A is dropped and cannot manufacture the epoch", () => {
    let state = stateAtTurn3Confirm();
    const confirmElapsedBefore = state.battleScene!.fightSubmenu.confirmElapsed;
    // Advance only 100 ticks (well before the receipt boundary) then try to
    // reopen. This A is a no-op and cannot publish a handoff.
    for (let i = 0; i < 100; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.turn3NextCommandHandoff).toBeNull();
    // A no-op press leaves the PRIOR (turn 3's own already-confirmed)
    // fightSubmenu state entirely untouched - confirmElapsed stays set
    // (a fresh reopen would reset it to null via `openFightSubmenu`).
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(confirmElapsedBefore);
  });

  it("currentPPForActiveMon: ROCK_SLIDE (slot 0) reads 8/10 from the completed-turn-3 receipt (used turns 1 AND 3), independent of turn 2's slot-2 DRAGON_BREATH receipt", () => {
    const moveset = rentalMoveset("ONIX");
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF)[0]).toBe(moveset.maxPP[0] - 2);
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF)[0]).toBe(8);
    // Sanity: the turn-1 receipt alone (pre-turn-3) still reads 9/10, matching
    // every earlier turn's own pinned behavior - this test doesn't regress it.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, null, null)[0]).toBe(9);
  });

  it("engine state stays well-formed and deterministic through the reopen/confirm-registration window - pixel parity lives in tools/compare/traces/turn4-doubleteam-off.json (256/256, 0 diff)", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn4-doubleteam-off.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    function replay(): EngineState {
      let state = createInitialState({ appRoute: "canonical-recorded" });
      for (const seg of trace.segments) {
        for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
      }
      return state;
    }
    expect(replay().battleScene).toEqual(replay().battleScene);
  });
});

function stateAtTurn4Confirm(): EngineState {
  const initial = createInitialState({ appRoute: "canonical-recorded" });
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: 4925 - SCENE_TICK0,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 4893 - SCENE_TICK0,
        cursor: 0,
        displayCursor: 0,
        closeElapsed: null,
        confirmElapsed: 4925 - SCENE_TICK0,
        activeMonMoveset: ONIX_MOVESET,
        reopenedFromClose: false,
      },
      latestCompletedCommandHandoff: TURN2_LATEST_HANDOFF,
      turn3NextCommandHandoff: TURN3_HANDOFF,
      turn4NextCommandHandoff: null,                     opponentFaintPresentationOwner: null,     },
  };
}

describe("battleMenu/battleScene: completed turn-4 choose-action receipt", () => {
  it("publishes on elapsed 4312, after the rejected handler-install tick and before any turn-5 reopen", () => {
    let state = stateAtTurn4Confirm();
    while (state.battleScene!.elapsed < 4311) state = press(state, []);
    expect(state.battleScene!.turn4NextCommandHandoff ?? null).toBeNull();

    state = press(state, []);

    const handoff = state.battleScene!.turn4NextCommandHandoff;
    expect(state.battleScene!.elapsed).toBe(4312);
    expect(isTurn4NextCommandHandoffReady(handoff)).toBe(true);
    expect(handoff).toMatchObject({
      playerPp: [7, 20, 19, 10],
      persistedMoveSlot: 0,
      hp: { player: 88, opponent: 1 },
      presentationEpoch: { elapsed: 4312 },
    });
  });
});

function stateAtTurn5Confirm(): EngineState {
  const initial = createInitialState({ appRoute: "canonical-recorded" });
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: 5959 - SCENE_TICK0,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 5927 - SCENE_TICK0,
        cursor: 0,
        displayCursor: 0,
        closeElapsed: null,
        confirmElapsed: 5959 - SCENE_TICK0,
        activeMonMoveset: ONIX_MOVESET,
        reopenedFromClose: false,
      },
      latestCompletedCommandHandoff: TURN2_LATEST_HANDOFF,
      turn3NextCommandHandoff: TURN3_HANDOFF,
      turn4NextCommandHandoff: TURN4_HANDOFF,                     opponentFaintPresentationOwner: null,     },
  };
}

describe("battleMenu/battleScene: turn 5's FIGHT-submenu reopen (S7 slice J, docs/battle-turn-notes.md §13/§23)", () => {
  it("the turn-5 open and a B-close/A-reopen consume the one immutable completed-turn-4 receipt", () => {
    let state = stateAtTurn4Confirm();
    while (state.battleScene!.elapsed < 4312) state = press(state, []);
    const receipt = state.battleScene!.turn4NextCommandHandoff;
    expect(isTurn4NextCommandHandoffReady(receipt)).toBe(true);

    state = press(state, ["A"]);
    expect(state.battleScene!.turn4NextCommandHandoff).toBe(receipt);
    for (let i = 0; i < FIGHT_SUBMENU_OPEN_DELAY; i += 1) state = press(state, []);
    state = press(state, ["B"]);
    for (let i = 0; i < FIGHT_SUBMENU_CLOSE_DELAY - 1; i += 1) state = press(state, []);
    state = press(state, ["A"]);

    expect(state.battleScene!.fightSubmenu.reopenedFromClose).toBe(true);
    expect(state.battleScene!.turn4NextCommandHandoff).toBe(receipt);
  });

  it("replaying turn5-menu.json's own committed button script (reopen, NO nav needed, confirm) lands turn 5's own confirm at tick 5959, cursor persisted at 0 (ROCK_SLIDE, unchanged since turn 3), consuming the completed-turn-4 receipt", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn5-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
    }
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(5927 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(5959 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.latestCompletedCommandHandoff).toEqual(TURN2_LATEST_HANDOFF);
    expect(state.battleScene!.turn3NextCommandHandoff).toEqual(TURN3_HANDOFF);
    expect(state.battleScene!.turn4NextCommandHandoff).toEqual(TURN4_HANDOFF);
  });

  it("the turn-4 receipt lifecycle stays closed before its source-owned reset - an early A press is simply dropped, matching turns 1/2/3/4's own reopen-gate precedent", () => {
    let state = stateAtTurn4Confirm();
    const confirmElapsedBefore = state.battleScene!.fightSubmenu.confirmElapsed;
    for (let i = 0; i < 100; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.turn4NextCommandHandoff ?? null).toBeNull();
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(confirmElapsedBefore);
  });

  it("currentPPForActiveMon: ROCK_SLIDE (slot 0) reads 7/10 from the completed-turn-4 receipt (used turns 1, 3 AND 4), independent of turn 2's slot-2 DRAGON_BREATH receipt", () => {
    const moveset = rentalMoveset("ONIX");
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF)[0]).toBe(moveset.maxPP[0] - 3);
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF)[0]).toBe(7);
    // Sanity: the completed-turn-3 receipt alone (pre-turn-5) still reads 8/10, matching
    // slice I's own pinned behavior - this test doesn't regress it.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, null)[0]).toBe(8);
  });

  it("engine state stays well-formed and deterministic through the reopen/confirm-registration window - pixel parity lives in tools/compare/traces/turn5-menu.json (42/42, 0 diff; tick 5927's own former residual RESOLVED, see docs/battle-turn-notes.md §23)", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn5-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    function replay(): EngineState {
      let state = createInitialState({ appRoute: "canonical-recorded" });
      for (const seg of trace.segments) {
        for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
      }
      return state;
    }
    expect(replay().battleScene).toEqual(replay().battleScene);
  });

  it("engine state keeps the completed-turn-4 receipt and cursor 0 through the whole ENDEAVOR-again window - a pure smoke/determinism check, pixel parity lives in tools/compare/traces/turn5-endeavor.json (254/254, 0 diff)", () => {
    let state = stateAtTurn5Confirm();
    for (let i = 0; i < 254; i += 1) state = press(state, []);
    expect(state.battleScene!.turn4NextCommandHandoff).toEqual(TURN4_HANDOFF);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    let replay = stateAtTurn5Confirm();
    for (let i = 0; i < 254; i += 1) replay = press(replay, []);
    expect(replay.battleScene).toEqual(state.battleScene);
  });
});

function stateAtTurn5SitrusConfirm(): EngineState {
  const initial = createInitialState({ appRoute: "canonical-recorded" });
  return {
    ...initial,
    draftScreen: { ...initial.draftScreen, selectedIds: [1, 2, 3, 0, 0, 0] },
    battleScene: {
      elapsed: 5959 - SCENE_TICK0,
      sendOutPressElapsed: 380,
      fightSubmenu: {
        openElapsed: 5927 - SCENE_TICK0,
        cursor: 0,
        displayCursor: 0,
        closeElapsed: null,
        confirmElapsed: 5959 - SCENE_TICK0,
        activeMonMoveset: ONIX_MOVESET,
        reopenedFromClose: false,
      },
      latestCompletedCommandHandoff: TURN2_LATEST_HANDOFF,
      turn3NextCommandHandoff: TURN3_HANDOFF,
      turn4NextCommandHandoff: TURN4_HANDOFF,                     opponentFaintPresentationOwner: null,     },
  };
}

describe("battleMenu/battleScene: turn 6's FIGHT-submenu reopen (S7 slice N rung (a), docs/turn6-notes.md §5)", () => {
  it("replaying turn6-menu.json's own committed button script (reopen, NO nav needed, confirm) lands turn 6's own confirm at tick 7345, cursor persisted at 0 (ROCK_SLIDE, unchanged since turn 3), and installs turn 5's completed-command handoff", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn6-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    for (const seg of trace.segments) {
      for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
    }
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(7313 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(7345 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.turn3NextCommandHandoff).toEqual(TURN3_HANDOFF);
    expect(state.battleScene!.turn4NextCommandHandoff).toEqual(TURN4_HANDOFF);
    expect(state.battleScene!.latestCompletedCommandHandoff).toMatchObject(
      resolveTurn5LatestCompletedCommandHandoff(),
    );
    expect(state.battleScene!.latestCompletedCommandHandoff?.reopenGuard).toBeDefined();
  });

  it("the turn-5-resolved reopen gate stays closed before TURN5_SITRUS_MENU_REOPEN_GATE_DELAY has elapsed past turn 5's own real confirm (5959) - an early A press is simply dropped, matching turns 1-5's own reopen-gate precedent", () => {
    let state = stateAtTurn5SitrusConfirm();
    const confirmElapsedBefore = state.battleScene!.fightSubmenu.confirmElapsed;
    for (let i = 0; i < 100; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.latestCompletedCommandHandoff).toBe(TURN2_LATEST_HANDOFF);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(confirmElapsedBefore);
  });

  it("the reopen gate opens exactly at TURN5_SITRUS_MENU_REOPEN_GATE_DELAY past turn 5's own confirm - idling to the eligible tick then pressing A reopens FIGHT for turn 6", () => {
    let state = stateAtTurn5SitrusConfirm();
    for (let i = 0; i < TURN5_SITRUS_MENU_REOPEN_GATE_DELAY; i += 1) state = press(state, []);
    state = press(state, ["A"]);
    expect(state.battleScene!.latestCompletedCommandHandoff).toMatchObject(
      resolveTurn5LatestCompletedCommandHandoff(),
    );
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBeNull();
  });

  it("currentPPForActiveMon: ROCK_SLIDE (slot 0) reads the completed-turn-5 receipt's 6/10 after uses in turns 1, 3, 4, and 5, independent of turn 2's slot-2 DRAGON_BREATH decrement", () => {
    const moveset = rentalMoveset("ONIX");
    const handoff = resolveTurn5CompletedResolutionNextCommandHandoff();
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, handoff)[0]).toBe(moveset.maxPP[0] - 4);
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, handoff)[0]).toBe(6);
    // Sanity: the completed-turn-4 receipt alone (pre-turn-6) still reads 7/10, matching
    // slice J's own pinned behavior - this test doesn't regress it.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, null)[0]).toBe(7);
  });

  it("S7 slice O: currentPPForActiveMon reads 5/10 from turn 6's completed-command receipt, matching turn 7's reopen ledger", () => {
    const moveset = rentalMoveset("ONIX");
    const turn5Handoff = resolveTurn5CompletedResolutionNextCommandHandoff();
    const turn6Handoff = resolveTurn6CompletedResolutionNextCommandHandoff();
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5Handoff, turn6Handoff)[0]).toBe(moveset.maxPP[0] - 5);
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5Handoff, turn6Handoff)[0]).toBe(5);
    // Sanity: the completed turn-5 receipt alone (pre-turn-7) still reads 6/10.
    expect(currentPPForActiveMon(moveset, TURN1_HANDOFF, TURN2_HANDOFF, TURN3_HANDOFF, TURN4_HANDOFF, turn5Handoff, null)[0]).toBe(6);
  });

  it("replaying turn7-menu.json's existing input script uses turn 6's typed receipt for the following reopen guard", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn7-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    for (const segment of trace.segments) {
      for (let i = 0; i < segment.frames; i += 1) state = press(state, segment.buttons ?? []);
    }

    expect(state.battleScene!.latestCompletedCommandHandoff).toMatchObject(
      resolveTurn6LatestCompletedCommandHandoff(),
    );
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(8347 - SCENE_TICK0);
    // The unchanged script then confirms turn 7's ROCK_SLIDE at 8379; retain
    // that edge as proof this is the live following-command path, not merely
    // a synthetic handoff-shaped state.
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(8379 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(0);
  });

  it("replaying turn8-menu.json's existing input script uses turn 7's typed receipt for the following reopen and persisted-slot command", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn8-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    let state = createInitialState({ appRoute: "canonical-recorded" });
    for (const segment of trace.segments) {
      for (let i = 0; i < segment.frames; i += 1) state = press(state, segment.buttons ?? []);
    }

    expect(state.battleScene!.latestCompletedCommandHandoff).toMatchObject(
      resolveTurn7LatestCompletedCommandHandoff(),
    );
    // The unchanged script opens turn 8 on ROCK_SLIDE, moves RIGHT to BIND,
    // and confirms there. This proves the live next-command path rather than
    // merely a synthetic receipt-shaped state.
    expect(state.battleScene!.fightSubmenu.openElapsed).toBe(9381 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.confirmElapsed).toBe(9425 - SCENE_TICK0);
    expect(state.battleScene!.fightSubmenu.cursor).toBe(1);
  });

  it("engine state stays well-formed and deterministic through the reopen/confirm-registration window - pixel parity lives in tools/compare/traces/turn6-menu.json (33/33, 0 diff, 11 named single-tick bounce-extremum residuals excluded, docs/battle-turn-notes.md's new §27)", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn6-menu.json", import.meta.url), "utf8")) as {
      segments: { frames: number; buttons?: GbaButton[] }[];
    };
    function replay(): EngineState {
      let state = createInitialState({ appRoute: "canonical-recorded" });
      for (const seg of trace.segments) {
        for (let i = 0; i < seg.frames; i += 1) state = press(state, seg.buttons ?? []);
      }
      return state;
    }
    expect(replay().battleScene).toEqual(replay().battleScene);
  });
});

describe("battleScene: turn 6's FEATHER_DANCE kickoff text + the region-A bounce-freeze fix (S7 slice N rung (b), docs/turn6-notes.md §5/§6, battle-turn-notes.md §28)", () => {
  const PRESS_TICK = 7345;

  it("turn6FeatherDanceTextStartTick/turn6FeatherDanceTextVisibleChars: 0 chars before the oracle-confirmed first-changing tick (7358 = pressTick+13), then 1 tick/char through both lines, clamped at the total (docs/turn6-notes.md §5, re-probed this session - tools/compare/scratch/turn6-fd-probe-out)", () => {
    const start = turn6FeatherDanceTextStartTick(PRESS_TICK);
    expect(start).toBe(7358);
    expect(turn6FeatherDanceTextVisibleChars(start - 1, PRESS_TICK)).toBe(0);
    expect(turn6FeatherDanceTextVisibleChars(start, PRESS_TICK)).toBe(1);
    expect(TURN6_FEATHERDANCE_LINE1).toBe("Foe PIDGEOTTO used");
    expect(TURN6_FEATHERDANCE_LINE2).toBe("FEATHERDANCE!");
    expect(TURN6_FEATHERDANCE_TEXT_TOTAL).toBe(TURN6_FEATHERDANCE_LINE1.length + TURN6_FEATHERDANCE_LINE2.length);
    expect(turn6FeatherDanceTextVisibleChars(start + TURN6_FEATHERDANCE_TEXT_TOTAL - 1, PRESS_TICK)).toBe(TURN6_FEATHERDANCE_TEXT_TOTAL);
    expect(turn6FeatherDanceTextVisibleChars(start + 1000, PRESS_TICK)).toBe(TURN6_FEATHERDANCE_TEXT_TOTAL);
  });

  it("the region-A/region-B bounce-freeze fix: freezing at pressTick - TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET lands BOTH gSprites regions on menuIdleBounce's own {0,0} plateau, closing rung (a)'s own named 7348-7350 residual (RAM-probed fresh this session: gSprites[gBattlerSpriteIds[0]] AND gSprites[gHealthboxSpriteIds[0]]'s own y2 are both flat 0 for the entire post-confirm hold, 7347 onward - the raw pressTick anchor rung (a) shipped only matched region B by coincidence, giving region A onixY2=1 instead of the real 0)", () => {
    const frozenAnchor = turn6KickoffBounceTick(PRESS_TICK + 1000, PRESS_TICK);
    expect(frozenAnchor).toBe(PRESS_TICK - TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET);
    const bounce = menuIdleBounce(turn5SitrusResettledBounceTick(frozenAnchor));
    expect(bounce).toEqual({ onixY2: 0, healthboxY2: 0 });
    // Sanity: the OLD (rung (a)) anchor, still exported as `pressTick` itself,
    // is the wrong value this fix moved away from - regression-proofs the fix
    // rather than just re-asserting the new constant.
    const oldAnchorBounce = menuIdleBounce(turn5SitrusResettledBounceTick(PRESS_TICK));
    expect(oldAnchorBounce.onixY2).toBe(1);
  });

  it("effect-success animation gate (docs/turn11-notes.md §5's corrected rationale): FEATHER_DANCE's own feather/starburst animation is NOT modeled this session (genuinely new affine-rotation sprite rendering, gFallingFeatherSpriteTemplate - see battle-turn-notes.md §28's 'what's left') - this session only lands the kickoff text + the settled hold up to the animation's own first RAM-confirmed pixel change (7405, tools/compare/traces/turn6-featherdance.json's own captureFrames stop at 7404). Pin the boundary itself so a future session's animation work can't silently regress this session's own text/hold coverage.", () => {
    const trace = JSON.parse(readFileSync(new URL("../tools/compare/traces/turn6-featherdance.json", import.meta.url), "utf8")) as {
      captureFrames: number[];
    };
    expect(Math.max(...trace.captureFrames)).toBe(7404);
  });
});
