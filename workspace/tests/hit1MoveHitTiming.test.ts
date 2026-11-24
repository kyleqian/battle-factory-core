// hit1 (docs/hit1-move-hit-timing.md; Kyle's 2026-11-21 Thunder Punch: "the timing between the sounds and the hit ... seems too short"):
// the battle-animation script's `end` waits for its SEs. Cmd_end (battle_anim.c:476-524) keeps gAnimScriptActive set while IsSEPlaying()
// (sound.c:606-613), up to 90 rows, so a body whose last SE outlasts its pictures ends with the SE, and the hit (effectivenesssound,
// hitanimation, the HP drain) waits for it.
//
// ROM (frame catcher with CATCHER_WATCH=1: gAnimScriptActive and the SE1 / SE2 track bits read after every frame; master traces t3 / t44 /
// s232 / s340 / s25 / ...): Thunder Punch's SE1 tracks clear 83 rows after SE_M_COMET_PUNCH (15 to SE_M_TRI_ATTACK2 + its 68), on the same
// row gAnimScriptActive falls, and the effectiveness SE plays 3 rows later: 86 after SE_M_COMET_PUNCH on all 33 hits of t3 (ours was 52).
// idle94's ROM table (per move: the ROM's first inactive row minus production's end, "trail") is the same rule move by move: trail + 1
// (+ the lead rows production does not present) = the rows the SE stop is past production's window.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { animScriptSeStopRow, cmdEndSeWaitRows, seSongRows } from "../src/engine/animEndSeWait.ts";
import { variantOf } from "../src/engine/moveAnimSounds.ts";
import {
  battleResolutionCommandDuration, cmdEndSeWaitRuleApplies, createBattleResolutionPresentationRenderView, liveMoveEndSeWaitRows,
  liveMoveIdleLeadRows, liveMoveUniversalRows,
} from "../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { FactorySession } from "../src/factorySession.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

const SE_M_COMET_PUNCH = 139, SE_M_TRI_ATTACK2 = 221, SE_M_RAZOR_WIND2 = 160, SE_M_HORN_ATTACK = 166, SE_M_GUST = 132;
const EFFECTIVENESS = new Set([12, 13, 14]);

const mon = (species: number, battler: 0 | 1) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const, currentPP: [0, 0, 0, 0] as const, ppBonuses: 0,
});
const field = { player: mon(53, 0), opponent: mon(80, 1) } as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1, turn = 0): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn, power: 50, damage: 30, friendship: 255, multihit: 0 }) as BattleMoveAnimationRequest;
const context = (attacker: 0 | 1) => ({ attackerSide: attacker === 0 ? "player" : "opponent", targetSide: attacker === 0 ? "opponent" : "player" } as const);

describe("hit1: SE song lengths (tools/extract/extract-se-song-rows.ts, the m4a tick loop)", () => {
  it("IsSEPlaying rows from the start iteration: the ROM's", () => {
    // ROM, CATCHER_WATCH: SE_M_TRI_ATTACK2's SE1 track bits clear 68 rows after it starts (t3, 33 of 33 Thunder Punch hits);
    // the effectiveness SEs 18 / 73 / 88 (seg127 receipts), SE_M_RAIN_DANCE 117 (rnc1), SE_M_SOLAR_BEAM 194 (hpd1), SE_M_VITAL_THROW2 19 (aud259).
    expect(seSongRows(SE_M_TRI_ATTACK2)).toEqual([68, 1, 4]);
    expect([12, 13, 14].map((id) => seSongRows(id)?.[0])).toEqual([18, 73, 88]);
    expect([127, 201, 123].map((id) => seSongRows(id)?.[0])).toEqual([117, 194, 19]);
    expect(seSongRows(SE_M_COMET_PUNCH)).toEqual([26, 1, 4]);
    expect(seSongRows(SE_M_HORN_ATTACK)).toEqual([26, 1, 4]);
    // SE_M_GUST loops (GOTO): only a later song on its player, a stopsound or Cmd_end's 90-row cap ends it.
    expect(seSongRows(SE_M_GUST)).toEqual([null, 2, 4]);
  });

  it("the extractor reproduces the committed src/data/gen/se-song-rows.json byte for byte", () => {
    const dir = mkdtempSync(join(tmpdir(), "hit1-"));
    try {
      execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "tools/extract/extract-se-song-rows.ts", "--out-dir", dir], { stdio: "pipe" });
      expect(readFileSync(join(dir, "se-song-rows.json"), "utf8")).toBe(readFileSync("src/data/gen/se-song-rows.json", "utf8"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60000);
});

describe("hit1: the script's fall is the last SE's end (animScriptSeStopRow)", () => {
  // ROM gAnimScriptActive windows (rows from the rise to the fall), CATCHER_WATCH over the master sweep: each equals the last SE1 / SE2
  // song's start + its rows; the windows' visual tasks were done earlier (the "nowait" row in parentheses).
  it.each([
    ["Thunder Punch", 9, 135, "t3 x 33 (visual end 113)"],
    ["Twineedle (each hit)", 41, 63, "x 27 (46)"],
    ["Metal Claw", 232, 157, "x 6 (144)"],
    ["Sludge", 124, 111, "x 3"],
    ["Ember", 52, 69, "x 20"],
    ["Fire Punch", 7, 101, "x 1"],
  ] as const)("%s: %i rows (%s)", (_name, id, rows, _note) => {
    for (const attacker of [0, 1] as const) expect(animScriptSeStopRow(variantOf(id, 0, attacker), context(attacker))).toBe(rows);
  });

  it("a new SE on a player replaces the one it plays unless that one has the higher priority; the 90-row cap", () => {
    // Thunder Punch: SE_M_COMET_PUNCH (row 51) is replaced on SE1 by SE_M_TRI_ATTACK2 (row 66): 1 + 66 + 68.
    expect(animScriptSeStopRow([{ op: "playsewithpan", frame: 51, id: SE_M_COMET_PUNCH, pan: 63 }, { op: "playsewithpan", frame: 66, id: SE_M_TRI_ATTACK2, pan: 63 }], context(0))).toBe(135);
    // a priority-5 song (SE_EFFECTIVE) keeps SE1 against a priority-4 one started while it plays
    expect(animScriptSeStopRow([{ op: "playse", frame: 0, id: 13, pan: null }, { op: "playse", frame: 10, id: SE_M_COMET_PUNCH, pan: null }], context(0))).toBe(1 + 73);
    expect(cmdEndSeWaitRows(114, 135)).toBe(22);
    expect(cmdEndSeWaitRows(114, 100)).toBe(0);
    expect(cmdEndSeWaitRows(114, Number.POSITIVE_INFINITY)).toBe(90);
  });
});

describe("hit1: liveMoveEndSeWaitRows is the ROM's missing tail, move by move", () => {
  // [move, rows, idle94 ROM trail (first inactive row - production end), lead rows idle94 measured that production does not present]
  it.each([
    ["Thunder Punch", 9, 22, 21, 0], ["Twineedle", 41, 17, 16, 0], ["Ember", 52, 3, 2, 0],
    ["Growth", 74, 20, 19, 0], ["Razor Leaf", 75, 20, 19, 0], ["Recover", 105, 15, 4, 10], ["Sludge", 124, 6, 5, 0],
    ["Hyper Fang", 158, 2, 1, 0], ["Reversal", 179, 1, 0, 0], ["Milk Drink", 208, 17, 3, 13], ["Dynamic Punch", 223, 46, 26, 19],
    ["Synthesis", 235, 10, 5, 4], ["Blaze Kick", 299, 9, 8, 0], ["Poison Tail", 342, 4, 3, 0], ["Covet", 343, 21, 20, 0],
  ] as const)("%s: %i rows = trail %i + 1 + unpresented lead %i", (_name, id, rows, trail, unpresented) => {
    expect(rows).toBe(trail + 1 + unpresented);
    for (const attacker of [0, 1] as const) expect(liveMoveEndSeWaitRows(req(id, attacker), field)).toBe(rows);
  });

  it("0 where the rows after the window are ROM-measured another way, or the window models the wait itself", () => {
    // Dragon Rage (lead-table: its tuned 26-row tail holds the wait), Toxic (status-tail), Sing
    // (liveSingBodyRows runs to the 90-row cap), Solar Beam (its unleash idle rows), Absorb (lse4 window-short rows), Self-Destruct, Supersonic (ssl1: c-lead adjust 28 =
    // the last ring's 9 + 1 + 1 + 3 rows to `end`, Cmd_end's SE wait 9 and the 5 rows to the status animation: ROM labs ttf1-supersonic-*, A high 79 -> 150, status exec 155).
    for (const id of [82, 92, 47, 76, 71, 120, 48]) {
      expect(cmdEndSeWaitRuleApplies(req(id, 0)), `move ${id}`).toBe(false);
      expect(liveMoveEndSeWaitRows(req(id, 0), field), `move ${id}`).toBe(0);
    }
    // kse1: Scary Face (an s-lead body) waits for SE_M_STRING_SHOT2: ends row 207 = the ROM's gAnimScriptActive length (labs aud242k-scaryface-player-on, mechanic-scary-face-*), window idle 4 + live 190
    for (const attacker of [0, 1] as const) {
      expect(cmdEndSeWaitRuleApplies(req(184, attacker))).toBe(true);
      expect(liveMoveEndSeWaitRows(req(184, attacker), field)).toBe(14);
    }
    // a body whose SEs end inside its window: Karate Chop, Bite
    expect(liveMoveEndSeWaitRows(req(2, 0), field)).toBe(0);
    expect(liveMoveEndSeWaitRows(req(44, 0), field)).toBe(0);
  });
});

describe("hit1: Thunder Punch's command is the ROM's window", () => {
  it("lead 5 + pre 3 + idle 10 + body 104 + Cmd_end 22 + post 2 + shape-A tail 1 = 147 rows (the ROM's R -> H: lead + 3 + len 135 + gap 4)", () => {
    for (const attacker of [0, 1] as const) {
      const r = req(9, attacker);
      expect(liveMoveAnimationDuration(r, field)).toBe(104);
      expect(liveMoveIdleLeadRows(r, field)).toBe(10);
      expect(liveMoveEndSeWaitRows(r, field)).toBe(22);
      expect(liveMoveUniversalRows(r, field)).toEqual({ pre: 3, post: 2 });
      const command = { type: "move-animation", animation: r, eventSequence: 0, timing: { minimumFrames: 1, bodyLeadFrames: 5 } } as never;
      expect(battleResolutionCommandDuration(command, field)).toBe(147);
      expect(5 + 3 + 135 + 4).toBe(147);
    }
  });
});

/** Plays a fresh challenge with the soak's seeded test player (tools/frame-catcher/makeTrace.mjs) until `done` says stop. */
function play(seed: number, policy: "winning-coverage" | "coverage-fight" | "winning-swap", done: (rows: Row[]) => boolean, maxFrames: number): Row[] {
  const mix = (x: number) => { x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; return (x ^ (x >>> 16)) >>> 0; };
  const session = new FactorySession({ battleScene: "on", gameplaySeed: mix(seed * 2 + 1), presentationSeed: mix(seed * 2 + 2), start: "draft", challengeRequest: "hold" });
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), policy);
  const rows: Row[] = [];
  let frame = 0;
  session.attachSoundSink({ push: (e) => { if (e.kind === "se" && e.id !== null) rows.push({ frame, se: e.id }); } });
  for (; frame < maxFrames && !done(rows); frame += 1) {
    session.tick(player.decide(session.state));
    const res = session.state.factoryRoundBattleOrchestrator?.battleResolutionPresentation ?? null;
    const command = res?.lifecycle.phase === "presenting" ? res.segments[res.segmentIndex]?.commands[res.commandIndex] : undefined;
    if (command?.type === "move-animation" && command.animation !== undefined) {
      const view = createBattleResolutionPresentationRenderView(res!);
      const effect = view.effect?.type === "move" ? view.effect : null;
      rows.push({ frame, move: command.animation.moveId, row: res!.lifecycle.phaseElapsed, afterScript: effect?.afterScript === true, shadowHidden: view.postBodyShadowHidden });
    } else if (command?.type === "hit-animation" && res!.lifecycle.phaseElapsed === 0) rows.push({ frame, hit: true });
  }
  return rows;
}
type Row = { frame: number; se?: number; move?: number; row?: number; afterScript?: boolean; shadowHidden?: boolean; hit?: true };

/** The frames of each `first` SE followed by `second` within 40 rows, and the next effectiveness SE after it. */
function hits(rows: readonly Row[], first: number, second: number): Array<{ at: number; second: number; eff: number | null }> {
  const ses = rows.filter((r) => r.se !== undefined);
  const out: Array<{ at: number; second: number; eff: number | null }> = [];
  for (let i = 0; i + 1 < ses.length; i += 1) {
    if (ses[i]!.se !== first || out.some((h) => ses[i]!.frame - h.at < 40)) continue; // a loop's later plays belong to its first
    const next = ses.slice(i + 1).find((r) => r.se === second && r.frame - ses[i]!.frame < 40);
    if (next === undefined) continue;
    const eff = ses.slice(i + 1).find((r) => EFFECTIVENESS.has(r.se!) && r.frame > next.frame);
    out.push({ at: ses[i]!.frame, second: next.frame - ses[i]!.frame, eff: eff === undefined ? null : eff.frame - ses[i]!.frame });
  }
  return out;
}

describe("hit1: ordinary play (the soak's seeded player, Scene ON)", () => {
  it("seed 3: Thunder Punch's effectiveness SE 85 rows after SE_M_COMET_PUNCH (ROM 86 on 33 of 33; ours was 52), the hit on the ROM's row", () => {
    const rows = play(3, "winning-coverage", (r) => hits(r, SE_M_COMET_PUNCH, SE_M_TRI_ATTACK2).some((h) => h.eff !== null), 20000);
    const [first] = hits(rows, SE_M_COMET_PUNCH, SE_M_TRI_ATTACK2);
    // the two punch SEs 15 rows apart, as on the ROM; the effectiveness SE 1 row before the ROM's: Thunder Punch is now a shape-A body,
    // whose move SEs sit 2 rows late on the pre-lead sound clock (calibrated on a 7-row lead, its lead is 5) while its pictures and its hit
    // are on the ROM's rows (frame catcher a3/t3: every picture of the stretch on the ROM's row relative to the used print)
    expect(first).toEqual({ at: expect.any(Number), second: 15, eff: 85 });
    const body = rows.filter((r) => r.move === 9);
    expect(body.length).toBe(147);
    // rows 0..17 lead / pre / idle, 18..121 the body, then Cmd_end's 22 rows with the enemy shadow hidden (gAnimScriptActive still set),
    // then post 2 + tail 1: all after the script, drawn as the field
    expect(body.filter((r) => r.afterScript).map((r) => r.row)).toEqual(Array.from({ length: 25 }, (_, i) => 122 + i));
    expect(body.filter((r) => r.shadowHidden).map((r) => r.row)).toEqual(Array.from({ length: 22 }, (_, i) => 122 + i));
    const hit = rows.find((r) => r.hit === true && r.frame > body.at(-1)!.frame);
    expect(hit?.frame).toBe(body.at(-1)!.frame + 1);
  }, 120000);

  it("seed 363: each Twineedle hit's effectiveness SE 56 rows after its SE_M_RAZOR_WIND2 (ROM 56 on 30 of 30; ours was 37)", () => {
    const rows = play(363, "coverage-fight", (r) => hits(r, SE_M_RAZOR_WIND2, SE_M_HORN_ATTACK).filter((h) => h.eff !== null).length >= 2, 12000);
    const twineedle = hits(rows, SE_M_RAZOR_WIND2, SE_M_HORN_ATTACK).slice(0, 2);
    expect(twineedle.map((h) => h.eff)).toEqual([56, 56]);
  }, 120000);

  it("seed 25: Fury Swipes hits 2-5 put the effectiveness SE 40 rows after SE_M_SCRATCH, as the ROM (ours was 33: the first hit's lead rows were subtracted)", () => {
    const SE_M_SCRATCH = 155;
    const scratchHits = (r: readonly Row[]) => {
      const ses = r.filter((x) => x.se !== undefined);
      return ses.flatMap((x, i) => {
        // a hit's first SE_M_SCRATCH (its body plays it more than once)
        if (x.se !== SE_M_SCRATCH || ses.slice(0, i).some((y) => y.se === SE_M_SCRATCH && x.frame - y.frame < 40)) return [];
        const eff = ses.slice(i + 1).find((y) => EFFECTIVENESS.has(y.se!) && y.frame - x.frame < 80);
        return eff === undefined ? [] : [eff.frame - x.frame];
      });
    };
    const rows = play(25, "winning-swap", (r) => scratchHits(r).length >= 5, 30000);
    // ROM (frame catcher b/s25-ws): 40 on every hit. Hit 1 is a shape-A lead body (lead 15): its effectiveness SE is on the ROM's row
    // after the used print, but its SE_M_SCRATCH plays 9 rows early on the pre-lead sound clock (open, docs/hit1-move-hit-timing.md).
    expect(scratchHits(rows).slice(0, 5)).toEqual([49, 40, 40, 40, 40]);
  }, 120000);
});
