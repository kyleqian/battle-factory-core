// PASS/FAIL internal-consistency check for the Noland (Frontier Brain)
// FillFactoryBrainParty ground-truth receipts captured by
// tools/probe/dump-noland-brain-party.py and committed at
// tools/probe/receipts/noland-brain-party-{silver,gold}.json.
//
// This does NOT touch the oracle or mGBA (per the step brief, this step
// never uses the HTTP oracle service) -- it purely re-reads the committed
// JSON and re-derives every claim from the recorded draw ledger and Random()
// call list, the same way a differential structure check against a ported
// TS engine module would: draw count reconciliation, fixed-IV uniformity,
// no duplicate species/items among the accepted trio, no player-rental
// monId ever accepted, and every accepted monId inside the challengeNum's
// real draw range (battle_factory.c:169-180).
//
// Run: node --experimental-strip-types tools/probe/verify-noland-brain-receipts.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RECEIPTS_DIR = path.join(HERE, "receipts");

// battle_factory.c:157-167.
const FIXED_IV_TABLE: readonly [number, number][] = [
  [3, 6], [6, 9], [9, 12], [12, 15], [15, 18], [21, 31], [31, 31], [31, 31],
];
// battle_factory.c:169-180 (Level 50 half, adder == 0).
const LEVEL_50_SET_RANGES: readonly [number, number][] = [
  [110, 199], [162, 266], [267, 371], [372, 467],
  [468, 563], [564, 659], [660, 755], [372, 849],
];
const FRONTIER_STAGES_PER_CHALLENGE = 7;
const SPECIES_UNOWN = 201;
const ITEM_NONE = 0;

interface PersonalityAttempt {
  frame: number;
  caller: string;
  pre: number;
  post: number;
}

interface DrawRecord {
  drawIndex: number;
  frame: number;
  monId: number;
  species: number;
  heldItem: number;
  outcome: string;
  acceptSlot?: number;
  personalityAttempts: PersonalityAttempt[];
}

interface EnemyMon {
  personality: number;
  otId: number;
  species: number;
  item: number;
  nature: number;
  friendship: number;
  moves: number[];
  evs: Record<string, number>;
  ivs: Record<string, number>;
  checksumValid: boolean;
}

interface Receipt {
  case: string;
  staged: {
    factoryWinStreakSingles50: number;
    curChallengeBattleNum: number;
    lvlModeBits: number;
    battleModeVar: number;
    trainerBattleOpponentA: number;
    rentalMons: number[];
    playerTrainerId: number;
    gRngValueAtStaging: number;
  };
  derived: { challengeNum: number; expectedFixedIV: number; monIdRange: { lo: number; hi: number } };
  fillEntry: { frame: number; rngAtEntry: number };
  fillReturn: { frame: number; rngAtReturn: number };
  rngValueBeforeFirstFactoryDraw: number;
  rngValueAfterLastConstructionDraw: number;
  randomCallCount: number;
  randomCalls: { frame: number; caller: string; pre: number; post: number }[];
  drawLedger: DrawRecord[];
  enemyParty: EnemyMon[];
}

const TRAINER_FRONTIER_BRAIN = 1022;

let failures = 0;
function check(label: string, condition: boolean, detail: string): void {
  if (condition) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL: ${label} -- ${detail}`);
  }
}

function verifyReceipt(name: string): void {
  const receiptPath = path.join(RECEIPTS_DIR, `noland-brain-party-${name}.json`);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Receipt;
  console.log(`\n${name} (${receiptPath}):`);

  check(
    "staged as TRAINER_FRONTIER_BRAIN",
    receipt.staged.trainerBattleOpponentA === TRAINER_FRONTIER_BRAIN,
    `trainerBattleOpponentA=${receipt.staged.trainerBattleOpponentA}`,
  );
  check(
    "staged Level 50 Singles",
    receipt.staged.lvlModeBits === 0 && receipt.staged.battleModeVar === 0,
    `lvlModeBits=${receipt.staged.lvlModeBits} battleModeVar=${receipt.staged.battleModeVar}`,
  );

  const expectedChallengeNum = Math.floor(receipt.staged.factoryWinStreakSingles50 / FRONTIER_STAGES_PER_CHALLENGE);
  check(
    "challengeNum == streak // 7",
    receipt.derived.challengeNum === expectedChallengeNum,
    `derived.challengeNum=${receipt.derived.challengeNum} expected=${expectedChallengeNum}`,
  );

  const fixedIvSetIndex = Math.min(receipt.derived.challengeNum + 2, FIXED_IV_TABLE.length - 1);
  const expectedFixedIv = FIXED_IV_TABLE[fixedIvSetIndex]![0];
  check(
    "expectedFixedIV == GetFactoryMonFixedIV(challengeNum + 2, FALSE)",
    receipt.derived.expectedFixedIV === expectedFixedIv,
    `derived.expectedFixedIV=${receipt.derived.expectedFixedIV} expected=${expectedFixedIv}`,
  );

  const [expectedLo, expectedHi] = LEVEL_50_SET_RANGES[receipt.derived.challengeNum]!;
  check(
    "monId draw range matches sInitialRentalMonRanges[challengeNum]",
    receipt.derived.monIdRange.lo === expectedLo && receipt.derived.monIdRange.hi === expectedHi,
    `monIdRange=${JSON.stringify(receipt.derived.monIdRange)} expected={lo:${expectedLo},hi:${expectedHi}}`,
  );

  const rejections = receipt.drawLedger.filter((d) => d.outcome !== "accept");
  const accepts = receipt.drawLedger.filter((d) => d.outcome === "accept");
  check("exactly 3 accepted draws", accepts.length === 3, `accepts=${accepts.length}`);

  // draw count = rejections + 3 accepts + personality draws (each personality
  // "draw" here is one Random() call inside CreateMonWithEVSpreadNatureOTID's
  // Random32()-retry loop, i.e. two per Random32() attempt).
  const personalityDrawCount = receipt.drawLedger.reduce((sum, d) => sum + d.personalityAttempts.length, 0);
  const factoryRelevantRandomCalls = receipt.randomCalls.filter(
    (c) => c.caller.startsWith("GetFactoryMonId") || c.caller.startsWith("CreateMonWithEVSpreadNatureOTID"),
  ).length;
  const reconstructedTotal = receipt.drawLedger.length + personalityDrawCount;
  check(
    "draw ledger count (monId draws + personality draws) == factory-attributed Random() calls",
    reconstructedTotal === factoryRelevantRandomCalls,
    `ledger monId draws=${receipt.drawLedger.length} + personality=${personalityDrawCount} = ${reconstructedTotal}, factory-attributed Random() calls=${factoryRelevantRandomCalls}`,
  );
  check(
    "draw count = rejections + 3 accepts + personality draws",
    rejections.length + 3 === receipt.drawLedger.length,
    `rejections=${rejections.length} accepts=${accepts.length} ledgerLength=${receipt.drawLedger.length}`,
  );
  // Every accepted mon's personality-retry loop performs at least one
  // Random32() attempt (>= 2 Random() calls), and every attempt is a pair.
  for (const draw of accepts) {
    check(
      `accept[${draw.acceptSlot}] (monId ${draw.monId}) personality draws are a positive even count`,
      draw.personalityAttempts.length > 0 && draw.personalityAttempts.length % 2 === 0,
      `count=${draw.personalityAttempts.length}`,
    );
  }
  // Rejected draws never reach CreateMonWithEVSpreadNatureOTID.
  for (const draw of rejections) {
    check(
      `reject[${draw.drawIndex}] (monId ${draw.monId}, ${draw.outcome}) has zero personality draws`,
      draw.personalityAttempts.length === 0,
      `count=${draw.personalityAttempts.length}`,
    );
  }

  check(
    "every accepted monId is inside the challengeNum draw range",
    accepts.every((d) => d.monId >= expectedLo && d.monId <= expectedHi),
    `monIds=${accepts.map((d) => d.monId).join(",")} range=[${expectedLo},${expectedHi}]`,
  );
  check(
    "no accepted monId is Unown",
    accepts.every((d) => d.species !== SPECIES_UNOWN),
    `species=${accepts.map((d) => d.species).join(",")}`,
  );
  check(
    "no accepted monId is one of the player's/pool's rentalMons",
    accepts.every((d) => !receipt.staged.rentalMons.includes(d.monId)),
    `accepted monIds=${accepts.map((d) => d.monId).join(",")} rentalMons=${receipt.staged.rentalMons.join(",")}`,
  );
  check(
    "no duplicate species among the 3 accepted draws",
    new Set(accepts.map((d) => d.species)).size === accepts.length,
    `species=${accepts.map((d) => d.species).join(",")}`,
  );
  const nonNoneItems = accepts.map((d) => d.heldItem).filter((item) => item !== ITEM_NONE);
  check(
    "no duplicate non-NONE held item among the 3 accepted draws",
    new Set(nonNoneItems).size === nonNoneItems.length,
    `items=${accepts.map((d) => d.heldItem).join(",")}`,
  );
  // Every explicitly-classified rejection must be individually justified by
  // the same rule the C source checks in that order (battle_factory.c:777-808).
  for (const draw of rejections) {
    if (draw.outcome === "reject_unown") {
      check(`reject[${draw.drawIndex}] Unown rejection is justified`, draw.species === SPECIES_UNOWN, `species=${draw.species}`);
    } else if (draw.outcome === "reject_player_rental_monid") {
      check(
        `reject[${draw.drawIndex}] rental-monId rejection is justified`,
        receipt.staged.rentalMons.includes(draw.monId),
        `monId=${draw.monId} rentalMons=${receipt.staged.rentalMons.join(",")}`,
      );
    }
  }

  check(
    "enemyParty has exactly 3 realized mons",
    receipt.enemyParty.length === 3,
    `length=${receipt.enemyParty.length}`,
  );
  check(
    "every realized mon has all six IVs fixed at expectedFixedIV",
    receipt.enemyParty.every((mon) => Object.values(mon.ivs).every((iv) => iv === receipt.derived.expectedFixedIV)),
    receipt.enemyParty.map((mon) => JSON.stringify(mon.ivs)).join(" | "),
  );
  check(
    "every realized mon has a valid box checksum",
    receipt.enemyParty.every((mon) => mon.checksumValid),
    receipt.enemyParty.map((mon) => mon.checksumValid).join(","),
  );
  check(
    "every realized mon's OT id matches the staged playerTrainerId",
    receipt.enemyParty.every((mon) => mon.otId === receipt.staged.playerTrainerId),
    `otIds=${receipt.enemyParty.map((mon) => mon.otId).join(",")} staged=${receipt.staged.playerTrainerId}`,
  );
  check(
    "every realized mon has friendship == 0",
    receipt.enemyParty.every((mon) => mon.friendship === 0),
    receipt.enemyParty.map((mon) => mon.friendship).join(","),
  );
  check(
    "realized species/order matches the accepted draw order",
    JSON.stringify(receipt.enemyParty.map((mon) => mon.species)) === JSON.stringify(accepts.map((d) => d.species)),
    `enemyParty species=${receipt.enemyParty.map((mon) => mon.species).join(",")} accepted species=${accepts.map((d) => d.species).join(",")}`,
  );
  check(
    "realized nature (personality % 25) matches every mon's held nature",
    receipt.enemyParty.every((mon) => mon.personality % 25 === mon.nature),
    receipt.enemyParty.map((mon) => `${mon.personality}%25=${mon.personality % 25}/${mon.nature}`).join(" | "),
  );

  const firstFactoryCall = receipt.randomCalls.find((c) => c.caller.startsWith("GetFactoryMonId"));
  check(
    "rngValueBeforeFirstFactoryDraw matches the first GetFactoryMonId-attributed Random() call's pre value",
    firstFactoryCall !== undefined && receipt.rngValueBeforeFirstFactoryDraw === firstFactoryCall.pre,
    `rngValueBeforeFirstFactoryDraw=${receipt.rngValueBeforeFirstFactoryDraw} firstFactoryCall.pre=${firstFactoryCall?.pre}`,
  );
  check(
    "gRngValue after last construction draw matches fillReturn.rngAtReturn",
    receipt.rngValueAfterLastConstructionDraw === receipt.fillReturn.rngAtReturn,
    `rngValueAfterLastConstructionDraw=${receipt.rngValueAfterLastConstructionDraw} fillReturn.rngAtReturn=${receipt.fillReturn.rngAtReturn}`,
  );

  console.log(`PASS ${name}: ${accepts.length} accepts, ${rejections.length} rejections, ${personalityDrawCount} personality draws, ${receipt.randomCallCount} total Random() calls observed in window.`);
}

for (const name of ["silver", "gold"]) {
  verifyReceipt(name);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
