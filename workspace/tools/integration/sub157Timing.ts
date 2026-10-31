// sub157 (ISSUES #153; docs/sub157-scene-off-substitute.md): production frame timing of every Substitute (164) / Transform (144)
// body on ordinary census battles (off108Route.ts's loop), both scenes: per body, the frames from the move-animation command's
// start (= the aud118 convention's G + 1) to the next hp command and to the next message command, and the x2 input the body read.
// Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/sub157Timing.ts --seeds=17,74 --scene=on|off
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";

type Row = { frame: number; key: string; type: string; moveId: number | null; battler: number | null; x2: readonly string[] | null };
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
      out.push({ frame, key: `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`, type: c?.type ?? "end",
        moveId: c?.animation?.moveId ?? null, battler: c?.battler ?? null, x2: r.liveMoveBattlerX2Input?.zeroed ?? null });
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
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
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
  // command starts: the first frame of each command key
  const starts: Row[] = [];
  for (const r of rows) if (starts.length === 0 || starts[starts.length - 1]!.key !== r.key) starts.push(r);
  starts.forEach((s, i) => {
    if (s.type !== "move-animation" || (s.moveId !== 164 && s.moveId !== 144)) return;
    const after = starts.slice(i + 1);
    const hp = after.find((x) => x.type === "hp"), msg = after.find((x) => x.type === "message");
    const x2 = rows.find((r) => r.key === s.key)?.x2 ?? null;
    console.log(JSON.stringify({ seed, scene, move: s.moveId, battler: s.battler, bodyFrames: after[0]!.frame - s.frame,
      hp: hp && s.moveId === 164 ? hp.frame - s.frame : null, message: msg ? msg.frame - s.frame : null, x2 }));
  });
}
