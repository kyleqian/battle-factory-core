// apx222 (docs/finish-plan.md Phase 2; src/engine/liveMovePlayback.ts): the last static classes become approximate. One staged census
// command per class / new body through the production live renderer (tools/integration/apx217TransformStrips.ts): non-static rows,
// classified approx, deterministic on replay.
import { describe, expect, it } from "vitest";
import { apx217Strip } from "../tools/integration/apx217TransformStrips.ts";
import { hpd4BodyRows } from "./helpers/iu120Rows.ts";

// 374 body rows + the b4l c-lead rows of the Ghost branch: ROM lead L 6 + window adjust 4 (b4m-curseghost-player-on: ROM A1 430 -> next command 433 = the engine's hp command at 433 with them).
const GHOST_CURSE_ROWS = 374 + hpd4BodyRows(174, 6);

describe("apx222: one staged command per class / new body draws non-static rows, classifies approx, deterministic on replay", () => {
  it.each([
    // [name, census seed, moveId, attacker, code, presented rows (the body's own live duration)]
    // parity-mac re-pin (docs/parity-mac/STATUS.md "Re-pins"): census battles 41 and 138 changed (AI draws / replacement fixes) and no
    // longer hold these commands; battle 50 (player Light Screen at a hidden opponent) and battle 133 (opponent Ghost Curse) do,
    // with the same row counts.
    ["hidden-target: Light Screen 113 by the player at a hidden opponent", 50, 113, 0, "approx:hidden-target", 95], // bwf1: 97 -> 95 (Light Screen window = the ROM's)
    ["hidden-target: Sky Uppercut 327 by the opponent at a hidden player", 81, 327, 1, "approx:hidden-target", 199],
    // turn-0: Curse's Ghost branch (CURSE_GHOST, Move_CURSE / CurseGhost): the black field, the nail's three scratches, the rising ghost
    // apx227: Ghost Curse is 21 rows longer (window fade-in, nail 4 ticks later, black held longer, 8-step restore).
    ["turn-0: Curse 174 (Ghost branch) by the player", 231, 174, 0, "approx:turn-0", GHOST_CURSE_ROWS],
    ["turn-0: Curse 174 (Ghost branch) by the opponent", 133, 174, 1, "approx:turn-0", GHOST_CURSE_ROWS],
    // no-adapter: each body is built from its source script (src/animation/approxScript.ts); [rows] is its own duration
    // hit1 (docs/hit1-move-hit-timing.md): the script-built bodies now end where Cmd_end's IsSEPlaying wait ends (+ the 2 post rows of a trail -1
    // body, + the no-hit script tail): Odor Sleuth +63 (SE_M_LEER) + 2 + 3, False Swipe +13 + 2, Gust +44 (SE_M_GUST2) + 2, Conversion 2 +3 + 2 + 3.
    // aip262: the Peck 64 row (census seed 51) left: seed 51 is a changed seed and no unchanged census seed 0..999 carries an opponent Peck.
    ["no-adapter: Odor Sleuth 316 by the player (Move_ODOR_SLEUTH)", 705, 316, 0, "approx:no-adapter", 153],
    ["no-adapter: False Swipe 206 by the player (Move_FALSE_SWIPE)", 705, 206, 0, "approx:no-adapter", 97],
    ["no-adapter: Gust 16 by the player (Move_GUST)", 197, 16, 0, "approx:no-adapter", 136],
    // sbm1: Pay Day 85 -> 90 (+ the 5 rows of Task_ClearMonBg after its last picture; aud262-payday-player-on effectiveness SE 145 -> 150, ROM 151).
    ["no-adapter: Pay Day 6 by the player (Move_PAY_DAY)", 923, 6, 0, "approx:no-adapter", 90],
    ["no-adapter: Barrage 140 by the opponent (Move_BARRAGE)", 803, 140, 1, "approx:no-adapter", 71],
    ["no-adapter: Conversion 2 176 by the opponent (Move_CONVERSION_2)", 736, 176, 1, "approx:no-adapter", 181],
  ] as [string, number, number, number, string, number][])("%s", (_name, seed, moveId, attacker, code, rows) => {
    const first = apx217Strip(seed, moveId, attacker, code)!;
    expect(first).not.toBeNull();
    expect(first.code).toBe(code);
    expect(first.rows).toBe(rows);
    // apx224: a body may start with idle lead-in rows (the ROM draws nothing for 7-15 frames after the command starts).
    expect(first.nonStaticRows).toBeGreaterThan(rows * 0.3);
    const again = apx217Strip(seed, moveId, attacker, code)!;
    expect(again.rows).toBe(first.rows);
    expect(again.nonStaticRows).toBe(first.nonStaticRows);
    expect(again.sha256).toBe(first.sha256);
  }, 240000);
});
