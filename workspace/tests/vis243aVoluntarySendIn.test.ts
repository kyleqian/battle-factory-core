// vis243a (docs/vis243a-sendin-census.md): the voluntary player send-in lasts as long as the ROM waits -- the species back animation
// (Scene ON; SwitchIn_CleanShinyAnimShowSubstitute) then the cry (SwitchIn_HandleSoundAndEnd), not the old fixed 91 + 11.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import speciesStats from "../src/data/gen/species-stats.json";
import { renderBattleResolutionLiveView } from "../src/engine/battleScene";
import { createBattleResolutionPresentationRenderView } from "../src/engine/battleResolutionPresentationRender";
import { SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation";
import { sceneOffPlayerForcedSwitchInDuration, sceneOnPlayerForcedSwitchInDuration } from "../src/engine/switchInTail";

type Probe = { species: number; name: string; nature: number; romNextText: number; appElapsed: number };
const rom = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/vis243a/rom-voluntary-send-in.json", import.meta.url), "utf8")) as { on: Probe[]; off: Probe[] };
const total = (species: number, sceneOn: boolean, nature: number) =>
  switchInTiming(0, species, sceneOn, "X", false, nature).minimumFrames + SWITCH_IN_WAITSTATE_HOLD_FRAMES;

describe("vis243a: the voluntary player send-in window", () => {
  it("Scene ON: the window equals the ROM's next-print frame on 12 dense oracle probes", () => {
    for (const p of rom.on) expect(total(p.species, true, p.nature), `${p.name} nature ${p.nature}`).toBe(p.appElapsed);
  });

  it("Scene OFF: the cry-bound window equals the ROM's next-print frame on 4 dense oracle probes", () => {
    for (const p of rom.off) expect(total(p.species, false, p.nature), `${p.name}`).toBe(p.appElapsed);
  });

  it("the voluntary window is the forced duration plus the waitstate hold for every species and nature", () => {
    for (const row of speciesStats.species) {
      const sceneOffWindow = total(row.id, false, 0);
      expect(sceneOffWindow).toBe(sceneOffPlayerForcedSwitchInDuration(row.id) + SWITCH_IN_WAITSTATE_HOLD_FRAMES);
      for (const nature of [0, 6, 12, 24]) {
        expect(total(row.id, true, nature)).toBe(sceneOnPlayerForcedSwitchInDuration(row.id, nature) + SWITCH_IN_WAITSTATE_HOLD_FRAMES);
        expect(total(row.id, true, nature)).toBeGreaterThanOrEqual(91 + SWITCH_IN_WAITSTATE_HOLD_FRAMES);
      }
    }
  });

  it("a long back animation keeps drawing past the old 102-frame cut and the print waits for it (KOFFING, GROW)", () => {
    const species = 109;
    const mon = (battler: 0 | 1, side: "player" | "trainer", id: number) => Object.freeze({
      species: id, name: id === 109 ? "KOFFING" : "RATTATA", side, battler, partyIndex: battler === 0 ? 1 : 0, level: 50, hp: 100, maxHP: 100,
      gender: "male" as const, status: "none" as const, personality: 0, moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
    });
    const incoming = mon(0, "player", species);
    const field = Object.freeze({ player: mon(0, "player", 19), opponent: mon(1, "trainer", 190) });
    const timing = switchInTiming(0, species, true, "KOFFING", false, 0);
    const duration = timing.minimumFrames + SWITCH_IN_WAITSTATE_HOLD_FRAMES;
    expect(duration).toBe(146);
    const message = (lines: string[]) => Object.freeze({ type: "message", eventSequence: 1, lines, advance: "automatic", noCursor: false, timing: { minimumFrames: 24, holdFrames: 0 } });
    const commands = [
      message(["Go! KOFFING!"]),
      Object.freeze({ type: "switch-in", eventSequence: 2, battler: 0, fromPartyIndex: 0, toPartyIndex: 1, incoming, incomingStatus1: 0, timing, settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES }),
      message(["Foe AIPOM used", "SPLASH!"]),
    ];
    const rules = Object.freeze({ rulesContext: Object.freeze({ hitMarker: 0 }) });
    const viewAt = (elapsedInSwitchIn: number) => createBattleResolutionPresentationRenderView({
      field, segments: [{ field, beforeRules: rules, afterRules: null, events: [], commands }], segmentIndex: 0,
      commandIndex: elapsedInSwitchIn >= duration ? 2 : 1, lifecycle: { phase: "presenting", phaseElapsed: elapsedInSwitchIn >= duration ? elapsedInSwitchIn - duration : elapsedInSwitchIn },
      confirmHandoff: null, opponentTrainer: null, sourceDecision: { kind: "use-move" }, fadeTick: 0,
    } as never) as { message: { lines: string[] } | null; midBattleSwitchIn: { backAnim: unknown } | null };
    const draw = (e: number) => { const fb = new Uint8Array(240 * 160 * 4); renderBattleResolutionLiveView(fb, viewAt(e) as never); return Buffer.from(fb).toString("base64"); };
    // After the old cut (102) the "Go!" box and the switch-in stay up and the sprite keeps animating up to the ROM's end (e 66 + 65 = 131).
    for (const e of [102, 110, 125, 130, 145]) {
      expect(viewAt(e).message?.lines, `e ${e}`).toEqual(["Go! KOFFING!"]);
      expect(viewAt(e).midBattleSwitchIn, `e ${e}`).not.toBeNull();
    }
    expect(draw(110)).not.toBe(draw(125));
    expect(viewAt(146).message?.lines[0]).toBe("Foe AIPOM used");
  });
});
