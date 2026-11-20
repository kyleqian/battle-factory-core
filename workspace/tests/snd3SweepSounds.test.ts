// snd3 (docs/snd3-sweep-sounds.md): the three sound bugs of the frame catcher sweep (docs/fcs1-catcher-sweep.md findings 4-6), pinned against
// committed ROM windows (tools/audio/fixtures/snd3-*.json: soundEventProbe.py stepping mode; the --fast logs were the same rows). No emulator.
//  4. A battle-start Intimidate plays SE_M_STAT_DECREASE (its B_ANIM_STATS_CHANGE runs in both scenes), 3 frames before the banner.
//  5. Baton Pass's `returntoball BS_ATTACKER` is the instant removal in Scene ON too: no SE_BALL_OPEN when the user leaves.
//  6. Sing / Perish Song / GrassWhistle (gMovesWithQuietBGM) set the BGM to volume 128 at LaunchBattleAnimation and back to 256 at Cmd_end.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { factoryBattleStartEntryFrame } from "../src/engine/factoryBattleStartEntry.ts";
import { ENTRY_STATS_CHANGE_SE_AGE, QUIET_BGM_LAUNCH_ROW, QUIET_BGM_VOLUME, quietBgmRestore } from "../src/engine/moveAnimSounds.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

interface Row { frame: number; kind: string; id: number | null; pan: number | null; volume?: number; player?: string; via?: string; noop?: boolean }
interface Segment { frames: number; buttons?: string[] }
interface Fixture { frames: number; events: Row[]; trace?: { route: "generated-orchestrator"; battleScene: "on" | "off"; appStage: { id: string; frame: number }; segments: Segment[] } }
type Engine = ReturnType<typeof createInitialState>;

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: Engine) => Engine> };
const fixture = (name: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${name}`, import.meta.url), "utf8")) as Fixture;
const played = <T extends Row | SoundEvent>(rows: readonly T[]): T[] => rows.filter((e) => (e as Row).noop !== true && e.kind !== "pan");

/** Replays a stage + segments on the engine; `onFrame` sees each state after its tick. */
function replay(stage: string, scene: "on" | "off", segments: readonly Segment[], frames: number, onFrame?: (state: Engine) => void): SoundEvent[] {
  let state = APP_STAGES[stage]!(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
  const events: SoundEvent[] = [];
  for (const advance of traceAdvances(segments as never)) {
    if (advance.frame > frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
    onFrame?.(state);
  }
  return events;
}

const SE_BALL_OPEN = 15;
const SE_M_BATON_PASS = 224;
const SE_M_STAT_DECREASE = 245;

describe("snd3 bug 4: the battle-start Intimidate's stat SE (both scenes)", () => {
  // ROM: lab tools/battle-lab/sta6m-intimp-{off,on}.json staged with --log-setup (the intro runs inside lab.prepare; absolute frames). The
  // app replays tools/compare/traces/sta6m-intro-intimp-*.json, whose frame f is the ROM's absolute frame f + 1178 (pau4m).
  const OFFSET = 1178;
  // ours minus the ROM's for the whole Scene ON intro send-out (the player's ball, cry and restore are 1 frame early; pre-existing): the stat
  // SE keeps the same place relative to our own intro, so its residual is the same.
  const OURS_MINUS_ROM = { off: 0, on: -1 } as const;
  for (const scene of ["off", "on"] as const) {
    it(`Scene ${scene.toUpperCase()}: SE_M_STAT_DECREASE at the ROM's frame and pan, ENTRY_STATS_CHANGE_SE_AGE into the entry's stats-change command`, () => {
      const rom = fixture(`snd3-intro-intimp-${scene}-setup.json`);
      const romRows = played(rom.events).filter((e) => e.frame > OFFSET).map((e) => ({ ...e, frame: e.frame - OFFSET }));
      const trace = JSON.parse(readFileSync(new URL(`../tools/compare/traces/sta6m-intro-intimp-${scene}.json`, import.meta.url), "utf8")) as { appStage: { id: string }; segments: Segment[] };
      let statsChangeStart: number | null = null;
      const ours = played(replay(trace.appStage.id, scene, trace.segments, 1000, (state) => {
        const entry = state.factoryRoundBattleOrchestrator?.battleStartIntro?.entry;
        if (entry === undefined || statsChangeStart !== null) return;
        const frame = factoryBattleStartEntryFrame(entry);
        if (frame.segments[0]!.commands[frame.commandIndex]?.type === "stats-change" && frame.lifecycle.phaseElapsed === 0) statsChangeStart = state.frame;
      }));
      const romStat = romRows.filter((e) => e.kind === "se" && e.id === SE_M_STAT_DECREASE);
      const ourStat = ours.filter((e) => e.kind === "se" && e.id === SE_M_STAT_DECREASE);
      expect(romStat.map((e) => [e.frame, e.pan, e.via])).toEqual([[scene === "off" ? 732 : 763, 64, "PlaySE12WithPanning"]]);
      expect(ourStat.map((e) => [e.frame - OURS_MINUS_ROM[scene], e.pan])).toEqual(romStat.map((e) => [e.frame, e.pan]));
      expect(ourStat[0]!.frame).toBe(statsChangeStart! + ENTRY_STATS_CHANGE_SE_AGE);
      // the residual is the intro's own: the player's send-out ball and cry carry the same one
      const ball = (rows: readonly (Row | SoundEvent)[]) => rows.filter((e) => e.kind === "se" && e.id === SE_BALL_OPEN).map((e) => e.frame);
      expect(ball(ours).map((f) => f - OURS_MINUS_ROM[scene]).slice(-1)).toEqual(ball(romRows).slice(-1));
    });
  }
});

describe("snd3 bug 5: Baton Pass's returntoball plays no SE_BALL_OPEN (Scene ON)", () => {
  // ROM: tools/battle-lab/snd3-batonpass-{opp,player}-on.json. The only SE_BALL_OPEN is the send-in's (switchinanim), none when the user leaves
  // (Cmd_returntoball -> {Opponent,Player}HandleReturnMonToBall with skipAnim TRUE: the sprite is destroyed, no DoSwitchOutAnimation).
  it("the foe's Baton Pass: one ball sound, the send-in's, on both sides; the instant removal's rows", () => {
    const rom = fixture("snd3-batonpass-opp-on-window.json");
    const commands = new Map<string, string>();
    const ours = played(replay(rom.trace!.appStage.id, "on", rom.trace!.segments, rom.frames, (state) => {
      const res = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
      const command = res?.segments[res.segmentIndex]?.commands[res.commandIndex];
      const key = `${res?.segmentIndex}:${res?.commandIndex}`;
      if (command !== undefined && !commands.has(key)) commands.set(key, `${command.type}:${command.timing?.minimumFrames}${"skipAnimation" in command && command.skipAnimation ? ":skip" : ""}`);
    }));
    const order = (rows: readonly (Row | SoundEvent)[]) => rows.filter((e) => e.kind === "se" && (e.id === SE_BALL_OPEN || e.id === SE_M_BATON_PASS)).map((e) => e.id);
    expect(order(played(rom.events))).toEqual([SE_M_BATON_PASS, SE_BALL_OPEN]);
    expect(order(ours)).toEqual([SE_M_BATON_PASS, SE_BALL_OPEN]);
    // the Baton Pass body, the 4-row hold with no recall animation, the recall receipt 5 rows before the SWITCHINMON print, the send-in
    expect([...commands.values()].slice(1, 6)).toEqual(["move-animation:32", "switch-out:4:skip", "sprite-visibility:5", "message:13", "switch-in:138"]);
  });

  it("the player's Baton Pass (after the party menu): one ball sound, the send-in's, on both sides", () => {
    const rom = fixture("snd3-batonpass-player-on-window.json");
    const ours = played(replay(rom.trace!.appStage.id, "on", rom.trace!.segments, rom.frames));
    const balls = (rows: readonly (Row | SoundEvent)[]) => rows.filter((e) => e.kind === "se" && e.id === SE_BALL_OPEN).map((e) => e.frame);
    expect(balls(played(rom.events))).toEqual([550]);
    // ours 4 frames later: our party-menu return to the SWITCHINMON print is 3 rows longer (pre-existing, docs/snd3-sweep-sounds.md)
    expect(balls(ours)).toEqual([554]);
  });
});

describe("snd3 bug 6: the quiet BGM of Sing / Perish Song / GrassWhistle (Scene ON)", () => {
  // ROM: tools/battle-lab/snd3-<move>-<side>-on.json. duck = LaunchBattleAnimation's m4aMPlayVolumeControl(BGM, 128); restore = Cmd_end's
  // m4aMPlayVolumeControl(BGM, 256) (logged via DestroyAnimSoundTask, Cmd_end is static); Sing's Cmd_end also stops SE_M_SING (SE1).
  const LABS = ["sing-player", "sing-opp", "perishsong-player", "perishsong-opp", "grasswhistle-player", "grasswhistle-opp"] as const;
  const WINDOW = 400;
  const quiet = (rows: readonly (Row | SoundEvent)[]): [number, string, number | null, number | string | undefined][] => rows
    .filter((e) => e.frame <= WINDOW && (e.kind === "duck" || e.kind === "stop"))
    .map((e) => [e.frame, e.kind, e.id, e.kind === "duck" ? e.volume : e.player]);
  const firstMoveSe = (rows: readonly (Row | SoundEvent)[]) => rows.find((e) => e.kind === "se" && e.id !== 5)!.frame;
  for (const lab of LABS) {
    it(`${lab}: the duck and the restore on the ROM's frames`, () => {
      const rom = fixture(`snd3-${lab}-on-window.json`);
      const romRows = played(rom.events);
      const ours = played(replay(rom.trace!.appStage.id, "on", rom.trace!.segments, WINDOW));
      expect(romRows.filter((e) => e.kind === "duck").map((e) => e.via)).toEqual(["LaunchBattleAnimation", "DestroyAnimSoundTask"]);
      expect(quiet(ours)).toEqual(quiet(romRows));
      expect(quiet(ours)[0]![3]).toBe(QUIET_BGM_VOLUME);
      // the duck is the launch row, one row before the first command (Perish Song: our panse is 1 frame early, the duck is not)
      const launchToSe = firstMoveSe(romRows) - quiet(romRows)[0]![0];
      expect(launchToSe).toBe({ sing: 7, perishsong: 27, grasswhistle: 19 }[lab.split("-")[0] as "sing"]);
    });
  }

  it("only gMovesWithQuietBGM (MOVE_SING, MOVE_PERISH_SONG, MOVE_GRASS_WHISTLE) duck; restore rows from the launch row", () => {
    expect(QUIET_BGM_LAUNCH_ROW).toBe(-1);
    expect(quietBgmRestore(320, () => null)).toEqual({ row: 219 });
    expect(quietBgmRestore(195, () => null)).toEqual({ row: 257 });
    expect(quietBgmRestore(47, () => 246)).toEqual({ row: 244, stopSe: 172 });
    for (const move of [45, 46, 48, 186, 215, 253, 336]) expect(quietBgmRestore(move, () => 246)).toBeNull();
  });
});
