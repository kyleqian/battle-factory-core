// aud243b (docs/aud243b-rom-replay.md): the engine half of the census ROM replay.
//   request: node --experimental-strip-types --no-warnings tools/integration/soundCensusRomReplay.ts request --seed=N --scene=on|off --out=req.json
//     the census battle of seed N (same orchestrator config and policy as lsd194Census.ts) run to its first action menu; writes the factoryLegal battle-lab request of its trainer / set ids.
//   replay: ... replay --seed=N --scene=on|off --setup=setup.json --out=engine.json
//     setup.json = `soundEventProbe.py lab REQ --setup-out` (the ROM's action-menu gRngValue, both parties). The engine battle is rebuilt FROM THE ROM (player rentals and opponent
//     personalities read back, battle RNG = the ROM's gRngValue at the action menu) and played with the census policy; writes the per-frame inputs (run-length encoded, frame 1 = the
//     first step after the action menu appeared) and the sound rows relative to that frame.
//   compare: ... compare --seed=N --scene=on|off --engine=engine.json --rom=timeline.json [--out=F]  (aud243c) engine states (hp, rng, last moves) found in order in the ROM timeline.
//   native: ... native --seed=N --scene=on|off --out=engine.json  the census orchestrator itself (no ROM), same output shape: the drift check against the census row's sound column.
import "../../src/engine/monPicPixelsInstall.ts";
import { writeFileSync, readFileSync } from "node:fs";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { adoptFactoryOpponentSchedule } from "../../src/engine/factoryOpponentGeneration.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { collectSoundTick } from "../../src/audio/soundEvents.ts";
import { beginScreenSoundTick, runScheduledScreenSounds } from "../../src/engine/screenSounds.ts";
import { emitTickSounds } from "../../src/engine/tickSounds.ts";
import { advanceRngValue } from "../../src/engine/rng.ts";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };

const [mode] = process.argv.slice(2);
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const seed = Number(arg("seed"));
const scene = (arg("scene") ?? "on") as "on" | "off";
const streak = (seed * 11) % 49;

// The lab stages the Tower streak at challengeNum * 7 (the stock bug reads it for opponent IVs); the census engine uses 0. Equal for challengeNum 0 (streak < 7).
const towerStreak = Math.floor(streak / 7) * 7;
const LCG_INV = 0xeeb9eb65;
const lcgInverse = (x: number) => Math.imul((x - 0x6073) >>> 0, LCG_INV | 0) >>> 0;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

const nativeOrchestrator = () => beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
  id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: scene,
  factoryWinStreak: streak, playerTrainerId: 416049562,
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

function adoptedOrchestrator(setup: any, freshBattleRngValue: number) {
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
function play(initial: any, record: boolean, patchRng: number | null = null) {
  let state = initial; let frame = 0; let ended = false; let error: string | null = null; let frame0: number | null = null;
  const sound: unknown[][] = []; const inputs: Segment[] = []; const slotUses = [0, 0, 0, 0];
  let actionMenuRng: number | null = null; let randomTurnNumber: number | null = null; const timeline: number[][] = []; let lastTl = "";
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly string[] = []) => {
    if (++frame > 200000) throw new Error("frame budget");
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
      const rc = state.battle.rules.rulesContext;
      const row = [rc.currentMove, rc.battlers[0].hp, rc.battlers[1].hp, state.battle.rng.value, rc.moveHistory.lastMoves[0], rc.moveHistory.lastMoves[1]];
      if (row.join() !== lastTl) { lastTl = row.join(); timeline.push([frame - frame0, ...row]); }
    }
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (b: string) => { step(); if (!ended) step([b]); if (!ended) step(); };
  const forcedSelector = () => {
    const s = state.battleForcedPartySelect;
    return s && s.sendOutElapsed === null && s.elapsed >= PARTY_LIST_INPUT_ELAPSED ? s : null;
  };
  const until = (p: () => boolean) => {
    while (!ended && !p()) {
      const s = forcedSelector();
      if (s) {
        const target = typeof s.cursor === "number" ? s.party.findIndex((r: any) => r.legal && r.partyIndex === Math.min(...s.party.filter((m: any) => m.legal).map((m: any) => m.partyIndex))) : -1;
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
    if (!record) return { frame0, actionMenuRng, randomTurnNumber, state, sound, inputs, error, frames: frame, timeline };
    while (!ended) {
      pulse("A");
      until(() => phase() === "fight-menu");
      if (ended) break;
      const menu = state.battleCommandPresentation!;
      const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
      const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
      slotUses[slot]!++;
      for (let i = 0; i < 4; i++) {
        const cursor = state.battleCommandPresentation!.fightCursor;
        if (cursor === slot) break;
        pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
      }
      pulse("A");
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
    }
  } catch (e) { error = String(e); }
  return { frame0, actionMenuRng, randomTurnNumber, state, sound, inputs, error, frames: frame, timeline };
}

const result = (r: ReturnType<typeof play>, extra: object = {}) => ({
  seed, scene, error: r.error, frame0: r.frame0, actionMenuRng: r.actionMenuRng, randomTurnNumber: r.randomTurnNumber, frames: r.frames,
  sound: r.sound.map((e) => [(e[0] as number) - (r.frame0 ?? 0), ...e.slice(1)]), inputs: r.inputs, timeline: r.timeline, ...extra,
});

if (mode === "request") {
  const o = nativeOrchestrator();
  const r = play(o, false);
  const g = r.state.opponentGenerations[0]; const rentals = r.state.round.rules.playerKernelParty;
  const setIds = (g.generation.opponents as any[]).map((x) => x.setId);
  const playerSetIds = r.state.config.rentals.type === "generateInitial" ? (r.state.initialRentalGeneration!.rentals as any[]).slice(0, 3).map((x) => x.setId) : [];
  void rentals;
  writeFileSync(arg("out")!, JSON.stringify({
    schemaVersion: 1, mode: "factoryLegal", profile: scene === "on" ? "battle-scene-on" : "battle-scene-off", level: 50,
    challengeNum: Math.floor(streak / 7), battleNum: 0, trainerId: g.trainerId, rentalSwapCount: 0,
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
  const target = setup.snapshot.rngValue >>> 0;
  const turnNumber = setup.randomTurnNumber ?? (arg("turn-number") === undefined ? undefined : Number(arg("turn-number")));
  if (turnNumber === undefined) throw new Error("setup has no randomTurnNumber (re-run soundEventProbe --setup-out) and no --turn-number=N");
  const behind = new Map<number, number>(); for (let j = 0, x = target; j <= 32; j += 1, x = lcgInverse(x)) behind.set(x, j);
  let attempt: ReturnType<typeof play> | null = null; let k = -1; let j = -1;
  for (let tryK = 0; tryK <= 48 && attempt === null; tryK += 1) {
    let fresh = target; for (let i = 0; i < tryK; i += 1) fresh = lcgInverse(fresh);
    const probe = play(adoptedOrchestrator(setup, fresh), false);
    if (probe.randomTurnNumber === turnNumber && probe.actionMenuRng !== null && behind.has(probe.actionMenuRng)) {
      k = tryK; j = behind.get(probe.actionMenuRng)!; attempt = play(adoptedOrchestrator(setup, fresh), true);
    }
  }
  if (attempt === null) throw new Error(`no draw count gives the ROM's gRandomTurnNumber ${turnNumber} with a menu RNG at most 32 draws before the ROM's ${target}`);
  writeFileSync(arg("out")!, JSON.stringify(result(attempt, {
    romRngAtActionMenu: target, romRandomTurnNumber: turnNumber, romOpponentReply: setup.opponentReply ?? null,
    engineDrawsBeforeActionMenu: k, romOpponentDrawsBeforeActionMenu: j,
  })));
} else if (mode === "compare") {
  // aud243c: engine timeline rows [frame, currentMove, hp0, hp1, rng, last0, last1] against romStateTimeline.py rows of the same shape. The engine resolves a turn at its
  // commit, so each engine state (hp0, hp1, rng, last0, last1) must appear among the ROM's states in order; the first that does not is the divergence.
  const engine = JSON.parse(readFileSync(arg("engine")!, "utf8")); const rom = JSON.parse(readFileSync(arg("rom")!, "utf8")).rows as number[][];
  const key = (r: number[]) => r.slice(2, 7).join();
  let at = 0; const matched: unknown[] = []; let divergence: unknown = null;
  // Row 0 is the engine's action-menu state, whose RNG is the ROM's pre-AI value by construction (see replay); compare from the first committed turn.
  for (const row of (engine.timeline as number[][]).slice(1)) {
    const found = rom.findIndex((r, i) => i >= at && key(r) === key(row));
    if (found < 0) { divergence = { engine: row, romAfter: rom.slice(at, at + 6) }; break; }
    matched.push({ engineFrame: row[0], romFrame: rom[found]![0], hp: [row[2], row[3]], rng: row[4], lastMoves: [row[5], row[6]] }); at = found;
  }
  const out = { seed, scene, matched: matched.length, engineRows: engine.timeline.length, romRows: rom.length, rows: matched, divergence };
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
