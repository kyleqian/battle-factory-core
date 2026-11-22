// hdt2m: feed the engine's Head generator (generateFactoryBrainOpponent) the ROM's own gRngValue near FillFactoryBrainParty's entry, from the
// nrv1 ROM recordings, and compare the generated species with the ROM's enemyParty (docs/hdt1-factory-head-team.md "hdt2m").
//   node --experimental-strip-types tools/integration/hdt2mRomCursorHeadTeam.ts ROM.json...   (JSON lines; run from workspace/)
import { readFileSync } from "node:fs";
import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import { generateFactoryBrainOpponent } from "../../src/engine/factoryBrainOpponentGeneration.ts";

const speciesId = new Map<string, number>();
for (const m of readFileSync(new URL("../../reference/pokeemerald/include/constants/species.h", import.meta.url), "utf8").matchAll(/^#define (SPECIES_\w+)\s+(\d+)/gm)) speciesId.set(m[1]!, Number(m[2]));
const lcg = (x: number) => (Math.imul(x, 0x41c64e6d) + 0x6073) >>> 0;
const speciesOf = (setId: number) => speciesId.get(frontierMonsData.entries[setId]!.species) ?? -1;

for (const path of process.argv.slice(2)) {
  const rec = JSON.parse(readFileSync(path, "utf8"));
  const rom: number[] = rec.frames.map((r: { rng: number }) => r.rng >>> 0);
  const target: number[] = rec.enemyParty;
  const challenge: number = rec.challenge;
  const player = challenge >= 5 ? [564, 565, 566, 270, 271, 272] : [267, 268, 269, 270, 271, 272];
  // The build's entry is in a frame where the ROM's cursor leaves "one LCG step per frame" (a frame with non-VBlank draws); try them all.
  const offFrames: number[] = [];
  for (let i = 1; i < rom.length; i += 1) if (rom[i] !== lcg(rom[i - 1]!)) offFrames.push(i);
  const b = offFrames[0] ?? -1;
  const hits: { frame: number; k: number; species: number[]; lead2: boolean; all3: boolean }[] = [];
  let tried = 0;
  for (const f of offFrames) {
    let x = rom[f - 1]!;
    for (let k = 0; k <= 4; k += 1, x = lcg(x)) {
      tried += 1;
      const g = generateFactoryBrainOpponent({ rngValue: x, factoryWinStreak: challenge * 7, playerRentalSetIds: player, playerTrainerId: 0x89abcdef });
      const sp = g.opponents.map((o) => speciesOf(o.setId));
      const lead2 = sp[0] === target[0] && sp[1] === target[1];
      if (lead2 || sp[0] === target[0]) hits.push({ frame: f, k, species: sp, lead2, all3: lead2 && sp[2] === target[2] });
    }
  }
  // Interleaved model: the ROM draws once per VBlank between one Pokemon's build and the next set draw (9-12 frames, hdt1). Entry = frame 1018 / 657 (first
  // off-LCG frame after the room's last input), one step on; after each accepted Pokemon, skip m VBlank steps and draw the next.
  const buildFrame = offFrames.find((f) => f >= (challenge >= 5 ? 600 : 1000))!;
  const interleaved: { m1: number[]; m2: number[]; team: number[] }[] = [];
  const x0 = lcg(rom[buildFrame - 1]!);
  const first = generateFactoryBrainOpponent({ rngValue: x0, factoryWinStreak: challenge * 7, playerRentalSetIds: player, playerTrainerId: 0x89abcdef });
  const endOfFirst = (g: ReturnType<typeof generateFactoryBrainOpponent>, idx: number) => g.drawLedger.filter((l) => l.opponentIndex === idx).at(-1)!.rngAfter;
  if (speciesOf(first.opponents[0]!.setId) === target[0]) {
    const c1 = endOfFirst(first, 0);
    for (let m1 = 0, c = c1; m1 <= 24; m1 += 1, c = lcg(c)) {
      const g2 = generateFactoryBrainOpponent({ rngValue: c, factoryWinStreak: challenge * 7, playerRentalSetIds: player, playerTrainerId: 0x89abcdef });
      if (speciesOf(g2.opponents[0]!.setId) !== target[1]) continue;
      const c2 = endOfFirst(g2, 0);
      for (let m2 = 0, d = c2; m2 <= 24; m2 += 1, d = lcg(d)) {
        const g3 = generateFactoryBrainOpponent({ rngValue: d, factoryWinStreak: challenge * 7, playerRentalSetIds: player, playerTrainerId: 0x89abcdef });
        if (speciesOf(g3.opponents[0]!.setId) === target[2]) interleaved.push({ m1, m2, team: [target[0]!, target[1]!, target[2]!] });
      }
    }
  }
  console.log(JSON.stringify({ interleavedBuildFrame: buildFrame, leadMatches: speciesOf(first.opponents[0]!.setId) === target[0], engineBackToBack: first.opponents.map((o) => speciesOf(o.setId)), interleavedSkips: interleaved.map((i) => [i.m1, i.m2]).slice(0, 8), n: interleaved.length }));
  console.log(JSON.stringify({ rom: path.split("/").pop(), challenge, firstOffLcgFrame: b, offFrames: offFrames.length, romTarget: target, tried, hits }));
}
