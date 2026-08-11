import { describe, expect, it } from "vitest";
import {
  resolveTurn1CompletedResolutionNextCommandHandoff,
  resolveTurn1FightCommandPresentation,
  resolveTurn1LatestCompletedCommandHandoff,
} from "../src/engine/turn1ResolutionAdapter.ts";
import {
  isTurn2NextCommandHandoffReady,
  resolveTurn2CompletedResolutionNextCommandHandoff,
  resolveTurn2FightCommandPresentation,
  resolveTurn2LatestCompletedCommandHandoff,
  turn2FightCommandPresentationFromLatest,
} from "../src/engine/turn2ResolutionAdapter.ts";
import {
  isTurn3NextCommandHandoffReady,
  resolveTurn3CompletedResolutionNextCommandHandoff,
  resolveTurn3FightCommandPresentation,
  resolveTurn3LatestCompletedCommandHandoff,
  turn3FightCommandPresentationFromLatest,
} from "../src/engine/turn3ResolutionAdapter.ts";
import {
  resolveTurn4CompletedResolutionNextCommandHandoff,
  resolveTurn4FightCommandPresentation,
  resolveTurn4LatestCompletedCommandHandoff,
} from "../src/engine/turn4ResolutionAdapter.ts";
import type { LatestCompletedCommandHandoff } from "../src/engine/nextCommandHandoff.ts";
import {
  ROCK_SLIDE_LINE1,
  ROCK_SLIDE_LINE2,
  STAT_ROSE_LINE1,
  STAT_ROSE_LINE2,
  TURN6_SUPER_EFFECTIVE_LINE,
} from "../src/engine/battleMenu.ts";

/**
 * Slice-2 prerequisite pin
 * (`docs/battlescene-turnN-typeref-retirement-design.md` §2.4/§4 slice-2
 * row): §2.4 pins `resolveTurn5FightCommandPresentation()` ..
 * `resolveTurn13FightCommandPresentation()` against hand-authored
 * `LEGACY_TURNn_FIGHT_COMMAND_PRESENTATION` fixtures
 * (`tests/battleScene.test.ts`'s own "dispatcher slices 3-4:
 * FightCommandPresentation shadow equivalence" describe block, line 218) but
 * says plainly "no equivalent equivalence test exists yet for turns 1-4/5"
 * -- that gap is what slice 2 needs closed before it cuts Family P/Q's
 * turn1-4 slots. There is no `LEGACY_TURN1..4_FIGHT_COMMAND_PRESENTATION`
 * fixture to mirror (turns 1-4 never had a standalone legacy
 * `FightCommandPresentation`-shaped object -- their Family Q/R draw
 * functions read the positional `TurnNCompletedResolutionNextCommandHandoff`
 * ABI directly), so this file hand-derives the expected field/HP/bounce/
 * upcoming shape from each adapter's own literal constants
 * (`src/engine/turn{1,2,3,4}ResolutionAdapter.ts`) and from sibling
 * presentation-staging modules whose own test files already pin the exact
 * same values independently, and asserts exact equality the same way the
 * Family-S block does.
 *
 * Export-site note: the design doc's own §2.4 prose describes these as
 * "already exported" without naming a file; `rg -n
 * 'resolveTurn[1-4]FightCommandPresentation'` shows they live in
 * `turn1ResolutionAdapter.ts`/`turn2ResolutionAdapter.ts`/
 * `turn3ResolutionAdapter.ts`/`turn4ResolutionAdapter.ts` (one per turn),
 * not in `fightCommandPresentation.ts` (that module owns only the shared
 * `FightCommandPresentation` type and the `createFightCommandPresentation`/
 * `fightCommand*BounceEpochTick` helpers every adapter calls into).
 */

// The same runtime elapsed anchors tests/battleScene.test.ts's own
// TURN1_LATEST_HANDOFF..TURN4_LATEST_HANDOFF constants already use
// (battleScene.test.ts:209-212) -- reused verbatim as a cross-check that
// this file's own handoffs aren't a fresh, uncorroborated set of ticks.
const TURN1_PRESENTATION_EPOCH_ELAPSED = 1308;
const TURN2_PRESENTATION_EPOCH_ELAPSED = 2197;
const TURN3_PRESENTATION_EPOCH_ELAPSED = 3172;
const TURN4_PRESENTATION_EPOCH_ELAPSED = 4312;

// The presentation epoch's mon/healthbox bounce-table seed triple is the
// same literal on every one of turn1ResolutionAdapter.ts/turn2.../turn3.../
// turn4ResolutionAdapter.ts's own resolveTurnNCompletedResolutionNextCommandHandoff
// (seed 192/delta 7/amplitude 1 for mon, seed 128/delta 7/amplitude 1 for
// healthbox) -- reproduced here once since all four turns share it verbatim.
const PRESENTATION_EPOCH_MON = Object.freeze({ seed: 192 as const, delta: 7 as const, amplitude: 1 as const });
const PRESENTATION_EPOCH_HEALTHBOX = Object.freeze({ seed: 128 as const, delta: 7 as const, amplitude: 1 as const });

describe("slice-2 prerequisite: resolveTurn1..4FightCommandPresentation pinned against hand-derived facts", () => {
  it("turn 1: field HP 117/101 (handoff literal), null upcoming, frozenBounceEpochTick kickoff anchor", () => {
    // Field HP 117 (Onix, handoff.hp.player) / 101 (Grovyle, handoff.hp.opponent),
    // max HP 117/143 (ONIX_MAX_HP/GROVYLE_MAX_HP, turn1ResolutionAdapter.ts:29-30
    // -- the same pair every one of turn1-4/10-13ResolutionAdapter.ts's own
    // ONIX_MAX_HP/GROVYLE_MAX_HP constants repeats), all four literal in
    // resolveTurn1CompletedResolutionNextCommandHandoff (turn1ResolutionAdapter.ts:71-88).
    // Bounce facts: TURN1_IDLE_BOUNCE_EPOCH_TICK=1748, TURN1_FIGHT_SUBMENU_BOUNCE_OFFSET=-2,
    // TURN1_FOLLOWING_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS=9,
    // TURN1_FOLLOWING_KICKOFF_FROZEN_BOUNCE_EPOCH_TICK=2119
    // (turn1ResolutionAdapter.ts:22-28). `upcoming: null` because turn 1's
    // own adapter doc says so explicitly (turn1ResolutionAdapter.ts:93-95:
    // "upcoming remains null because turns 2-4 retain their dedicated
    // command-content owners until their own migration slices").
    const handoff = resolveTurn1CompletedResolutionNextCommandHandoff(TURN1_PRESENTATION_EPOCH_ELAPSED);
    expect(handoff.hp).toEqual({ player: 117, opponent: 101 });

    const presentation = resolveTurn1FightCommandPresentation(handoff);
    expect(presentation).toEqual({
      field: {
        player: {
          species: "ONIX",
          displayName: "ONIX",
          level: 50,
          gender: "male",
          status: "none",
          hp: { current: 117, max: 117 },
          attackStage: 6,
        },
        opponent: {
          species: "GROVYLE",
          displayName: "GROVYLE",
          level: 50,
          gender: "male",
          status: "none",
          hp: { current: 101, max: 143 },
          attackStage: 6,
        },
      },
      bounce: {
        actionMenuRedrawTick: TURN1_PRESENTATION_EPOCH_ELAPSED,
        idleBounceEpochTick: 1748,
        fightSubmenuTickOffset: -2,
        kickoff: {
          freezeAfterConfirmTicks: 9,
          preFreezeTickOffset: -2,
          frozenBounceEpochTick: 2119,
        },
      },
      presentationEpoch: {
        owner: "HandleInputChooseAction",
        reset: "DoBounceEffect",
        elapsed: TURN1_PRESENTATION_EPOCH_ELAPSED,
        mon: PRESENTATION_EPOCH_MON,
        healthbox: PRESENTATION_EPOCH_HEALTHBOX,
      },
      upcoming: null,
    });
    expect(Object.hasOwn(presentation, "turn")).toBe(false);
    expect(Object.hasOwn(presentation, "pp")).toBe(false);
  });

  it("turn 2: field HP 101/88, ENDEAVOR+ROCK_SLIDE upcoming stream, frozenPressTickOffset kickoff anchor", () => {
    // Field HP 101/88 literal (turn2ResolutionAdapter.ts:70-78). Bounce facts:
    // TURN2_IDLE_BOUNCE_EPOCH_TICK=1748, TURN3_FIGHT_SUBMENU_BOUNCE_OFFSET=-3,
    // TURN3_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS=3, TURN3_KICKOFF_FROZEN_PRESS_OFFSET=6
    // (turn2ResolutionAdapter.ts:26-32). ENDEAVOR text "Foe GROVYLE
    // used"/"ENDEAVOR!" and hpChange {101 -> 88} independently pinned by
    // tests/turn2EndeavorPresentationStaging.test.ts's own
    // resolveTurn2EndeavorAttackLines/resolveTurn2EndeavorHpEndpoints
    // assertions (lines 206-212). ROCK_SLIDE text is turn 1's own attack
    // line, cross-checked here against battleMenu.ts's independently
    // pixel-confirmed ROCK_SLIDE_LINE1/2 ("ONIX used"/"ROCK SLIDE!",
    // battleMenu.ts:1649-1651) rather than retyped. hpChange {88 -> 41} is
    // tests/turn3RockSlidePresentationStaging.test.ts's own pinned
    // resolveTurn3RockSlideHpEndpoints() result (line 294). The
    // "It's super effective!" effectiveness line is cross-checked against
    // battleMenu.ts's own independently pixel-confirmed
    // TURN6_SUPER_EFFECTIVE_LINE (battleMenu.ts:2330, same curly-apostrophe
    // glyph, same ROCK-vs-FLYING 2x text) rather than retyped by hand.
    const handoff = resolveTurn2CompletedResolutionNextCommandHandoff(TURN2_PRESENTATION_EPOCH_ELAPSED);
    expect(handoff.hp).toEqual({ player: 101, opponent: 88 });

    const presentation = resolveTurn2FightCommandPresentation(handoff);
    expect(presentation).toEqual({
      field: {
        player: {
          species: "ONIX",
          displayName: "ONIX",
          level: 50,
          gender: "male",
          status: "none",
          hp: { current: 101, max: 117 },
          attackStage: 6,
        },
        opponent: {
          species: "GROVYLE",
          displayName: "GROVYLE",
          level: 50,
          gender: "male",
          status: "none",
          hp: { current: 88, max: 143 },
          attackStage: 6,
        },
      },
      bounce: {
        actionMenuRedrawTick: TURN2_PRESENTATION_EPOCH_ELAPSED,
        idleBounceEpochTick: 1748,
        fightSubmenuTickOffset: -3,
        kickoff: {
          freezeAfterConfirmTicks: 3,
          preFreezeTickOffset: -3,
          frozenPressTickOffset: 6,
        },
      },
      presentationEpoch: {
        owner: "HandleInputChooseAction",
        reset: "DoBounceEffect",
        elapsed: TURN2_PRESENTATION_EPOCH_ELAPSED,
        mon: PRESENTATION_EPOCH_MON,
        healthbox: PRESENTATION_EPOCH_HEALTHBOX,
      },
      upcoming: {
        firstTextStartDelay: 9,
        moves: [
          {
            user: "opponent",
            target: "player",
            move: "ENDEAVOR",
            text: { lines: ["Foe GROVYLE used", "ENDEAVOR!"] },
            hpChange: { target: "player", from: 101, to: 88 },
          },
          {
            user: "player",
            target: "opponent",
            move: "ROCK_SLIDE",
            text: { lines: [ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2] },
            hpChange: { target: "opponent", from: 88, to: 41 },
            effectiveness: { text: { lines: [TURN6_SUPER_EFFECTIVE_LINE] } },
          },
        ],
      },
    });
    expect(Object.hasOwn(presentation, "turn")).toBe(false);
    expect(Object.hasOwn(presentation, "pp")).toBe(false);
  });

  it("turn 3: field HP 88/41, DOUBLE_TEAM(statChange)+ROCK_SLIDE upcoming stream", () => {
    // Field HP 88/41 literal (turn3ResolutionAdapter.ts:74-82). Bounce
    // facts: TURN3_IDLE_BOUNCE_EPOCH_TICK=1748, TURN4_FIGHT_SUBMENU_BOUNCE_OFFSET=-2,
    // TURN4_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS=3, TURN4_KICKOFF_FROZEN_PRESS_OFFSET=-13
    // (turn3ResolutionAdapter.ts:30-36). DOUBLE_TEAM kickoff text "Foe
    // GROVYLE used"/"DOUBLE TEAM!" and its evasion stat-stage-change
    // {battler 1, evasion, 7 -> 8} are independently pinned by
    // tests/turn4DoubleTeamPresentationStaging.test.ts (lines 344-355,
    // resolveTurn4DoubleTeamKickoffLines/resolveTurn4DoubleTeamWindowContent).
    // The stat-rise banner text is turn3ResolutionAdapter.ts's own import of
    // battleMenu.ts's STAT_ROSE_LINE1/2 ("Foe GROVYLE's evasiveness"/"rose!",
    // battleMenu.ts:1634-1635), reused here rather than retyped. ROCK_SLIDE
    // text is turn 1's line (battleMenu.ts's ROCK_SLIDE_LINE1/2, as in turn
    // 2 above); hpChange {41 -> 1} is
    // tests/turn4RockSlidePresentationStaging.test.ts's own pinned
    // resolveTurn4RockSlideHpEndpoints() result (line 431).
    const handoff = resolveTurn3CompletedResolutionNextCommandHandoff(TURN3_PRESENTATION_EPOCH_ELAPSED);
    expect(handoff.hp).toEqual({ player: 88, opponent: 41 });

    const presentation = resolveTurn3FightCommandPresentation(handoff);
    expect(presentation).toEqual({
      field: {
        player: {
          species: "ONIX",
          displayName: "ONIX",
          level: 50,
          gender: "male",
          status: "none",
          hp: { current: 88, max: 117 },
          attackStage: 6,
        },
        opponent: {
          species: "GROVYLE",
          displayName: "GROVYLE",
          level: 50,
          gender: "male",
          status: "none",
          hp: { current: 41, max: 143 },
          attackStage: 6,
        },
      },
      bounce: {
        actionMenuRedrawTick: TURN3_PRESENTATION_EPOCH_ELAPSED,
        idleBounceEpochTick: 1748,
        fightSubmenuTickOffset: -2,
        kickoff: {
          freezeAfterConfirmTicks: 3,
          preFreezeTickOffset: -2,
          frozenPressTickOffset: -13,
        },
      },
      presentationEpoch: {
        owner: "HandleInputChooseAction",
        reset: "DoBounceEffect",
        elapsed: TURN3_PRESENTATION_EPOCH_ELAPSED,
        mon: PRESENTATION_EPOCH_MON,
        healthbox: PRESENTATION_EPOCH_HEALTHBOX,
      },
      upcoming: {
        firstTextStartDelay: 0,
        moves: [
          {
            user: "opponent",
            target: "opponent",
            move: "DOUBLE_TEAM",
            text: { lines: ["Foe GROVYLE used", "DOUBLE TEAM!"] },
            statChange: {
              target: "opponent",
              stat: "evasion",
              from: 7,
              to: 8,
              text: { lines: [STAT_ROSE_LINE1, STAT_ROSE_LINE2] },
            },
          },
          {
            user: "player",
            target: "opponent",
            move: "ROCK_SLIDE",
            text: { lines: [ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2] },
            hpChange: { target: "opponent", from: 41, to: 1 },
          },
        ],
      },
    });
    expect(Object.hasOwn(presentation, "turn")).toBe(false);
    expect(Object.hasOwn(presentation, "pp")).toBe(false);
  });

  it("turn 4: field HP 88/1, ENDEAVOR+ROCK_SLIDE(faint) upcoming stream, -236 continuation-lag kickoff anchor", () => {
    // Field HP 88/1 literal (turn4ResolutionAdapter.ts:86-94). Bounce facts:
    // TURN4_IDLE_BOUNCE_EPOCH_TICK=1748, TURN5_FIGHT_SUBMENU_BOUNCE_OFFSET=-236
    // (turn4ResolutionAdapter.ts:40's own doc: folds the ordinary -2 submenu
    // shift together with the -234 Scene-ON continuation lag,
    // TURN5_KICKOFF_FREEZE_AFTER_CONFIRM_TICKS=3,
    // TURN5_KICKOFF_FROZEN_PRESS_OFFSET = TURN5_FIGHT_SUBMENU_BOUNCE_OFFSET = -236
    // (turn4ResolutionAdapter.ts:30-48). ENDEAVOR text/hpChange {88 -> 1} is
    // tests/turn5EndeavorPresentationStaging.test.ts's own pinned
    // resolveTurn5EndeavorAttackLines/resolveTurn5EndeavorHpEndpoints
    // (lines 494-499). ROCK_SLIDE text is turn 1's line again; its hpChange
    // is {from: resolveTurn4RockSlideHpEndpoints().to, to:
    // resolveTurn5FaintWindowKoHp()} per turn4ResolutionAdapter.ts:116-119 --
    // 1 (tests/turn4RockSlidePresentationStaging.test.ts:431's own pinned
    // `.to`) and 0 (tests/turn5FaintPresentationStaging.test.ts:551's own
    // pinned resolveTurn5FaintWindowKoHp()). The faint line "Foe
    // GROVYLE"/"fainted!" is that same file's pinned
    // resolveTurn5FaintWindowLines() (line 547).
    const handoff = resolveTurn4CompletedResolutionNextCommandHandoff(TURN4_PRESENTATION_EPOCH_ELAPSED);
    expect(handoff.hp).toEqual({ player: 88, opponent: 1 });

    const presentation = resolveTurn4FightCommandPresentation(handoff);
    expect(presentation).toEqual({
      field: {
        player: {
          species: "ONIX",
          displayName: "ONIX",
          level: 50,
          gender: "male",
          status: "none",
          hp: { current: 88, max: 117 },
          attackStage: 6,
        },
        opponent: {
          species: "GROVYLE",
          displayName: "GROVYLE",
          level: 50,
          gender: "male",
          status: "none",
          hp: { current: 1, max: 143 },
          attackStage: 6,
        },
      },
      bounce: {
        actionMenuRedrawTick: TURN4_PRESENTATION_EPOCH_ELAPSED,
        idleBounceEpochTick: 1748,
        fightSubmenuTickOffset: -236,
        kickoff: {
          freezeAfterConfirmTicks: 3,
          preFreezeTickOffset: -236,
          frozenPressTickOffset: -236,
        },
      },
      presentationEpoch: {
        owner: "HandleInputChooseAction",
        reset: "DoBounceEffect",
        elapsed: TURN4_PRESENTATION_EPOCH_ELAPSED,
        mon: PRESENTATION_EPOCH_MON,
        healthbox: PRESENTATION_EPOCH_HEALTHBOX,
      },
      upcoming: {
        firstTextStartDelay: 0,
        moves: [
          {
            user: "opponent",
            target: "player",
            move: "ENDEAVOR",
            text: { lines: ["Foe GROVYLE used", "ENDEAVOR!"] },
            hpChange: { target: "player", from: 88, to: 1 },
          },
          {
            user: "player",
            target: "opponent",
            move: "ROCK_SLIDE",
            text: { lines: [ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2] },
            hpChange: { target: "opponent", from: 1, to: 0 },
            faint: { target: "opponent", text: { lines: ["Foe GROVYLE", "fainted!"] } },
          },
        ],
      },
    });
    expect(Object.hasOwn(presentation, "turn")).toBe(false);
    expect(Object.hasOwn(presentation, "pp")).toBe(false);
  });
});

/**
 * Slice 3 pin (`docs/battlescene-turnN-typeref-retirement-design.md` §4.1
 * row 3, "Idle-content shim + trivial-null callers"): before
 * `drawActionMenuIdleContentFromLatest` exists, pin the fire/no-fire split
 * of `drawActionMenuIdleContent`'s own HP-overlay guard (battleScene.ts:
 * `if (isTurn3NextCommandHandoffReady(turn3NextCommandHandoff) ||
 * isTurn2NextCommandHandoffReady(turn2NextCommandHandoff))
 * drawPlayerHealthboxHpOverlay(...)`) across turns 1-4, both for the legacy
 * positional-argument shapes real call sites use (§4.2's call-site map) and
 * for the generic `latest`-only accessor the new shim will read instead.
 * Every predicate/bridge function used below (`isTurn2/3NextCommandHandoff
 * Ready`, `turn2/3CompletedResolutionNextCommandHandoffFromLatest`) is
 * already exported from `turn2ResolutionAdapter.ts`/`turn3ResolutionAdapter
 * .ts` today -- these cases are green against the legacy body alone, no
 * production edit required to pass.
 */
describe("slice 3: drawActionMenuIdleContent's HP-overlay guard fires for turn-2/3, not turn-1/4", () => {
  const turn2Handoff = resolveTurn2CompletedResolutionNextCommandHandoff(TURN2_PRESENTATION_EPOCH_ELAPSED);
  const turn3Handoff = resolveTurn3CompletedResolutionNextCommandHandoff(TURN3_PRESENTATION_EPOCH_ELAPSED);
  const turn4Handoff = resolveTurn4CompletedResolutionNextCommandHandoff(TURN4_PRESENTATION_EPOCH_ELAPSED);

  const latest1 = resolveTurn1LatestCompletedCommandHandoff(TURN1_PRESENTATION_EPOCH_ELAPSED);
  const latest2 = resolveTurn2LatestCompletedCommandHandoff(TURN2_PRESENTATION_EPOCH_ELAPSED);
  const latest3 = resolveTurn3LatestCompletedCommandHandoff(TURN3_PRESENTATION_EPOCH_ELAPSED);
  const latest4 = resolveTurn4LatestCompletedCommandHandoff(TURN4_PRESENTATION_EPOCH_ELAPSED, latest3);

  // Extracted verbatim from `drawActionMenuIdleContent`'s own guard line --
  // the same two predicates over the same two positional slots, not a
  // re-derivation.
  function legacyHpOverlayGuardFires(
    turn2NextCommandHandoff: Parameters<typeof isTurn2NextCommandHandoffReady>[0],
    turn3NextCommandHandoff: Parameters<typeof isTurn3NextCommandHandoffReady>[0],
  ): boolean {
    return isTurn3NextCommandHandoffReady(turn3NextCommandHandoff)
      || isTurn2NextCommandHandoffReady(turn2NextCommandHandoff);
  }

  // The exact expression the new shim (`drawActionMenuIdleContentFromLatest`)
  // runs: `latest` carries turn-2 or turn-3 content, read via the same
  // already-exported `turnNFightCommandPresentationFromLatest` narrowing
  // functions `drawFightSubmenuWindow`'s own generic locals already use
  // (battleScene.ts, e.g. its `genericTurn2Content`/`genericTurn3Content`).
  function genericHpOverlayGuardFires(latest: LatestCompletedCommandHandoff | null): boolean {
    return turn2FightCommandPresentationFromLatest(latest) !== null
      || turn3FightCommandPresentationFromLatest(latest) !== null;
  }

  it("turn 1: does NOT fire -- drawTurnKickoffText's own (fb, tick, null) call shape carries no turn2/3 slot", () => {
    expect(legacyHpOverlayGuardFires(null, null)).toBe(false);
    expect(genericHpOverlayGuardFires(latest1)).toBe(false);
    // Both callers this slice migrates pass a literal `null` latest, same as latest1's shape.
    expect(genericHpOverlayGuardFires(null)).toBe(false);
  });

  it("turn 2: fires -- drawDragonBreathTurnEndSettledMenu's own (fb, bounceTick, turn1, turn2) call shape", () => {
    expect(legacyHpOverlayGuardFires(turn2Handoff, null)).toBe(true);
    expect(genericHpOverlayGuardFires(latest2)).toBe(true);
  });

  it("turn 3: fires -- drawTurn3RockSlideTurnEndSettledMenu's own (fb, bounceTick, null, null, turn3.hp.player, turn3) call shape", () => {
    expect(legacyHpOverlayGuardFires(null, turn3Handoff)).toBe(true);
    expect(genericHpOverlayGuardFires(latest3)).toBe(true);
  });

  it("turn 4: does NOT fire -- drawTurn4RockSlideTurnEndSettledMenu's real turn4 handoff lands in the guard's dead 7th slot", () => {
    // turn4NextCommandHandoff is real (non-null) but is not one of the
    // guard's own two read slots (turn2/turn3) -- the guard's own two
    // arguments are both null for this call site's shape.
    expect(turn4Handoff.hp.player).toBe(88);
    expect(legacyHpOverlayGuardFires(null, null)).toBe(false);
    expect(genericHpOverlayGuardFires(latest4)).toBe(false);
  });
});
