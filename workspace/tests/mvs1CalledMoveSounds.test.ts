// mvs1 (docs/mvs1-called-move-sounds.md): the frame catcher's fcm1 findings 5-7 (docs/fcm1-catcher-sweep.md).
//  5. Will-O-Wisp played none of the 15 SE_M_FLAME_WHEELs its first orb plays itself (AnimWillOWispOrb_Step, battle_anim_fire.c:1166-1186).
//  7. Scene OFF: a Substitute (or Transform) played no sound: Cmd_attackanimation animates both under HITMARKER_NO_ANIMATIONS (battle_script_commands.c:1748),
//     and the emitter skipped every body under it. Substitute's AnimTask_MonToSubstituteDoll SE_M_BUBBLE2 rows were missing in both scenes.
// The Substitute, Transform and Will-O-Wisp bodies use the ROM script's clock: script row 0 on command row seGate + lead + 4.
// ROM ground truth: tools/audio/fixtures/aud260-willowisp-*.json, mvs1-{substitute,transform}-*.json (soundEventProbe labs, tools/integration/mvs1Labs.py)
// and the frame catcher's ROM run s36-off-ws (its METRONOME -> SUBSTITUTE is staged below with a kernel seed that calls SUBSTITUTE).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectSoundTick, type SoundEvent } from "../src/audio/soundEvents.ts";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import { moveAnimOpRows, variantOf } from "../src/engine/moveAnimSounds.ts";
import { installBundledMonPicPixels } from "../src/engine/monPicPixelsInstall.ts";
import { currentCommandField, moveAnimationScriptStartRow } from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import timing from "../src/data/gen/anim-sound-timing.json" with { type: "json" };
import { traceAdvances } from "../tools/compare/traceReplay.ts";
import { censusDeal } from "../tools/integration/censusRound.ts";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro, beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator, type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { emitMoveAnimSounds } from "../src/engine/moveAnimSounds.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../src/engine/battleCommandPresentation.ts";
import type { GbaButton } from "../src/input.ts";

installBundledMonPicPixels();

interface FixtureEvent { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }
interface Fixture { frames: number; events: FixtureEvent[]; trace: { route: "generated-orchestrator" | "canonical-recorded"; battleScene: "on" | "off"; appStage?: { id: string; frame: number }; segments: Array<{ frames: number; buttons?: string[] }> } }
const fixture = (file: string): Fixture => JSON.parse(readFileSync(new URL(`../tools/audio/fixtures/${file}.json`, import.meta.url), "utf8")) as Fixture;
const appTracePath = "../tools/compare/appTrace.ts";
const { APP_STAGES } = (await import(/* @vite-ignore */ appTracePath)) as { APP_STAGES: Record<string, (state: ReturnType<typeof createInitialState>) => ReturnType<typeof createInitialState>> };

const SE_M_FLAME_WHEEL = 144;
const SE_M_FLAME_WHEEL2 = 145;
const SE_M_EMBER = 151;
const SE_M_ATTRACT = 226;
const SE_M_BUBBLE2 = 125;
const SE_M_TELEPORT = 203;
const SE_M_MINIMIZE = 204;

/** The lab replayed on our engine: the SEs and, per frame, whether the player's battler area (x 40..103, y 56..111) changed. */
function ourLab(rom: Fixture): { events: SoundEvent[]; playerAreaChanged: Set<number> } {
  let state = createInitialState({ appRoute: rom.trace.route, battleScene: rom.trace.battleScene });
  if (rom.trace.appStage !== undefined) state = APP_STAGES[rom.trace.appStage.id]!(state);
  const events: SoundEvent[] = [];
  const playerAreaChanged = new Set<number>();
  let previous: Uint8ClampedArray | null = null;
  for (const advance of traceAdvances(rom.trace.segments)) {
    if (advance.frame > rom.frames) break;
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    events.push(...result.events);
    const pixels = (render(state) as unknown as Uint8ClampedArray).slice();
    if (previous !== null) {
      outer: for (let y = 56; y < 112; y += 1) {
        for (let x = 40; x < 104; x += 1) {
          const i = (y * 240 + x) * 4;
          if (pixels[i] !== previous[i] || pixels[i + 1] !== previous[i + 1] || pixels[i + 2] !== previous[i + 2]) { playerAreaChanged.add(advance.frame); break outer; }
        }
      }
    }
    previous = pixels;
  }
  return { events, playerAreaChanged };
}
const seRows = (events: readonly { frame: number; kind: string; id: number | null; pan: number | null; noop?: boolean }[], ids: readonly number[]) =>
  events.filter((e) => e.noop !== true && e.kind === "se" && ids.includes(e.id as number));
const rowsOf = (events: ReturnType<typeof seRows>) => events.map((e) => `${e.id}:${e.pan}`);

describe("the sound timing table (tools/extract/extract-anim-sound-timing.ts)", () => {
  const tableOf = (move: number, side: 0 | 1) => timing.variants[timing.moves[move]!.variants[side]!]!;
  it("Will-O-Wisp: the first orb's SE_M_FLAME_WHEEL on script rows 41, 91..103 and 105, with gAnimCustomPanning (the ROM's pans, both sides)", () => {
    for (const side of [0, 1] as const) {
      const orbRows = tableOf(261, side).filter((op) => op.op === "sprite_willowisp_orb");
      expect(orbRows.map((op) => op.frame)).toEqual([41, ...Array.from({ length: 13 }, (_, i) => 91 + i), 105]);
      const context = side === 0 ? { attackerSide: "player", targetSide: "opponent" } as const : { attackerSide: "opponent", targetSide: "player" } as const;
      const pans = orbRows.map((op) => moveAnimOpRows(op as Parameters<typeof moveAnimOpRows>[0], context)[0]!.emission.pan);
      // aud260-willowisp-{player,opponent}.json: ROM frames 107, 157..169, 171 (player) / 111, 161..173, 175 (opponent).
      expect(pans).toEqual(side === 0 ? [-64, -12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 16] : [63, 11, 9, 7, 5, 3, 1, -1, -3, -5, -7, -9, -11, -13, -17]);
    }
  });
  it("Substitute: SE_M_ATTRACT on row 0, the doll's two SE_M_BUBBLE2 landings on rows 41 and 66 (also General_SubstituteAppear)", () => {
    for (const side of [0, 1] as const) expect(tableOf(164, side).map((op) => `${op.frame}:${op.id}`)).toEqual(["0:226", "41:125", "66:125"]);
    const appear = timing.general.find((g) => g.label === "General_SubstituteAppear")!;
    for (const side of [0, 1] as const) expect(timing.variants[appear.variants[side]!]!.map((op) => `${op.frame}:${op.id}`)).toEqual(["41:125", "66:125"]);
  });
  it("Leech Life and Aeroblast (no adapter) keep their full script rows", () => {
    expect(variantOf(141, 0, 1).map((op) => `${op.frame}:${op.id}`)).toEqual(["35:180", "67:142", "73:142", "79:142", "85:142", "91:142", "97:142", "103:142", "109:142", "162:179"]);
    expect(variantOf(177, 0, 1).map((op) => `${op.frame}:${op.id}`)).toEqual([...Array.from({ length: 20 }, (_, i) => `${47 + 5 * i}:143`), "166:136"]);
  });
});

describe("ROM labs: ours equals the ROM's SE rows", () => {
  for (const side of ["player", "opponent"] as const) {
    it(`aud260-willowisp-${side}: the body's 18 SEs (EMBER x2, the orb's FLAME_WHEEL x15, FLAME_WHEEL2) on the ROM's frames and pans`, () => {
      const rom = fixture(`aud260-willowisp-${side}`);
      const ids = [SE_M_EMBER, SE_M_FLAME_WHEEL, SE_M_FLAME_WHEEL2];
      // The body only: the later Status_Burn (its own SE_M_FLAME_WHEEL) is the status animation's clock.
      const body = (events: ReturnType<typeof seRows>) => events.slice(0, 18);
      const romRows = body(seRows(rom.events, ids));
      const ours = body(seRows(ourLab(rom).events, ids));
      expect(rowsOf(ours)).toEqual(rowsOf(romRows));
      expect(ours.map((e) => e.frame)).toEqual(romRows.map((e) => e.frame));
    });
  }
  for (const scene of ["on", "off"] as const) {
    for (const side of ["player", "opp"] as const) {
      it(`mvs1-transform-${side}-${scene}: SE_M_TELEPORT / SE_M_MINIMIZE on the ROM's frames and pans`, () => {
        const rom = fixture(`mvs1-transform-${side}-${scene}`);
        const ids = [SE_M_TELEPORT, SE_M_MINIMIZE];
        const romRows = seRows(rom.events, ids);
        expect(romRows.map((e) => e.frame)).toEqual(side === "player" ? [61, 109] : [65, 113]);
        const ours = seRows(ourLab(rom).events, ids);
        expect(rowsOf(ours)).toEqual(rowsOf(romRows));
        expect(ours.map((e) => e.frame)).toEqual(romRows.map((e) => e.frame));
      });
      it(`mvs1-substitute-${side}-${scene}: SE_M_ATTRACT and the two SE_M_BUBBLE2s, 2 rows before the first shrink row as on the ROM`, () => {
        const rom = fixture(`mvs1-substitute-${side}-${scene}`);
        const ids = [SE_M_ATTRACT, SE_M_BUBBLE2];
        const romRows = seRows(rom.events, ids);
        expect(romRows.map((e) => e.frame - romRows[0]!.frame)).toEqual([0, 41, 66]);
        const lab = ourLab(rom);
        const ours = seRows(lab.events, ids);
        expect(rowsOf(ours)).toEqual(rowsOf(romRows));
        // BattleScript_EffectSubstitute runs `ppreduce` before `attackstring`. sbm1: the used-print lead and the action transition now skip that
        // `ppreduce` event (as for Solar Beam in sun), so the ROM's used print and body are no longer one row later than this stage's: Scene OFF's SEs
        // are on the ROM rows (0, 41, 66; they were -1 / 40 / 65), and Scene ON's drawn shrink is on the ROM's first shrink row (64; ours was 63).
        // Scene ON's SEs stay the one row early of the hcr2c tick lead (min(u - 2, 2) = 2 where the ROM needs 1), the sbm1 SE 201 residual.
        expect(ours.map((e) => e.frame - romRows[0]!.frame)).toEqual(scene === "on" ? [-1, 40, 65] : [0, 41, 66]);
        if (side === "player") {
          // The drawn body: the player's battler first changes 2 rows after SE_M_ATTRACT (the ROM: SE 62, shrink 64).
          const firstShrink = [...lab.playerAreaChanged].filter((f) => f > ours[0]!.frame - 10).sort((a, b) => a - b)[0];
          expect(firstShrink! - ours[0]!.frame).toBe(scene === "on" ? 3 : 2);
        }
      });
    }
  }
});

interface BodyRun { readonly moveId: number; readonly start: number; readonly scriptStart: number | null; readonly live: boolean; readonly afterMetronome: boolean; readonly ses: readonly string[]; readonly stampedSes: readonly string[]; readonly shrinkRow: number | null }

/**
 * An app stage's one turn (A, A, then idle frames) on our engine. Returns, for each body of `moveId`, the command's first frame, its script start row, whether
 * METRONOME was used before it in the same resolution, the SEs (`row:id:pan`, row = frame - start) up to `rows` rows after its start, and the first row the
 * player's battler area (x 40..103, y 56..111) changes.
 */
function stageBodies(stageId: string, scene: "on" | "off", moveId: number, rows: number): BodyRun[] {
  let state = APP_STAGES[stageId]!(createInitialState({ appRoute: "generated-orchestrator", battleScene: scene }));
  const segments = [{ frames: 2, buttons: ["A"] }, { frames: 18, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: rows + 300, buttons: [] }];
  type OpenBody = { -readonly [K in keyof BodyRun]: BodyRun[K] } & { ses: string[]; stampedSes: string[]; lastCommand: unknown; previous: Uint8ClampedArray | null };
  const bodies: OpenBody[] = [];
  let open = null as OpenBody | null;
  for (const advance of traceAdvances(segments)) {
    const result = collectSoundTick(state.frame + 1, () => tick(state, advance.buttons));
    state = result.result;
    const frame = advance.frame;
    const resolution = state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null;
    const segment = resolution?.segments[resolution.segmentIndex];
    const command = segment?.commands[resolution!.commandIndex];
    if (resolution && segment && command?.type === "move-animation" && command.animation?.moveId === moveId && open?.lastCommand !== command) {
      const afterMetronome = segment.events.some((event) => event.sequence < command.eventSequence && event.payload.kind === "message"
        && event.payload.messageId === "STRINGID_USEDMOVE" && (event.payload as { actionSnapshot?: { currentMove?: number } }).actionSnapshot?.currentMove === 118);
      open = {
        moveId, start: frame, scriptStart: moveAnimationScriptStartRow(segment, command.eventSequence),
        live: liveMoveAnimationDuration(command.animation, currentCommandField(resolution)) !== null,
        afterMetronome, ses: [], stampedSes: [], shrinkRow: null, lastCommand: command, previous: null,
      };
      bodies.push(open);
    }
    if (open === null) continue;
    const row = frame - open.start;
    if (row > rows) { open = null; continue; }
    for (const e of result.events) if (e.kind === "se") { open.ses.push(`${row}:${e.id}:${e.pan}`); open.stampedSes.push(`${e.frame - open.start}:${e.id}:${e.pan}`); }
    if (open.shrinkRow === null) {
      const pixels = (render(state) as unknown as Uint8ClampedArray).slice();
      if (open.previous !== null) {
        outer: for (let y = 56; y < 112; y += 1) for (let x = 40; x < 104; x += 1) {
          const i = (y * 240 + x) * 4;
          if (pixels[i] !== open.previous[i] || pixels[i + 1] !== open.previous[i + 1] || pixels[i + 2] !== open.previous[i + 2]) { open.shrinkRow = row; break outer; }
        }
      }
      open.previous = pixels;
    }
  }
  return bodies.map((body) => { const { lastCommand: _c, previous: _p, ...rest } = body as OpenBody; return rest; });
}

describe("METRONOME -> SUBSTITUTE (the frame catcher's s36-off-ws case, staged)", () => {
  // ROM (fcm1 s36-off-ws battle 8, CHANSEY's METRONOME -> SUBSTITUTE in Scene OFF): the used print's last glyph 115388, SE_M_ATTRACT 115397, first shrink
  // row 115399, SE_M_BUBBLE2 115438 / 115463. Our command starts the row after the last glyph (109235 after 109234 in that run), so the ROM's rows are
  // command rows 8, 10, 49 and 74 (ours there after mvs1: 109243 / 109245 / 109284 / 109309). The seeded test player no longer reaches that turn on the
  // combined tree, so the case is staged: a METRONOME Rattata whose kernel seed calls SUBSTITUTE (tools/compare/appTrace.ts mvs1-metronome-substitute-player-*).
  for (const scene of ["off", "on"] as const) {
    it(`Scene ${scene.toUpperCase()}: the called SUBSTITUTE is drawn and plays SE_M_ATTRACT and both SE_M_BUBBLE2s on the ROM's command rows`, () => {
      const [body] = stageBodies(`mvs1-metronome-substitute-player-${scene}`, scene, 164, 80);
      expect(body, "the stage's METRONOME no longer calls SUBSTITUTE: re-pick MVS1_METRONOME_SUBSTITUTE_SEED (tools/compare/appTrace.ts)").toBeDefined();
      expect(body!.afterMetronome).toBe(true);
      expect(body!.live).toBe(true);
      expect(body!.scriptStart).toBe(8);
      expect(body!.ses).toEqual(["8:226:-64", "49:125:-64", "74:125:-64"]);
      // The stamped frames too (the sound log's clock): METRONOME's print makes this a ruled turn (u = 2), and the box's hcr1b Scene OFF one-tick lead
      // stamped these SEs on rows 7 / 48 / 73 after the merge; mvs1's script clock is fitted to the ROM's SE rows already (usedMoveBodySoundLeadOf).
      expect(body!.stampedSes).toEqual(["8:226:-64", "49:125:-64", "74:125:-64"]);
      expect(body!.shrinkRow).toBe(10);
    });
  }
});

/**
 * A census battle (tests/sub157SceneOffSubstitute.test.ts's driver: battle i = seed i, streak i * 11 % 49, every legal move in turn) on the orchestrator alone,
 * with emitMoveAnimSounds collected per row: each Transform / Substitute body's script start row, the text before it and its SEs (`row:id:pan`).
 */
function censusBodies(seed: number, scene: "on" | "off"): Array<{ move: number; scriptStart: number | null; text: string; ses: string[] }> {
  let state: FactoryRoundBattleOrchestratorState = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, battleScene: scene, factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, ...censusDeal({ seed, factoryWinStreak: (seed * 11) % 49 }),
  }));
  let frame = 0, ended = false;
  const slotUses = [0, 0, 0, 0];
  const bodies: Array<{ move: number; scriptStart: number | null; text: string; ses: string[]; start: number; command: unknown }> = [];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > 200000) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    const r = state.battleResolutionPresentation ?? null;
    const events = collectSoundTick(frame, () => emitMoveAnimSounds(r)).events;
    const segment = r?.segments[r.segmentIndex];
    const command = segment?.commands[r!.commandIndex];
    if (segment && command?.type === "move-animation" && command.animation && [144, 164].includes(command.animation.moveId) && bodies.at(-1)?.command !== command) {
      const text = segment.commands.slice(0, r!.commandIndex).flatMap((c) => (c as { lines?: readonly string[] }).lines ?? []).join(" ");
      bodies.push({ move: command.animation.moveId, scriptStart: moveAnimationScriptStartRow(segment, command.eventSequence), text, ses: [], start: frame, command });
    }
    const open = bodies.at(-1);
    if (open && frame - open.start < 140) for (const e of events) if (e.kind === "se") open.ses.push(`${frame - open.start}:${e.id}:${e.pan}`);
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended) step([button]); if (!ended) step(); };
  const until = (predicate: () => boolean) => {
    while (!ended && !predicate()) {
      const s = state.battleForcedPartySelect;
      const selector = s && s.sendOutElapsed === null && s.elapsed >= PARTY_LIST_INPUT_ELAPSED ? s : null;
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0) || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  until(() => phase() === "action-menu");
  while (!ended) {
    const forcedSlot = state.battleCommandPresentation?.forcedMove?.decision.moveSlot ?? null;
    pulse("A");
    if (forcedSlot !== null) {
      slotUses[forcedSlot]!++;
      if (phase() === "no-moves-message") { until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT); pulse("A"); }
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
      continue;
    }
    until(() => phase() === "fight-menu");
    if (ended) break;
    const menu = state.battleCommandPresentation!;
    const legal = ([0, 1, 2, 3] as const).filter((slot) => menu.legalMoveBySlot[slot] !== null);
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
  return bodies.map(({ start: _s, command: _c, ...body }) => body);
}

describe("METRONOME -> TRANSFORM and the direct Substitute on census battles, both scenes", () => {
  for (const scene of ["on", "off"] as const) {
    it(`census seed 197 (${scene}): CHANSEY's METRONOME -> TRANSFORM plays SE_M_TELEPORT / SE_M_MINIMIZE on command rows 9 / 57 (lead 2: the ROM lab's 61 / 109 after the command's 52)`, () => {
      const [transform] = censusBodies(197, scene).filter((b) => b.move === 144);
      expect(transform, "census seed 197 no longer calls Transform through METRONOME: re-pick the case").toBeDefined();
      expect(transform!.text).toContain("used METRONOME!");
      expect(transform!.scriptStart).toBe(6);
      expect(transform!.ses).toEqual(["9:203:-64", "57:204:-64"]);
    });
    it(`census seed 17 (${scene}): the foe's direct Substitute plays on the same rows as the called one (8 / 49 / 74)`, () => {
      const subs = censusBodies(17, scene).filter((b) => b.move === 164);
      expect(subs.length).toBe(2);
      for (const sub of subs) {
        expect(sub.scriptStart).toBe(8);
        expect(sub.ses).toEqual(["8:226:63", "49:125:63", "74:125:63"]);
      }
    });
  }
});
