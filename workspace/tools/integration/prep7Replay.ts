// prep7 copy (adds spriteOrderInput known/free head per move request) of generatedCommandAnimationReplay.ts: records the displayed field (names/HP) at each move-animation command start.
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
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";

class StallError extends Error {}

/** Legal generated rentals/opponent; only ordinary command input follows generation. */
export function prep7Replay(
  seed: number, battleScene: "on" | "off",
  moveSlots: readonly (0 | 1 | 2 | 3 | "cancel-party" | { switch: 1 | 2 })[],
  factoryWinStreak = 0,
  /** Stop at the frame budget instead of throwing (forced-replacement party screen: the driver cannot answer it). */
  allowStall = false,
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
  }> = [];
  const requests: Array<BattleMoveAnimationRequest & { frame: number; field?: unknown; orderInput?: unknown }> = [];
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
    if (++frame > 30000) throw new StallError(`generated command replay exceeded budget at seed ${seed}`);
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    else throw new Error(`generated command replay lost battle ownership at seed ${seed}`);
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
        commands.push({
          type: command.type,
          frame,
          command,
          paletteInputHistoryKnown: r.liveMovePaletteInput?.historyKnown,
          retainedPaletteHistoryKnown: state.liveMovePaletteHost?.host.historyKnown,
          spriteInputHistoryKnown: r.liveMoveSpriteAllocatorInput?.historyKnown,
          retainedSpriteHistoryKnown: state.liveMoveSpriteAllocatorHost?.host.historyKnown,
        });
        if (command.type === "move-animation" && command.animation) {
          const v = createBattleResolutionPresentationRenderView(r);
          const f = v.field as any;
          requests.push({ ...command.animation, frame, orderInput: ((v.effect as any)?.type === "move" && (v.effect as any).spriteOrderInput) ? { known: true, freeHead: ((v.effect as any).spriteOrderInput.free as number[]).slice(0, 6) } : { known: false }, field: { player: { name: f.player.name, hp: f.player.hp, maxHP: f.player.maxHP, species: f.player.species, status: f.player.status, gender: f.player.gender }, opponent: { name: f.opponent.name, hp: f.opponent.hp, maxHP: f.opponent.maxHP, species: f.opponent.species, status: f.opponent.status, gender: f.opponent.gender } } });
        }
      }
    }
    if (command?.type !== "move-animation" || !command.animation || liveMoveAnimationDuration(command.animation) === null) return;
    const current = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    const view = createBattleResolutionPresentationRenderView(r);
    const moveEffect = view.effect?.type === "move" ? view.effect : null;
    const adapterActive = moveEffect !== null && liveMoveAnimationPresentation(
      moveEffect.request, view.field, moveEffect.age, moveEffect.paletteInput,
      moveEffect.spriteAllocatorInput,
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
  const until = (predicate: () => boolean) => {
    while (!predicate()) step(
      (state.battleStartIntro && frame % 16 === 0)
      || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0)
        ? ["A"] : []);
  };
  const pulse = (button: GbaButton) => { step(); step([button]); step(); };
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
    pulse("A");
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
