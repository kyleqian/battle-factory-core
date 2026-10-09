/**
 * Per-battle presentation Random2 host (docs/presentation-rng.md; design docs/random2-trackability.md §7).
 *
 * One host per battle, owned by the presentation seam (EngineState.presentationRng, beside the
 * orchestrator's presentation-only hosts such as liveSpriteOrderHost.ts). It is seeded at battle
 * start from the SESSION presentation seed and the battle ordinal, never from gameplay RNG, and
 * advances exactly one ISO_RANDOMIZE1 step per presented battle frame in tick (the ROM's
 * RfuMain1 draw, link_rfu_2.c:2023), plus the draws of activated bodies on their draw frames.
 * There is deliberately NO lag-frame model (random2-trackability.md §0/§3): that documented
 * policy is why surrogate words are "faithful random", never oracle-exact.
 *
 * Nothing here enters battle/RNG state, a battle snapshot or a Scene ON/OFF parity input, and
 * render never calls into it except for read-only lookups (repaint cannot draw).
 */

import {
  advancePresentationRng,
  createPresentationRngState,
  drawPresentationRng,
  presentationRngJump,
  type PresentationRngProvenance,
  type PresentationRngState,
} from "./presentationRng.ts";

/** Versioned advancement/seed policy recorded in session exports (SessionTrace.presentationRng.policy). */
export const PRESENTATION_RNG_POLICY_V1 = "presentation-rng.v1.frame-step.no-lag.battle-stride-2^20";
export type PresentationRngPolicyId = typeof PRESENTATION_RNG_POLICY_V1;
export const PRESENTATION_RNG_POLICIES: readonly PresentationRngPolicyId[] = Object.freeze([PRESENTATION_RNG_POLICY_V1]);

/**
 * Deterministic default session seed: the canonical anchor gRng2Value (factory.json, Scene ON and
 * OFF; random2-trackability.md §1). Used by createInitialState without a seed, the
 * ?pokebench=1 / __POKEBENCH__ ABI, compare tooling and legacy session exports without the field.
 */
export const DEFAULT_PRESENTATION_RNG_SEED = 0x808db3eb;

/**
 * Battle n (0-based ordinal within a session) starts at the session seed advanced by
 * n * 2^20 ISO_RANDOMIZE1 steps: a window of the same Random2 law, disjoint from the next
 * battle's unless one battle presents more than 2^20 frames (~4.9 h).
 */
export const PRESENTATION_RNG_BATTLE_STRIDE = 1 << 20;

export function presentationRngBattleSeed(sessionSeed: number, battleOrdinal: number): number {
  if (!Number.isSafeInteger(battleOrdinal) || battleOrdinal < 0) {
    throw new Error(`battle ordinal must be a non-negative integer, got ${battleOrdinal}`);
  }
  return presentationRngJump(sessionSeed >>> 0, battleOrdinal * PRESENTATION_RNG_BATTLE_STRIDE);
}

/** One source draw site: `count` Random2 calls on the frame `ageOffset` frames after activation. */
export type PresentationRngDrawStep = Readonly<{ ageOffset: number; count: number }>;

export type PresentationRngWords = Readonly<{
  provenance: PresentationRngProvenance;
  /** State at the activation frame (after that frame's per-frame step). */
  activationValue: number;
  plan: readonly PresentationRngDrawStep[];
  /** All words in source order. */
  words: readonly number[];
  /** Words grouped by plan step, same order as `plan`. */
  draws: readonly (readonly number[])[];
  /** State after the last draw. */
  valueAfter: number;
}>;

function validatePlan(plan: readonly PresentationRngDrawStep[]): void {
  let age = 0;
  for (const step of plan) {
    if (!Number.isSafeInteger(step.ageOffset) || step.ageOffset < age) {
      throw new Error(`presentation RNG draw plan ageOffsets must be non-decreasing non-negative integers`);
    }
    if (!Number.isSafeInteger(step.count) || step.count < 0) {
      throw new Error(`presentation RNG draw plan counts must be non-negative integers`);
    }
    age = step.ageOffset;
  }
}

/**
 * Pure: the words a body draws, given the stream state at its activation frame and its source
 * draw plan. On each draw frame the per-frame step comes first, then the body's draws in source
 * order (random2-trackability.md §1; body-words-check.json `rfuStepsBeforeDraws`).
 */
export function presentationRngPlanWords(
  activation: PresentationRngState,
  plan: readonly PresentationRngDrawStep[],
): PresentationRngWords {
  validatePlan(plan);
  let state = activation;
  let age = 0;
  const words: number[] = [];
  const draws: (readonly number[])[] = [];
  for (const step of plan) {
    state = advancePresentationRng(state, step.ageOffset - age);
    age = step.ageOffset;
    const group: number[] = [];
    for (let i = 0; i < step.count; i += 1) {
      const drawn = drawPresentationRng(state);
      state = drawn.state;
      group.push(drawn.word);
      words.push(drawn.word);
    }
    draws.push(Object.freeze(group));
  }
  return Object.freeze({
    provenance: activation.provenance,
    activationValue: activation.value,
    plan: Object.freeze(plan.map((step) => Object.freeze({ ageOffset: step.ageOffset, count: step.count }))),
    words: Object.freeze(words),
    draws: Object.freeze(draws),
    valueAfter: state.value,
  });
}

export type PresentationRngBodyRecord = Readonly<{
  key: string;
  activationFrame: number;
  words: PresentationRngWords;
}>;

export type PresentationRngHost = Readonly<{
  battleOrdinal: number;
  /** Presented frames since this battle's host was seeded (0 = seed frame). */
  frame: number;
  state: PresentationRngState;
  /** Body draws still to be consumed by the stream: host frame -> extra steps. */
  pendingDraws: readonly Readonly<{ frame: number; count: number }>[];
  /** Activated bodies, at most once per key. */
  bodies: readonly PresentationRngBodyRecord[];
}>;

export function createPresentationRngHost(
  sessionSeed: number,
  battleOrdinal: number,
  provenance: PresentationRngProvenance = "surrogate",
): PresentationRngHost {
  return createPresentationRngHostAt(
    createPresentationRngState(presentationRngBattleSeed(sessionSeed, battleOrdinal), provenance),
    battleOrdinal,
  );
}

/** A host from an explicit state (pinned staged scenarios use provenance `pinned`). */
export function createPresentationRngHostAt(state: PresentationRngState, battleOrdinal = 0): PresentationRngHost {
  return Object.freeze({ battleOrdinal, frame: 0, state, pendingDraws: Object.freeze([]), bodies: Object.freeze([]) });
}

/** One presented battle frame (tick only): the per-frame step, then any body draws due on it. */
export function advancePresentationRngHost(host: PresentationRngHost): PresentationRngHost {
  const frame = host.frame + 1;
  let extra = 0;
  const pending: Readonly<{ frame: number; count: number }>[] = [];
  for (const draw of host.pendingDraws) {
    if (draw.frame === frame) extra += draw.count;
    else pending.push(draw);
  }
  return Object.freeze({
    ...host,
    frame,
    state: advancePresentationRng(host.state, 1 + extra),
    pendingDraws: pending.length === host.pendingDraws.length ? host.pendingDraws : Object.freeze(pending),
  });
}

/** Read-only lookup for render: never advances or schedules anything. */
export function presentationRngBodyWords(host: PresentationRngHost | null | undefined, key: string): PresentationRngWords | null {
  return host?.bodies.find((body) => body.key === key)?.words ?? null;
}

/**
 * Activate a body on the host's current frame (tick only). Returns its words (pure from the
 * current state and the plan) and schedules its draws into the stream exactly once per key:
 * re-activating an existing key returns the recorded words and the unchanged host. Draws at
 * ageOffset 0 are consumed immediately (after this frame's per-frame step, as in the ROM).
 */
export function activatePresentationRngBody(
  host: PresentationRngHost,
  key: string,
  plan: readonly PresentationRngDrawStep[],
): Readonly<{ host: PresentationRngHost; record: PresentationRngBodyRecord }> {
  const existing = host.bodies.find((body) => body.key === key);
  if (existing) return Object.freeze({ host, record: existing });
  const words = presentationRngPlanWords(host.state, plan);
  const record: PresentationRngBodyRecord = Object.freeze({ key, activationFrame: host.frame, words });
  let immediate = 0;
  const pending = [...host.pendingDraws];
  for (const step of plan) {
    if (step.count === 0) continue;
    if (step.ageOffset === 0) immediate += step.count;
    else pending.push(Object.freeze({ frame: host.frame + step.ageOffset, count: step.count }));
  }
  return Object.freeze({
    host: Object.freeze({
      ...host,
      state: immediate > 0 ? advancePresentationRng(host.state, immediate) : host.state,
      pendingDraws: Object.freeze(pending),
      bodies: Object.freeze([...host.bodies, record]),
    }),
    record,
  });
}

/**
 * Record a NON-CONSUMING per-event sub-stream (tick only; S10A prep46 s2, supervisor decision): its words follow the source law inside
 * the animation (per-frame step, then the plan's draws in source order) from the host's current state, but nothing is scheduled into
 * the shared stream, so every other body's words are unchanged. Deviation from the ROM step count: the stream after it is
 * sum(plan counts) draws short (docs/presentation-rng.md "General_Rain sub-stream"). Exactly once per key, like activatePresentationRngBody.
 */
export function recordPresentationRngSubStream(
  host: PresentationRngHost,
  key: string,
  plan: readonly PresentationRngDrawStep[],
): PresentationRngHost {
  if (host.bodies.some((body) => body.key === key)) return host;
  const record: PresentationRngBodyRecord = Object.freeze({ key, activationFrame: host.frame, words: presentationRngPlanWords(host.state, plan) });
  return Object.freeze({ ...host, bodies: Object.freeze([...host.bodies, record]) });
}

/**
 * Session-level presentation RNG state (EngineState.presentationRng). The session seed and policy
 * are what session exports persist; `battleKey` is only an edge detector for "a new battle
 * started" and never feeds the seed.
 */
export type PresentationRngSession = Readonly<{
  seed: number;
  policy: PresentationRngPolicyId;
  /** Battles started so far this session; the next battle's ordinal. */
  battlesStarted: number;
  battleKey: number | null;
  host: PresentationRngHost | null;
}>;

export function createPresentationRngSession(
  seed: number = DEFAULT_PRESENTATION_RNG_SEED,
  policy: PresentationRngPolicyId = PRESENTATION_RNG_POLICY_V1,
): PresentationRngSession {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`presentation seed must be a u32, got ${seed}`);
  if (!PRESENTATION_RNG_POLICIES.includes(policy)) throw new Error(`unknown presentation RNG policy ${policy}`);
  return Object.freeze({ seed: seed >>> 0, policy, battlesStarted: 0, battleKey: null, host: null });
}

/**
 * Per-tick seam update. `battleKey` identifies the presented battle (null = no battle on screen).
 * A new key seeds a fresh host for the next ordinal (its seed frame does not step); the same key
 * steps the host one presented frame; null drops the host.
 */
export function tickPresentationRngSession(
  session: PresentationRngSession,
  battleKey: number | null,
): PresentationRngSession {
  if (battleKey === null) {
    return session.host === null && session.battleKey === null
      ? session
      : Object.freeze({ ...session, battleKey: null, host: null });
  }
  if (session.host === null || session.battleKey !== battleKey) {
    return Object.freeze({
      ...session,
      battlesStarted: session.battlesStarted + 1,
      battleKey,
      host: createPresentationRngHost(session.seed, session.battlesStarted),
    });
  }
  return Object.freeze({ ...session, host: advancePresentationRngHost(session.host) });
}

/** Parse a `presentationSeed=<hex>` value (1-8 hex digits, optional 0x). */
export function parsePresentationSeed(text: string | null | undefined): number | null {
  if (typeof text !== "string") return null;
  const match = /^(?:0x)?([0-9a-f]{1,8})$/i.exec(text.trim());
  return match ? Number.parseInt(match[1]!, 16) >>> 0 : null;
}

export function formatPresentationSeed(seed: number): string {
  return (seed >>> 0).toString(16).padStart(8, "0");
}

/** Session-export metadata (SessionTrace.presentationRng): seed as 8 hex digits plus policy id. */
export type PresentationRngTraceMetadata = Readonly<{ seed: string; policy: string }>;

export function presentationRngTraceMetadata(session: Pick<PresentationRngSession, "seed" | "policy">): PresentationRngTraceMetadata {
  return Object.freeze({ seed: formatPresentationSeed(session.seed), policy: session.policy });
}

/**
 * Seed/policy a replay must use: the trace's own metadata, or the documented legacy default
 * (DEFAULT_PRESENTATION_RNG_SEED, policy v1) for exports recorded before the field existed.
 */
export function presentationRngFromTrace(trace: Readonly<{ presentationRng?: PresentationRngTraceMetadata }>): Readonly<{
  seed: number;
  policy: PresentationRngPolicyId;
}> {
  const meta = trace.presentationRng;
  if (meta === undefined) return Object.freeze({ seed: DEFAULT_PRESENTATION_RNG_SEED, policy: PRESENTATION_RNG_POLICY_V1 });
  const seed = parsePresentationSeed(meta.seed);
  if (seed === null) throw new Error(`session trace presentationRng.seed must be 1-8 hex digits, got ${JSON.stringify(meta.seed)}`);
  const policy = PRESENTATION_RNG_POLICIES.find((id) => id === meta.policy);
  if (policy === undefined) throw new Error(`session trace presentationRng.policy ${JSON.stringify(meta.policy)} is not a known policy`);
  return Object.freeze({ seed, policy });
}
