// sar131: the production x2 tracker (liveBattlerX2History.ts) over a sar131Rom.py scenario's ROM events (bodies, status animations).
import { applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE, type LiveBattlerX2History } from "../../src/engine/liveBattlerX2History.ts";

/** The production tracker over the ROM's events before row `before` (base-x2: the base tree's status-animation rule, unknown). */
export function sar131HistoryBefore(scen: any, before: number, baseRule = false): LiveBattlerX2History {
  const events: [number, (h: LiveBattlerX2History) => LiveBattlerX2History][] = [];
  for (const b of scen.bodies) events.push([b.R, (h) => applyLiveBattlerX2Event(h, { kind: "move-body", moveId: b.mv, attackerSide: b.atk === 0 ? "player" : "opponent" })]);
  for (const w of scen.windows) {
    const side = w.battler === 0 ? "player" as const : "opponent" as const;
    events.push([w.R, (h) => applyLiveBattlerX2Event(h, baseRule
      ? { kind: "unknown", side, reason: "status animation" } : { kind: "status-animation", side, animation: w.animation })]);
  }
  let h = LIVE_BATTLER_X2_IDLE;
  for (const [r, f] of events.sort((x, y) => x[0] - y[0])) if (r < before) h = f(h);
  return h;
}
