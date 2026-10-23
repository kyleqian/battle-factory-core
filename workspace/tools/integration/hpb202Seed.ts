// hpb202 (docs/hpb202-health-bar-programs.md): lsd194Census.ts with a diagnostic catch - on a throw, prints the presented segment around the failing command, the displayed field battlers and the events that produced the hp command.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { battleResolutionCommandDuration, battleResolutionFieldBeforeCommand, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
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
  let probing: any = null; const seen = new Set<unknown>(); const slotUses = [0, 0, 0, 0]; let lastUsed: string | null = null;
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
          probing = { seg: s, c, i };
          if (c.type === "message" && c.lines.join("\n").includes(" used\n")) lastUsed = c.lines.join("\n");
          const prev = s.commands[i - 1]; const out = s.commands[i - 2];
          const forcedPlayer = c.type === "switch-in" && c.battler === 0 && prev?.type === "sprite-visibility" && prev.recall === true
            && out?.type === "switch-out" && out.skipAnimation === true;
          commands.push([c.type, c.battler ?? null, c.timing?.minimumFrames ?? null, c.timing?.holdFrames ?? null,
            c.settleHoldFrames ?? null, c.healthboxSlideElapsed ?? null, c.sendInVisualDelay ?? null, forcedPlayer ? 1 : 0,
            c.type === "switch-in" ? c.incoming.species : null,
            c.type === "message" ? battleStringPrintableLength(c.lines) : null, lastUsed,
            c.type === "move-animation" ? (c.animation ? 1 : 0) : null,
            c.type === "message" && c.lines.join("\n").includes("is tightening") ? nextPrintU(s.events, c.eventSequence) : null,
            c.type === "move-animation" ? (c.timing.scriptLeadFrames ?? 0) : null, c.type === "hp" ? (c.timing.tailFrames ?? 0) : null,
            c.type === "move-animation" ? (c.animation?.moveId ?? null) : null,
            c.type === "move-animation" ? battleResolutionCommandDuration(c, (arg("oldfield") ? s.field : battleResolutionFieldBeforeCommand(s.field, s.commands, i))) : null,
            c.type === "move-animation" ? (c.timing.scriptTailRows ?? 0) : null,
            battleResolutionCommandDuration(c, (arg("oldfield") ? s.field : battleResolutionFieldBeforeCommand(s.field, s.commands, i))), c.type === "general-animation" ? c.animation : null,
            c.type === "hp" ? c.timing.minimumFrames : null]);
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
      if (s) { pulse(s.message !== null ? "A" : s.cursor === "onix" && !s.submenuOpen ? "DOWN" : "A"); continue; }
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
  } catch (e) {
    error = String(e);
    const { seg, c, i } = probing;
    const brief = (x: any) => x && ({ type: x.type, battler: x.battler, from: x.from, to: x.to, healthValue: x.healthValue, species: x.incoming?.species, maxHp: x.incoming?.maxHP, lines: x.lines?.join("|"), eventSequence: x.eventSequence });
    const fieldNow = battleResolutionFieldBeforeCommand(seg.field, seg.commands, i) as any;
    const evs = (seg.events ?? []).filter((ev: any) => ev.sequence === c.eventSequence);
    console.log(JSON.stringify({ seed, scene, error, commandIndex: i, command: brief(c),
      segmentStartField: ["player", "opponent"].map((k) => ({ species: seg.field[k].species, hp: seg.field[k].hp, maxHP: seg.field[k].maxHP })),
      fieldBeforeCommand: ["player", "opponent"].map((k) => ({ species: fieldNow[k].species, hp: fieldNow[k].hp, maxHP: fieldNow[k].maxHP })),
      earlierSwitchIns: seg.commands.slice(0, i).filter((x: any) => x.type === "switch-in").map(brief),
      events: evs.map((ev: any) => ({ seq: ev.sequence, payload: ev.payload, source: ev.provenance?.sourceLabel })) }));
  }
  lines.push(JSON.stringify({ seed, scene, error, eventsDigest: events.digest("hex").slice(0, 16), commands }));
}
if (arg("out")) writeFileSync(arg("out")!, lines.join("\n") + "\n");
