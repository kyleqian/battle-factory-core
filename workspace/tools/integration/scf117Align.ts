// scf117 (S10A, ISSUES #166 rung 1; docs/scf117-stats-change-finish.md): on ordinary census battles (off108Route.ts's battle loop:
// battle i = seed i, streak i * 11 % 49, least-used legal slot), every presented `stats-change` command and the receipts after it:
// the STATS_CHANGE event's source label / instructionExecution, the next command's type / receipt label / delta, the stats-change
// command's minimumFrames / holdFrames, and (rel = rows after the ROM's gAnimScriptActive rise A, the command's age 0 = rel 1)
// the rel of the next command's start and of the first following message's start (its first glyph). Read-only; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/scf117Align.ts --seeds=A..B --scene=on|off --out=file.jsonl
import { writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";

const FRAME_BUDGET = 200000;
export type Scf117AlignRow = {
  seed: number; scene: "on" | "off"; battler: 0 | 1; argument: number; statsChangeLabel: string | null; move: number | null;
  minimumFrames: number; holdFrames: number; nextType: string | null; nextLabel: string | null; nextDelta: number | null;
  nextStart: number; firstMessage: number | null; firstMessageDelta: number | null; chain: unknown[];
};

const label = (e: any) => (e?.provenance ? `${e.provenance.sourceLabel}:${e.provenance.sourceStatementLine}` : null);
const duration = (c: any) => c.type === "stat" ? Math.max(c.timing.minimumFrames, 2) : (c.timing?.minimumFrames ?? 0) + (c.timing?.holdFrames ?? 0);
function scan(seed: number, scene: "on" | "off", segment: any, rows: Scf117AlignRow[]) {
  const ev = segment.events as any[];
  const cmds = segment.commands as any[];
  const bySeq = new Map(ev.map((e) => [e.sequence, e]));
  for (let k = 0; k < cmds.length; k++) {
    const sc = cmds[k];
    if (sc.type !== "stats-change") continue;
    const se = bySeq.get(sc.eventSequence);
    const d0 = se?.provenance?.instructionExecution ?? null;
    const next = cmds[k + 1] ?? null;
    const ne = next ? bySeq.get(next.eventSequence) : null;
    const nextStart = 1 + duration(sc);
    let rel = 1, firstMessage: number | null = null, firstMessageDelta: number | null = null;
    const chain: unknown[] = [];
    for (let j = k; j < cmds.length && j < k + 6; j++) {
      const c = cmds[j];
      if (j > k) {
        const e = bySeq.get(c.eventSequence);
        chain.push([c.type, c.stat ?? null, label(e), e?.provenance?.instructionExecution != null && d0 != null ? e.provenance.instructionExecution - d0 : null, rel]);
        if (c.type === "message") {
          firstMessage = rel;
          firstMessageDelta = e?.provenance?.instructionExecution != null && d0 != null ? e.provenance.instructionExecution - d0 : null;
          break;
        }
      }
      rel += duration(c);
    }
    rows.push({
      seed, scene, battler: sc.battler, argument: sc.argument, statsChangeLabel: label(se),
      move: se?.payload?.actionSnapshot?.currentMove ?? null,
      minimumFrames: sc.timing.minimumFrames, holdFrames: sc.timing.holdFrames ?? 0,
      nextType: next?.type ?? null, nextLabel: label(ne),
      nextDelta: ne?.provenance?.instructionExecution != null && d0 != null ? ne.provenance.instructionExecution - d0 : null,
      nextStart, firstMessage, firstMessageDelta, chain,
    });
  }
}

/** One ordinary census battle; every presented stats-change command in it. */
export function scf117AlignBattle(seed: number, scene: "on" | "off"): Scf117AlignRow[] {
  const streak = (seed * 11) % 49;
  const rows: Scf117AlignRow[] = [];
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: scene,
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const seen = new Set<unknown>();
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation as any;
    if (!r) return;
    for (const s of r.segments) if (!seen.has(s)) { seen.add(s); scan(seed, scene, s, rows); }
  };
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    observe();
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
  try {
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
  } catch { /* frame budget: the commands seen so far stay logged */ }
  return rows;
}

if (process.argv[1]?.endsWith("scf117Align.ts")) {
  const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
  const scene = arg("scene", "off") as "on" | "off", out = arg("out")!;
  const lines: string[] = [];
  for (let seed = fromSeed; seed <= toSeed; seed++) for (const row of scf117AlignBattle(seed, scene)) lines.push(JSON.stringify(row));
  writeFileSync(out, lines.join("\n") + "\n");
  console.log(`scf117Align ${scene} seeds ${fromSeed}..${toSeed}: ${lines.length} stats-change commands`);
}
