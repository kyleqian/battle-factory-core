// fkt1: the Scene ON faint after an end-turn tick (Leech Seed drain, poison tick, sandstorm) has no controller lag: SE_FAINT is lead + 2 rows after the faint command and the
// faint box follows 19 rows later, as the ROM (FaintAttacker+0 -> SE 16 67 rows, SE 16 -> print 19: labCompare fkt1-{kols,kotoxic,kosand}-on ROM 939 / 958, 907 / 926, 1144 / 1163).
// The faint after a move hit keeps the lag (fnt2-hit-lv50-on: SE 16 -> print stays 10, the hit chain's early commands are carried by it).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off", romTrainer: boolean) => any;
};

/** The first SE 16 frame and the start frame of the message command that follows the faint command. */
function faintRows(name: string): { se16: number; print: number } {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: "on" }), undefined, "on", true);
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  let se16 = -1;
  let print = -1;
  let seenFaint = false;
  let last = "";
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total || print >= 0) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    if (se16 < 0) for (const e of result.events) if (e.kind === "se" && e.id === 16) se16 = e.frame;
    const res = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = res?.lifecycle?.phase === "presenting" ? res.segments[res.segmentIndex]?.commands[res.commandIndex] : undefined;
    const key = command === undefined ? "" : `${res.segmentIndex}.${res.commandIndex}`;
    if (key === last) continue;
    last = key;
    if (command?.type === "faint") seenFaint = true;
    else if (seenFaint && command?.type === "message") print = state.frame;
  }
  return { se16, print };
}

describe("fkt1: Scene ON faint SE after an end-turn tick", () => {
  it.each([
    ["fkt1-kols-on", 920, 939],
    // tnl1: the Toxic status animation / print / icon rows are the ROM's (print 369, next print 484 exact): +4 over the old 883 / 902 (ROM 907 / 926: the lab's later -20 is the missing mv33 body, not this rule)
    ["fkt1-kotoxic-on", 887, 906],
    ["fkt1-kosand-on", 1123, 1142],
  ])("%s: SE 16 %i, faint box %i (SE 16 -> box 19 = ROM)", (name, se16, print) => {
    const rows = faintRows(name);
    expect(rows).toEqual({ se16, print });
    expect(rows.print - rows.se16).toBe(19);
  });
  it("a faint after a move hit keeps the controller lag (fnt2-hit-lv50-on: SE 16 305, box 315)", () => {
    expect(faintRows("fnt2-hit-lv50-on")).toEqual({ se16: 305, print: 315 });
  });
});
