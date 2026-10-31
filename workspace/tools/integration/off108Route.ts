// off108 (S10A timeline fidelity, ISSUES #167; docs/off108-scene-off-pauses.md): the PRODUCTION kernel provenance of every move use in
// ordinary census battles (also the EMPTYSTRING3 print that opens a two-turn move's charge turn). The battle loop is idle94Route.ts's (liveShareCensus.ts's playBattle: same orchestrator config, inputs and
// least-used legal slot policy; battle i uses seed i and streak i * 11 % 49). For every resolution segment, each STRINGID_USEDMOVE receipt
// starts a "use": its move / attacker, its instructionExecution (u), the attack receipt (SCENE_OFF_ATTACK_PAUSE in Scene OFF,
// MOVE_ANIMATION in Scene ON) and whether a HIT_ANIMATION follows it in the same execution, then the following receipts of the same
// execution (kind, id, sourceLabel:line, instructionExecution - u) up to the next USEDMOVE, and the projected commands of those receipts
// (type, timing minimumFrames / holdFrames). Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/off108Route.ts --seeds=A..B --scene=on|off --out=file.jsonl [--moves=1,2]
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
const moves = arg("moves") ? new Set(arg("moves")!.split(",").map(Number)) : null;
const FRAME_BUDGET = 200000;
const lines: string[] = [];

const idOf = (p: any) => p.animationId ?? p.messageId ?? p.statusId ?? p.stat ?? "";
function uses(seed: number, segment: any) {
  const ev = segment.events as any[];
  const cmds = segment.commands as any[];
  for (let i = 0; i < ev.length; i++) {
    const p = ev[i].payload;
    if (p.kind !== "message" || (p.messageId !== "STRINGID_USEDMOVE" && p.messageId !== "STRINGID_EMPTYSTRING3")) continue;
    const u = ev[i].provenance?.instructionExecution ?? null;
    const move = p.actionSnapshot?.currentMove ?? null, attacker = p.actionSnapshot?.attacker ?? null;
    if (moves && !moves.has(move)) continue;
    const follow: unknown[] = [];
    let exec = u, attack: unknown = null, hit = false;
    for (let j = i + 1; j < ev.length; j++) {
      const q = ev[j].payload, x = ev[j].provenance?.instructionExecution ?? null;
      if (q.kind === "message" && (q.messageId === "STRINGID_USEDMOVE" || q.messageId === "STRINGID_EMPTYSTRING3")) break;
      if (exec !== null && x !== null && x < exec) break;
      exec = x;
      const pv = ev[j].provenance;
      const row = [ev[j].sequence, q.kind, String(idOf(q)), pv ? `${pv.sourceLabel}:${pv.sourceStatementLine}` : null, x === null || u === null ? null : x - u];
      if (q.kind === "animation" && (q.animationId === "SCENE_OFF_ATTACK_PAUSE" || q.animationId === "MOVE_ANIMATION") && attack === null) attack = row;
      else if (q.kind === "animation" && q.animationId === "HIT_ANIMATION" && attack !== null) hit = true;
      follow.push(row);
      if (follow.length >= 14) break;
    }
    const seqs = new Set(follow.map((r: any) => r[0]));
    const commands = cmds.filter((c) => seqs.has(c.eventSequence) || c.eventSequence === ev[i].sequence)
      .map((c) => [c.eventSequence, c.type, c.timing?.minimumFrames ?? null, c.timing?.holdFrames ?? null]);
    lines.push(JSON.stringify({ seed, scene, move, attacker, u, opener: p.messageId, label: ev[i].provenance ? `${ev[i].provenance.sourceLabel}:${ev[i].provenance.sourceStatementLine}` : null,
      attack, hit, follow, commands }));
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
    for (const s of r.segments) if (!seen.has(s)) { seen.add(s); uses(seed, s); }
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
console.log(`off108Route ${scene} seeds ${fromSeed}..${toSeed}: ${lines.length} uses`);
