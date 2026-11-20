// trp1 (docs/trp1-turn-trap-animation.md): the end-of-turn trap animation, General_TurnTrap (B_ANIM_TURN_TRAP before "X is hurt by Y!").
// The frame catcher (seed 3, battle 1: "Foe GLOOM is hurt by FIRE SPIN!") saw the ROM's Status_FireSpin where ours went straight to the
// text, silent. Staged labs tools/battle-lab/trp1-<move>-<side>-<scene>.json (tools/integration/trp1Labs.py; app stages in
// tools/compare/appTrace.ts, traces tools/compare/traces/trp1-*.json): a Lv50 Rattata traps a Lv25 one (Seismic Toss), `player` = the
// player's Rattata is trapped. The rows before each lab's first trap command already sit a constant D rows behind the ROM (the trapping
// move's own hit and Seismic Toss, not this step: D = 12 .. 23 Scene ON, 6 / 7 Scene OFF), so everything here is keyed by the age in the
// command: ROM_FRAMES[lab].romStart is the ROM row of the command's first frame, our first frame is the command's start in the replay.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import timingData from "../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { TURN_TRAP_COMMAND_FRAMES, type BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";
import { TURN_TRAP_SCRIPT_LABEL, turnTrapBranchOf } from "../src/engine/turnTrapBranch.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

/** ROM frames of the first trap command (command age -> sha256 of the RGB frame, 16 hex; the oracle's PNGs of the lab traces). */
const ROM_FRAMES: Readonly<Record<string, Readonly<{ romStart: number; frames: Readonly<Record<number, string>> }>>> = {
  "trp1-wrap-player-on": { romStart: 619, frames: { 5: "074a5a0ecc9f6ed4", 9: "0f4b3fbc260205f3", 14: "b13e2850820eb403", 19: "a472392b42bbc18b", 26: "12130531f289d2cb", 33: "abc24908e5ffc3ba", 41: "9bfbdfe188452bed", 47: "f400761482b37252", 53: "52692aa6e2655849", 60: "ca22203393dd750b", 67: "ca22203393dd750b", 70: "4c015e4e31e891ba", 71: "f22480f7ceac7e86" } },
  "trp1-wrap-opp-on": { romStart: 622, frames: { 5: "f053632099461eda", 9: "8d253461770812fa", 14: "81c9b7a65818dd17", 19: "e4022b58b604ac17", 26: "f4d40e8cb3a74953", 33: "3c998931e299ec92", 41: "ec3598db24c3e6fa", 47: "c67f267ad256311a", 53: "29fc01663040645c", 60: "3f7e7663c2ddb9d8", 67: "3f7e7663c2ddb9d8", 70: "3d01eedb0ab9b68d", 71: "3d01eedb0ab9b68d" } },
  "trp1-bind-player-on": { romStart: 631, frames: { 5: "074a5a0ecc9f6ed4", 9: "0f4b3fbc260205f3", 14: "b13e2850820eb403", 19: "a472392b42bbc18b", 26: "12130531f289d2cb", 33: "abc24908e5ffc3ba", 41: "9bfbdfe188452bed", 47: "f400761482b37252", 53: "52692aa6e2655849", 60: "ca22203393dd750b", 67: "ca22203393dd750b", 70: "4c015e4e31e891ba", 71: "f22480f7ceac7e86" } },
  "trp1-bind-opp-on": { romStart: 634, frames: { 19: "e4022b58b604ac17", 26: "f4d40e8cb3a74953", 33: "3c998931e299ec92", 41: "ec3598db24c3e6fa", 47: "c67f267ad256311a", 53: "29fc01663040645c", 60: "3f7e7663c2ddb9d8", 67: "3f7e7663c2ddb9d8", 70: "3d01eedb0ab9b68d", 71: "3d01eedb0ab9b68d" } },
  "trp1-firespin-player-on": { romStart: 676, frames: { 5: "de5e1708af22e9d7", 9: "9e48ed03d2c8b813", 14: "3685b39704ac8b53", 19: "4b48ccb821438682", 26: "236883d86ca6927e", 33: "d1af60d9a3d8616b", 41: "da87f85531c52605", 47: "1da0db24207fa27e", 53: "ec970fa36cac58b2", 60: "cb3864c95a78912b", 70: "fc443b45c7d73a56", 80: "cb750dbcaa7862f6", 84: "c4e26df30e305563" } },
  "trp1-firespin-opp-on": { romStart: 681, frames: { 5: "1c1425f33d0fa181", 9: "ab5719790fca686b", 14: "b898bd93c5029323", 19: "44391dc36c2161d6", 26: "d88de80e7316e6b7", 33: "2bd36263e2a506d8", 41: "5cee0896d165cc44", 47: "1b65f497ead0c749", 53: "c1e88b0ed52a0ada", 60: "1c878d208899cae6", 70: "a43a04aaa037a9e7", 80: "02dfaaee813e24be", 84: "97682092558d545a" } },
  "trp1-whirlpool-player-on": { romStart: 706, frames: { 5: "cb750dbcaa7862f6", 9: "ba200f3a173cd8bc", 14: "700688cd61a7baab", 19: "f32ac45f34682328", 26: "1103f0a352ae2602", 33: "b04a5f290876cf90", 41: "900b25017e1d31f7", 47: "69b5d5167a37f1c8", 53: "d7b0a17cf41d769e", 60: "5f5c318314def0e8", 70: "df4f6d0cdfeb5bee", 85: "81dcf0841562679a", 100: "8b0d102ee782993c", 109: "cb750dbcaa7862f6", 113: "c4e26df30e305563" } },
  "trp1-whirlpool-opp-on": { romStart: 711, frames: { 5: "02dfaaee813e24be", 9: "bf6e2f1827e68466", 14: "732f363861c57409", 19: "7617cb03c1fb35ec", 26: "be9feaf0ad156778", 33: "771136de2f1d7e94", 41: "f50498f5f901c69b", 47: "20163408dabfcaf3", 53: "f60e70e162935de0", 60: "6c10b863ed958dae", 70: "9c4dc6828b80a4b1", 85: "e0287bc6fed27a55", 100: "02dfaaee813e24be", 109: "02dfaaee813e24be", 113: "97682092558d545a" } },
  "trp1-sandtomb-player-on": { romStart: 701, frames: { 5: "fc2f46a8b6a6b124", 9: "088e2fa3a8ceff8e", 14: "b75b5f310a4cb56a", 19: "4a9052b17229e977", 26: "99eff138e512710a", 33: "31e2c69928413c83", 41: "faf0ede33bc3c134", 47: "5f3841719c04e41d", 53: "d38901422cc037fb", 60: "3ea96ecd2ed53421", 70: "b3854eacfd4b3b08", 85: "1dd96c23ed0deb97", 100: "a4f64b46c98ee930", 104: "c90c38623bbf8855" } },
  "trp1-sandtomb-opp-on": { romStart: 707, frames: { 5: "821ee8076c5dcf67", 9: "4747595aabae3399", 14: "47bd20d28952da10", 19: "f5b292c97a52d127", 26: "6286ba1ac7c09389", 33: "f012e384327ef49b", 41: "78eb625e4c90537c", 47: "4b2b0b457cc44bd4", 53: "ba88496e28fba638", 60: "0c6ddabba532477d", 70: "5d15c6cbe3d8931f", 85: "cb98c85a9b690e76", 100: "1032a6db545f9a1b", 104: "3c42a63f187dc74f" } },
  "trp1-clamp-player-on": { romStart: 612, frames: { 0: "edfe0aa36ee36b40", 38: "edfe0aa36ee36b40", 42: "bdb4133bdecca8b4", 59: "12c9f0cf2e9f28ef" } },
  "trp1-clamp-opp-on": { romStart: 614, frames: { 0: "ff98366cfe8e73eb", 38: "ff98366cfe8e73eb", 42: "ec0e5c2f6d631f34", 59: "3bb1540dbee715d6" } },
  "trp1-firespin-opp-off": { romStart: 418, frames: { 5: "02dfaaee813e24be", 20: "02dfaaee813e24be", 34: "02dfaaee813e24be", 35: "0e3ad5b0427a147f", 37: "97682092558d545a", 45: "e03edb630cb46d22", 60: "912c7bcf6a279b62" } },
  "trp1-wrap-player-off": { romStart: 422, frames: { 5: "ca22203393dd750b", 20: "ca22203393dd750b", 34: "ca22203393dd750b", 35: "54c3d0036e1d300b", 37: "4c015e4e31e891ba", 45: "0d1b58ae5e400291", 60: "91eb5d03a063ef29" } },
  "trp1-whirlpool-player-off": { romStart: 414, frames: { 5: "cb750dbcaa7862f6", 20: "cb750dbcaa7862f6", 34: "cb750dbcaa7862f6", 35: "101dc9e9c872edc9", 37: "e3f551d6e1158ee4", 45: "a6ba0d00ea600c0a", 60: "85eb48340f29f4bb" } },
};

/** ROM SE rows of the first trap command ([command age, kind, id, pan]; tools/audio/soundEventProbe.py lab on the Scene ON labs, --fast). */
const se = (side: "player" | "opp", rows: readonly (readonly [number, "se" | "stop", number])[]) =>
  rows.map(([age, kind, id]) => [age, kind, id, kind === "stop" ? null : side === "player" ? -64 : 63] as const);
const BIND_WRAP_SE = [[3, "se", 155], [10, "se", 155], [39, "se", 170]] as const;
const ROM_SE: Readonly<Record<string, readonly (readonly [number, string, number, number | null])[]>> = Object.fromEntries((["player", "opp"] as const).flatMap((side) => [
  [`trp1-wrap-${side}-on`, se(side, BIND_WRAP_SE)],
  [`trp1-bind-${side}-on`, se(side, BIND_WRAP_SE)],
  [`trp1-firespin-${side}-on`, se(side, [[3, "se", 150], [78, "stop", 150]])],
  [`trp1-whirlpool-${side}-on`, se(side, [[8, "se", 165], [103, "stop", 165]])],
  [`trp1-sandtomb-${side}-on`, se(side, [[3, "se", 230], [98, "stop", 230]])],
  [`trp1-clamp-${side}-on`, se(side, [[9, "se", 156]])],
]));
const TRAP_SE_IDS = new Set([150, 155, 156, 165, 170, 230]);
const MOVE_OF: Readonly<Record<string, number>> = { wrap: 35, bind: 20, firespin: 83, whirlpool: 250, sandtomb: 328, clamp: 128 };
/** ROM: rows from the previous command's end to the print's first frame (each lab, both sides, both ticks). */
const ROM_COMMAND_FRAMES: Readonly<Record<string, number>> = { wrap: 68, bind: 68, firespin: 81, whirlpool: 110, sandtomb: 101, clamp: 39 };

type Trace = { appRoute: "generated-orchestrator"; oracleProfile: string; segments: Array<{ frames: number; buttons?: string[] }> };
const traceOf = (id: string): Trace =>
  JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8")) as Trace;

const isTrapCommand = (command: BattleResolutionPresentationCommand | undefined): boolean =>
  (command?.type === "general-animation" && command.animation === "TURN_TRAP") || (command?.type === "move-animation" && command.turnTrapHold === true);

type Run = { starts: number[]; frames: Map<number, string>; se: (readonly [number, string, number, number | null])[]; commands: BattleResolutionPresentationCommand[][] };
const runs = new Map<string, Run>();
/** One replay of the lab's trace: the trap commands' first frames, the first one's frames at `ages`, the trap SEs and every command list. */
function run(id: string): Run {
  const cached = runs.get(id);
  if (cached) return cached;
  const trace = traceOf(id);
  const ages = new Set(Object.keys(ROM_FRAMES[id]?.frames ?? {}).map(Number));
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.oracleProfile === "battle-scene-on" ? "on" : "off" });
  state = APP_STAGES[id]!(state);
  const result: Run = { starts: [], frames: new Map(), se: [], commands: [] };
  const events: [number, string, number, number | null][] = [];
  let last = "";
  for (const advance of traceAdvances(trace.segments)) {
    const ticked = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = ticked.result;
    for (const event of ticked.events) {
      if ((event.kind === "se" || event.kind === "stop") && event.id !== null && TRAP_SE_IDS.has(event.id)) events.push([advance.frame, event.kind, event.id, event.pan ?? null]);
    }
    const presentation = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    if (presentation) {
      for (const segment of presentation.segments) {
        if (!result.commands.includes(segment.commands as BattleResolutionPresentationCommand[])) result.commands.push(segment.commands as BattleResolutionPresentationCommand[]);
      }
      const key = `${presentation.resolutionId.requestId}:${presentation.segmentIndex}:${presentation.commandIndex}`;
      if (key !== last && isTrapCommand(presentation.segments[presentation.segmentIndex]?.commands[presentation.commandIndex])) result.starts.push(advance.frame);
      last = key;
    }
    const start = result.starts[0];
    if (start !== undefined && ages.has(advance.frame - start)) {
      const rgba = render(state);
      const rgb = Buffer.alloc(240 * 160 * 3);
      for (let p = 0, q = 0; p < rgba.length; p += 4, q += 3) { rgb[q] = rgba[p]!; rgb[q + 1] = rgba[p + 1]!; rgb[q + 2] = rgba[p + 2]!; }
      result.frames.set(advance.frame - start, createHash("sha256").update(rgb).digest("hex").slice(0, 16));
    }
  }
  const start = result.starts[0] ?? 0;
  result.se = events.filter(([frame]) => frame >= start && frame < start + 130).map(([frame, kind, idNo, pan]) => [frame - start, kind, idNo, pan] as const);
  runs.set(id, result);
  return result;
}

/** The command right before each "X is hurt by Y!" print. */
function commandsBeforeHurt(commands: readonly (readonly BattleResolutionPresentationCommand[])[]) {
  const out: BattleResolutionPresentationCommand[] = [];
  for (const list of commands) {
    list.forEach((command, index) => {
      if (command.type === "message" && command.lines.join(" ").includes(" is hurt") && index > 0) out.push(list[index - 1]!);
    });
  }
  return out;
}

describe("trp1: the end-of-turn trap animation (B_ANIM_TURN_TRAP) before \"X is hurt by Y!\"", () => {
  it("General_TurnTrap's branch follows the wrapped move, and every branch's SEs are in the sound table", () => {
    expect([35, 20, 83, 250, 128, 328, 0].map(turnTrapBranchOf)).toEqual(["BIND_WRAP", "BIND_WRAP", "FIRE_SPIN", "WHIRLPOOL", "CLAMP", "SAND_TOMB", "BIND_WRAP"]);
    expect(TURN_TRAP_COMMAND_FRAMES).toEqual({ BIND_WRAP: 68, FIRE_SPIN: 81, WHIRLPOOL: 110, CLAMP: 39, SAND_TOMB: 101 });
    const general = (timingData as unknown as { general: { label: string }[] }).general.map((entry) => entry.label);
    for (const label of Object.values(TURN_TRAP_SCRIPT_LABEL)) expect(general).toContain(label);
  });

  for (const [name, move] of Object.entries(MOVE_OF)) {
    it(`Scene ON, either side: ${name}'s tick is one TURN_TRAP general animation of the ROM's length right before the print`, () => {
      for (const side of ["player", "opp"] as const) {
        const before = commandsBeforeHurt(run(`trp1-${name}-${side}-on`).commands);
        expect(before.length).toBe(2);
        for (const command of before) {
          expect(command).toMatchObject({
            type: "general-animation", animation: "TURN_TRAP", battler: side === "player" ? 0 : 1, trapMove: move,
            timing: { minimumFrames: ROM_COMMAND_FRAMES[name] },
          });
        }
      }
    });
  }

  it("Scene OFF: the Pausex20 hold (35 rows, ROM) and no general animation", () => {
    for (const id of ["trp1-firespin-opp-off", "trp1-wrap-player-off", "trp1-whirlpool-player-off"]) {
      const { commands } = run(id);
      expect(commands.flat().some((command) => command.type === "general-animation")).toBe(false);
      const before = commandsBeforeHurt(commands);
      expect(before.length).toBe(2);
      for (const command of before) expect(command).toMatchObject({ type: "move-animation", turnTrapHold: true, timing: { minimumFrames: 35 } });
    }
  });

  for (const id of Object.keys(ROM_SE)) {
    it(`${id}: the first tick's SEs are the ROM's (age, id, pan; stopsound)`, () => {
      expect(run(id).se).toEqual(ROM_SE[id]);
    });
  }

  for (const id of Object.keys(ROM_FRAMES)) {
    it(`${id}: the first tick's frames are the ROM's`, () => {
      const expected = ROM_FRAMES[id]!.frames;
      expect(Object.fromEntries(run(id).frames)).toEqual(Object.fromEntries(Object.entries(expected).map(([age, hash]) => [Number(age), hash])));
    });
  }
});
