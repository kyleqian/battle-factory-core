import type {
  BattleSide,
  BattleTurnEvent,
  ResolvedBattleTurn,
} from "./battleTurn.ts";

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
        ? `Foe ${resolved.state.opponent.name}'s`
        : `${resolved.state.player.name}'s`;
      return [
        {
          ...base("text"),
          type: "text",
          lines: [target, `${event.stat.toUpperCase()} fell!`],
        },
        {
          ...base("stat"),
          type: "stat",
          target: event.target,
          stat: event.stat,
          from: event.from,
          to: event.to,
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
    resolved,
    commands,
    commandIndex: 0,
    acknowledgedCommandIds: [],
    inputReady: false,
  };
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
