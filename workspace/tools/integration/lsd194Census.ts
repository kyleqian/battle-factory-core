// aud243a (docs/aud243a-sound-census.md): two more fields per seed, `sound` = every sound event of the battle as [frame, kind, id, pan] (+ mode for a cry; frame = 1-based census step, the value
// FactorySession.frame has after the tick) and `soundDigest` (sha256[:16] of `sound`), plus `soundAnim` = one row per move-animation command that presented, [command index into `commands`, moveId, turn,
// attacker battler, target battler, first presenting frame, last presenting frame, frame of body age 0 (null: no live body), 1 when the segment is HITMARKER_NO_ANIMATIONS, 1 for the Scene ON action-transition pause (command.actionTransition)] (the T1 attribution input of
// soundCensusDelta.py). Events come from the same emitters tick() calls (emitTickSounds on the orchestrator before/after each step, battleScene null) between beginScreenSoundTick and runScheduledScreenSounds
// inside collectSoundTick; menu SEs fire inside the advance functions and are collected too. A tree without those modules writes sound / soundDigest / soundAnim = null. No existing field changes.
// t1cls: trailing per-seed field `soundCmd` = one row per presenting command of any type [command index, type, battler, first presenting frame, last presenting frame, animation name or null, 1 when the command is `animated`] (soundCensusDelta.py --t1 attributes non-move SEs by it). No existing field changes.
// apx210 (finish plan Phase 2, liveMovePlayback.ts): trailing field [21] = a move-animation's playback class ("live", "static:<reason>",
// later "approx:<reason>", "pause" = no body request; null otherwise). Set from (command, field before it) when the segment is seen, then
// refined on the command's first presenting row from the production render view (the presentation gates). Fields [0..20] are unchanged.
// apx210CensusSummary.py totals it per arm. A base tree without liveMovePlayback.ts writes null.
// hpb202: durations use the displayed field BEFORE each command (battleResolutionFieldBeforeCommand, as production does) - the old segment-start field made an hp command after an in-segment switch-in throw "invalid HP program" (docs/hpb202-health-bar-programs.md).
// lsd194 (docs/lsd194-print-floor-and-drain.md): ont193Census.ts with fields [18] = every command's presented frames (battleResolutionCommandDuration on the segment
// field), [19] = a general-animation's animation name (null otherwise) and [20] = an hp command's timing.minimumFrames (null otherwise);
// lsd194CensusDelta.py attributes every changed command to the print-floor drop or the Leech Seed drain rows. Runs unchanged on the base tree.
// ont193 (docs/ont193-scene-on-tails.md): sub183Census.ts with fields [16] = a move-animation's presented frames (battleResolutionCommandDuration on the segment field)
// and [17] = its timing.scriptTailRows (0 absent); ont193CensusDelta.py attributes every changed command. Runs unchanged on the base tree.
// sub183 (docs/sub183-substitute-turn-timing.md): fpc180Census.ts with fields [13] = a move-animation's scriptLeadFrames (0 absent), [14] = an hp
// command's tailFrames (0 absent), [15] = a move-animation's request moveId; sub183CensusDelta.py attributes every changed command.
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
import "../../src/engine/monPicPixelsInstall.ts";
import { writeFileSync } from "node:fs";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { battleResolutionCommandDuration, battleResolutionFieldBeforeCommand, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { battleStringPrintableLength } from "../../src/engine/battleStringResolver.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";

// apx210: optional so the file still runs on a tree without the classifier.
const playback = await import("../../src/engine/liveMovePlayback.ts").catch(() => null);
// aud243a: optional sound modules (null on a tree that predates them: sound = null).
const [soundEvents, screenSounds, tickSounds, render, scriptConstants] = await Promise.all([
  import("../../src/audio/soundEvents.ts").catch(() => null),
  import("../../src/engine/screenSounds.ts").catch(() => null),
  import("../../src/engine/tickSounds.ts").catch(() => null),
  import("../../src/engine/battleResolutionPresentationRender.ts").catch(() => null),
  import("../../src/engine/battleScriptSourceConstants.ts").catch(() => null),
]);
const soundOn = Boolean(soundEvents && screenSounds && tickSounds);

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
  const sound: unknown[][] = []; const animRows = new Map<unknown, number[]>(); const cmdIndex = new Map<unknown, number>();
  const cmdWin = new Map<unknown, unknown[]>();
  const seen = new Set<unknown>(); const rows = new Map<unknown, unknown[]>(); const classified = new Set<unknown>(); const slotUses = [0, 0, 0, 0]; let lastUsed: string | null = null;
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly string[] = []) => {
    if (++frame > 200000) throw new Error("frame budget");
    const advance = () => {
      if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons) as never);
      else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons) as never);
      else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons) as never);
    };
    if (soundOn) {
      // The same order as tick(): begin, advance, the diff emitters (orchestrator before / after, no canonical battleScene), scheduled sounds; one collected tick per step.
      const before = state;
      const { events } = soundEvents!.collectSoundTick(frame, () => {
        screenSounds!.beginScreenSoundTick(frame);
        advance();
        tickSounds!.emitTickSounds({ battleScene: null, factoryRoundBattleOrchestrator: before } as never, { battleScene: null, factoryRoundBattleOrchestrator: state } as never);
        screenSounds!.runScheduledScreenSounds();
      });
      for (const e of events) sound.push(e.mode === undefined ? [e.frame, e.kind, e.id, e.pan] : [e.frame, e.kind, e.id, e.pan, e.mode]);
    } else advance();
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
          const row: unknown[] = [c.type, c.battler ?? null, c.timing?.minimumFrames ?? null, c.timing?.holdFrames ?? null,
            c.settleHoldFrames ?? null, c.healthboxSlideElapsed ?? null, c.sendInVisualDelay ?? null, forcedPlayer ? 1 : 0,
            c.type === "switch-in" ? c.incoming.species : null,
            c.type === "message" ? battleStringPrintableLength(c.lines) : null, lastUsed,
            c.type === "move-animation" ? (c.animation ? 1 : 0) : null,
            c.type === "message" && c.lines.join("\n").includes("is tightening") ? nextPrintU(s.events, c.eventSequence) : null,
            c.type === "move-animation" ? (c.timing.scriptLeadFrames ?? 0) : null, c.type === "hp" ? (c.timing.tailFrames ?? 0) : null,
            c.type === "move-animation" ? (c.animation?.moveId ?? null) : null,
            c.type === "move-animation" ? battleResolutionCommandDuration(c, battleResolutionFieldBeforeCommand(s.field, s.commands, i)) : null,
            c.type === "move-animation" ? (c.timing.scriptTailRows ?? 0) : null,
            battleResolutionCommandDuration(c, battleResolutionFieldBeforeCommand(s.field, s.commands, i)), c.type === "general-animation" ? c.animation : null,
            c.type === "hp" ? c.timing.minimumFrames : null];
          const cls = playback?.liveMovePlaybackClassification(c, battleResolutionFieldBeforeCommand(s.field, s.commands, i)) ?? null;
          row.push(cls === null ? null : playback!.liveMovePlaybackCode(cls));
          rows.set(c, row);
          cmdIndex.set(c, commands.length);
          commands.push(row);
        });
      }
    }
    // apx210: refine [21] on the command's first presenting row with the render view's presentation gates.
    if (playback && r?.lifecycle.phase === "presenting") {
      const s = r.segments[r.segmentIndex]; const c = s?.commands[r.commandIndex];
      const row = rows.get(c);
      if (c?.type === "move-animation" && c.animation && row && !classified.has(c)) {
        classified.add(c);
        const cls = playback.liveMovePlaybackClassification(c, battleResolutionFieldBeforeCommand(s.field, s.commands, r.commandIndex),
          createBattleResolutionPresentationRenderView(r, rng.host));
        row[21] = cls === null ? null : playback.liveMovePlaybackCode(cls);
      }
    }
    if (soundOn && r?.lifecycle.phase === "presenting") {
      const s = r.segments[r.segmentIndex]; const c = s?.commands[r.commandIndex];
      // t1cls: every command's presenting window [command index, type, battler, first frame, last frame, animation name (general / status animation), animated flag].
      if (c && cmdIndex.has(c)) {
        let w = cmdWin.get(c);
        if (!w) { w = [cmdIndex.get(c)!, c.type, c.battler ?? null, frame, frame, typeof c.animation === "string" ? c.animation : null, c.animated === true ? 1 : 0]; cmdWin.set(c, w); }
        w[4] = frame;
      }
      if (c?.type === "move-animation") {
        let a = animRows.get(c);
        if (!a) {
          const q = c.animation;
          a = [cmdIndex.get(c)!, q?.moveId ?? null, q?.turn ?? null, q?.attacker ?? null, q?.target ?? null, frame, frame, null,
            (s.beforeRules.rulesContext.hitMarker & (scriptConstants?.BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS ?? 128)) !== 0 ? 1 : 0, c.actionTransition ? 1 : 0] as never;
          animRows.set(c, a);
        }
        a[6] = frame;
        if (a[7] === null && render?.liveMoveSourceAge) { const src = render.liveMoveSourceAge(r); if (src && src.age === 0) a[7] = frame; }
        // aud242l: the live battlers' pic Y [player, opponent] (the Blizzard lifetime classes); absent in a tree without `picOffsetY`.
        if (a[10] === undefined && render?.liveMoveSourceAge) { const src = render.liveMoveSourceAge(r); if (src?.picOffsetY) a[10] = [src.picOffsetY(0), src.picOffsetY(1)]; }
        // aud242o: the live rollout counter (1..5) of the Rollout sound variants; absent in an older arm.
        if (a[11] === undefined && c.animation?.rolloutCounter !== undefined) a[11] = c.animation.rolloutCounter;
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
      // Forced party menu: DOWN until the cursor rests on the legal replacement with the lowest RAW party index (the rows list in the
      // ROM's battle order, so the first legal row is not always that one), then A (submenu), A (SHIFT). Works on both cursor models:
      // the two-position "onix" / "magby" one and the ROM's 0 / 1 / 2 / "cancel" one (the fainted slot refuses with a message).
      if (s) {
        const target = typeof s.cursor === "number" ? s.party.findIndex((r) => r.legal && r.partyIndex === Math.min(...s.party.filter((m) => m.legal).map((m) => m.partyIndex))) : -1;
        pulse(s.message !== null ? "A" : (!s.submenuOpen && (typeof s.cursor === "number" ? s.cursor !== target : (s.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  try {
    until(() => phase() === "action-menu");
    while (!ended) {
      const forcedSlot = state.battleCommandPresentation!.forcedMove?.decision.moveSlot ?? null;
      pulse("A");
      if (forcedSlot !== null) {
        slotUses[forcedSlot]!++;
        if (phase() === "no-moves-message") {
          until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
          pulse("A");
        }
        until(() => !state.battleCommandPresentation);
        until(() => phase() === "action-menu");
        continue;
      }
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
  const extra = soundOn
    ? { sound, soundDigest: createHash("sha256").update(JSON.stringify(sound)).digest("hex").slice(0, 16), soundAnim: [...animRows.values()], soundCmd: [...cmdWin.values()] }
    : { sound: null, soundDigest: null, soundAnim: null, soundCmd: null };
  lines.push(JSON.stringify({ seed, scene, error, eventsDigest: events.digest("hex").slice(0, 16), commands, ...extra }));
}
writeFileSync(arg("out")!, lines.join("\n") + "\n");
