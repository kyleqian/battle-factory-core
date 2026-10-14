// olnd113 (S10A timeline fidelity, ISSUES #167 land; docs/olnd113-scene-off-pauses-live.md): the off108 Scene OFF no-hit pause and
// the source-pause used-move hold on PRODUCTION routes. Every class row of off108's table (tools/integration/fixtures/off108/table/
// classes.json, anchored on direct mGBA ROM receipts r1 == r2) is replayed on its example census battle (off108Route.ts's battle loop:
// same orchestrator config, inputs and least-used legal slot policy) and production's start of the next presented receipt's command,
// counted from G + 1 (the opener command's end), must equal the ROM anchor: P = delta(N) + lead(N) - D_between, with the landed
// lead(STATS_CHANGE) = 1 (the sc106 stats-change command's age 0 is stat101 rel 1, docs/stat102-stats-change-reducer.md frame mapping).
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

type Row = [number, string, string, string | null, number | null];
type Command = [number, string, number | null, number | null];
type Use = {
  seed: number; move: number; attacker: number; u: number; opener: string;
  attack: Row | null; hit: boolean; follow: Row[]; commands: Command[]; raw: unknown[];
};
type ClassRow = {
  class: string; move: number;
  prod: null | { N: [string, string, string, number]; att: number | null; lead: number; exampleSeed: number };
  rule: null | { P: number; romAnchor: number };
};

const CLASSES = (JSON.parse(readFileSync("tools/integration/fixtures/off108/table/classes.json", "utf8")) as { rows: ClassRow[] }).rows;
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

/** off108Verify.py start_of_n: N's command start, frames after G + 1 (opener holdFrames + every command before N's). */
function startOfN(use: Use, nLabel: string, nDelta: number, attDelta: number | null): number | null {
  if ((use.attack === null) !== (attDelta === null) || (use.attack !== null && use.attack[4] !== attDelta)) return null;
  const n = use.follow.find((r) => r[3] === nLabel && r[4] === nDelta);
  if (!n || use.commands.length === 0) return null;
  const at = use.commands.findIndex((c, i) => i > 0 && c[0] >= n[0]);
  if (at < 0) return null;
  return (use.commands[0]![3] ?? 0) + chargeBoxFrames(use) + use.commands.slice(1, at).reduce((sum, c) => sum + (c[2] ?? 0) + (c[3] ?? 0), 0);
}
/** chg161: a USEDMOVE opener ends on G; the charge-turn empty box (EMPTYSTRING3) starts on G + 1, so its own row counts. */
const chargeBoxFrames = (use: Use) => (use.opener === "STRINGID_EMPTYSTRING3" ? use.commands[0]![2] ?? 0 : 0);

/** off108Verify.py's selection: the class move, or (Protect-blocked Tackle) any move whose attack the target's Protect blocked. */
const matching = (row: ClassRow, uses: Use[]) =>
  uses.filter((u) => (u.move === row.move || (row.move === 33 && u.attack === null))
    && startOfN(u, row.prod!.N[2], row.prod!.N[3], row.prod!.att) !== null);
/** The landed anchor: off108's romAnchor encodes lead(STATS_CHANGE) = 0; the stats-change command starts one row later. */
const anchorOf = (row: ClassRow) => row.rule!.romAnchor + (row.prod!.N[1] === "STATS_CHANGE" ? 1 : 0);
const NO_HIT = CLASSES.filter((r) => r.prod && r.rule && r.prod.att !== null);
const HOLDS = CLASSES.filter((r) => r.prod && r.rule && r.prod.att === null);

describe("olnd113: Scene OFF no-hit pause, per class on production routes", () => {
  it("the table has the 11 measurable no-hit body classes and 5 hold classes off108 anchored (Rest open)", () => {
    expect(NO_HIT.map((r) => r.class)).toHaveLength(11);
    expect(HOLDS.map((r) => r.class)).toEqual([
      "failed (Snore awake: But it failed!)", "miss (Dynamic Punch, player)", "miss (Dynamic Punch, opponent)",
      "protect-blocked (Tackle vs Protect)", "protect-blocked (Tackle vs Detect)",
    ]);
    expect(CLASSES.find((r) => r.class === "rest (Rest)")!.rule ?? null).toBeNull();
  });

  it.each(NO_HIT.map((r) => [r.class, r] as const))("%s: N's command starts on the ROM anchor (0-frame residual)", (_name, row) => {
    const uses = matching(row, battleUses(row.prod!.exampleSeed, "off"));
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) {
      expect(startOfN(use, row.prod!.N[2], row.prod!.N[3], row.prod!.att)).toBe(anchorOf(row));
      // the pause command: a plain `move-animation` (no live animation) at the attack receipt, P = anchor - D_between
      const pause = use.raw.find((c: any) => c.eventSequence === use.attack![0]) as any;
      expect(pause).toMatchObject({ type: "move-animation" });
      expect(pause.animation).toBeUndefined();
      expect(pause.timing.minimumFrames).toBe(row.rule!.P + (row.prod!.N[1] === "STATS_CHANGE" ? 1 : 0) - chargeBoxFrames(use));
    }
  });

  it("joint target: pause + stats-change command put the first stat message's first glyph on the ROM row (scf117: 0 residual)", () => {
    // ROM (off108 receipts/rom-r1.json, Scene OFF): first stat message's first glyph G+121 (Bulk Up) / G+119 (Double Team, Sand-Attack).
    // olnd113 measured -2 / -1 / -1, all of it AFTER the stats-change command (the print executes on rel 77 and its glyph lands on
    // rel 78; Bulk Up also runs setstatchanger before its stat write). scf117 (docs/scf117-stats-change-finish.md) holds the
    // stats-change command for delta(next) - delta(STATS_CHANGE) - 1 + lead(next) more rows: 0 / 0 / 0. The stats-change command
    // itself starts on rel 1 (A + 1) on every route: the pause is exact.
    const firstMessage = (use: Use) => {
      const at = use.commands.findIndex((c, i) => i > 0 && c[1] === "message");
      return 1 + (use.commands[0]![3] ?? 0) + use.commands.slice(1, at).reduce((s, c) => s + (c[2] ?? 0) + (c[3] ?? 0), 0);
    };
    const statsChangeStart = (use: Use) => {
      const at = use.commands.findIndex((c) => c[1] === "stats-change");
      return 1 + (use.commands[0]![3] ?? 0) + use.commands.slice(1, at).reduce((s, c) => s + (c[2] ?? 0) + (c[3] ?? 0), 0);
    };
    const cases = [
      { move: 339, seed: 154, romGlyph: 121, romA: 40, message: 121 },
      { move: 104, seed: 2, romGlyph: 119, romA: 41, message: 119 },
      { move: 28, seed: 2, romGlyph: 119, romA: 41, message: 119 },
    ];
    for (const c of cases) {
      const uses = battleUses(c.seed, "off").filter((u) => u.move === c.move && u.attack !== null && !u.hit
        && u.commands.some((x) => x[1] === "stats-change"));
      expect(uses.length).toBeGreaterThan(0);
      for (const use of uses) {
        expect(statsChangeStart(use)).toBe(c.romA + 1);
        expect(firstMessage(use)).toBe(c.message);
        expect(firstMessage(use) - c.romGlyph).toBe(0);
      }
    }
  });

  it("sc106's live-Double-Team exemption stays Scene-ON-only: the OFF pause command does not suppress the OFF stats-change command", () => {
    const off = battleUses(2, "off").filter((u) => u.move === 104 && u.attack !== null);
    expect(off.length).toBeGreaterThan(0);
    for (const use of off) {
      const types = use.raw.map((c: any) => c.type);
      const pause = types.indexOf("move-animation");
      expect(pause).toBeGreaterThan(0);
      expect(types[pause + 1]).toBe("stats-change");
      expect((use.raw[pause] as any).animation).toBeUndefined();
    }
    // Scene ON keeps the exemption: a live Double Team body presents no stats-change command after it.
    const on = battleUses(2, "on").filter((u) => u.move === 104 && u.attack !== null);
    expect(on.length).toBeGreaterThan(0);
    for (const use of on) {
      const body = use.raw.find((c: any) => c.type === "move-animation") as any;
      expect(body.animation?.moveId).toBe(104);
      expect(use.raw.some((c: any) => c.type === "stats-change")).toBe(false);
    }
  });
});

describe("olnd113: the miss / fail / Protect-blocked used-move hold, BOTH scenes", () => {
  it.each(HOLDS.flatMap((r) => (["off", "on"] as const).map((scene) => [r.class, scene, r] as const)))(
    "%s (%s): the used-move message holds delta(print) + 1 and the print's first glyph lands on the ROM row",
    (_name, scene, row) => {
      const uses = matching(row, battleUses(row.prod!.exampleSeed, scene));
      expect(uses.length).toBeGreaterThan(0);
      for (const use of uses) {
        expect(use.commands[0]).toEqual([use.commands[0]![0], "message", 0, row.rule!.P]); // msg175: the used print lasts L (no 24 floor)
        expect(startOfN(use, row.prod!.N[2], row.prod!.N[3], null)).toBe(row.rule!.romAnchor);
      }
    },
  );

  it.each([[0, 56], [1, 7]] as const)("a miss on each side: Dynamic Punch missed by battler %i (census seed %i), both scenes", (side, seed) => {
    const row = CLASSES.find((r) => r.class === "miss (Dynamic Punch, player)")!;
    for (const scene of ["off", "on"] as const) {
      const uses = matching(row, battleUses(seed, scene)).filter((u) => u.attacker === side);
      expect(uses.length).toBeGreaterThan(0);
      for (const use of uses) {
        expect(use.commands[0]).toEqual([use.commands[0]![0], "message", 0, 36]); // msg175
        expect(startOfN(use, row.prod!.N[2], row.prod!.N[3], null)).toBe(row.rule!.romAnchor);
      }
    }
  });
});

describe("olnd113: Scene ON no-hit bodies are unchanged", () => {
  it("no ON no-hit body gains a pause command: the commands at its MOVE_ANIMATION receipt are its live / fallback body only", () => {
    for (const seed of [0, 7]) {
      const uses = battleUses(seed, "on").filter((u) => u.attack !== null && !u.hit && u.attack[2] === "MOVE_ANIMATION");
      expect(uses.length).toBeGreaterThan(0);
      for (const use of uses) {
        const atAttack = use.raw.filter((c: any) => c.eventSequence === use.attack![0]) as any[];
        expect(atAttack.every((c) => c.type !== "move-animation" || c.animation !== undefined)).toBe(true);
      }
    }
  });
});
