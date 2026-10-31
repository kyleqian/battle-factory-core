// fpc180 (docs/fpc180-focus-punch-live.md): trn178Census.ts + field [12] on every message command = for a Focus Punch pre-pass print
// ("is tightening") the u of the next USEDMOVE print (the kernel's instructionExecution), "pre" when another pre-pass print follows, -1 when
// the next print is not a USEDMOVE; null otherwise. fpc180CensusDelta.py attributes every changed command to the rules with it.
// trn178 (docs/trn178-action-transition-live.md): msg175Census.ts with one more field per command, [11] = 1 / 0 whether a
// move-animation command carries a live animation (0: a draw-nothing pause), so trn178CensusDelta.py can attribute the inserted pause.
// msg175 description follows.
// msg175 (docs/msg175-used-message-duration.md): plr162Census.ts plus, per command, the message's printable length and the latest
// "used" print's text (attribution: a used print's (24, h) -> (0, h) costs max(24, L) - L frames; an inserted Scene OFF pause names
// its move). Run the same file on two trees and diff with msg175CensusDelta.py.
// plr162's description follows.
// plr162 (docs/plr162-player-forced-send-in.md): every presentation command of ordinary census battles (the offs152 / plr162 test loop:
// battle i = seed i, streak i * 11 % 49, rentals 0..2, least-used legal move), one JSON line per seed: the commands (type, battler,
// minimumFrames, holdFrames, settleHoldFrames, healthboxSlideElapsed, sendInVisualDelay, forced-player flag) and a digest of the kernel
// events (gameplay / RNG). Run the same file on two trees and diff with plr162CensusDelta.py.
//   node --experimental-strip-types --no-warnings tools/integration/plr162Census.ts --seeds=A..B --scene=on|off --out=file.jsonl (msg175Census.ts)
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { battleStringPrintableLength } from "../../src/engine/battleStringResolver.ts";

function nextPrintU(events: readonly any[], sequence: number): number | string {
  const at = events.findIndex((e) => e.sequence === sequence);
  for (let i = at + 1; i < events.length; i++) {
    const e = events[i]!;
    if (e.provenance?.sourceLabel === "BattleScript_FocusPunchSetUp") return "pre";
    if (e.payload.kind !== "message") continue;
    return e.payload.messageId === "STRINGID_USEDMOVE" ? e.provenance.instructionExecution : -1;
  }
  return -1;
}
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const [from, to] = arg("seeds")!.split("..").map(Number);
const scene = arg("scene") as "on" | "off";
const lines: string[] = [];
for (let seed = from!; seed <= to!; seed += 1) {
  const commands: unknown[] = []; const events = createHash("sha256");
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, rngValue: seed, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0; let ended = false; let error: string | null = null;
  const seen = new Set<unknown>(); const slotUses = [0, 0, 0, 0]; let lastUsed: string | null = null;
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly string[] = []) => {
    if (++frame > 200000) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons) as never);
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons) as never);
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons) as never);
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation as any;
    if (r) {
      for (const s of r.segments) {
        if (seen.has(s)) continue;
        seen.add(s);
        events.update(JSON.stringify(s.events));
        s.commands.forEach((c: any, i: number) => {
          if (c.type === "message" && c.lines.join("\n").includes(" used\n")) lastUsed = c.lines.join("\n");
          const prev = s.commands[i - 1]; const out = s.commands[i - 2];
          const forcedPlayer = c.type === "switch-in" && c.battler === 0 && prev?.type === "sprite-visibility" && prev.recall === true
            && out?.type === "switch-out" && out.skipAnimation === true;
          commands.push([c.type, c.battler ?? null, c.timing?.minimumFrames ?? null, c.timing?.holdFrames ?? null,
            c.settleHoldFrames ?? null, c.healthboxSlideElapsed ?? null, c.sendInVisualDelay ?? null, forcedPlayer ? 1 : 0,
            c.type === "switch-in" ? c.incoming.species : null,
            c.type === "message" ? battleStringPrintableLength(c.lines) : null, lastUsed,
            c.type === "move-animation" ? (c.animation ? 1 : 0) : null,
            c.type === "message" && c.lines.join("\n").includes("is tightening") ? nextPrintU(s.events, c.eventSequence) : null]);
        });
      }
    }
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (b: string) => { step(); if (!ended) step([b]); if (!ended) step(); };
  const forcedSelector = () => {
    const s = state.battleForcedPartySelect;
    return s && s.sendOutElapsed === null && s.elapsed >= PARTY_LIST_INPUT_ELAPSED ? s : null;
  };
  const until = (p: () => boolean) => {
    while (!ended && !p()) {
      const s = forcedSelector();
      if (s) { pulse(s.message !== null ? "A" : (!s.submenuOpen && (typeof s.cursor === "number" ? !s.party[s.cursor]!.legal : (s.cursor as string) !== "magby")) ? "DOWN" : "A"); continue; }
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
  } catch (e) { error = String(e); }
  lines.push(JSON.stringify({ seed, scene, error, eventsDigest: events.digest("hex").slice(0, 16), commands }));
}
writeFileSync(arg("out")!, lines.join("\n") + "\n");
