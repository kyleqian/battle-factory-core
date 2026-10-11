// stat101 (ISSUES #166 prep, docs/stat101-stats-change-design.md): census exposure of General_StatsChange BY VARIANT, from the PRODUCTION
// orchestrator's Scene ON resolution segments of ordinary census battles (idle98Exposure.ts's battle loop, unchanged: same orchestrator
// config, inputs and least-used legal slot policy; battle i uses seed i and streak i * 11 % 49). Per battle: every kernel
// `animation` event with animationId STATS_CHANGE (Cmd_playanimation B_ANIM_STATS_CHANGE / Cmd_playstatchangeanimation: one per ROM
// animation) with its animArg, battler, the segment field's species / substituteDoll / castformForm for that battler and the
// beforeRules STATUS2_SUBSTITUTE bit (the ROM skips the animation behind a Substitute), plus the `stat` command count and total frames.
// Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/stat101Exposure.ts --seeds=0..99 --out=file.jsonl
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

type Row = { frame: number; type: string; battler?: number };
type Anim = { arg: number; battler: number; species: number | null; doll: boolean; status2Sub: boolean; castform: number | null; statCommandsInSegment: number };
const STATUS2_SUBSTITUTE = 0x01000000;
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
      const statCommands = seg.commands.filter((c: any) => c.type === "stat").length;
      for (const e of seg.events as any[]) {
        const p = e.payload ?? e;
        if (p.kind !== "animation" || p.animationId !== "STATS_CHANGE") continue;
        const b = p.battler as number;
        const fb = b === 0 ? seg.field.player : seg.field.opponent;
        const s2 = seg.beforeRules?.battlers?.[b]?.status2 ?? 0;
        anims.push({ arg: Number(p.arguments[0]), battler: b, species: fb?.species ?? null, doll: Boolean(fb?.substituteDoll),
          status2Sub: (s2 & STATUS2_SUBSTITUTE) !== 0, castform: fb?.castformForm ?? null, statCommandsInSegment: statCommands });
      }
    }
    const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    if (k === key) return;
    key = k;
    const c = r.segments[r.segmentIndex]!.commands[r.commandIndex] as any;
    const row: Row = { frame, type: c?.type ?? "?" };
    if (c?.type === "stat") row.battler = c.battler;
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
  const statCommands = rows.filter((r) => r.type === "stat").length;
  return { seed, streak, frames: frame, end, statCommands, anims };
}
for (let seed = fromSeed; seed <= toSeed; seed++) lines.push(JSON.stringify(playBattle(seed, (seed * 11) % 49)));
writeFileSync(out, lines.join("\n") + "\n");
console.log(`seeds ${fromSeed}..${toSeed}: ${lines.length} battles`);
