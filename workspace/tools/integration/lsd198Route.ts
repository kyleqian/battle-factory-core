// lsd198: the production presentation commands of a staged Leech Seed turn (lsd186Production) threaded through the orchestrator's own prepareResolutionPalette,
// one prepare per command exactly as the battle route does (the known-entry order host after the turn's action prompt, the x2 history host, the palette host).
// Returns each command's prepared resolution (the sprite-order lend, the battler x2 inputs, the ordinary x2 history). Read-only use of production.
import { createLiveBattlerX2Host } from "../../src/engine/liveBattlerX2History.ts";
import { createLiveSpriteOrderHost, beginLiveSpriteOrderTurn, liveSpriteOrderHostOrder } from "../../src/engine/liveSpriteOrderHost.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { prepareResolutionPalette } from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { lsd186Production } from "./lsd186Production.ts";

export function lsd198Route(o: { seederSide: "player" | "opponent"; seed: number; onixMove?: number; scene?: "on" }) {
  const prod = lsd186Production({ scene: o.scene ?? "on", seederSide: o.seederSide, seed: o.seed, onixMove: o.onixMove ?? 33 });
  const commands = prod.commands as any[];
  const callStart = 0;
  const orderHost = beginLiveSpriteOrderTurn(createLiveSpriteOrderHost(knownEntrySpriteOrderState("ordinary-factory")), 1, true, false);
  let orchestratorState: any = {
    config: { battleScene: "on" }, activeBattleCallStart: callStart,
    liveMoveSpriteAllocatorHost: { battleCallStart: callStart, commandKey: "", host: createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove,
      order: liveSpriteOrderHostOrder(orderHost), orderHost },
    liveBattlerX2Host: { battleCallStart: callStart, commandKey: "", host: createLiveBattlerX2Host() },
  };
  const resolutionAt = (commandIndex: number, phaseElapsed: number) => ({
    field: prod.field, resolutionId: { requestId: 1 }, segments: [{ field: prod.field, beforeRules: prod.beforeRules, afterRules: prod.afterRules, events: prod.events, commands }],
    segmentIndex: 0, commandIndex, lifecycle: { phase: "presenting", phaseElapsed }, confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
  });
  const prepared: any[] = [];
  for (let k = 0; k < commands.length; k++) {
    orchestratorState = prepareResolutionPalette({ ...orchestratorState, battleResolutionPresentation: resolutionAt(k, 0) });
    prepared.push(orchestratorState.battleResolutionPresentation);
  }
  const at = (k: number, phaseElapsed: number) => ({ ...prepared[k], lifecycle: { phase: "presenting", phaseElapsed } });
  return { prod, commands, prepared, at, field: prod.field };
}
