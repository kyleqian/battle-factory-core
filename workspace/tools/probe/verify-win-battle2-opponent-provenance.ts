// Worktree-lane probe (2026-08-05, ISSUES #55/#73): verifies the ROM's real
// battle-2 opponent generation cursor, banked by
// tools/probe/dump-win-battle2-opponent-rng.py, reproduces LILIANA (trainer 9)
// and her exact party when fed to the ported generator.
//
// Probed ground truth (WIN GO ON route, battle-scene-off, committed fixture
// tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json):
//   selection pre-call cursor      0x7399e3ae   (GenerateOpponentMons entry, frame 6636)
//   selection post-call cursor     0x50f04e72   (frame-6636 end; 4 gapless draws)
//   trainer 9 LILIANA, sets [169, 170, 130] (KADABRA / WAILMER / NOSEPASS)
//   realized personalities         0x801d2ed7 / 0x0ffc69a4 / 0x1ae16fda
//   construction epoch             FillFactoryFrontierTrainerParty, frames 11313-11344
//                                   (32 frames; 112 personality draws + 32 ambient ticks)
//   per-mon construction cursors  [0x2f959df4, 0xbd6f8138, 0xde320f3a]
//
// Route's real parameters at the GO ON generation point:
//   factoryWinStreak 1 (after the battle-1 win), battleIndex 1,
//   storedTrainerIds [50] (battle-1 DESTIN), savedRentalSetIds = player's
//   three rentals + battle-1 opponent's three sets (SetRentalsToOpponentParty
//   at the post-win ReturnToRoomFromBattle script),
//   playerTrainerId 416_049_562 (0x18cc699a, the fixture save's OT id),
//   battleTowerLevel50WinStreak 0 (the retail fixed-IV bug reads the Tower
//   streak; only the Factory streak incremented on the win).
//
// Run: node --experimental-strip-types tools/probe/verify-win-battle2-opponent-provenance.ts
import { generateFactoryOpponent, adoptFactoryOpponentSchedule } from "../../src/engine/factoryOpponentGeneration.ts";

const SELECTION_CURSOR = 0x7399e3ae;
const CONSTRUCTION_CURSOR = 0x2f959df4;
const PER_MON_CONSTRUCTION_CURSORS = [0x2f959df4, 0xbd6f8138, 0xde320f3a] as const;
const REALIZED_PERSONALITIES = [0x801d2ed7, 0x0ffc69a4, 0x1ae16fda] as const;
const REALIZED_SETS = [169, 170, 130] as const;
const REALIZED_SPECIES = ["SPECIES_KADABRA", "SPECIES_WAILMER", "SPECIES_NUZLEAF"] as const;
const REALIZED_ITEMS = [214, 221, 142] as const;

let failures = 0;
function check(label: string, cond: boolean, detail: string): void {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${label} — ${detail}`);
  }
}

const baseParams = {
  factoryWinStreak: 1,
  battleIndex: 1,
  storedTrainerIds: [50] as const,
  savedRentalSetIds: [156, 149, 180, 188, 184, 135] as const,
  playerTrainerId: 416_049_562,
  battleTowerLevel50WinStreak: 0,
};

// 1. Selection-only: the probed pre-call cursor must reproduce trainer 9 and
//    the exact set ids. Personalities are NOT expected to match yet (the real
//    construction epoch is 32 frames later, interleaved with ambient ticks).
const selection = generateFactoryOpponent({
  rngValue: SELECTION_CURSOR,
  ...baseParams,
});
check("trainer id 9 (LILIANA)", selection.trainerId === 9, `got ${selection.trainerId}`);
check(
  "set ids [169, 170, 130]",
  selection.opponents.map((o) => o.setId).join(",") === "169,170,130",
  `got ${selection.opponents.map((o) => o.setId).join(",")}`,
);
check(
  "species KADABRA/WAILMER/NUZLEAF",
  selection.opponents.map((o) => o.speciesName).join(",") === REALIZED_SPECIES.join(","),
  `got ${selection.opponents.map((o) => o.speciesName).join(",")}`,
);
check(
  "items 214/221/142",
  selection.opponents.map((o) => o.itemId).join(",") === "214,221,142",
  `got ${selection.opponents.map((o) => o.itemId).join(",")}`,
);
check(
  "selection cursor chains to 0x50f04e72",
  selection.selectionRngValue === 0x50f04e72,
  `got ${selection.selectionRngValue.toString(16)}`,
);

// Document the personality divergence when fed ONLY the selection cursor.
const selectionOnly = selection.opponents.map((o) => o.personality);
check(
  "selection-only personalities DO NOT match realized (documented gap)",
  selectionOnly[0] !== REALIZED_PERSONALITIES[0],
  `unexpectedly matched ${selectionOnly[0].toString(16)}`,
);
console.log(
  `INFO  selection-only personalities: ${selectionOnly.map((p) => p.toString(16)).join(", ")} ` +
  `(realized ${REALIZED_PERSONALITIES.map((p) => p.toString(16)).join(", ")})`,
);

// 2. With the construction entry cursor: mon 0 (KADABRA) completes within its
//    own frame (contiguous 26 draws) so it MUST match; mon 1 must diverge
//    because 9 ambient VBlank ticks interleave before it.
const withConstruction = generateFactoryOpponent({
  rngValue: SELECTION_CURSOR,
  constructionRngValue: CONSTRUCTION_CURSOR,
  ...baseParams,
});
const constructionOnly = withConstruction.opponents.map((o) => o.personality);
check(
  "mon 0 KADABRA personality matches from construction cursor",
  constructionOnly[0] === REALIZED_PERSONALITIES[0],
  `got ${constructionOnly[0].toString(16)}, realized ${REALIZED_PERSONALITIES[0].toString(16)}`,
);
check(
  "mon 1 WAILMER personality diverges from construction cursor (9 interleaved ambient ticks)",
  constructionOnly[1] !== REALIZED_PERSONALITIES[1],
  `unexpectedly matched ${constructionOnly[1].toString(16)}`,
);
console.log(
  `INFO  construction-cursor personalities: ${constructionOnly.map((p) => p.toString(16)).join(", ")}`,
);

// 3. Per-mon construction cursors (adoptFactoryOpponentSchedule): the ported
//    algorithm must reproduce ALL THREE realized personalities byte-for-byte,
//    proving the divergence is purely the inter-mon ambient interleaving.
const adopted = adoptFactoryOpponentSchedule({
  factoryWinStreak: 1,
  battleIndex: 1,
  storedTrainerIds: [50] as const,
  savedRentalSetIds: [156, 149, 180, 188, 184, 135] as const,
  playerTrainerId: 416_049_562,
  battleTowerLevel50WinStreak: 0,
  trainerId: 9,
  setIds: REALIZED_SETS,
  selectionDrawLedger: selection.drawLedger.filter((d) => d.phase !== "personality"),
  constructionRngValues: PER_MON_CONSTRUCTION_CURSORS,
});
const adoptedPersonalities = adopted.opponents.map((o) => o.personality);
for (let i = 0; i < 3; i += 1) {
  check(
    `mon ${i} ${REALIZED_SPECIES[i]} personality matches realized`,
    adoptedPersonalities[i] === REALIZED_PERSONALITIES[i],
    `got ${adoptedPersonalities[i].toString(16)}, realized ${REALIZED_PERSONALITIES[i].toString(16)}`,
  );
}
check(
  "adopted trainer id 9",
  adopted.trainerId === 9,
  `got ${adopted.trainerId}`,
);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
