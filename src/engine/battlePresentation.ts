import type {
  BattleIndex,
  BattleOpponent,
  BattleParty,
} from "./battleScenario.ts";

interface PresentationCommandBase {
  readonly commandId: number;
  readonly battleIndex: BattleIndex;
}

export type BattlePresentationCommand =
  | (PresentationCommandBase & {
      readonly type: "battleStart";
      readonly playerParty: BattleParty;
      readonly opponent: BattleOpponent;
    })
  | (PresentationCommandBase & {
      readonly type: "battleWon";
      readonly playerParty: BattleParty;
      readonly opponentParty: BattleParty;
    })
  | (PresentationCommandBase & {
      readonly type: "swapOffer";
      readonly playerParty: BattleParty;
      readonly opponentParty: BattleParty;
    })
  | (PresentationCommandBase & {
      readonly type: "swapResolved";
      readonly accepted: boolean;
      readonly playerParty: BattleParty;
    })
  | (PresentationCommandBase & {
      readonly type: "roundLost";
      readonly playerParty: BattleParty;
      readonly opponent: BattleOpponent;
    })
  | (PresentationCommandBase & {
      readonly type: "roundCompleted";
      readonly playerParty: BattleParty;
    });

export interface BattlePresentationCompletion {
  readonly commandId: number;
}

/**
 * Scene OFF and scene ON adapters implement the same port. They may call
 * `complete` on different frames, but cannot directly mutate round rules.
 */
export interface BattlePresentation {
  present(
    command: BattlePresentationCommand,
    complete: (completion: BattlePresentationCompletion) => void,
  ): void;
}

export interface PendingBattlePresentation {
  readonly command: BattlePresentationCommand;
  readonly completed: boolean;
}
