// ptc2 (docs/aud251-s11-scoreboard-refresh.md "ptc2"): a side-condition wore-off print followed by the same end turn's poison / burn tick prints the tick's first glyph
// 5 rows after the engine's end-of-hold row (ptc1's rule, END_TURN_PRINT_AFTER_PRINT_ROWS). ROM labs etp3-{reflect,safeguard}{tox,wisp}5-{on,off} (tools/integration/etp1MakeLabs.py):
// Reflect cast on turn 1 wears off at the end of turn 5 (SideStatusWoreOff), Safeguard cast on turn 1 ends at the end of turn 5 (SafeguardEnds, one `pause` first),
// the foe's Toxic / Will-O-Wisp (Reflect labs) or the player's (Safeguard labs: the foe is poisoned / burned) ticks in the same end turn.
// Source of the 5: ROM per-frame trace (reflecttox5-on, hcr3mProbe rows): waitmessage's last frame W = 4949, end2 W+1, RunBattleScriptCommands_PopCallbacksStack W+2
// (gCurrentActionFuncId B_ACTION_TRY_FINISH pops gBattleMainFunc back to BattleTurnPassed), BattleTurnPassed W+3 (DoFieldEndTurnEffects has no field effect left, DoBattlerEndTurnEffects ->
// ENDTURN_POISON / BURN -> BattleScriptExecute(BattleScript_PoisonTurnDmg / BurnTurnDmg)), the tick's printstring W+4, first glyph W+6. A same-script printstring would run on W+1, so the
// state-machine hand-off is 3 rows (end2, the pop, BattleTurnPassed); the engine's message command starts on W+1 and its first glyph on the command start (+ lead), so the printstring ->
// glyph rows (2) are the rest of the 5. ROM first-glyph rows below equal the labCompare PRINTS rows (ROM = engine, exact); the engine was 5 earlier before ptc1.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { createInitialState, tick } from "../src/engine/core.ts";
import { traceAdvances } from "../tools/compare/traceReplay.ts";

const appTracePath = "../tools/compare/appTrace.ts";
const { labBackedStage } = (await import(/* @vite-ignore */ appTracePath)) as {
  labBackedStage: (file: string, state: ReturnType<typeof createInitialState>, frame: undefined, scene: "on" | "off") => any;
};

// [wore-off / ends print first glyph, tick print first glyph] of the last end turn (the lab ends there)
const ROM_LAST_TWO_GLYPHS: Readonly<Record<string, readonly [number, number]>> = {
  "etp3-reflecttox5-on": [4863, 4955],
  "etp3-reflecttox5-off": [4863, 4955],
  "etp3-reflectwisp5-on": [4834, 4926],
  "etp3-reflectwisp5-off": [4834, 4926],
  "etp3-safeguardtox5-on": [5674, 5791],
  "etp3-safeguardtox5-off": [5603, 5720],
  "etp3-safeguardwisp5-on": [5645, 5762],
  "etp3-safeguardwisp5-off": [5574, 5691],
};

function firstGlyphFrames(name: string): number[] {
  const lab = JSON.parse(readFileSync(new URL(`../tools/battle-lab/${name}.json`, import.meta.url), "utf8"));
  const scene: "on" | "off" = name.endsWith("-on") ? "on" : "off";
  let state = labBackedStage(`${name}.json`, createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }), undefined, scene);
  const frames: number[] = [];
  let last = "";
  const total = lab.trace.segments.reduce((n: number, s: { frames: number }) => n + s.frames, 0);
  for (const advance of traceAdvances(lab.trace.segments)) {
    if (advance.frame > total) break;
    state = tick(state, advance.buttons);
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation;
    const command = resolution?.segments?.[resolution.segmentIndex]?.commands?.[resolution.commandIndex];
    const key = command === undefined || resolution.lifecycle?.phase !== "presenting" ? "" : `${resolution.segmentIndex}.${resolution.commandIndex}`;
    if (key === last) continue;
    last = key;
    if (key !== "" && command.type === "message") frames.push(state.frame + (command.leadFrames ?? 0));
  }
  return frames;
}

describe("ptc2: wore-off print -> poison / burn tick print (ROM labs)", () => {
  for (const [name, pins] of Object.entries(ROM_LAST_TWO_GLYPHS)) {
    it(`${name}: wore-off and tick first glyphs equal the ROM's ${pins.join(" / ")}`, () => {
      expect(firstGlyphFrames(name).slice(-2)).toEqual([...pins]);
    });
  }
});
