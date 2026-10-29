// apx210 (docs/finish-plan.md Phase 2; ANIMATION_VERIFICATION.md "Approximate playback"): every Scene ON move-animation command is
// classified live / approximate(reason) / static(reason). A static command is one the live renderer declines: it holds the static field
// (battleResolutionCommandDuration's seGate + minimumFrames when the live duration is null; the live duration when only the body's
// presentation declines, renderBattleResolutionLiveView -> renderBattleResolutionSceneOffView). Every decline names one reason code.
// The approximate hook is LIVE_MOVE_APPROXIMATE_POLICY: a step promotes ONE reason class to "approximate" (draw the existing body
// with best-effort inputs). apx215: "substitute-doll" is approximate (liveSubstituteSwapApplies / liveMoveSubstituteDollDeclines read
// the policy: an unproven subbed-attacker body is presented with the swaps, an unproven defender-doll body is drawn on the doll).
// apx217: "transform" is approximate (liveTransformedBattlerDeclines / liveTransformBodyDeclineReason read the policy: a body while a
// battler is shown transformed is drawn from the copied species' field art; the Transform body draws outside its proven picture scope).
// apx219: "sprite-order-unknown" / "allocator-unknown" are approximate (liveMoveAnimationPresentation retries a body that declines
// for unknown order / allocator history with the known-entry first-action input; the sink's `approximate` names the class).
// apx221: "castform-form", "endeavor-power" and the named other: reasons in LIVE_MOVE_APPROXIMATE_OTHER_REASONS (extrasensory-player-later-target,
// later-body-idle-rest, seismic-toss-damage-branch) are approximate (the retry loop in liveMoveAnimationPresentation passes per-reason
// LiveMoveApproximations; each gate names its choice). apx222: hidden-target is approximate (the body is drawn with the hidden battler kept hidden).
// apx222: "no-adapter" is approximate for the moves with a script-built body (src/animation/approxScript.ts: Peck, Gust, Barrage, Pay Day,
// False Swipe, Odor Sleuth, Conversion 2); a move with no case and no script body holds the static field as static:other:no-adapter-unscripted.
// Presentation-only diagnostics: never read by rules, RNG, the queue or the renderer.
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField, BattleResolutionPresentationCommand } from "./battleResolutionPresentation.ts";
import type { BattleResolutionPresentationRenderView } from "./battleResolutionPresentationRender.ts";
import {
  liveMoveAnimationDuration, liveMoveAnimationDurationCaseMissing, liveMoveAnimationPresentation, liveMoveApproximateScriptReason, liveMoveHiddenSides,
  liveMoveSubstituteDollDeclines, liveMoveSubstituteDollUnproven, type LiveMoveDeclineSink,
} from "./liveMoveAnimation.ts";
import { liveSubstituteSwapApplies, liveSubstituteSwapView, substituteSwapBodyField } from "./liveSubstituteSwap.ts";
import {
  LIVE_TRANSFORM_MOVE_ID, liveTransformBodyDeclineReason, liveTransformDeclineReason, liveTransformedBattlerDeclines,
  liveTransformedBattlerUnproven,
} from "./liveTransform.ts";

/** The decline classes (finish-plan decline table). "other" is always named: `other:<name>`. */
export const LIVE_MOVE_DECLINE_CLASSES = Object.freeze([
  "substitute-doll", "sprite-order-unknown", "allocator-unknown", "castform-form", "endeavor-power", "turn-0", "hidden-target",
  "no-adapter", "transform", "other",
] as const);
export type LiveMoveDeclineClass = (typeof LIVE_MOVE_DECLINE_CLASSES)[number];
export type LiveMoveDeclineReason = Exclude<LiveMoveDeclineClass, "other"> | `other:${string}`;

export function liveMoveDeclineClassOf(reason: LiveMoveDeclineReason): LiveMoveDeclineClass {
  return reason.startsWith("other:") ? "other" : reason as LiveMoveDeclineClass;
}

/** Per decline class: "static" holds the static field (today's decline path); "approximate" will draw the body with best-effort inputs. */
export type LiveMovePlaybackPolicy = Readonly<Record<LiveMoveDeclineClass, "static" | "approximate">>;
export const LIVE_MOVE_APPROXIMATE_POLICY: LiveMovePlaybackPolicy = Object.freeze({
  "substitute-doll": "approximate", "sprite-order-unknown": "approximate", "allocator-unknown": "approximate", "castform-form": "approximate",
  "endeavor-power": "approximate", "turn-0": "static", "hidden-target": "approximate", "no-adapter": "approximate", "transform": "approximate",
  "other": "static",
});

/**
 * apx221: the named `other:<name>` reasons promoted to approximate (the "other" class stays static for every other name). Each reason's
 * gate in liveMoveAnimationPresentationProven reads its flag (liveMoveAnimationPresentation retries with it) and names its fallback input.
 */
export const LIVE_MOVE_APPROXIMATE_OTHER_REASONS: ReadonlySet<string> = Object.freeze(new Set<string>([
  "other:extrasensory-player-later-target", "other:later-body-idle-rest", "other:seismic-toss-damage-branch",
]));
export function liveMoveReasonIsApproximate(reason: LiveMoveDeclineReason): boolean {
  return reason.startsWith("other:") ? LIVE_MOVE_APPROXIMATE_OTHER_REASONS.has(reason)
    : LIVE_MOVE_APPROXIMATE_POLICY[liveMoveDeclineClassOf(reason)] === "approximate";
}

export type LiveMovePlaybackClassification =
  | Readonly<{ kind: "live" }>
  | Readonly<{ kind: "approximate"; reason: LiveMoveDeclineReason }>
  | Readonly<{ kind: "static"; reason: LiveMoveDeclineReason }>
  // A move-animation command without a body request (the trn181 action-transition / no-hit attack pauses): no body exists.
  | Readonly<{ kind: "pause" }>;

const LIVE = Object.freeze({ kind: "live" as const });
const PAUSE = Object.freeze({ kind: "pause" as const });

/** The census code: "live", "approx:<reason>", "static:<reason>" or "pause". */
export function liveMovePlaybackCode(classification: LiveMovePlaybackClassification): string {
  return classification.kind === "live" || classification.kind === "pause" ? classification.kind
    : `${classification.kind === "approximate" ? "approx" : "static"}:${classification.reason}`;
}

const sideFlip = (battler: number) => (battler === 0 ? 1 : 0);

/**
 * Why liveMoveAnimationDuration(request, field) is null (null: it is not), in the duration's own gate order: the Substitute swap /
 * doll gates, the transformed-battler gate, Move_TRANSFORM's own gate, a move without a case, then the request dimension whose flip
 * makes the production duration non-null (attacker side, turn, rollout counter, power, friendship). A pure function of (request, field).
 * apx215: a body drawn only through the approximate Substitute rule (outside the proven doll cells) is "substitute-doll" too.
 * apx217: a body drawn only through the approximate Transform rule (a transformed battler; the Transform body outside its proven
 * picture scope) is "transform"; a Transform body that still declines names its gate (self target / Substitute doll).
 */
export function liveMoveDurationDeclineReason(
  request: BattleMoveAnimationRequest,
  field: BattleResolutionDisplayedField,
): LiveMoveDeclineReason | null {
  if (liveMoveAnimationDuration(request, field) !== null) {
    if (liveMoveSubstituteDollUnproven(request, field)) return "substitute-doll";
    if (liveTransformedBattlerUnproven(request, field)
      || (request.moveId === LIVE_TRANSFORM_MOVE_ID && liveTransformDeclineReason(request, field) !== null)) return "transform";
    return liveMoveApproximateScriptReason(request);
  }
  const swap = liveSubstituteSwapApplies(request, field);
  if (swap === true) {
    return liveMoveDurationDeclineReason(request, substituteSwapBodyField(field, request.attacker === 0 ? 0 : 1))
      ?? "other:substitute-swap-composite";
  }
  if (swap === false || liveMoveSubstituteDollDeclines(request, field)) {
    // apx215: past the approximate rule only a multi-hit body's earlier hit declines (which hit swapped in is not tracked).
    return LIVE_MOVE_APPROXIMATE_POLICY["substitute-doll"] === "approximate" ? "other:substitute-earlier-hit" : "substitute-doll";
  }
  if (liveTransformedBattlerDeclines(request, field)) return "transform";
  if (request.moveId === LIVE_TRANSFORM_MOVE_ID) {
    const gate = liveTransformBodyDeclineReason(request, field);
    return gate === "self target" ? "other:transform-self-target" : gate === "substitute doll" ? "other:transform-substitute-doll" : "transform";
  }
  if (liveMoveAnimationDurationCaseMissing(request, field)) return "other:no-adapter-unscripted";
  const live = (r: BattleMoveAnimationRequest) => liveMoveAnimationDuration(r, field) !== null;
  if (live({ ...request, attacker: sideFlip(request.attacker), target: sideFlip(request.target) })) return "other:attacker-side";
  if ([0, 1, 2, 3].some((turn) => turn !== request.turn && live({ ...request, turn }))) {
    return request.turn === 0 ? "turn-0" : `other:turn-${request.turn}`;
  }
  if ([1, 2, 3, 4, 5].some((c) => c !== request.rolloutCounter && live({ ...request, rolloutCounter: c }))) return "other:rollout-counter";
  if ([20, 40, 70, 110, 150].some((p) => p !== request.power && live({ ...request, power: p }))) return "other:power-branch";
  if ([0, 70, 150, 255].some((f) => f !== request.friendship && live({ ...request, friendship: f }))) return "other:friendship-branch";
  return "other:duration-null";
}

/**
 * Why the live renderer draws the static field for this render view's move body (null: it draws the body), in
 * renderBattleResolutionLiveView's own order: the Substitute swap composite (its body rows), the Transform body, then
 * liveMoveAnimationPresentation with the view's hidden sides; the reason is the attributed gate's code. A pure function of the view.
 */
export function liveMovePresentationDeclineReason(view: BattleResolutionPresentationRenderView): LiveMoveDeclineReason | null {
  const effect = view.effect;
  if (effect?.type !== "move") return null;
  let swap = liveSubstituteSwapView(view);
  if (swap?.kind === "swap") {
    // A presented swap composite's own rows are drawn; its body rows decide the body (the first body age of the composite).
    const rows = liveMoveAnimationDuration(effect.request, view.field) ?? 0;
    swap = null;
    for (let age = 0; age < rows && swap === null; age += 1) {
      const at = liveSubstituteSwapView(Object.freeze({ ...view, effect: Object.freeze({ ...effect, age }) }));
      if (at?.kind === "body") swap = at;
    }
    if (swap === null) return null;
  }
  if (swap) view = swap.view;
  const e = view.effect;
  if (e?.type !== "move") return null;
  if (e.request.moveId === LIVE_TRANSFORM_MOVE_ID && liveMoveAnimationDuration(e.request, view.field) !== null) return null;
  const sink: LiveMoveDeclineSink = {};
  let presented: unknown;
  try {
    presented = liveMoveAnimationPresentation(e.request, view.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
      e.presentationRng, e.battlerX2Input, liveMoveHiddenSides(view.visibility, e.request), sink);
  } catch {
    return "other:presentation-throw";
  }
  // apx219: a body drawn only with the known-entry fallback order / allocator input names the reason it would have declined with.
  if (presented !== null) return sink.approximate ?? null;
  // A drawn duration (apx215: an approximate doll body too) leaves the presentation gate's own reason.
  return (liveMoveAnimationDuration(e.request, view.field) === null ? liveMoveDurationDeclineReason(e.request, view.field) : null)
    ?? sink.reason ?? `other:unattributed-gate-${e.request.moveId}`;
}

function byPolicy(reason: LiveMoveDeclineReason, policy: LiveMovePlaybackPolicy): LiveMovePlaybackClassification {
  const approximate = reason.startsWith("other:") ? LIVE_MOVE_APPROXIMATE_OTHER_REASONS.has(reason)
    : policy[liveMoveDeclineClassOf(reason)] === "approximate";
  return Object.freeze({ kind: approximate ? "approximate" : "static", reason });
}

/**
 * A command's playback class (null: not a move-animation command). `field` is the displayed field before the command
 * (battleResolutionFieldBeforeCommand); `view` (optional) is a render view presenting it (createBattleResolutionPresentationRenderView),
 * which adds the presentation gates (sprite order / allocator history, Castform form, Endeavor power, hidden target, ...). Without a
 * view only the duration gates are decided (a pure function of (command, field)).
 */
export function liveMovePlaybackClassification(
  command: BattleResolutionPresentationCommand,
  field: BattleResolutionDisplayedField,
  view?: BattleResolutionPresentationRenderView,
  policy: LiveMovePlaybackPolicy = LIVE_MOVE_APPROXIMATE_POLICY,
): LiveMovePlaybackClassification | null {
  if (command.type !== "move-animation") return null;
  if (!command.animation) return PAUSE;
  const duration = liveMoveDurationDeclineReason(command.animation, field);
  // apx215: an approximate doll body (a drawn duration) still passes the presentation gates; a declined presentation names its own gate.
  const presentation = view && (duration === null || liveMoveAnimationDuration(command.animation, field) !== null)
    ? liveMovePresentationDeclineReason(view) : null;
  const reason = presentation ?? duration;
  return reason === null ? LIVE : byPolicy(reason, policy);
}
