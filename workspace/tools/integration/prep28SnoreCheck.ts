// prep28: Snore (173) after Sleep Powder (79), replayed through the production transform over the two measured Snore ROM scenarios
// (committed ext table: opponent / player Snore user, Sealeo vs Venomoth).  The mv-0 bodies between the Sleep Powder and the Snore have exactly the
// STATUS_SLP plan shape (`Cf;Cf;D0`: two sleep-Z creates, one destroy) and are fed as status-animation SLP (the sleep inflict and the asleep check);
// any other shape invalidates; a lone single-destroy gap window is the transform's own survivor carry.  Reports the lend at the Snore edge (known? equals the ROM free order?).
//   run: node --experimental-strip-types tools/integration/prep28SnoreCheck.ts <out.json>   (master src = before; temporary patch applied = after)
import { readFileSync, writeFileSync } from "node:fs";
import { applySpriteOrderPresentationEvent, createSpriteOrderTracker, type SpriteOrderTracker } from "../../src/engine/spriteOrderEventTransform.ts";
import { knownEntrySpriteOrderState } from "../../src/engine/spriteOrderProvider.ts";

interface W { C?: [number, string][]; D?: number[] }
const sc = (JSON.parse(readFileSync(new URL("./fixtures/sprite-order-body-events-ext.json", import.meta.url), "utf8")).scenarios as any[]).filter(s => s.file.startsWith("173-mechanic-snore-"));
const shape = (ws: W[]) => ws.map(w => `${w.C ? "C" + w.C.length : ""}${w.D ? "D" + w.D.length : ""}`).join(";");
const out: unknown[] = [];
for (const s of sc) {
  let t: SpriteOrderTracker = createSpriteOrderTracker(knownEntrySpriteOrderState("battle-lab-ordinary-singles"));
  const gapEvent = (ws: W[]): SpriteOrderTracker => {
    let n = t;
    for (let i = 0; i < ws.length;) {
      const w = ws[i]!, f = ws[i + 1], c = (w.C ?? []).map(x => x[0]);
      if (!w.C && w.D && w.D.length === 1) { i += 1; continue; } // the carried destroy of the single survivor of the previous plan (applied by the transform itself)
      const pair = f && !f.C && f.D && !w.D && f.D.length === c.length && c.every(x => f.D!.includes(x));
      if (c.length === 1 && pair) { n = applySpriteOrderPresentationEvent(n, { kind: "hit-animation", targetVisible: true }); i += 2; }
      else if (c.length === 2 && pair) { n = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(n, { kind: "action-prompt" }), { kind: "actions-committed" }); i += 2; }
      else return applySpriteOrderPresentationEvent(n, { kind: "invalidate", reason: "gap" });
    }
    return n;
  };
  const rows: unknown[] = [];
  s.units.forEach((u: any) => {
    if (u.kind === "gap") { t = gapEvent(u.windows); return; }
    const mv = u.mv ?? 0;
    const side = mv === s.move ? s.side : s.side === "opponent" ? "player" : "opponent";
    const known = t.cursor.order.known;
    rows.push({ mv, side, shape: shape(u.windows), known, exact: known ? JSON.stringify(t.cursor.order.free) === JSON.stringify(u.observedFreeAtEdge) : null });
    if (u.truncated) { t = applySpriteOrderPresentationEvent(t, { kind: "invalidate", reason: "truncated" }); return; }
    t = applySpriteOrderPresentationEvent(t, mv === 0 ? (shape(u.windows) === "C1;C1;D1" ? { kind: "status-animation", status: "SLP" } : { kind: "invalidate", reason: "mv-0" })
      : { kind: "move-animation", moveId: mv, attackerSide: side });
  });
  out.push({ file: s.file, edges: rows });
}
writeFileSync(process.argv[2]!, JSON.stringify(out, null, 1) + "\n");
for (const o of out as any[]) console.log(o.file.slice(0, 50), o.edges.map((e: any) => `${e.mv}:${e.known ? (e.exact ? "exact" : "MISMATCH") : "unknown"}`).join(" "));
