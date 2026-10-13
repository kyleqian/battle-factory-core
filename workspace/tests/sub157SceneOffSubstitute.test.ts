// sub157 (ISSUES #153; docs/sub157-scene-off-substitute.md): Cmd_attackanimation exempts MOVE_TRANSFORM and MOVE_SUBSTITUTE from
// HITMARKER_NO_ANIMATIONS (battle_script_commands.c:1748), so under Battle Scene OFF both still emit the controller move animation
// (prep37 / aud118: the ROM's Substitute body is identical in the two scenes). On ordinary census battles (off108Route.ts's loop:
// battle i = seed i, streak i * 11 % 49) the Scene OFF command stream of every Substitute / Transform body equals Scene ON's; every
// other move keeps the OFF BattleScript_Pausex20 receipt (control).
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

type Use = { move: number; attacker: number; attack: string | null; label: string | null; commands: unknown[] };
const FRAME_BUDGET = 200000;
const MOVE_TRANSFORM = 144;
const MOVE_SUBSTITUTE = 164;

/** off108Route.ts's use extraction: each STRINGID_USEDMOVE opens a use; its attack receipt and the commands of its receipts. */
function usesOf(segment: any, out: Use[]) {
  const ev = segment.events as any[];
  const cmds = segment.commands as any[];
  for (let i = 0; i < ev.length; i++) {
    const p = ev[i].payload;
    if (p.kind !== "message" || p.messageId !== "STRINGID_USEDMOVE") continue;
    const u = ev[i].provenance?.instructionExecution ?? null;
    const seqs = new Set<number>([ev[i].sequence]);
    let exec = u, attack: string | null = null, label: string | null = null;
    for (let j = i + 1; j < ev.length; j++) {
      const q = ev[j].payload, x = ev[j].provenance?.instructionExecution ?? null;
      if (q.kind === "message" && q.messageId === "STRINGID_USEDMOVE") break;
      if (exec !== null && x !== null && x < exec) break;
      exec = x;
      seqs.add(ev[j].sequence);
      if (q.kind === "animation" && (q.animationId === "SCENE_OFF_ATTACK_PAUSE" || q.animationId === "MOVE_ANIMATION") && attack === null) {
        attack = q.animationId;
        label = ev[j].provenance ? `${ev[j].provenance.sourceLabel}:${ev[j].provenance.sourceStatementLine}` : null;
      }
      if (seqs.size >= 15) break;
    }
    // Commands without their absolute event sequence (the two scenes' segments differ by the other moves' pauses).
    const commands = cmds.filter((c) => seqs.has(c.eventSequence)).map(({ eventSequence: _s, ...c }) => c);
    out.push({ move: p.actionSnapshot?.currentMove ?? null, attacker: p.actionSnapshot?.attacker ?? null, attack, label, commands });
  }
}

const cache = new Map<string, Use[]>();
function battleUses(seed: number, scene: "on" | "off"): Use[] {
  const key = `${seed}-${scene}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const out: Use[] = [];
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
    if (r) for (const s of r.segments) if (!seen.has(s)) { seen.add(s); usesOf(s, out); }
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

const bodiesOf = (uses: Use[], move: number) => uses.filter((u) => u.move === move && u.attack !== null);

// (case, census seed, move, attacker side, body uses in that battle)
const CASES = [
  ["Substitute (opponent attacker)", 17, MOVE_SUBSTITUTE, 1, 2],
  ["Substitute (player attacker)", 74, MOVE_SUBSTITUTE, 0, 2],
  ["Transform (player DITTO)", 197, MOVE_TRANSFORM, 0, 1],
] as const;

describe("sub157: Scene OFF Substitute / Transform keep the controller move animation (ISSUES #153)", () => {
  it.each(CASES.map((c) => [c[0], c] as const))("%s: the OFF command stream equals Scene ON's", (_name, c) => {
    const [, seed, move, attacker, count] = c;
    const off = bodiesOf(battleUses(seed, "off"), move);
    const on = bodiesOf(battleUses(seed, "on"), move);
    expect(off.length).toBe(count);
    expect(off.map((u) => u.attacker)).toEqual(Array(count).fill(attacker));
    for (const use of off) {
      expect(use.attack).toBe("MOVE_ANIMATION");
      expect(use.label).toBe(move === MOVE_SUBSTITUTE ? "BattleScript_SubstituteAnim:1096" : "BattleScript_EffectTransform:952");
      const body = use.commands.find((x: any) => x.type === "move-animation") as any;
      expect(body.animation).toMatchObject({ moveId: move, attacker });
      expect(body.timing).toEqual({ minimumFrames: 32 });
    }
    expect(off).toEqual(on);
  });

  it("control: every other move's OFF body keeps BattleScript_Pausex20 (SCENE_OFF_ATTACK_PAUSE; no move-animation request)", () => {
    for (const seed of [17, 74, 197]) {
      const others = battleUses(seed, "off").filter((u) => u.attack !== null && u.move !== MOVE_SUBSTITUTE && u.move !== MOVE_TRANSFORM);
      expect(others.length).toBeGreaterThan(0);
      for (const use of others) {
        expect(use.attack).toBe("SCENE_OFF_ATTACK_PAUSE");
        expect(use.commands.some((x: any) => x.type === "move-animation" && x.animation !== undefined)).toBe(false);
      }
      for (const use of battleUses(seed, "on").filter((u) => u.attack !== null)) expect(use.attack).toBe("MOVE_ANIMATION");
    }
  });
});
