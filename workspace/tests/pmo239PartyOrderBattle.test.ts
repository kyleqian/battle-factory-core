// pmo239: the orchestrator folds the kernel's player `switch` events into the ROM's gBattlePartyCurrentOrder (SwitchPartyOrder), so on
// whole census battles (Roar / Whirlwind drag the player out; faints force send-outs) the invariants of the ROM's order hold at every frame:
// the order permutes the party, the active mon sits at row 0 at each command boundary, and a forced menu shows the fainted mon at row 0.
import { censusDeal } from "../tools/integration/censusRound.ts";
import { describe, expect, it } from "vitest";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator";
import { battlePartyDisplayRows, getPartyIdFromBattleSlot, isIdentityBattlePartyOrder } from "../src/engine/battlePartyOrder";
import { PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect";
import type { GbaButton } from "../src/input";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../src/engine/battleCommandPresentation.ts";

const FRAME_BUDGET = 200000;

function playBattle(seed: number, scene: "on" | "off") {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `pmo239-${seed}`, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    ...censusDeal({ seed, factoryWinStreak: (seed * 11) % 49 }),
  }));
  let frame = 0;
  let ended = false;
  let nonIdentityFrames = 0;
  let commandBoundaries = 0;
  let forcedMenus = 0;
  let forcedNonIdentity = 0;
  const forcedRowZero: number[] = [];
  const violations: string[] = [];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    if (!owned()) ended = true;
    if (state.battle === null) return;
    const order = state.partyOrder;
    try { battlePartyDisplayRows(order); } catch (error) { violations.push(`frame ${frame}: ${(error as Error).message}`); }
    if (!isIdentityBattlePartyOrder(order)) nonIdentityFrames += 1;
    const boundary = state.battle.boundary;
    if (state.battleCommandPresentation && boundary.kind === "decision-required" && boundary.request.kind === "command") {
      commandBoundaries += 1;
      const active = state.battle.rules.rulesContext.battlers[0]!.partyIndex;
      if (getPartyIdFromBattleSlot(order, 0) !== active) violations.push(`frame ${frame}: row 0 is ${getPartyIdFromBattleSlot(order, 0)}, active ${active}`);
    }
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended) step([button]); if (!ended) step(); };
  const seenForced = new Set<unknown>();
  const forcedSelector = () => {
    const selector = state.battleForcedPartySelect;
    if (selector && !seenForced.has(selector.request)) {
      seenForced.add(selector.request);
      forcedMenus += 1;
      forcedRowZero.push(selector.party[0].partyIndex);
      if (!isIdentityBattlePartyOrder(state.partyOrder)) forcedNonIdentity += 1;
      if (selector.party[0].partyIndex !== selector.request.faintedPartyIndex) {
        violations.push(`frame ${frame}: forced menu row 0 is ${selector.party[0].partyIndex}, fainted ${selector.request.faintedPartyIndex}`);
      }
      if (selector.cursor !== 0) violations.push(`frame ${frame}: forced menu opens on ${String(selector.cursor)}`);
    }
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!ended && !predicate()) {
      const selector = forcedSelector();
      if (selector) {
        const onLegal = typeof selector.cursor === "number" && selector.party[selector.cursor]!.legal;
        pulse(selector.message !== null || selector.submenuOpen || onLegal ? "A" : "DOWN");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  until(() => phase() === "action-menu");
  while (!ended) {
    const forcedSlot = state.battleCommandPresentation?.forcedMove?.decision.moveSlot ?? null;
    pulse("A");
    if (forcedSlot !== null) {
      if (phase() === "no-moves-message") {
        until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
        pulse("A");
      }
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
      continue;
    }
    until(() => phase() === "fight-menu");
    if (ended) break;
    pulse("A");
    until(() => !state.battleCommandPresentation);
    until(() => phase() === "action-menu");
  }
  return { violations, nonIdentityFrames, commandBoundaries, forcedMenus, forcedNonIdentity, forcedRowZero };
}

describe.each([["Roar", 23], ["Whirlwind", 76]] as const)("pmo239: %s drags the player out (census seed %i)", (_move, seed) => {
  for (const scene of ["off", "on"] as const) {
    it(`Scene ${scene.toUpperCase()}: the folded order keeps the ROM's invariants on every frame`, () => {
      const result = playBattle(seed, scene);
      expect(result.violations).toEqual([]);
      expect(result.commandBoundaries).toBeGreaterThan(0);
      expect(result.nonIdentityFrames).toBeGreaterThan(0);
    }, 120000);
  }
});

describe("pmo239: the second forced send-out after a faint replacement (census seed 0)", () => {
  for (const scene of ["off", "on"] as const) {
    it(`Scene ${scene.toUpperCase()}: the menu opens in battle order, the just-fainted replacement at row 0`, () => {
      const result = playBattle(0, scene);
      expect(result.violations).toEqual([]);
      // ONIX faints first (identity order, row 0); its replacement MAGBY (raw 1) takes row 0 and ONIX row 1 ([1, 0, 2]); when MAGBY
      // faints the menu lists MAGBY first, then ONIX, then BAYLEEF.
      expect(result.forcedRowZero).toEqual([0, 1]);
      expect(result.forcedNonIdentity).toBe(1);
    }, 120000);
  }
});
