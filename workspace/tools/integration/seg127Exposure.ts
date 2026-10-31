// seg127 (S10A / ISSUES #168 SA2 prep, docs/seg127-status-se-gate.md): census exposure of the Scene ON status animations BY WHAT
// PRECEDES THEM in the same resolution segment (the IsBattleSEPlaying gate's input): sta123Exposure.ts's battle loop unchanged (same
// orchestrator config, inputs, least-used legal slot policy; battle i uses seed i and streak i * 11 % 49), plus per receipt the compact
// event context from the segment start to the receipt (`ctx`: msg:<id> / se:<songId> / anim:<animationId> / hb / hp / sa:<B_ANIM> /
// st / other kinds) and the message right after it. Classification is done by seg127ExposureSummary.py. Read-only use of production.
//   node --experimental-strip-types --no-warnings tools/integration/seg127Exposure.ts --seeds=0..99 --out=file.jsonl
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

type Row = { frame: number; type: string; battler?: number };
type Anim = { anim: string | null; isStatus2: number; status: number; battler: number; prevMessage: string | null; nextMessage: string | null; statusCommandsInSegment: number; ctx: string[]; seg: string };
function playBattle(seed: number, streak: number) {
  const rows: Row[] = [];
  const anims: Anim[] = [];
  let segKey = "";
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: "on",
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false, key = "";
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const sk = `${r.resolutionId.requestId}:${r.segmentIndex}`;
    if (sk !== segKey) {
      segKey = sk;
      const seg = r.segments[r.segmentIndex]! as any;
      const statusCommands = seg.commands.filter((c: any) => c.type === "status").length;
      const evs = seg.events as any[];
      evs.forEach((e, i) => {
        const p = e.payload ?? e;
        if (p.kind !== "status-animation") return;
        const msg = (j: number, d: number) => { for (; j >= 0 && j < evs.length; j += d) { const q = evs[j].payload ?? evs[j]; if (q.kind === "message") return String(q.messageId); } return null; };
        const tok = (q: any): string => q.kind === "message" ? `msg:${q.messageId}` : q.kind === "play-se" ? `se:${q.songId}`
          : q.kind === "animation" ? (q.animationId === "MOVE_ANIMATION" ? `anim:MOVE_ANIMATION:${q.arguments[0]}:${q.battler}` : `anim:${q.animationId}`) : q.kind === "health-bar-update" ? `hb:${q.battler}` : q.kind === "hp-change" ? `hp:${q.battler}:${q.from}:${q.to}`
          : q.kind === "status-animation" ? `sa:${spriteOrderStatusAnimationName(q.isStatus2 !== 0, q.status)}:${q.battler}` : q.kind === "status-change" ? "st" : String(q.kind);
        const ctx = evs.slice(0, i).map((q) => tok(q.payload ?? q)).filter((t) => !["set-battler-pp-data", "game-stat-increment"].includes(t));
        anims.push({ anim: spriteOrderStatusAnimationName(p.isStatus2 !== 0, p.status), isStatus2: p.isStatus2, status: p.status,
          battler: p.battler as number, prevMessage: msg(i - 1, -1), nextMessage: msg(i + 1, 1), statusCommandsInSegment: statusCommands,
          ctx, seg: sk });
      });
    }
    const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    if (k === key) return;
    key = k;
    const c = r.segments[r.segmentIndex]!.commands[r.commandIndex] as any;
    const row: Row = { frame, type: c?.type ?? "?" };
    if (c?.type === "status") row.battler = c.battler;
    rows.push(row);
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
  const statusCommands = rows.filter((r) => r.type === "status").length;
  return { seed, streak, frames: frame, end, statusCommands, anims };
}
for (let seed = fromSeed; seed <= toSeed; seed++) lines.push(JSON.stringify(playBattle(seed, (seed * 11) % 49)));
writeFileSync(out, lines.join("\n") + "\n");
console.log(`seeds ${fromSeed}..${toSeed}: ${lines.length} battles`);
