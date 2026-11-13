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
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { adoptFactoryOpponentSchedule } from "../../src/engine/factoryOpponentGeneration.ts";
import { adoptFactoryBrainOpponentSchedule } from "../../src/engine/factoryBrainOpponentGeneration.ts";
import { getLevel50FactoryRentalRange } from "../../src/engine/factoryRentalGeneration.ts";
import { battlerMoveSelectionIsForced } from "../../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { PARTY_SELECT_OPEN_TOTAL_FRAMES } from "../../src/engine/battlePartySelect.ts";
import { createPlayer, PLAYER_POLICIES, type PlayerPolicyName } from "./romReplayPlayers.ts";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { beginScreenSoundTick, runScheduledScreenSounds } from "../../src/engine/screenSounds.ts";
import { emitTickSounds } from "../../src/engine/tickSounds.ts";
import { advanceRngValue } from "../../src/engine/rng.ts";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import frontierHeldItemsData from "../../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import speciesNamesData from "../../src/data/gen/species-names.json" with { type: "json" };

const [mode] = process.argv.slice(2);
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const seed = Number(arg("seed"));
const scene = (arg("scene") ?? "on") as "on" | "off";
const streak = (seed * 11) % 49;
// parity-mac: very long battles (PP stall into Struggle on both sides) pass the default; --frame-budget=N raises it for one run.
const frameBudget = Number(arg("frame-budget") ?? 200000);
// parity-mac: the player's Factory symbols for `request` / `native` (GetPlayerSymbolCountForFacility, frontier_util.c:1657-1698). 0 = the census config: streak 20 is the
// silver Noland battle. 1 = streak 41 is the gold one (the lab sets the silver symbol itself for a challenge-5 factoryBrain request). `replay` reads the tier from the setup.
// The environment variable ROM_REPLAY_SYMBOLS gives the same through an unchanged chain script (tools/audio/romDriveSeed.sh).
const symbols = Number(arg("symbols") ?? process.env.ROM_REPLAY_SYMBOLS ?? 0);
if (symbols !== 0 && symbols !== 1) throw new Error("--symbols / ROM_REPLAY_SYMBOLS must be 0 or 1");
// parity-mac fourth pass: the test player (romReplayPlayers.ts). The census player is the default, so every older chain and list keeps its battles.
const policy = (arg("policy") ?? process.env.ROM_REPLAY_POLICY ?? "census") as PlayerPolicyName;
if (!PLAYER_POLICIES.includes(policy)) throw new Error(`--policy / ROM_REPLAY_POLICY must be one of ${PLAYER_POLICIES.join(", ")}`);

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
    battleTowerLevel50WinStreak: towerStreak, facilityState: { rentsCount: 0 },
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
function play(initial: any, record: boolean, patchRng: number | null = null) {
  let state = initial; let frame = 0; let ended = false; let error: string | null = null; let frame0: number | null = null;
  const sound: unknown[][] = []; const inputs: Segment[] = [];
  const player = createPlayer(policy, seed); const wide: unknown[] = []; let lastRules: any = null;
  let actionMenuRng: number | null = null; let randomTurnNumber: number | null = null; const timeline: number[][] = []; let lastTl = "";
  // aud243d: the engine's DECISIONS (absolute engine frames; result() makes them frame0-relative) for the ROM-side semantic driver (tools/audio/soundEventProbe.py lab --drive).
  const traceEvents = arg("events") !== undefined; const turnEvents: unknown[] = [];
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
    for (const e of events) sound.push(e.mode === undefined ? [e.frame, e.kind, e.id, e.pan] : [e.frame, e.kind, e.id, e.pan, e.mode]);
    if (frame0 !== null && state.battle) {
      const rc = state.battle.rules.rulesContext; lastRules = rc;
      const row = [rc.currentMove, rc.battlers[0].hp, rc.battlers[1].hp, state.battle.rng.value, rc.moveHistory.lastMoves[0], rc.moveHistory.lastMoves[1]];
      if (row.join() !== lastTl) { lastTl = row.join(); timeline.push([frame - frame0, ...row]); }
    }
    if (openSwitch && !forcedSelector()) { openSwitch.commitFrame = frame; openSwitch = null; }
    if (traceEvents && frame0 !== null && state.battleResolutionPresentation && !before.battleResolutionPresentation) {
      const res: any = state.battleResolutionPresentation;
      const rulesBefore: any = before.battle?.rules.rulesContext ?? null;
      // wideBefore (parity-mac fourth pass): the wide state the turn starts from, for the tally (tools/audio/romReplayTally.py).
      turnEvents.push({ frame: frame - frame0, battlersBefore: JSON.parse(JSON.stringify(rulesBefore?.battlers ?? null)), wideBefore: rulesBefore === null ? null : wideOf(rulesBefore), events: (res.segments ?? []).flatMap((seg: any) => seg.events ?? []).map((e: any) => ({ seq: e.sequence, ...e.payload, label: e.provenance?.sourceLabel })) });
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
    if (patchRng !== null && state.battle) state = { ...state, battle: { ...state.battle, rng: { ...state.battle.rng, value: patchRng } } };
    if (!record) return { frame0, actionMenuRng, randomTurnNumber, state, sound, inputs, error, frames: frame, timeline, decisions, turnEvents, wide, finalWide: null, playerStats: player.stats, battleOutcome: null };
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
  return { frame0, actionMenuRng, randomTurnNumber, state, sound, inputs, error, frames: frame, timeline, decisions, turnEvents, wide, finalWide: lastRules === null ? null : wideOf(lastRules), playerStats: player.stats, battleOutcome: lastRules?.battleOutcome ?? null };
}

const rel = (r: ReturnType<typeof play>, v: number | null | undefined) => (v === null || v === undefined ? v : v - (r.frame0 ?? 0));
const result = (r: ReturnType<typeof play>, extra: object = {}) => ({
  ...(r.turnEvents.length ? { turnEvents: r.turnEvents } : {}),
  decisions: r.decisions.map((d) => ({ ...d, menuOpenFrame: rel(r, d.menuOpenFrame), fightMenuFrame: rel(r, d.fightMenuFrame), commitFrame: rel(r, d.commitFrame) })),
  seed, scene, policy, playerStats: r.playerStats, wide: r.wide, finalWide: r.finalWide, battleOutcome: r.battleOutcome,
  error: r.error, frame0: r.frame0, actionMenuRng: r.actionMenuRng, randomTurnNumber: r.randomTurnNumber, frames: r.frames,
  sound: r.sound.map((e) => [(e[0] as number) - (r.frame0 ?? 0), ...e.slice(1)]), inputs: r.inputs, timeline: r.timeline, ...extra,
});

if (mode === "request") {
  const o = nativeOrchestrator();
  const r = play(o, false);
  const g = r.state.opponentGenerations[0]; const rentals = r.state.round.rules.playerKernelParty;
  const setIds = (g.generation.opponents as any[]).map((x) => x.setId);
  const playerSetIds = r.state.config.rentals.type === "generateInitial" ? (r.state.initialRentalGeneration!.rentals as any[]).slice(0, 3).map((x) => x.setId) : [];
  void rentals;
  // `replay` is this tool's own note (the test player and the census seed); soundEventProbe.py / romStateTimeline.py drop it before the lab validates the request.
  const common = { schemaVersion: 1, profile: scene === "on" ? "battle-scene-on" : "battle-scene-off", level: 50, challengeNum: Math.floor(streak / 7), rentalSwapCount: 0, replay: { policy, censusSeed: seed, symbols } };
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
  const stagedBattlers = [setup.snapshot.battlers.player, setup.snapshot.battlers.opponent];
  if ((setup.lastMoves as number[] | undefined)?.some((m) => m !== 0) || stagedBattlers.some((b: any) => b.hp !== b.maxHp || b.status1 !== 0)) {
    throw new Error(`the lab staging already played a turn (lastMoves ${JSON.stringify(setup.lastMoves ?? null)}, hp ${stagedBattlers.map((b: any) => `${b.hp}/${b.maxHp}`).join(" ")}); not replayable`);
  }
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
  const candidates: { k: number; j: number; fresh: number; verified: boolean }[] = [];
  for (let tryK = 0; tryK <= 48; tryK += 1) {
    let fresh = target; for (let i = 0; i < tryK; i += 1) fresh = lcgInverse(fresh);
    const probe = play(adoptedOrchestrator(setup, fresh), false);
    if (probe.randomTurnNumber === turnNumber && probe.actionMenuRng !== null && behind.has(probe.actionMenuRng)) {
      const draws = behind.get(probe.actionMenuRng)!;
      candidates.push({ k: tryK, j: draws, fresh, verified: simVerified(probe.actionMenuRng, draws) });
      if (candidates.at(-1)!.verified || sim === null) break;
    }
  }
  const chosen = candidates.find((c) => c.verified) ?? candidates[0];
  if (chosen === undefined) throw new Error(`no draw count gives the ROM's gRandomTurnNumber ${turnNumber} with a menu RNG at most 32 draws before the ROM's ${target}`);
  const attempt = play(adoptedOrchestrator(setup, chosen.fresh), true);
  writeFileSync(arg("out")!, JSON.stringify(result(attempt, {
    romRngAtActionMenu: target, romRandomTurnNumber: turnNumber, romOpponentReply: setup.opponentReply ?? null,
    engineDrawsBeforeActionMenu: chosen.k, romOpponentDrawsBeforeActionMenu: chosen.j,
    alignment: { candidates: candidates.map(({ k, j, verified }) => ({ k, j, verified })), simulatedRngVerified: chosen.verified },
  })));
} else if (mode === "compare") {
  // aud243c: engine timeline rows [frame, currentMove, hp0, hp1, rng, last0, last1] against romStateTimeline.py rows of the same shape. The engine resolves a turn at its
  // commit, so each engine state (hp0, hp1, rng, last0, last1) must appear among the ROM's states in order; the first that does not is the divergence.
  // parity-mac fourth pass: --drive=drive.json (the closed-loop drive's own output). Without --rom its `drive.timeline` is the ROM timeline (the same rows the
  // frozen re-run gives when the trace is deterministic), and its `drive.wide` states are checked against the engine's (docs/parity-mac/wide-compare.md).
  const engine = JSON.parse(readFileSync(arg("engine")!, "utf8"));
  const drive = arg("drive") === undefined ? null : JSON.parse(readFileSync(arg("drive")!, "utf8")).drive;
  const rom = (arg("rom") === undefined ? drive.timeline : JSON.parse(readFileSync(arg("rom")!, "utf8")).rows) as number[][];
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
  const out = { seed, scene, matched: matched.length, engineRows: engine.timeline.length, romRows: rom.length, rows: matched, divergence, wide };
  console.log(JSON.stringify(out)); if (arg("out")) writeFileSync(arg("out")!, JSON.stringify(out));
} else if (mode === "scan") {
  const setup = JSON.parse(readFileSync(arg("setup")!, "utf8")); const target = setup.snapshot.rngValue >>> 0;
  const only = arg("draws");
  for (let tryK = 0; tryK <= 14; tryK += 1) {
    if (only !== undefined && tryK !== Number(only)) continue;
    let fresh = target; for (let i = 0; i < tryK; i += 1) fresh = lcgInverse(fresh);
    try { const pr = play(adoptedOrchestrator(setup, fresh), only !== undefined, arg("patch") ? target : null); console.log(tryK, pr.randomTurnNumber, pr.actionMenuRng, pr.actionMenuRng === target, pr.error); if (only !== undefined) console.log(JSON.stringify(pr.timeline.slice(0, 8))); } catch (e) { console.log(tryK, String(e).slice(0, 80)); }
  }
} else throw new Error("mode: request | native | replay | compare | scan");
