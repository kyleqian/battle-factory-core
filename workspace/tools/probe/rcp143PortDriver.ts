/**
 * STEP rcp143 port-side driver: runs a receipt's scenario through the TS
 * full-turn kernel at HEAD and records every RNG draw in order -- reason,
 * pre-draw LCG state and drawn u16 -- so the verify scripts can line the
 * port's sequence up against the ROM receipt's single-step attribution.
 *
 * It reuses the issue140 receipt test's seam (`reduceFactoryFullTurnDecision`
 * through the public decision boundary) and wraps the reducer's `rng.draw`
 * instead of replacing it, so multi-turn continuations keep the kernel's own
 * cursor. The kernel takes the trainer's decision as INPUT and so never runs
 * the Factory AI; the ROM's per-turn AI-selection draws (`BattleAI_SetupAIData`
 * / `ChooseMoveOrAction_Singles`, measured in the receipt) are injected by
 * advancing the state's LCG by exactly that many steps before each turn, and
 * are reported as `kind: "injected-ai"` entries rather than port draws.
 */
import {
  createFactoryFullTurnBattleState,
  reduceFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
  type FactoryFullTurnDecisionRules,
} from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import {
  submitBattleDecision,
  type BattleDecisionReducer,
  type BattleState,
} from "../../src/engine/battleDecisionBoundary.ts";
import { advanceRngValue } from "../../src/engine/rng.ts";

export type PortDraw = Readonly<{
  turn: number;
  kind: "port" | "injected-ai";
  reason: string;
  rngBefore: number;
  value: number;
}>;

export type PortTurnPlan = Readonly<{
  /** ROM AI-selection draws to inject before this turn's decisions. */
  injectAiDraws: number;
  /** Player move slot to submit if the kernel asks the player this turn. */
  playerMoveSlot: 0 | 1 | 2 | 3;
  playerTargetBattler: 0 | 1;
}>;

export type PortEvent = Readonly<{
  turn: number;
  kind: string;
  /** `messageId` for messages, the animation id for animation events, else null. */
  id: string | null;
}>;

export type PortRun = Readonly<{
  draws: readonly PortDraw[];
  events: readonly PortEvent[];
  hpAfterTurn: readonly (readonly [number, number])[];
  stoppedEarly: string | null;
}>;

function inject(state: BattleState<FactoryFullTurnDecisionRules>, count: number, turn: number, draws: PortDraw[]) {
  let value = state.rng.value;
  for (let index = 0; index < count; index += 1) {
    const before = value;
    value = advanceRngValue(value);
    draws.push({ turn, kind: "injected-ai", reason: "ROM AI selection draw (not modeled by the kernel)", rngBefore: before, value: value >>> 16 });
  }
  return { ...state, rng: { value, calls: state.rng.calls + count } } as BattleState<FactoryFullTurnDecisionRules>;
}

export function runPortTurns(config: FactoryFullTurnConfig, plan: readonly PortTurnPlan[]): PortRun {
  const draws: PortDraw[] = [];
  const events: PortEvent[] = [];
  const hpAfterTurn: (readonly [number, number])[] = [];
  let turn = 0;
  const recording: BattleDecisionReducer<FactoryFullTurnDecisionRules> = (context) =>
    reduceFactoryFullTurnDecision({
      ...context,
      rng: {
        draw(reason) {
          const rngBefore = context.rng.snapshot().value;
          const value = context.rng.draw(reason);
          draws.push({ turn, kind: "port", reason, rngBefore, value });
          return value;
        },
        snapshot: context.rng.snapshot,
      },
    });
  let state = createFactoryFullTurnBattleState(config);
  let requestId = config.requestId;
  for (const [index, step] of plan.entries()) {
    turn = index + 1;
    state = inject(state, step.injectAiDraws, turn, draws);
    // One turn = submissions until the trainer's decision has been reduced.
    for (;;) {
      const boundary = state.boundary;
      if (boundary.kind !== "decision-required") {
        return { draws, events, hpAfterTurn, stoppedEarly: `turn ${turn}: boundary ${boundary.kind}` };
      }
      const side = boundary.request.side;
      const result = submitBattleDecision(state, {
        requestId,
        side,
        decision: side === "player"
          ? { kind: "use-move", moveSlot: step.playerMoveSlot, targetBattler: step.playerTargetBattler }
          : { kind: "use-move", moveSlot: 0, targetBattler: 0 },
      }, recording);
      requestId += 1;
      state = result.state;
      for (const event of result.events) {
        const payload = event.payload as Readonly<Record<string, unknown>>;
        const id = payload.messageId ?? payload.animationId ?? payload.animation ?? null;
        events.push({ turn, kind: String(payload.kind), id: id === null ? null : String(id) });
      }
      if (side === "trainer") break;
      if (result.kind !== "decision-required") {
        return { draws, events, hpAfterTurn, stoppedEarly: `turn ${turn}: ${result.kind} after player submission` };
      }
    }
    const battlers = state.rules.rulesContext.battlers;
    hpAfterTurn.push([battlers[0].hp, battlers[1].hp]);
    if (state.boundary.kind !== "decision-required") {
      return { draws, events, hpAfterTurn, stoppedEarly: `after turn ${turn}: boundary ${state.boundary.kind}` };
    }
  }
  return { draws, events, hpAfterTurn, stoppedEarly: null };
}
