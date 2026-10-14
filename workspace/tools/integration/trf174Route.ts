// trf174 (docs/trf174-transform-live.md): sub157Timing.ts's ordinary census route (production only, no oracle). For every Transform (144)
// move-animation command: its frames, the rendered effect age on its first / last frame (body age 0 = ROM activation row), the frames to the
// next message command, and the transformed field afterwards: every later rendered resolution / command-menu view's `transform` on the
// attacker until it leaves the field (switch-in / faint), counted per view kind.
//   node --experimental-strip-types --no-warnings tools/integration/trf174Route.ts --seeds=197 --scene=on|off
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";

type Row = { frame: number; key: string; type: string; moveId: number | null; battler: number | null; age: number | null;
  glyphs: number | null; transform: [number | null, number | null]; menuTransform: [number | null, number | null] | null; species: [number, number] };
const FRAME_BUDGET = 200000;
const arg = (name: string, fallback: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const seeds = arg("seeds", "17,74").split(",").map(Number), scene = arg("scene", "off") as "on" | "off";

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
      const view = createBattleResolutionPresentationRenderView(r);
      out.push({ frame, key: `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`, type: c?.type ?? "end",
        moveId: c?.animation?.moveId ?? null, battler: c?.battler ?? null, age: view.effect?.type === "move" ? view.effect.age : null,
        glyphs: view.message?.visibleCharacters ?? null,
        transform: [view.field.player.transform?.species ?? null, view.field.opponent.transform?.species ?? null], menuTransform: null,
        species: [view.field.player.species, view.field.opponent.species] });
    } else if (state.battleCommandPresentation) {
      const f = state.battleCommandPresentation.field;
      out.push({ frame, key: "menu", type: "menu", moveId: null, battler: null, age: null, transform: [null, null],
        glyphs: null, menuTransform: [f.player.transform?.species ?? null, f.opponent.transform?.species ?? null], species: [f.player.species, f.opponent.species] });
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
  const rows = battleFrames(seed, scene);
  const starts: Row[] = [];
  for (const r of rows) if (starts.length === 0 || starts[starts.length - 1]!.key !== r.key) starts.push(r);
  starts.forEach((s, i) => {
    if (s.type !== "move-animation" || s.moveId !== 144) return;
    const own = rows.filter((r) => r.key === s.key);
    const after = starts.slice(i + 1);
    const msg = after.find((x) => x.type === "message");
    // The next print's first glyph (ROM: activation + 112 rows = command start + 3 pre rows + 112).
    const glyph = msg ? rows.find((r) => r.key === msg.key && (r.glyphs ?? 0) > 0) : undefined;
    const side = s.battler!;
    // Later views until the attacker's slot shows another species (switch-in) or the battle ends.
    const later = rows.filter((r) => r.frame > own[own.length - 1]!.frame);
    const stay = later.slice(0, Math.max(0, later.findIndex((r) => r.species[side] !== s.species[side])) || later.length);
    const shown = (r: Row) => (r.menuTransform ?? r.transform)[side];
    const counts: Record<string, number> = {};
    for (const r of stay) counts[`${r.type}:${shown(r) ?? "none"}`] = (counts[`${r.type}:${shown(r) ?? "none"}`] ?? 0) + 1;
    const leaves = later.find((r) => r.species[side] !== s.species[side]);
    console.log(JSON.stringify({ seed, scene, battler: side, attackerSpecies: s.species[side], commandFrames: own.length,
      ageFirst: own[0]!.age, ageLast: own[own.length - 1]!.age, message: msg ? msg.frame - s.frame : null, firstGlyph: glyph ? glyph.frame - s.frame : null,
      stayFrames: stay.length, stayViews: counts, afterLeaving: leaves ? { species: leaves.species[side], transform: shown(leaves) } : null }));
  });
}
