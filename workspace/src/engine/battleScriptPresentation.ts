import type { BattleScriptSemanticEvent } from "./battleScriptEvents.ts";
import type { BattleScriptMachineState } from "./battleScriptMachine.ts";

export type BattleScriptPresentationConsumer<PresentationState> = (
  presentation: Readonly<PresentationState>,
  event: BattleScriptSemanticEvent,
) => PresentationState;

export type BattleScriptPresentationReplay<
  RulesContext extends object,
  PresentationState,
> = Readonly<{
  execution: BattleScriptMachineState<RulesContext>;
  presentation: PresentationState;
  eventsConsumed: number;
}>;

/**
 * Presentation receives only the semantic event stream and presentation-local
 * state. The rules execution is returned by identity and presentation output
 * is never interpreted as a rules transition or RNG result.
 */
export function replayBattleScriptPresentation<
  RulesContext extends object,
  PresentationState,
>(
  execution: BattleScriptMachineState<RulesContext>,
  initialPresentation: PresentationState,
  consume: BattleScriptPresentationConsumer<PresentationState>,
): BattleScriptPresentationReplay<RulesContext, PresentationState> {
  let presentation = initialPresentation;
  for (const event of execution.events) {
    presentation = consume(presentation, event);
  }
  return Object.freeze({
    execution,
    presentation,
    eventsConsumed: execution.events.length,
  });
}
