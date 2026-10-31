// sgs134 (docs/sgs134-se-gate-other-requests.md): PRODUCTION's command timeline around the gated requests. sgs134Exposure.ts's battle loop
// unchanged (seed i, streak i * 11 % 49, least-used legal slot), --scene=on|off; per resolution segment that carries a stats-change,
// status-animation or 2+ move-animation commands: every command's start frame, type, battler, timing and move, plus the segment's
// kernel hp-change drains (in event order). Read-only use of production; analysed by sgs134ProductionSummary.py.
//   node --experimental-strip-types --no-warnings tools/integration/sgs134Production.ts --seeds=0..99 --scene=on --out=file.jsonl [--all]
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
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
const scene = arg("scene", "on") as "on" | "off";
const all = process.argv.includes("--all");
const FRAME_BUDGET = 200000;
const lines: string[] = [];

const tok = (q: any): string => q.kind === "message" ? `msg:${q.messageId}` : q.kind === "play-se" ? `se:${q.songId}`
  : q.kind === "animation" ? (q.animationId === "MOVE_ANIMATION" ? `anim:MOVE_ANIMATION:${q.arguments[0]}:${q.battler}` : `anim:${q.animationId}:${q.arguments[0] ?? ""}:${q.battler}`)
  : q.kind === "health-bar-update" ? `hb:${q.battler}` : q.kind === "hp-change" ? `hp:${q.battler}:${q.from}:${q.to}`
  : q.kind === "status-animation" ? `sa:${spriteOrderStatusAnimationName(q.isStatus2 !== 0, q.status)}:${q.battler}`
  : q.kind === "status-icon-update" ? `icon:${q.battler}` : q.kind === "status-change" ? "st" : String(q.kind);
const SKIP = new Set(["set-battler-pp-data", "game-stat-increment"]);
function playBattle(seed: number, streak: number) {
  let segKey = "";
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: scene,
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  type Cmd = { f: number; t: string; b?: number; mf?: number; hold?: number; sg?: number; mv?: number; anim?: string };
  const segs: { seg: string; drains: number[]; events: string[]; cmds: Cmd[] }[] = [];
  let cur: { seg: string; drains: number[]; events: string[]; cmds: Cmd[] } | null = null;
  let key = "";
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const sk = `${r.resolutionId.requestId}:${r.segmentIndex}`;
    if (sk !== segKey) {
      segKey = sk;
      const evs = (r.segments[r.segmentIndex]! as any).events.map((e: any) => e.payload ?? e) as any[];
      cur = { seg: sk, drains: evs.filter((p) => p.kind === "hp-change").map((p) => Math.abs(p.from - p.to)),
        events: evs.filter((p) => !SKIP.has(p.kind)).map(tok), cmds: [] };
      segs.push(cur);
    }
    const k = `${sk}:${r.commandIndex}`;
    if (k === key) return;
    key = k;
    const c = r.segments[r.segmentIndex]!.commands[r.commandIndex] as any;
    if (!c) return;
    const cmd: Cmd = { f: frame, t: c.type };
    if (typeof c.battler === "number") cmd.b = c.battler;
    if (c.timing?.minimumFrames !== undefined) cmd.mf = c.timing.minimumFrames;
    if (c.timing?.holdFrames !== undefined) cmd.hold = c.timing.holdFrames;
    if (c.timing?.seGateFrames !== undefined) cmd.sg = c.timing.seGateFrames;
    if (c.move !== undefined) cmd.mv = typeof c.move === "number" ? c.move : c.move?.id;
    if (c.moveId !== undefined) cmd.mv = c.moveId;
    if (c.animation !== undefined) cmd.anim = String(c.animation);
    cur!.cmds.push(cmd);
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
  // --all: every segment's commands (the census delta); events only where a gated request can be (the summary's pairing) + a digest of
  // every segment's kernel events (gameplay: identical in both trees).
  const kept = (g: (typeof segs)[number]) => g.cmds.some((c) => c.t === "stats-change" || c.t === "status-animation")
    || g.cmds.filter((c) => c.t === "move-animation").length >= 2;
  const eventsDigest = createHash("sha256").update(segs.map((g) => `${g.seg}|${g.events.join(",")}`).join("\n")).digest("hex");
  const segments = all ? segs.map((g) => (kept(g) ? g : { seg: g.seg, drains: g.drains, events: [], cmds: g.cmds })) : segs.filter(kept);
  return { seed, streak, scene, frames: frame, end, eventsDigest, segments };
}
for (let seed = fromSeed; seed <= toSeed; seed++) lines.push(JSON.stringify(playBattle(seed, (seed * 11) % 49)));
writeFileSync(out, lines.join("\n") + "\n");
console.log(`seeds ${fromSeed}..${toSeed}: ${lines.length} battles`);
