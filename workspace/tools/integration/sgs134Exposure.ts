// sgs134 (S10A timeline fidelity, docs/sgs134-se-gate-other-requests.md): census exposure of the OTHER controller requests that carry the
// IsBattleSEPlaying gate (battle_controller_{player,opponent}.c HandleBattleAnimation / HandleMoveAnimation / HandleStatusIconUpdate):
// every kernel `animation` event (playanimation B_ANIM_* incl. STATS_CHANGE, attackanimation MOVE_ANIMATION) and `status-icon-update`
// event, with the compact events between the segment's last effectivenesssound (`play-se`) and the receipt. seg127Exposure.ts's battle
// loop unchanged (same orchestrator config, inputs, least-used legal slot policy; battle i uses seed i and streak i * 11 % 49); Scene ON.
// Read-only use of production. Classification / projection: sgs134ExposureSummary.py.
//   node --experimental-strip-types --no-warnings tools/integration/sgs134Exposure.ts --seeds=0..99 --out=file.jsonl
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
import { spriteOrderStatusAnimationName } from "../../src/engine/spriteOrderEventTransform.ts";
import type { GbaButton } from "../../src/input.ts";

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const out = arg("out")!;
const FRAME_BUDGET = 200000;
const lines: string[] = [];

const tok = (q: any): string => q.kind === "message" ? `msg:${q.messageId}` : q.kind === "play-se" ? `se:${q.songId}`
  : q.kind === "animation" ? (q.animationId === "MOVE_ANIMATION" ? `anim:MOVE_ANIMATION:${q.arguments[0]}:${q.battler}` : `anim:${q.animationId}:${q.arguments[0] ?? ""}:${q.battler}`)
  : q.kind === "health-bar-update" ? `hb:${q.battler}` : q.kind === "hp-change" ? `hp:${q.battler}:${q.from}:${q.to}`
  : q.kind === "status-animation" ? `sa:${spriteOrderStatusAnimationName(q.isStatus2 !== 0, q.status)}:${q.battler}`
  : q.kind === "status-icon-update" ? `icon:${q.battler}` : q.kind === "status-change" ? "st" : String(q.kind);
const SKIP = new Set(["set-battler-pp-data", "game-stat-increment"]);
type Receipt = { seg: string; i: number; tok: string; kind: string; battler: number | null; se: number | null; tail: string[] | null;
  move: string | null; attacker: number | null; nextMessage: string | null };
function playBattle(seed: number, streak: number) {
  const receipts: Receipt[] = [];
  let segKey = "";
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: "on",
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const sk = `${r.resolutionId.requestId}:${r.segmentIndex}`;
    if (sk === segKey) return;
    segKey = sk;
    const evs = (r.segments[r.segmentIndex]! as any).events.map((e: any) => e.payload ?? e) as any[];
    evs.forEach((p, i) => {
      if (p.kind !== "animation" && p.kind !== "status-icon-update") return;
      let s = -1;
      for (let j = i - 1; j >= 0; j--) if (evs[j].kind === "play-se") { s = j; break; }
      let mv = null, attacker = null;
      for (let j = i - 1; j >= 0; j--) if (evs[j].kind === "animation" && evs[j].animationId === "MOVE_ANIMATION") { mv = String(evs[j].arguments[0]); attacker = evs[j].battler; break; }
      let nxt = null;
      for (let j = i + 1; j < evs.length; j++) if (evs[j].kind === "message") { nxt = String(evs[j].messageId); break; }
      receipts.push({ seg: sk, i, tok: tok(p), kind: p.kind, battler: p.battler ?? null, se: s >= 0 ? evs[s].songId : null,
        tail: s >= 0 ? evs.slice(s + 1, i).filter((q) => !SKIP.has(q.kind)).map(tok) : null, move: mv, attacker, nextMessage: nxt });
    });
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
        pulse(selector.message !== null ? "A" : selector.cursor === "onix" && !selector.submenuOpen ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  let end = "terminal";
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
  } catch (e) { end = String(e).slice(0, 120); }
  // keep only receipts with an effectiveness SE earlier in their segment (the only shape the gate can be nonzero in)
  const byKind: Record<string, number> = {};
  for (const r of receipts) { const k = r.tok.split(":").slice(0, 2).join(":"); byKind[k] = (byKind[k] ?? 0) + 1; }
  return { seed, streak, frames: frame, end, receipts: receipts.length, byKind, open: receipts.filter((r) => r.se !== null) };
}
for (let seed = fromSeed; seed <= toSeed; seed++) lines.push(JSON.stringify(playBattle(seed, (seed * 11) % 49)));
writeFileSync(out, lines.join("\n") + "\n");
console.log(`seeds ${fromSeed}..${toSeed}: ${lines.length} battles`);
