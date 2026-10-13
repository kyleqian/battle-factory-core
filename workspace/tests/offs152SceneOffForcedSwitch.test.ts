// offs152 (S10A, ISSUES #146 items 4/5; docs/offs152-scene-off-send-in-tail.md §R0): Scene OFF `returntoball` (Roar / Whirlwind
// `BS_TARGET`, Baton Pass `BS_ATTACKER`) is the forced removal: Cmd_returntoball passes skipAnim = TRUE in both scenes
// (battle_script_commands.c:5346-5353), so the target is removed in ONE row (returntoball row + 2, direct mGBA Scene OFF probes
// tools/integration/fixtures/off148/receipts/rom-r1.json) instead of the 32-frame voluntary recall. Production: the no-hit pause
// (off108's rule, lead -3 for this receipt), the forced hold (4, target at rest), the recall receipt (gap 6 before Roar's
// switchinanim; 5 before Baton Pass's SWITCHINMON print). Replayed on census battles (off108Route.ts's loop, as off148's test).
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
import {
  FORCED_RETURN_TO_BALL_HOLD_FRAMES, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES,
  SCENE_OFF_BATON_PASS_RETURN_TO_BALL_PRINT_GAP_FRAMES,
} from "../src/engine/battleResolutionPresentation";
import type { GbaButton } from "../src/input";

type Row = [number, string, string, string | null, number | null];
type Command = [number, string, number | null, number | null];
type Use = {
  seed: number; move: number; attacker: number; u: number; opener: string;
  attack: Row | null; hit: boolean; follow: Row[]; commands: Command[]; raw: unknown[];
};
const FRAME_BUDGET = 200000;
const idOf = (p: any) => p.animationId ?? p.messageId ?? p.statusId ?? p.stat ?? "";

/** off108Route.ts's use extraction, keeping the raw commands too. */
function usesOf(seed: number, segment: any, out: Use[]) {
  const ev = segment.events as any[];
  const cmds = segment.commands as any[];
  for (let i = 0; i < ev.length; i++) {
    const p = ev[i].payload;
    if (p.kind !== "message" || (p.messageId !== "STRINGID_USEDMOVE" && p.messageId !== "STRINGID_EMPTYSTRING3")) continue;
    const u = ev[i].provenance?.instructionExecution ?? null;
    const follow: Row[] = [];
    let exec = u, attack: Row | null = null, hit = false;
    for (let j = i + 1; j < ev.length; j++) {
      const q = ev[j].payload, x = ev[j].provenance?.instructionExecution ?? null;
      if (q.kind === "message" && (q.messageId === "STRINGID_USEDMOVE" || q.messageId === "STRINGID_EMPTYSTRING3")) break;
      if (exec !== null && x !== null && x < exec) break;
      exec = x;
      const pv = ev[j].provenance;
      const row: Row = [ev[j].sequence, q.kind, String(idOf(q)), pv ? `${pv.sourceLabel}:${pv.sourceStatementLine}` : null, x === null || u === null ? null : x - u];
      if (q.kind === "animation" && (q.animationId === "SCENE_OFF_ATTACK_PAUSE" || q.animationId === "MOVE_ANIMATION") && attack === null) attack = row;
      else if (q.kind === "animation" && q.animationId === "HIT_ANIMATION" && attack !== null) hit = true;
      follow.push(row);
      if (follow.length >= 14) break;
    }
    const seqs = new Set(follow.map((r) => r[0]));
    const raw = cmds.filter((c) => seqs.has(c.eventSequence) || c.eventSequence === ev[i].sequence);
    out.push({
      seed, move: p.actionSnapshot?.currentMove ?? null, attacker: p.actionSnapshot?.attacker ?? null, u, opener: p.messageId,
      attack, hit, follow, raw,
      commands: raw.map((c) => [c.eventSequence, c.type, c.timing?.minimumFrames ?? null, c.timing?.holdFrames ?? null]),
    });
  }
}

const cache = new Map<string, Use[]>();
/** One ordinary census battle (off108Route.ts / liveShareCensus.ts playBattle: battle i = seed i, streak i * 11 % 49). */
function battleUses(seed: number, scene: "on" | "off"): Use[] {
  const key = `${seed}-${scene}`;
  const hit = cache.get(key);
  if (hit) return hit;
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
    if (r) for (const s of r.segments) if (!seen.has(s)) { seen.add(s); usesOf(seed, s, out); }
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

type RomRun = [string, number, number, number, number, number[], number];
type RomUse = { mv: number; G: number; runs: RomRun[] };
const rom148 = JSON.parse(readFileSync("tools/integration/fixtures/off148/receipts/rom-r1.json", "utf8")) as {
  scenarios: Record<string, { off: RomUse[] }>;
};
const romUse = (rom: typeof rom148, scenario: string, move: number) => rom.scenarios[scenario]!.off.find((u) => u.mv === move)!;
/** The attackanimation row (right before BattleScript_Pausex20+0) and the rows after it, relative to G. */
function romRows(use: RomUse) {
  const k = use.runs.findIndex((r) => r[0] === "BattleScript_Pausex20+0");
  return { att: use.runs[k - 1]![1], after: use.runs.slice(k) };
}

/** N's command start, frames after G + 1 (the opener's hold + every command before N's). */
function startOf(use: Use, nSequence: number): number {
  const at = use.commands.findIndex((c, i) => i > 0 && c[0] >= nSequence);
  return (use.commands[0]![3] ?? 0) + use.commands.slice(1, at).reduce((sum, c) => sum + (c[2] ?? 0) + (c[3] ?? 0), 0);
}
const noHitBodies = (uses: Use[], move: number, attacker: number) =>
  uses.filter((u) => u.move === move && u.attacker === attacker && u.attack?.[2] === "SCENE_OFF_ATTACK_PAUSE" && !u.hit);
const pauseOf = (use: Use) =>
  use.raw.find((c: any) => c.eventSequence === use.attack![0] && c.type === "move-animation") as any;

// (class, census seed, move, attacker side, ROM scenario or null, removal row G+, gap, P)
const CASES = [
  ["Roar (player attacker)", 47, 46, 0, "off148-roar-ply", 46, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES, 41],
  ["Roar (opponent attacker)", 23, 46, 1, null, 46, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES, 41],
  ["Whirlwind (player attacker)", 183, 18, 0, null, 46, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES, 41],
  ["Whirlwind (opponent attacker)", 76, 18, 1, null, 46, FORCED_RETURN_TO_BALL_SEND_IN_GAP_FRAMES, 41],
  ["Baton Pass (opponent attacker)", 157, 226, 1, "off148-baton-pass-opp", 45, SCENE_OFF_BATON_PASS_RETURN_TO_BALL_PRINT_GAP_FRAMES, 40],
] as const;

describe("offs152 R0: Scene OFF forced switch-out", () => {
  it("ROM receipts: returntoball executes on G+44 (Roar) / G+43 (Baton Pass); the target vanishes 2 rows later", () => {
    const roar = romRows(romUse(rom148, "off148-roar-ply", 46));
    expect(roar.att).toBe(8);
    expect(roar.after.find((r) => r[0] === "BattleScript_SuccessForceOut+4")![1]).toBe(44);
    expect(roar.after.find((r) => r[5].length > 0)![5][0]).toBe(46);
    const baton = romRows(romUse(rom148, "off148-baton-pass-opp", 226));
    expect(baton.att).toBe(4);
    expect(baton.after.find((r) => r[0] === "BattleScript_EffectBatonPass+37")![1]).toBe(43);
    expect(baton.after.find((r) => r[5].length > 0)![5][0]).toBe(45);
    // SWITCHINMON's first glyph (the print executes on 48): removal + 5
    expect(baton.after.find((r) => r[0] === "BattleScript_EffectBatonPass+48")![5][0]).toBe(50);
    expect(SCENE_OFF_BATON_PASS_RETURN_TO_BALL_PRINT_GAP_FRAMES).toBe(50 - 45);
  });

  it.each(CASES.map((c) => [c[0], c] as const))("%s: pause, forced hold, removal on the ROM row", (_name, c) => {
    const [, seed, move, attacker, , removalRow, gap, frames] = c;
    const bodies = noHitBodies(battleUses(seed, "off"), move, attacker)
      .filter((u) => u.follow.some((r) => r[3]?.startsWith(move === 226 ? "BattleScript_EffectBatonPass:1706" : "BattleScript_SuccessForceOut:3328")));
    expect(bodies.length).toBeGreaterThan(0);
    for (const use of bodies) {
      const n = use.follow.find((r) => r[0] > use.attack![0] && !["set-battler-pp-data", "play-se"].includes(r[1]))!;
      expect(n[1]).toBe("set-battler-sprite-visibility");
      const pause = pauseOf(use);
      expect(pause.timing).toEqual({ minimumFrames: frames });
      const at = use.raw.findIndex((x: any) => x.eventSequence === n[0]);
      const [switchOut, recall] = [use.raw[at] as any, use.raw[at + 1] as any];
      expect(switchOut).toMatchObject({ type: "switch-out", battler: move === 226 ? attacker : 1 - attacker,
        timing: { minimumFrames: FORCED_RETURN_TO_BALL_HOLD_FRAMES }, skipAnimation: true, targetAtRest: true });
      expect(recall).toMatchObject({ type: "sprite-visibility", visible: false, recall: true, timing: { minimumFrames: gap } });
      // the recall receipt's first frame is the ROM removal row (counted from G + 1)
      expect(startOf(use, n[0]) + FORCED_RETURN_TO_BALL_HOLD_FRAMES).toBe(removalRow - 1);
    }
  });
});
