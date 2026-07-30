/**
 * Immutable presentation command for a generated Level-50 Factory battle
 * before either controller sends out its active Pokémon.
 *
 * This is a projection of generated facility state. It deliberately owns no
 * clock and makes no pixel claim; later Scene-OFF/Scene-ON adapters advance
 * their own source-relative lifecycle over this frozen command.
 */

import type { BattleIndex } from "./battleScenario.ts";
import type {
  FactoryCorpusPartyMemberState,
} from "./factoryCorpusParty.ts";
import type { FactoryTrainerPresentation } from "./factoryTrainerPresentation.ts";
import type { PartyBallState } from "./battleResolutionPresentation.ts";

export type FactoryBattleStartParty = readonly [
  FactoryCorpusPartyMemberState,
  FactoryCorpusPartyMemberState,
  FactoryCorpusPartyMemberState,
];

export type FactoryBattleStartTextInputs = Readonly<{
  wantsToBattle: readonly [string, string];
  opponentSendOut: readonly [string, string];
  playerSendOut: readonly [string];
}>;

export type FactoryBattleStartPresentationCommand = Readonly<{
  type: "factory-battle-start";
  commandId: number;
  battleIndex: BattleIndex;
  opponentTrainer: FactoryTrainerPresentation;
  parties: Readonly<{
    player: FactoryBattleStartParty;
    opponent: FactoryBattleStartParty;
  }>;
  activePartyIndexes: Readonly<{
    player: 0 | 1 | 2;
    opponent: 0 | 1 | 2;
  }>;
  partySummaries: Readonly<{
    player: readonly PartyBallState[];
    opponent: readonly PartyBallState[];
  }>;
  text: FactoryBattleStartTextInputs;
}>;

function clonePartyMember(
  member: FactoryCorpusPartyMemberState,
): FactoryCorpusPartyMemberState {
  return Object.freeze({
    ...member,
    ivs: Object.freeze({ ...member.ivs }),
    moves: Object.freeze([...member.moves]) as FactoryCorpusPartyMemberState["moves"],
    pp: Object.freeze([...member.pp]) as FactoryCorpusPartyMemberState["pp"],
    evs: Object.freeze({ ...member.evs }),
    ppUps: Object.freeze([...member.ppUps]) as FactoryCorpusPartyMemberState["ppUps"],
  });
}

function cloneParty(party: FactoryBattleStartParty): FactoryBattleStartParty {
  return Object.freeze(party.map(clonePartyMember)) as unknown as FactoryBattleStartParty;
}

function partySummary(party: FactoryBattleStartParty): readonly PartyBallState[] {
  return Object.freeze([
    ...party.map((member): PartyBallState => {
      if (member.hp === 0) return "fainted";
      if (member.status1 !== 0) return "status";
      return "healthy";
    }),
    "empty",
    "empty",
    "empty",
  ]);
}

export function createFactoryBattleStartPresentationCommand(input: Readonly<{
  commandId: number;
  battleIndex: BattleIndex;
  opponentTrainer: FactoryTrainerPresentation;
  playerParty: FactoryBattleStartParty;
  opponentParty: FactoryBattleStartParty;
  playerActivePartyIndex?: 0 | 1 | 2;
  opponentActivePartyIndex?: 0 | 1 | 2;
}>): FactoryBattleStartPresentationCommand {
  const player = cloneParty(input.playerParty);
  const opponent = cloneParty(input.opponentParty);
  const playerActive = input.playerActivePartyIndex ?? 0;
  const opponentActive = input.opponentActivePartyIndex ?? 0;
  const trainerLabel =
    `${input.opponentTrainer.className} ${input.opponentTrainer.name}`;
  return Object.freeze({
    type: "factory-battle-start",
    commandId: input.commandId,
    battleIndex: input.battleIndex,
    opponentTrainer: input.opponentTrainer,
    parties: Object.freeze({ player, opponent }),
    activePartyIndexes: Object.freeze({
      player: playerActive,
      opponent: opponentActive,
    }),
    partySummaries: Object.freeze({
      player: partySummary(player),
      opponent: partySummary(opponent),
    }),
    text: Object.freeze({
      wantsToBattle: Object.freeze([
        trainerLabel,
        "would like to battle!",
      ] as const),
      opponentSendOut: Object.freeze([
        `${trainerLabel} sent`,
        `out ${opponent[opponentActive].speciesName}!`,
      ] as const),
      playerSendOut: Object.freeze([
        `Go! ${player[playerActive].speciesName}!`,
      ] as const),
    }),
  });
}
