// sum241: the in-battle party menus' action window (SHIFT or SEND OUT / SUMMARY / CANCEL) and the summary screen it opens.
// ROM: Task_HandleSelectionMenuInput + Menu_ProcessInputNoWrapAround_other (A runs the row, B runs CANCEL, UP / DOWN no wrap),
// CursorCb_Summary -> ShowPokemonSummaryScreen(SUMMARY_MODE_LOCK_MOVES, gPlayerParty in battle order, slotId, 2, return),
// CB2_ReturnToPartyMenuFromSummaryScreen (menu back on gLastViewedMonIndex, action window open at row 0).
import { describe, expect, it } from "vitest";
import {
  advanceBattlePartySelect,
  battlePartySelectStateForForcedParty,
  createBattlePartySelectState,
  renderBattlePartySelect,
  SUBMENU_OPEN_VISUAL_DELAY,
  type BattlePartySelectState,
} from "../src/engine/battlePartySelect.ts";
import {
  advancePartySelect,
  CANONICAL_FORCED_SWITCH_PARTY,
  CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
  CANONICAL_FORCED_SWITCH_REQUEST,
  createPartySelectStateFromForcedSwitch,
  INITIAL_PARTY_SELECT_STATE,
  PARTY_LIST_INPUT_ELAPSED,
  type PartySelectState,
} from "../src/engine/partySelect.ts";
import {
  BATTLE_PARTY_SUMMARY_MAX_SLOT,
  movePartyActionCursor,
  partyActionWindowDirection,
  stepBattlePartySummary,
  summaryAilmentFromStatus1,
} from "../src/engine/battlePartySummary.ts";
import { renderBattlePartySummary } from "../src/engine/battlePartySummaryRender.ts";
import { IDENTITY_BATTLE_PARTY_ORDER, switchPartyOrder } from "../src/engine/battlePartyOrder.ts";
import { drawTurn15PartySelectList } from "../src/engine/battleScene.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { createFactoryRentalPresentation, withLiveBattleMember } from "../src/engine/factoryRentalPresentation.ts";
import { renderSummaryInfoPage, renderSummarySkillsPage, renderSummaryBattleMovesPage } from "../src/engine/summaryInfoPage.ts";
import { requestSummaryMonChange, type SummaryScreenState } from "../src/engine/summaryScreen.ts";
import {
  advanceFactoryRoundPresentation,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { BATTLE_SCRIPT_STATUS1_POISON } from "../src/engine/battleScriptSourceConstants.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import type { GbaButton } from "../src/input.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };

const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 31, abilitySlot: (personality & 1) as 0 | 1 };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}

const RECORDS = [record(664), record(678), record(527)] as const;

function liveSelectorParts() {
  let carrier = createFactoryRoundBattleOrchestrator({
    id: "sum241-voluntary",
    rngValue: 4,
    factoryWinStreak: 0,
    playerTrainerId: 0x12345678,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: RECORDS,
      savedRentalRecords: [...RECORDS, record(1), record(2), record(3)],
    },
  });
  const commandId = carrier.round.presentation!.command.commandId;
  carrier = advanceFactoryRoundPresentation(completeFactoryRoundPresentation(carrier, { commandId }));
  const battle = carrier.battle!;
  const request = battle.boundary.kind === "decision-required" && battle.boundary.request.kind === "command"
    ? battle.boundary.request
    : null;
  if (!request) throw new Error("expected live player command");
  return { request, rulesContext: battle.rules.rulesContext };
}

type Key = GbaButton;
const press = <S,>(step: (state: S, keys: ReadonlySet<Key>) => S, state: S, ...keys: Key[]): S => {
  let next = state;
  for (const key of keys) next = step(next, new Set([key]));
  return next;
};
const idle = <S,>(step: (state: S, keys: ReadonlySet<Key>) => S, state: S, ticks: number): S => {
  let next = state;
  for (let i = 0; i < ticks; i += 1) next = step(next, new Set());
  return next;
};
const settleSummary = <S extends { summary: SummaryScreenState | null }>(
  step: (state: S, keys: ReadonlySet<Key>) => S,
  state: S,
): S => {
  let next = state;
  for (let i = 0; i < 200 && !(next.summary?.isOpen && next.summary.transition === null && next.summary.monTransition === null && next.summary.pageTransition === null); i += 1) {
    next = step(next, new Set());
  }
  if (!next.summary?.isOpen) throw new Error("summary never settled");
  return next;
};
const settleReturn = <S extends { summary: SummaryScreenState | null }>(
  step: (state: S, keys: ReadonlySet<Key>) => S,
  state: S,
): S => {
  let next = state;
  for (let i = 0; i < 200 && next.summary !== null; i += 1) next = step(next, new Set());
  if (next.summary !== null) throw new Error("summary never returned");
  return next;
};

/** A live selector whose party has been through a 0 -> 2 switch (rows MACHAMP / HARIYAMA / GRANBULL), with live battle values. */
function switchedVoluntarySelector() {
  const { request, rulesContext } = liveSelectorParts();
  const player = rulesContext.party.player.map((member, index) => index === 1
    ? Object.freeze({ ...member, hp: 41, status1: BATTLE_SCRIPT_STATUS1_POISON, pp: [2, member.pp[1], 0, member.pp[3]] as const, item: 0 })
    : member) as unknown as typeof rulesContext.party.player;
  const switched = Object.freeze({
    ...rulesContext,
    party: Object.freeze({ ...rulesContext.party, player }),
    battlers: Object.freeze([
      Object.freeze({ ...rulesContext.battlers[0]!, partyIndex: 2 }),
      rulesContext.battlers[1]!,
      rulesContext.battlers[2]!,
      rulesContext.battlers[3]!,
    ]) as typeof rulesContext.battlers,
  });
  const order = switchPartyOrder(IDENTITY_BATTLE_PARTY_ORDER, 0, 2);
  return { state: createBattlePartySelectState(request, switched, order, RECORDS), rulesContext: switched };
}

const voluntaryStep = (state: BattlePartySelectState, keys: ReadonlySet<Key>) => advanceBattlePartySelect(state, keys);
const forcedStep = (state: PartySelectState, keys: ReadonlySet<Key>) => advancePartySelect(state, keys);

describe("sum241: the action window's cursor (Menu_ProcessInputNoWrapAround_other)", () => {
  it("moves UP / DOWN without wrapping and ignores a second held direction", () => {
    expect(movePartyActionCursor(0, "UP")).toBe(0);
    expect(movePartyActionCursor(0, "DOWN")).toBe(1);
    expect(movePartyActionCursor(1, "DOWN")).toBe(2);
    expect(movePartyActionCursor(2, "DOWN")).toBe(2);
    expect(movePartyActionCursor(2, "UP")).toBe(1);
    expect(partyActionWindowDirection(new Set(["UP"]))).toBe("UP");
    expect(partyActionWindowDirection(new Set(["DOWN"]))).toBe("DOWN");
    expect(partyActionWindowDirection(new Set(["UP", "DOWN"]))).toBeUndefined();
    expect(partyActionWindowDirection(new Set(["DOWN", "LEFT"]))).toBeUndefined();
    expect(partyActionWindowDirection(new Set(["LEFT"]))).toBeUndefined();
  });

  it("voluntary: opens at SHIFT, walks SUMMARY / CANCEL and back, B closes it (CANCEL) on the same slot", () => {
    const { state } = switchedVoluntarySelector();
    const open = press(voluntaryStep, state, "DOWN", "A");
    expect(open).toMatchObject({ cursor: 1, submenuOpen: true, actionCursor: 0 });
    expect(press(voluntaryStep, open, "DOWN").actionCursor).toBe(1);
    expect(press(voluntaryStep, open, "DOWN", "DOWN").actionCursor).toBe(2);
    expect(press(voluntaryStep, open, "DOWN", "DOWN", "DOWN").actionCursor).toBe(2);
    expect(press(voluntaryStep, open, "DOWN", "DOWN", "UP").actionCursor).toBe(1);
    expect(press(voluntaryStep, open, "UP").actionCursor).toBe(0);
    // LEFT / RIGHT do nothing inside the window.
    expect(press(voluntaryStep, open, "LEFT", "RIGHT")).toMatchObject({ submenuOpen: true, actionCursor: 0, cursor: 1 });
    const closedByB = press(voluntaryStep, open, "DOWN", "B");
    expect(closedByB).toMatchObject({ cursor: 1, submenuOpen: false, actionCursor: 0, summary: null, outcome: null, message: null });
    const closedByCancel = press(voluntaryStep, open, "DOWN", "DOWN", "A");
    expect(closedByCancel).toMatchObject({ cursor: 1, submenuOpen: false, actionCursor: 0, summary: null, outcome: null });
    // Re-opening starts at row 0 again.
    expect(press(voluntaryStep, closedByCancel, "A").actionCursor).toBe(0);
  });

  it("voluntary: SHIFT still confirms the row, and the refusals still close the window", () => {
    const { state } = switchedVoluntarySelector();
    const shifted = press(voluntaryStep, state, "DOWN", "A", "A");
    expect(shifted.outcome).toEqual({ kind: "select", partyIndex: 1 });
    // On the unswitched live menu row 0 is the active GRANBULL: "is already in battle!" closes the window with the message.
    const { request, rulesContext } = liveSelectorParts();
    const identity = createBattlePartySelectState(request, rulesContext, IDENTITY_BATTLE_PARTY_ORDER, RECORDS);
    expect(identity.rows[0]).toMatchObject({ active: true, legal: false, name: "GRANBULL" });
    const refused = press(voluntaryStep, identity, "A", "DOWN", "UP", "A");
    expect(refused).toMatchObject({ submenuOpen: false, actionCursor: 0, message: "GRANBULL is already\nin battle!" });
  });

  it("forced: opens at SEND OUT, no wrap, B / CANCEL close it, SEND OUT and the fainted-slot refusal are unchanged", () => {
    const ready = { ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 1 };
    const open = press(forcedStep, ready, "DOWN", "A");
    expect(open).toMatchObject({ cursor: 1, submenuOpen: true, actionCursor: 0, sendOutElapsed: null });
    expect(press(forcedStep, open, "DOWN", "DOWN", "DOWN").actionCursor).toBe(2);
    expect(press(forcedStep, open, "DOWN", "DOWN", "UP", "UP", "UP").actionCursor).toBe(0);
    expect(press(forcedStep, open, "DOWN", "B")).toMatchObject({ cursor: 1, submenuOpen: false, actionCursor: 0, sendOutElapsed: null });
    expect(press(forcedStep, open, "DOWN", "DOWN", "A")).toMatchObject({ cursor: 1, submenuOpen: false, actionCursor: 0, sendOutElapsed: null });
    expect(press(forcedStep, open, "A").sendOutElapsed).toBe(0);
    const refused = press(forcedStep, ready, "A", "DOWN", "UP", "A");
    expect(refused).toMatchObject({ cursor: 0, submenuOpen: false, actionCursor: 0, message: "ONIX has no energy\nleft to battle!", sendOutElapsed: null });
  });

  it("draws the ▶ on the row under the action cursor and prints SEND OUT for the forced list", () => {
    const { state } = switchedVoluntarySelector();
    const open = { ...press(voluntaryStep, state, "DOWN", "A"), submenuOpenElapsed: SUBMENU_OPEN_VISUAL_DELAY };
    const arrowRow = (fb: Uint8Array, y0: number): boolean => {
      for (let y = y0; y < y0 + 12; y += 1) for (let x = 152; x < 160; x += 1) {
        const o = (y * 240 + x) * 4;
        if (fb[o]! < 120 && fb[o + 1]! < 120 && fb[o + 2]! < 120) return true;
      }
      return false;
    };
    for (const actionCursor of [0, 1, 2] as const) {
      const fb = createFramebuffer();
      renderBattlePartySelect(fb, { ...open, actionCursor });
      expect([arrowRow(fb, 105), arrowRow(fb, 121), arrowRow(fb, 137)]).toEqual([actionCursor === 0, actionCursor === 1, actionCursor === 2]);
    }
    // The forced list's first row is gText_SendOut: its composed window is pixel-identical to the harvested ROM chrome of the
    // anchor's SEND OUT window (slot 1 selected, action cursor on row 0), which drawTurn15PartySelectList draws from ROM pixels.
    const anchor: PartySelectState = { ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED + 40, cursor: 1, submenuOpen: true };
    const harvested = createFramebuffer();
    drawTurn15PartySelectList(harvested, anchor);
    const composed = createFramebuffer();
    renderBattlePartySelect(composed, battlePartySelectStateForForcedParty(anchor));
    let windowDiffs = 0;
    for (let y = 96; y < 160; y += 1) for (let x = 144; x < 240; x += 1) {
      const o = (y * 240 + x) * 4;
      if (harvested[o] !== composed[o] || harvested[o + 1] !== composed[o + 1] || harvested[o + 2] !== composed[o + 2]) windowDiffs += 1;
    }
    expect(windowDiffs).toBe(0);
    // "SEND OUT" is wider than "SHIFT": ink past x 200 on the first row only for the forced list.
    const inkPast200 = (fb: Uint8Array): boolean => {
      for (let y = 105; y < 117; y += 1) for (let x = 200; x < 236; x += 1) {
        const o = (y * 240 + x) * 4;
        if (fb[o]! < 120 && fb[o + 1]! < 120 && fb[o + 2]! < 120) return true;
      }
      return false;
    };
    const voluntary = createFramebuffer();
    renderBattlePartySelect(voluntary, open);
    expect(inkPast200(composed)).toBe(true);
    expect(inkPast200(voluntary)).toBe(false);
    // The anchor chrome's "submenu" frame is slot 1's: with the window opened on the fainted slot 0 the composed renderer draws
    // (the harvested frame would highlight slot 1).
    const onOnix = createFramebuffer();
    drawTurn15PartySelectList(onOnix, { ...anchor, cursor: 0 });
    const expected = createFramebuffer();
    renderBattlePartySelect(expected, battlePartySelectStateForForcedParty({ ...anchor, cursor: 0 }));
    expect(Buffer.from(onOnix).equals(Buffer.from(expected))).toBe(true);
  });
});

describe("sum241: SUMMARY from the voluntary menu", () => {
  it("opens the summary on the row under the cursor, in battle order, with the live HP / PP / item / ailment", () => {
    const { state, rulesContext } = switchedVoluntarySelector();
    expect(state.rows.map((row) => row.speciesKey)).toEqual(["SPECIES_MACHAMP", "SPECIES_HARIYAMA", "SPECIES_GRANBULL"]);
    expect(state.summaryMons!.map((mon) => mon.species)).toEqual(["SPECIES_MACHAMP", "SPECIES_HARIYAMA", "SPECIES_GRANBULL"]);
    const hariyama = rulesContext.party.player[1]!;
    const shown = state.summaryMons![1];
    expect(shown.stats.hp).toBe(41);
    expect(shown.stats.maxHp).toBe(hariyama.maxHP);
    expect(shown.moves.map((move) => move.currentPp)).toEqual([2, hariyama.pp[1], 0, hariyama.pp[3]]);
    expect(shown.moves.map((move) => move.id)).toEqual([...hariyama.moves]);
    expect(shown.item).toEqual({ item: "ITEM_NONE", name: "NONE" });
    expect(shown.ailment).toBe("poison");
    expect(state.summaryMons![0].ailment).toBeNull();
    expect(state.summaryMons![0].stats.hp).toBe(rulesContext.party.player[2]!.hp);
    const opened = press(voluntaryStep, state, "DOWN", "A", "DOWN", "A");
    expect(opened.summary).toMatchObject({ selectedSlot: 1, mode: "SUMMARY_MODE_LOCK_MOVES", returnTarget: "battleParty", page: "info" });
    expect(opened.summary!.transition).toEqual({ direction: "toSummary", phase: "fadingOut", elapsed: 0 });
    expect(opened.outcome).toBeNull();
    // Keys during the entry fade are dropped; the summary settles on the Info page of row 1.
    const settled = settleSummary(voluntaryStep, press(voluntaryStep, opened, "A", "B", "DOWN"));
    expect(settled.summary).toMatchObject({ selectedSlot: 1, page: "info", isOpen: true });
  });

  it("Up / Down flip mons within the three rows, Left / Right flip pages, A opens the locked move list, B and A-on-Info close", () => {
    const { state } = switchedVoluntarySelector();
    let s = settleSummary(voluntaryStep, press(voluntaryStep, state, "A", "DOWN", "A"));
    expect(s.summary!.selectedSlot).toBe(0);
    expect(press(voluntaryStep, s, "UP").summary!.monTransition).toBeNull();
    s = settleSummary(voluntaryStep, press(voluntaryStep, s, "DOWN"));
    expect(s.summary!.selectedSlot).toBe(1);
    s = settleSummary(voluntaryStep, press(voluntaryStep, s, "DOWN"));
    expect(s.summary!.selectedSlot).toBe(2);
    expect(press(voluntaryStep, s, "DOWN").summary).toMatchObject({ selectedSlot: 2, monTransition: null });
    s = settleSummary(voluntaryStep, press(voluntaryStep, s, "RIGHT"));
    expect(s.summary!.page).toBe("skills");
    s = settleSummary(voluntaryStep, press(voluntaryStep, s, "RIGHT"));
    expect(s.summary!.page).toBe("battleMoves");
    const selecting = press(voluntaryStep, s, "A");
    expect(selecting.summary!.moveSelect).not.toBeNull();
    const back = idle(voluntaryStep, press(voluntaryStep, idle(voluntaryStep, selecting, 4), "B"), 6);
    expect(back.summary).toMatchObject({ moveSelect: null, isOpen: true, page: "battleMoves" });
    s = settleSummary(voluntaryStep, press(voluntaryStep, back, "RIGHT"));
    expect(s.summary!.page).toBe("contestMoves");
    expect(press(voluntaryStep, s, "RIGHT").summary!.pageTransition).toBeNull();
    const closing = press(voluntaryStep, s, "B");
    expect(closing.summary!.transition).toEqual({ direction: "toDraft", phase: "fadingOut", elapsed: 0 });
    // A on the Info page closes too (Task_HandleInput's A branch on PSS_PAGE_INFO).
    const onInfo = settleSummary(voluntaryStep, press(voluntaryStep, state, "A", "DOWN", "A"));
    expect(press(voluntaryStep, onInfo, "A").summary!.transition?.direction).toBe("toDraft");
  });

  it("returns to the menu on the last viewed mon with the action window open at SHIFT, and SHIFT then confirms that mon", () => {
    const { state } = switchedVoluntarySelector();
    let s = settleSummary(voluntaryStep, press(voluntaryStep, state, "A", "DOWN", "A"));
    s = settleSummary(voluntaryStep, press(voluntaryStep, s, "DOWN"));
    s = settleSummary(voluntaryStep, press(voluntaryStep, s, "DOWN"));
    const closingOnTwo = press(voluntaryStep, s, "B");
    // The re-inited menu's fields land on the exit edge (the fade-in reveals them); the summary is still in flight.
    expect(closingOnTwo).toMatchObject({ cursor: 2, rightColumnCursor: 2, submenuOpen: true, actionCursor: 0, message: null });
    expect(closingOnTwo.summary).not.toBeNull();
    const returnedOnTwo = settleReturn(voluntaryStep, closingOnTwo);
    expect(returnedOnTwo).toMatchObject({ summary: null, cursor: 2, submenuOpen: true, actionCursor: 0, outcome: null, closeElapsed: null });
    expect(returnedOnTwo.submenuOpenElapsed).toBeGreaterThanOrEqual(SUBMENU_OPEN_VISUAL_DELAY);
    // Row 2 is raw party index 0, which this request lists as illegal: SHIFT there still refuses through the message window.
    expect(press(voluntaryStep, returnedOnTwo, "A")).toMatchObject({ submenuOpen: false, message: "GRANBULL is already\nin battle!" });
    // Viewed down to row 1 (HARIYAMA, legal) instead: CANCEL closes the window on that slot; re-opening and SHIFT sends it out.
    let viewed = settleSummary(voluntaryStep, press(voluntaryStep, state, "A", "DOWN", "A"));
    viewed = settleSummary(voluntaryStep, press(voluntaryStep, viewed, "DOWN"));
    const returned = settleReturn(voluntaryStep, press(voluntaryStep, viewed, "B"));
    expect(returned).toMatchObject({ summary: null, cursor: 1, rightColumnCursor: 1, submenuOpen: true, actionCursor: 0 });
    const cancelled = press(voluntaryStep, returned, "DOWN", "DOWN", "A");
    expect(cancelled).toMatchObject({ cursor: 1, submenuOpen: false, actionCursor: 0 });
    expect(press(voluntaryStep, cancelled, "A", "A").outcome).toEqual({ kind: "select", partyIndex: 1 });
  });

  it("throws on SUMMARY when the menu was built without rental records", () => {
    const { request, rulesContext } = liveSelectorParts();
    const state = createBattlePartySelectState(request, rulesContext);
    expect(state.summaryMons).toBeNull();
    expect(() => press(voluntaryStep, state, "A", "DOWN", "A")).toThrow(/rental records/);
  });
});

describe("sum241: SUMMARY from the forced menu", () => {
  const ready = { ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 1 };

  it("lists the rows' rentals with the menu's HP / status when no live party is given, and the live party's values when it is", () => {
    expect(INITIAL_PARTY_SELECT_STATE.summaryMons.map((mon) => mon.species)).toEqual(["SPECIES_ONIX", "SPECIES_MAGBY", "SPECIES_BAYLEEF"]);
    expect(INITIAL_PARTY_SELECT_STATE.summaryMons[0]).toMatchObject({ ailment: "faint", stats: { hp: 0, maxHp: 117 } });
    expect(INITIAL_PARTY_SELECT_STATE.summaryMons[1]).toMatchObject({ ailment: null, stats: { hp: 138, maxHp: 138 } });
    const live = CANONICAL_FORCED_SWITCH_RENTAL_RECORDS.map((rec, index) => {
      const member = createFactoryCorpusPartyMember(rec);
      if (index === 0) return { ...member, hp: 0 };
      return index === 2 ? { ...member, hp: 9, status1: BATTLE_SCRIPT_STATUS1_POISON, pp: [1, 1, 1, 1] as const } : member;
    });
    const forced = createPartySelectStateFromForcedSwitch(
      CANONICAL_FORCED_SWITCH_REQUEST,
      CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
      CANONICAL_FORCED_SWITCH_PARTY,
      IDENTITY_BATTLE_PARTY_ORDER,
      live,
    );
    expect(forced.summaryMons[2]).toMatchObject({ species: "SPECIES_BAYLEEF", ailment: "poison", stats: { hp: 9 } });
    expect(forced.summaryMons[2].moves.map((move) => move.currentPp)).toEqual([1, 1, 1, 1]);
    expect(forced.summaryMons[0]).toMatchObject({ ailment: "faint", stats: { hp: 0 } });
  });

  it("opens on the row under the cursor, flips within the three rows, and returns with the window open on the last viewed mon", () => {
    const opened = press(forcedStep, ready, "DOWN", "DOWN", "A", "DOWN", "A");
    expect(opened.summary).toMatchObject({ selectedSlot: 2, mode: "SUMMARY_MODE_LOCK_MOVES" });
    expect(opened.sendOutElapsed).toBeNull();
    let s = settleSummary(forcedStep, opened);
    expect(press(forcedStep, s, "DOWN").summary!.monTransition).toBeNull();
    s = settleSummary(forcedStep, press(forcedStep, s, "UP"));
    expect(s.summary!.selectedSlot).toBe(1);
    s = settleSummary(forcedStep, press(forcedStep, s, "UP"));
    expect(s.summary!.selectedSlot).toBe(0);
    s = settleSummary(forcedStep, press(forcedStep, s, "RIGHT"));
    expect(s.summary!.page).toBe("skills");
    const closing = press(forcedStep, s, "B");
    expect(closing).toMatchObject({ cursor: 0, submenuOpen: true, actionCursor: 0, message: null, sendOutElapsed: null });
    const returned = settleReturn(forcedStep, closing);
    expect(returned).toMatchObject({ summary: null, cursor: 0, submenuOpen: true, actionCursor: 0, sendOutElapsed: null });
    // SEND OUT on the fainted ONIX still refuses; CANCEL, DOWN, SEND OUT on MAGBY still confirms.
    expect(press(forcedStep, returned, "A").message).toBe("ONIX has no energy\nleft to battle!");
    const magby = press(forcedStep, returned, "B", "DOWN", "A", "A");
    expect(magby).toMatchObject({ cursor: 1, sendOutElapsed: 0 });
  });

  it("projects the action cursor and the summary into the shared renderer state", () => {
    const opened = press(forcedStep, ready, "DOWN", "A", "DOWN");
    const projected = battlePartySelectStateForForcedParty(opened);
    expect(projected).toMatchObject({ actions: "sendOut", actionCursor: 1, summary: null, submenuOpen: true });
    expect(projected.summaryMons).toBe(opened.summaryMons);
    const inSummary = press(forcedStep, opened, "A");
    expect(battlePartySelectStateForForcedParty(inSummary).summary).toBe(inSummary.summary);
  });
});

describe("sum241: the summary's mon bound and ailment", () => {
  it("clamps the mon change at the given maxSlot", () => {
    const base: SummaryScreenState = {
      transition: null, isOpen: true, onInfoPage: true, pageTransition: null, monTransition: null, moveSelect: null,
      openElapsed: 70, monAnimClock: null, selectedSlot: BATTLE_PARTY_SUMMARY_MAX_SLOT, page: "info",
      mode: "SUMMARY_MODE_LOCK_MOVES", returnTarget: "battleParty",
    };
    expect(requestSummaryMonChange(base, "down", BATTLE_PARTY_SUMMARY_MAX_SLOT).monTransition).toBeNull();
    expect(requestSummaryMonChange(base, "down").monTransition).not.toBeNull();
    expect(requestSummaryMonChange(base, "up", BATTLE_PARTY_SUMMARY_MAX_SLOT).monTransition).toMatchObject({ fromSlot: 2, toSlot: 1 });
    const mons = INITIAL_PARTY_SELECT_STATE.summaryMons;
    expect(stepBattlePartySummary(base, new Set(["DOWN"]), mons).monTransition).toBeNull();
    expect(stepBattlePartySummary(base, new Set(["UP"]), mons).monTransition).not.toBeNull();
  });

  it("maps HP and status1 to GetMonAilment's icon", () => {
    expect(summaryAilmentFromStatus1(0, BATTLE_SCRIPT_STATUS1_POISON)).toBe("faint");
    expect(summaryAilmentFromStatus1(5, BATTLE_SCRIPT_STATUS1_POISON)).toBe("poison");
    expect(summaryAilmentFromStatus1(5, 0)).toBeNull();
  });

  it("draws the status strip, the STATUS label and the icon for an ailment, and nothing new for a healthy mon", () => {
    const base = createFactoryRentalPresentation(record(664));
    const member = createFactoryCorpusPartyMember(record(664));
    const healthy = withLiveBattleMember(base, { hp: member.maxHP, maxHP: member.maxHP, item: member.item, moves: member.moves, pp: member.pp, ailment: null });
    expect(Buffer.from(renderSummaryInfoPage([healthy], 0)).equals(Buffer.from(renderSummaryInfoPage([base], 0)))).toBe(true);
    const poisoned = withLiveBattleMember(base, { hp: 23, maxHP: member.maxHP, item: 0, moves: member.moves, pp: [3, 10, 0, 15], ailment: "poison" });
    const plain = renderSummaryInfoPage([base], 0);
    const info = renderSummaryInfoPage([poisoned], 0);
    const skills = renderSummarySkillsPage([poisoned], 0);
    const moves = renderSummaryBattleMovesPage([poisoned], 0);
    const region = (fb: Uint8Array, x0: number, y0: number, x1: number, y1: number): number => {
      let differs = 0;
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
        const o = (y * 240 + x) * 4;
        if (fb[o] !== plain[o] || fb[o + 1] !== plain[o + 1] || fb[o + 2] !== plain[o + 2]) differs += 1;
      }
      return differs;
    };
    // sStatusSlidingWindow1 strip (0,18)-(10,20) tiles and the "STATUS" label (window 13 at (2,1)) differ from the closed strip.
    expect(region(info, 0, 144, 80, 160)).toBeGreaterThan(200);
    expect(region(skills, 0, 144, 48, 160)).toBeGreaterThan(50);
    // CreateSetStatusSprite's 32x8 icon centred at (64,152) uses the status-icon palette on every page.
    expect(region(info, 48, 148, 80, 156)).toBeGreaterThan(40);
    expect(region(moves, 48, 148, 80, 156)).toBeGreaterThan(40);
    // The Moves pages clear the STATUS label window: no label ink left of the icon.
    const labelInk = (fb: Uint8Array): number => {
      let ink = 0;
      for (let y = 146; y < 158; y += 1) for (let x = 2; x < 40; x += 1) {
        const o = (y * 240 + x) * 4;
        if (fb[o]! > 200 && fb[o + 1]! > 200 && fb[o + 2]! > 200) ink += 1;
      }
      return ink;
    };
    expect(labelInk(info)).toBeGreaterThan(30);
    expect(labelInk(skills)).toBeGreaterThan(30);
    expect(labelInk(moves)).toBe(0);
  });

  it("renders the party menu as the fade host and the summary pages once settled", () => {
    const { state } = switchedVoluntarySelector();
    const opened = press(voluntaryStep, state, "DOWN", "A", "DOWN", "A");
    const hostCalls: number[] = [];
    const host = (fb: Uint8Array): void => { hostCalls.push(1); renderBattlePartySelect(fb, opened); };
    const entry = createFramebuffer();
    renderBattlePartySummary(entry, opened.summary!, opened.summaryMons, host);
    expect(hostCalls).toHaveLength(1);
    const menu = createFramebuffer();
    renderBattlePartySelect(menu, opened);
    // Fade tick 0 is before the first blend step: the host frame itself.
    expect(Buffer.from(entry).equals(Buffer.from(menu))).toBe(true);
    const settled = settleSummary(voluntaryStep, opened);
    const frame = createFramebuffer();
    renderBattlePartySummary(frame, settled.summary!, settled.summaryMons, host);
    const expected = renderSummaryInfoPage(settled.summaryMons!, 1, settled.summary!.openElapsed + 1, false);
    expect(Buffer.from(frame).equals(Buffer.from(expected))).toBe(true);
    expect(() => renderBattlePartySummary(frame, settled.summary!, null, host)).toThrow(/summary presentations/);
  });
});
