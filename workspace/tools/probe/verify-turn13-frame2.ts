// Worktree lane probe (2026-07-21, docs/turn13-notes.md's own dated
// addendum, ISSUES #33(a)'s named next step): direct byte-level check of
// the wrong-asset theory for MURKROW's remaining wobble-phase shape
// residual (renders 17019-17069, excluded from turn13-switchin.json).
//
// Byte checks (NOT pixel/sha - this needs no oracle round trip and no
// mgba-venv interpreter at verify time; the RAM/VRAM read itself was a
// one-off `tools/probe/dump-turn13-frame2-vram.py` run, banked verbatim
// into `src/data/gen/turn13-murkrow-frame2-vram-dump.json`). Each banked
// tick is a full 64-tile OBJ VRAM dump of battler 1's live sprite (the
// same `gBattlerSpriteIds+1`/`gSprites`/1D-obj-mapping/4bpp addressing
// `dump-turn13-murkrow-materialize.py` and `probe_grovyle_vram.py`
// established), decoded to the same row-major 0-15-per-pixel tile shape
// `tools/extract/tiles.ts`'s `sliceTiles` produces - directly comparable
// to `battle-opponent-front-sprites.json`'s `tileset`/`frame2` fields.
//
// VERDICT (see docs/turn13-notes.md's dated append for the full tick
// sweep 17010-17074): the wrong-asset theory is REFUTED. Both `tileset`
// and `frame2` are byte-EXACT (64/64 tiles) against fresh VRAM whenever
// the real game actually displays them - `frame2` was never wrong, it
// was simply never the culprit. The real bug is `turn13MurkrowFrame`'s
// own SELECTION WINDOW: the real hardware shows `frame2` ONLY for engine
// ticks [TURN13_MURKROW_STRETCH_TICK(17020), TURN13_MURKROW_FRAME_FLIP_
// TICK(17034)] inclusive (a closed 15-tick window bounded by two already-
// named constants), and `tileset` everywhere else in the whole
// materialize+wobble+settle span - NOT the open-ended `t < 17034 ? 0 : 1`
// step function currently coded, which shows `tileset` for the 14 ticks
// it should show `frame2` (17020-17033) and `frame2` for the 35 ticks
// after the window closes (17035-17069) it should show `tileset`.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn13-frame2.ts
import turn13MurkrowFrame2VramDump from "../../src/data/gen/turn13-murkrow-frame2-vram-dump.json" with { type: "json" };
import opponentFrontSprites from "../../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };

interface VramTick {
  tick: number; // RAM tick (render = RAM + 1, same convention as dump-turn13-murkrow-materialize.py)
  animNum: number;
  animCmdIndex: number;
  tileNum: number;
  bpp: number;
  tiles: number[][];
}

const dump = turn13MurkrowFrame2VramDump as { ticks: VramTick[] };
const murkrow = opponentFrontSprites.MURKROW;

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

function tilesEqual(a: number[][], b: { columns: number; rows: number; tiles: number[][] }): number {
  let matches = 0;
  for (let i = 0; i < a.length; i += 1) {
    const ta = a[i]!;
    const tb = b.tiles[i]!;
    if (ta.length === tb.length && ta.every((v, j) => v === tb[j])) matches += 1;
  }
  return matches;
}

check("banked dump has the 3 expected RAM ticks (17010, 17019, 17034)", dump.ticks.length === 3, `got ${dump.ticks.length}`);
const byTick = new Map(dump.ticks.map((t) => [t.tick, t]));
const beforeTick = byTick.get(17010)!;
const frame2Tick = byTick.get(17019)!;
const afterTick = byTick.get(17034)!;
check("all 3 ticks present", !!beforeTick && !!frame2Tick && !!afterTick, `missing one or more of 17010/17019/17034`);

// Sanity on the RAM facts themselves (animNum/animCmdIndex/tileNum/bpp),
// pinned so a future re-dump can't silently drift without this failing.
check("RAM 17010: animNum=0 (pre-intro idle), animCmdIndex=0", beforeTick.animNum === 0 && beforeTick.animCmdIndex === 0, `got animNum=${beforeTick.animNum} animCmdIndex=${beforeTick.animCmdIndex}`);
check("RAM 17019: animNum=1 (intro started), animCmdIndex still 0", frame2Tick.animNum === 1 && frame2Tick.animCmdIndex === 0, `got animNum=${frame2Tick.animNum} animCmdIndex=${frame2Tick.animCmdIndex}`);
check("RAM 17034: animNum=1, animCmdIndex=1 (flipped)", afterTick.animNum === 1 && afterTick.animCmdIndex === 1, `got animNum=${afterTick.animNum} animCmdIndex=${afterTick.animCmdIndex}`);
check("all 3 ticks read the same live tileNum (473) - same sprite slot, no VRAM relocation", beforeTick.tileNum === 473 && frame2Tick.tileNum === 473 && afterTick.tileNum === 473, `got ${beforeTick.tileNum}/${frame2Tick.tileNum}/${afterTick.tileNum}`);
check("all 3 ticks are 4bpp (bpp=0) - TILE_BYTES_4BPP addressing was right", beforeTick.bpp === 0 && frame2Tick.bpp === 0 && afterTick.bpp === 0, `got ${beforeTick.bpp}/${frame2Tick.bpp}/${afterTick.bpp}`);

// The decisive byte comparison: does live VRAM match the extracted
// tileset/frame2 assets exactly (64/64 tiles), and which one.
const beforeVsTileset = tilesEqual(beforeTick.tiles, murkrow.tileset);
const beforeVsFrame2 = tilesEqual(beforeTick.tiles, murkrow.frame2);
const midVsTileset = tilesEqual(frame2Tick.tiles, murkrow.tileset);
const midVsFrame2 = tilesEqual(frame2Tick.tiles, murkrow.frame2);
const afterVsTileset = tilesEqual(afterTick.tiles, murkrow.tileset);
const afterVsFrame2 = tilesEqual(afterTick.tiles, murkrow.frame2);

check("RAM 17010 (pre-intro): VRAM is byte-exact `tileset` (64/64), NOT `frame2`", beforeVsTileset === 64 && beforeVsFrame2 !== 64, `tileset=${beforeVsTileset}/64, frame2=${beforeVsFrame2}/64`);
check("RAM 17019 (first frame2 tick, engine render 17020 = TURN13_MURKROW_STRETCH_TICK): VRAM is byte-exact `frame2` (64/64), NOT `tileset`", midVsFrame2 === 64 && midVsTileset !== 64, `frame2=${midVsFrame2}/64, tileset=${midVsTileset}/64`);
check("RAM 17034 (first tileset-again tick, engine render 17035, one past TURN13_MURKROW_FRAME_FLIP_TICK=17034): VRAM is byte-exact `tileset` (64/64) again, NOT `frame2`", afterVsTileset === 64 && afterVsFrame2 !== 64, `tileset=${afterVsTileset}/64, frame2=${afterVsFrame2}/64`);

// This is the crux: frame2 is real, byte-exact, and genuinely used by the
// hardware - just for a narrower and differently-placed window than the
// current `t < TURN13_MURKROW_FRAME_FLIP_TICK ? 0 : 1` step function
// implements. No new/corrected tile data is needed - the fix is a pure
// selection-window rewrite reusing the two already-named tick constants:
//   turn13MurkrowFrame(t) = (t >= TURN13_MURKROW_STRETCH_TICK && t <= TURN13_MURKROW_FRAME_FLIP_TICK) ? 1 : 0
check("wrong-asset theory REFUTED: frame2's own extracted bytes are exactly what VRAM shows when frame2 is live - the bug is the selection window, not the asset", midVsFrame2 === 64, `frame2 match at the one live tick was ${midVsFrame2}/64`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
