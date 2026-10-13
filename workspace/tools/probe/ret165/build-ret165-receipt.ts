/**
 * ret165 (ISSUES #165) receipt: compares the Battle Scene OFF oracle's Factory
 * party records (RAM: gPlayerParty / gEnemyParty / gBattleMons, read by the
 * battle lab) against the raw gFacilityTrainerMons sets and against the TS
 * builder (createFactoryCorpusPartyMember).
 *
 * Usage:
 *   bin/oracle lab tools/probe/ret165/ret165-return-carriers-off.json -o <dirA>
 *   bin/oracle lab tools/probe/ret165/ret165-opponent-return-carrier-off.json -o <dirB>
 *   node tools/probe/ret165/build-ret165-receipt.ts <dirA> <dirB> <out.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createFactoryCorpusPartyMember } from "../../../src/engine/factoryCorpusParty.ts";

type RomPartyRecord = {
  species: number; moves: number[]; pp: number[]; friendship: number; personality: number;
  ivs: { hp: number; attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
  abilitySlot: 0 | 1; otId: number;
};
type Manifest = {
  battleLab: { player: { setId: number; moves: number[] }[]; opponent: { setId: number; moves: number[] }[] };
  captures: {
    frame: number; sha256: string; file: string;
    state: {
      battlers: Record<"player" | "opponent", { species: number; moves: number[]; pp: number[]; friendship: number }>;
      parties: Record<"player" | "opponent", RomPartyRecord[]>;
    };
  }[];
};

const [dirA, dirB, out] = process.argv.slice(2);
if (!dirA || !dirB || !out) throw new Error("usage: build-ret165-receipt.ts <dirA> <dirB> <out.json>");

function side(manifest: Manifest, which: "player" | "opponent") {
  const state = manifest.captures[0]!.state;
  return manifest.battleLab[which].map((raw, index) => {
    const rom = state.parties[which][index]!;
    const ts = createFactoryCorpusPartyMember({
      setId: raw.setId, personality: rom.personality >>> 0, fixedIv: rom.ivs.attack, ivs: rom.ivs,
      abilitySlot: rom.abilitySlot, otId: rom.otId >>> 0,
    });
    return {
      setId: raw.setId,
      rawTableMoves: raw.moves,
      romPartyMoves: rom.moves,
      romPartyPp: rom.pp,
      romPartyFriendship: rom.friendship,
      tsMoves: [...ts.moves],
      tsPp: [...ts.pp],
      tsFriendship: ts.friendship,
      carriesReturn: raw.moves.includes(216),
      romMatchesAvoidReturn: rom.moves.every((move, slot) => move === (raw.moves[slot] === 216 ? 218 : raw.moves[slot])),
      tsMatchesRom: JSON.stringify([...ts.moves]) === JSON.stringify(rom.moves)
        && JSON.stringify([...ts.pp]) === JSON.stringify(rom.pp) && ts.friendship === rom.friendship,
    };
  });
}

function lab(dir: string, label: string) {
  const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, "utf8")) as Manifest;
  const battlers = manifest.captures[0]!.state.battlers;
  return {
    label,
    activeGBattleMons: {
      player: { species: battlers.player.species, moves: battlers.player.moves, pp: battlers.player.pp, friendship: battlers.player.friendship },
      opponent: { species: battlers.opponent.species, moves: battlers.opponent.moves, pp: battlers.opponent.pp, friendship: battlers.opponent.friendship },
    },
    player: side(manifest, "player"),
    opponent: side(manifest, "opponent"),
    captures: manifest.captures.map(({ frame, sha256, file }) => ({ frame, sha256, file })),
  };
}

const labs = [
  lab(dirA, "ret165-return-carriers-off (player GYARADOS 459 / EXEGGUTOR 534 / FEAROW 567)"),
  lab(dirB, "ret165-opponent-return-carrier-off (opponent GYARADOS 747 lead; player EXEGGUTOR 534 / FEAROW 567)"),
];
const members = labs.flatMap((entry) => [...entry.player, ...entry.opponent]);
const receipt = {
  schema: "ret165-return-to-frustration/v1",
  issue: "#165",
  oracleProfile: "battle-scene-off",
  source: "battle_factory.c:913-919 SetMonMoveAvoidReturn; callers battle_factory.c:461 / :822, battle_tower.c:1880, battle_factory_screen.c:1774",
  ramSource: "../oracle/battle_lab.py reads gBattleMons (0x2024084 + battler * BATTLE_MON_SIZE; friendship +0x2B) and the decrypted party records",
  verdict: {
    returnCarriers: members.filter((member) => member.carriesReturn).length,
    allRomRecordsMatchAvoidReturn: members.every((member) => member.romMatchesAvoidReturn),
    allFriendshipZero: members.every((member) => member.romPartyFriendship === 0),
    tsBuilderMatchesRomEveryMember: members.every((member) => member.tsMatchesRom),
    romMoveMenuText: "frame 41 of ret165-return-carriers-off: FRUSTRATION / BITE / THUNDER WAVE / DRAGON DANCE, PP 20/20 (PNG read)",
  },
  labs,
};
writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt.verdict));
