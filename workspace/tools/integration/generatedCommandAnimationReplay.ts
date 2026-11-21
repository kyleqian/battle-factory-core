import { censusDeal } from "./censusRound.ts";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  liveMoveAnimationDuration, liveMoveAnimationPresentation,
} from "../../src/engine/liveMoveAnimation.ts";
import type { GbaButton } from "../../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import type { LiveSpriteOrderHost } from "../../src/engine/liveSpriteOrderHost.ts";

class StallError extends Error {}

export interface OrderHostView {
  known: boolean; free: readonly number[]; occupied: readonly number[]; invalidReason: string | null;
  battlerSlots: Readonly<{ player: number | null; opponent: number | null }>;
  cursor: Readonly<{ requestId: number; segmentIndex: number; nextEventIndex: number; drained: boolean }> | null;
}
function orderHostView(host: LiveSpriteOrderHost | undefined): OrderHostView | undefined {
  if (!host) return undefined;
  const { cursor: plan, battlerSlots } = host.tracker;
  return { known: plan.order.known, free: plan.order.free, occupied: plan.occupied, invalidReason: host.tracker.invalidReason,
    battlerSlots, cursor: host.cursor };
}

/** Legal generated rentals/opponent; only ordinary command input follows generation. */
export function generatedCommandAnimationReplay(
  seed: number, battleScene: "on" | "off",
  moveSlots: readonly (0 | 1 | 2 | 3 | "cancel-party" | { switch: 1 | 2 })[],
  factoryWinStreak = 0,
  /** Stop at the frame budget instead of throwing (forced-replacement party screen when `answerForcedSwitch` is off). */
  allowStall = false,
  /** Answer the forced-replacement party screen with the first healthy member (DOWN -> A -> SEND OUT A), as a player would. */
  answerForcedSwitch = false,
  /** Observer called with the orchestrator state after every stepped frame (read-only; e.g. production frame renders). */
  onFrame?: (state: ReturnType<typeof createFactoryRoundBattleOrchestrator>, frame: number) => void,
  /** The frame budget (sa125: a long route that crosses Scene ON status animations may pass it explicitly). */
  frameBudget = 30000,
) {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-animation-generated-${seed}`, battleScene,
    factoryWinStreak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    // fop1: the census battle of the seed (censusRound.ts), the same battle as before the deal's order was fixed.
    ...censusDeal({ seed, factoryWinStreak }),
  }));
  const animations: Array<{
    moveId: number; attacker: number; player: string; opponent: string;
    ages: number[]; adapterActive: boolean[];
    entryMessage?: { lines: readonly string[]; visibleCharacters: number };
  }> = [];
  const boundaries = [];
  const commands: Array<{
    type: string;
    frame: number;
    command: unknown;
    paletteInputHistoryKnown: boolean | undefined;
    retainedPaletteHistoryKnown: boolean | undefined;
    spriteInputHistoryKnown: boolean | undefined;
    retainedSpriteHistoryKnown: boolean | undefined;
    spriteOrderInput: readonly number[] | undefined;
    /** The lend is a word-free deferred-lend marker (Ice Ball; prep46 words units), resolved at the render seam; `spriteOrderInput` is then []. */
    spriteOrderDeferred?: true;
    retainedSpriteOrderKnown: boolean | undefined;
    /** Live order host after this step (tracker + event cursor), for host == pure-transform checks. */
    orderHostView: OrderHostView | undefined;
  }> = [];
  const requests: Array<BattleMoveAnimationRequest & { frame: number }> = [];
  const semanticEvents: Array<{
    requestId: number;
    segmentIndex: number;
    event: unknown;
  }> = [];
  const observedSegments = new Set<string>();
  let commandKey = "";
  let frame = 0;
  let key = "";
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > frameBudget) throw new StallError(`generated command replay exceeded budget at seed ${seed}`);
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    else throw new Error(`generated command replay lost battle ownership at seed ${seed}`);
    onFrame?.(state, frame);
    const r = state.battleResolutionPresentation;
    if (r) for (let segmentIndex = 0; segmentIndex < r.segments.length; segmentIndex += 1) {
      const segmentKey = `${r.resolutionId.requestId}:${segmentIndex}`;
      if (observedSegments.has(segmentKey)) continue;
      observedSegments.add(segmentKey);
      for (const event of r.segments[segmentIndex]!.events) {
        semanticEvents.push({ requestId: r.resolutionId.requestId, segmentIndex, event });
      }
    }
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    if (command) {
      const currentCommand = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (currentCommand !== commandKey) {
        commandKey = currentCommand;
        // trn181: Scene ON's draw-nothing action-transition pause is not a body; the OFF pause (no marker) stays listed as before.
        if (command.type === "move-animation" && command.actionTransition) return;
        commands.push({
          type: command.type,
          frame,
          command,
          paletteInputHistoryKnown: r.liveMovePaletteInput?.historyKnown,
          retainedPaletteHistoryKnown: state.liveMovePaletteHost?.host.historyKnown,
          spriteInputHistoryKnown: r.liveMoveSpriteAllocatorInput?.historyKnown,
          retainedSpriteHistoryKnown: state.liveMoveSpriteAllocatorHost?.host.historyKnown,
          spriteOrderInput: r.liveMoveSpriteOrderInput?.free,
          ...(r.liveMoveSpriteOrderInput?.deferred === undefined ? {} : { spriteOrderDeferred: true as const }),
          retainedSpriteOrderKnown: state.liveMoveSpriteAllocatorHost?.order.known,
          orderHostView: orderHostView(state.liveMoveSpriteAllocatorHost?.orderHost),
        });
        if (command.type === "move-animation" && command.animation) requests.push({ ...command.animation, frame });
      }
    }
    if (command?.type !== "move-animation" || !command.animation) return;
    const view = createBattleResolutionPresentationRenderView(r);
    // The duration of some bodies (Water Spout) depends on the displayed field.
    if (liveMoveAnimationDuration(command.animation, view.field) === null) return;
    const current = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    const moveEffect = view.effect?.type === "move" ? view.effect : null;
    const adapterActive = moveEffect !== null && liveMoveAnimationPresentation(
      moveEffect.request, view.field, moveEffect.age, moveEffect.paletteInput,
      moveEffect.spriteAllocatorInput, moveEffect.spriteOrderInput,
    ) !== null;
    if (key !== current) {
      key = current;
      animations.push({ moveId: command.animation.moveId, attacker: command.animation.attacker,
        player: view.field.player.name, opponent: view.field.opponent.name,
        ages: [], adapterActive: [],
        ...(view.message ? { entryMessage: view.message } : {}),
      });
    }
    renderBattleResolutionLiveView(new Uint8Array(240 * 160 * 4), view);
    animations.at(-1)!.ages.push(r.lifecycle.phaseElapsed);
    animations.at(-1)!.adapterActive.push(adapterActive);
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); step([button]); step(); };
  // Forced replacement (player faint): the selector's cursor "magby" is the first legal party member.
  const forcedSelector = () => {
    const selector = answerForcedSwitch ? state.battleForcedPartySelect : null;
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!predicate()) {
      const selector = forcedSelector();
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step(
        (state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0)
          ? ["A"] : []);
    }
  };
  until(() => phase() === "action-menu");
  boundaries.push(state.battle!);
  let stalled = false;
  try {
  for (const slot of moveSlots) {
    if (slot === "cancel-party") {
      pulse("DOWN");
      pulse("A");
      until(() => (state.battlePartySelect?.openElapsed ?? -1) >= 62);
      pulse("B");
      until(() => phase() === "action-menu");
      pulse("UP");
      boundaries.push(state.battle!);
      continue;
    }
    if (typeof slot === "object") {
      pulse("DOWN"); // FIGHT -> POKéMON on the ordinary action menu.
      pulse("A");
      until(() => (state.battlePartySelect?.openElapsed ?? -1) >= 62);
      while (state.battlePartySelect!.cursor !== slot.switch) pulse("DOWN");
      pulse("A"); // SEND OUT submenu.
      pulse("A");
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
      boundaries.push(state.battle!);
      continue;
    }
    const forced = state.battleCommandPresentation!.forcedMove ?? null;
    pulse("A");
    if (forced !== null) {
      if (phase() === "no-moves-message") {
        until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
        pulse("A");
      }
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
      boundaries.push(state.battle!);
      continue;
    }
    until(() => phase() === "fight-menu");
    for (let i=0; i<4; i++) {
      const cursor = state.battleCommandPresentation!.fightCursor;
      if (cursor === slot) break;
      pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
    }
    pulse("A");
    until(() => !state.battleCommandPresentation);
    until(() => phase() === "action-menu");
    boundaries.push(state.battle!);
  }
  } catch (error) {
    if (!allowStall || !(error instanceof StallError)) throw error;
    stalled = true;
  }
  return { state, boundaries, animations, requests, commands, semanticEvents, frame, stalled };
}
