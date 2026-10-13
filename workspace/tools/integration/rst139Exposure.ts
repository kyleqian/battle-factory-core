// rst139 (S10A presentation fidelity, docs/rst139-ordinary-row-rest.md): census exposure of the ordinary-row idle rest. Every presented
// Scene ON row after the battle-start intro is classified (body = a move / substitute-fade / stats-change / status-animation render
// effect; faint; switch = a switch-in / switch-out / party-summary / trainer-slide command or a send-out view; ordinary = every other
// resolution row (message / HP / status / stat / hit ...); menu = the command UI rows between resolutions) together with the
// orchestrator's tracked x2 state of each side (liveBattlerX2History.ts: idle / zeroed / unknown; `none` = no host of this battle) and
// the displayed species' front idle rest (speciesFrontIdleRestOffsetOrZero; player back sprites have none in production). sgs134's
// battle loop unchanged (battle i: seed i, streak i * 11 % 49, least-used legal slot). Read-only use of production.
//   node --experimental-strip-types --no-warnings tools/integration/rst139Exposure.ts --seeds=0..99 --out=file.jsonl
import { writeFileSync } from "node:fs";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution, type FactoryRoundBattleOrchestratorState,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { liveMoveRandom2PlanContextAt, createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
import speciesNames from "../../src/data/gen/species-names.json" with { type: "json" };
import type { GbaButton } from "../../src/input.ts";

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const out = arg("out")!;
const FRAME_BUDGET = 200000;
const lines: string[] = [];
const symbolByName = new Map<string, string>(
  (speciesNames as any).species.map((s: any) => [String(s.name), String(s.species).replace(/^SPECIES_/, "")]));
const BODY = new Set(["move", "substitute-fade", "stats-change", "status-animation"]);
const SWITCH = new Set(["switch-in", "switch-out", "party-summary", "trainer-slide"]);

type Row = { cls: string; cmd: string; opp: string; oppRest: number; oppState: string; oppVisible: boolean; oppDoll: boolean;
  player: string; playerState: string };
function rowOf(state: FactoryRoundBattleOrchestratorState): Row | null {
  if (state.battleStartIntro) return null;
  const x2 = state.liveBattlerX2Host;
  const history = x2 !== undefined && x2.battleCallStart === state.activeBattleCallStart ? x2.host.history : null;
  const r = state.battleResolutionPresentation;
  if (r) {
    const phase = r.lifecycle.phase;
    const command = (r.segments[r.segmentIndex] as any)?.commands[r.commandIndex] ?? null;
    const view = createBattleResolutionPresentationRenderView(r);
    const effect = view.effect?.type ?? null;
    const cls = phase !== "presenting" && phase !== "awaiting-message-dismiss" ? `resolution-${phase}`
      : effect !== null && BODY.has(effect) ? "body" : effect === "faint" ? "faint"
      : (command && SWITCH.has(command.type)) || view.midBattleSwitchIn || view.switchOut || view.switchIn ? "switch" : "ordinary";
    const opp = view.fieldArt.opponent.speciesSymbol;
    return { cls, cmd: String(command?.type ?? "none"), opp, oppRest: speciesFrontIdleRestOffsetOrZero(opp).x2 | (speciesFrontIdleRestOffsetOrZero(opp).y2 << 8),
      oppState: history?.opponent ?? "none", oppVisible: view.visibility.opponent.sprite, oppDoll: view.field.opponent.substituteDoll === true,
      player: view.fieldArt.player.speciesSymbol, playerState: history?.player ?? "none" };
  }
  const menu = state.battleCommandPresentation;
  if (menu) {
    const opp = symbolByName.get(menu.field.opponent.name) ?? `?${menu.field.opponent.name}`;
    const rest = speciesFrontIdleRestOffsetOrZero(opp);
    return { cls: `menu-${menu.lifecycle.phase}`, cmd: "menu", opp, oppRest: rest.x2 | (rest.y2 << 8), oppState: history?.opponent ?? "none",
      oppVisible: menu.spriteVisibility.opponent, oppDoll: (menu.field.opponent as any).substituteDoll === true,
      player: symbolByName.get(menu.field.player.name) ?? `?${menu.field.player.name}`, playerState: history?.player ?? "none" };
  }
  return null;
}

function playBattle(seed: number, streak: number) {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: "on",
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const slotUses = [0, 0, 0, 0];
  const counts: Record<string, number> = {};
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const row = rowOf(state);
    if (row === null) return;
    const k = [row.cls, row.cmd, row.opp, row.oppRest, row.oppState, row.oppVisible ? "v" : "h", row.oppDoll ? "doll" : "-",
      row.player, row.playerState].join("|");
    counts[k] = (counts[k] ?? 0) + 1;
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
  return { seed, streak, frames: frame, end, counts };
}
for (let seed = fromSeed; seed <= toSeed; seed++) lines.push(JSON.stringify(playBattle(seed, (seed * 11) % 49)));
writeFileSync(out, lines.join("\n") + "\n");
console.log(`seeds ${fromSeed}..${toSeed}: ${lines.length} battles`);
