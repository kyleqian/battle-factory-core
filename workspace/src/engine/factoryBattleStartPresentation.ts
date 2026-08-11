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
import {
  battleCommandSpeciesDisplayName,
  battleCommandUiStatusFromStatus1,
  type BattleCommandFieldBattler,
} from "./battleCommandPresentation.ts";
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

export type FactoryBattleStartField = Readonly<{
  player: BattleCommandFieldBattler;
  opponent: BattleCommandFieldBattler;
}>;

function activeFieldBattler(
  side: "player" | "trainer",
  battler: 0 | 1,
  partyIndex: 0 | 1 | 2,
  member: FactoryCorpusPartyMemberState,
): BattleCommandFieldBattler {
  return Object.freeze({
    side,
    battler,
    partyIndex,
    species: member.species,
    name: battleCommandSpeciesDisplayName(member.species),
    level: member.level,
    gender: member.gender,
    hp: member.hp,
    maxHP: member.maxHP,
    status: battleCommandUiStatusFromStatus1(member.status1),
    moveIds: member.moves,
    currentPP: member.pp,
    ppBonuses: member.ppBonuses,
  });
}

/** Active field snapshot shared by the initial release and command views. */
export function factoryBattleStartField(
  command: FactoryBattleStartPresentationCommand,
): FactoryBattleStartField {
  const playerIndex = command.activePartyIndexes.player;
  const opponentIndex = command.activePartyIndexes.opponent;
  return Object.freeze({
    player: activeFieldBattler(
      "player",
      0,
      playerIndex,
      command.parties.player[playerIndex],
    ),
    opponent: activeFieldBattler(
      "trainer",
      1,
      opponentIndex,
      command.parties.opponent[opponentIndex],
    ),
  });
}

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
  const opponentName = battleCommandSpeciesDisplayName(
    opponent[opponentActive].species,
  );
  const playerName = battleCommandSpeciesDisplayName(
    player[playerActive].species,
  );
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
        `out ${opponentName}!`,
      ] as const),
      playerSendOut: Object.freeze([
        `Go! ${playerName}!`,
      ] as const),
    }),
  });
}
