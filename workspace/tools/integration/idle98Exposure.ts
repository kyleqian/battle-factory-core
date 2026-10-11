// idle98 (S10A timing fidelity): census exposure of the two flagged timeline gaps, from the PRODUCTION orchestrator's Scene ON command
// timeline of ordinary census battles (the liveShareCensus.ts / idle94Route.ts battle loop: same orchestrator config, inputs and
// least-used legal slot policy; battle i uses seed i and streak i * 11 % 49, as liveShareCensus --seeds=0..999 --index-from). Per battle:
// every `stat` command (battler, stat, from, to: one per kernel stat-stage-change event), the `stat` GROUPS (consecutive stat commands
// with only their messages between them = one ROM playstatchangeanimation / playanimation B_ANIM_STATS_CHANGE at most), and every
// move-animation command with its next command type (no hit-animation next = a no-hit body: Scene OFF presents nothing for its
// attackanimation -> BattleScript_Pausex20 -> waitanimation span). Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/idle98Exposure.ts --seeds=0..99 --out=file.jsonl
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
const out = arg("out")!;
const FRAME_BUDGET = 200000;
const lines: string[] = [];

type Row = { frame: number; type: string; moveId?: number; attacker?: number; battler?: number; stat?: unknown; from?: number; to?: number };
function playBattle(seed: number, streak: number) {
  const rows: Row[] = [];
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
    const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    if (k === key) return;
    key = k;
    const c = r.segments[r.segmentIndex]!.commands[r.commandIndex] as any;
    const row: Row = { frame, type: c?.type ?? "?" };
    if (c?.type === "move-animation") { row.moveId = c.animation?.moveId ?? -1; row.attacker = c.animation?.attacker ?? c.battler; }
    if (c?.type === "stat") { row.battler = c.battler; row.stat = c.stat; row.from = c.from; row.to = c.to; }
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
  const stats = rows.filter((r) => r.type === "stat").map((r) => ({ battler: r.battler, stat: r.stat, from: r.from, to: r.to }));
  let groups = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]!.type !== "stat") continue;
    let j = i - 1;
    while (j >= 0 && rows[j]!.type === "message") j--;
    if (j < 0 || rows[j]!.type !== "stat") groups++;
  }
  const bodies = rows.flatMap((r, i) => r.type === "move-animation"
    ? [{ moveId: r.moveId, attacker: r.attacker, next: rows[i + 1]?.type ?? null }] : []);
  return { seed, streak, frames: frame, end, stats, statGroups: groups, bodies };
}
for (let seed = fromSeed; seed <= toSeed; seed++) lines.push(JSON.stringify(playBattle(seed, (seed * 11) % 49)));
writeFileSync(out, lines.join("\n") + "\n");
console.log(`seeds ${fromSeed}..${toSeed}: ${lines.length} battles`);
