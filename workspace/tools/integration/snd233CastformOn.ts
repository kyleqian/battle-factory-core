// snd233 Part A: the opponent (battler 1) Castform weather-loop receipt for Scene ON. ROM = battle-scene-on rain-opp lab frames
// (cff232OffCapture.ts --profile=battle-scene-on); ours = the Scene ON census route. Same window as cff232 (weather print .. "transformed" print).
//   node --experimental-strip-types --no-warnings tools/integration/snd233CastformOn.ts --rom=/tmp/snd233/rain-on
import { writeFileSync } from "node:fs";
import { CASTFORM_CHANGE_COMMAND_FRAMES } from "../../src/engine/liveTransform.ts";
import { boxHash, writeStripPng } from "./cff230Fixtures.ts";
import { CFF232_CLASSES } from "./cff232Classes.ts";
import { TEXT_BOX, romFrame } from "./cff232Compare.ts";
import { cff230Route } from "./cff230Route.ts";

export const SND233_ON_DIR = "tools/integration/fixtures/castform-forms/on";
export const SND233_ON_ROM_COMMAND_START = 346;
export const snd233OnClass = () => CFF232_CLASSES.find((c) => c.name === "opponent-water-after-rain-dance")!;
export const snd233OnRows = () => snd233OnClass().leadRows + CASTFORM_CHANGE_COMMAND_FRAMES + snd233OnClass().tailRows;

if (import.meta.url === `file://${process.argv[1]}`) {
  const rom = process.argv.find((a) => a.startsWith("--rom="))!.slice(6);
  const c = snd233OnClass();
  const seg = cff230Route(c.seed, true, 1, "on").segments[0]!;
  const anchor = seg.frames.findIndex((f) => f.command === c.anchorCommand);
  const romFrom = SND233_ON_ROM_COMMAND_START - c.leadRows;
  const box: string[] = [], text: string[] = [], strip: { r: Uint8Array; o: Uint8Array }[] = [];
  let mismatched = 0;
  for (let k = 0; k < snd233OnRows(); k++) {
    const r = romFrame(rom, romFrom + k), o = seg.frames[anchor + k]!.rgba;
    box.push(boxHash(r, c.box)); text.push(boxHash(r, TEXT_BOX));
    if (box.at(-1) !== boxHash(o, c.box) || text.at(-1) !== boxHash(o, TEXT_BOX)) mismatched++;
    const morphRow = k - c.leadRows;
    if (morphRow >= 0 && morphRow < CASTFORM_CHANGE_COMMAND_FRAMES && morphRow % 6 === 0) strip.push({ r, o });
  }
  writeStripPng(`${SND233_ON_DIR}/${c.name}.png`, c.box, strip);
  writeFileSync(`${SND233_ON_DIR}/${c.name}.json`, JSON.stringify({
    ...c, scene: "on", romFrames: `oracle battle-scene-on rain-opp lab frames ${romFrom}..${romFrom + snd233OnRows() - 1}`,
    mismatchedRows: mismatched, romBoxHashes: box, romTextHashes: text,
  }, null, 1) + "\n");
  console.log(c.name, "rows", snd233OnRows(), "mismatched", mismatched);
}
