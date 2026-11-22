// nrv1: the Factory Head's room -> battle start, ROM vs engine (docs/trn225-frontier-transitions.md "nrv1").
//
//   node --experimental-strip-types tools/integration/nrv1RngAtBattleStart.ts ROM.json [ROM2.json ...]   (JSON lines on stdout)
//
// ROM.json is a tools/audio/romFrontierTransition.py recording (--sound: it carries bgmFrame / initBattleFrame). The engine is staged at the same
// GO ON menu and ticked with the ROM's presses twice: `forced` (the harness of nolandSceneEngine.ts: the ROM's transition id and the ROM's pause
// before the transition) and `free` (the engine's own pause and its own transition draw: what a player gets). For each run: the room's last
// input, the engine's hand-over frame (the room is gone, the battle intro installed = CB2_InitBattle on the ROM), the cursor then, the battle's
// seed (the round controller's gameplay RNG) and the engine's own transition id. Run it from a tree's workspace/ (the imports are relative), so
// the same file measures a pre-change tree copied under .integration.
import { readFileSync } from "node:fs";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import { driveEngine, type RomRecording } from "./nolandSceneEngine.ts";
import { tick, type EngineState } from "../../src/engine/core.ts";
import type { GbaButton } from "../../src/input.ts";

interface Row {
  rom: string;
  scene: string;
  challenge: number;
  seed: number;
  romTransitionId: number;
  romLastRoomInput: number;
  romBgmFrame: number;
  romInitBattleFrame: number;
  romFramesInputToInit: number;
  romRngAtInit: number;
  mode: "forced" | "free";
  engineTransitionId: number | null;
  engineTransitionName: string | null;
  engineHandoffFrame: number | null;
  engineFramesInputToHandoff: number | null;
  engineCursorAtHandoff: number | null;
  engineBattleSeed: number | null;
  engineOpponentSetIds: number[] | null;
  /** First frame the engine's RNG cursor differs from the ROM's (the party build), the ROM's LCG steps from the frame before it to CB2_InitBattle. */
  firstCursorDivergence: { f: number; romDrawsToInit: number | null } | null;
  /** The battle's own RNG once the engine creates it (the intro's A presses): value and calls at creation, frames after the handoff. */
  engineBattleRngAtCreation: { value: number; calls: number; framesAfterHandoff: number } | null;
  romOpponentSpecies: number[] | null;
  engineOpponentSpecies: number[] | null;
}

/** include/constants/species.h (dev-time reference): the ROM reads species as numbers, the engine's sets name them. */
const speciesId = new Map<string, number>();
for (const m of readFileSync(new URL("../../reference/pokeemerald/include/constants/species.h", import.meta.url), "utf8").matchAll(/^#define (SPECIES_\w+)\s+(\d+)/gm)) {
  speciesId.set(m[1]!, Number(m[2]));
}

function romOf(path: string): RomRecording & { initBattleFrame: number; bgmFrame: number; seed: number } {
  const rec = JSON.parse(readFileSync(path, "utf8"));
  rec.rngStart = rec.rngStart >>> 0;
  if (rec.playerSetIds === undefined && rec.challenge >= 5) rec.playerSetIds = [564, 565, 566]; // the lab's draft for challenge 5 (romFrontierTransition.py)
  return rec;
}

for (const path of process.argv.slice(2)) {
  const rom = romOf(path);
  const lastInput = Math.max(...rom.frames.filter((r) => r.press !== undefined && r.f < rom.bgmFrame).map((r) => r.f));
  for (const mode of ["forced", "free"] as const) {
    let prev: EngineState | null = null;
    let handoff: { f: number; state: EngineState } | null = null;
    let tid: { id: number; name: string } | null = null;
    let last: EngineState | null = null;
    const rows = driveEngine(rom, rom.frames.length - 1, true, undefined, "menu", {
      follow: mode === "forced",
      observe: (f, state) => {
        const room = state.battleRoom;
        if (room?.transitionPresentation !== undefined) tid = { id: room.transitionPresentation.transitionId, name: room.transitionPresentation.transitionName };
        if (handoff === null && prev?.battleRoom?.phase === "brainSpeechSettled" && room === null) handoff = { f, state };
        prev = state;
        last = state;
      },
    });
    let divergence: Row["firstCursorDivergence"] = null;
    const firstBad = rows.find((r) => (rom.frames[r.f]!.rng >>> 0) !== r.rng);
    if (firstBad !== undefined) {
      const a = rom.frames[firstBad.f - 1]!.rng >>> 0;
      const b = rom.frames[rom.initBattleFrame]!.rng >>> 0;
      let n: number | null = null;
      for (let x = a, i = 0; i < 5_000_000; i += 1, x = (Math.imul(x, 0x41c64e6d) + 0x6073) >>> 0) if (x === b) { n = i; break; }
      divergence = { f: firstBad.f, romDrawsToInit: n };
    }
    let created: Row["engineBattleRngAtCreation"] = null;
    if (handoff !== null && last !== null) {
      let state = last as EngineState;
      const h = (handoff as { f: number }).f;
      for (let i = 0; i < 3000 && state.factoryRoundBattleOrchestrator?.battle == null; i += 1) {
        state = tick(state, new Set<GbaButton>(i % 2 === 0 ? ["A"] : []));
      }
      const battle = state.factoryRoundBattleOrchestrator?.battle;
      if (battle != null) created = { value: battle.rng.value >>> 0, calls: battle.rng.calls, framesAfterHandoff: state.frame - (handoff as { state: EngineState }).state.frame };
      void h;
    }
    const o = handoff === null ? null : (handoff as { f: number; state: EngineState }).state.factoryRoundBattleOrchestrator;
    const out: Row = {
      rom: path.split("/").pop()!,
      scene: rom.scene,
      challenge: rom.challenge,
      seed: rom.seed,
      romTransitionId: (rom as unknown as { transitionId: number }).transitionId,
      romLastRoomInput: lastInput,
      romBgmFrame: rom.bgmFrame,
      romInitBattleFrame: rom.initBattleFrame,
      romFramesInputToInit: rom.initBattleFrame - lastInput,
      romRngAtInit: rom.frames[rom.initBattleFrame]!.rng >>> 0,
      mode,
      engineTransitionId: (tid as { id: number } | null)?.id ?? null,
      engineTransitionName: (tid as { name: string } | null)?.name ?? null,
      engineHandoffFrame: (handoff as { f: number } | null)?.f ?? null,
      engineFramesInputToHandoff: handoff === null ? null : (handoff as { f: number }).f - lastInput,
      engineCursorAtHandoff: handoff === null ? null : (handoff as { state: EngineState }).state.rngValue >>> 0,
      engineBattleSeed: o === null ? null : o.round.rules.rngValue >>> 0,
      engineOpponentSetIds: o?.round.rules.currentOpponent.rentalRecords?.map((r: { setId: number }) => r.setId) ?? null,
      firstCursorDivergence: divergence,
      engineBattleRngAtCreation: created,
      romOpponentSpecies: (rom as unknown as { enemyParty?: number[] }).enemyParty ?? null,
      engineOpponentSpecies: o?.round.rules.currentOpponent.rentalRecords?.map((r: { setId: number }) => speciesId.get(frontierMonsData.entries[r.setId]!.species) ?? -1) ?? null,
    };
    console.log(JSON.stringify(out));
  }
}
