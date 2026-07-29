import { advanceRngValue } from "./rng.ts";
import type {
  BattleScriptEventProvenance,
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";

/**
 * JSON is the persistence boundary for the headless battle kernel. The
 * adapter-owned rules payload is intentionally opaque here: the current
 * Battle Script machine is not yet a complete battle engine, so this module
 * does not claim a complete rules-state schema or integrate it into core.ts.
 */
export type BattleJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly BattleJsonValue[]
  | BattleJsonObject;

export type BattleJsonObject = Readonly<{
  [key: string]: BattleJsonValue;
}>;

export type BattleDecisionSide = "player" | "trainer";
export type BattleSinglesBattler = 0 | 1;
export type BattleMoveSlot = 0 | 1 | 2 | 3;
export type BattlePartyIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type BattleMoveDecision = Readonly<{
  kind: "use-move";
  moveSlot: BattleMoveSlot;
  targetBattler: BattleSinglesBattler;
}>;

export type BattleSwitchDecision = Readonly<{
  kind: "switch";
  partyIndex: BattlePartyIndex;
}>;

export type BattleCommandDecision = BattleMoveDecision | BattleSwitchDecision;
export type BattleSubmittedDecision = BattleCommandDecision;

export type BattleCommandRequest = Readonly<{
  kind: "command";
  requestId: number;
  side: BattleDecisionSide;
  battler: BattleSinglesBattler;
  legalDecisions: readonly BattleCommandDecision[];
}>;

export type BattleForcedSwitchRequest = Readonly<{
  kind: "forced-switch";
  requestId: number;
  side: BattleDecisionSide;
  battler: BattleSinglesBattler;
  faintedPartyIndex: BattlePartyIndex;
  legalPartyIndexes: readonly BattlePartyIndex[];
}>;

export type BattleDecisionRequest =
  | BattleCommandRequest
  | BattleForcedSwitchRequest;

export type BattleDecisionSubmission = Readonly<{
  requestId: number;
  side: BattleDecisionSide;
  decision: BattleSubmittedDecision;
}>;

export type BattleOutcome = "player-win" | "trainer-win" | "draw";

export type BattleDecisionBoundary = Readonly<{
  kind: "decision-required";
  request: BattleDecisionRequest;
}>;

export type BattleTerminalBoundary = Readonly<{
  kind: "terminal";
  outcome: BattleOutcome;
}>;

export type BattleMachineBarrier = Readonly<{
  kind: "battle-script";
  entryLabel: string;
  programCounter: number;
  opcodeId: number;
  opcodeName: string;
  dispatcher: string;
  instructionsExecuted: number;
}>;

export type BattleMachineBarrierBoundary = Readonly<{
  kind: "machine-barrier";
  barrier: BattleMachineBarrier;
}>;

export type BattleBoundary =
  | BattleDecisionBoundary
  | BattleMachineBarrierBoundary
  | BattleTerminalBoundary;

export type BattleRngState = Readonly<{
  value: number;
  calls: number;
}>;

export type BattleState<
  RulesState extends BattleJsonObject = BattleJsonObject,
> = Readonly<{
  schemaVersion: 1;
  revision: number;
  nextEventSequence: number;
  rules: RulesState;
  rng: BattleRngState;
  boundary: BattleBoundary;
}>;

export type BattleKernelSemanticEvent = Readonly<{
  sequence: number;
  payload: BattleScriptSemanticEventPayload;
  /**
   * Interpreter provenance is optional for backward compatibility with
   * reducers that synthesize boundary-level events without a Battle Script
   * instruction. Machine-backed reducers preserve the exact immutable
   * receipt instead of asking presentation to infer a label from event order.
   */
  provenance?: BattleScriptEventProvenance;
}>;

export type BattleDecisionReducerSemanticEvent =
  | BattleScriptSemanticEventPayload
  | Readonly<{
    payload: BattleScriptSemanticEventPayload;
    provenance: BattleScriptEventProvenance;
  }>;

export type BattleDecisionRng = Readonly<{
  /**
   * Advances Emerald's LCG and returns Random()'s u16 result. The cursor is
   * transition-local; only the immutable BattleState returned by the kernel
   * persists its value and call count.
   */
  draw(reason: string): number;
  /** Read-only transition-local cursor; inspecting it never consumes RNG. */
  snapshot(): BattleRngState;
}>;

export type BattleDecisionReducerContext<
  RulesState extends BattleJsonObject,
> = Readonly<{
  rules: RulesState;
  request: BattleDecisionRequest;
  decision: BattleSubmittedDecision;
  rng: BattleDecisionRng;
}>;

export type BattleDecisionReducerOutput<
  RulesState extends BattleJsonObject,
> = Readonly<{
  rules: RulesState;
  events: readonly BattleDecisionReducerSemanticEvent[];
  boundary: BattleBoundary;
}>;

export type BattleDecisionReducer<
  RulesState extends BattleJsonObject,
> = (
  context: BattleDecisionReducerContext<RulesState>,
) => BattleDecisionReducerOutput<RulesState>;

export type BattleDecisionTransitionResult<
  RulesState extends BattleJsonObject = BattleJsonObject,
> =
  | Readonly<{
    kind: "decision-required";
    state: BattleState<RulesState>;
    events: readonly BattleKernelSemanticEvent[];
    nextRequest: BattleDecisionRequest;
  }>
  | Readonly<{
    kind: "machine-barrier";
    state: BattleState<RulesState>;
    events: readonly BattleKernelSemanticEvent[];
    barrier: BattleMachineBarrier;
  }>
  | Readonly<{
    kind: "terminal";
    state: BattleState<RulesState>;
    events: readonly BattleKernelSemanticEvent[];
    outcome: BattleOutcome;
  }>;

const U32_MAX = 0xffff_ffff;
const SIDES = Object.freeze(["player", "trainer"] as const);
const OUTCOMES = Object.freeze(["player-win", "trainer-win", "draw"] as const);

function fail(path: string, expected: string, received: unknown): never {
  const rendered = typeof received === "string"
    ? JSON.stringify(received)
    : String(received);
  throw new Error(`${path} must be ${expected}, got ${rendered}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) return fail(path, "a plain object", value);
  return value;
}

function exactKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
  path: string,
): void {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(
      `${path} must have exactly keys ${expected.join(", ")}, got ${actual.join(", ")}`,
    );
  }
}

function integerAt(
  value: unknown,
  minimum: number,
  maximum: number,
  path: string,
): number {
  if (
    !Number.isSafeInteger(value)
    || Number(value) < minimum
    || Number(value) > maximum
  ) {
    return fail(path, `an integer in ${minimum}..${maximum}`, value);
  }
  return Number(value);
}

function sideAt(value: unknown, path: string): BattleDecisionSide {
  if (value !== "player" && value !== "trainer") {
    return fail(path, SIDES.join(" or "), value);
  }
  return value;
}

function expectedBattler(side: BattleDecisionSide): BattleSinglesBattler {
  return side === "player" ? 0 : 1;
}

function battlerAt(
  value: unknown,
  side: BattleDecisionSide,
  path: string,
): BattleSinglesBattler {
  const battler = integerAt(value, 0, 1, path);
  const expected = expectedBattler(side);
  if (battler !== expected) {
    throw new Error(
      `${path} must be ${expected} for the ${side} side in a singles battle, got ${battler}`,
    );
  }
  return battler as BattleSinglesBattler;
}

function partyIndexAt(value: unknown, path: string): BattlePartyIndex {
  return integerAt(value, 0, 5, path) as BattlePartyIndex;
}

function cloneFrozenJson(
  value: unknown,
  path: string,
  ancestors: Set<object> = new Set(),
): BattleJsonValue {
  if (
    value === null
    || typeof value === "boolean"
    || typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return fail(path, "a finite JSON number", value);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") {
    return fail(path, "JSON-compatible", value);
  }
  if (ancestors.has(value)) {
    throw new Error(`${path} must not contain a cycle`);
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new Error(`${path}[${index}] must not be an array hole`);
        }
      }
      return Object.freeze(
        value.map((entry, index) =>
          cloneFrozenJson(entry, `${path}[${index}]`, ancestors)),
      );
    }
    const record = recordAt(value, path);
    const clone: Record<string, BattleJsonValue> = {};
    for (const key of Object.keys(record).sort()) {
      clone[key] = cloneFrozenJson(record[key], `${path}.${key}`, ancestors);
    }
    return Object.freeze(clone);
  } finally {
    ancestors.delete(value);
  }
}

function rulesAt(value: unknown, path: string): BattleJsonObject {
  const clone = cloneFrozenJson(value, path);
  if (clone === null || typeof clone !== "object" || Array.isArray(clone)) {
    return fail(path, "a JSON object", value);
  }
  return clone as BattleJsonObject;
}

function commandDecisionAt(
  value: unknown,
  path: string,
): BattleCommandDecision {
  const decision = recordAt(value, path);
  if (decision.kind === "use-move") {
    exactKeys(decision, ["kind", "moveSlot", "targetBattler"], path);
    // The kernel supplies the target after move-target resolution. Singles
    // moves may therefore target either the opponent or their own user.
    const targetBattler = integerAt(
      decision.targetBattler,
      0,
      1,
      `${path}.targetBattler`,
    ) as BattleSinglesBattler;
    return Object.freeze({
      kind: "use-move",
      moveSlot: integerAt(decision.moveSlot, 0, 3, `${path}.moveSlot`) as BattleMoveSlot,
      targetBattler,
    });
  }
  if (decision.kind === "switch") {
    exactKeys(decision, ["kind", "partyIndex"], path);
    return Object.freeze({
      kind: "switch",
      partyIndex: partyIndexAt(decision.partyIndex, `${path}.partyIndex`),
    });
  }
  return fail(`${path}.kind`, "use-move or switch", decision.kind);
}

function decisionKey(decision: BattleSubmittedDecision): string {
  return decision.kind === "use-move"
    ? `use-move:${decision.moveSlot}:${decision.targetBattler}`
    : `switch:${decision.partyIndex}`;
}

function requestAt(value: unknown, path: string): BattleDecisionRequest {
  const request = recordAt(value, path);
  const side = sideAt(request.side, `${path}.side`);
  if (request.kind === "command") {
    exactKeys(
      request,
      ["kind", "requestId", "side", "battler", "legalDecisions"],
      path,
    );
    if (!Array.isArray(request.legalDecisions) || request.legalDecisions.length === 0) {
      return fail(`${path}.legalDecisions`, "a non-empty array", request.legalDecisions);
    }
    const legalDecisions = request.legalDecisions.map((decision, index) =>
      commandDecisionAt(decision, `${path}.legalDecisions[${index}]`));
    const keys = legalDecisions.map(decisionKey);
    if (new Set(keys).size !== keys.length) {
      throw new Error(`${path}.legalDecisions must not contain duplicates`);
    }
    return Object.freeze({
      kind: "command",
      requestId: integerAt(request.requestId, 0, U32_MAX, `${path}.requestId`),
      side,
      battler: battlerAt(request.battler, side, `${path}.battler`),
      legalDecisions: Object.freeze(legalDecisions),
    });
  }
  if (request.kind === "forced-switch") {
    exactKeys(
      request,
      [
        "kind",
        "requestId",
        "side",
        "battler",
        "faintedPartyIndex",
        "legalPartyIndexes",
      ],
      path,
    );
    if (
      !Array.isArray(request.legalPartyIndexes)
      || request.legalPartyIndexes.length === 0
    ) {
      return fail(
        `${path}.legalPartyIndexes`,
        "a non-empty array",
        request.legalPartyIndexes,
      );
    }
    const legalPartyIndexes = request.legalPartyIndexes.map((partyIndex, index) =>
      partyIndexAt(partyIndex, `${path}.legalPartyIndexes[${index}]`));
    if (new Set(legalPartyIndexes).size !== legalPartyIndexes.length) {
      throw new Error(`${path}.legalPartyIndexes must not contain duplicates`);
    }
    const faintedPartyIndex = partyIndexAt(
      request.faintedPartyIndex,
      `${path}.faintedPartyIndex`,
    );
    if (legalPartyIndexes.includes(faintedPartyIndex)) {
      throw new Error(
        `${path}.legalPartyIndexes must not include fainted party index ${faintedPartyIndex}`,
      );
    }
    return Object.freeze({
      kind: "forced-switch",
      requestId: integerAt(request.requestId, 0, U32_MAX, `${path}.requestId`),
      side,
      battler: battlerAt(request.battler, side, `${path}.battler`),
      faintedPartyIndex,
      legalPartyIndexes: Object.freeze(legalPartyIndexes),
    });
  }
  return fail(`${path}.kind`, "command or forced-switch", request.kind);
}

function outcomeAt(value: unknown, path: string): BattleOutcome {
  if (
    value !== "player-win"
    && value !== "trainer-win"
    && value !== "draw"
  ) {
    return fail(path, OUTCOMES.join(", "), value);
  }
  return value;
}

function nonEmptyStringAt(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    return fail(path, "a non-empty string", value);
  }
  return value;
}

function machineBarrierAt(value: unknown, path: string): BattleMachineBarrier {
  const barrier = recordAt(value, path);
  exactKeys(
    barrier,
    [
      "kind",
      "entryLabel",
      "programCounter",
      "opcodeId",
      "opcodeName",
      "dispatcher",
      "instructionsExecuted",
    ],
    path,
  );
  if (barrier.kind !== "battle-script") {
    return fail(`${path}.kind`, "battle-script", barrier.kind);
  }
  return Object.freeze({
    kind: "battle-script",
    entryLabel: nonEmptyStringAt(barrier.entryLabel, `${path}.entryLabel`),
    programCounter: integerAt(
      barrier.programCounter,
      0,
      U32_MAX,
      `${path}.programCounter`,
    ),
    opcodeId: integerAt(barrier.opcodeId, 0, 0xff, `${path}.opcodeId`),
    opcodeName: nonEmptyStringAt(barrier.opcodeName, `${path}.opcodeName`),
    dispatcher: nonEmptyStringAt(barrier.dispatcher, `${path}.dispatcher`),
    instructionsExecuted: integerAt(
      barrier.instructionsExecuted,
      0,
      Number.MAX_SAFE_INTEGER,
      `${path}.instructionsExecuted`,
    ),
  });
}

function boundaryAt(value: unknown, path: string): BattleBoundary {
  const boundary = recordAt(value, path);
  if (boundary.kind === "decision-required") {
    exactKeys(boundary, ["kind", "request"], path);
    return Object.freeze({
      kind: "decision-required",
      request: requestAt(boundary.request, `${path}.request`),
    });
  }
  if (boundary.kind === "terminal") {
    exactKeys(boundary, ["kind", "outcome"], path);
    return Object.freeze({
      kind: "terminal",
      outcome: outcomeAt(boundary.outcome, `${path}.outcome`),
    });
  }
  if (boundary.kind === "machine-barrier") {
    exactKeys(boundary, ["kind", "barrier"], path);
    return Object.freeze({
      kind: "machine-barrier",
      barrier: machineBarrierAt(boundary.barrier, `${path}.barrier`),
    });
  }
  return fail(
    `${path}.kind`,
    "decision-required, machine-barrier, or terminal",
    boundary.kind,
  );
}

function stateAt<RulesState extends BattleJsonObject>(
  value: unknown,
  path: string,
): BattleState<RulesState> {
  const state = recordAt(value, path);
  exactKeys(
    state,
    [
      "schemaVersion",
      "revision",
      "nextEventSequence",
      "rules",
      "rng",
      "boundary",
    ],
    path,
  );
  if (state.schemaVersion !== 1) {
    return fail(`${path}.schemaVersion`, "1", state.schemaVersion);
  }
  const rng = recordAt(state.rng, `${path}.rng`);
  exactKeys(rng, ["value", "calls"], `${path}.rng`);
  return Object.freeze({
    schemaVersion: 1,
    revision: integerAt(
      state.revision,
      0,
      Number.MAX_SAFE_INTEGER,
      `${path}.revision`,
    ),
    nextEventSequence: integerAt(
      state.nextEventSequence,
      0,
      Number.MAX_SAFE_INTEGER,
      `${path}.nextEventSequence`,
    ),
    rules: rulesAt(state.rules, `${path}.rules`) as RulesState,
    rng: Object.freeze({
      value: integerAt(rng.value, 0, U32_MAX, `${path}.rng.value`),
      calls: integerAt(
        rng.calls,
        0,
        Number.MAX_SAFE_INTEGER,
        `${path}.rng.calls`,
      ),
    }),
    boundary: boundaryAt(state.boundary, `${path}.boundary`),
  });
}

export function createBattleCommandRequest(
  input: BattleCommandRequest,
): BattleCommandRequest {
  return requestAt(input, "Battle command request") as BattleCommandRequest;
}

export function createBattleForcedSwitchRequest(
  input: BattleForcedSwitchRequest,
): BattleForcedSwitchRequest {
  return requestAt(input, "Battle forced-switch request") as BattleForcedSwitchRequest;
}

export function createBattleState<
  RulesState extends BattleJsonObject,
>(
  input: Readonly<{
    rules: RulesState;
    rngSeed: number;
    /** Calls already consumed by a lifecycle initializer before this boundary. */
    rngCalls?: number;
    request: BattleDecisionRequest;
  }>,
): BattleState<RulesState> {
  return stateAt<RulesState>({
    schemaVersion: 1,
    revision: 0,
    nextEventSequence: 0,
    rules: input.rules,
    rng: {
      value: integerAt(input.rngSeed, 0, U32_MAX, "Battle RNG seed"),
      calls: integerAt(input.rngCalls ?? 0, 0, Number.MAX_SAFE_INTEGER, "Battle RNG calls"),
    },
    boundary: {
      kind: "decision-required",
      request: input.request,
    },
  }, "Battle state");
}

function canonicalJson(value: BattleJsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as BattleJsonObject;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key]!)}`).join(",")}}`;
}

export function serializeBattleState(state: BattleState): string {
  const normalized = stateAt(state, "Battle state");
  return canonicalJson(normalized);
}

export function parseBattleState(serialized: string): BattleState {
  if (typeof serialized !== "string") {
    return fail("Serialized Battle state", "a string", serialized);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new Error(
      `Serialized Battle state must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return stateAt(parsed, "Battle state");
}

function submissionAt(
  value: unknown,
  request: BattleDecisionRequest,
): BattleDecisionSubmission {
  const submission = recordAt(value, "Battle decision submission");
  exactKeys(submission, ["requestId", "side", "decision"], "Battle decision submission");
  const requestId = integerAt(
    submission.requestId,
    0,
    U32_MAX,
    "Battle decision submission.requestId",
  );
  const side = sideAt(submission.side, "Battle decision submission.side");
  if (requestId !== request.requestId || side !== request.side) {
    throw new Error(
      `Battle decision submission does not match current request ${request.requestId}/${request.side}`,
    );
  }
  const decision = commandDecisionAt(
    submission.decision,
    "Battle decision submission.decision",
  );
  if (request.kind === "command") {
    if (!request.legalDecisions.some((legal) =>
      decisionKey(legal) === decisionKey(decision))) {
      throw new Error(
        `Battle decision ${decisionKey(decision)} is not legal for current command request`,
      );
    }
  } else if (
    decision.kind !== "switch"
    || !request.legalPartyIndexes.includes(decision.partyIndex)
  ) {
    throw new Error(
      `Battle forced-switch request requires one of party indexes ${request.legalPartyIndexes.join(", ")}`,
    );
  }
  return Object.freeze({ requestId, side, decision });
}

function eventPayloadAt(
  value: unknown,
  path: string,
): BattleScriptSemanticEventPayload {
  const payload = rulesAt(value, path);
  if (typeof payload.kind !== "string" || payload.kind.length === 0) {
    return fail(`${path}.kind`, "a non-empty semantic event kind", payload.kind);
  }
  return payload as BattleScriptSemanticEventPayload;
}

function eventProvenanceAt(
  value: unknown,
  path: string,
): BattleScriptEventProvenance {
  const provenance = recordAt(value, path);
  exactKeys(
    provenance,
    [
      "programCounter",
      "opcodeId",
      "opcodeName",
      "dispatcher",
      "sourceLabel",
      "sourceStatementLine",
      "instructionExecution",
    ],
    path,
  );
  return Object.freeze({
    programCounter: integerAt(
      provenance.programCounter,
      0,
      U32_MAX,
      `${path}.programCounter`,
    ),
    opcodeId: integerAt(provenance.opcodeId, 0, 0xff, `${path}.opcodeId`),
    opcodeName: nonEmptyStringAt(provenance.opcodeName, `${path}.opcodeName`),
    dispatcher: nonEmptyStringAt(provenance.dispatcher, `${path}.dispatcher`),
    sourceLabel: nonEmptyStringAt(provenance.sourceLabel, `${path}.sourceLabel`),
    sourceStatementLine: integerAt(
      provenance.sourceStatementLine,
      1,
      Number.MAX_SAFE_INTEGER,
      `${path}.sourceStatementLine`,
    ),
    instructionExecution: integerAt(
      provenance.instructionExecution,
      1,
      Number.MAX_SAFE_INTEGER,
      `${path}.instructionExecution`,
    ),
  });
}

type NormalizedReducerSemanticEvent = Readonly<{
  payload: BattleScriptSemanticEventPayload;
  provenance?: BattleScriptEventProvenance;
}>;

function reducerSemanticEventAt(
  value: unknown,
  path: string,
): NormalizedReducerSemanticEvent {
  const record = recordAt(value, path);
  if (Object.hasOwn(record, "payload") || Object.hasOwn(record, "provenance")) {
    exactKeys(record, ["payload", "provenance"], path);
    return Object.freeze({
      payload: eventPayloadAt(record.payload, `${path}.payload`),
      provenance: eventProvenanceAt(
        record.provenance,
        `${path}.provenance`,
      ),
    });
  }
  return Object.freeze({ payload: eventPayloadAt(record, path) });
}

/**
 * Submits exactly one currently requested rules decision. Presentation-only
 * acknowledgements are deliberately absent: semantic events are immutable
 * output, and the only accepted input is a request-matching rules decision.
 */
export function submitBattleDecision<
  RulesState extends BattleJsonObject,
>(
  stateInput: BattleState<RulesState>,
  submissionInput: BattleDecisionSubmission,
  reducer: BattleDecisionReducer<RulesState>,
): BattleDecisionTransitionResult<RulesState> {
  const state = stateAt<RulesState>(stateInput, "Battle state");
  if (state.boundary.kind === "terminal") {
    throw new Error(
      `Battle is already terminal with outcome ${state.boundary.outcome}`,
    );
  }
  if (state.boundary.kind === "machine-barrier") {
    throw new Error(
      `Battle is stopped at machine barrier ${state.boundary.barrier.opcodeName}`,
    );
  }
  if (typeof reducer !== "function") {
    return fail("Battle decision reducer", "a function", reducer);
  }
  const request = state.boundary.request;
  const submission = submissionAt(submissionInput, request);

  let rngValue = state.rng.value;
  let rngCalls = state.rng.calls;
  const rng = Object.freeze({
    draw(reason: string): number {
      if (typeof reason !== "string" || reason.trim().length === 0) {
        return fail("Battle RNG draw reason", "a non-empty string", reason);
      }
      if (rngCalls >= Number.MAX_SAFE_INTEGER) {
        throw new Error("Battle RNG call counter overflow");
      }
      rngValue = advanceRngValue(rngValue);
      rngCalls += 1;
      return (rngValue >>> 16) & 0xffff;
    },
    snapshot(): BattleRngState {
      return Object.freeze({ value: rngValue, calls: rngCalls });
    },
  });

  const outputValue: unknown = reducer(Object.freeze({
    rules: state.rules,
    request,
    decision: submission.decision,
    rng,
  }));
  const output = recordAt(outputValue, "Battle decision reducer output");
  exactKeys(
    output,
    ["rules", "events", "boundary"],
    "Battle decision reducer output",
  );
  if (!Array.isArray(output.events)) {
    return fail("Battle decision reducer output.events", "an array", output.events);
  }
  const boundary = boundaryAt(
    output.boundary,
    "Battle decision reducer output.boundary",
  );
  if (
    boundary.kind === "decision-required"
    && boundary.request.requestId <= request.requestId
  ) {
    throw new Error(
      `Next Battle request id must be greater than current request id ${request.requestId}`,
    );
  }
  const reducerEvents = output.events.map((event, index) =>
    reducerSemanticEventAt(
      event,
      `Battle decision reducer output.events[${index}]`,
    ));
  if (
    state.nextEventSequence + reducerEvents.length
    > Number.MAX_SAFE_INTEGER
  ) {
    throw new Error("Battle semantic event sequence overflow");
  }
  const events = Object.freeze(reducerEvents.map((event, index) =>
    Object.freeze({
      sequence: state.nextEventSequence + index,
      payload: event.payload,
      ...(event.provenance === undefined
        ? {}
        : { provenance: event.provenance }),
    })));
  const nextState = stateAt<RulesState>({
    schemaVersion: 1,
    revision: state.revision + 1,
    nextEventSequence: state.nextEventSequence + events.length,
    rules: output.rules,
    rng: {
      value: rngValue,
      calls: rngCalls,
    },
    boundary,
  }, "Battle state");

  if (boundary.kind === "decision-required") {
    return Object.freeze({
      kind: "decision-required",
      state: nextState,
      events,
      nextRequest: boundary.request,
    });
  }
  if (boundary.kind === "machine-barrier") {
    return Object.freeze({
      kind: "machine-barrier",
      state: nextState,
      events,
      barrier: boundary.barrier,
    });
  }
  return Object.freeze({
      kind: "terminal",
      state: nextState,
      events,
      outcome: boundary.outcome,
  });
}
