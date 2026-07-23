import { advanceRngValue } from "./rng.ts";

export type BattleSide = "player" | "opponent";

export interface BattleTurnMon {
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly status: "none";
  readonly accuracyStage: number;
  readonly moves: Readonly<Record<string, number>>;
}

export interface BattleTurnState {
  readonly player: BattleTurnMon;
  readonly opponent: BattleTurnMon;
  readonly rngValue: number;
}

export type BattleTurnAction =
  | {
      readonly type: "damage";
      readonly actor: BattleSide;
      readonly target: BattleSide;
      readonly move: string;
      readonly damage: number;
      readonly rng: readonly ("accuracy" | "damageSpread" | "secondary")[];
    }
  | {
      readonly type: "stat";
      readonly actor: BattleSide;
      readonly target: BattleSide;
      readonly move: string;
      readonly stat: "accuracy";
      readonly stages: number;
      readonly rng: readonly ("accuracy")[];
    };

export interface BattleTurnScenario {
  readonly id: string;
  readonly initial: BattleTurnState;
  readonly actions: readonly BattleTurnAction[];
  /** Source BattleTurnPassed/AI setup draw clusters, kept explicit. */
  readonly turnEndRngGroups: readonly number[];
}

export type BattleTurnEvent =
  | {
      readonly type: "moveUsed";
      readonly actor: BattleSide;
      readonly target: BattleSide;
      readonly move: string;
    }
  | {
      readonly type: "ppChanged";
      readonly actor: BattleSide;
      readonly move: string;
      readonly from: number;
      readonly to: number;
    }
  | {
      readonly type: "hpChanged";
      readonly target: BattleSide;
      readonly from: number;
      readonly to: number;
    }
  | {
      readonly type: "statChanged";
      readonly target: BattleSide;
      readonly stat: "accuracy";
      readonly from: number;
      readonly to: number;
    }
  | { readonly type: "turnEnded" }
  | { readonly type: "inputReady" };

export interface BattleTurnRngLedgerEntry {
  readonly call: number;
  readonly reason: string;
  readonly before: number;
  readonly after: number;
}

export interface ResolvedBattleTurn {
  readonly state: BattleTurnState;
  readonly events: readonly BattleTurnEvent[];
  readonly rngLedger: readonly BattleTurnRngLedgerEntry[];
}

function replaceMon(
  state: BattleTurnState,
  side: BattleSide,
  mon: BattleTurnMon,
): BattleTurnState {
  return { ...state, [side]: mon };
}

function draw(
  state: BattleTurnState,
  ledger: BattleTurnRngLedgerEntry[],
  reason: string,
): BattleTurnState {
  const after = advanceRngValue(state.rngValue);
  ledger.push({
    call: ledger.length + 1,
    reason,
    before: state.rngValue,
    after,
  });
  return { ...state, rngValue: after };
}

/**
 * Resolves rules and RNG in one pure pass. Presentation consumes the emitted
 * events afterwards, so animation/text pacing cannot affect the ledger.
 */
export function resolveBattleTurn(scenario: BattleTurnScenario): ResolvedBattleTurn {
  let state: BattleTurnState = {
    player: { ...scenario.initial.player, moves: { ...scenario.initial.player.moves } },
    opponent: { ...scenario.initial.opponent, moves: { ...scenario.initial.opponent.moves } },
    rngValue: scenario.initial.rngValue >>> 0,
  };
  const events: BattleTurnEvent[] = [];
  const rngLedger: BattleTurnRngLedgerEntry[] = [];

  for (const action of scenario.actions) {
    const actor = state[action.actor];
    const pp = actor.moves[action.move];
    if (pp === undefined || pp <= 0) {
      throw new Error(`${action.actor} cannot use ${action.move} with PP ${String(pp)}`);
    }
    events.push({
      type: "moveUsed",
      actor: action.actor,
      target: action.target,
      move: action.move,
    });
    for (const reason of action.rng) {
      state = draw(state, rngLedger, `${action.actor}:${action.move}:${reason}`);
    }
    state = replaceMon(state, action.actor, {
      ...state[action.actor],
      moves: { ...state[action.actor].moves, [action.move]: pp - 1 },
    });
    events.push({
      type: "ppChanged",
      actor: action.actor,
      move: action.move,
      from: pp,
      to: pp - 1,
    });

    if (action.type === "damage") {
      const target = state[action.target];
      const hp = Math.max(0, target.hp - action.damage);
      state = replaceMon(state, action.target, { ...target, hp });
      events.push({ type: "hpChanged", target: action.target, from: target.hp, to: hp });
    } else {
      const target = state[action.target];
      const stage = Math.max(0, Math.min(12, target.accuracyStage + action.stages));
      state = replaceMon(state, action.target, { ...target, accuracyStage: stage });
      events.push({
        type: "statChanged",
        target: action.target,
        stat: action.stat,
        from: target.accuracyStage,
        to: stage,
      });
    }
  }

  scenario.turnEndRngGroups.forEach((count, group) => {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`turnEndRngGroups[${group}] must be a non-negative integer`);
    }
    for (let call = 0; call < count; call += 1) {
      state = draw(state, rngLedger, `turnEnd:${group}:${call}`);
    }
  });
  events.push({ type: "turnEnded" }, { type: "inputReady" });
  return { state, events, rngLedger };
}

