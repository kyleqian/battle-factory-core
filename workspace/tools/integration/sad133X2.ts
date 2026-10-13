// sad133 (docs/sad133-status-animation-render-2.md) step 3: the production x2 tracker (liveBattlerX2History.ts, sar131's rows: CURSED /
// NIGHTMARE zeroed, CONFUSION / FRZ keep) after each stp128 ROM window vs the ROM. Per window: the tracked history before (the
// window's input, sad133X2Zeroed), the event applied, the predicted x2 of both battlers (the opponent's tracked front idle rest; the
// player has no idle offset) and the ROM's x2 on the window's last row (release + 2; no later script row writes a battler's x2 before
// the next body). Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/sad133X2.ts <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import { sad133Window, sad133X2Zeroed, STP128, type Sad133RomWindow } from "./sad133Windows.ts";
import { applyLiveBattlerX2Event, liveMoveBattlerX2Input, type LiveBattlerX2History } from "../../src/engine/liveBattlerX2History.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";

const rom = JSON.parse(readFileSync(`${STP128}/rom-windows.json`, "utf8")) as { windows: Record<string, Sad133RomWindow> };
const out: Record<string, unknown> = {};
let windows = 0, matches = 0;
const byClass: Record<string, number> = {};
for (const [key, w] of Object.entries(rom.windows)) {
  windows++;
  const zeroed = sad133X2Zeroed(w);
  const before: LiveBattlerX2History = { player: "idle", opponent: zeroed.includes("opponent") ? "zeroed" : "idle" };
  const after = applyLiveBattlerX2Event(before, { kind: "status-animation", side: w.side, animation: w.animation });
  const fieldArt = sad133Window(w, zeroed).viewAt(0).fieldArt;
  const rest = liveBattlerAnchors("opponent", fieldArt, liveMoveBattlerX2Input(after) ?? { zeroed: [] }).frontIdleRest;
  const last = w.rows[w.rows.length - 1]!;
  const romX2 = { player: w.side === "player" ? last.bat[2] : last.other[2], opponent: w.side === "opponent" ? last.bat[2] : last.other[2] };
  const predicted = { player: 0, opponent: rest.x2 };
  const ok = romX2.player === predicted.player && romX2.opponent === predicted.opponent;
  if (ok) matches++;
  const cls = `${w.animation}:${after[w.side]}`;
  byClass[cls] = (byClass[cls] ?? 0) + 1;
  out[key] = { animation: w.animation, side: w.side, before, after, predicted, romX2AtReleasePlus2: romX2, romRel: last.rel, ok };
}
out.summary = { windows, matches, byAnimationAndTrackedState: byClass };
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1) + "\n");
console.log(`x2 tracker vs ROM after the window: ${matches} / ${windows}`, JSON.stringify(byClass));
