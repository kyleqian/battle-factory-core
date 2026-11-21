// aud241a: the Factory singles battle start's sounds (battle BGM, ball tray, ball opens, send-out cries and their BGM duck)
// reproduce the ROM's sound events frame for frame, in both scenes. The fixtures are committed oracle output of
// tools/audio/soundEventProbe.py (stepping mode) with the key script embedded; this test needs no emulator.
// See docs/aud241a-battle-start-sounds.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { ballTraySoundTicks } from "../src/engine/battleStartSounds.ts";
import { emitBattleStartBgm, emitMidBattleSwitchSounds, emitPartySendOutSounds, factoryBattleBgm } from "../src/engine/battleStartSounds.ts";
import type { PartySelectState, PartySendOutTiming } from "../src/engine/partySelect.ts";
import type { BattleResolutionPresentationState } from "../src/engine/battleResolutionPresentation.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { FactorySession } from "../src/factorySession.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";
import { cryModeFor } from "../src/engine/screenSounds.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface FixtureEvent {
  frame: number;
  kind: string;
  id: number | null;
  pan: number | null;
  mode?: string | number;
  volume?: number;
  priority?: number;
  player?: string;
  noop?: boolean;
}
interface Fixture {
  from?: number;
  frames: number;
  profile: string;
  events: FixtureEvent[];
  setupEvents?: FixtureEvent[];
  trace: {
    route: "generated-orchestrator" | "canonical-recorded";
    battleScene: "on" | "off";
    appStage?: { id: string; frame: number };
    segments: Array<{ frames: number; buttons?: string[] }>;
  };
}

const fixture = (name: string): Fixture =>
  JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}.json`, import.meta.url), "utf8")) as Fixture;

const CRY_MODES = ["NORMAL", "DOUBLES", "ENCOUNTER", "HIGH_PITCH", "ECHO_START", "FAINT", "ECHO_END", "ROAR_1", "ROAR_2", "GROWL_1", "GROWL_2", "WEAK", "WEAK_DOUBLES"];
const key = (e: FixtureEvent | SoundEvent) => ({
  frame: e.frame,
  kind: e.kind,
  id: e.id,
  pan: e.pan,
  mode: typeof e.mode === "number" ? CRY_MODES[e.mode] : e.mode,
  volume: e.volume,
  priority: e.priority,
});
const played = (events: readonly FixtureEvent[]) => events.filter((e) => e.noop !== true);

// appTrace.ts is outside the typechecked tests graph (tsconfig include), so load its stage registry untyped.
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

function collectWindow(rom: Fixture, collect = true): { events: SoundEvent[]; state: string } {
  const { appStage } = rom.trace;
  const from = rom.from ?? 0;
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  const stage = (frame: number): void => {
    if (appStage !== undefined && appStage.frame === frame) state = APP_STAGES[appStage.id]!(state);
  };
  stage(0);
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > from + rom.frames) break;
    if (collect) {
      const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
      state = result.result;
      if (advance.frame > from) events.push(...result.events);
    } else {
      state = tick(state, advance.buttons);
    }
    stage(advance.frame);
  }
  return { events, state: JSON.stringify(state) };
}

const WINDOWS = ["intro-yoshi-off-window", "intro-yoshi-on-window", "intro-magneton-off-window", "intro-magneton-on-window"];

describe("battle start sounds match the ROM (aud241a)", () => {
  it("intro-yoshi-off-window.json: tray, SE_SELECT, both ball opens and both send-out cries with their BGM duck (Scene OFF)", () => {
    const rom = fixture("intro-yoshi-off-window");
    expect(rom.profile).toBe("battle-scene-off");
    const ids = played(rom.events).map((e) => `${e.kind}:${e.id}`);
    expect(ids.filter((k) => k === "se:114")).toHaveLength(2);
    expect(ids.filter((k) => k === "se:115")).toHaveLength(6);
    expect(ids.filter((k) => k === "se:116")).toHaveLength(6);
    expect(ids.filter((k) => k === "se:15")).toHaveLength(2);
    expect(ids.filter((k) => k === "cry:281" || k === "cry:88")).toHaveLength(2);
    expect(collectWindow(rom).events.map(key)).toEqual(played(rom.events).map(key));
  });

  it("intro-yoshi-on-window.json: the same events with Scene ON's own timeline", () => {
    const rom = fixture("intro-yoshi-on-window");
    expect(rom.profile).toBe("battle-scene-on");
    expect(collectWindow(rom).events.map(key)).toEqual(played(rom.events).map(key));
  });

  it("intro-magneton-off-window.json: the same events for a MAGNETON opponent (Scene OFF)", () => {
    const rom = fixture("intro-magneton-off-window");
    expect(rom.profile).toBe("battle-scene-off");
    expect(collectWindow(rom).events.map(key)).toEqual(played(rom.events).map(key));
  });

  it("intro-magneton-on-window.json: every event equals the ROM's except the player side, which is one frame early (go246 hold, known mismatch)", () => {
    const rom = fixture("intro-magneton-on-window");
    expect(rom.profile).toBe("battle-scene-on");
    const romEvents = played(rom.events);
    const ours = collectWindow(rom).events;
    const playerSide = romEvents.filter((e) => e.frame >= 1817);
    // SE_BALL_OPEN, duck 85, the player's cry and the restore: the ROM's 1817 / 1830 / 1830 / 1891
    expect(playerSide.map((e) => e.frame)).toEqual([1817, 1830, 1830, 1891]);
    expect(ours.map(key).filter((e) => e.frame < 1816)).toEqual(romEvents.filter((e) => e.frame < 1817).map(key));
    expect(ours.map((e) => ({ ...key(e), frame: e.frame + 1 })).filter((e) => e.frame >= 1817)).toEqual(playerSide.map(key));
    expect(ours).toHaveLength(romEvents.length);
  });

  it("switch-player-off-window.json: recall and send-in SE_BALL_OPEN, the send-out cry with its BGM duck and restore (Scene OFF voluntary player switch)", () => {
    const rom = fixture("switch-player-off-window");
    expect(rom.profile).toBe("battle-scene-off");
    expect(played(rom.events).map((e) => `${e.frame}:${e.kind}:${e.id}`)).toEqual([
      "883:se:5", "923:se:5", "963:se:5", "1088:se:15", "1187:se:15", "1203:duck:476", "1203:cry:19", "1227:duck:476",
    ]);
    expect(collectWindow(rom).events.map(key)).toEqual(played(rom.events).map(key));
  });

  it("switch-player-off-window.json: collecting sounds does not change the engine state", () => {
    const rom = fixture("switch-player-off-window");
    expect(collectWindow(rom, true).state).toBe(collectWindow(rom, false).state);
  });

  it("switch-player-forced-sendout-on-window.json: the party-menu forced SEND OUT's SE_SELECT, SE_BALL_OPEN, MAGBY's cry with its BGM duck and the restore (canonical route, Scene ON)", () => {
    const rom = fixture("switch-player-forced-sendout-on-window");
    expect(rom.profile).toBe("battle-scene-on");
    expect(played(rom.events).map((e) => `${e.frame}:${e.kind}:${e.id}:${e.pan}`)).toEqual([
      "20771:se:5:null", "20914:se:15:null", "20930:duck:476:null", "20930:cry:240:-25", "20972:duck:476:null",
    ]);
    expect(collectWindow(rom).events.map(key)).toEqual(played(rom.events).map(key));
  });

  it("switch-player-forced-sendout-on-window.json: collecting sounds does not change the engine state", () => {
    const rom = fixture("switch-player-forced-sendout-on-window");
    expect(collectWindow(rom, true).state).toBe(collectWindow(rom, false).state);
  });

  describe("party-menu send-out emitter on synthetic select clocks", () => {
    const select = (sendOutElapsed: number | null, member = { speciesId: 240, hp: 100, maxHp: 100, status: "none" }): PartySelectState =>
      ({ cursor: 0, party: [member], sendOutElapsed }) as unknown as PartySelectState;
    const run = (timing: PartySendOutTiming | null, brain = false, member?: { speciesId: number; hp: number; maxHp: number; status: string }): SoundEvent[] => {
      const events: SoundEvent[] = [];
      for (let elapsed = 0; elapsed <= 260; elapsed += 1) {
        events.push(...collectSoundTick(elapsed, () => {
          emitPartySendOutSounds(elapsed === 0 ? select(null, member) : select(elapsed - 1, member), select(elapsed, member), timing, brain);
        }).events);
      }
      return events;
    };
    const summary = (events: readonly SoundEvent[]) => events.map((e) => `${e.frame}:${e.kind}:${e.id}:${e.pan}`);

    it("plays SE_BALL_OPEN 143 ticks after the confirm and the cry at pan -25 16 later (the restore is the scheduled screen sound, pinned by the ROM window)", () => {
      expect(summary(run(null))).toEqual(["143:se:15:null", "159:duck:476:null", "159:cry:240:-25"]);
    });

    it("a ball shift or late release (PartySendOutTiming) moves the ball open and the cry together", () => {
      const timing = { ballShift: 1, releaseExtra: 0 } as unknown as PartySendOutTiming;
      expect(summary(run(timing)).filter((e) => e.includes(":se:") || e.includes(":cry:"))).toEqual(["144:se:15:null", "160:cry:240:-25"]);
    });

    it("a status or low-HP mon cries WEAK and the Factory Head's BGM is the ducked track (471)", () => {
      expect(run(null, false, { speciesId: 95, hp: 10, maxHp: 100, status: "none" }).find((e) => e.kind === "cry")!.mode).toBe(11);
      expect(run(null, false, { speciesId: 95, hp: 100, maxHp: 100, status: "burn" }).find((e) => e.kind === "cry")!.mode).toBe(11);
      expect(run(null, true).filter((e) => e.kind === "duck").every((e) => e.id === 471)).toBe(true);
    });

    it("plays nothing before the send-out starts or on the cancel row", () => {
      expect(collectSoundTick(1, () => emitPartySendOutSounds(null, select(null), null, false)).events).toEqual([]);
      expect(collectSoundTick(1, () => emitPartySendOutSounds(null, { ...select(150), cursor: "cancel" } as unknown as PartySelectState, null, false)).events).toEqual([]);
    });
  });

  describe("mid-battle send-in emitter on synthetic command clocks (the branches no ROM window replays)", () => {
    const mon = (species: number, hp: number, maxHP: number) => ({ species, hp, maxHP });
    const sendIn = (battler: 0 | 1, incoming: ReturnType<typeof mon>, extra: object = {}, incomingStatus1 = 0) =>
      ({ type: "switch-in", battler, incoming, incomingStatus1, ...extra });
    const run = (command: object, brain = false, last = 100): SoundEvent[] => {
      const resolution = (elapsed: number): BattleResolutionPresentationState =>
        ({ lifecycle: { phase: "presenting", phaseElapsed: elapsed }, segments: [{ commands: [command] }], segmentIndex: 0, commandIndex: 0 }) as unknown as BattleResolutionPresentationState;
      const events: SoundEvent[] = [];
      for (let elapsed = 0; elapsed <= last; elapsed += 1) {
        events.push(...collectSoundTick(elapsed, () => {
          emitMidBattleSwitchSounds(elapsed === 0 ? null : resolution(elapsed - 1), resolution(elapsed), brain);
        }).events);
      }
      return events;
    };
    const summary = (events: readonly SoundEvent[]) => events.map((e) => `${e.frame}:${e.kind}:${e.id}:${e.pan}`);

    it("the ROM's opponent faint replacement spaces SE_BALL_OPEN and the cry by 16 with a NORMAL cry at pan 25; the emitter keeps that spacing and pan", () => {
      const rom = played(fixture("switch-opponent-replacement-off-window").events).filter((e) => e.frame >= 535);
      expect(rom.map((e) => `${e.frame}:${e.kind}:${e.id}:${e.pan}`).slice(0, 4)).toEqual(["535:se:15:null", "551:duck:476:null", "551:cry:66:25", "590:duck:476:null"]);
      expect(rom[2]!.mode).toBe("NORMAL");
      const ours = run(sendIn(1, mon(66, 100, 100)));
      const open = ours.find((e) => e.kind === "se")!;
      const cry = ours.find((e) => e.kind === "cry")!;
      expect(cry.frame - open.frame).toBe(551 - 535);
      expect([cry.id, cry.pan, cry.mode]).toEqual([66, 25, 0]);
      expect(ours.find((e) => e.kind === "duck")!.volume).toBe(85);
    });

    it("the player's cry is at pan -25 and sendInVisualDelay shifts the ball open and the cry together", () => {
      const base = run(sendIn(0, mon(19, 100, 100)));
      const late = run(sendIn(0, mon(19, 100, 100), { sendInVisualDelay: 1 }));
      expect(summary(base).filter((e) => e.includes(":se:") || e.includes(":cry:"))).toEqual(["47:se:15:null", "63:cry:19:-25"]);
      expect(summary(late).filter((e) => e.includes(":se:") || e.includes(":cry:"))).toEqual(["48:se:15:null", "64:cry:19:-25"]);
    });

    it("a status or low-HP incoming mon cries WEAK, and the Factory Head's BGM is the ducked track (471)", () => {
      expect(run(sendIn(0, mon(95, 10, 100))).find((e) => e.kind === "cry")!.mode).toBe(11);
      expect(run(sendIn(0, mon(95, 100, 100), {}, 1 << 3)).find((e) => e.kind === "cry")!.mode).toBe(11);
      const brain = run(sendIn(1, mon(66, 100, 100)), true);
      expect(brain.filter((e) => e.kind === "duck").every((e) => e.id === 471)).toBe(true);
      expect(run(sendIn(1, mon(66, 100, 100))).filter((e) => e.kind === "duck").every((e) => e.id === 476)).toBe(true);
    });

    it("the voluntary recall's SE_BALL_OPEN is 2 ticks into the switch-out; a forced removal (no recall animation) plays none", () => {
      expect(summary(run({ type: "switch-out", battler: 0 }, false, 20))).toEqual(["2:se:15:null"]);
      expect(run({ type: "switch-out", battler: 0, skipAnimation: true }, false, 20)).toEqual([]);
      expect(run({ type: "switch-out", battler: 1, targetAtRest: true }, false, 20)).toEqual([]);
    });
  });

  it("pins the lab's BGM start (m4aMPlayAllStop of the map BGM, then the battle BGM) before every intro window", () => {
    for (const name of WINDOWS) {
      const setup = fixture(name).setupEvents!;
      expect(setup.map((e) => `${e.kind}:${e.id}`), name).toEqual(["stop:469", "bgm:476"]);
      expect(setup[1]!.frame - setup[0]!.frame, name).toBeLessThanOrEqual(1);
    }
  });

  for (const name of WINDOWS) {
    it(`${name}.json: collecting sounds does not change the engine state`, () => {
      const rom = fixture(name);
      expect(collectWindow(rom, true).state).toBe(collectWindow(rom, false).state);
    });
  }
});

describe("battle start sound rules (aud241a, Tier 1)", () => {
  it("the old lab intro windows keep the tray's tick spacing from SE_BALL_TRAY_ENTER and ON - OFF = the 48-tick animation hold", () => {
    const summaries = {
      player: ["healthy", "healthy", "healthy", "empty", "empty", "empty"],
      opponent: ["healthy", "healthy", "healthy", "empty", "empty", "empty"],
    } as const;
    const ticks = ballTraySoundTicks(summaries);
    expect(ticks).toHaveLength(14);
    const on = played(fixture("battle-intro-window").events);
    const off = played(fixture("battle-intro-window-off").events);
    for (const rom of [on, off]) {
      const tray = rom.filter((e) => e.id === 114 || e.id === 115 || e.id === 116);
      expect(tray).toHaveLength(ticks.length);
      const first = tray[0]!.frame;
      tray.forEach((e, i) => {
        const expected = ticks[i]!;
        expect(e.frame - first, `tray ${i}`).toBe(expected.tick - ticks[0]!.tick);
        expect(e.id).toBe(expected.kind === "enter" ? 114 : expected.kind === "ball" ? 115 : 116);
        expect(e.pan).toBe(expected.kind === "enter" ? 0 : expected.side === "player" ? 63 : -64);
      });
      const [opponentOpen, playerOpen] = rom.filter((e) => e.id === 15);
      const [opponentCry, playerCry] = rom.filter((e) => e.kind === "cry");
      expect(opponentCry!.frame - opponentOpen!.frame).toBe(17);
      expect(playerCry!.frame - playerOpen!.frame).toBe(13);
      expect([opponentCry!.pan, playerCry!.pan]).toEqual([25, -25]);
    }
    const onOpens = on.filter((e) => e.id === 15).map((e) => e.frame);
    const offOpens = off.filter((e) => e.id === 15).map((e) => e.frame);
    expect(onOpens[0]).toBe(offOpens[0]);
    expect(onOpens[1]! - offOpens[1]!).toBe(48);
  });

  it("an empty party slot plays SE_BALL_TRAY_EXIT, a real one SE_BALL_TRAY_BALL, each with its side's pan", () => {
    const ticks = ballTraySoundTicks({
      player: ["healthy", "status", "fainted", "empty", "empty", "empty"],
      opponent: ["healthy", "empty", "empty", "empty", "empty", "empty"],
    });
    expect(ticks.filter((t) => t.kind === "enter").map((t) => t.side)).toEqual(["player", "opponent"]);
    expect(ticks.filter((t) => t.side === "player" && t.kind === "ball")).toHaveLength(3);
    expect(ticks.filter((t) => t.side === "player" && t.kind === "exit")).toHaveLength(3);
    expect(ticks.filter((t) => t.side === "opponent" && t.kind === "ball")).toHaveLength(1);
    expect(ticks.filter((t) => t.side === "opponent" && t.kind === "exit")).toHaveLength(5);
    expect(ticks.map((t) => t.tick)).toEqual([...ticks.map((t) => t.tick)].sort((a, b) => a - b));
  });

  it("the send-out cry is WEAK (mode 11) for a status or a half-HP-or-lower mon and NORMAL otherwise (ShouldPlayNormalMonCry)", () => {
    expect(cryModeFor(100, 100, false)).toBe(0);
    expect(cryModeFor(53, 100, false)).toBe(0);
    expect(cryModeFor(52, 100, false)).toBe(11);
    expect(cryModeFor(1, 100, false)).toBe(11);
    expect(cryModeFor(100, 100, true)).toBe(11);
  });

  it("the battle BGM is MUS_VS_TRAINER (476) for a Factory trainer and MUS_VS_FRONTIER_BRAIN (471) for the Factory Head, right after the map BGM stops", () => {
    expect(factoryBattleBgm(false)).toBe(476);
    expect(factoryBattleBgm(true)).toBe(471);
    for (const [brain, id] of [[false, 476], [true, 471]] as const) {
      const result = collectSoundTick(10, () => emitBattleStartBgm(brain));
      expect(result.events.map((e) => [e.frame, e.kind, e.id, e.player ?? null])).toEqual([[10, "stop", 469, "BGM"], [10, "bgm", id, null]]);
    }
  });

  it("the engine's battle BGM sits 359 frames before SE_BALL_TRAY_ENTER, the gap the canonical ROM trace shows", () => {
    const rom = played(fixture("intro-canonical-window").events);
    const romBgm = rom.find((e) => e.kind === "bgm")!;
    const romEnter = rom.find((e) => e.id === 114)!;
    expect(romEnter.frame - romBgm.frame).toBe(359);
    const session = new FactorySession({ battleScene: "on", gameplaySeed: 3 });
    const events: SoundEvent[] = [];
    session.attachSoundSink({ push: (e) => events.push(e) });
    const player = new RandomPlayer(new Rng(3), new ActionLog(false), "winning");
    let transitionId: number | undefined;
    for (let frame = 1; frame <= 1500; frame += 1) {
      session.tick(player.decide(session.state), frame);
      transitionId ??= session.state.battleRoom?.transitionPresentation?.transitionId;
    }
    const bgm = events.find((e) => e.kind === "bgm")!;
    const stop = events.find((e) => e.kind === "stop")!;
    expect([stop.id, bgm.id, stop.frame]).toEqual([469, 476, bgm.frame]);
    // tri1 (docs/tri1-transition-intro-handoff.md): the gap is the drawn transition's. The canonical trace's CIRCLES_MEET is 359; this
    // game draws CIRCLES_ASYMMETRIC_SPIRAL, whose ROM gap is 343 (frame catcher, 2 battles; before tri1 every transition took 359 here).
    expect(transitionId).toBe(36);
    expect(events.find((e) => e.id === 114)!.frame - bgm.frame).toBe(343);
    // The RandomPlayer's own button presses move the intro clock by a tick mid-tray, so only the first nine tray events are pinned here.
    const ourTray = events.filter((e) => e.id === 114 || e.id === 115 || e.id === 116).slice(0, 9);
    const romTray = rom.filter((e) => e.id === 114 || e.id === 115 || e.id === 116).slice(0, 9);
    expect(ourTray.map((e) => [e.frame - ourTray[0]!.frame, e.id, e.pan])).toEqual(romTray.map((e) => [e.frame - romTray[0]!.frame, e.id, e.pan]));
  });

  it("the tray plays on the ROM's own SE players: ENTER on SE1+SE2 (PlaySE12WithPanning), BALL on SE1, EXIT on SE2", () => {
    const rom = fixture("intro-yoshi-off-window");
    const mine = collectWindow(rom).events.filter((e) => e.id === 114 || e.id === 115 || e.id === 116);
    expect(mine.map((e) => [e.id, e.player])).toEqual(
      played(rom.events).filter((e) => e.id === 114 || e.id === 115 || e.id === 116).map((e) => [e.id, e.id === 114 ? "SE12" : e.id === 115 ? "SE1" : "SE2"]),
    );
  });
});
