// plr162 (ISSUES #146; docs/plr162-player-forced-send-in.md): the Scene OFF PLAYER send-in after a FORCED switch (Roar / Whirlwind
// `returntoball BS_TARGET` on the player). offs152 R2's measured model (slide 65, "dragged out!" at max(91, cry + 66); CASTFORM +1)
// against the twice-fresh direct-mGBA player-target sweep, and production's switch-in commands on census battles: only the forced
// player send-in moves (Scene OFF); player faint replacements / Scene ON keep the calibrated 66 / 91 + 11 (ISSUES #78).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator";
import { liveMoveRandom2PlanContextAt } from "../src/engine/battleResolutionPresentationRender";
import { createPresentationRngSession } from "../src/engine/presentationRngHost";
import { tickLiveMovePresentationRngSession } from "../src/engine/liveMovePresentationRng";
import { PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect";
import { SWITCH_IN_SPAN_FRAMES, SWITCH_IN_WAITSTATE_HOLD_FRAMES, switchInTiming } from "../src/engine/battleResolutionPresentation";
import {
  sceneOffPlayerForcedSwitchInDuration, sceneOffPlayerForcedSwitchInHealthboxSlideElapsed, sceneOffPlayerForcedSwitchInVisualDelay,
} from "../src/engine/switchInTail";
import { SEND_IN_TAIL_OFF_CRY_FRAMES } from "../src/data/sendInTailOff";
import type { GbaButton } from "../src/input";

const SPECIES_CASTFORM = 385;

describe("plr162: the Scene OFF forced player send-in model", () => {
  it("reproduces the player-target Scene OFF sweep: slide and \"dragged out!\" 339 / 339 (source cry)", () => {
    const rows = readFileSync("tools/integration/fixtures/offs152/species-sweep-player-target-off.txt", "utf8").split("\n")
      .map((l) => /^(\d+) \d+ pidx \[1, 0\] species \[\d+, 228\] ball (\d+) y2start \d+ hbslide (\d+) ctrlIdle \S+ txtStart (\d+)/.exec(l))
      .filter((m) => m !== null).map((m) => m!.slice(1).map(Number));
    expect(rows).toHaveLength(339);
    let slideBound = 0;
    for (const [species, ball, slide, text] of rows) {
      expect(sceneOffPlayerForcedSwitchInHealthboxSlideElapsed(species!), `slide ${species}`).toBe(slide! - ball!);
      expect(sceneOffPlayerForcedSwitchInDuration(species!), `message ${species}`).toBe(text! - ball!);
      if ((SEND_IN_TAIL_OFF_CRY_FRAMES[species!] ?? 0) + 66 <= 91) slideBound += 1;
    }
    expect(slideBound).toBeGreaterThan(0);
    expect(sceneOffPlayerForcedSwitchInVisualDelay(16)).toBe(-1);
    expect(sceneOffPlayerForcedSwitchInVisualDelay(SPECIES_CASTFORM)).toBe(0);
  });

  it("switchInTiming: only the Scene OFF forced player send-in moves", () => {
    expect(switchInTiming(0, 157, false, "TYPHLOSION", true)).toEqual({ minimumFrames: 174 - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
    expect(switchInTiming(0, 16, false, "PIDGEY", true)).toEqual({ minimumFrames: 91 - SWITCH_IN_WAITSTATE_HOLD_FRAMES });
    for (const [sceneOn, forced] of [[false, false], [true, false], [true, true]] as const) {
      expect(switchInTiming(0, 157, sceneOn, "TYPHLOSION", forced)).toEqual({ minimumFrames: SWITCH_IN_SPAN_FRAMES });
    }
  });
});

const FRAME_BUDGET = 200000;
/** Every switch-in command of one ordinary census battle (offs152's loop: battle i = seed i, streak i * 11 % 49), with the command before it. */
function switchIns(seed: number, scene: "on" | "off") {
  const out: { command: any; previous: any; switchOut: any }[] = [];
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, rngValue: seed, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const seen = new Set<unknown>();
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation as any;
    if (r) {
      for (const s of r.segments) {
        if (seen.has(s)) continue;
        seen.add(s);
        s.commands.forEach((c: any, i: number) => {
          if (c.type === "switch-in") out.push({ command: c, previous: s.commands[i - 1], switchOut: s.commands[i - 2] });
        });
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
        pulse(selector.message !== null ? "A" : selector.cursor === "onix" && !selector.submenuOpen ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  until(() => phase() === "action-menu");
  while (!ended) {
    pulse("A");
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
  return out;
}

// Census battles whose opponent Roars (23) / Whirlwinds (76) the player (offs152's CASES).
describe.each([["Roar", 23], ["Whirlwind", 76]] as const)("plr162: %s on the player (census seed %i)", (_move, seed) => {
  const isForced = (s: { previous: any; switchOut: any }) => s.previous?.type === "sprite-visibility" && s.previous.recall === true
    && s.switchOut?.type === "switch-out" && s.switchOut.skipAnimation === true;
  it("Scene OFF: the forced player send-in carries the plr162 tail; other player send-ins keep 66 / 91 + 11", () => {
    const player = switchIns(seed, "off").filter((s) => s.command.battler === 0);
    const forced = player.filter(isForced);
    expect(forced.length).toBeGreaterThan(0);
    for (const { command } of forced) {
      const species = command.incoming.species as number;
      expect(command).toMatchObject({
        healthboxSlideElapsed: sceneOffPlayerForcedSwitchInHealthboxSlideElapsed(species),
        sendInVisualDelay: sceneOffPlayerForcedSwitchInVisualDelay(species),
        timing: { minimumFrames: sceneOffPlayerForcedSwitchInDuration(species) - SWITCH_IN_WAITSTATE_HOLD_FRAMES },
        settleHoldFrames: SWITCH_IN_WAITSTATE_HOLD_FRAMES,
      });
    }
    for (const { command } of player.filter((s) => !isForced(s))) {
      expect(command.timing).toEqual({ minimumFrames: SWITCH_IN_SPAN_FRAMES });
      expect(command.healthboxSlideElapsed).toBeUndefined();
      expect(command.sendInVisualDelay).toBeUndefined();
    }
  }, 120000);

  it("Scene ON: the forced player send-in is unchanged (its message waits for the Roar cry too: not modelled)", () => {
    const forced = switchIns(seed, "on").filter((s) => s.command.battler === 0 && isForced(s));
    expect(forced.length).toBeGreaterThan(0);
    for (const { command } of forced) {
      expect(command.timing).toEqual({ minimumFrames: SWITCH_IN_SPAN_FRAMES });
      expect(command.healthboxSlideElapsed).toBeUndefined();
      expect(command.sendInVisualDelay).toBeUndefined();
    }
  }, 120000);
});
