// off148 (S10A timeline fidelity, ISSUES #167 remainder; docs/off148-scene-off-pauses-remainder.md): the Scene OFF no-hit pause for
// the next-receipt classes off108 left unmeasured, on PRODUCTION routes. ROM rows: direct mGBA Scene OFF probes, r1 == r2
// (tools/integration/fixtures/off148/receipts/rom-r1.json; Rest from off108's receipts/rom-r1.json). A stat-stage-change receipt next
// (Curse / Swagger / Flatter) is skipped and its 2-frame `stat` command subtracted: P = delta(N) + lead(N) - D_between - 2. Rest (a held
// print + the status icon before the attack receipt): P = delta(N) - delta(icon) + 1 + lead(N) (rst197: the icon command is the
// `updatestatusicon` row; the ROM's waitstate + goto then precede attackanimation). Each class is replayed on an example
// census battle (off108Route.ts's battle loop) and N's command start, counted from G + 1, must equal the ROM anchor.
import { censusDeal } from "../tools/integration/censusRound.ts";
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
import { battleStringPrintableLength } from "../src/engine/battleStringResolver";
import { PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect";
import type { GbaButton } from "../src/input";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../src/engine/battleCommandPresentation.ts";

type Row = [number, string, string, string | null, number | null];
type Command = [number, string, number | null, number | null, number];
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
      commands: raw.map((c) => [c.eventSequence, c.type, c.timing?.minimumFrames ?? null, c.timing?.holdFrames ?? null,
        c.type === "message" ? battleStringPrintableLength(c.lines) : 0]),
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
  return out;
}

type RomRun = [string, number, number, number, number, number[], number];
type RomUse = { mv: number; G: number; runs: RomRun[] };
const rom148 = JSON.parse(readFileSync("tools/integration/fixtures/off148/receipts/rom-r1.json", "utf8")) as {
  scenarios: Record<string, { off: RomUse[] }>;
};
const rom108 = JSON.parse(readFileSync("tools/integration/fixtures/off108/receipts/rom-r1.json", "utf8")) as {
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
  // rst197: a message presents max(minimumFrames, printable length) + hold (the print floor is gone: lsd194); the printable length is c[4].
  const frames = (c: Use["commands"][number]) => Math.max(c[2] ?? 0, c[4]) + (c[3] ?? 0);
  return (use.commands[0]![3] ?? 0) + use.commands.slice(1, at).reduce((sum, c) => sum + frames(c), 0);
}
const noHitBodies = (uses: Use[], move: number, attacker: number) =>
  uses.filter((u) => u.move === move && u.attacker === attacker && u.attack?.[2] === "SCENE_OFF_ATTACK_PAUSE" && !u.hit);
const pauseOf = (use: Use) =>
  use.raw.find((c: any) => c.eventSequence === use.attack![0] && c.type === "move-animation") as any;

// (class, example census seed, move, attacker side, N kind, ROM scenario, the ROM anchor of N's command, P)
// Rest's anchor is the ROM probe's (a 21-glyph print: waitmessage's run is L + 65 rows); another print shifts every later row by its L difference.
const REST_ROM_PRINT_L = romUse(rom108, "off108-rest-ply-snorlax-onix", 156).runs.find((r) => r[0] === "BattleScript_EffectRest+31")![2] - 65;
const restPrintL = (use: Use) => use.commands[2]![4];
const CASES = [
  ["Curse (player)", 7, 174, 0, "message", "off148-curse-ply", 44, 41],
  ["Curse (opponent)", 3, 174, 1, "message", "off148-curse-opp", 44, 41],
  ["Swagger (player)", 3, 207, 0, "STATS_CHANGE", "off148-swagger-ply", 44, 41],
  ["Flatter (player)", 27, 260, 0, "STATS_CHANGE", "off148-flatter-ply", 44, 41],
  ["Rest (player)", 12, 156, 0, "health-bar-update", "off108-rest-ply-snorlax-onix", 165, 40],
  ["Rest (opponent)", 3, 156, 1, "health-bar-update", "off108-rest-ply-snorlax-onix", 165, 40],
] as const;

describe("off148: Scene OFF no-hit pause remainder", () => {
  it("ROM receipts: Curse's print, Swagger / Flatter's STATS_CHANGE and Rest's HP bar rows (G-relative, Scene OFF)", () => {
    for (const side of ["ply", "opp"]) {
      const { att, after } = romRows(romUse(rom148, `off148-curse-${side}`, 174));
      expect(att).toBe(5);
      // the print executes on 42 (one row per instruction after waitanimation), its first glyph on 44
      expect(after.find((r) => r[6] > 0)![5][0]).toBe(44);
      expect(after.find((r) => r[6] > 0)![0]).toBe("BattleScript_CurseTrySpeed+35");
    }
    for (const scenario of ["off148-swagger-ply", "off148-flatter-ply"]) {
      const move = scenario.includes("swagger") ? 207 : 260;
      const { att, after } = romRows(romUse(rom148, scenario, move));
      expect(att).toBe(3);
      // A (the gAnimScriptActive rise) = 43: playanimation executes on 42; the stats-change command's age 0 is A + 1 = 44
      expect(after.find((r) => r[4] === 1)![1]).toBe(43);
    }
    const rest = romRows(romUse(rom108, "off108-rest-ply-snorlax-onix", 156));
    expect(rest.att).toBe(128);
    const hp = rest.after.find((r) => r[6] > 0)!;
    expect([hp[0], hp[1], hp[5][0]]).toEqual(["BattleScript_PresentHealTarget+13", 165, 166]);
  });

  it.each(CASES.map((c) => [c[0], c] as const))("%s: the pause lands N's command on the ROM anchor", (_name, c) => {
    const [, seed, move, attacker, kind, , anchor, frames] = c;
    const bodies = noHitBodies(battleUses(seed, "off"), move, attacker);
    expect(bodies.length).toBeGreaterThan(0);
    for (const use of bodies) {
      const n = use.follow.find((r) => r[0] > use.attack![0]
        && !["set-battler-pp-data", "play-se", "stat-stage-change"].includes(r[1]))!;
      expect(kind === "STATS_CHANGE" ? n[2] : n[1]).toBe(kind);
      const pause = pauseOf(use);
      expect(pause).toBeDefined();
      expect(pause.animation).toBeUndefined();
      expect(pause.timing).toEqual({ minimumFrames: frames });
      expect(startOf(use, n[0])).toBe(anchor - 1 + (kind === "health-bar-update" ? restPrintL(use) - REST_ROM_PRINT_L : 0));
    }
  });

  it("Rest: production's chain since the opener (status 38, held print L + 64, icon 1) meets the ROM attackanimation row 128 after waitstate + goto (3 rows)", () => {
    const rest = romRows(romUse(rom108, "off108-rest-ply-snorlax-onix", 156));
    const bodies = [...noHitBodies(battleUses(12, "off"), 156, 0), ...noHitBodies(battleUses(3, "off"), 156, 1)];
    expect(bodies.length).toBeGreaterThan(0);
    for (const use of bodies) {
      expect(use.commands.slice(1, 4).map((c) => [c[1], c[2], c[3]])).toEqual([
        ["status", 38, null], ["message", 0, 64], ["status-icon", 1, null],
      ]);
      const icon = use.follow.find((r) => r[1] === "status-icon-update")!;
      const att = use.attack!;
      // the chain ends on the ROM's updatestatusicon row (the print is L + 64 rows after printfromtable's row 38), and the kernel's
      // Δ(att) - Δ(icon) = 3 is the ROM's waitstate (2 rows) + goto before attackanimation
      expect(startOf(use, att[0])).toBe(38 + restPrintL(use) + 64 + 1);
      expect(att[4]! - icon[4]!).toBe(3);
      expect(startOf(use, att[0]) + (att[4]! - icon[4]!) + 1 - (restPrintL(use) - REST_ROM_PRINT_L)).toBe(rest.att);
    }
  });

  // offs152: Roar / Whirlwind / Baton Pass's `returntoball` receipt is now measured (tests/offs152SceneOffForcedSwitch.test.ts).
  it("unmeasured next receipts keep no pause: sprite-visibility next (Wish), a held print before the attack (Magnitude, a Magic Coat bounce)", () => {
    for (const [seed, move, attacker, heldPrint] of [[41, 273, 0, false], [286, 222, 1, true], [682, 184, 1, true]] as const) {
      const bodies = noHitBodies(battleUses(seed, "off"), move, attacker)
        .filter((u) => !heldPrint || u.follow.some((r) => r[1] === "message" && r[0] < u.attack![0]));
      expect(bodies.length).toBeGreaterThan(0);
      for (const use of bodies) expect(pauseOf(use)).toBeUndefined();
    }
  });

  it("Scene ON: the same bodies keep their live / fallback move-animation command (no OFF pause)", () => {
    for (const [seed, move, attacker] of [[3, 174, 1], [3, 207, 0], [3, 156, 1], [27, 260, 0]] as const) {
      const bodies = battleUses(seed, "on").filter((u) => u.move === move && u.attacker === attacker && u.attack !== null);
      expect(bodies.length).toBeGreaterThan(0);
      for (const use of bodies) {
        expect(use.attack![2]).toBe("MOVE_ANIMATION");
        const command = use.raw.find((c: any) => c.eventSequence === use.attack![0] && c.type === "move-animation") as any;
        expect(command === undefined || command.animation !== undefined || command.timing.minimumFrames !== (move === 156 ? 37 : 41))
          .toBe(true);
      }
    }
  });
});
