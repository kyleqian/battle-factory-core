// contain209 (docs/finish-plan.md Phase 1 "Containment"): a throw raised while computing or drawing ONE battle-resolution
// presentation command degrades that command to the existing decline path (the static field) instead of ending the game.
// The seams that catch are narrow and presentation-only:
//   - liveMoveAnimationDuration (liveMoveAnimation.ts): live adapter selection; a throw declines the body (null).
//   - isBattleResolutionCommandComplete (battleResolutionPresentationRender.ts): the command's duration; a throw holds the
//     command for its fallback length (the declined move's seGate + minimumFrames, else timing.minimumFrames).
//   - renderBattleResolutionPresentation (same file): the per-frame draw; a throw draws the static field instead.
// Gameplay (kernel / round / facility / RNG / damage) is never wrapped and still reaches the crash overlay / advance() caller.
//
// Degradation is sticky per command object (the frozen command in the presentation queue): once degraded, every later frame of
// that command draws static without retrying the live path. Tick-side degradation (adapter, duration) is a pure function of the
// command and its displayed field, so timing and the presentation RNG follow the trace. A draw-time throw cannot change the
// command's length (render never feeds tick): the command keeps its scheduled length and draws the static field from the first
// rendered frame that threw.
//
// Contained errors are kept in a bounded module-level list (first CONTAINED_PRESENTATION_ERROR_LIMIT distinct errors, deduped
// by command type + message) so headless callers (the soak, the bench ABI) and the browser session export can see them.

export type ContainedPresentationSite = "adapter" | "duration" | "draw";

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
