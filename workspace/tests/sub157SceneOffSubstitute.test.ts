// sub157 (ISSUES #153; docs/sub157-scene-off-substitute.md): Cmd_attackanimation exempts MOVE_TRANSFORM and MOVE_SUBSTITUTE from
// HITMARKER_NO_ANIMATIONS (battle_script_commands.c:1748), so under Battle Scene OFF both still emit the controller move animation
// (prep37 / aud118: the ROM's Substitute body is identical in the two scenes). On ordinary census battles (off108Route.ts's loop:
// battle i = seed i, streak i * 11 % 49) the Scene OFF command stream of every Substitute / Transform body equals Scene ON's; every
// other move keeps the OFF BattleScript_Pausex20 receipt (control). The OFF body reads both battlers at x2 {0,0}: BattleAnimateFrontSprite
// (pokemon.c:6805) skips the front animation under HITMARKER_NO_ANIMATIONS, so no species idle rest exists in Scene OFF (the ONIX
// rest +1 drew 94,917 px on the GOLEM -> ONIX OFF window; 0 px with the OFF input, tools/integration/fixtures/sub157/receipt.json).
import { censusDeal } from "../tools/integration/censusRound.ts";
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
import { LIVE_BATTLER_X2_SCENE_OFF_INPUT, liveTrackedFrontIdleRest } from "../src/engine/liveBattlerX2History";
import type { GbaButton } from "../src/input";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../src/engine/battleCommandPresentation.ts";

type Use = { move: number; attacker: number; attack: string | null; label: string | null; commands: unknown[]; nextIsInLove: boolean };
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
    let exec = u, attack: string | null = null, label: string | null = null, nextIsInLove = false;
    for (let j = i + 1; j < ev.length; j++) {
      const q = ev[j].payload, x = ev[j].provenance?.instructionExecution ?? null;
      if (q.kind === "message" && q.messageId === "STRINGID_USEDMOVE") break;
      if (exec !== null && x !== null && x < exec) {
        // pmk1: the next action's first print, when it is the "is in love" head, is the one Scene ON's transition pause (ROM glyph row) differs on.
        const next = ev.slice(j).find((e) => e.payload.kind === "message");
        nextIsInLove = next?.payload.messageId === "STRINGID_PKMNINLOVE";
        break;
      }
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
    out.push({ move: p.actionSnapshot?.currentMove ?? null, attacker: p.actionSnapshot?.attacker ?? null, attack, label, commands, nextIsInLove });
  }
}

/** Per presented frame: the current command's type / request move and the resolution's x2 input. */
type Frame = { type: string; moveId: number | null; x2: unknown };
const cache = new Map<string, Use[]>();
const framesCache = new Map<string, Frame[]>();
function battleUses(seed: number, scene: "on" | "off"): Use[] {
  const key = `${seed}-${scene}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const out: Use[] = [];
  const frames: Frame[] = [];
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
    if (r) for (const s of r.segments) if (!seen.has(s)) { seen.add(s); usesOf(s, out); }
    const command = r?.segments[r.segmentIndex]?.commands[r.commandIndex];
    if (command) frames.push({ type: command.type, moveId: command.animation?.moveId ?? null, x2: r.liveMoveBattlerX2Input });
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
  cache.set(key, out);
  framesCache.set(key, frames);
  return out;
}

const bodiesOf = (uses: Use[], move: number) => uses.filter((u) => u.move === move && u.attack !== null);

// (case, census seed, move, attacker side, body uses in that battle)
const CASES = [
  ["Substitute (opponent attacker)", 17, MOVE_SUBSTITUTE, 1, 2],
  ["Substitute (player attacker)", 373, MOVE_SUBSTITUTE, 0, 2],
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
      // sub183: Substitute's attackstring/waitstate script lead (4 rows); Transform has none.
      expect(body.timing).toEqual(move === MOVE_SUBSTITUTE ? { minimumFrames: 32, scriptLeadFrames: 4 }
        : { minimumFrames: 32, scriptTailRows: 6 }); // ont193: Transform carries the source-derived tail rows (0 presented frames: no live body / masked pre)
    }
    // trn178 / trn181 (docs/trn181-action-transition-on.md): both scenes add the same draw-nothing action-transition pause (a
    // move-animation without a request) before the first MoveEnd sprite-visibility receipt; Scene ON's carries the render-exemption
    // marker `actionTransition: true`. Apart from the pause the streams are identical, and the pauses agree in count and frames.
    const transitionPause = (x: any, i: number, all: any[]) =>
      x.type === "move-animation" && x.animation === undefined && all[i + 1]?.type === "sprite-visibility";
    const pauses = (u: any) => u.commands.filter(transitionPause);
    for (const [a, b] of off.map((u, i) => [u, on[i]] as const)) {
      expect(pauses(b).every((x: any) => x.actionTransition === true)).toBe(true);
      expect(pauses(a).some((x: any) => x.actionTransition !== undefined)).toBe(false);
      // sta3: the pause into a sleeping battler's pre-move print (its `status` counter write precedes the print) exists in Scene ON only: the OFF status command is unmeasured (docs/aud249 sta3).
      if (pauses(a).length === 0 && pauses(b).length === 1) continue;
      // pmk1: before an "is in love" head (BattleScript_MoveUsedIsInLove) Scene ON's pause is 2 rows longer than OFF's (ROM Scene ON glyph row; OFF keeps gsp3's -2, T2 OFF unchanged).
      const inLoveRows = a.nextIsInLove ? 2 : 0;
      expect(pauses(b).map((x: any) => x.timing)).toEqual(pauses(a).map((x: any) => ({ ...x.timing, minimumFrames: x.timing.minimumFrames + inLoveRows })));
    }
    const stripped = (u: any) => ({ ...u, commands: u.commands.filter((x: any, i: number, all: any[]) => !transitionPause(x, i, all)) });
    expect(off.map(stripped)).toEqual(on.map(stripped));
  });

  it("control: every other move's OFF body keeps BattleScript_Pausex20 (SCENE_OFF_ATTACK_PAUSE; no move-animation request)", () => {
    for (const seed of [17, 373, 197]) {
      const others = battleUses(seed, "off").filter((u) => u.attack !== null && u.move !== MOVE_SUBSTITUTE && u.move !== MOVE_TRANSFORM);
      expect(others.length).toBeGreaterThan(0);
      for (const use of others) {
        expect(use.attack).toBe("SCENE_OFF_ATTACK_PAUSE");
        expect(use.commands.some((x: any) => x.type === "move-animation" && x.animation !== undefined)).toBe(false);
      }
      for (const use of battleUses(seed, "on").filter((u) => u.attack !== null)) expect(use.attack).toBe("MOVE_ANIMATION");
    }
  });

  it("Scene OFF bodies read both battlers at x2 {0,0} (no front animation); every other OFF command keeps no x2 input", () => {
    expect(liveTrackedFrontIdleRest("opponent", { x2: 1, y2: 0 }, LIVE_BATTLER_X2_SCENE_OFF_INPUT)).toEqual({ x2: 0, y2: 0 });
    for (const seed of [17, 373, 197]) {
      battleUses(seed, "off");
      const frames = framesCache.get(`${seed}-off`)!;
      const bodies = frames.filter((f) => f.type === "move-animation" && f.moveId !== null);
      expect(bodies.length).toBeGreaterThan(0);
      for (const f of bodies) expect(f.x2).toBe(LIVE_BATTLER_X2_SCENE_OFF_INPUT);
      for (const f of frames) if (f.moveId === null && f.type !== "substitute-fade") expect(f.x2).toBeUndefined();
    }
  });
});
