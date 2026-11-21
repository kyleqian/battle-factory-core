import { censusDeal } from "../tools/integration/censusRound.ts";
import { describe, expect, it } from "vitest";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { liveMoveRandom2PlanContextAt } from "../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect.ts";
import { NO_EFFECT_ATTACKANIMATION_HOLD_LABELS } from "../src/engine/battleResolutionPresentation.ts";
import type { GbaButton } from "../src/input.ts";
import {
  LIVE_BATTLER_X2_IDLE, LIVE_BATTLER_X2_MOVE_TABLE, applyLiveBattlerX2Event, liveBattlerX2MoveRoleClass, liveMoveBattlerX2Input,
  liveTrackedFrontIdleRest,
} from "../src/engine/liveBattlerX2History.ts";
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import { NO_MOVES_MESSAGE_HOLD_AT } from "../src/engine/battleCommandPresentation.ts";

// fix122 (docs/fix122-audit26-defects.md): live audit 26's (aud118) two banked defects, landed.
describe("fix122 DEFECT A: Struggle 165 keeps its target's x2 (Move_STRUGGLE shakes it only with the relative ShakeMonInPlace)", () => {
  it("165 is a target `keep` row, not the damaging-move fallback", () => {
    // Revert experiment: without the row, the power-50 fallback marks the target zeroed (the aud118 1 px offset).
    expect(movesData.moves.find((row) => row.id === 165)?.power).toBe(50);
    expect(LIVE_BATTLER_X2_MOVE_TABLE.target.keep).toContain(165);
    expect(liveBattlerX2MoveRoleClass(165, "target")).toBe("keep");
    expect(liveBattlerX2MoveRoleClass(165, "attacker")).toBe("keep");
  });

  it("an opponent ONIX / RATTATA struggled onto keeps its idle rest for its next live body", () => {
    const after = applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, { kind: "move-body", moveId: 165, attackerSide: "player", turn: 2 });
    expect(after).toBe(LIVE_BATTLER_X2_IDLE);
    expect(liveMoveBattlerX2Input(after)).toBeUndefined();
    // aud118 pb-aud118-ply-50-95-c2 / pb-aud118-ply-65-19-c2: the opponent's next Taunt anchors on the rest x2 1.
    expect(liveTrackedFrontIdleRest("opponent", { x2: 1, y2: 0 }, liveMoveBattlerX2Input(after))).toEqual({ x2: 1, y2: 0 });
    const zeroedFirst = applyLiveBattlerX2Event(LIVE_BATTLER_X2_IDLE, { kind: "move-body", moveId: 33, attackerSide: "player" });
    expect(applyLiveBattlerX2Event(zeroedFirst, { kind: "move-body", moveId: 165, attackerSide: "player" })).toBe(zeroedFirst);
  });
});

// DEFECT B: the first glyph of the failure message after a no-effect attackanimation, frames after the opener's final glyph
// (direct mGBA, Scene ON = Scene OFF, r1 == r2; fix122OnStage.py / fix122OnHold.py, tools/integration/fixtures/fix122-live-receipt.json).
// Production's message command must start at glyph - 1 frames after G + 1 (the opener's holdFrames + every command between).
const ROM_GLYPH: Readonly<Record<number, readonly [string, number, number]>> = {
  // move: [failure message, ROM glyph, census example seed (ret88 / off108Route battle i = seed i)]
  // 182 was battle 11 until aip262 (changed census seed: the live AI view fills usablePartyMons); battle 12 is unchanged and carries the same glyph-40 Protect failure.
  // 113 was battle 32 until thr153 (ISSUES #141a's THRASH lock-in re-run removes battle 32's failed Light Screen); battle 41 is unmoved.
  // 115 was battle 33 until aiv270 (changed census seed: the AI turn-order / effectiveness view change moves its fight); battle 176 is unchanged and carries the same glyph-40 failure (verified: start = glyph - 1).
  // 113 was battle 41 until parity-mac (docs/parity-mac/STATUS.md "Re-pins": battle 41 changed and lost its failed Light Screen); battle 2 carries the same glyph-41 failure.
  113: ["STRINGID_BUTITFAILED", 41, 2], 115: ["STRINGID_BUTITFAILED", 40, 176], 219: ["STRINGID_BUTITFAILED", 41, 41],
  240: ["STRINGID_BUTITFAILED", 40, 0], 241: ["STRINGID_BUTITFAILED", 41, 60], 201: ["STRINGID_BUTITFAILED", 41, 18],
  258: ["STRINGID_BUTITFAILED", 41, 41], 182: ["STRINGID_BUTITFAILED", 40, 12], 197: ["STRINGID_BUTITFAILED", 40, 46],
  203: ["STRINGID_BUTITFAILED", 40, 213], 254: ["STRINGID_PKMNCANTSTOCKPILE", 40, 620], 73: ["STRINGID_PKMNEVADEDATTACK", 74, 7],
};
type Failure = { move: number; start: number };
const FRAME_BUDGET = 200000;

function failuresOf(segment: any, out: Failure[]) {
  const ev = segment.events as any[];
  const cmds = segment.commands as any[];
  for (let i = 0; i < ev.length; i++) {
    const p = ev[i].payload;
    if (p.kind !== "message" || p.messageId !== "STRINGID_USEDMOVE") continue;
    const move = p.actionSnapshot?.currentMove as number;
    const row = ROM_GLYPH[move];
    if (row === undefined) continue;
    // aud118OnHold.py: the first message after the opener (Scene OFF: after its SCENE_OFF_ATTACK_PAUSE receipt).
    const next = ev.slice(i + 1).find((e) => e.payload.kind === "message");
    if (next?.payload.messageId !== row[0]) continue;
    const opener = cmds.findIndex((c) => c.eventSequence === ev[i].sequence);
    const at = cmds.findIndex((c) => c.eventSequence === next.sequence);
    out.push({ move, start: (cmds[opener].timing?.holdFrames ?? 0)
      + cmds.slice(opener + 1, at).reduce((sum, c) => sum + (c.timing?.minimumFrames ?? 0) + (c.timing?.holdFrames ?? 0), 0) });
  }
}

/** One ordinary census battle (off108Route.ts / liveShareCensus.ts playBattle: battle i = seed i, streak i * 11 % 49). */
function battleFailures(seed: number, scene: "on" | "off"): Failure[] {
  const out: Failure[] = [];
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    ...censusDeal({ seed, factoryWinStreak: (seed * 11) % 49 }),
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
    if (r) for (const s of r.segments) if (!seen.has(s)) { seen.add(s); failuresOf(s, out); }
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
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
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
  return out;
}

const cache = new Map<string, Failure[]>();
const failures = (seed: number, scene: "on" | "off") => {
  const key = `${seed}-${scene}`;
  if (!cache.has(key)) cache.set(key, battleFailures(seed, scene));
  return cache.get(key)!;
};

describe("fix122 DEFECT B: the Scene ON failure message waits for Cmd_attackanimation's MOVE_RESULT_NO_EFFECT Pausex20", () => {
  it("covers exactly the ROM-proven attackanimation sites", () => {
    expect(NO_EFFECT_ATTACKANIMATION_HOLD_LABELS).toEqual([
      "BattleScript_PrintReflectLightScreenSafeguardString", "BattleScript_MoveWeatherChange", "BattleScript_EffectProtect",
      "BattleScript_EffectStockpile", "BattleScript_DoLeechSeed",
    ]);
  });

  for (const [move, [message, glyph, seed]] of Object.entries(ROM_GLYPH)) {
    it(`move ${move}: Scene ON ${message} starts on the ROM glyph (${glyph}) on census battle ${seed}`, () => {
      // Revert experiment: without the attackanimation hold the message starts at G + 1 (residual -(glyph - 1)).
      const found = failures(seed, "on").filter((f) => f.move === Number(move));
      expect(found.length).toBeGreaterThan(0);
      for (const f of found) expect([move, f.start]).toEqual([move, glyph - 1]);
    }, 120000);
  }

  it("Scene OFF is unchanged: the OFF attack receipt keeps olnd113's pause (Rain Dance, battle 0)", () => {
    const found = failures(0, "off").filter((f) => f.move === 240);
    expect(found.length).toBeGreaterThan(0);
    // The OFF route's opener holds 0: the SCENE_OFF_ATTACK_PAUSE command carries the 32-frame Pausex20 (aud118 off-hold.txt: residual 0).
    for (const f of found) expect(f.start).toBe(39);
  }, 120000);
});
