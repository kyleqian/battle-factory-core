import type {
  BattleSide,
  BattleTurnEvent,
  ResolvedBattleTurn,
} from "./battleTurn.ts";
import type {
  BattleBoundary,
  BattleKernelSemanticEvent,
} from "./battleDecisionBoundary.ts";
import type {
  BattleScriptBattlerId,
  BattleScriptSemanticEventPayload,
} from "./battleScriptEvents.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

interface SceneOffCommandBase {
  readonly commandId: number;
  /** Duration is relative to the prior command's acknowledgement. */
  readonly minimumFrames: number;
}

export type SceneOffPresentationCommand =
  | (SceneOffCommandBase & {
      readonly type: "text";
      readonly lines: readonly string[];
    })
  | (SceneOffCommandBase & {
      readonly type: "pp";
      readonly actor: BattleSide;
      readonly move: string;
      readonly from: number;
      readonly to: number;
    })
  | (SceneOffCommandBase & {
      readonly type: "hp";
      readonly target: BattleSide;
      readonly from: number;
      readonly to: number;
    })
  | (SceneOffCommandBase & {
      readonly type: "stat";
      readonly target: BattleSide;
      readonly stat: "accuracy";
      readonly from: number;
      readonly to: number;
    })
  | (SceneOffCommandBase & { readonly type: "turnEnd" })
  | (SceneOffCommandBase & { readonly type: "menu"; readonly menu: "action" });

export interface BattleTurnPresentationState {
  readonly source: "legacy-scenario" | "battle-kernel";
  readonly resolved: ResolvedBattleTurn;
  readonly commands: readonly SceneOffPresentationCommand[];
  readonly commandIndex: number;
  readonly acknowledgedCommandIds: readonly number[];
  readonly inputReady: boolean;
}

export interface SceneOffAdapterState {
  readonly elapsed: number;
  readonly pacing: number;
}

const MINIMUM_FRAMES: Readonly<Record<SceneOffPresentationCommand["type"], number>> = {
  text: 24,
  pp: 1,
  hp: 28,
  stat: 32,
  turnEnd: 8,
  menu: 6,
};

function eventCommands(
  event: BattleTurnEvent,
  commandId: number,
  resolved: ResolvedBattleTurn,
): readonly SceneOffPresentationCommand[] {
  const base = (type: SceneOffPresentationCommand["type"]) => ({
    commandId,
    minimumFrames: MINIMUM_FRAMES[type],
  });
  switch (event.type) {
    case "moveUsed": {
      const name = event.actor === "opponent"
        ? `Foe ${resolved.state.opponent.name}`
        : resolved.state.player.name;
      return [{ ...base("text"), type: "text", lines: [`${name} used`, `${event.move}!`] }];
    }
    case "ppChanged":
      return [{
        ...base("pp"),
        type: "pp",
        actor: event.actor,
        move: event.move,
        from: event.from,
        to: event.to,
      }];
    case "hpChanged":
      return [{
        ...base("hp"),
        type: "hp",
        target: event.target,
        from: event.from,
        to: event.to,
      }];
    case "statChanged": {
      const target = event.target === "opponent"
        ? `Foe ${resolved.state.opponent.name}’s`
        : `${resolved.state.player.name}’s`;
      return [
        {
          ...base("stat"),
          type: "stat",
          target: event.target,
          stat: event.stat,
          from: event.from,
          to: event.to,
        },
        {
          ...base("text"),
          type: "text",
          lines: [`${target} ${event.stat}`, "fell!"],
        },
      ];
    }
    case "turnEnded":
      return [{ ...base("turnEnd"), type: "turnEnd" }];
    case "inputReady":
      return [{ ...base("menu"), type: "menu", menu: "action" }];
  }
}

export function createBattleTurnPresentation(
  resolved: ResolvedBattleTurn,
): BattleTurnPresentationState {
  let nextId = 1;
  const commands = resolved.events.flatMap((event) => {
    const mapped = eventCommands(event, nextId, resolved);
    nextId += mapped.length;
    return mapped;
  });
  return {
    source: "legacy-scenario",
    resolved,
    commands,
    commandIndex: 0,
    acknowledgedCommandIds: [],
    inputReady: false,
  };
}

export type SceneOffKernelBattlerMetadata = Readonly<{
  battler: 0 | 1;
  name: string;
  moveNames: readonly [string, string, string, string];
}>;

export type SceneOffKernelTurnProjectionInput = Readonly<{
  before: BattleScriptRulesContext;
  after: BattleScriptRulesContext;
  events: readonly BattleKernelSemanticEvent[];
  boundary: BattleBoundary;
  rngValue: number;
  battlers: readonly [
    SceneOffKernelBattlerMetadata,
    SceneOffKernelBattlerMetadata,
  ];
}>;

function battlerSide(battler: BattleScriptBattlerId): BattleSide {
  if (battler === 0) return "player";
  if (battler === 1) return "opponent";
  throw new Error(
    `Scene OFF singles projection cannot present battler ${battler}`,
  );
}

function metadataForBattler(
  input: SceneOffKernelTurnProjectionInput,
  battler: BattleScriptBattlerId,
): SceneOffKernelBattlerMetadata {
  const metadata = input.battlers.find((entry) => entry.battler === battler);
  if (!metadata) {
    throw new Error(`Scene OFF projection has no metadata for battler ${battler}`);
  }
  return metadata;
}

function commandBase(
  commandId: number,
  type: SceneOffPresentationCommand["type"],
) {
  return { commandId, minimumFrames: MINIMUM_FRAMES[type] };
}

function isUsedMoveMessage(
  payload: BattleScriptSemanticEventPayload,
): boolean {
  return payload.kind === "message" && payload.messageId === "STRINGID_USEDMOVE";
}

function actionPpEvent(
  events: readonly BattleKernelSemanticEvent[],
  messageIndex: number,
): Extract<
  BattleScriptSemanticEventPayload,
  { kind: "set-battler-pp-data" }
> {
  for (let index = messageIndex + 1; index < events.length; index += 1) {
    const payload = events[index]!.payload;
    if (isUsedMoveMessage(payload)) break;
    if (payload.kind === "set-battler-pp-data") return payload;
  }
  throw new Error(
    "Scene OFF used-move event has no same-action PP semantic event",
  );
}

function sourceLabelOf(
  event: BattleKernelSemanticEvent,
): string {
  if (!event.provenance) {
    throw new Error(
      `Scene OFF kernel event ${event.sequence}/${event.payload.kind} has no interpreter provenance`,
    );
  }
  return event.provenance.sourceLabel;
}

/**
 * Projects ordered, provenance-bearing kernel facts onto the existing
 * relative Scene-OFF command/acknowledgement protocol. Presentation owns no
 * rules or RNG: HP/stat endpoints and PP slots come from semantic payloads,
 * while the menu is emitted only from the actual next command boundary.
 */
export function createBattleKernelTurnPresentation(
  input: SceneOffKernelTurnProjectionInput,
): BattleTurnPresentationState {
  const commands: SceneOffPresentationCommand[] = [];
  let lastStatChange: Extract<
    BattleScriptSemanticEventPayload,
    { kind: "stat-stage-change" }
  > | null = null;

  for (let index = 0; index < input.events.length; index += 1) {
    const event = input.events[index]!;
    const payload = event.payload;
    if (isUsedMoveMessage(payload)) {
      sourceLabelOf(event);
      const ppEvent = actionPpEvent(input.events, index);
      const metadata = metadataForBattler(input, ppEvent.battler);
      const prefix = ppEvent.battler === 1 ? `Foe ${metadata.name}` : metadata.name;
      commands.push({
        ...commandBase(commands.length + 1, "text"),
        type: "text",
        lines: [
          `${prefix} used`,
          `${metadata.moveNames[ppEvent.movePosition] ?? `MOVE ${ppEvent.movePosition}`}!`,
        ],
      });
      continue;
    }
    if (payload.kind === "set-battler-pp-data") {
      sourceLabelOf(event);
      const metadata = metadataForBattler(input, payload.battler);
      commands.push({
        ...commandBase(commands.length + 1, "pp"),
        type: "pp",
        actor: battlerSide(payload.battler),
        move:
          metadata.moveNames[payload.movePosition]
          ?? `MOVE ${payload.movePosition}`,
        from: input.before.battlers[payload.battler]!.pp[
          payload.movePosition
        ]!,
        to: payload.pp,
      });
      continue;
    }
    if (payload.kind === "hp-change") {
      commands.push({
        ...commandBase(commands.length + 1, "hp"),
        type: "hp",
        target: battlerSide(payload.battler as BattleScriptBattlerId),
        from: payload.from,
        to: payload.to,
      });
      continue;
    }
    if (payload.kind === "stat-stage-change") {
      if (payload.stat !== "accuracy") {
        throw new Error(
          `Scene OFF projection does not yet render ${payload.stat} stat commands`,
        );
      }
      lastStatChange = payload;
      commands.push({
        ...commandBase(commands.length + 1, "stat"),
        type: "stat",
        target: battlerSide(payload.battler as BattleScriptBattlerId),
        stat: "accuracy",
        from: payload.from,
        to: payload.to,
      });
      continue;
    }
    if (
      payload.kind === "message"
      && payload.messageId === "STRINGID_DEFENDERSSTATFELL"
    ) {
      sourceLabelOf(event);
      if (!lastStatChange) {
        throw new Error(
          "Scene OFF stat-fell message has no preceding stat semantic event",
        );
      }
      const battler = lastStatChange.battler as BattleScriptBattlerId;
      const metadata = metadataForBattler(input, battler);
      const target = battler === 1
        ? `Foe ${metadata.name}’s`
        : `${metadata.name}’s`;
      commands.push({
        ...commandBase(commands.length + 1, "text"),
        type: "text",
        lines: [`${target} ${lastStatChange.stat}`, "fell!"],
      });
    }
  }

  commands.push({
    ...commandBase(commands.length + 1, "turnEnd"),
    type: "turnEnd",
  });
  if (
    input.boundary.kind !== "decision-required"
    || input.boundary.request.kind !== "command"
  ) {
    throw new Error(
      "Scene OFF full-turn projection requires a genuine next command boundary",
    );
  }
  commands.push({
    ...commandBase(commands.length + 1, "menu"),
    type: "menu",
    menu: "action",
  });

  const player = metadataForBattler(input, 0);
  const opponent = metadataForBattler(input, 1);
  const moveRecord = (
    metadata: SceneOffKernelBattlerMetadata,
    battler: 0 | 1,
  ) => Object.freeze(Object.fromEntries(
    metadata.moveNames.map((name, slot) => [
      name,
      input.after.battlers[battler]!.pp[slot]!,
    ]),
  ));
  const resolved: ResolvedBattleTurn = Object.freeze({
    state: Object.freeze({
      player: Object.freeze({
        name: player.name,
        hp: input.after.battlers[0]!.hp,
        maxHp: input.after.battlers[0]!.maxHP,
        status: "none" as const,
        accuracyStage: input.after.battlers[0]!.statStages[6]!,
        moves: moveRecord(player, 0),
      }),
      opponent: Object.freeze({
        name: opponent.name,
        hp: input.after.battlers[1]!.hp,
        maxHp: input.after.battlers[1]!.maxHP,
        status: "none" as const,
        accuracyStage: input.after.battlers[1]!.statStages[6]!,
        moves: moveRecord(opponent, 1),
      }),
      rngValue: input.rngValue,
    }),
    events: Object.freeze([]),
    rngLedger: Object.freeze([]),
  });
  return Object.freeze({
    source: "battle-kernel",
    resolved,
    commands: Object.freeze(commands),
    commandIndex: 0,
    acknowledgedCommandIds: Object.freeze([]),
    inputReady: false,
  });
}

export function pendingSceneOffCommand(
  state: BattleTurnPresentationState,
): SceneOffPresentationCommand | null {
  return state.commands[state.commandIndex] ?? null;
}

export function acknowledgeSceneOffCommand(
  state: BattleTurnPresentationState,
  commandId: number,
): BattleTurnPresentationState {
  const pending = pendingSceneOffCommand(state);
  if (pending === null) throw new Error("no Scene OFF command is pending");
  if (pending.commandId !== commandId) {
    throw new Error(`completion ${commandId} does not match pending command ${pending.commandId}`);
  }
  const commandIndex = state.commandIndex + 1;
  return {
    ...state,
    commandIndex,
    acknowledgedCommandIds: [...state.acknowledgedCommandIds, commandId],
    inputReady:
      pending.type === "menu" && commandIndex === state.commands.length,
  };
}

export function createSceneOffAdapter(pacing = 1): SceneOffAdapterState {
  if (!Number.isInteger(pacing) || pacing <= 0) {
    throw new Error("Scene OFF pacing must be a positive integer");
  }
  return { elapsed: 0, pacing };
}

/**
 * Returns an acknowledgement only after the active relative command has
 * completed. Calling late is harmless; the controller remains input-gated
 * until the acknowledgement is applied.
 */
export function advanceSceneOffAdapter(
  adapter: SceneOffAdapterState,
  command: SceneOffPresentationCommand,
): {
  readonly adapter: SceneOffAdapterState;
  readonly completion: { readonly commandId: number } | null;
} {
  const elapsed = adapter.elapsed + 1;
  const minimum = command.minimumFrames * adapter.pacing;
  return {
    adapter: { ...adapter, elapsed },
    completion: elapsed >= minimum ? { commandId: command.commandId } : null,
  };
}
