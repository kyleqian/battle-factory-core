// contain209 (docs/finish-plan.md Phase 1 "Containment"): a throw raised while computing or drawing ONE battle-resolution
// presentation command degrades that command to the existing decline path (the static field) instead of ending the game.
// The seams that catch are narrow and presentation-only:
//   - liveMoveAnimationDuration (liveMoveAnimation.ts): live adapter selection; a throw declines the body (null).
//   - isBattleResolutionCommandComplete (battleResolutionPresentationRender.ts): the command's duration; a throw holds the
//     command for its fallback length (the declined move's seGate + minimumFrames, else timing.minimumFrames).
//   - renderBattleResolutionPresentation (same file): the per-frame draw; a throw draws the static field instead.
// Gameplay (kernel / round / facility / RNG / damage) is never wrapped and still reaches the crash overlay / advance() caller.
//
// contain213 adds the tick-side presentation seams contain209 left open. Each degrades to the narrowest state that keeps the
// kernel's already-decided outcome reachable; none can change a gameplay value (the kernel ran before any of them):
//   - "field": render-view reads inside tick() (containedBattleResolutionRenderView / containedBattleResolutionDisplayedField,
//     battleResolutionPresentationRender.ts): the forced / action continuation's segment boundary field and the postwin /
//     return-hold frozen scene. A throw from the view's guards (e.g. the HP endpoint) falls back to the view without the current
//     command's own presentation (the field already displayed before it); the field read alone falls back once more to the
//     segment field with every completed command applied, skipping any command whose application throws. A frozen scene whose
//     command-less view throws too is not contained.
//   - "commands": turning a kernel receipt into presentation commands (projectResolutionSegmentCommands,
//     battleResolutionPresentation.ts; the fresh resolution and every appended continuation segment). A throw presents the span as
//     one typed switch-in per active battler whose party slot the receipt changed (the kernel's after-receipt snapshot; the
//     display ledger and the forced send-out need it) and then a turn-end (TURN_END_TIMING), which settles the display ledger to
//     the kernel's rules boundary -- so the next action menu / round end shows the outcome. The receipt's events stay on the
//     segment unchanged. The structural guards before projection (legal decision, sequence order, request identity) stay fatal.
//   - "order": the per-command presentation host update (prepareResolutionPalette, factoryRoundBattleOrchestrator.ts: palette,
//     allocator, sprite-order and battler-x2 hosts and the command's inputs). A throw invalidates all four hosts (the existing
//     unknown-history state later adapters decline / classify on) and drops the current command's inputs; the next frame runs the
//     update again from the unknown hosts. Likewise the presentation-only ledger extras of commitCompletedResolutionCommand
//     (Substitute doll, semi-invulnerable hide, Castform forms) keep their earlier value on a throw. withResolutionLifecycle is a
//     pure freeze and cannot throw. The ledger's HP / status / party checks against the kernel stay fatal.
//
// Degradation is sticky per command object (the frozen command in the presentation queue): once degraded, every later frame of
// that command draws static without retrying the live path. Tick-side degradation (adapter, duration) is a pure function of the
// command and its displayed field, so timing and the presentation RNG follow the trace. A draw-time throw cannot change the
// command's length (render never feeds tick): the command keeps its scheduled length and draws the static field from the first
// rendered frame that threw.
//
// Contained errors are kept in a bounded module-level list (first CONTAINED_PRESENTATION_ERROR_LIMIT distinct errors, deduped
// by command type + message) so headless callers (the soak, the bench ABI) and the browser session export can see them.

export type ContainedPresentationSite = "adapter" | "duration" | "draw" | "field" | "commands" | "order";

export type ContainedPresentationError = Readonly<{
  /** 1-based ordinal over distinct errors since the last clear. */
  ordinal: number;
  site: ContainedPresentationSite;
  commandType: string;
  message: string;
  stack: string | null;
  /** Where in the presentation queue (request:segment:command @age) or which move, when the seam knows it. */
  detail: string | null;
}>;

export const CONTAINED_PRESENTATION_ERROR_LIMIT = 32;

const errors: ContainedPresentationError[] = [];
const seen = new Set<string>();
let distinct = 0;

/** 1: draw the decline path (the static draw of the ordinary view); 2: the ordinary view itself threw (the command's own view dropped). */
export type PresentationDegradation = 1 | 2;
const degraded = new WeakMap<object, PresentationDegradation>();

/** Records one contained error (deduped by command type + message); returns true when it was new. */
export function recordContainedPresentationError(
  site: ContainedPresentationSite,
  commandType: string,
  error: unknown,
  detail: string | null = null,
): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const key = `${commandType}|${message}`;
  if (seen.has(key)) return false;
  seen.add(key);
  distinct += 1;
  if (errors.length < CONTAINED_PRESENTATION_ERROR_LIMIT) {
    errors.push(Object.freeze({
      ordinal: distinct, site, commandType, message,
      stack: error instanceof Error ? error.stack ?? null : null,
      detail,
    }));
  }
  return true;
}

/** The recorded contained errors (bounded), oldest first. */
export function containedPresentationErrors(): readonly ContainedPresentationError[] {
  return errors.slice();
}

/** Distinct contained errors since the last clear (may exceed the bounded list's length). */
export function containedPresentationErrorCount(): number {
  return distinct;
}

/** Forgets the recorded errors (the soak clears per seed; a fresh session starts clean). Degraded commands stay degraded. */
export function clearContainedPresentationErrors(): void {
  errors.length = 0;
  seen.clear();
  distinct = 0;
}

export function presentationCommandDegradation(command: object): PresentationDegradation | undefined {
  return degraded.get(command);
}

/** Marks a command degraded (never lowers an existing level). */
export function markPresentationCommandDegraded(command: object, level: PresentationDegradation): void {
  if ((degraded.get(command) ?? 0) < level) degraded.set(command, level);
}
