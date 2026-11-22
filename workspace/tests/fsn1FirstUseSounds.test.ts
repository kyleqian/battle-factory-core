// fsn1 (docs/fsn1-first-use-sounds.md): every sound's first use in a page session lost its attack, or a short sound vanished, because the
// player fetched the file on first use. Pinned here: the battle sound table (src/assets/gen/battle-sounds.json) is current and lists every SE a
// Factory move's animation can start; the state scan names both parties before the battle; the player fetches a request's files (each side's
// own pans, Scene OFF without the move SEs); a short sound up to LATE_FROM_START_S late plays whole from its start while long sounds and music
// keep the catch-up rule and a ready file's timing is unchanged; and seeded battles play every SE / cry with its file already loaded.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createAudioPlayer, LATE_FROM_START_S, type AudioContextLike, type AudioPlayerOptions, type BufferSourceLike } from "../src/audio/player.ts";
import { bundledAssets } from "../src/audio/playerAssets.ts";
import { BattleSoundNeeds, type BattleSoundRequest, type BattleSoundTable } from "../src/audio/battleSoundNeeds.ts";
import type { AnimBattleSide, SoundEvent } from "../src/audio/soundEvents.ts";
import { moveAnimOpRows, timing, variantOf, type TimedOp, type VariantInputs } from "../src/engine/animSoundOps.ts";
import { FactorySession } from "../src/factorySession.ts";
import { battleSoundTableText, buildBattleSoundTable, BATTLE_SOUND_TABLE_PATH, moveTargetSides } from "../tools/bundle/battleSoundTable.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";
import tableJson from "../src/assets/gen/battle-sounds.json" with { type: "json" };

const table = tableJson as unknown as BattleSoundTable;
const sounds = bundledAssets.manifest.sounds;

// ---- a fake AudioContext (the aud245 tests' shape) with gated fetches ----
class FakeParam {
  value = 1;
  setValueAtTime(): void {}
  linearRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class FakeNode {
  connect(): void {}
  disconnect(): void {}
}
class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}
class FakeSource extends FakeNode implements BufferSourceLike {
  buffer: { duration: number } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  readonly starts: { when?: number; offset?: number; duration?: number }[] = [];
  start(when?: number, offset?: number, duration?: number): void {
    this.starts.push({ when, offset, duration });
  }
  stop(): void {}
}
class FakeContext implements AudioContextLike {
  currentTime = 100;
  state = "running";
  readonly destination = {};
  readonly sources: FakeSource[] = [];
  async resume(): Promise<void> {
    this.state = "running";
  }
  createGain(): FakeGain {
    return new FakeGain();
  }
  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createChannelMerger(): FakeNode {
    return new FakeNode();
  }
  async decodeAudioData(): Promise<{ duration: number }> {
    return { duration: 1000 };
  }
}
interface Harness {
  player: ReturnType<typeof createAudioPlayer>;
  ctx: FakeContext;
  fetched: string[];
  /** Files whose fetch waits for `release(name)`. */
  gated: Map<string, () => void>;
  setTime(now: number): void;
  release(name: string): void;
}
function harness(options: Partial<AudioPlayerOptions> & { gate?: readonly string[] } = {}): Harness {
  const ctx = new FakeContext();
  const time = { now: 100 };
  const gated = new Map<string, () => void>();
  const fetched: string[] = [];
  const player = createAudioPlayer({
    enabled: true,
    gestureTarget: null,
    setTimer: () => 0,
    clearTimer: () => undefined,
    clock: () => time.now,
    createContext: () => ctx,
    fetchBytes: (url) => {
      const name = url.split("/").pop()!;
      fetched.push(name);
      if (!(options.gate ?? []).includes(name)) return Promise.resolve(new ArrayBuffer(8));
      return new Promise((resolve) => gated.set(name, () => resolve(new ArrayBuffer(8))));
    },
    canPlayOgg: () => true,
    ...options,
  });
  return {
    player, ctx, fetched, gated,
    setTime(now) {
      time.now = now;
      ctx.currentTime = now;
    },
    release(name) {
      gated.get(name)!();
    },
  };
}
const flush = async (rounds = 40): Promise<void> => {
  for (let i = 0; i < rounds; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};
const ev = (kind: SoundEvent["kind"], frame: number, rest: Partial<SoundEvent> = {}): SoundEvent => ({ kind, frame, id: null, pan: null, ...rest });
const seconds = (key: string): number => sounds[key]!.lengthSamples / sounds[key]!.sampleRate;
const onset = (key: string): number => sounds[key]!.onsetSamples / sounds[key]!.sampleRate;

// ---- the table ----

const SIDES: readonly AnimBattleSide[] = ["player", "opponent"];
const moveIdByName = new Map((JSON.parse(readFileSync("src/data/gen/moves.json", "utf8")) as { moves: { id: number; move: string }[] }).moves.map((move) => [move.move, move.id]));
const frontierMons = (JSON.parse(readFileSync("src/data/gen/battle-frontier-mons.json", "utf8")) as { entries: { moves: string[] }[] }).entries;
/** factory-round-policy.json rentalSelection.ranges: Level 50 draws sets 110..849, Open Level 372..881. */
const FACTORY_MOVES = [...new Set(frontierMons.slice(110, 882).flatMap((entry) => entry.moves.map((name) => moveIdByName.get(name)!).filter((id) => id > 0)))].sort((a, b) => a - b);

/** Every variant the engine's variantOf can select for `move` with `side` attacking: every turn, and every input class each grid reads. */
function engineVariants(move: number, side: 0 | 1): Set<readonly TimedOp[]> {
  const found = new Set<readonly TimedOp[]>();
  const entry = timing.moves[move]!;
  const inputs: VariantInputs[] = [{}];
  for (const rolloutCounter of [1, 2, 3, 4, 5]) inputs.push({ rolloutCounter });
  for (const damage of [-5, 0, 1, 32, 33, 65, 66, 200]) inputs.push({ damage });
  for (const attackerElevation of timing.elevationClasses) inputs.push({ attackerElevation });
  for (const y of timing.topYs[side]!) inputs.push({ topY: () => y });
  if (entry.pic !== undefined) {
    for (const own of timing.picYs[side]!) {
      for (const foe of timing.picYs[1 - side]!) {
        for (const attackerHpQuarter of [undefined, 0, 1, 2, 3]) inputs.push({ picY: (battler) => (battler === side ? own : foe), attackerHpQuarter });
      }
    }
  }
  for (let turn = 0; turn < timing.turns + 2; turn += 1) for (const input of inputs) found.add(variantOf(move, turn, side, input));
  return found;
}

describe("fsn1: the battle sound table", () => {
  it("is current: tools/bundle/battleSoundTable.ts regenerates the committed file byte for byte", () => {
    expect(readFileSync(BATTLE_SOUND_TABLE_PATH, "utf8")).toBe(battleSoundTableText(buildBattleSoundTable()));
  });

  it("lists every SE a Factory move's animation can start (Level 50 and Open Level sets), from the engine's own variant choice and pan law", () => {
    expect(FACTORY_MOVES.length).toBeGreaterThan(250);
    const unlisted: string[] = [];
    let checked = 0;
    for (const move of FACTORY_MOVES) {
      for (const side of [0, 1] as const) {
        const attacker = SIDES[side]!;
        const listed = new Set((table.moves[move]?.[side] ?? []).map(([id, pan]) => `${id}:${pan}`));
        for (const ops of engineVariants(move, side)) {
          for (const target of moveTargetSides(move, attacker)) {
            for (const op of ops) {
              for (const row of moveAnimOpRows(op, { attackerSide: attacker, targetSide: target })) {
                if (row.emission.kind !== "se" || row.emission.id === null || row.emission.id === undefined) continue;
                checked += 1;
                const key = `${row.emission.id}:${row.emission.pan ?? null}`;
                if (!listed.has(key)) unlisted.push(`move ${move} ${attacker} -> ${target}: se ${key}`);
              }
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect([...new Set(unlisted)]).toEqual([]);
  });

  it("names the cry tasks (Roar, Howl, Hyper Voice), and every listed SE has a recording to fetch", () => {
    expect(table.cryTasks).toEqual({ 46: ["ROAR_1", "ROAR_2"], 304: ["ECHO_START", "ECHO_END"], 336: ["HIGH_PITCH"] });
    const recorded = new Set(Object.keys(sounds).filter((key) => key.startsWith("se:")).map((key) => Number(key.split(":")[1])));
    const all = [...Object.values(table.moves).flatMap(([a, b]) => [...a, ...b]), ...table.common, ...table.commonSceneOn, ...Object.values(table.abilities).flatMap(([a, b]) => [...a, ...b])];
    expect(all.filter(([id]) => !recorded.has(id))).toEqual([]);
    // The playtest's two: foe Wartortle's Bite (SE_M_BITE at the foe's pan) and the held-item body's SE_SHINY / SE_M_TAKE_DOWN / SE_M_MORNING_SUN.
    expect(table.moves[44]![1]).toEqual([[161, -63]]);
    for (const id of [102, 152, 228]) expect(table.commonSceneOn).toContainEqual([id, 63]);
    expect(table.common).toContainEqual([239, 64]);
  });
});

// ---- the state scan ----

describe("fsn1: BattleSoundNeeds names the coming battle", () => {
  it("both parties (side 0 = the player's) as soon as the round has them, well before the battle's first sound; nothing new = no update", () => {
    const session = new FactorySession({ battleScene: "on", gameplaySeed: 4 });
    const player = new RandomPlayer(new Rng(4), new ActionLog(false), "winning");
    const events: SoundEvent[] = [];
    session.attachSoundSink({ push: (event) => events.push(event) });
    const needs = new BattleSoundNeeds();
    let requestFrame = 0;
    let firstCry = 0;
    for (let frame = 1; frame <= 12000 && firstCry === 0; frame += 1) {
      session.tick(player.decide(session.state), frame);
      if (needs.update(session.state) && requestFrame === 0) requestFrame = frame;
      // The battle's first cry: the first send-out (the round's parties were named long before).
      if (requestFrame > 0 && events.some((event) => event.frame === frame && event.kind === "cry")) firstCry = frame;
    }
    expect(requestFrame).toBeGreaterThan(0);
    expect(firstCry - requestFrame).toBeGreaterThan(300);
    const request = needs.current!;
    expect(request.scene).toBe("on");
    expect(request.bgm).toBe(476);
    expect(request.mons.map((mon) => mon.side)).toEqual([0, 0, 0, 1, 1, 1]);
    for (const mon of request.mons) {
      expect(mon.species).toBeGreaterThan(0);
      expect(mon.moves.length).toBeGreaterThan(0);
    }
    expect(needs.update(session.state)).toBe(false);
  });

  it("adds a move the presentation names that no party member knows (a called move), and says Scene OFF", () => {
    const rules = { phase: "battleActive", playerKernelParty: [{ species: 25, ability: 9, moves: [118] }], currentOpponent: { rentalRecords: [{ member: { species: 8, ability: 67, moves: [44] } }] } };
    const state = (presentation: unknown, scene = "on", phase = "battleActive") =>
      ({ battleSceneMode: scene, factoryRoundBattleOrchestrator: { round: { rules: { ...rules, phase } }, battleResolutionPresentation: presentation }, stagedBattleTurn: null, sceneOnPresentation: null }) as never;
    const needs = new BattleSoundNeeds();
    // After a win the rules still name the beaten opponent: no request for a battle that is over.
    expect(needs.update(state(null, "on", "awaitingSwapDecision"))).toBe(false);
    expect(needs.current).toBeNull();
    expect(needs.update(state(null))).toBe(true);
    expect(needs.current!.mons).toEqual([{ side: 0, species: 25, ability: 9, moves: [118] }, { side: 1, species: 8, ability: 67, moves: [44] }]);
    expect(needs.update(state({ steps: [{ calledMove: 118 }] }))).toBe(false); // Metronome itself is a party move
    expect(needs.update(state({ steps: [{ calledMove: 53 }] }))).toBe(true);
    expect(needs.current!.calledMoves).toEqual([53]);
    const off = new BattleSoundNeeds();
    off.update(state({ steps: [{ calledMove: 53 }] }, "off"));
    expect(off.current!.scene).toBe("off");
    expect(off.current!.calledMoves).toEqual([]);
  });
});

// ---- the player's prefetch ----

/** The playtest's battle 2 (trace kyle1122b, frame 14985): Croconaw / Teddiursa / Yanma vs foe Jason's Wartortle / Minun / Voltorb. */
const PLAYTEST_BATTLE_2: BattleSoundRequest = {
  scene: "on",
  bgm: 476,
  calledMoves: [],
  mons: [
    { side: 0, species: 159, ability: 67, moves: [163, 352, 44, 184] },
    { side: 0, species: 216, ability: 53, moves: [290, 313, 185, 156] },
    { side: 0, species: 193, ability: 14, moves: [324, 332, 104, 197] },
    { side: 1, species: 8, ability: 67, moves: [352, 44, 189, 281] },
    { side: 1, species: 354, ability: 58, moves: [209, 204, 227, 270] },
    { side: 1, species: 100, ability: 43, moves: [209, 103, 205, 113] },
  ],
};

describe("fsn1: the player fetches a battle request ahead", () => {
  it("cries, each side's own move pans, the common battle SEs, and the battle music last", async () => {
    const h = harness();
    await flush();
    const startup = h.fetched.length;
    h.player.prefetch({ scene: "on", bgm: 476, calledMoves: [], mons: [{ side: 0, species: 159, ability: 0, moves: [44] }, { side: 1, species: 8, ability: 0, moves: [44] }] });
    await flush();
    const files = h.fetched.slice(startup);
    expect(files.slice(0, 2)).toEqual(["cry-159.ogg", "cry-008.ogg"]);
    // Bite plays SE_M_BITE at the target's pan: 63 when the player bites, -63 when the foe does.
    expect(files).toContain("se-161-panp63.ogg");
    expect(files).toContain("se-161-panm63.ogg");
    expect(files.filter((file) => file.startsWith("se-161-"))).toHaveLength(2);
    for (const file of ["se-013-panm64.ogg", "se-016-panp63.ogg", "se-239-panp64.ogg", "se-245-panm64.ogg", "se-102-panp63.ogg", "se-148-panm63.ogg"]) expect(files).toContain(file);
    expect(files.at(-1)).toBe("bgm-476.ogg");
    expect(new Set(files).size).toBe(files.length);
    expect(h.player.stats().battlePrefetched).toBe(files.length);
    expect(h.player.stats().prefetched).toBe(startup + files.length);
    // The same request again fetches nothing; a new opponent fetches only its new files.
    h.player.prefetch({ scene: "on", bgm: 476, calledMoves: [], mons: [{ side: 0, species: 159, ability: 0, moves: [44] }, { side: 1, species: 8, ability: 0, moves: [44] }] });
    await flush();
    expect(h.fetched.length).toBe(startup + files.length);
    h.player.prefetch({ scene: "on", bgm: 476, calledMoves: [], mons: [{ side: 0, species: 159, ability: 0, moves: [44] }, { side: 1, species: 25, ability: 0, moves: [44] }] });
    await flush();
    expect(h.fetched.slice(startup + files.length)).toEqual(["cry-025.ogg"]);
  });

  it("Scene OFF: no move animation SEs (except Transform / Substitute) and no Scene ON bodies; cry tasks and called moves follow the scene", async () => {
    const h = harness();
    await flush();
    const startup = h.fetched.length;
    const roarSpecies = Number(Object.keys(sounds).find((key) => key.endsWith(":ROAR_1"))!.split(":")[1]);
    const mons = [{ side: 0 as const, species: roarSpecies, ability: 0, moves: [44, 46, 144] }, { side: 1 as const, species: 8, ability: 0, moves: [44] }];
    h.player.prefetch({ scene: "off", bgm: 476, calledMoves: [], mons });
    await flush();
    const off = h.fetched.slice(startup);
    expect(off.some((file) => file.startsWith("se-161-"))).toBe(false);
    expect(off.some((file) => file.startsWith("se-102-") || file.startsWith("se-148-"))).toBe(false);
    expect(off.some((file) => file.endsWith("-task.ogg"))).toBe(false);
    const hasSe = (files: readonly string[], id: number): boolean => files.some((file) => file.startsWith(`se-${String(id).padStart(3, "0")}-`));
    for (const [id] of table.moves[144]![0]) expect(hasSe(off, id)).toBe(true);
    const on = harness();
    await flush();
    const before = on.fetched.length;
    on.player.prefetch({ scene: "on", bgm: 476, calledMoves: [53], mons });
    await flush();
    const files = on.fetched.slice(before);
    expect(files).toContain(`cry-${String(roarSpecies).padStart(3, "0")}-task.ogg`);
    expect(hasSe(files, 161)).toBe(true);
    // A called move (Flamethrower under Metronome): either side's pans.
    for (const side of [0, 1] as const) for (const [id] of table.moves[53]![side]) expect(hasSe(files, id)).toBe(true);
    expect(table.moves[53]![0]).not.toEqual(table.moves[53]![1]);
  });

  it("a muted player keeps the request and fetches it only once audio is live", async () => {
    const h = harness({ enabled: false });
    h.player.prefetch(PLAYTEST_BATTLE_2);
    await flush();
    expect(h.fetched).toEqual([]);
    h.player.setEnabled(true);
    await flush();
    expect(h.fetched).toContain("se-161-panm63.ogg");
    expect(h.fetched).toContain("se-102-panp63.ogg");
    expect(h.player.stats().battleRequests).toBe(1);
  });

  it("the playtest's sounds (foe Wartortle's first Bite, foe Minun's Salac Berry) play on time once the battle is prefetched", async () => {
    // Before fsn1: each was a first use: late (Bite joined part-way, "faint"; the berry's SE_SHINY / stat arrows were lost or cut).
    const playtest = [ev("se", 17523, { id: 161, pan: -63 }), ev("se", 22002, { id: 152, pan: 63 }), ev("se", 22098, { id: 228, pan: 63 }), ev("se", 22170, { id: 102, pan: 63 }), ev("se", 22215, { id: 239, pan: 64 })];
    const play = async (h: Harness): Promise<void> => {
      for (const [index, event] of playtest.entries()) {
        h.setTime(100 + 2 * index); // each its own moment, so none preempts another
        h.player.push(event);
        await flush();
      }
    };
    const cold = harness();
    await flush();
    await play(cold);
    expect(cold.player.stats().late).toBe(playtest.length);
    const h = harness();
    await flush();
    h.player.prefetch(PLAYTEST_BATTLE_2);
    await flush();
    await play(h);
    expect(h.player.stats().late).toBe(0);
    expect(h.ctx.sources.map((source) => source.starts[0]!.offset)).toEqual(playtest.map(() => 0));
  });
});

// ---- the late-start rule ----

describe("fsn1: a short sound whose file is a little late plays whole from its start", () => {
  const SE = "se:161:63";
  const FILE = "se-161-panp63.ogg";
  async function lateBy(late: number, event: SoundEvent, key: string, file: string): Promise<Harness & { t0: number }> {
    const h = harness({ gate: [file] });
    await flush();
    h.player.push(event);
    // The event plays at now + latency (0.03 s) and its sound at that + the recording's onset.
    const t0 = 100 + 0.03 + onset(key);
    h.setTime(t0 + late - 0.005);
    h.release(file);
    await flush();
    return Object.assign(h, { t0 });
  }

  it(`up to ${LATE_FROM_START_S} s late: from file position 0, that much late, with its whole length (lateDelayed)`, async () => {
    for (const late of [0.02, 0.1, LATE_FROM_START_S]) {
      const h = await lateBy(late, ev("se", 10, { id: 161, pan: 63 }), SE, FILE);
      const start = h.ctx.sources.at(-1)!.starts[0]!;
      expect(start.offset).toBe(0);
      expect(start.when).toBeCloseTo(h.t0 + late, 6);
      expect(start.duration).toBeCloseTo(seconds(SE), 6);
      expect(h.player.stats()).toMatchObject({ late: 1, lateDelayed: 1, lateClipped: 0, lateLost: 0 });
    }
  });

  it("later than the bound: the catch-up rule as before (joins part-way, or is lost when it is over)", async () => {
    const clipped = await lateBy(0.4, ev("se", 10, { id: 161, pan: 63 }), SE, FILE);
    const start = clipped.ctx.sources.at(-1)!.starts[0]!;
    expect(start.offset).toBeCloseTo(0.4, 6);
    expect(start.when).toBeCloseTo(clipped.t0 + 0.4, 6);
    expect(clipped.player.stats()).toMatchObject({ late: 1, lateDelayed: 0, lateClipped: 1, lateLost: 0 });
    const lost = await lateBy(seconds(SE) + 0.05, ev("se", 10, { id: 161, pan: 63 }), SE, FILE);
    expect(lost.ctx.sources).toEqual([]);
    expect(lost.player.stats()).toMatchObject({ late: 1, lateDelayed: 0, lateClipped: 0, lateLost: 1 });
  });

  it("a cry is short too; a long SE (over 2 s), a looping SE and the music keep the catch-up rule", async () => {
    const cry = await lateBy(0.1, ev("cry", 10, { id: 25, mode: 0, pan: 0, priority: 10 }), "cry:25:NORMAL", sounds["cry:25:NORMAL"]!.file);
    expect(cry.ctx.sources[0]!.starts[0]!.offset).toBeCloseTo(sounds["cry:25:NORMAL"]!.offsetSamples / sounds["cry:25:NORMAL"]!.sampleRate, 6);
    expect(cry.player.stats().lateDelayed).toBe(1);
    expect(seconds("se:172:-64")).toBeGreaterThan(2);
    const sing = await lateBy(0.1, ev("se", 10, { id: 172, pan: -64 }), "se:172:-64", "se-172-panm64.ogg");
    expect(sing.ctx.sources[0]!.starts[0]!.offset).toBeCloseTo(0.1, 6);
    expect(sing.player.stats()).toMatchObject({ lateDelayed: 0, lateClipped: 1 });
    const lowHp = await lateBy(0.1, ev("se", 10, { id: 90 }), "se:90:none", "se-090-nopan.ogg");
    expect(lowHp.ctx.sources[0]!.starts[0]!.offset).toBeCloseTo(0.1, 6);
    expect(lowHp.player.stats()).toMatchObject({ lateDelayed: 0, lateClipped: 1 });
    const bgm = await lateBy(0.1, ev("bgm", 10, { id: 476 }), "bgm:476", "bgm-476.ogg");
    expect(bgm.ctx.sources[0]!.starts[0]!.offset).toBeCloseTo(0.1, 6);
    expect(bgm.player.stats()).toMatchObject({ lateDelayed: 0, lateClipped: 1 });
  });

  it("a delayed SE keeps its m4a player busy until its shifted end: an SE started after its own end but before the shifted one preempts it", async () => {
    const h = await lateBy(0.2, ev("se", 10, { id: 161, pan: 63 }), SE, FILE);
    const ownEnd = h.t0 + seconds(SE);
    const frame = 10 + Math.ceil((ownEnd + 0.1 - 100.03) * 59.7275);
    expect(100.03 + (frame - 10) / 59.7275).toBeLessThan(ownEnd + 0.2);
    h.setTime(ownEnd - 0.1);
    const before = h.player.stats().preempted;
    h.player.push(ev("se", frame, { id: 161, pan: 63 }));
    expect(h.player.stats().preempted).toBe(before + 1);
  });

  it("a file that was ready: no late counters and the same start as before fsn1 (event time + latency + onset, from position 0)", async () => {
    const h = harness();
    await flush();
    h.player.prefetch(PLAYTEST_BATTLE_2);
    await flush();
    h.player.push(ev("se", 10, { id: 161, pan: 63 }));
    const start = h.ctx.sources.at(-1)!.starts[0]!;
    expect(start.when).toBeCloseTo(100 + 0.03 + onset(SE), 9);
    expect(start.offset).toBe(0);
    expect(start.duration).toBeCloseTo(seconds(SE), 9);
    expect(h.player.stats()).toMatchObject({ late: 0, lateDelayed: 0, lateClipped: 0, lateLost: 0 });
  });
});

// ---- seeded battles: every battle SE / cry finds its file loaded ----

async function lateInBattles(scene: "on" | "off", seed: number, frames: number): Promise<{ events: number; late: string[]; requests: number }> {
  const session = new FactorySession({ battleScene: scene, gameplaySeed: seed });
  const random = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning");
  const pending: SoundEvent[] = [];
  session.attachSoundSink({ push: (event) => pending.push(event) });
  const needs = new BattleSoundNeeds();
  const h = harness();
  await flush();
  const late: string[] = [];
  let events = 0;
  let requests = 0;
  for (let frame = 1; frame <= frames; frame += 1) {
    session.tick(random.decide(session.state), frame);
    if (needs.update(session.state)) {
      requests += 1;
      h.player.prefetch(needs.current!);
      await flush();
    }
    const phase = session.state.factoryRoundBattleOrchestrator?.round.rules.phase;
    const inBattle = phase === "battleActive" || phase === "presentingBattleStart";
    for (const event of pending.splice(0)) {
      if (!inBattle || (event.kind !== "se" && event.kind !== "cry")) continue;
      events += 1;
      const before = h.player.stats().late;
      h.player.push(event);
      await flush(4);
      if (h.player.stats().late > before) late.push(`${event.kind} ${event.id} pan ${event.pan} mode ${event.mode} at ${event.frame}`);
    }
  }
  return { events, late, requests };
}

describe("fsn1: seeded battles play every SE and cry from a file the battle prefetch already loaded", () => {
  it("Scene ON, two seeds through their first battles", async () => {
    for (const seed of [0, 3]) {
      const result = await lateInBattles("on", seed, 20000);
      expect(result.requests).toBeGreaterThan(0);
      expect(result.events).toBeGreaterThan(100);
      expect(result.late).toEqual([]);
    }
  }, 120_000);

  it("Scene OFF, one seed", async () => {
    const result = await lateInBattles("off", 1, 20000);
    expect(result.events).toBeGreaterThan(30);
    expect(result.late).toEqual([]);
  }, 120_000);
});
