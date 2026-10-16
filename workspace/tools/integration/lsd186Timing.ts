// lsd186 (ISSUES #153 / #167 family; docs/lsd186-leech-seed-drain-timing.md): production command timeline of every Leech Seed turn-end drain on
// ordinary census battles (sub157Timing.ts's loop), both scenes. Per drain: each command's start frame, relative to the drain's general
// animation command, and its duration (the next command's start), with kind, animation id, HP from / to, message and timing fields.
// Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/lsd186Timing.ts --seeds=0..49 --scene=on|off
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";

type Row = { frame: number; key: string; type: string; moveId: number | null; battler: number | null; anim: string | null; from: number | null; to: number | null; msg: string | null; timing: unknown; maxHp: number | null };
const FRAME_BUDGET = 200000;
const arg = (name: string, fallback: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const range = arg("seeds", "0..49").match(/^(\d+)\.\.(\d+)$/);
const seeds = range ? Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, i) => Number(range[1]) + i) : arg("seeds", "").split(",").map(Number), scene = arg("scene", "off") as "on" | "off";

function battleFrames(seed: number, scene: "on" | "off"): Row[] {
  const out: Row[] = [];
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, rngValue: seed, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation as any;
    if (r) {
      const c = r.segments[r.segmentIndex]?.commands[r.commandIndex];
      out.push({ frame, key: `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`, type: c?.type ?? "end",
        moveId: c?.animation?.moveId ?? null, battler: c?.battler ?? null, anim: c?.animation?.animationId ?? null,
        from: c?.from ?? null, to: c?.to ?? null, msg: c?.messageId ?? (c?.lines ? JSON.stringify(c.lines) : null), timing: c?.timing ?? null,
        maxHp: c?.type === "hp" ? (r.displayedField?.battlers?.[c.battler]?.maxHP ?? null) : null });
    }
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
  return out;
}


for (const seed of seeds) {
  let rows: Row[];
  try { rows = battleFrames(seed, scene); } catch (error) { console.error(`seed ${seed}: ${(error as Error).message}`); continue; }
  const starts: Row[] = [];
  for (const r of rows) if (starts.length === 0 || starts[starts.length - 1]!.key !== r.key) starts.push(r);
  if (process.argv.includes("--debug")) console.log(seed, [...new Set(starts.filter((x) => x.type === "move-animation").map((x) => `${x.moveId}/${x.anim}`))].join(" "));
  starts.forEach((s, i) => {
    if (s.type !== "message" || !/SAPPED/i.test(s.msg ?? "")) return;
    const win = starts.slice(Math.max(0, i - 6), i + 3);
    const at0 = win[0]!.frame;
    console.log(JSON.stringify({ seed, scene, start: at0, commands: win.map((c, k) => ({ at: c.frame - at0, dur: (win[k + 1]?.frame ?? c.frame) - c.frame || null, type: c.type, battler: c.battler, anim: c.anim, from: c.from, to: c.to, msg: c.msg, timing: c.timing })) }));
  });
}
