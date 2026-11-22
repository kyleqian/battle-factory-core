// opl4: the engine's generation against the ROM generation lab (tools/openlevel/romGenLab.py, README.md in this folder).
// For every lab sample the engine runs the same source functions from the same inputs: GenerateInitialRentalMons from the deal cursor
// (generateInitialFactoryRentals), GenerateOpponentMons from the opponent cursor (generateFactoryOpponent: the trainer roll and the three
// set ids, avoiding the six rentals' species and the prior trainers), and with --build the select screen's six
// (CreateFrontierFactorySelectableMons from the construction cursor: personality, nature, level, experience, IVs, stats, moves, item,
// ability bit). Prints one line per sample and a summary; exit 1 on any difference.
//
//   node --experimental-strip-types --no-warnings tools/openlevel/genLabCompare.ts LAB_OUT.json [--json OUT.json]
import { readFileSync, writeFileSync } from "node:fs";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { generateFactoryOpponent } from "../../src/engine/factoryOpponentGeneration.ts";
import { generateInitialFactoryRentals } from "../../src/engine/factoryRentalGeneration.ts";

const ROM_PLAYER_TRAINER_ID = 416_049_562; // the oracle save's T1_READ_32(playerTrainerId) (the lab's OT ids)

type Sample = {
  inputs: {
    name?: string; lvlMode: 0 | 1; winStreak: number; rentsCount: number; battleNum: number; dealCursor: string;
    opponentCursor?: string; constructionCursor?: string; towerLv50Streak?: number; priorTrainerIds?: number[];
  };
  romBefore: { trainerIds: number[] };
  deal: { rentalSetIds: number[]; entry: { rng: string }; return: { rng: string } };
  opponent: { trainerId: number; opponentSetIds: number[]; entry: { rng: string }; trainerIdsBefore: number[] };
  build?: {
    entry: { rng: string };
    mons: Array<{
      setId: number; personality: number; level: number; experience: number; ivs: number[];
      stats: { maxHP: number; attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
      moves: number[]; heldItem: number; abilityNum: number; otId: number;
    }>;
  };
};

const args = process.argv.slice(2);
const lab = JSON.parse(readFileSync(args[0]!, "utf8")) as { build: boolean; keepVblank: boolean; samples: Sample[] };
if (lab.keepVblank) throw new Error("genLabCompare: a --keep-vblank build interleaves the overworld VBlank draws; compare a default (undone) build");
const u32 = (hex: string) => Number.parseInt(hex, 16) >>> 0;
const rows: unknown[] = [];
let bad = 0;
for (const sample of lab.samples) {
  const i = sample.inputs;
  const lvlMode = i.lvlMode === 1 ? "open" as const : "50" as const;
  const rentalInput = {
    rngValue: u32(sample.deal.entry.rng), factoryWinStreak: i.winStreak, rentsCount: i.rentsCount, playerTrainerId: ROM_PLAYER_TRAINER_ID,
    ...(lvlMode === "open" ? { lvlMode } : {}),
  };
  const deal = generateInitialFactoryRentals(rentalInput);
  const diffs: string[] = [];
  const engIds = deal.rentals.map((r) => r.setId);
  if (JSON.stringify(engIds) !== JSON.stringify(sample.deal.rentalSetIds)) diffs.push(`rentals rom ${sample.deal.rentalSetIds} engine ${engIds}`);
  if ((deal.selectionRngValue >>> 0) !== u32(sample.deal.return.rng)) diffs.push(`deal end cursor rom ${sample.deal.return.rng} engine 0x${(deal.selectionRngValue >>> 0).toString(16)}`);
  // GenerateOpponentMons: the trainer ids it compares are trainerIds[0 .. battleNum-1] as the ROM holds them before the roll
  const prior = (sample.opponent.trainerIdsBefore ?? sample.romBefore.trainerIds).slice(0, i.battleNum);
  const opp = generateFactoryOpponent({
    rngValue: u32(sample.opponent.entry.rng), factoryWinStreak: i.winStreak, battleIndex: i.battleNum, storedTrainerIds: prior,
    savedRentalSetIds: sample.deal.rentalSetIds, playerTrainerId: ROM_PLAYER_TRAINER_ID, battleTowerLevel50WinStreak: i.towerLv50Streak ?? 0,
    ...(lvlMode === "open" ? { lvlMode } : {}),
  });
  const engSets = opp.opponents.map((o) => o.setId);
  if (opp.trainerId !== sample.opponent.trainerId) diffs.push(`trainer rom ${sample.opponent.trainerId} engine ${opp.trainerId}`);
  if (JSON.stringify(engSets) !== JSON.stringify(sample.opponent.opponentSetIds)) diffs.push(`opponent sets rom ${sample.opponent.opponentSetIds} engine ${engSets}`);
  let built = 0;
  if (sample.build) {
    const rebuilt = generateInitialFactoryRentals({ ...rentalInput, constructionRngValue: u32(sample.build.entry.rng) });
    sample.build.mons.forEach((rom, k) => {
      const r = rebuilt.rentals[k]!;
      const m = createFactoryCorpusPartyMember(r);
      const eng = {
        setId: r.setId, personality: r.personality >>> 0, level: m.level, experience: m.experience,
        ivs: [m.ivs.hp, m.ivs.attack, m.ivs.defense, m.ivs.speed, m.ivs.spAttack, m.ivs.spDefense],
        stats: { maxHP: m.maxHP, attack: m.attack, defense: m.defense, speed: m.speed, spAttack: m.spAttack, spDefense: m.spDefense },
        moves: [...m.moves], heldItem: m.item, abilityNum: m.abilityNum, otId: r.otId >>> 0,
      };
      const romView = { setId: rom.setId, personality: rom.personality >>> 0, level: rom.level, experience: rom.experience, ivs: rom.ivs, stats: rom.stats,
        moves: rom.moves, heldItem: rom.heldItem, abilityNum: rom.abilityNum, otId: rom.otId >>> 0 };
      for (const key of Object.keys(eng) as (keyof typeof eng)[]) {
        if (JSON.stringify(eng[key]) !== JSON.stringify(romView[key])) diffs.push(`mon ${k} ${key} rom ${JSON.stringify(romView[key])} engine ${JSON.stringify(eng[key])}`);
      }
      built += 1;
    });
  }
  if (diffs.length) bad += 1;
  const name = i.name ?? `#${rows.length}`;
  rows.push({ name, lvlMode, winStreak: i.winStreak, rentsCount: i.rentsCount, battleNum: i.battleNum, same: diffs.length === 0, diffs });
  console.log(`${diffs.length ? "DIFF" : "same"}  ${name.padEnd(16)} L${lvlMode.padEnd(4)} streak ${String(i.winStreak).padStart(2)} rents ${String(i.rentsCount).padStart(2)} battle ${i.battleNum + 1}  `
    + `rentals ${engIds.join(",")}  trainer ${opp.trainerId} sets ${engSets.join(",")}${built ? `  built ${built}` : ""}${diffs.length ? `\n      ${diffs.join("\n      ")}` : ""}`);
}
console.log(`genLabCompare: ${lab.samples.length - bad} / ${lab.samples.length} samples identical (${lab.build ? "deal + opponent + select-screen build" : "deal + opponent"})`);
const outIndex = args.indexOf("--json");
if (outIndex >= 0) writeFileSync(args[outIndex + 1]!, JSON.stringify({ samples: lab.samples.length, identical: lab.samples.length - bad, rows }, null, 1));
process.exit(bad ? 1 : 0);
