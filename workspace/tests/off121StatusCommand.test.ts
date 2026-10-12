// off121 (S10A timeline fidelity; docs/off121-status-command.md): the Scene OFF `status` command. In Scene OFF Cmd_statusanimation
// is skipped (HITMARKER_NO_ANIMATIONS), so the command (a set-battler-status-data receipt) lasts delta(print) - delta(status): the
// interpreter executions up to the print after it, one frame each (lead 1 on both receipts). The status command that is the first
// command after "X used Y!" (Rest's trysetrest) starts on G + 1 and lasts delta(print) - delta(used) + 1. Scene ON keeps 32.
// ROM receipts: tools/integration/fixtures/off121/receipts/rom-r1.json (off121Rom.py over direct mGBA probes, r1 == r2).
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
import type { GbaButton } from "../src/input";

type RomEvent = {
  statusLabel: string; statusOp: string; S: number; Sexec: number; G: number | null; printLabel: string; P: number; F: number | null;
};
type RomScenario = { off: { events: RomEvent[]; statusAnimations: { label: string; rows: number; activeRows: number; screenChanges: number }[] }; on: RomScenario["off"] };
const ROM = (JSON.parse(readFileSync("tools/integration/fixtures/off121/receipts/rom-r1.json", "utf8")) as { scenarios: Record<string, RomScenario> }).scenarios;

type Status = {
  label: string; print: string; deltaPrint: number; deltaUsed: number | null; firstAfterUsed: boolean;
  frames: number; framesFromUsed: number | null;
};
const FRAME_BUDGET = 200000;

/** Every status command of a segment: its source label, the print after it, and the frames from the "X used Y!" command's end. */
function statusesOf(segment: any, out: Status[]) {
  const ev = segment.events as any[];
  const cmds = segment.commands as any[];
  let used: number | null = null;
  for (let i = 0; i < ev.length; i++) {
    const p = ev[i].payload;
    if (p.kind === "message" && p.messageId === "STRINGID_USEDMOVE") used = i;
    if (p.kind !== "set-battler-status-data") continue;
    const s = ev[i].provenance.instructionExecution as number;
    const j = ev.findIndex((e: any, k: number) => k > i && e.payload.kind === "message");
    const at = cmds.findIndex((c) => c.type === "status" && c.eventSequence === ev[i].sequence);
    const usedAt = used === null ? -1 : cmds.findIndex((c) => c.eventSequence === ev[used!].sequence);
    const sameExecution = used !== null && ev.slice(used + 1, i + 1).every((e: any, k: number, a: any[]) =>
      e.provenance.instructionExecution >= (k === 0 ? ev[used!].provenance.instructionExecution : a[k - 1].provenance.instructionExecution));
    const printAt = cmds.findIndex((c) => c.eventSequence === ev[j].sequence);
    out.push({
      label: `${ev[i].provenance.sourceLabel}`, print: ev[j].payload.messageId,
      deltaPrint: ev[j].provenance.instructionExecution - s,
      deltaUsed: sameExecution ? ev[j].provenance.instructionExecution - ev[used!].provenance.instructionExecution : null,
      firstAfterUsed: sameExecution && usedAt >= 0 && at === usedAt + 1,
      frames: cmds[at].timing.minimumFrames,
      framesFromUsed: sameExecution && usedAt >= 0
        ? cmds.slice(usedAt + 1, printAt).reduce((sum: number, c: any) => sum + c.timing.minimumFrames + (c.timing.holdFrames ?? 0), 0)
        : null,
    });
  }
}

const cache = new Map<string, Status[]>();
/** One ordinary census battle (off108Route.ts / liveShareCensus.ts playBattle: battle i = seed i, streak i * 11 % 49). */
function battleStatuses(seed: number, scene: "on" | "off"): Status[] {
  const key = `${seed}-${scene}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: Status[] = [];
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
    if (r) for (const s of r.segments) if (!seen.has(s)) { seen.add(s); statusesOf(s, out); }
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
  cache.set(key, out);
  return out;
}

const classOf = (s: Status) =>
  s.label.startsWith("BattleScript_Faint") ? "faint"
    : s.label === "BattleScript_MoveEnd" ? "item cure"
      : s.print === "STRINGID_PKMNFASTASLEEP" ? "sleep turn"
        : s.print === "STRINGID_PKMNWOKEUP" ? "wake up"
          : s.print === "STRINGID_PKMNWASDEFROSTED2" ? "thaw"
            : s.label === "BattleScript_EffectRest" ? "rest"
              : "move-inflicted";
// Census seeds covering every OFF class (seeds 0..99 hold 912 status commands; tools/integration/off121StatusCensus.ts).
const SEEDS = [7, 11, 12, 13];

describe("off121: the Scene OFF status command (ROM receipts)", () => {
  // Per class: the scenario, P - Sexec (= the kernel's delta(print) - delta(status)), and F - G where the status command is on the
  // off108 pause path (production's commands from G + 1 then end on F - G - 1).
  const CLASSES: [string, string, number, number | null][] = [
    ["move-inflicted psn (opponent target)", "off121-toxic-ply-primeape-onix", 2, 51],
    ["move-inflicted psn (player target)", "off121-toxic-opp-primeape-onix", 2, 51],
    ["move-inflicted prz", "off121-thunder-wave-ply-primeape-snorlax", 2, 50],
    ["move-inflicted brn", "off121-will-o-wisp-ply-primeape-onix", 2, 49],
    ["move-inflicted slp (opponent target)", "off121-spore-ply-primeape-onix", 2, 48],
    ["move-inflicted slp (player target)", "off121-spore-opp-primeape-onix", 2, 48],
    ["rest", "off121-rest-ply-snorlax-onix", 33, 39],
    ["faint (cleareffectsonfaint)", "off121-self-destruct-ply-primeape-onix", 1, null],
  ];
  it.each(CLASSES)("%s: the print runs delta rows after the status row, its first glyph 2 rows later", (_, stem, delta, fMinusG) => {
    const e = ROM[stem]!.off.events[0]!;
    expect(e.P - e.Sexec).toBe(delta);
    expect(e.F! - e.P).toBe(2);
    if (fMinusG !== null) expect(e.F! - e.G!).toBe(fMinusG);
  });

  it("sleep turns / wake-up (attack canceler) and the Chesto Berry cure (moveend + Pausex20) run delta(print) - delta(status) rows", () => {
    const asleep = ROM["off121-spore-ply-primeape-onix"]!.off.events.filter((e) => e.printLabel.startsWith("BattleScript_MoveUsedIsAsleep"));
    const woke = ROM["off121-spore-ply-primeape-onix"]!.off.events.filter((e) => e.printLabel.startsWith("BattleScript_MoveUsedWokeUp"));
    const cure = ROM["off121-spore-chesto-ply-primeape-onix"]!.off.events.filter((e) => e.printLabel.startsWith("BattleScript_BerryCureSlpRet"));
    expect(asleep.length).toBe(3);
    expect(woke.length).toBe(1);
    expect(cure.length).toBe(1);
    for (const e of asleep) expect([e.P - e.Sexec, e.F! - e.P]).toEqual([1, 2]);
    for (const e of woke) expect([e.P - e.Sexec, e.F! - e.P]).toEqual([2, 2]);
    for (const e of cure) expect([e.P - e.Sexec, e.F! - e.P]).toEqual([35, 2]);
  });

  it("Scene OFF skips every statusanimation (1 row, no anim script, no screen change): move status, ticks, sleep and paralysis turns", () => {
    const all = Object.values(ROM).flatMap((s) => s.off.statusAnimations);
    expect(all.length).toBeGreaterThanOrEqual(20);
    expect(new Set(all.map((a) => a.label.replace(/\+\d+$/, "")))).toEqual(new Set([
      "BattleScript_MoveEffectToxic", "BattleScript_MoveEffectParalysis", "BattleScript_MoveEffectBurn", "BattleScript_MoveEffectSleep",
      "BattleScript_DoStatusTurnDmg", "BattleScript_MoveUsedIsAsleep", "BattleScript_MoveUsedIsParalyzed",
    ]));
    for (const a of all) expect([a.rows, a.activeRows, a.screenChanges]).toEqual([1, 0, 0]);
  });
});

describe("off121: the Scene OFF status command on production census routes", () => {
  it("every OFF status command lasts delta(print) - delta(status); first after \"X used Y!\": delta(print) - delta(used) + 1", () => {
    const seen = new Map<string, Set<number>>();
    for (const seed of SEEDS) {
      for (const s of battleStatuses(seed, "off")) {
        const expected = s.firstAfterUsed ? s.deltaUsed! + 1 : s.deltaPrint;
        expect(s.frames, `${seed} ${s.label} ${s.print}`).toBe(expected);
        const k = classOf(s);
        seen.set(k, (seen.get(k) ?? new Set()).add(s.frames));
      }
    }
    expect(Object.fromEntries([...seen].map(([k, v]) => [k, [...v].sort((a, b) => a - b)]))).toEqual({
      "faint": [1], "item cure": [35], "move-inflicted": [2], "rest": [38], "sleep turn": [1], "thaw": [1], "wake up": [2],
    });
  });

  it("Toxic / Thunder Wave / Rest: the next message starts on the ROM's first glyph (counted from G + 1)", () => {
    const toxic = battleStatuses(12, "off").find((s) => s.print === "STRINGID_PKMNBADLYPOISONED" && s.label === "BattleScript_EffectToxic")!;
    const wave = battleStatuses(11, "off").find((s) => s.print === "STRINGID_PKMNWASPARALYZED" && s.label === "BattleScript_EffectParalyze")!;
    const rest = battleStatuses(12, "off").find((s) => s.label === "BattleScript_EffectRest" && s.firstAfterUsed)!;
    // ROM F - G: 51 / 50 / 39 (rom-r1.json); production's commands after "X used Y!" end on F - G - 1.
    expect([toxic.framesFromUsed, wave.framesFromUsed, rest.framesFromUsed]).toEqual([50, 49, 38]);
    expect([toxic.frames, wave.frames, rest.frames]).toEqual([2, 2, 38]);
  });

  it("Scene ON is untouched: every status command stays 32 frames", () => {
    const on = [11, 12].flatMap((seed) => battleStatuses(seed, "on"));
    expect(on.length).toBeGreaterThan(5);
    for (const s of on) expect(s.frames).toBe(32);
  });
});
