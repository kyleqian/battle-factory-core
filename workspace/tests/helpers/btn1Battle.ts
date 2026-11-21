// btn1: a census-style battle (battle i = seed i, streak i * 11 % 49, rentals 0..2, least-used legal move: the off108 / sub157 loop) that
// stops the first frame a presented command satisfies `stop`, so a test can feed its own presses from there.
import { censusDeal } from "../../tools/integration/censusRound.ts";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
  type FactoryRoundBattleOrchestratorState,
} from "../../src/engine/factoryRoundBattleOrchestrator";
import { liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";
import type { GbaButton } from "../../src/input";

export type BattleCursor = Readonly<{
  state: FactoryRoundBattleOrchestratorState;
  step: (buttons?: readonly GbaButton[]) => void;
  frame: () => number;
  ended: () => boolean;
}>;

export type CurrentMessage = Readonly<{ messageId: string | null; command: any; resolution: any }>;

export function currentMessage(state: FactoryRoundBattleOrchestratorState): CurrentMessage | null {
  const resolution = state.battleResolutionPresentation as any;
  const segment = resolution?.segments[resolution.segmentIndex];
  const command = segment?.commands[resolution.commandIndex];
  if (!command || command.type !== "message") return null;
  const payload = segment.events.find((event: any) => event.sequence === command.eventSequence)?.payload;
  return { messageId: payload && "messageId" in payload ? payload.messageId : null, command, resolution };
}

/** Plays seed `seed` (mashing A at the dismiss prompts) until `stop` holds on a frame; returns the cursor, or null if the battle ends first. */
export function playCensusBattleUntil(
  seed: number,
  scene: "on" | "off",
  stop: (state: FactoryRoundBattleOrchestratorState) => boolean,
): { cursor: { state: () => FactoryRoundBattleOrchestratorState; step: (buttons?: readonly GbaButton[]) => void; ended: () => boolean }; found: boolean } {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    ...censusDeal({ seed, factoryWinStreak: (seed * 11) % 49 }),
  }));
  let rng = createPresentationRngSession();
  let frame = 0;
  let ended = false;
  let found = false;
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > 200000) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended && !found) step([button]); if (!ended && !found) step(); };
  const forcedSelector = () => {
    const selector = state.battleForcedPartySelect;
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!ended && !found && !predicate()) {
      if (stop(state)) { found = true; return; }
      const selector = forcedSelector();
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  until(() => phase() === "action-menu");
  while (!ended && !found) {
    const forcedSlot = state.battleCommandPresentation?.forcedMove?.decision.moveSlot ?? null;
    pulse("A");
    if (forcedSlot !== null) {
      slotUses[forcedSlot]!++;
      if (phase() === "no-moves-message") {
        until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
        pulse("A");
      }
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
      continue;
    }
    until(() => phase() === "fight-menu");
    if (ended || found) break;
    const menu = state.battleCommandPresentation!;
    const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
    const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
    slotUses[slot]!++;
    for (let i = 0; i < 4; i++) {
      const cursor = state.battleCommandPresentation!.fightCursor;
      if (cursor === slot) break;
      pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
    }
    pulse("A");
    until(() => !state.battleCommandPresentation);
    until(() => phase() === "action-menu");
  }
  return { cursor: { state: () => state, step, ended: () => ended }, found };
}

/** The first frame a presented message command with this STRINGID and a prompt gate is current (the piece index counts the gated pieces of that id). */
export function stopAtGatedMessage(messageId: string, piece = 0) {
  let seen = -1;
  let lastKey = "";
  return (state: FactoryRoundBattleOrchestratorState): boolean => {
    const message = currentMessage(state);
    if (message === null || message.messageId !== messageId || message.command.promptGate !== true) return false;
    const key = `${message.resolution.segmentIndex}:${message.resolution.commandIndex}`;
    if (key !== lastKey) { lastKey = key; seen += 1; }
    return seen === piece && message.resolution.lifecycle.phaseElapsed === 0 && message.resolution.lifecycle.phase === "presenting";
  };
}
