// Scratch, dev-time-only dump: builds the gold app-side Brain round shape
// (mirrors tools/compare/factoryRoundIntroGeneralizationStage.ts's
// generatedGoldRoundRevealProofStage) and prints the overrides.parties JSON
// for both sides, read off the app's own generated rental records via
// createFactoryCorpusPartyMember -- the same field set the silver
// factory-round-battle7-noland-reveal-off.json fixture pins.
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember, type FactoryCorpusPartyInstance } from "../../src/engine/factoryCorpusParty.ts";
import { getLevel50InitialRentalFixedIv } from "../../src/engine/factoryRentalGeneration.ts";
import {
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  preGenerateFactoryRoundNextOpponent,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { advanceRoundController, completeBattlePresentation, resolveRoundBattle } from "../../src/engine/roundController.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const CHALLENGE5_FIXED_IV = getLevel50InitialRentalFixedIv(5, false);
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number, fixedIv = CHALLENGE5_FIXED_IV) {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function toOverride(instance: FactoryCorpusPartyInstance) {
  const m = createFactoryCorpusPartyMember(instance);
  return {
    species: m.species,
    level: m.level,
    nature: m.nature,
    ivs: { ...m.ivs },
    evs: { ...m.evs },
    moves: [...m.moves],
    ppUps: [...m.ppUps],
    item: m.item,
    abilitySlot: m.abilitySlot,
    friendship: m.friendship,
    gender: m.gender,
    shiny: m.shiny,
    _speciesName: m.speciesName,
    _natureName: m.natureName,
    _itemName: m.itemName,
  };
}

const playerRentalRecords = [
  record(564),
  record(565),
  record(566),
] as const;

let orchestrator = createFactoryRoundBattleOrchestrator({
  id: "gold-brain-overrides-dump",
  rngValue: 2,
  factoryWinStreak: 35,
  factorySymbolsCount: 1,
  playerTrainerId: PLAYER_TRAINER_ID,
  battleTowerLevel50WinStreak: 0,
  facilityState: { rentsCount: 0 },
  rentals: {
    type: "currentRecords",
    playerRentalRecords,
    savedRentalRecords: [
      ...playerRentalRecords,
      record(1),
      record(2),
      record(3),
    ],
  },
});

function advanceProofWin(state: typeof orchestrator): typeof orchestrator {
  const start = state.round.presentation?.command;
  if (start?.type !== "battleStart") throw new Error("expected battleStart");
  let round = advanceRoundController(
    completeBattlePresentation(state.round, { commandId: start.commandId }),
  );
  round = resolveRoundBattle(round, {
    outcome: "win",
    playerParty: round.rules.playerParty,
    opponentParty: round.rules.currentOpponent.party,
    rngValue: round.rules.rngValue,
  });
  let next = { ...state, round, battle: null, battleCommandPresentation: null, battleResolutionPresentation: null, activeBattleCallStart: null };
  next = preGenerateFactoryRoundNextOpponent(next);
  const won = next.round.presentation?.command;
  if (won?.type !== "battleWon") throw new Error("expected battleWon");
  next = advanceFactoryRoundPresentation(completeFactoryRoundPresentation(next, { commandId: won.commandId }));
  const offer = next.round.presentation?.command;
  if (offer?.type !== "swapOffer") throw new Error("expected swapOffer");
  next = chooseFactoryRoundSwap(completeFactoryRoundPresentation(next, { commandId: offer.commandId }), { type: "decline" });
  const resolved = next.round.presentation?.command;
  if (resolved?.type !== "swapResolved") throw new Error("expected swapResolved");
  return advanceFactoryRoundPresentation(completeFactoryRoundPresentation(next, { commandId: resolved.commandId }));
}

for (let i = 0; i < 6; i += 1) {
  orchestrator = advanceProofWin(orchestrator);
}

const opponent = orchestrator.round.rules.currentOpponent;
if (opponent.rentalRecords === undefined) throw new Error("expected rentalRecords");
console.log(JSON.stringify({
  frontierBrain: opponent.frontierBrain,
  trainerId: opponent.id,
  player: orchestrator.round.rules.playerRentalRecords.map((r) => toOverride(r)),
  opponent: opponent.rentalRecords.map((r) => toOverride(r)),
}, null, 2));
