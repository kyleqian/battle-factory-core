// aud243b (docs/aud243b-rom-replay.md): the engine half of the census ROM replay.
//   request: node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts request --seed=N --scene=on|off --out=req.json
//     the census battle of seed N (same orchestrator config and policy as lsd194Census.ts) run to its first action menu; writes the factoryLegal battle-lab request of its trainer / set ids.
//   replay: ... replay --seed=N --scene=on|off --setup=setup.json --out=engine.json
//     setup.json = `soundEventProbe.py lab REQ --setup-out` (the ROM's action-menu gRngValue, both parties). The engine battle is rebuilt FROM THE ROM (player rentals and opponent
//     personalities read back, battle RNG aligned on the ROM's gRandomTurnNumber, i.e. the ROM's gRngValue before the opponent's pre-menu AI draws; aud243c) and played with the census policy; writes the per-frame inputs (run-length encoded, frame 1 = the
//     first step after the action menu appeared) and the sound rows relative to that frame.
//   compare: ... compare --seed=N --scene=on|off --engine=engine.json --rom=timeline.json [--out=F]  (aud243c) engine states (hp, rng, last moves) found in order in the ROM timeline.
//   replay / native take --frame-budget=N (default 200000 engine frames) for very long battles.
//   native: ... native --seed=N --scene=on|off --out=engine.json  the census orchestrator itself (no ROM), same output shape: the drift check against the census row's sound column.
//   replay --render=LO:HI --render-dir=DIR (ais2): also writes the engine's 240x160 frame PNGs for replay frames LO..HI (engine-NNNNN.png), for pixel compares against ROM captures.
//   Frontier Brain battles (parity-mac, docs/parity-mac/brain-replay-seam.md): a census battle whose first opponent is Noland (streak 20; streak 41 with --symbols=1 on
//     `request` / `native`) gives a `factoryBrain` lab request (no trainer / set ids: the ROM's own FillFactoryBrainParty rolls his party). `replay` then recovers the ROM's
//     RNG cursor before that roll from the first Brain Pokemon's personality, lets the engine's production generation re-roll the party from it, and checks every member
//     against the ROM read-back.
//   Test players (parity-mac fourth pass, docs/parity-mac/replay-players.md): --policy=census|ai-v1|random-v1 (or the environment variable ROM_REPLAY_POLICY; default
//     census) on `replay` / `native`. The players are in romReplayPlayers.ts; `request` writes the name into the request's `replay` note. A voluntary switch is a
//     decision {kind: "switch", voluntary: true}; random-v1 also writes refusal probes {kind: "switch-refused" | "move-refused"} that the ROM must refuse.
//   Wide compare (parity-mac fourth pass, docs/parity-mac/wide-compare.md): `replay` writes `wide`, one state per decision (both active Pokemon: statuses, stat stages,
//     moves, PP, item, ability, types, the disable-struct counters; both parties; both sides' screens and Spikes; weather; Wish / Future Sight), and `finalWide`.
//     `compare --drive=drive.json` checks them against the ROM's states at the same decisions (soundEventProbe.py lab --drive writes `drive.wide`).
import "../../src/engine/monPicPixelsInstall.ts";
import { writeFileSync, readFileSync } from "node:fs";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
  advanceFactoryRoundPresentation, chooseFactoryRoundSwap, completeFactoryRoundPresentation, preGenerateFactoryRoundNextOpponent,
  factoryHeardBrainSpeech, markFactoryBrainSpeechHeard,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { battleRoomStateForOpponent } from "../../src/engine/battleRoom.ts";
import { adoptFactoryOpponentSchedule } from "../../src/engine/factoryOpponentGeneration.ts";
import { adoptFactoryBrainOpponentSchedule } from "../../src/engine/factoryBrainOpponentGeneration.ts";
import { getFactoryFrontierBrainStatus } from "../../src/engine/frontierBrainStatus.ts";
import { advanceFactoryCarry, carryForNewChallengeAfterLobby, validateFactoryFrontierRecord, type FactoryCarry } from "../../src/engine/factoryRoundChaining.ts";
import { generateFactoryOpponent } from "../../src/engine/factoryOpponentGeneration.ts";
import { battleScriptIvsFromRandomWords, getLevel50FactoryRentalRange } from "../../src/engine/factoryRentalGeneration.ts";
import { battlerMoveSelectionIsForced } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { PARTY_SELECT_OPEN_TOTAL_FRAMES } from "../../src/engine/battlePartySelect.ts";
import { createPlayer, createScriptPlayer, createSwapPolicy, PLAYER_POLICIES, roundSwapDecision, SWAP_POLICIES, type Player, type PlayerPolicyName, type SwapMon, type SwapPolicyName } from "./romReplayPlayers.ts";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { beginScreenSoundTick, runScheduledScreenSounds } from "../../src/engine/screenSounds.ts";
import { emitTickSounds } from "../../src/engine/tickSounds.ts";
import { advanceRngValue } from "../../src/engine/rng.ts";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import frontierHeldItemsData from "../../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import speciesNamesData from "../../src/data/gen/species-names.json" with { type: "json" };
import speciesStatsData from "../../src/data/gen/species-stats.json" with { type: "json" };

const [mode] = process.argv.slice(2);
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
// parity-mac fourth pass, staged battles (docs/parity-mac/staged-battles.md): --stage=FILE replaces the census battle of a seed by a written one
// ({name, seed, challengeNum, battleNum, trainerId, playerSetIds, opponentSetIds, script}): real Factory sets, a real Factory trainer, the lab's own
// factoryLegal staging, the same production replay path; only the choice of sets and the player's actions are written by hand.
const stage: any = arg("stage") === undefined ? null : JSON.parse(readFileSync(arg("stage")!, "utf8"));
const seed = stage === null ? Number(arg("seed")) : Number(stage.seed);
const scene = (arg("scene") ?? "on") as "on" | "off";
// ais2: --render=FROM:TO --render-dir=DIR (replay / native) writes the engine's frame0-relative frames FROM..TO as DIR/engine-NNNNN.png (the app's own render(), the orchestrator wrapped in a core state).
const renderRange = arg("render") === undefined ? null : arg("render")!.split(":").map(Number) as [number, number];
const renderDir = arg("render-dir");
const renderer = renderRange === null ? null : await (async () => {
  const [core, { PNG }, { mkdirSync }] = await Promise.all([import("../../src/engine/core.ts"), import("pngjs"), import("node:fs")]);
  mkdirSync(renderDir!, { recursive: true });
  const base = core.createInitialState({ appRoute: "generated-orchestrator", battleScene: scene });
  return (orchestrator: any, f: number) => {
    const rgba = core.render({ ...base, factoryRoundBattleOrchestrator: orchestrator, rngMode: "frontierBattle" } as never);
    const png = new PNG({ width: 240, height: 160 }); png.data = Buffer.from(rgba);
    writeFileSync(`${renderDir}/engine-${String(f).padStart(5, "0")}.png`, PNG.sync.write(png));
  };
})();
// parity-mac fourth pass: the census mapping (seed * 11) % 49 only reaches challenges 1 to 7 (sets 110..755). --challenge=N / ROM_REPLAY_CHALLENGE=N (N = the
// game's 0-based challengeNum; 7 = the eighth challenge, sets 372..849) puts the seed's battle into that challenge: streak N * 7 + (seed * 11) % 7. Unset = the
// census mapping, so every older list keeps its battles.
const challengeArg = arg("challenge") ?? (process.env.ROM_REPLAY_CHALLENGE || undefined);
const challengeOverride = challengeArg === undefined ? null : Number(challengeArg);
if (challengeOverride !== null && !(Number.isInteger(challengeOverride) && challengeOverride >= 0 && challengeOverride <= 99)) throw new Error("--challenge / ROM_REPLAY_CHALLENGE must be an integer 0..99");
// Round replay (docs/parity-mac/round-replay.md): --round=1 / ROM_REPLAY_ROUND=1 starts the seed's battle at the FIRST battle of its challenge (battle number 0),
// so a whole round of seven battles can follow: streak = challenge * 7 (the challenge as above: --challenge, else the census mapping's challenge).
const roundReplay = (arg("round") ?? process.env.ROM_REPLAY_ROUND ?? "0") === "1";
// Round replay draft rule (see strongestPositions): first (default) | strongest.
const draftRule = (arg("draft") ?? process.env.ROM_REPLAY_DRAFT ?? "first") as "first" | "strongest";
// The battle room's lines after a won Noland battle (DefeatedNolandSilver / DefeatedNolandGold, scripts.inc:128-166): the symbol's three lines when the
// round's outcome gives a symbol, none otherwise. The site shows no such scene (docs/aud240d-script-sounds.md: the symbol script is not reproduced);
// what is compared is the outcome the engine computed.
const SYMBOL_TEXTS = { 1: ["NolandLetsSeeFrontierPass", "ReceivedKnowledgeSymbol", "NextTimeNoHoldsBarred"],
  2: ["OutOfMyLeagueLetsSeePass", "KnowledgeSymbolTookGoldenShine", "LastTimeILoseToYou"] } as const;
const SPEECH_TEXTS = ["NolandImFactoryHead", "ShakeOutKnowledgeBringItOn", "HarderLookThanLastTime", "AllRightBringItOn"];
// The ROM party's set ids of the new round being built (engineNewRound -> draftPositions).
let pendingRomParty: number[] | null = null;
const streak = stage !== null ? stage.challengeNum * 7 + stage.battleNum
  : roundReplay ? (challengeOverride ?? Math.floor(((seed * 11) % 49) / 7)) * 7
  : challengeOverride !== null ? challengeOverride * 7 + ((seed * 11) % 7) : (seed * 11) % 49;
// parity-mac: very long battles (PP stall into Struggle on both sides) pass the default; --frame-budget=N raises it for one run.
const frameBudget = Number(arg("frame-budget") ?? 200000);
// parity-mac: the player's Factory symbols for `request` / `native` (GetPlayerSymbolCountForFacility, frontier_util.c:1657-1698). 0 = the census config: streak 20 is the
// silver Noland battle. 1 = streak 41 is the gold one (the lab sets the silver symbol itself for a challenge-5 factoryBrain request). `replay` reads the tier from the setup.
// The environment variable ROM_REPLAY_SYMBOLS gives the same through an unchanged chain script (tools/audio/romDriveSeed.sh).
// Round replay: 2 = both symbols (the return battles at 21, 42, 63, ...; romRoundDriver.py --symbols 2).
const symbols = Number(arg("symbols") ?? process.env.ROM_REPLAY_SYMBOLS ?? 0) as 0 | 1 | 2;
if (symbols !== 0 && symbols !== 1 && !(symbols === 2 && roundReplay)) throw new Error("--symbols / ROM_REPLAY_SYMBOLS must be 0 or 1 (2 for a round replay)");
// Round replay: --heard=S,G / ROM_REPLAY_HEARD=S,G, the heard-speech bits the save starts with (battledBrainFlags; romRoundDriver.py --heard), with the
// symbols the save's Factory record (the library's start record `frontier`, docs/parity-mac/frontier-record.md), checked as the library checks it.
// Absent: neither speech heard (the round replay before the record; the save the lab stages has neither bit set).
const heardArg = arg("heard") ?? process.env.ROM_REPLAY_HEARD ?? "";
const startHeard = heardArg === "" ? { silver: false, gold: false }
  : validateFactoryFrontierRecord({ symbols, heardBrainSpeech: { silver: heardArg.split(",")[0] === "1", gold: heardArg.split(",")[1] === "1" } }).heardBrainSpeech;
// parity-mac fourth pass: the test player (romReplayPlayers.ts). The census player is the default, so every older chain and list keeps its battles.
const policy = (stage !== null ? "script" : arg("policy") ?? process.env.ROM_REPLAY_POLICY ?? "census") as PlayerPolicyName | "script";
if (policy !== "script" && !PLAYER_POLICIES.includes(policy)) throw new Error(`--policy / ROM_REPLAY_POLICY must be one of ${PLAYER_POLICIES.join(", ")}`);

// The lab stages the Tower streak at challengeNum * 7 (the stock bug reads it for opponent IVs); the census engine uses 0. Equal for challengeNum 0 (streak < 7).
const towerStreak = Math.floor(streak / 7) * 7;
const LCG_INV = 0xeeb9eb65;
const lcgInverse = (x: number) => Math.imul((x - 0x6073) >>> 0, LCG_INV | 0) >>> 0;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
const heldItemByTableId = new Map<number, number>((frontierHeldItemsData as any).entries.map((row: any) => [row.itemTableId, row.itemId]));

const nativeOrchestrator = () => beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
  id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: scene,
  factoryWinStreak: streak, playerTrainerId: 416049562, factorySymbolsCount: symbols,
  battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
  rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
}));

// The ROM party mon (battle_lab._party_mon) -> the engine record fields; the IV spread must be the uniform one the engine models.
function romRecord(mon: any) {
  const ivs = Object.values(mon.ivs) as number[];
  if (ivs.some((v) => v !== ivs[0])) throw new Error(`non-uniform ROM IVs ${JSON.stringify(mon.ivs)}`);
  return { personality: mon.personality >>> 0, fixedIv: ivs[0]!, abilitySlot: mon.abilitySlot as 0 | 1, otId: mon.otId >>> 0 };
}

// The two Random() words the ROM's personality loop spent on `personality`: the cursor c with top16(lcg(c)) = low and top16(lcg(lcg(c))) = high.
function constructionCursor(personality: number): number {
  const low = personality & 0xffff; const high = personality >>> 16;
  for (let t = 0; t < 0x10000; t += 1) {
    const s1 = ((low << 16) | t) >>> 0;
    if ((advanceRngValue(s1) >>> 16) === high) return lcgInverse(s1);
  }
  throw new Error(`no RNG cursor produces personality ${personality}`);
}

// parity-mac (docs/parity-mac/brain-replay-seam.md). The lab's Brain descriptor has no set ids (the ROM's FillFactoryBrainParty rolled the party): find each member's
// Frontier set in the challenge's GetFactoryMonId range by what the ROM built (species, the four moves with SetMonMoveAvoidReturn's Return -> Frustration, held item,
// nature). Exactly one set must fit.
const MOVE_RETURN = 216; const MOVE_FRUSTRATION = 218;
const moveIdByName = new Map<string, number>((movesData as any).moves.map((m: any) => [m.move, m.id]));
const speciesIdByName = new Map<string, number>((speciesNamesData as any).species.map((r: any, i: number) => [r.species, i]));
function brainSetId(mon: any, challengeNum: number): number {
  const range = getLevel50FactoryRentalRange(challengeNum, false); const rows = (frontierMonsData as any).entries as any[]; const hits: number[] = [];
  for (let id = range.start; id <= range.end; id += 1) {
    const row = rows[id];
    const moves = (row.moves as string[]).map((name) => { const m = name === "MOVE_NONE" ? 0 : moveIdByName.get(name); if (m === undefined) throw new Error(`unknown move ${name}`); return m === MOVE_RETURN ? MOVE_FRUSTRATION : m; });
    if (speciesIdByName.get(row.species) === mon.species && natureByName.get(row.nature) === mon.nature && heldItemByTableId.get(row.itemTableId) === mon.item
      && moves.join() === (mon.moves as number[]).join()) hits.push(id);
  }
  if (hits.length !== 1) throw new Error(`ROM Brain member species ${mon.species} moves ${mon.moves} item ${mon.item} nature ${mon.nature} fits ${hits.length} Frontier sets in ${range.start}..${range.end}`);
  return hits[0]!;
}

const IV_KEYS = ["hp", "attack", "defense", "speed", "spAttack", "spDefense"] as const;
// A party member's construction cursor. A personality alone fits more than one cursor (constructionCursor takes the first), which is enough
// while the IVs are one fixed value. A rolled spread (challenge 8: the fixed-IV table read one row past its end) is drawn from the two words
// right after the personality's (CreateBoxMon, pokemon.c:2277-2293), so there the cursor is the one in the ROM's stream: searched from
// `from` (a cursor of an earlier ROM frame) for the personality's two words followed by two that give the ROM's spread.
function memberConstructionCursor(mon: any, from: number | null): number {
  const want = IV_KEYS.map((k) => mon.ivs[k]);
  const p = mon.personality >>> 0;
  if (from !== null && new Set(want).size > 1) {
    let c = from >>> 0;
    for (let i = 0; i < 200_000; i += 1) {
      const w1 = advanceRngValue(c);
      if ((w1 >>> 16) === (p & 0xffff)) {
        const w2 = advanceRngValue(w1); const w3 = advanceRngValue(w2); const w4 = advanceRngValue(w3);
        const iv = battleScriptIvsFromRandomWords(w3 >>> 16, w4 >>> 16) as any;
        if ((w2 >>> 16) === p >>> 16 && IV_KEYS.map((k) => iv[k]).join() === want.join()) return c;
      }
      c = w1;
    }
  }
  return constructionCursor(p);
}
// Everything the engine derived for one Brain member, in the ROM read-back's field names (battle_lab._party_mon).
const brainMemberFacts = (m: any, otId: number) => ({
  species: m.species, level: m.level, personality: m.personality >>> 0, otId: otId >>> 0, nature: m.nature, abilitySlot: m.abilitySlot, ability: m.ability, item: m.item,
  moves: [...m.moves], pp: [...m.pp], ivs: IV_KEYS.map((k) => m.ivs[k]), evs: IV_KEYS.map((k) => m.evs[k]), friendship: m.friendship,
  maxHp: m.maxHP ?? m.maxHp, hp: m.hp, stats: [m.attack ?? m.stats.attack, m.defense ?? m.stats.defense, m.speed ?? m.stats.speed, m.spAttack ?? m.stats.spAttack, m.spDefense ?? m.stats.spDefense],
});

function brainOrchestrator(setup: any, freshBattleRngValue: number) {
  const { descriptor, snapshot } = setup;
  const player = snapshot.parties.player as any[]; const opponent = snapshot.parties.opponent as any[];
  const brainStreak = descriptor.challengeNum * 7 + descriptor.battleNum;
  if (brainStreak !== streak) throw new Error(`the lab staged Factory streak ${brainStreak}; census seed ${seed} is streak ${streak}`);
  const playerRecords = descriptor.player.map((p: any, i: number) => ({ setId: p.setId, ...romRecord(player[i]) }));
  const fillers = descriptor.rentalFillers.map((f: any) => {
    const nature = natureByName.get((frontierMonsData as any).entries[f.setId].nature)!;
    const input = { setId: f.setId, personality: nature, fixedIv: playerRecords[0].fixedIv, abilitySlot: 0 as const, otId: playerRecords[0].otId };
    return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
  });
  const player3 = playerRecords.map((r: any) => Object.freeze({ ...r, abilitySlot: createFactoryCorpusPartyMember(r).abilitySlot })) as any;
  const saved = [...player3, ...fillers];
  const playerTrainerId = playerRecords[0].otId as number;
  // The dice taken from the ROM: which three sets, and each member's personality (as the cursor of its accepted Random32 pair). The ROM's roll is not one clean
  // cursor: VBlankIntr's Random() (main.c:365-366) lands between FillFactoryBrainParty's draws (8 and 10 such draws between the members of ROM seed 1209).
  const generation = adoptFactoryBrainOpponentSchedule({
    factoryWinStreak: brainStreak, playerRentalSetIds: saved.map((r: any) => r.setId), playerTrainerId,
    setIds: opponent.slice(0, 3).map((m) => brainSetId(m, descriptor.challengeNum)) as [number, number, number],
    constructionRngValues: opponent.slice(0, 3).map((m) => constructionCursor(m.personality >>> 0)) as [number, number, number],
  });
  // The lab sets the silver symbol for a challenge-5 request and none for challenge 2 (oracle/battle_lab.py prepare).
  const state = createFactoryRoundBattleOrchestrator({
    id: `rom-replay-${seed}`, rngValue: 0, battleScene: scene, factoryWinStreak: brainStreak, factorySymbolsCount: descriptor.challengeNum === 5 ? 1 : 0,
    playerTrainerId, battleTowerLevel50WinStreak: brainStreak, facilityState: { rentsCount: 0 },
    rentals: { type: "currentRecords", playerRentalRecords: player3, savedRentalRecords: saved as any },
    adoptedInitialBrainOpponent: { generation, freshBattleRngValue, preCommandRngCalls: 0 },
  });
  const scheduled = state.opponentGenerations[0]!;
  if (scheduled.kind !== "frontier-brain") throw new Error(`the engine scheduled an ordinary trainer at streak ${brainStreak}, the ROM staged the Frontier Brain`);
  if (scheduled.generation.fixedIv !== descriptor.fixedIv) throw new Error(`Brain fixed IV: engine ${scheduled.generation.fixedIv} != lab ${descriptor.fixedIv}`);
  scheduled.generation.opponents.forEach((o, i) => {
    const engine = JSON.stringify(brainMemberFacts({ ...o.member, abilitySlot: o.abilitySlot }, o.otId)); const rom = JSON.stringify(brainMemberFacts(opponent[i], opponent[i].otId));
    if (engine !== rom) throw new Error(`Brain opponent ${i}: engine ${engine} != ROM ${rom}`);
  });
  return beginFactoryRoundBattleStartIntro(state);
}

function adoptedOrchestrator(setup: any, freshBattleRngValue: number) {
  if (setup.descriptor.mode === "factoryBrain") return brainOrchestrator(setup, freshBattleRngValue);
  const { descriptor, snapshot } = setup;
  const player = snapshot.parties.player as any[]; const opponent = snapshot.parties.opponent as any[];
  const playerRecords = descriptor.player.map((p: any, i: number) => ({ setId: p.setId, ...romRecord(player[i]) }));
  const fillers = descriptor.rentalFillers.map((f: any) => {
    const nature = natureByName.get((frontierMonsData as any).entries[f.setId].nature)!;
    const input = { setId: f.setId, personality: nature, fixedIv: playerRecords[0].fixedIv, abilitySlot: 0 as const, otId: playerRecords[0].otId };
    return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
  });
  const rec = (r: any) => Object.freeze({ ...r, abilitySlot: createFactoryCorpusPartyMember(r).abilitySlot });
  const player3 = playerRecords.map(rec) as any;
  const setIds = descriptor.opponent.map((o: any) => o.setId) as [number, number, number];
  let rng = 0x1234_5678; const ledger: any[] = []; const draw = (extra: object) => {
    const rngBefore = rng; rng = advanceRngValue(rng);
    ledger.push({ position: ledger.length, rngBefore, rngAfter: rng, randomU16: rng >>> 16, battleIndex: 0, ...extra });
  };
  draw({ phase: "trainer-selection", purpose: "trainer-candidate", attempt: 1, trainerId: descriptor.trainerId, trainerOutcome: "accepted" });
  setIds.forEach((id, opponentIndex) => draw({ phase: "set-selection", purpose: "set-candidate", opponentIndex, range: { start: 110, end: 199 }, candidateSetId: id, selectionOutcome: "accepted" }));
  const generation = adoptFactoryOpponentSchedule({
    factoryWinStreak: streak, battleIndex: 0, storedTrainerIds: [], savedRentalSetIds: [...player3.map((r: any) => r.setId), ...fillers.map((r: any) => r.setId)],
    playerTrainerId: playerRecords[0].otId, battleTowerLevel50WinStreak: towerStreak, trainerId: descriptor.trainerId, setIds, selectionDrawLedger: ledger,
    constructionRngValues: opponent.slice(0, 3).map((m) => constructionCursor(m.personality >>> 0)) as [number, number, number],
  });
  generation.opponents.forEach((o, i) => {
    const r = romRecord(opponent[i]);
    if (o.personality !== r.personality || o.otId !== r.otId || o.abilitySlot !== r.abilitySlot || o.ivs.attack !== r.fixedIv) {
      throw new Error(`opponent ${i}: engine ${o.personality}/${o.otId}/${o.abilitySlot}/${o.ivs.attack} != ROM ${r.personality}/${r.otId}/${r.abilitySlot}/${r.fixedIv}`);
    }
  });
  return beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `rom-replay-${seed}`, rngValue: 0, battleScene: scene, factoryWinStreak: streak, playerTrainerId: playerRecords[0].otId,
    // Round replay: the symbols the round driver stages (romRoundDriver.py --symbols); they decide whether battle 7 is Noland's. A single replay
    // keeps the default (its battle 1 is ordinary here).
    ...(roundReplay ? { factorySymbolsCount: symbols } : {}),
    // Round replay: battle 1's rent count as the ROM holds it (romRoundDriver.py --stage-rents writes it after the lab staging); a single replay keeps 0.
    // The heard-speech bits the save starts with (--heard).
    battleTowerLevel50WinStreak: towerStreak,
    facilityState: roundReplay ? { rentsCount: setup.round?.rentsCount ?? 0, heardBrainSpeech: startHeard } : { rentsCount: 0 },
    rentals: { type: "currentRecords", playerRentalRecords: player3, savedRentalRecords: [...player3, ...fillers] as any },
    adoptedInitialOpponent: { generation, freshBattleRngValue, preCommandRngCalls: 0 },
  }));
}

type Segment = { frames: number; buttons: string[] };
// forced (parity-mac): the ROM asks no move for this turn (forced Struggle / Encore, battle_main.c:4184-4197): FIGHT at the action menu commits it, the move menu never opens.
// voluntary (parity-mac fourth pass): the player chose the switch at the action menu (POKEMON). switch-refused / move-refused: a refusal probe; the engine does nothing.
type Decision = {
  kind: "move" | "switch" | "switch-refused" | "move-refused"; slot?: number; partyIndex?: number; forced?: true; voluntary?: true; source?: string;
  menuOpenFrame: number; fightMenuFrame?: number; commitFrame: number | null;
};

// The wide state of one decision point, in the shape soundEventProbe.py `wide_state` reads from the ROM (raw source fields; types as type ids).
const TYPE_IDS = ["TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND", "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC", "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK"];
function wideOf(rc: any) {
  const battler = (b: any) => ({
    partyIndex: b.partyIndex, species: b.species, hp: b.hp, maxHp: b.maxHP, status1: b.status1 >>> 0, status2: b.status2 >>> 0, status3: b.status3 >>> 0,
    statStages: [...b.statStages], moves: [...b.moves], pp: [...b.pp], item: b.item, ability: b.ability, types: b.types.map((t: string) => TYPE_IDS.indexOf(t)),
    stats: [b.attack, b.defense, b.speed, b.spAttack, b.spDefense],
    disabledMove: b.disabledMove, encoredMove: b.encoredMove, protectUses: b.protectUses, stockpileCounter: b.stockpileCounter, substituteHP: b.substituteHP,
    disableTimer: b.disableTimer, encoreTimer: b.encoreTimer, perishSongTimer: b.perishSongTimer, furyCutterCounter: b.furyCutterCounter,
    rolloutTimer: b.rolloutTimer, chargeTimer: b.chargeTimer, tauntTimer: b.tauntTimer, isFirstTurn: b.isFirstTurn,
    truantCounter: b.truantCounter, mimickedMoves: b.mimickedMoves, rechargeTimer: b.rechargeTimer,
  });
  const party = (members: any[]) => members.slice(0, 3).map((m) => ({ species: m.species, hp: m.hp, status1: (m.status1 ?? 0) >>> 0, pp: [...m.pp], item: m.item ?? 0 }));
  const side = (i: number) => ({
    status: rc.sideStatuses[i], reflectTimer: rc.sideTimers[i].reflectTimer, lightscreenTimer: rc.sideTimers[i].lightscreenTimer, mistTimer: rc.mistTimers[i],
    safeguardTimer: rc.sideTimers[i].safeguardTimer, spikesAmount: rc.sideTimers[i].spikesAmount,
  });
  return {
    battlers: [battler(rc.battlers[0]), battler(rc.battlers[1])], parties: [party(rc.party.player), party(rc.party.opponent)], sides: [side(0), side(1)],
    weather: rc.weather, weatherTimer: rc.weatherTimer,
    futureSightCounter: rc.futureSightCounter.slice(0, 2), futureSightAttacker: rc.futureSightAttacker.slice(0, 2), futureSightMove: rc.futureSightMove.slice(0, 2),
    wishCounter: rc.wishCounter.slice(0, 2), wishMonId: rc.wishMonId.slice(0, 2),
  };
}
// playerSeed (round replay): each battle of a round gets its own test-player generator; a single battle keeps the census seed.
function play(initial: any, record: boolean, patchRng: number | null = null, playerSeed: number = seed, playerOverride: Player | null = null) {
  let state = initial; let frame = 0; let ended = false; let error: string | null = null; let frame0: number | null = null;
  const sound: unknown[][] = []; const inputs: Segment[] = [];
  const player = playerOverride ?? (policy === "script" ? createScriptPlayer(seed, stage.script) : createPlayer(policy, playerSeed));
  let startRules: any = null; let startFacility: any = null;
  const wide: unknown[] = []; let lastRules: any = null;
  const cmdTrace: { last: string; rows: unknown[][] } | null = arg("cmdtrace") !== undefined ? { last: "", rows: [] } : null;
  let actionMenuRng: number | null = null; let randomTurnNumber: number | null = null; const timeline: number[][] = []; let lastTl = "";
  // aud243d: the engine's DECISIONS (absolute engine frames; result() makes them frame0-relative) for the ROM-side semantic driver (tools/audio/soundEventProbe.py lab --drive).
  const traceEvents = arg("events") !== undefined; const turnEvents: unknown[] = []; let recordedEvents = new WeakSet<object>();
  const decisions: Decision[] = []; let openSwitch: Decision | null = null;
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly string[] = []) => {
    if (++frame > frameBudget) throw new Error("frame budget");
    if (frame0 !== null) {
      const last = inputs.at(-1);
      if (last && last.buttons.join() === buttons.join()) last.frames += 1; else inputs.push({ frames: 1, buttons: [...buttons] });
    }
    const before = state;
    const { events } = collectSoundTick(frame, () => {
      beginScreenSoundTick(frame);
      if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons) as never);
      else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons) as never);
      else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons) as never);
      emitTickSounds({ battleScene: null, factoryRoundBattleOrchestrator: before } as never, { battleScene: null, factoryRoundBattleOrchestrator: state } as never);
      runScheduledScreenSounds();
    });
    if (renderer !== null && record && frame0 !== null && frame - frame0 >= renderRange![0] && frame - frame0 <= renderRange![1]) renderer(state, frame - frame0);
    for (const e of events) sound.push(e.mode === undefined ? [e.frame, e.kind, e.id, e.pan] : [e.frame, e.kind, e.id, e.pan, e.mode]);
    if (cmdTrace !== null) {
      // ctl1 (--cmdtrace): the engine's presentation command changes (frame, segment, command index, type, battler, hp from / to, lead) next to the sound rows.
      const res: any = state.battleResolutionPresentation;
      const seg = res?.segments?.[res.segmentIndex]; const cmd = seg?.commands?.[res.commandIndex];
      const key = cmd === undefined || res.lifecycle?.phase !== "presenting" ? "" : `${res.segmentIndex}.${res.commandIndex}`;
      if (key !== cmdTrace.last) {
        cmdTrace.last = key;
        if (cmd !== undefined && key !== "") cmdTrace.rows.push([frame, res.segmentIndex, res.commandIndex, cmd.type, cmd.battler ?? null, cmd.from ?? null, cmd.to ?? null, cmd.timing?.leadFrames ?? null, cmd.timing?.bodyLeadFrames ?? null, cmd.animation ?? null]);
      }
    }
    if (frame0 !== null && state.battle) {
      const rc = state.battle.rules.rulesContext; lastRules = rc;
      const row = [rc.currentMove, rc.battlers[0].hp, rc.battlers[1].hp, state.battle.rng.value, rc.moveHistory.lastMoves[0], rc.moveHistory.lastMoves[1]];
      if (row.join() !== lastTl) { lastTl = row.join(); timeline.push([frame - frame0, ...row]); }
    }
    if (openSwitch && !forcedSelector()) { openSwitch.commitFrame = frame; openSwitch = null; }
    // One chunk per resolved turn. A turn without a player decision (the second turn of a two-turn move, a recharge turn, the later turns of Rollout /
    // Outrage / Uproar / Bide) is resolved while the previous turn's presentation object is still up, so "the presentation appeared" alone missed it: its
    // events never reached the tally. A new turn is also known by the rules object changing under a presentation with other segments.
    const resBefore: any = before.battleResolutionPresentation; const resNow: any = state.battleResolutionPresentation;
    if (traceEvents && frame0 !== null && resNow && (!resBefore || (resNow.segments !== resBefore.segments && state.battle?.rules !== before.battle?.rules))) {
      const res: any = state.battleResolutionPresentation;
      const rulesBefore: any = before.battle?.rules.rulesContext ?? null;
      // wideBefore (parity-mac fourth pass): the wide state the turn starts from, for the tally (tools/audio/romReplayTally.py).
      // A turn resolved under the previous turn's presentation carries that turn's events again in its segments: keep only the events not recorded yet.
      if (!resBefore) recordedEvents = new WeakSet<object>();
      const fresh = (res.segments ?? []).flatMap((seg: any) => seg.events ?? []).filter((e: any) => !recordedEvents.has(e));
      for (const e of fresh) recordedEvents.add(e);
      turnEvents.push({ frame: frame - frame0, battlersBefore: JSON.parse(JSON.stringify(rulesBefore?.battlers ?? null)), wideBefore: rulesBefore === null ? null : wideOf(rulesBefore), events: fresh.map((e: any) => ({ seq: e.sequence, ...e.payload, label: e.provenance?.sourceLabel })), commands: (res.segments ?? []).flatMap((seg: any) => (seg.commands ?? []).map((c: any) => ({ type: c.type, seq: c.eventSequence, battler: c.battler, animation: c.animation, frames: c.timing?.minimumFrames }))) });
    }
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (b: string) => { step(); if (!ended) step([b]); if (!ended) step(); };
  function forcedSelector() {
    const s = state.battleForcedPartySelect;
    return s && s.sendOutElapsed === null && s.elapsed >= PARTY_LIST_INPUT_ELAPSED ? s : null;
  }
  const until = (p: () => boolean) => {
    while (!ended && !p()) {
      const s = forcedSelector();
      if (s) {
        if (!openSwitch && frame0 !== null) {
          // A forced replacement: the test player picks among the party slots the engine says are legal.
          const rules = state.battle!.rules.rulesContext;
          const partyIndex = player.chooseReplacement(rules, s.party.filter((m: any) => m.legal).map((m: any) => m.partyIndex));
          openSwitch = { kind: "switch", partyIndex, menuOpenFrame: frame, commitFrame: null };
          decisions.push(openSwitch); wide.push(wideOf(rules));
        }
        const wanted = openSwitch ? openSwitch.partyIndex! : Math.min(...s.party.filter((m: any) => m.legal).map((m: any) => m.partyIndex));
        const target = typeof s.cursor === "number" ? s.party.findIndex((r: any) => r.legal && r.partyIndex === wanted) : -1;
        pulse(s.message !== null ? "A" : (!s.submenuOpen && (typeof s.cursor === "number" ? s.cursor !== target : (s.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  try {
    until(() => phase() === "action-menu");
    frame0 = frame; actionMenuRng = state.battle?.rng.value ?? null; randomTurnNumber = (state.battle?.rules.rulesContext as any)?.randomTurnNumber ?? null;
    startRules = state.battle?.rules.rulesContext ?? null; startFacility = { rentsCount: state.facilityState?.rentsCount ?? null, performedRentalSwap: state.performedRentalSwap ?? null, heardBrainSpeech: state.facilityState?.heardBrainSpeech ?? { silver: false, gold: false } };
    if (patchRng !== null && state.battle) state = { ...state, battle: { ...state.battle, rng: { ...state.battle.rng, value: patchRng } } };
    if (!record) return { frame0, actionMenuRng, randomTurnNumber, state, sound, inputs, error, frames: frame, timeline, decisions, turnEvents, wide, finalWide: null, playerStats: player.stats, battleOutcome: null, startRules, startFacility, cmdTrace };
    // The action cursor: bit 0 = right column, bit 1 = lower row (FIGHT 0, BAG 1, POKEMON 2, RUN 3). The engine keeps it between turns as the ROM does.
    const actionCursorTo = (want: 0 | 2) => {
      for (let i = 0; i < 3 && !ended; i += 1) {
        const cursor = state.battleCommandPresentation?.actionCursor ?? want;
        if (cursor === want) break;
        pulse((cursor & 1) ? "LEFT" : (want === 2 ? "DOWN" : "UP"));
      }
    };
    while (!ended) {
      const actionMenuFrame = frame;
      const menuNow = state.battleCommandPresentation!; const rulesNow = state.battle!.rules.rulesContext;
      const forcedMove = menuNow.forcedMove ?? null;
      const turn = player.chooseTurn({
        rules: rulesNow,
        legalSlots: forcedMove !== null ? [forcedMove.decision.moveSlot] : ([0, 1, 2, 3] as const).filter((s) => menuNow.legalMoveBySlot[s] !== null),
        legalSwitches: (menuNow.request.legalDecisions as any[]).filter((d) => d.kind === "switch").map((d) => d.partyIndex),
        forcedMove: forcedMove !== null || battlerMoveSelectionIsForced(rulesNow as never, 0),
      });
      const wideNow = wideOf(rulesNow);
      // Refusal probes: the engine offers no such decision, so nothing is pressed here; the ROM driver tries them and must be refused.
      for (const probe of turn.probes) { decisions.push({ ...probe, menuOpenFrame: actionMenuFrame, commitFrame: actionMenuFrame }); wide.push(wideNow); }
      wide.push(wideNow);
      if (turn.action.kind === "switch") {
        // A voluntary switch through the engine's own menus: POKEMON, the party row, SHIFT.
        const decision: Decision = { kind: "switch", partyIndex: turn.action.partyIndex, voluntary: true, source: turn.source, menuOpenFrame: actionMenuFrame, commitFrame: null };
        decisions.push(decision);
        actionCursorTo(2);
        pulse("A");
        until(() => state.battlePartySelect !== null && state.battlePartySelect.openElapsed >= PARTY_SELECT_OPEN_TOTAL_FRAMES);
        const row = state.battlePartySelect?.rows.findIndex((r: any) => r.partyIndex === decision.partyIndex) ?? -1;
        if (row < 0 || !state.battlePartySelect!.rows[row]!.legal) throw new Error(`voluntary switch: party index ${decision.partyIndex} is not a legal row of the engine's party menu`);
        for (let i = 0; i < 5 && !ended && state.battlePartySelect && state.battlePartySelect.cursor !== row; i += 1) pulse("DOWN");
        pulse("A"); // the row: SHIFT / SUMMARY / CANCEL opens on SHIFT
        pulse("A"); // SHIFT
        if (state.battlePartySelect?.outcome?.kind !== "select") throw new Error(`voluntary switch: the engine's party menu did not take party index ${decision.partyIndex}`);
        decision.commitFrame = frame;
        until(() => state.battlePartySelect === null);
        until(() => !state.battleCommandPresentation);
        until(() => phase() === "action-menu");
        continue;
      }
      const chosenSlot = turn.action.slot;
      actionCursorTo(0);
      if (forcedMove !== null) {
        // enc276: FIGHT commits the forced turn, as in the ROM; the move menu never opens (Struggle shows "has no moves left!" first).
        decisions.push({ kind: "move", slot: forcedMove.decision.moveSlot, forced: true, source: turn.source, menuOpenFrame: actionMenuFrame, commitFrame: frame + 2 }); // pulse("A") presses A on its 2nd step
        pulse("A");
        if (phase() === "no-moves-message") {
          until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
          pulse("A");
        }
        until(() => !state.battleCommandPresentation);
        until(() => phase() === "action-menu");
        continue;
      }
      pulse("A");
      until(() => phase() === "fight-menu");
      if (ended) break;
      const fightMenuFrame = frame;
      const slot = chosenSlot;
      for (let i = 0; i < 4; i++) {
        const cursor = state.battleCommandPresentation!.fightCursor;
        if (cursor === slot) break;
        pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
      }
      const forced = battlerMoveSelectionIsForced(state.battle!.rules.rulesContext as never, 0);
      decisions.push({ kind: "move", slot, ...(forced ? { forced: true as const } : {}), source: turn.source, menuOpenFrame: actionMenuFrame, fightMenuFrame, commitFrame: frame + 2 }); // pulse("A") presses A on its 2nd step
      pulse("A");
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
    }
  } catch (e) { error = String(e); }
  return { frame0, actionMenuRng, randomTurnNumber, state, sound, inputs, error, frames: frame, timeline, decisions, turnEvents, wide, finalWide: lastRules === null ? null : wideOf(lastRules), playerStats: player.stats, battleOutcome: lastRules?.battleOutcome ?? null, startRules, startFacility, cmdTrace };
}

const rel = (r: ReturnType<typeof play>, v: number | null | undefined) => (v === null || v === undefined ? v : v - (r.frame0 ?? 0));
const result = (r: ReturnType<typeof play>, extra: object = {}) => ({
  ...(r.turnEvents.length ? { turnEvents: r.turnEvents } : {}),
  decisions: r.decisions.map((d) => ({ ...d, menuOpenFrame: rel(r, d.menuOpenFrame), fightMenuFrame: rel(r, d.fightMenuFrame), commitFrame: rel(r, d.commitFrame) })),
  seed, scene, policy, playerStats: r.playerStats, wide: r.wide, finalWide: r.finalWide, battleOutcome: r.battleOutcome,
  error: r.error, frame0: r.frame0, actionMenuRng: r.actionMenuRng, randomTurnNumber: r.randomTurnNumber, frames: r.frames,
  sound: r.sound.map((e) => [(e[0] as number) - (r.frame0 ?? 0), ...e.slice(1)]), inputs: r.inputs, timeline: r.timeline, ...(r.cmdTrace === null ? {} : { cmds: r.cmdTrace.rows.map((c) => [(c[0] as number) - (r.frame0 ?? 0), ...c.slice(1)]) }), ...extra,
});

// rrh5: a staged battle may carry `parties` (the Mechanic Lab's overrides.parties: three complete Pokemon per side). The lab writes them before CB2_InitBattle; the
// engine side still builds each member from its Factory set row, so the base set row at the same index is rewritten here (species, nature, four moves, item, EV flags)
// to describe the same Pokemon. The IVs are the base battle's; the lab's EV split must equal the engine's (510 over the flagged stats).
function applyStageParties(st: any): void {
  const rows = (frontierMonsData as any).entries as any[];
  const speciesNames = (speciesNamesData as any).species as any[]; const itemRows = (frontierHeldItemsData as any).entries as any[];
  const moveNameById = new Map<number, string>((movesData as any).moves.map((m: any) => [m.id, m.move]));
  const flagOf: Record<string, string> = { hp: "F_EV_SPREAD_HP", attack: "F_EV_SPREAD_ATTACK", defense: "F_EV_SPREAD_DEFENSE", speed: "F_EV_SPREAD_SPEED", spAttack: "F_EV_SPREAD_SP_ATTACK", spDefense: "F_EV_SPREAD_SP_DEFENSE" };
  for (const [side, ids] of [["player", st.playerSetIds], ["opponent", st.opponentSetIds]] as const) {
    st.parties[side].forEach((p: any, i: number) => {
      const row = rows[ids[i]]; if (row === undefined) throw new Error(`stage parties.${side}[${i}]: no set id ${ids[i]}`);
      const itemRow = itemRows.find((r: any) => r.itemId === (p.item ?? 0));
      if (itemRow === undefined) throw new Error(`stage parties.${side}[${i}]: item ${p.item} is not in the Frontier held-item table`);
      const evs = p.evs ?? {}; const flagged = Object.keys(flagOf).filter((k) => (evs[k] ?? 0) > 0);
      if (flagged.length === 0) throw new Error(`stage parties.${side}[${i}]: evs must name at least one stat`);
      const per = Math.floor(510 / flagged.length);
      if (flagged.some((k) => evs[k] !== per)) throw new Error(`stage parties.${side}[${i}]: evs must be ${per} on each of ${flagged.join(",")} (the engine's split)`);
      if (side === "opponent" && p.personality === undefined) {
        // The engine rebuilds an opponent's personality from an RNG cursor (constructionCursor), so the lab's own pick would have none: choose one that has a cursor, the right nature,
        // the ability slot in its low bit and, when the stage names a gender, that gender.
        const ratio = ((speciesStatsData as any).species as any[]).find((r: any) => r.name === row.species)?.genderRatio ?? 127;
        let c = (Number(st.seed) * 2654435761 + (i + 1) * 40503) >>> 0;
        for (let tries = 0; ; tries += 1) {
          if (tries > 400_000) throw new Error(`stage parties.opponent[${i}]: no personality with a cursor, nature ${p.nature ?? 0}, slot ${p.abilitySlot ?? 0}`);
          c = advanceRngValue(c); const s1 = advanceRngValue(c);
          const pers = (((s1 >>> 16) | ((advanceRngValue(s1) >>> 16) << 16)) >>> 0);
          const female = (pers & 0xff) < ratio;
          if (pers % 25 === (p.nature ?? 0) && (pers & 1) === (p.abilitySlot ?? 0) && (p.gender === undefined || (p.gender === "female") === female)) { p.personality = pers; break; }
        }
      }
      row.species = speciesNames[p.species].species; row.nature = (naturesData as any).natures[p.nature ?? 0].name; row.itemTableId = itemRow.itemTableId;
      row.moves = (p.moves as number[]).map((m) => (m === 0 ? "MOVE_NONE" : moveNameById.get(m)!)); row.evSpreadStats = flagged.map((k) => flagOf[k]);
    });
  }
}
if (stage !== null && stage.parties !== undefined) applyStageParties(stage);

if (mode === "request" && stage !== null) {
  // A staged battle: the request is the stage file's own sets and trainer. `mode: "factoryBrain"` (challengeNum 2 or 5, battleNum 6) stages Noland:
  // the player's sets are chosen, his party is rolled by the ROM from the seed.
  const stagedCommon = {
    schemaVersion: 1, profile: scene === "on" ? "battle-scene-on" : "battle-scene-off", level: 50, challengeNum: stage.challengeNum, rentalSwapCount: 0,
    replay: { policy: "script", stage: stage.name }, playerSetIds: stage.playerSetIds, seed,
    trace: { segments: [{ frames: 1, buttons: [] }], captureFrames: [0] },
  };
  writeFileSync(arg("out")!, JSON.stringify(stage.mode === "factoryBrain"
    ? { ...stagedCommon, mode: "factoryBrain" }
    : { ...stagedCommon, mode: stage.parties === undefined ? "factoryLegal" : "mechanicLab", ...(stage.parties === undefined ? {} : { overrides: { parties: stage.parties } }),
        battleNum: stage.battleNum, trainerId: stage.trainerId, opponentSetIds: stage.opponentSetIds }, null, 1));
} else if (mode === "request") {
  const o = nativeOrchestrator();
  const r = play(o, false);
  const g = r.state.opponentGenerations[0]; const rentals = r.state.round.rules.playerKernelParty;
  const setIds = (g.generation.opponents as any[]).map((x) => x.setId);
  // The player's team: the first three of the six rentals that the game lets a player select. The six can hold one species twice (the `currSpecies` quirk of
  // GenerateInitialRentalMons, battle_factory.c:566-576), but the select screen refuses a second Pokemon of a species already picked (Select_AreSpeciesValid,
  // battle_factory_screen.c:2256-2276, "Can't select same POKeMON"). Common from the eighth challenge on (sets 372..849 hold each species several times).
  const speciesOfSet = (setId: number): string => (frontierMonsData as any).entries[setId].species;
  const pickSelectable = (rentalList: any[]) => rentalList.reduce((team: any[], x: any) =>
    (team.length < 3 && !team.some((y) => speciesOfSet(y.setId) === speciesOfSet(x.setId)) ? [...team, x] : team), []);
  const playerSetIds = r.state.config.rentals.type !== "generateInitial" ? []
    : roundReplay && draftRule === "strongest" ? strongestPositions(r.state.initialRentalGeneration!.rentals as any[]).map((i) => (r.state.initialRentalGeneration!.rentals as any[])[i].setId)
    : pickSelectable(r.state.initialRentalGeneration!.rentals as any[]).map((x: any) => x.setId);
  void rentals;
  // `replay` is this tool's own note (the test player and the census seed); soundEventProbe.py / romStateTimeline.py drop it before the lab validates the request.
  const common = { schemaVersion: 1, profile: scene === "on" ? "battle-scene-on" : "battle-scene-off", level: 50, challengeNum: Math.floor(streak / 7), rentalSwapCount: 0, replay: { policy, censusSeed: seed, symbols, ...(challengeOverride !== null ? { challenge: challengeOverride } : {}) } };
  // parity-mac: Noland. The lab's factoryBrain mode takes no trainer / battle number / opponent sets (challenge 2 = silver, 5 = gold, always battle 7).
  writeFileSync(arg("out")!, JSON.stringify(g.kind === "frontier-brain" ? {
    ...common, mode: "factoryBrain", playerSetIds, seed,
    trace: { segments: [{ frames: 1, buttons: [] }], captureFrames: [0] },
  } : {
    ...common, mode: "factoryLegal", battleNum: 0, trainerId: g.trainerId,
    playerSetIds, opponentSetIds: setIds, seed,
    trace: { segments: [{ frames: 1, buttons: [] }], captureFrames: [0] },
  }, null, 1));
} else if (mode === "native") {
  writeFileSync(arg("out")!, JSON.stringify(result(play(nativeOrchestrator(), true))));
} else if (mode === "replay") {
  // aud243c: the ROM's menu gRngValue is POST-AI. The opponent controller answers CHOOSE_ACTION (AI_TrySwitchOrUseItem, battle_controller_opponent.c:1540) and CHOOSE_MOVE
  // (BattleAI_SetupAIData + BattleAI_ChooseMoveOrAction, :1566) while the player's action menu is still up, so its draws precede the menu; the engine spends them at the
  // turn's commit. Align on gRandomTurnNumber (setup.randomTurnNumber, or --turn-number=N for pre-aud243c setups) and require the engine's menu value to be
  // LCG^-j(ROM menu) for some j (j = the ROM opponent's pre-menu decision draws); k = the engine's own draws before its menu.
  const setup = JSON.parse(readFileSync(arg("setup")!, "utf8"));
  // parity-mac: the lab's intro acknowledgement (oracle/battle_lab.py _finish_intro_to_action_menu: 120 idle frames, then A for 2) can land its A on the
  // first action menu, pick FIGHT + slot 0 and play turn 1 before the snapshot (ROM seed 3623: the "setup" is turn 2, Graveler at 26 HP). The engine side
  // starts at turn 1, so such a staging cannot be replayed: fail here instead of reporting a mismatch at engine state 0.
  refuseStagingThatPlayedATurn(setup);
  const { attempt, chosen, candidates, target, turnNumber } = alignedPlay((fresh) => adoptedOrchestrator(setup, fresh), setup, seed);
  writeFileSync(arg("out")!, JSON.stringify(result(attempt, {
    romRngAtActionMenu: target, romRandomTurnNumber: turnNumber, romOpponentReply: setup.opponentReply ?? null,
    engineDrawsBeforeActionMenu: chosen.k, romOpponentDrawsBeforeActionMenu: chosen.j,
    alignment: { candidates: candidates.map(({ k, j, verified }) => ({ k, j, verified })), simulatedRngVerified: chosen.verified },
  })));
} else if (mode === "round") {
  roundMode();
} else if (mode === "round-compare") {
  roundCompareMode();
} else if (mode === "compare") {
  // aud243c: engine timeline rows [frame, currentMove, hp0, hp1, rng, last0, last1] against romStateTimeline.py rows of the same shape. The engine resolves a turn at its
  // commit, so each engine state (hp0, hp1, rng, last0, last1) must appear among the ROM's states in order; the first that does not is the divergence.
  // parity-mac fourth pass: --drive=drive.json (the closed-loop drive's own output). Without --rom its `drive.timeline` is the ROM timeline (the same rows the
  // frozen re-run gives when the trace is deterministic), and its `drive.wide` states are checked against the engine's (docs/parity-mac/wide-compare.md).
  const engine = JSON.parse(readFileSync(arg("engine")!, "utf8"));
  const drive = arg("drive") === undefined ? null : JSON.parse(readFileSync(arg("drive")!, "utf8")).drive;
  const rom = (arg("rom") === undefined ? drive.timeline : JSON.parse(readFileSync(arg("rom")!, "utf8")).rows) as number[][];
  const out = { seed, scene, ...compareBattle(engine, drive, rom) };
  console.log(JSON.stringify(out)); if (arg("out")) writeFileSync(arg("out")!, JSON.stringify(out));
} else if (mode === "scan") {
  const setup = JSON.parse(readFileSync(arg("setup")!, "utf8")); const target = setup.snapshot.rngValue >>> 0;
  const only = arg("draws");
  for (let tryK = 0; tryK <= 14; tryK += 1) {
    if (only !== undefined && tryK !== Number(only)) continue;
    let fresh = target; for (let i = 0; i < tryK; i += 1) fresh = lcgInverse(fresh);
    try { const pr = play(adoptedOrchestrator(setup, fresh), only !== undefined, arg("patch") ? target : null); console.log(tryK, pr.randomTurnNumber, pr.actionMenuRng, pr.actionMenuRng === target, pr.error); if (only !== undefined) console.log(JSON.stringify(pr.timeline.slice(0, 8))); } catch (e) { console.log(tryK, String(e).slice(0, 80)); }
  }
} else throw new Error("mode: request | native | replay | round | round-compare | compare | scan");

// parity-mac: the lab's intro acknowledgement (oracle/battle_lab.py _finish_intro_to_action_menu: 120 idle frames, then A for 2) can land its A on the
// first action menu, pick FIGHT + slot 0 and play turn 1 before the snapshot (ROM seed 3623: the "setup" is turn 2, Graveler at 26 HP). The engine side
// starts at turn 1, so such a staging cannot be replayed: fail here instead of reporting a mismatch at engine state 0.
function refuseStagingThatPlayedATurn(setup: any) {
  const stagedBattlers = [setup.snapshot.battlers.player, setup.snapshot.battlers.opponent];
  if ((setup.lastMoves as number[] | undefined)?.some((m) => m !== 0) || stagedBattlers.some((b: any) => b.hp !== b.maxHp || b.status1 !== 0)) {
    throw new Error(`the lab staging already played a turn (lastMoves ${JSON.stringify(setup.lastMoves ?? null)}, hp ${stagedBattlers.map((b: any) => `${b.hp}/${b.maxHp}`).join(" ")}); not replayable`);
  }
}

// The battle RNG at the action menu (aud243c, parity-mac). `makeState(fresh)` builds the orchestrator with its fresh battle kernel seeded from `fresh`; the k
// draws before the engine's menu and the j draws of the ROM opponent's pre-menu AI are found as described in `replay` below. Used for every battle of a round.
// knownK (round replay): the k a full search chose for this battle on an earlier run of the same round (same inputs, deterministic engine). It is tried
// alone first; only when it no longer qualifies does the full search run.
function alignedPlay(makeState: (fresh: number) => any, setup: any, playerSeed: number, knownK: number | null = null, finalPlayer: Player | null = null) {
  const target = setup.snapshot.rngValue >>> 0;
  const turnNumber = setup.randomTurnNumber ?? (arg("turn-number") === undefined ? undefined : Number(arg("turn-number")));
  if (turnNumber === undefined) throw new Error("setup has no randomTurnNumber (re-run soundEventProbe --setup-out) and no --turn-number=N");
  const behind = new Map<number, number>(); for (let j = 0, x = target; j <= 32; j += 1, x = lcgInverse(x)) behind.set(x, j);
  // parity-mac: a 16-bit turn number repeats by chance inside the 48-draw window about once in 4,000 seeds (ROM seed 1816: the value sits 2 and 15 draws
  // behind the menu), and the first hit was taken. When the opponent's reply is a move (byte 1 = 10, B_ACTION_EXEC_SCRIPT), BattleAI_SetupAIData ran before the
  // menu and its four `100 - Random() % 16` are in setup.opponentAiSimulatedRng: a candidate is verified when four consecutive draws among the ROM opponent's
  // j pre-menu draws give exactly those values. The first verified candidate wins; with none (older setups, a turn-1 AI switch) the first hit, as before.
  const sim: number[] | null = Array.isArray(setup.opponentAiSimulatedRng) && setup.opponentReply?.[1] === 10 ? setup.opponentAiSimulatedRng : null;
  const simVerified = (menuRng: number, draws: number) => {
    if (sim === null) return false;
    const values: number[] = []; for (let i = 0, x = menuRng; i < draws; i += 1) { x = advanceRngValue(x); values.push(100 - ((x >>> 16) % 16)); }
    for (let at = 0; at + 4 <= values.length; at += 1) if (sim.every((v, i) => values[at + i] === v)) return true;
    return false;
  };
  const tryOne = (tryK: number) => {
    let fresh = target; for (let i = 0; i < tryK; i += 1) fresh = lcgInverse(fresh);
    const probe = play(makeState(fresh), false, null, playerSeed);
    if (probe.randomTurnNumber !== turnNumber || probe.actionMenuRng === null || !behind.has(probe.actionMenuRng)) return null;
    const draws = behind.get(probe.actionMenuRng)!;
    return { k: tryK, j: draws, fresh, verified: simVerified(probe.actionMenuRng, draws) };
  };
  const candidates: { k: number; j: number; fresh: number; verified: boolean }[] = [];
  const known = knownK === null ? null : tryOne(knownK);
  if (known !== null && (known.verified || sim === null)) candidates.push(known);
  else {
    for (let tryK = 0; tryK <= 48; tryK += 1) {
      const c = tryOne(tryK);
      if (c === null) continue;
      candidates.push(c);
      if (c.verified || sim === null) break;
    }
  }
  const chosen = candidates.find((c) => c.verified) ?? candidates[0];
  if (chosen === undefined) throw new Error(`no draw count gives the ROM's gRandomTurnNumber ${turnNumber} with a menu RNG at most 32 draws before the ROM's ${target}`);
  const attempt = play(makeState(chosen.fresh), true, null, playerSeed, finalPlayer);
  return { attempt, chosen, candidates, target, turnNumber, replay: (player: Player) => play(makeState(chosen.fresh), true, null, playerSeed, player) };
}

// The turn compare of one battle (aud243c; parity-mac fourth pass wide compare). `rom` is the ROM timeline, `drive` the closed-loop drive (its `wide` states).
function compareBattle(engine: any, drive: any, rom: number[][]) {
  // aud243c: engine timeline rows [frame, currentMove, hp0, hp1, rng, last0, last1] against romStateTimeline.py rows of the same shape. The engine resolves a turn at its
  // commit, so each engine state (hp0, hp1, rng, last0, last1) must appear among the ROM's states in order; the first that does not is the divergence.
  // parity-mac fourth pass: --drive=drive.json (the closed-loop drive's own output). Without --rom its `drive.timeline` is the ROM timeline (the same rows the
  // frozen re-run gives when the trace is deterministic), and its `drive.wide` states are checked against the engine's (docs/parity-mac/wide-compare.md).
  const key = (r: number[]) => r.slice(2, 7).join();
  let at = 0; const matched: unknown[] = []; let divergence: unknown = null;
  // Row 0 is the engine's action-menu state, whose RNG is the ROM's pre-AI value by construction (see replay); compare from the first committed turn.
  for (const row of (engine.timeline as number[][]).slice(1)) {
    const found = rom.findIndex((r, i) => i >= at && key(r) === key(row));
    if (found < 0) { divergence = { engine: row, romAfter: rom.slice(at, at + 6) }; break; }
    matched.push({ engineFrame: row[0], romFrame: rom[found]![0], hp: [row[2], row[3]], rng: row[4], lastMoves: [row[5], row[6]] }); at = found;
  }
  let wide: unknown = null;
  if (drive !== null && Array.isArray(drive.wide) && Array.isArray(engine.wide)) {
    const diff = (a: any, b: any, path: string, into: { path: string; engine: unknown; rom: unknown }[]) => {
      if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) a.forEach((v, i) => diff(v, b[i], `${path}.${i}`, into));
      else if (a !== null && b !== null && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], path === "" ? k : `${path}.${k}`, into);
      } else if (JSON.stringify(a) !== JSON.stringify(b)) into.push({ path, engine: a ?? null, rom: b ?? null });
    };
    // Left out of the check (docs/parity-mac/wide-compare.md):
    //  - a fainted active Pokemon (0 HP on both sides) keeps only its party index, species and HP: its slot is about to be refilled, and the ROM has already run
    //    FaintClearSetData at the replacement menu while the engine's request boundary sits before it;
    //  - a ROM party member whose box could not be read on that frame (see soundEventProbe.py read_party_member) is skipped.
    let unread = 0;
    const strip = (w: any, engineWide: any, romWide: any) => ({
      ...w,
      battlers: w.battlers.map((x: any, i: number) => (engineWide.battlers[i].hp === 0 && romWide.battlers[i].hp === 0 ? { partyIndex: x.partyIndex, species: x.species, hp: 0 } : x)),
      parties: w.parties.map((side: any[], si: number) => side.map((m: any, mi: number) => (romWide.parties[si][mi].species === null ? { hp: m.hp, status1: m.status1 } : m))),
    });
    const points: unknown[] = []; const fields: Record<string, number> = {};
    const compared = Math.min(engine.wide.length, drive.wide.length);
    const pair = (e: any, r: any) => {
      for (const side of r.parties) for (const m of side) if (m.species === null) unread += 1;
      return [strip(e, e, r), strip(r, e, r)] as const;
    };
    for (let i = 0; i < compared; i += 1) {
      const [we, wr] = pair(engine.wide[i], drive.wide[i]);
      const d: { path: string; engine: unknown; rom: unknown }[] = []; diff(we, wr, "", d);
      if (d.length === 0) continue;
      for (const row of d) fields[row.path] = (fields[row.path] ?? 0) + 1;
      const dec = engine.decisions[i] ?? {};
      points.push({ index: i, decision: { kind: dec.kind, slot: dec.slot, partyIndex: dec.partyIndex, voluntary: dec.voluntary, forced: dec.forced }, diffs: d.slice(0, 16) });
    }
    const final: { path: string; engine: unknown; rom: unknown }[] = [];
    if (engine.finalWide && drive.finalWide) { const [we, wr] = pair(engine.finalWide, drive.finalWide); diff(we, wr, "", final); }
    wide = { compared, engineStates: engine.wide.length, romStates: drive.wide.length, diffPoints: points.length, first: points[0] ?? null, fields, final: final.slice(0, 24), unreadRomPartyMembers: unread };
  }
  return { matched: matched.length, engineRows: engine.timeline.length, romRows: rom.length, rows: matched, divergence, wide };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Round replay (docs/parity-mac/round-replay.md). `round --seed=N --setups=S0.json,S1.json,... [--swap=never|weakest|random]` plays battles 0..k of one round
// on the engine's round orchestrator, battle by battle, from the ROM read-backs S0..Sk that tools/audio/romRoundDriver.py writes at each battle's first action
// menu. Battle 0 is built from the lab staging as `replay` does. Every later battle comes out of the engine's own round flow: the battle-won result, the
// next opponent generated at GO ON (factory_generateopponentmons, BattleFactoryPreBattleRoom scripts.inc:137-138) by the engine's production code from the
// ROM's RNG cursor at that frame, the swap offer and the test player's swap decision, the swap itself, the heal and the next battle. What the engine takes from
// the ROM (because the overworld's VBlank Random() makes it depend on frame timing, main.c VBlankIntr): the RNG cursor before the trainer roll (found among the
// draws of the ROM frame that rolled it), the cursors of the three personality loops (as for battle 0), and the battle RNG at the action menu (as for battle 0).
// Everything else at the start of a battle is checked against the ROM (`start`): the battle number, the trainer, the opponent's three sets, and every field of
// both parties (species, level, personality, experience, friendship, ability slot, held item, moves, PP, PP Ups, IVs, EVs, max HP, HP, stats, status).
// Writes {seed, scene, policy, swapPolicy, challengeNum, battles: [the `replay` output of each battle + start, between, swapAfter]}.
function roundPlayerSeed(battleIndex: number): number { return (seed + battleIndex * 0x9e37) >>> 0; }
function withRoundRng(state: any, rngValue: number): any {
  return Object.freeze({ ...state, round: Object.freeze({ ...state.round, rules: Object.freeze({ ...state.round.rules, rngValue: rngValue >>> 0 }) }) });
}
function completePending(state: any, type: string): any {
  const command = state.round.presentation?.command;
  if (command?.type !== type) throw new Error(`round flow: expected a pending ${type}, the engine has ${command?.type ?? "none"} (phase ${state.round.rules.phase})`);
  return completeFactoryRoundPresentation(state, { commandId: command.commandId });
}
function statTotal(m: any): number { return m.maxHP + m.attack + m.defense + m.speed + m.spAttack + m.spDefense; }
// The swap screen's two lists: the player's three (gPlayerParty) and the beaten trainer's three (gEnemyParty), as the engine has them at the swap offer.
function swapMonsOf(state: any): { player: SwapMon[]; opponent: SwapMon[] } {
  const player = state.round.rules.playerKernelParty as any[]; const opponent = state.round.rules.lastBattle?.opponentKernelParty as any[] | null;
  if (!player || !opponent) throw new Error("round flow: the swap offer needs both kernel parties");
  return { player: player.map((m) => ({ species: m.species, statTotal: statTotal(m) })), opponent: opponent.map((m) => ({ species: m.species, statTotal: statTotal(m) })) };
}
function engineBetweenBattles(state: any, decision: any, setup: any, battleIndex: number) {
  if (state.round.rules.phase !== "presentingBattleWin") throw new Error(`round flow: battle ${battleIndex - 1} did not end in presentingBattleWin (phase ${state.round.rules.phase})`);
  const rr = setup.round; if (!rr) throw new Error(`setup of battle ${battleIndex} has no round facts (romRoundDriver.py writes them)`);
  const romSetIds = (rr.frontierTempParty as number[]).slice(0, 3);
  const report: any = { battleIndex, rom: { trainerId: rr.trainerId, setIds: romSetIds, generation: rr.generation ?? null } };
  const brain = getFactoryFrontierBrainStatus({ battleMode: "singles", winStreak: state.config.factoryWinStreak + battleIndex, symbolsCount: state.config.factorySymbolsCount ?? 0 });
  if (brain !== "not-ready") return brainBetweenBattles(state, decision, setup, battleIndex, report);
  // 1. The engine's production generation (preGenerateFactoryRoundNextOpponent, no adoption) from each cursor of the ROM frame that rolled the trainer.
  const gen = rr.generation;
  let found: { offset: number; pending: any; selection: any[] } | null = null; const tried: unknown[] = [];
  if (gen) {
    for (let j = 0, cursor = gen.rngBefore >>> 0; j <= gen.draws && found === null; j += 1, cursor = advanceRngValue(cursor)) {
      const pending = preGenerateFactoryRoundNextOpponent(withRoundRng(state, cursor)).pendingNextOpponent;
      if (pending === null) throw new Error("round flow: preGenerateFactoryRoundNextOpponent made no opponent");
      const selection = (pending.generation.drawLedger as any[]).filter((e) => e.phase === "trainer-selection" || e.phase === "set-selection");
      const setIds = (pending.generation.opponents as any[]).map((o) => o.setId);
      if (tried.length < 4) tried.push({ offset: j, trainerId: pending.trainerId, setIds, draws: selection.length });
      if (pending.trainerId === rr.trainerId && setIds.join() === romSetIds.join() && j + selection.length <= gen.draws) found = { offset: j, pending, selection };
    }
  }
  report.selection = found !== null
    ? { matched: true, offset: found.offset, engineDraws: found.selection.length, romFrameDraws: gen.draws }
    : { matched: false, romFrameDraws: gen?.draws ?? null, engineFirstOffsets: tried };
  // 2. The schedule the engine plays: its own selection (or the ROM's trainer and sets when it chose differently, so the battle can still be compared), with
  // the ROM's personality-loop cursors (battle 0's constructionCursor).
  const ledger = found !== null ? found.selection : (() => {
    let rng = 0x1234_5678; const rows: any[] = []; const draw = (extra: object) => {
      const rngBefore = rng; rng = advanceRngValue(rng);
      rows.push({ position: rows.length, rngBefore, rngAfter: rng, randomU16: rng >>> 16, battleIndex, ...extra });
    };
    draw({ phase: "trainer-selection", purpose: "trainer-candidate", attempt: 1, trainerId: rr.trainerId, trainerOutcome: "accepted" });
    romSetIds.forEach((id, opponentIndex) => draw({ phase: "set-selection", purpose: "set-candidate", opponentIndex, candidateSetId: id, selectionOutcome: "accepted" }));
    return rows;
  })();
  const rules = state.round.rules;
  const previous = state.opponentGenerations.at(-1);
  const opponent = setup.snapshot.parties.opponent as any[];
  const generation = adoptFactoryOpponentSchedule({
    factoryWinStreak: state.config.factoryWinStreak + battleIndex, battleIndex,
    storedTrainerIds: previous.storedTrainerIds,
    savedRentalSetIds: [...rules.playerRentalRecords.map((r: any) => r.setId), ...rules.currentOpponent.rentalRecords.map((r: any) => r.setId)],
    playerTrainerId: state.config.playerTrainerId, battleTowerLevel50WinStreak: state.config.battleTowerLevel50WinStreak,
    trainerId: found !== null ? found.pending.trainerId : rr.trainerId, setIds: (found !== null ? found.pending.generation.opponents.map((o: any) => o.setId) : romSetIds) as [number, number, number],
    selectionDrawLedger: ledger, constructionRngValues: opponent.slice(0, 3).map((m) => memberConstructionCursor(m, gen?.rngBefore ?? null)) as [number, number, number],
  });
  // 3. The round flow: GO ON (pre-generation), the battle-won result, the swap offer, the decision, the swap result, the next battle's start command.
  let s: any = Object.freeze({ ...state, config: Object.freeze({ ...state.config, adoptedNextOpponent: Object.freeze({ generation, battleIndex }) }) });
  s = preGenerateFactoryRoundNextOpponent(s);
  s = advanceFactoryRoundPresentation(completePending(s, "battleWon"));
  s = chooseFactoryRoundSwap(completePending(s, "swapOffer"), roundSwapDecision(decision));
  s = advanceFactoryRoundPresentation(completePending(s, "swapResolved"));
  if (s.round.rules.phase !== "presentingBattleStart" || s.round.rules.battleIndex !== battleIndex) {
    throw new Error(`round flow: after the swap the engine is at ${s.round.rules.phase} battle ${s.round.rules.battleIndex}, not the start of battle ${battleIndex}`);
  }
  return { state: s, report };
}
// The draft rule of the round replay's player: the first three of the six rentals that the select screen lets a player take together (no species
// twice, Select_AreSpeciesValid, battle_factory_screen.c:2256-2276), in draft order. romRoundDriver.py picks the same positions on the ROM.
function firstSelectablePositions(setIds: readonly number[]): number[] {
  const speciesOfSet = (setId: number): string => (frontierMonsData as any).entries[setId].species;
  const picked: number[] = [];
  setIds.forEach((id, i) => { if (picked.length < 3 && !picked.some((j) => speciesOfSet(setIds[j]!) === speciesOfSet(id))) picked.push(i); });
  if (picked.length !== 3) throw new Error(`no three selectable rentals in ${setIds.join(",")}`);
  return picked;
}
// --draft=strongest / ROM_REPLAY_DRAFT=strongest (the unbroken run): the three rentals with the highest stat totals (max HP + the five stats, as the
// rental is built: its set, nature, EVs and fixed IV), no species twice, ties to the lower position, in that order. romRoundDriver.py reads the same
// totals from the select screen's own Pokemon. The default is firstSelectablePositions.
function strongestPositions(records: readonly any[]): number[] {
  const speciesOfSet = (setId: number): string => (frontierMonsData as any).entries[setId].species;
  const totals = records.map((r) => statTotal(createFactoryCorpusPartyMember(r)));
  const order = records.map((_, i) => i).sort((a, b) => totals[b]! - totals[a]! || a - b);
  const picked: number[] = [];
  for (const i of order) if (picked.length < 3 && !picked.some((j) => speciesOfSet(records[j].setId) === speciesOfSet(records[i].setId))) picked.push(i);
  if (picked.length !== 3) throw new Error("no three selectable rentals");
  return picked;
}
// The test player's draft pick. With --draft=strongest the pick depends on the rentals' stats; where the draft's IVs are rolled spreads
// (challenge 8), those come from the select screen's personality loops, which run at a frame-timed RNG cursor the engine cannot know before
// the ROM shows them, so the pick is the ROM player's own (the ROM's party, in pick order), not a check. Otherwise the rule's positions.
function draftPositions(generation: any, fallback: number[]): number[] {
  if (draftRule !== "strongest") return fallback;
  if (!(generation.drawLedger as any[]).some((e) => e.phase === "random-ivs")) return strongestPositions(generation.rentals);
  const draft = (generation.rentals as any[]).map((r) => r.setId);
  const picked = (pendingRomParty ?? []).map((setId) => draft.indexOf(setId));
  if (picked.length !== 3 || picked.some((i) => i < 0) || new Set(picked).size !== 3) throw new Error(`the ROM's party ${pendingRomParty} is not three of the draft ${draft}`);
  return picked;
}
// The first battle of a chained round. In the source the fresh-draft entry rolls the six rentals (factory_generaterentalmons) and the first trainer and
// his three sets (factory_generateopponentmons) in one script run (BattleFactoryPreBattleRoom scripts.inc:30-31); the rentals' personalities are made
// later, when the select screen opens (Select_InitMonsData), and the trainer's at the battle's start. The engine's production round construction
// (createFactoryRoundBattleOrchestrator with generateInitial, as the site's game builds a chained round, core.ts) is run from each cursor of the ROM
// frame that rolled them, with the carried counters; it must give the ROM's six rentals, trainer and sets. The battle is then played from the engine's
// own records (set, fixed IV) with the ROM's personality cursors, as battle 1 of a single replay adopts them.
function engineNewRound(previous: any, carry: FactoryCarry, setup: any, n: number) {
  const rr = setup.round; const gen = rr.generation;
  if (!gen || !Array.isArray(gen.rentalMonsAfter)) throw new Error(`battle ${n}: the new round's setup has no draft roll record`);
  const romDraft = (gen.rentalMonsAfter as number[]).slice(0, 6);
  const romSetIds = (rr.frontierTempParty as number[]).slice(0, 3);
  pendingRomParty = (rr.rentalMons as any[]).slice(0, 3).map((r) => r.monId);
  let selected = firstSelectablePositions(romDraft);
  const config = (rngValue: number) => ({
    id: `rom-round-${seed}-${n}`, rngValue, battleScene: scene, factoryWinStreak: carry.factoryWinStreak, playerTrainerId: carry.playerTrainerId,
    battleTowerLevel50WinStreak: previous.config.battleTowerLevel50WinStreak, factorySymbolsCount: carry.factorySymbolsCount,
    // the heard-speech bits the carry keeps (core.ts builds a chained round the same way)
    facilityState: { rentsCount: carry.rentsCount, ...(carry.heardBrainSpeech ? { heardBrainSpeech: carry.heardBrainSpeech } : {}) },
  });
  const report: any = { battleIndex: n, newRound: true, carry, rom: { draft: romDraft, trainerId: rr.trainerId, setIds: romSetIds, generation: gen }, selected };
  let found: any = null; let draftOnly: any = null; const tried: unknown[] = [];
  for (let j = 0, cursor = gen.rngBefore >>> 0; j <= gen.draws && found === null; j += 1, cursor = advanceRngValue(cursor)) {
    const built = createFactoryRoundBattleOrchestrator({ ...config(cursor), rentals: { type: "generateInitial", selectedRentalIndexes: selected as [number, number, number] } });
    const draft = built.initialRentalGeneration!.rentals.map((r: any) => r.setId);
    const first = built.opponentGenerations[0]!;
    const setIds = (first.generation.opponents as any[]).map((o) => o.setId);
    if (tried.length < 3) tried.push({ offset: j, draft, trainerId: first.trainerId, setIds });
    if (draft.join() !== romDraft.join()) continue;
    if (draftOnly === null) {
      selected = draftPositions(built.initialRentalGeneration!, selected);
      report.selectedFrom = draftRule === "strongest" && (built.initialRentalGeneration!.drawLedger as any[]).some((e) => e.phase === "random-ivs") ? "rom-party" : "rule";
    }
    if (draftOnly === null) {
      // The draft fits at this cursor. Where would the trainer roll fit: right after the rentals' set selection (the source's order), or after
      // the engine's own personality draws for the six rentals (initialRentalGeneration.rngValue, what the round construction uses)?
      const g = built.initialRentalGeneration!;
      const at = (rngValue: number) => generateFactoryOpponent({ rngValue, factoryWinStreak: carry.factoryWinStreak, battleIndex: 0, storedTrainerIds: [],
        savedRentalSetIds: draft, playerTrainerId: carry.playerTrainerId, battleTowerLevel50WinStreak: previous.config.battleTowerLevel50WinStreak });
      const afterSelection = at(g.selectionRngValue); const afterConstruction = at(g.rngValue);
      draftOnly = { offset: j, rentalDraws: g.drawLedger.length,
        trainerAfterSelection: { trainerId: afterSelection.trainerId, setIds: afterSelection.opponents.map((o) => o.setId) },
        trainerAfterConstruction: { trainerId: afterConstruction.trainerId, setIds: afterConstruction.opponents.map((o) => o.setId) } };
    }
    if (first.trainerId === rr.trainerId && setIds.join() === romSetIds.join()) found = { offset: j, built, first };
  }
  report.selected = selected;
  report.selection = found !== null
    ? { matched: true, offset: found.offset, romFrameDraws: gen.draws }
    : { matched: false, romFrameDraws: gen.draws, draftFits: draftOnly, engineFirstOffsets: tried };
  // The battle: the engine's draft records when its draft fits (else the ROM's sets with the engine's IVs), the ROM's personalities.
  const base = found?.built ?? (draftOnly !== null
    ? createFactoryRoundBattleOrchestrator({ ...config(advanceRngValue(gen.rngBefore >>> 0)), rentals: { type: "generateInitial", selectedRentalIndexes: selected as [number, number, number] } })
    : null);
  const player = setup.snapshot.parties.player as any[]; const opponent = setup.snapshot.parties.opponent as any[];
  let draftRecords: any[];
  if (base !== null && base.initialRentalGeneration!.rentals.map((r: any) => r.setId).join() === romDraft.join()) draftRecords = [...base.initialRentalGeneration!.rentals];
  else {
    // No cursor of the frame gives the ROM's draft: play the ROM's draft, each record with the ROM's fixed IV, so the battle can still be compared.
    draftRecords = romDraft.map((setId, i) => {
      const k = selected.indexOf(i);
      return { setId, personality: 0, fixedIv: k >= 0 ? player[k].ivs.attack : player[0].ivs.attack, abilitySlot: 0 as const, otId: carry.playerTrainerId };
    });
  }
  // CreateBoxMon's ability slot comes from the personality (personality & 1, a one-ability species keeps slot 0): the ROM's personality, the engine's rule.
  // A rental whose fixed-IV argument rolls a spread (challenge 8: the IV table read one row past its end, factoryRentalGeneration.ts) takes its IVs
  // from the two Random() words right after its personality's two (Random32, then CreateBoxMon, pokemon.c:2277-2293): the ROM's stream, the
  // engine's rule. The select screen builds the six rentals in one go, so a VBlank interrupt's Random() (main.c:365-366) can fall between any
  // of those four words: from the draft roll's cursor, the stream is searched for the personality's low and high words and then two words whose
  // spread is the ROM's, each up to 3 draws after the one before; none found leaves the engine's own spread, and the difference shows.
  const rolledSlots = new Set(((base?.initialRentalGeneration?.drawLedger ?? []) as any[]).filter((e) => e.phase === "random-ivs").map((e) => e.rentalIndex));
  const ivGaps: unknown[] = [];
  const words: number[] = [];
  for (let i = 0, c = gen.rngBefore >>> 0; i < 200_000; i += 1) { c = advanceRngValue(c); words.push(c >>> 16); }
  const withPersonality = (r: any, mon: any, pos: number) => {
    const p = mon.personality >>> 0;
    let ivs = r.ivs;
    if (rolledSlots.has(pos)) {
      const want = IV_KEYS.map((k) => mon.ivs[k]).join();
      let hit: any = null;
      for (let i = 0; i < words.length - 16 && hit === null; i += 1) {
        if (words[i] !== (p & 0xffff)) continue;
        for (let g1 = 0; g1 < 4 && hit === null; g1 += 1) {
          if (words[i + 1 + g1] !== p >>> 16) continue;
          for (let g2 = 0; g2 < 4 && hit === null; g2 += 1) for (let g3 = 0; g3 < 4 && hit === null; g3 += 1) {
            const lo = i + 2 + g1 + g2; const spread = battleScriptIvsFromRandomWords(words[lo]!, words[lo + 1 + g3]!) as any;
            if (IV_KEYS.map((k) => spread[k]).join() === want) hit = { drawsAfterDraftRoll: i, gaps: [g1, g2, g3], spread };
          }
        }
      }
      ivGaps.push({ position: pos, found: hit === null ? null : { drawsAfterDraftRoll: hit.drawsAfterDraftRoll, gaps: hit.gaps } });
      if (hit !== null) ivs = hit.spread;
    }
    const rec = { ...r, personality: p, abilitySlot: (p & 1) as 0 | 1, ...(ivs ? { ivs, fixedIv: ivs.attack } : {}) };
    return Object.freeze({ ...rec, abilitySlot: createFactoryCorpusPartyMember(rec).abilitySlot });
  };
  const playerRecords = selected.map((pos, k) => withPersonality(draftRecords[pos], player[k], pos));
  if (ivGaps.length) report.rolledIvGaps = ivGaps;
  const savedRentalRecords = draftRecords.map((r, i) => (selected.includes(i) ? playerRecords[selected.indexOf(i)] : Object.freeze({ ...r })));
  const ledger = found !== null ? (found.first.generation.drawLedger as any[]).filter((e) => e.phase === "trainer-selection" || e.phase === "set-selection") : (() => {
    let rng = 0x1234_5678; const rows: any[] = []; const draw = (extra: object) => {
      const rngBefore = rng; rng = advanceRngValue(rng);
      rows.push({ position: rows.length, rngBefore, rngAfter: rng, randomU16: rng >>> 16, battleIndex: 0, ...extra });
    };
    draw({ phase: "trainer-selection", purpose: "trainer-candidate", attempt: 1, trainerId: rr.trainerId, trainerOutcome: "accepted" });
    romSetIds.forEach((id, opponentIndex) => draw({ phase: "set-selection", purpose: "set-candidate", opponentIndex, candidateSetId: id, selectionOutcome: "accepted" }));
    return rows;
  })();
  const generation = adoptFactoryOpponentSchedule({
    factoryWinStreak: carry.factoryWinStreak, battleIndex: 0, storedTrainerIds: [], savedRentalSetIds: draftRecords.map((r) => r.setId),
    playerTrainerId: carry.playerTrainerId, battleTowerLevel50WinStreak: previous.config.battleTowerLevel50WinStreak,
    trainerId: found !== null ? found.first.trainerId : rr.trainerId, setIds: (found !== null ? found.first.generation.opponents.map((o: any) => o.setId) : romSetIds) as [number, number, number],
    selectionDrawLedger: ledger, constructionRngValues: opponent.slice(0, 3).map((m) => memberConstructionCursor(m, gen.rngBefore)) as [number, number, number],
  });
  const makeState = (fresh: number) => beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    ...config(0), rentals: { type: "currentRecords", playerRentalRecords: playerRecords as any, savedRentalRecords: savedRentalRecords as any },
    adoptedInitialOpponent: { generation, freshBattleRngValue: fresh, preCommandRngCalls: 0 },
  }));
  return { report, makeState };
}
// Noland as a later battle of the round. The source has no GO ON roll for him: FillFactoryBrainParty rolls his party at the battle's start
// (battle_tower.c:1857), after the swap, excluding the six rentalMons set ids of that moment (battle_factory.c:786-792), with VBlank draws between the
// members. The engine (fix 45) rolls him at the swap's resolution with its rentals after the swap. So the round flow runs to the swap's result, and the
// engine then adopts the ROM's party (each member's set by what the ROM built, `brainSetId`; its personality cursor) through `adoptedNextBrainOpponent`.
// adoptFactoryBrainOpponentSchedule rejects a set the engine's rules would not roll; it is given the engine's own exclusion list (nextSavedRentalRecords at
// the swap's result: the player's three as swapped, the beaten trainer's three). When it refuses, the refusal is the finding, and the ROM's list
// (rentalMons) is used so the battle can still be compared.
function brainBetweenBattles(state: any, decision: any, setup: any, battleIndex: number, report: any) {
  const rr = setup.round;
  const opponent = setup.snapshot.parties.opponent as any[];
  const challengeNum = Math.floor((state.config.factoryWinStreak + battleIndex) / 7);
  const setIds = opponent.slice(0, 3).map((m) => brainSetId(m, challengeNum)) as [number, number, number];
  let s: any = preGenerateFactoryRoundNextOpponent(state);
  if (s.pendingNextOpponent !== null) throw new Error("round flow: the engine pre-generated a Frontier Brain battle at GO ON (the source rolls the Head at battle start)");
  s = advanceFactoryRoundPresentation(completePending(s, "battleWon"));
  s = chooseFactoryRoundSwap(completePending(s, "swapOffer"), roundSwapDecision(decision));
  const rules = s.round.rules;
  const engineList = [...rules.playerRentalRecords.map((r: any) => r.setId), ...rules.currentOpponent.rentalRecords.map((r: any) => r.setId)];
  const romList = (rr.rentalMons as any[]).map((r) => r.monId);
  const adopt = (list: number[]) => adoptFactoryBrainOpponentSchedule({
    factoryWinStreak: state.config.factoryWinStreak + battleIndex, playerRentalSetIds: list, playerTrainerId: state.config.playerTrainerId, setIds,
    constructionRngValues: opponent.slice(0, 3).map((m) => memberConstructionCursor(m, rr.generation?.rngBefore ?? null)) as [number, number, number],
  });
  let generation: any;
  try {
    generation = adopt(engineList);
    report.selection = { matched: true, brain: true, setIds, engineExclusion: engineList, romExclusion: romList };
  } catch (e) {
    report.selection = { matched: false, brain: true, setIds, engineExclusion: engineList, romExclusion: romList, refused: String(e) };
    generation = adopt(romList);
  }
  s = Object.freeze({ ...s, config: Object.freeze({ ...s.config, adoptedNextBrainOpponent: Object.freeze({ generation, battleIndex }) }) });
  s = advanceFactoryRoundPresentation(completePending(s, "swapResolved"));
  if (s.round.rules.phase !== "presentingBattleStart" || s.round.rules.battleIndex !== battleIndex) {
    throw new Error(`round flow: after the swap the engine is at ${s.round.rules.phase} battle ${s.round.rules.battleIndex}, not the start of battle ${battleIndex}`);
  }
  // Noland's lines before the battle, as the site's battle room builds them (core.ts: battleRoomStateForOpponent with the tier's heard bit), in the
  // ROM's text names (romRoundDriver.py BRAIN_TEXTS). A first speech sets its tier's bit, as core.ts does when its last box is accepted.
  const opponentNow = s.round.rules.currentOpponent;
  const tier: "silver" | "gold" = opponentNow.frontierBrain?.status === "gold" ? "gold" : "silver";
  const room = battleRoomStateForOpponent(opponentNow, undefined, factoryHeardBrainSpeech(s.facilityState, tier));
  const first = room.brainSpeechFirstEncounter === true;
  report.brainSpeech = { status: opponentNow.frontierBrain?.status ?? null, tier: room.brainSpeechTier, firstEncounter: first,
    texts: room.brainSpeechTier === "gold" ? [...(first ? ["HarderLookThanLastTime"] : []), "AllRightBringItOn"] : [...(first ? ["NolandImFactoryHead"] : []), "ShakeOutKnowledgeBringItOn"] };
  if (first) s = markFactoryBrainSpeechHeard(s, room.brainSpeechTier!);
  return { state: s, report };
}
// One party member as the battle has it (the rules context; EVs from the kernel party), in the ROM read-back's terms (oracle/battle_lab.py _party_mon).
function engineMemberFacts(m: any, evs: any) {
  return {
  species: m.species, level: m.level, personality: m.personality >>> 0, experience: m.experience, friendship: m.friendship, abilitySlot: m.abilityNum, item: m.item,
  moves: [...m.moves], pp: [...m.pp], ppUps: [0, 1, 2, 3].map((i) => (m.ppBonuses >> (2 * i)) & 3), ivs: IV_KEYS.map((k) => m.ivs[k]),
  evs: evs === null ? null : IV_KEYS.map((k) => evs[k]), maxHp: m.maxHP, hp: m.hp, stats: [m.attack, m.defense, m.speed, m.spAttack, m.spDefense], status1: m.status1 >>> 0,
};
}
function romMemberFacts(m: any) {
  return {
  species: m.species, level: m.level, personality: m.personality >>> 0, experience: m.experience, friendship: m.friendship, abilitySlot: m.abilitySlot, item: m.item,
  moves: [...m.moves], pp: [...m.pp], ppUps: [...m.ppUps], ivs: IV_KEYS.map((k) => m.ivs[k]), evs: IV_KEYS.map((k) => m.evs[k]), maxHp: m.maxHp, hp: m.hp,
  stats: [m.stats.attack, m.stats.defense, m.stats.speed, m.stats.spAttack, m.stats.spDefense], status1: (m.status1 ?? 0) >>> 0,
};
}
function battleStartCheck(attempt: any, setup: any, battleIndex: number, between: any = null) {
  const rc = attempt.startRules; const st = attempt.state; const rr = setup.round ?? null;
  if (rc === null) return { checked: false, reason: "the engine reached no action menu", diffs: [] };
  const scheduled = st.opponentGenerations[st.round.rules.battleIndex];
  const playerKernel = st.round.rules.playerKernelParty as any[];
  // The facility facts the round carries (fix 44): the streak, the rent count and the swap flag the next win pays (sPerformedRentalSwap).
  const facility = attempt.startFacility;
  const engine = {
    battleNum: st.round.rules.battleIndex, factoryWinStreak: st.config.factoryWinStreak + st.round.rules.battleIndex, factorySymbols: st.config.factorySymbolsCount ?? 0,
    rentsCount: facility?.rentsCount ?? null, performedRentalSwap: facility?.performedRentalSwap === null || facility === null ? null : Number(facility.performedRentalSwap),
    trainerId: scheduled?.trainerId ?? null,
    // the heard-speech bits (battledBrainFlags); a recording from before they were read has none, and is not checked for them
    heardBrainSpeech: rr?.heardBrainSpeech === undefined ? undefined
      : { silver: Number(facility?.heardBrainSpeech?.silver ?? false), gold: Number(facility?.heardBrainSpeech?.gold ?? false) },
    opponentSetIds: scheduled ? (scheduled.generation.opponents as any[]).map((o) => o.setId) : null,
    playerSetIds: (st.round.rules.playerRentalRecords as any[]).map((r) => r.setId),
    player: (rc.party.player as any[]).slice(0, 3).map((m, i) => engineMemberFacts(m, playerKernel?.[i]?.evs ?? null)),
    opponent: (rc.party.opponent as any[]).slice(0, 3).map((m, i) => engineMemberFacts(m, scheduled?.generation.party?.[i]?.evs ?? null)),
  };
  const rom = {
    battleNum: rr?.battleNum ?? null, factoryWinStreak: rr?.factoryWinStreak ?? null, factorySymbols: rr?.factorySymbols ?? null, rentsCount: rr?.rentsCount ?? null, performedRentalSwap: rr?.performedRentalSwap ?? null,
    trainerId: rr?.trainerId ?? null, heardBrainSpeech: rr?.heardBrainSpeech,
    // FillFactoryBrainParty writes no gFrontierTempParty: Noland's sets are the ones his built party fits (brainBetweenBattles).
    opponentSetIds: scheduled?.kind === "frontier-brain" ? (between?.report?.selection?.setIds ?? null) : rr ? rr.frontierTempParty.slice(0, 3) : null,
    playerSetIds: rr ? rr.rentalMons.slice(0, 3).map((r: any) => r.monId) : null,
    player: (setup.snapshot.parties.player as any[]).map(romMemberFacts), opponent: (setup.snapshot.parties.opponent as any[]).map(romMemberFacts),
  };
  const diffs: { path: string; engine: unknown; rom: unknown }[] = [];
  const walk = (a: any, b: any, path: string) => {
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) a.forEach((v, i) => walk(v, b[i], `${path}.${i}`));
    else if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], path ? `${path}.${k}` : k);
    else if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ path, engine: a ?? null, rom: b ?? null });
  };
  walk(engine, rom, "");
  return { checked: rr !== null, diffs, engine, rom };
}
function roundMode() {
  if (!roundReplay) throw new Error("round needs --round=1 (or ROM_REPLAY_ROUND=1): the round starts at battle number 0 of its challenge");
  const setups = arg("setups")!.split(",").map((f) => JSON.parse(readFileSync(f, "utf8")));
  const swapName = (arg("swap") ?? process.env.ROM_REPLAY_SWAP ?? "never") as SwapPolicyName;
  if (!SWAP_POLICIES.includes(swapName)) throw new Error(`--swap / ROM_REPLAY_SWAP must be one of ${SWAP_POLICIES.join(", ")}`);
  const swapper = createSwapPolicy(swapName, seed);
  // --known-k=K0,K1,...: the k each battle's alignment chose on an earlier run of this round (romRoundDriver.py passes them back); see alignedPlay.
  const knownKs = (arg("known-k") ?? "").split(",");
  const variants = (arg("player-variants") ?? "").split(",");
  const searchWins = Number(arg("search-wins") ?? 0);
  const battles: any[] = []; let terminal: any = null; let roundError: string | null = null;
  // The site's chaining (factoryRoundChaining.ts, core.ts at the Lobby): the counters a round carries into the next one.
  let carry: FactoryCarry = Object.freeze({ factoryWinStreak: streak, factorySymbolsCount: symbols, battlePoints: 0,
    rentsCount: setups[0]?.round?.rentsCount ?? 0, playerTrainerId: 0, heardBrainSpeech: startHeard });
  for (let n = 0; n < setups.length; n += 1) {
    const setup = setups[n];
    try {
      refuseStagingThatPlayedATurn(setup);
      let makeState: (fresh: number) => any; let between: any = null;
      if (n === 0) makeState = (fresh) => adoptedOrchestrator(setup, fresh);
      else if (setup.round?.battleNum === 0) {
        // The next round of a chain (romRoundDriver.py --rounds): the ROM played the Lobby, the attendant and the new draft itself.
        const ended = terminal.round.rules.phase;
        if (ended !== "roundComplete" && ended !== "roundLost") throw new Error(`battle ${n}: the ROM starts a new round, the engine's round is at ${ended}`);
        const won = ended === "roundComplete";
        const advanced = advanceFactoryCarry(carry, won, terminal.roundOutcome, terminal.facilityState.rentsCount, terminal.facilityState.heardBrainSpeech);
        carry = won ? advanced : carryForNewChallengeAfterLobby(advanced);
        between = engineNewRound(terminal, carry, setup, n);
        makeState = between.makeState;
      } else {
        const decision = battles[n - 1].swapAfter;
        if (!decision) throw new Error(`battle ${n}: the engine has no swap decision after battle ${n - 1} (it did not win it on the engine)`);
        between = engineBetweenBattles(terminal, decision, setup, terminal.round.rules.battleIndex + 1);
        makeState = (fresh) => beginFactoryRoundBattleStartIntro(withRoundRng(between.state, fresh));
      }
      const known = knownKs[n] === undefined || knownKs[n] === "" ? null : Number(knownKs[n]);
      const playerSeed = n === 0 ? seed : roundPlayerSeed(n);
      // --player-variants=V0,V1,... (the unbroken run): battle n is played by try V (0 = the policy; V > 0 = power-eps seeded from the battle and V).
      const variantOf = (v: number): Player | null => (v === 0 ? null : createPlayer("power-eps", (playerSeed + Math.imul(v, 0x01000193)) >>> 0));
      const knownVariant = variants[n] === undefined || variants[n] === "" ? null : Number(variants[n]);
      const aligned = alignedPlay(makeState, setup, playerSeed, known, variantOf(knownVariant ?? 0));
      const { chosen, candidates, target, turnNumber } = aligned;
      let attempt = aligned.attempt; let playerVariant = knownVariant ?? 0; let searchTries = 0;
      // --search-wins=N: the newest battle, when its try 0 loses on the engine, is tried again on the engine with tries 1..N-1 (the engine predicts the
      // ROM: it matched every turn so far); the first that wins is the one the ROM plays. Only the newest battle searches; earlier ones replay their try.
      const wonOn = (a: any) => a.error === null && (a.state.round.rules.phase === "presentingBattleWin" || a.state.round.rules.phase === "roundComplete");
      if (searchWins > 0 && knownVariant === null && n === setups.length - 1 && !wonOn(attempt)) {
        for (let v = 1; v < searchWins; v += 1) {
          searchTries = v;
          const tried = aligned.replay(variantOf(v)!);
          if (wonOn(tried)) { attempt = tried; playerVariant = v; break; }
        }
      }
      const start = battleStartCheck(attempt, setup, n, between);
      const phase = attempt.state.round.rules.phase;
      const swapAfter = attempt.error === null && phase === "presentingBattleWin" ? (() => {
        const { player, opponent } = swapMonsOf(attempt.state); const choice = swapper.choose(player, opponent, n);
        // --swap-override=N:player|enemy (ROM_REPLAY_SWAP_OVERRIDE): after battle N (0-based, counted over the whole run) cancel the swap instead
        // (YES, then back out at that list; the own Pokemon is party slot 0). The policy's own choice is still drawn, so later battles are unchanged.
        const [overrideAt, overrideList] = (arg("swap-override") ?? process.env.ROM_REPLAY_SWAP_OVERRIDE ?? "").split(":");
        return overrideAt !== "" && Number(overrideAt) === n ? { type: "cancel" as const, at: overrideList as "player" | "enemy", playerPartyIndex: 0 } : choice;
      })() : null;
      battles.push(result(attempt, {
        battleIndex: n, romRngAtActionMenu: target, romRandomTurnNumber: turnNumber, romOpponentReply: setup.opponentReply ?? null,
        engineDrawsBeforeActionMenu: chosen.k, romOpponentDrawsBeforeActionMenu: chosen.j,
        alignment: { candidates: candidates.map(({ k, j, verified }) => ({ k, j, verified })), simulatedRngVerified: chosen.verified },
        start: { checked: start.checked, diffs: start.diffs, ...(start.diffs.length ? { engine: start.engine, rom: start.rom } : {}) },
        between: between?.report ?? null, roundPhase: phase, swapAfter, carry: setup.round?.battleNum === 0 ? carry : undefined, playerVariant, searchTries,
        // The round's end (a loss, or the seventh win): what it gives (factoryBrainRoundOutcome.ts) and the heard bits it leaves.
        roundEnd: attempt.error === null && (phase === "roundComplete" || phase === "roundLost") ? {
          symbolGranted: attempt.state.roundOutcome?.symbolGranted ?? false, newSymbolsCount: attempt.state.roundOutcome?.newSymbolsCount ?? attempt.state.config.factorySymbolsCount ?? 0,
          heardBrainSpeech: attempt.state.facilityState?.heardBrainSpeech ?? { silver: false, gold: false },
        } : undefined,
      }));
      terminal = attempt.state;
      if (n === 0) carry = Object.freeze({ ...carry, playerTrainerId: attempt.state.config.playerTrainerId });
      if (attempt.error !== null) break;
    } catch (e) { roundError = `battle ${n}: ${String(e)}`; break; }
  }
  writeFileSync(arg("out")!, JSON.stringify({ seed, scene, policy, swapPolicy: swapName, challengeNum: Math.floor(streak / 7), roundError, battles, swapStats: swapper.stats }));
}
// `round-compare --engine=round-engine.json --drive=round-drive.json`: each battle's turn compare (compareBattle) on the ROM drive of that battle, with the
// battle-start check and the trainer-roll check the engine wrote.
function roundCompareMode() {
  const engine = JSON.parse(readFileSync(arg("engine")!, "utf8"));
  const drive = JSON.parse(readFileSync(arg("drive")!, "utf8"));
  const battles = (engine.battles as any[]).map((b, n) => {
    const d = drive.battles?.[n]?.drive ?? null;
    const cmp = d === null ? null : compareBattle(b, d, d.timeline);
    const turnsMatch = cmp !== null && cmp.divergence === null && (cmp.wide === null || (cmp.wide as any).diffPoints === 0) && b.error === null;
    // The one known, unfixed difference (docs/parity-mac/first-trainer-after-draft-picks.md): the first trainer of a chained round. The engine's
    // draft fits the ROM's, and its own code rolled right after the draft's set picks gives the ROM's trainer and sets, but the round construction
    // rolls him after the six rentals' personalities. Named apart so that it can hide nothing else: the battle still has to match in every other way.
    const sel: any = b.between?.selection ?? null;
    const rom: any = b.between?.rom ?? null;
    const knownFirstTrainerOrder = b.between?.newRound === true && sel?.matched === false && sel.draftFits !== null && rom !== null
      && sel.draftFits.trainerAfterSelection.trainerId === rom.trainerId && sel.draftFits.trainerAfterSelection.setIds.join() === rom.setIds.join();
    // The battle room's screens around Noland (romRoundDriver.py records the lines his script shows: brainTexts). Before his battle: the engine's
    // speech (brainBetweenBattles) against the lines on the ROM between the previous battle and this one. After a round's last battle: the symbol's
    // lines the engine's outcome implies against the ROM's, read where the ROM went on to the next round or (the run's end) the next draft screen,
    // and there also the symbols and heard bits the save holds. A recording from before the lines were read is not checked for them.
    const romBefore = n > 0 ? drive.battles?.[n - 1]?.between ?? null : null;
    const speech = b.between?.brainSpeech === undefined ? null : {
      engine: b.between.brainSpeech.texts, rom: romBefore?.brainTexts === undefined ? null : (romBefore.brainTexts as string[]).filter((t) => SPEECH_TEXTS.includes(t)) };
    const romAfter = drive.battles?.[n]?.between ?? null;
    const afterChecked = b.roundEnd !== undefined && romAfter?.brainTexts !== undefined && (romAfter.newRound === true || romAfter.reachedDraft === true);
    const symbolTexts = Object.values(SYMBOL_TEXTS).flat() as string[];
    const symbol = !afterChecked ? null : {
      engine: { texts: b.roundEnd.symbolGranted ? [...SYMBOL_TEXTS[b.roundEnd.newSymbolsCount as 1 | 2]] : [], ...(romAfter.afterRound
        ? { factorySymbols: b.roundEnd.newSymbolsCount, heardBrainSpeech: { silver: Number(b.roundEnd.heardBrainSpeech.silver), gold: Number(b.roundEnd.heardBrainSpeech.gold) } } : {}) },
      rom: { texts: (romAfter.brainTexts as string[]).filter((t) => symbolTexts.includes(t)), ...(romAfter.afterRound ?? {}) },
    };
    const screensMatch = (speech === null || speech.rom === null || JSON.stringify(speech.engine) === JSON.stringify(speech.rom))
      && (symbol === null || JSON.stringify(symbol.engine) === JSON.stringify(symbol.rom));
    return {
      battleIndex: n, engineError: b.error, roundPhase: b.roundPhase, swapAfter: b.swapAfter, romSwap: drive.battles?.[n]?.between?.swap ?? null,
      startDiffs: b.start?.diffs ?? null, selection: b.between?.selection ?? null,
      turns: cmp === null ? null : { matched: cmp.matched, engineStates: cmp.engineRows - 1, divergence: cmp.divergence, wideDiffPoints: (cmp.wide as any)?.diffPoints ?? null, wideFirst: (cmp.wide as any)?.first ?? null, wideFinal: (cmp.wide as any)?.final ?? null },
      romStop: d?.stop ?? null, romOutcome: d?.outcome ?? null, speech, symbol, screensMatch,
      match: turnsMatch && screensMatch && (b.start?.diffs?.length ?? 0) === 0 && (n === 0 || b.between?.selection?.matched === true),
      knownDifference: knownFirstTrainerOrder ? "first-trainer-order" : null,
      matchExceptKnown: turnsMatch && screensMatch && (b.start?.diffs?.length ?? 0) === 0 && (n === 0 || b.between?.selection?.matched === true || knownFirstTrainerOrder),
    };
  });
  const out = { seed: engine.seed, scene: engine.scene, policy: engine.policy, swapPolicy: engine.swapPolicy, challengeNum: engine.challengeNum, roundError: engine.roundError ?? null,
    romError: drive.error ?? null, romBattles: drive.battles?.length ?? 0, battles, match: engine.roundError === null && !drive.error && battles.length > 0 && battles.every((b) => b.match),
    matchExceptKnown: engine.roundError === null && !drive.error && battles.length > 0 && battles.every((b) => b.matchExceptKnown),
    rounds: 1 + battles.filter((b) => (b.selection as any)?.newRound === true || b.knownDifference !== null).length };
  console.log(JSON.stringify({ seed: out.seed, match: out.match, battles: battles.length }));
  if (arg("out")) writeFileSync(arg("out")!, JSON.stringify(out));
}
