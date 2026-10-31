// cff232: Scene OFF ROM receipts + PNG strips of the CASTFORM_CHANGE morph, one per class (cff230's three). Per row of the window (the
// anchor command's first row .. the "transformed" print's last row) the ROM lab frames (battle-scene-off, cff232OffCapture.ts) are hashed in the
// Castform box and in the text box; tests/cff232CastformOff.test.ts replays the production renderer (Scene OFF census routes) against them.
//   node --experimental-strip-types --no-warnings tools/integration/cff232Fixtures.ts --hail=/tmp/cff232/hail-off --rain-opp=/tmp/cff232/rain-opp-off --send-in=/tmp/cff232/send-in-off
import { writeFileSync } from "node:fs";
import { CASTFORM_CHANGE_COMMAND_FRAMES } from "../../src/engine/liveTransform.ts";
import { boxHash, writeStripPng } from "./cff230Fixtures.ts";
import { CFF232_CLASSES } from "./cff232Classes.ts";
import { TEXT_BOX, romFrame } from "./cff232Compare.ts";
import { cff230Route } from "./cff230Route.ts";

export const CFF232_DIR = "tools/integration/fixtures/castform-forms/off";
export const cff232Rows = (c: (typeof CFF232_CLASSES)[number]) => c.leadRows + CASTFORM_CHANGE_COMMAND_FRAMES + c.tailRows;

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  for (const c of CFF232_CLASSES) {
    const seg = cff230Route(c.seed, true, 1, "off").segments[0]!;
    const anchor = seg.frames.findIndex((f) => f.command === c.anchorCommand);
    const romFrom = c.romCommandStart - c.leadRows, rom = arg(c.lab)!;
    const box: string[] = [], text: string[] = [], strip: { r: Uint8Array; o: Uint8Array }[] = [];
    let mismatched = 0;
    for (let k = 0; k < cff232Rows(c); k++) {
      const r = romFrame(rom, romFrom + k), o = seg.frames[anchor + k]!.rgba;
      box.push(boxHash(r, c.box)); text.push(boxHash(r, TEXT_BOX));
      if (box.at(-1) !== boxHash(o, c.box) || text.at(-1) !== boxHash(o, TEXT_BOX)) mismatched++;
      const morphRow = k - c.leadRows;
      if (morphRow >= 0 && morphRow < CASTFORM_CHANGE_COMMAND_FRAMES && morphRow % 6 === 0) strip.push({ r, o });
    }
    writeStripPng(`${CFF232_DIR}/${c.name}.png`, c.box, strip);
    writeFileSync(`${CFF232_DIR}/${c.name}.json`, JSON.stringify({
      ...c, romFrames: `oracle battle-scene-off lab frames ${romFrom}..${romFrom + cff232Rows(c) - 1}`, mismatchedRows: mismatched, romBoxHashes: box, romTextHashes: text,
    }, null, 1) + "\n");
    console.log(c.name, "rows", cff232Rows(c), "mismatched", mismatched);
  }
}
