/** prep18: can the Dig UNLEASH body's history inputs be chained from the SETUP reducer's own end state (no ROM snapshot)?
 *  Compares digAtAge(setupInputs, lastAge) -> unleash inputs (scanline witness, attacker visibility/matrix, BG offset, matrix bitmap), both sides.
 *  run: npx vite-node tools/integration/prep18DigChain.ts [out.json] */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { digAtAge, DIG_SETUP_FIRST_INACTIVE_AGE } from "../../src/animation/dig.ts";
import { digInputsFor, type DigOrientation } from "../compare/verifyDigReducer.ts";

const out: Record<string, unknown> = {};
for (const [side, file] of [["player-back", "player"], ["opponent-front", "opponent"]] as [DigOrientation, string][]) {
  const rows = JSON.parse(gunzipSync(readFileSync(`tools/compare/evidence/dig-${file}-dense-state.json.gz`)).toString("utf8")).frames;
  const setup = digInputsFor(rows, side, "setup"), unleash = digInputsFor(rows, side, "unleash");
  const last = digAtAge(DIG_SETUP_FIRST_INACTIVE_AGE, setup);
  const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const sc = last.scanline, u = unleash.initialScanline;
  const r = {
    scanlineStateEqual: sc.state === u.state, srcBufferEqual: sc.srcBuffer === u.srcBuffer, dmaDestEqual: sc.dmaDest === u.dmaDest, dmaControlEqual: sc.dmaControl === u.dmaControl,
    scanlineBuffersEqual: eq(sc.buffers, u.buffers), attackerHiddenAtSetupEnd: !last.attacker.visible, unleashAttackerInitialVisible: unleash.attackerInitialVisible,
    setupEndAttackerMatrixNum: last.attacker.matrixNum, unleashAttackerInitialMatrixNum: unleash.attackerInitialMatrixNum, setupCleanupMatrixNum: setup.attackerCleanupMatrixNum,
    setupEndBgScroll: last.background.scroll, unleashSetupBgOffset: unleash.setupBgOffset, setupEndMatrixBitmap: last.resources.allocator.matrixBitmap, unleashInitialMatrixBitmap: unleash.initialMatrixBitmap,
    setupEndOrderOwned: last.order.ownedSlots.length,
  };
  out[side] = r; console.log(side, JSON.stringify(r));
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
