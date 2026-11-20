// ing1 (frame catcher 2026-11-20, docs/fcp1-frame-catcher-pictures.md): Ingrain's end-of-turn heal animation. Kyle's battle 1: the ROM
// plays General_IngrainHeal (green BG blend, absorption orbs, blue stars) before "Foe LILEEP absorbed nutrients with its roots!"; ours
// went straight to the text. Staged labs tools/battle-lab/ing1-{player-on,opp-on,player-off}.json (the wsh1 / wsh2 Wish windows with
// INGRAIN): ROM frames below (sha256 of the RGB framebuffer, the oracle's PNGs of tools/compare/traces/ing1-*.json) from the first green
// row to the first row after the blend, and the ROM's SE rows (tools/audio/soundEventProbe.py on the same labs).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { INGRAIN_HEAL_COMMAND_FRAMES, type BattleResolutionPresentationCommand } from "../src/engine/battleResolutionPresentation.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as {
  APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>>;
};

/** ROM frames of the heal (trace frame -> sha256 of the RGB frame, 16 hex). */
const ROM_FRAMES: Readonly<Record<string, Readonly<Record<number, string>>>> = {
  // player: blend 2 at 671 (command age 20), 4 at 674, first orb 687, orbs, first blue star 782, stars, blend 2 at 835, 0 at 836.
  "ing1-player-on": {
    671: "e6cf8684e07f13cc", 674: "a5566f03df760ff1", 687: "0859ae25e277fe1a", 711: "c81ad17e099339ea", 741: "6d32f13181a39613",
    782: "479ade7494b6edc1", 801: "3269787e3f7d562a", 835: "e6cf8684e07f13cc", 836: "8a70f4e12b9b9b77",
  },
  "ing1-opp-on": {
    675: "d9b201ef7b8f0a08", 678: "b8194ea0d37461e9", 691: "ea8d204ea0a7cf4e", 715: "0b8e5c1d1904bfec", 745: "0066186bcf85bd8e",
    786: "2be9d5603b029155", 805: "79200ed13c41dd1a", 839: "d9b201ef7b8f0a08", 840: "2a12d7f920d74e23",
  },
};

type Trace = { appRoute: "generated-orchestrator"; oracleProfile: string; segments: Array<{ frames: number; buttons?: string[] }> };
const traceOf = (id: string): Trace =>
  JSON.parse(readFileSync(new URL(`../tools/compare/traces/${id}.json`, import.meta.url), "utf8")) as Trace;

/** ROM SE rows of the heal ([frame, id, pan], tools/audio/soundEventProbe.py lab on the same labs, --fast): AbsorbEffect's eight
 * SE_M_CRABHAMMER (142) and HealingEffect's SE_M_ABSORB_2 (179), both panned to the rooted battler's side. */
const ROM_SE_ROWS: Readonly<Record<string, readonly (readonly [number, number, number])[]>> = {
  "ing1-player-on": [[685, 142, -64], [691, 142, -64], [697, 142, -64], [703, 142, -64], [709, 142, -64], [715, 142, -64], [721, 142, -64],
    [727, 142, -64], [780, 179, -64]],
  "ing1-opp-on": [[689, 142, 63], [695, 142, 63], [701, 142, 63], [707, 142, 63], [713, 142, 63], [719, 142, 63], [725, 142, 63],
    [731, 142, 63], [784, 179, 63]],
};

function run(id: string, capture: ReadonlySet<number> = new Set()) {
  const trace = traceOf(id);
  let state = createInitialState({ appRoute: trace.appRoute, battleScene: trace.oracleProfile === "battle-scene-on" ? "on" : "off" });
  state = APP_STAGES[id]!(state);
  const frames = new Map<number, string>();
  const commands: BattleResolutionPresentationCommand[][] = [];
  const se: [number, number, number][] = [];
  for (const advance of traceAdvances(trace.segments)) {
    const ticked = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = ticked.result;
    for (const event of ticked.events) {
      if (event.kind === "se" && (event.id === 142 || event.id === 179)) se.push([advance.frame, event.id, event.pan ?? 0]);
    }
    if (capture.has(advance.frame)) {
      const rgba = render(state);
      const rgb = Buffer.alloc(240 * 160 * 3);
      for (let p = 0, q = 0; p < rgba.length; p += 4, q += 3) { rgb[q] = rgba[p]!; rgb[q + 1] = rgba[p + 1]!; rgb[q + 2] = rgba[p + 2]!; }
      frames.set(advance.frame, createHash("sha256").update(rgb).digest("hex").slice(0, 16));
    }
    for (const segment of state.factoryRoundBattleOrchestrator?.battleResolutionPresentation?.segments ?? []) {
      if (!commands.includes(segment.commands as BattleResolutionPresentationCommand[])) commands.push(segment.commands as BattleResolutionPresentationCommand[]);
    }
  }
  return { frames, commands, se };
}

/** The command right before "X absorbed nutrients with its roots!" in each segment that prints it. */
function commandsBeforeNutrients(commands: readonly (readonly BattleResolutionPresentationCommand[])[]) {
  const out: BattleResolutionPresentationCommand[] = [];
  for (const list of commands) {
    list.forEach((command, index) => {
      if (command.type === "message" && command.lines.join(" ").includes("absorbed nutrients") && index > 0) out.push(list[index - 1]!);
    });
  }
  return out;
}

describe("ing1: the Ingrain heal animation (B_ANIM_INGRAIN_HEAL) before the heal message", () => {
  it("Scene ON, either side: one INGRAIN_HEAL general animation of 198 frames right before the message", () => {
    expect(INGRAIN_HEAL_COMMAND_FRAMES).toBe(198);
    for (const [id, battler] of [["ing1-player-on", 0], ["ing1-opp-on", 1]] as const) {
      const before = commandsBeforeNutrients(run(id).commands);
      expect(before.length).toBeGreaterThan(0);
      for (const command of before) {
        expect(command).toMatchObject({ type: "general-animation", animation: "INGRAIN_HEAL", battler, timing: { minimumFrames: 198 } });
      }
    }
  });

  it("Scene OFF: the Pausex20 hold (35 rows, ROM) and no general animation", () => {
    const { commands } = run("ing1-player-off");
    expect(commands.flat().some((command) => command.type === "general-animation")).toBe(false);
    const before = commandsBeforeNutrients(commands);
    expect(before.length).toBeGreaterThan(0);
    for (const command of before) expect(command).toMatchObject({ type: "move-animation", timing: { minimumFrames: 35 } });
  });

  for (const id of Object.keys(ROM_SE_ROWS)) {
    it(`${id}: the heal's SEs are the ROM's (frame, id, pan)`, () => {
      expect(run(id).se.filter(([frame]) => frame > 600 && frame < 900)).toEqual(ROM_SE_ROWS[id]);
    });
  }

  for (const id of Object.keys(ROM_FRAMES)) {
    it(`${id}: the heal's frames are the ROM's (green blend up, orbs, blue stars, blend down)`, () => {
      const expected = ROM_FRAMES[id]!;
      const { frames } = run(id, new Set(Object.keys(expected).map(Number)));
      expect(Object.fromEntries(frames)).toEqual(Object.fromEntries(Object.entries(expected).map(([f, h]) => [Number(f), h])));
    });
  }
});
