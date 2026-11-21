// tri1 (docs/tri1-transition-intro-handoff.md): the ordinary battle room's transition clock runs from the battle BGM, and the battle intro
// takes over at each transition's own frame. ROM (frame catcher, 28 + 30 ordinary battles): the transition's first change 2 frames after
// MUS_VS_TRAINER in every battle; MUS_VS_TRAINER -> the intro's first picture = ORDINARY_INTRO_HANDOFF_AFTER_BGM + 35; -> SE_BALL_TRAY_ENTER
// 153 frames after that picture. Before tri1 every transition handed off after CIRCLES_MEET's 171 (battle 1) or ASYMMETRIC_SPIRAL_IN_SEQ's 186
// (battles 2+), and in battles 2+ the circle / squares pictures showed 3 frames after the ROM's.
import { describe, expect, it } from "vitest";
import {
  ASYMMETRIC_SPIRAL_IN_SEQ_TRANSITION_START_TE,
  BATTLE_2_SCENE_HANDOFF_ELAPSED,
  BATTLE_TRANSITION_START_TE,
  INITIAL_BATTLE_2_ROOM_STATE,
  ORDINARY_INTRO_HANDOFF_AFTER_BGM,
  brainBattleIntroHandoffTe,
  ordinaryBattleIntroHandoffElapsed,
  ordinaryBattleTransitionTe,
  ordinaryTransitionDrawElapsed,
  type BattleRoomState,
} from "../src/engine/battleRoom.ts";
import { FactorySession } from "../src/factorySession.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

const ID = { logoWiggle: 29, logoWave: 30, squares: 31, squaresScroll: 32, circlesMeet: 34, circlesCross: 35, asymmetricSpiral: 36,
  symmetricSpiral: 37, circlesMeetInSeq: 38, circlesCrossInSeq: 39, asymmetricSpiralInSeq: 40, symmetricSpiralInSeq: 41 } as const;
const room = (encounter: "first" | "later", transitionId?: number, elapsed = 0): BattleRoomState => ({
  ...(encounter === "later" ? INITIAL_BATTLE_2_ROOM_STATE : { phase: "entering", elapsed: 0 }),
  phase: "settled",
  elapsed,
  ...(transitionId === undefined ? {} : { transitionPresentation: { transitionId } as never }),
});

describe("tri1: the ordinary room's transition clock and intro handoff", () => {
  it("the transition starts on the BGM frame in both rooms (te = the kind's start te at the draw)", () => {
    for (const encounter of ["first", "later"] as const) {
      const draw = ordinaryTransitionDrawElapsed(room(encounter));
      expect(draw).toBe(encounter === "first" ? 26 : 23);
      for (const [kind, id] of Object.entries(ID)) {
        // LOGO_WIGGLE is not drawn: the room's fallback picture stands in (CIRCLES_MEET in battle 1, ASYMMETRIC_SPIRAL_IN_SEQ after), on its clock
        const drawn = kind === "logoWiggle" ? (encounter === "first" ? "circlesMeet" : "asymmetricSpiralInSeq") : kind;
        const start = drawn === "asymmetricSpiralInSeq" ? ASYMMETRIC_SPIRAL_IN_SEQ_TRANSITION_START_TE : BATTLE_TRANSITION_START_TE;
        expect(ordinaryBattleTransitionTe(room(encounter, id, draw))).toBe(start);
      }
    }
  });

  it("the two measured pairs keep their old frames: CIRCLES_MEET in battle 1 (197) and ASYMMETRIC_SPIRAL_IN_SEQ in battles 2+ (209)", () => {
    expect(ordinaryBattleIntroHandoffElapsed(room("first", ID.circlesMeet))).toBe(197);
    expect(ordinaryBattleIntroHandoffElapsed(room("later", ID.asymmetricSpiralInSeq))).toBe(BATTLE_2_SCENE_HANDOFF_ELAPSED);
    // and with no drawn transition (legacy staged rooms): the render fallbacks, the same two frames
    expect(ordinaryBattleIntroHandoffElapsed(room("first"))).toBe(197);
    expect(ordinaryBattleIntroHandoffElapsed(room("later"))).toBe(209);
    expect(ordinaryBattleTransitionTe(room("first", undefined, 50))).toBe(50);
    expect(ordinaryBattleTransitionTe(room("later", undefined, 50))).toBe(50);
  });

  it("every transition hands off at its ROM frame after the BGM, the same in battle 1 and in later battles", () => {
    const rom = { squares: 145, symmetricSpiral: 155, logoWiggle: 160, circlesCross: 161, circlesMeet: 171, circlesCrossInSeq: 174,
      logoWave: 177, circlesMeetInSeq: 179, squaresScroll: 184, asymmetricSpiralInSeq: 186, symmetricSpiralInSeq: 186, asymmetricSpiral: 155 };
    for (const encounter of ["first", "later"] as const) {
      for (const [kind, id] of Object.entries(ID)) {
        const r = room(encounter, id);
        expect(ordinaryBattleIntroHandoffElapsed(r) - ordinaryTransitionDrawElapsed(r), kind).toBe(rom[kind as keyof typeof rom]);
      }
    }
  });

  it("agrees with the brain room's per-transition ends (less the start te) where those were ROM-checked there", () => {
    for (const kind of ["squares", "squaresScroll", "circlesMeet", "circlesCross", "circlesCrossInSeq", "circlesMeetInSeq", "symmetricSpiral", "asymmetricSpiral"] as const) {
      const brain = brainBattleIntroHandoffTe({ transitionPresentation: { transitionId: ID[kind] } } as BattleRoomState);
      expect(ORDINARY_INTRO_HANDOFF_AFTER_BGM[kind], kind).toBe(brain - BATTLE_TRANSITION_START_TE);
    }
    // the two IN_SEQ spirals hand off one frame earlier here than the brain table's end; LOGO_WAVE five
    expect(brainBattleIntroHandoffTe({ transitionPresentation: { transitionId: ID.asymmetricSpiralInSeq } } as BattleRoomState)
      - ASYMMETRIC_SPIRAL_IN_SEQ_TRANSITION_START_TE).toBe(ORDINARY_INTRO_HANDOFF_AFTER_BGM.asymmetricSpiralInSeq + 1);
    expect(brainBattleIntroHandoffTe({ transitionPresentation: { transitionId: ID.symmetricSpiralInSeq } } as BattleRoomState)
      - BATTLE_TRANSITION_START_TE).toBe(ORDINARY_INTRO_HANDOFF_AFTER_BGM.symmetricSpiralInSeq + 1);
  });
});

/** The soak's seeded test player (tools/frame-catcher/makeTrace.mjs) on a fresh challenge: MUS_VS_TRAINER -> SE_BALL_TRAY_ENTER per battle. */
function introGaps(seed: number, scene: "on" | "off", battles: number, maxFrames: number): Array<{ transitionId: number | undefined; gap: number }> {
  const mix = (x: number) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; return (x ^ (x >>> 16)) >>> 0; };
  const session = new FactorySession({ battleScene: scene, gameplaySeed: mix(seed * 2 + 1), presentationSeed: mix(seed * 2 + 2), start: "draft", challengeRequest: "hold" });
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning-coverage");
  const out: Array<{ transitionId: number | undefined; gap: number }> = [];
  let frame = 0;
  let vs: number | null = null;
  let transitionId: number | undefined;
  session.attachSoundSink({ push: (e) => {
    if (e.kind === "bgm" && e.id === 476) vs = frame;
    if (e.kind === "se" && e.id === 114 && vs !== null) { out.push({ transitionId, gap: frame - vs }); vs = null; }
  } });
  for (; frame < maxFrames && out.length < battles; frame += 1) {
    session.tick(player.decide(session.state));
    const id = session.state.battleRoom?.transitionPresentation?.transitionId;
    if (id !== undefined) transitionId = id;
  }
  return out;
}

describe("tri1: ordinary play (the soak's seeded player)", () => {
  // the ROM's MUS_VS_TRAINER -> SE_BALL_TRAY_ENTER per transition (frame catcher, the same in battle 1 and later battles)
  const ROM_VS_TO_TRAY: Record<number, number> = { 29: 348, 30: 366, 31: 333, 32: 372, 34: 359, 35: 349, 36: 343, 37: 343, 38: 367, 39: 362, 40: 374, 41: 374 };
  for (const [seed, scene] of [[3, "on"], [2, "off"]] as const) {
    it(`seed ${seed} Scene ${scene.toUpperCase()}: each battle's intro reaches the ball trays on the ROM's frame for its transition`, () => {
      const gaps = introGaps(seed, scene, 4, 80000);
      expect(gaps.length).toBe(4);
      expect(new Set(gaps.map((g) => g.transitionId)).size).toBeGreaterThan(1);
      for (const g of gaps) expect(g.gap, `transition ${g.transitionId}`).toBe(ROM_VS_TO_TRAY[g.transitionId!]);
    }, 120000);
  }
});
