// off121 (S10A timeline fidelity; docs/off121-status-command.md): every PRODUCTION `status` command (a set-battler-status-data
// receipt) in ordinary census battles, with its source label, the receipts that follow it in the same interpreter execution (kind, id,
// sourceLabel:line, instructionExecution - the status receipt's) up to and including the first one that projects a command, and the
// projected status command's frames plus the next command. The battle loop is off108Route.ts's (liveShareCensus.ts's playBattle: same
// orchestrator config, inputs and least-used legal slot policy; battle i uses seed i and streak i * 11 % 49). Read-only; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/off121StatusCensus.ts --seeds=A..B --scene=on|off --out=file.jsonl
import { writeFileSync } from "node:fs";
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

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const scene = arg("scene", "off") as "on" | "off", out = arg("out")!;
const FRAME_BUDGET = 200000;
const lines: string[] = [];

const idOf = (p: any) => p.animationId ?? p.messageId ?? p.statusId ?? p.stat ?? "";
function statuses(seed: number, segment: any) {
  const ev = segment.events as any[];
  const cmds = segment.commands as any[];
  const commandSeqs = new Set(cmds.map((c) => c.eventSequence));
  for (let i = 0; i < ev.length; i++) {
    if (ev[i].payload.kind !== "set-battler-status-data") continue;
    const s = ev[i].provenance?.instructionExecution ?? null;
    const label = ev[i].provenance ? `${ev[i].provenance.sourceLabel}:${ev[i].provenance.sourceStatementLine}` : null;
    const follow: unknown[] = [];
    let exec = s;
    for (let j = i + 1; j < ev.length && follow.length < 8; j++) {
      const q = ev[j].payload, x = ev[j].provenance?.instructionExecution ?? null;
      const drop = exec !== null && x !== null && x < exec;
      exec = x;
      const pv = ev[j].provenance;
      follow.push([q.kind, String(idOf(q)), pv ? `${pv.sourceLabel}:${pv.sourceStatementLine}` : null, x === null || s === null ? null : x - s,
        commandSeqs.has(ev[j].sequence) ? 1 : 0, drop ? 1 : 0]);
      if (commandSeqs.has(ev[j].sequence) || drop) break;
    }
    const at = cmds.findIndex((c) => c.type === "status" && c.eventSequence === ev[i].sequence);
    const command = at < 0 ? null : [cmds[at].timing?.minimumFrames ?? null, cmds[at].timing?.holdFrames ?? null];
    const next = at < 0 || at + 1 >= cmds.length ? null : [cmds[at + 1].type, cmds[at + 1].timing?.minimumFrames ?? null, cmds[at + 1].timing?.holdFrames ?? null];
    lines.push(JSON.stringify({ seed, scene, battler: ev[i].payload.battler, status1: ev[i].payload.status1, label, s, command, next, follow }));
  }
}

function playBattle(seed: number, streak: number) {
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
    for (const s of r.segments) if (!seen.has(s)) { seen.add(s); statuses(seed, s); }
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
  } catch { /* frame budget: the uses seen so far stay logged */ }
}
for (let seed = fromSeed; seed <= toSeed; seed++) playBattle(seed, (seed * 11) % 49);
writeFileSync(out, lines.join("\n") + "\n");
console.log(`off121StatusCensus ${scene} seeds ${fromSeed}..${toSeed}: ${lines.length} status commands`);
