// wth236: the end-turn weather animations ("Hail continues to fall." etc.) are presented in Scene ON as a general-animation
// command that draws the weather move's own body (General_Hail = Move_HAIL, General_Sandstorm = Move_SANDSTORM, General_Sun =
// Move_SUNNY_DAY, General_Rain), and in Scene OFF as nothing (Cmd_playanimation(_var) tests HITMARKER_NO_ANIMATIONS before its
// weather branch). The kernel's receipts are untouched: each census battle's eventsDigest equals the pre-fix census arm's.
// Driver = the census loop (off121StatusCommand.test.ts / tools/integration/lsd194Census.ts): battle i = seed i, streak i * 11 % 49,
// rentals 0..2, the least-used legal move.
import { censusDeal } from "../tools/integration/censusRound.ts";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  WAITMESSAGE_LONG_HOLD_FRAMES, WEATHER_CONTINUES_OFF_PAUSE_ROWS,
  WEATHER_CONTINUES_BODY_ROWS, WEATHER_CONTINUES_LAUNCH_LEAD_ROWS, WEATHER_CONTINUES_LAUNCH_TAIL_ROWS, WEATHER_CONTINUES_MOVE_IDS,
  weatherContinuesAnimationOf, weatherContinuesCommandFrames, type WeatherContinuesAnimation,
} from "../src/engine/battleResolutionPresentation.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect.ts";
import type { GbaButton } from "../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../src/engine/battleCommandPresentation.ts";

const FRAME_BUDGET = 200_000;
const WEATHER_PRINT_IDS = new Set([
  "STRINGID_SUNLIGHTSTRONG", "STRINGID_RAINCONTINUES", "STRINGID_DOWNPOURCONTINUES", "STRINGID_RAINSTOPPED",
  "STRINGID_SANDSTORMRAGES", "STRINGID_HAILCONTINUES",
]);

type WeatherCommand = { animation: string; animated: boolean; minimumFrames: number; battler: number };
type Battle = {
  digest: string;
  weather: WeatherCommand[];
  weatherEvents: number;
  /** The end-turn weather prints (Sun / Rain / Sandstorm / Hail continues, rain stopped): id and the message command's hold. */
  weatherPrints: { messageId: string; holdFrames: number }[];
  /** The render effect while the first weather command's body plays (Scene ON). */
  bodyEffect: { type: string; moveId?: number; age?: number; generalRain?: boolean } | null;
};

/** One ordinary census battle; the eventsDigest is computed exactly as the census does. */
function playCensusBattle(seed: number, scene: "on" | "off"): Battle {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    ...censusDeal({ seed, factoryWinStreak: (seed * 11) % 49 }),
  }));
  let rng = createPresentationRngSession();
  const events = createHash("sha256");
  const seen = new Set<unknown>();
  const weather: WeatherCommand[] = [];
  let weatherEvents = 0;
  const weatherPrints: Battle["weatherPrints"] = [];
  let bodyEffect: Battle["bodyEffect"] = null;
  let frame = 0;
  let ended = false;
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation;
    if (r) {
      for (const s of r.segments) {
        if (seen.has(s)) continue;
        seen.add(s);
        events.update(JSON.stringify(s.events));
        for (const event of s.events) {
          if (event.payload.kind === "animation" && weatherContinuesAnimationOf(event.payload) !== null) weatherEvents += 1;
        }
        for (const c of s.commands) {
          if (c.type === "message") {
            const printed = s.events.find((e) => e.sequence === c.eventSequence);
            if (printed?.payload.kind === "message" && WEATHER_PRINT_IDS.has(printed.payload.messageId)) {
              weatherPrints.push({ messageId: printed.payload.messageId, holdFrames: c.timing?.holdFrames ?? 0 });
            }
          }
          if (c.type === "general-animation" && Object.hasOwn(WEATHER_CONTINUES_BODY_ROWS, c.animation)) {
            weather.push({ animation: c.animation, animated: c.animated === true, minimumFrames: c.timing.minimumFrames, battler: c.battler });
          }
        }
      }
      // The first weather command, seen while presenting: the body effect a few rows into its script.
      const command = r.segments[r.segmentIndex]?.commands[r.commandIndex];
      if (bodyEffect === null && r.lifecycle.phase === "presenting" && command?.type === "general-animation"
        && Object.hasOwn(WEATHER_CONTINUES_BODY_ROWS, command.animation) && r.lifecycle.phaseElapsed === WEATHER_CONTINUES_LAUNCH_LEAD_ROWS + 5) {
        const effect = createBattleResolutionPresentationRenderView(r).effect;
        bodyEffect = effect === null || effect === undefined ? { type: "none" }
          : effect.type === "move" ? { type: "move", moveId: effect.request.moveId, age: effect.age, generalRain: effect.request.generalRain === true }
          : { type: effect.type };
      }
    }
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended) step([button]); if (!ended) step(); };
  const forcedSelector = () => {
    const selector = state.battleForcedPartySelect;
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!ended && !predicate()) {
      const selector = forcedSelector();
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (selector.cursor === "cancel" || !selector.party[selector.cursor]!.legal)) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  until(() => phase() === "action-menu");
  while (!ended) {
    const forcedSlot = state.battleCommandPresentation?.forcedMove?.decision.moveSlot ?? null;
    pulse("A");
    if (forcedSlot !== null) {
      slotUses[forcedSlot]!++;
      if (phase() === "no-moves-message") {
        until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
        pulse("A");
      }
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
      continue;
    }
    until(() => phase() === "fight-menu");
    if (ended) break;
    const menu = state.battleCommandPresentation!;
    const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
    const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
    slotUses[slot]!++;
    for (let i = 0; i < 4; i++) {
      const cursor = state.battleCommandPresentation!.fightCursor;
      if (cursor === slot) break;
      pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
    }
    pulse("A");
    until(() => !state.battleCommandPresentation);
    until(() => phase() === "action-menu");
  }
  return { digest: events.digest("hex").slice(0, 16), weather, weatherEvents, weatherPrints, bodyEffect };
}

/** Census seeds that use each weather move, with their eventsDigest (lsd194Census arms; Rain / Sun seeds re-staged by dmg264 to seeds the fix leaves unchanged, cda886899 arms). */
const SEEDS: Record<WeatherContinuesAnimation, { seed: number; on: string; off: string }> = {
  HAIL_CONTINUES: { seed: 14, on: "940a12ebdf69440f", off: "9186cf39048d76cd" },
  SANDSTORM_CONTINUES: { seed: 1, on: "f01c8443bef4947b", off: "4430a7aa8032928f" },
  RAIN_CONTINUES: { seed: 20, on: "7564dade67768db1", off: "e0682c3a73b49daa" },
  SUN_CONTINUES: { seed: 35, on: "4a676c3a9ee888a7", off: "d5acc8fc4b030cc3" },
};

describe("wth236: end-turn weather animations", () => {
  it("names the four general animations from the kernel's receipts (playanimation ids and playanimation_var 12 / 13)", () => {
    expect(weatherContinuesAnimationOf({ animationId: "WEATHER_VAR", arguments: ["12"] })).toBe("SANDSTORM_CONTINUES");
    expect(weatherContinuesAnimationOf({ animationId: "WEATHER_VAR", arguments: ["13"] })).toBe("HAIL_CONTINUES");
    expect(weatherContinuesAnimationOf({ animationId: "WEATHER_VAR", arguments: [] })).toBeNull();
    expect(weatherContinuesAnimationOf({ animationId: "RAIN_CONTINUES", arguments: [] })).toBe("RAIN_CONTINUES");
    expect(weatherContinuesAnimationOf({ animationId: "SUN_CONTINUES", arguments: [] })).toBe("SUN_CONTINUES");
    expect(weatherContinuesAnimationOf({ animationId: "MOVE_ANIMATION", arguments: ["258"] })).toBeNull();
    expect(weatherContinuesCommandFrames("HAIL_CONTINUES")).toBe(WEATHER_CONTINUES_LAUNCH_LEAD_ROWS + 158 + WEATHER_CONTINUES_LAUNCH_TAIL_ROWS);
    expect(WEATHER_CONTINUES_MOVE_IDS).toEqual({ RAIN_CONTINUES: 240, SUN_CONTINUES: 241, SANDSTORM_CONTINUES: 201, HAIL_CONTINUES: 258 });
  });

  for (const animation of Object.keys(SEEDS) as WeatherContinuesAnimation[]) {
    const { seed, on, off } = SEEDS[animation];
    it(`${animation}: census seed ${seed} draws the body on every continuing turn in Scene ON, nothing in Scene OFF, digests unchanged`, () => {
      const sceneOn = playCensusBattle(seed, "on");
      expect(sceneOn.digest).toBe(on);
      expect(sceneOn.weatherEvents).toBeGreaterThan(0);
      expect(sceneOn.weather.length).toBe(sceneOn.weatherEvents);
      for (const command of sceneOn.weather) {
        expect(command).toEqual({ animation, animated: true, minimumFrames: weatherContinuesCommandFrames(animation), battler: 0 });
      }
      // rnc1: General_Rain is its own script (script row = command row - 2, rainDance.ts generalRainAtAge); the others are the move body.
      expect(sceneOn.bodyEffect).toEqual(animation === "RAIN_CONTINUES"
        ? { type: "move", moveId: 240, age: 4, generalRain: true }
        : { type: "move", moveId: WEATHER_CONTINUES_MOVE_IDS[animation], age: 5, generalRain: false });

      const sceneOff = playCensusBattle(seed, "off");
      expect(sceneOff.digest).toBe(off);
      expect(sceneOff.weather).toEqual([]);
    });
  }

  // sbx3: Scene OFF's Sun / Rain continues take Cmd_playanimation's BattleScript_Pausex20 branch (pause B_WAIT_TIME_SHORT, text on screen),
  // so the print's hold runs on by the pause (ROM-measured etp1-sun-off +30, etp1-rain5-off +31 with the jumpifbyte row); every other weather
  // print (rain stopped, sandstorm / hail via playanimation_var, and all of Scene ON) is unchanged.
  it("sbx3: Scene OFF Sun continues holds +30 rows, Rain / Downpour continues +31, other weather prints and Scene ON unchanged", () => {
    expect(WEATHER_CONTINUES_OFF_PAUSE_ROWS).toBe(30);
    const sun = playCensusBattle(SEEDS.SUN_CONTINUES.seed, "off").weatherPrints;
    expect(sun.filter((p) => p.messageId === "STRINGID_SUNLIGHTSTRONG").length).toBeGreaterThan(0);
    for (const p of sun) expect(p.holdFrames).toBe(p.messageId === "STRINGID_SUNLIGHTSTRONG" ? WAITMESSAGE_LONG_HOLD_FRAMES + 30 : WAITMESSAGE_LONG_HOLD_FRAMES);
    const rain = playCensusBattle(SEEDS.RAIN_CONTINUES.seed, "off").weatherPrints;
    const rainContinues = (id: string) => id === "STRINGID_RAINCONTINUES" || id === "STRINGID_DOWNPOURCONTINUES";
    expect(rain.filter((p) => rainContinues(p.messageId)).length).toBeGreaterThan(0);
    for (const p of rain) expect(p.holdFrames).toBe(rainContinues(p.messageId) ? WAITMESSAGE_LONG_HOLD_FRAMES + 31 : WAITMESSAGE_LONG_HOLD_FRAMES);
    for (const animation of ["SANDSTORM_CONTINUES", "HAIL_CONTINUES"] as const) {
      const prints = playCensusBattle(SEEDS[animation].seed, "off").weatherPrints;
      expect(prints.length).toBeGreaterThan(0);
      for (const p of prints) expect(p.holdFrames).toBe(WAITMESSAGE_LONG_HOLD_FRAMES);
    }
    for (const animation of ["SUN_CONTINUES", "RAIN_CONTINUES"] as const) {
      for (const p of playCensusBattle(SEEDS[animation].seed, "on").weatherPrints) expect(p.holdFrames).toBe(WAITMESSAGE_LONG_HOLD_FRAMES);
    }
  });
});
