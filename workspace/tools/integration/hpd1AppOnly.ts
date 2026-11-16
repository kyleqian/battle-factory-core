// hpd1: render only the app side of a compare trace (the ROM frames are fixed receipts), writing app-NNNNN.png into <outDir>.
//   node --experimental-strip-types --no-warnings tools/integration/hpd1AppOnly.ts <trace.json> <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { renderAppTrace } from "../compare/appTrace.ts";
import { loadCompareTrace } from "../compare/traceFile.ts";

const [tracePath, outDir] = process.argv.slice(2) as [string, string];
mkdirSync(outDir, { recursive: true });
const captures = await renderAppTrace(loadCompareTrace(tracePath));
for (const capture of captures) {
  const png = new PNG({ width: 240, height: 160 });
  capture.rgba.forEach((value, index) => (png.data[index] = value));
  writeFileSync(join(outDir, `app-${String(capture.frame).padStart(5, "0")}.png`), PNG.sync.write(png));
}
