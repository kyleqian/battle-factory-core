// Instrument rung (this session): re-probes MOVE_CONFUSION's full shake
// window (both window 1's attacker AnimTask_ShakeMon2 and window 2's target
// AnimTask_ShakeMon) via the already-committed
// `tools/probe/dump-scale-window-oam-scanline.py`, and pins the exact
// relationship between the sprite struct's own `x2` RAM field and the SAME
// struct's OAM-shadow `attr1` x bitfield (`oamX`), read at the identical
// instant (not a display-timing artifact - both come from one probe read).
//
// Usage (from the run root, mgba-enabled interpreter required):
//   python3 tools/run-mgba-probe.py <fresh.json> -- \
//     <mgba-python> tools/probe/dump-scale-window-oam-scanline.py \
//     tools/battle-lab/mechanic-confusion-kadabra-onix.json <fresh.json> \
//     110 185 118,146 <rgbDir>
//   node tools/compare/scratch/confusion-oam-shadow-lag-probe.mjs <fresh.json>
//
// Result (recorded here for reproducibility, see ANIMATION_PROGRESS.md):
// oamX(tick) == x(tick) + x2(tick-1) + centerToCornerVecX(tick) holds for
// 28/29 window-2 ticks (146-174) and 17/18 window-1 ticks (118-135) - the
// lone miss each time is the task's OWN creation tick (146 and 118
// respectively), already absorbed elsewhere by confusion.ts's own "+1"
// creation-anchor idiom. A real, uniform ONE-tick OAM-copy latency between
// the shake task's RAM x2 write and the OAM shadow struct, present on BOTH
// windows alike - contradicting `sceneOnConfusionView`'s old "window 2
// needs no lag" claim, which rested on a 13/30 sampled-pixel check at a
// single tick near the scale curve's extremum (where a small lag error is
// nearly invisible), not a dense per-tick sweep.
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) throw new Error("usage: confusion-oam-shadow-lag-probe.mjs <probe-output.json>");
const data = JSON.parse(readFileSync(path, "utf8"));

function checkWindow(label, spriteKey, minTick, maxTick) {
  const byTick = new Map(data.ticks.map((row) => [row.tick, row[spriteKey]]));
  const rows = data.ticks.filter((row) => row.tick >= minTick && row.tick <= maxTick);
  for (const shift of [0, 1, 2]) {
    let matches = 0;
    let total = 0;
    const misses = [];
    for (const row of rows) {
      const cur = row[spriteKey];
      const shifted = byTick.get(row.tick - shift);
      if (!shifted) continue;
      total += 1;
      const expected = cur.x + shifted.x2 + cur.centerToCornerVecX;
      if (expected === cur.oamX) matches += 1;
      else misses.push(row.tick);
    }
    console.log(`${label} x2-lag shift=${shift}: ${matches}/${total} ticks match` + (shift === 1 ? ` (misses: ${misses.join(",") || "none"})` : ""));
  }
}

checkWindow("window1 (attacker AnimTask_ShakeMon2)", "playerSprite", 118, 135);
checkWindow("window2 (target AnimTask_ShakeMon)", "opponentSprite", 146, 174);
