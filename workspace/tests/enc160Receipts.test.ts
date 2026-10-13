import { describe, expect, it } from "vitest";
import hbenc from "../tools/probe/receipts/enc160-hbenc-hyperbeam-recharge-encore-off.json" with { type: "json" };
import c2ice from "../tools/probe/receipts/enc160-c2ice-iceball-encore-census771-off.json" with { type: "json" };
import fpenc from "../tools/probe/receipts/enc160-fpenc-focuspunch-encore-off.json" with { type: "json" };
import { BATTLE_SCRIPT_STATUS2_MASKS } from "../src/engine/battleScriptSourceConstants.ts";
import type { FactoryFullTurnBattlerConfig } from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { runPortTurns } from "../tools/probe/rcp154PortDriver.ts";
import { verifyReceipt } from "../tools/probe/verify-rcp154.ts";

/**
 * STEP enc160 (ISSUES #172, #140 family) -- a LOCKED + ENCORED battler takes
 * HandleAction_UseMove's STATUS2_MULTIPLETURNS / RECHARGE arm
 * (battle_util.c:107-110), which precedes the Encore arms (:111-128) and makes
 * no GetMoveTarget draw. Cmd_trysetencore (battle_script_commands.c:8017)
 * never checks for a lock, so the state is reachable (census 0..999 battle
 * 771). Receipts: stock ROM, Scene OFF, two byte-identical runs each. See
 * docs/enc160-locked-encore.md.
 */
type Receipt = Parameters<typeof verifyReceipt>[0];
type RomDraw = Readonly<{ rngBefore: number; value: number; callerFunction: string }>;

const LCG = (value: number) => (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;
const MOVE = { TACKLE: 33, HYPER_BEAM: 63, ENCORE: 227, ICE_BALL: 301 } as const;
const GET_MOVE_TARGET = "GetMoveTarget(MOVE_TARGET_SELECTED)";

const RECEIPTS = [
  ["enc160-hbenc: SNORLAX recharging after HYPER BEAM while Encored", hbenc],
  ["enc160-c2ice: SEALEO rolling ICE BALL while Encored (census 771 shape)", c2ice],
  ["enc160-fpenc control: SNORLAX Encored out of FOCUS PUNCH (no lock)", fpenc],
] as const;

const romCallers = (receipt: (typeof RECEIPTS)[number][1], turn: number) =>
  receipt.rom.turns[turn - 1]!.draws.map((draw) => draw.callerFunction);
const romTexts = (receipt: (typeof RECEIPTS)[number][1], turn: number) =>
  receipt.rom.turns[turn - 1]!.messages.map((message) => message.text);

describe("enc160 receipts -- provenance (committed JSON only)", () => {
  it.each(RECEIPTS)("%s is a reproducible Scene OFF ROM capture", (_name, receipt) => {
    expect(receipt.schema).toBe("rcp154-action-time-receipt/v1");
    expect(receipt.oracleProfile).toBe("battle-scene-off");
    expect(receipt.byteIdenticalAcrossRuns).toBe(true);
    expect(receipt.probeOutputSha256).toBe(receipt.probeOutputSha256Rerun);
    expect(receipt.drawCountCrossChecked).toBe(true);
    expect(receipt.attributionReconciled).toBe(true);
    for (const turn of receipt.rom.turns) {
      expect(turn.drawCount).toBe(turn.draws.length);
      expect(turn.draws.at(-1)?.callerFunction).toBe("BattleTurnPassed");
      for (const draw of turn.draws as readonly RomDraw[]) expect(draw.value).toBe(LCG(draw.rngBefore) >>> 16);
    }
    expect(receipt.comparison.verdictToday).toBe("PASS");
    expect(receipt.comparison.firstDivergence).toBeNull();
  });

  it("hbenc: the recharge turn dispatches HYPER BEAM with no GetMoveTarget; the next (unlocked) Encore turn pays it", () => {
    expect(romTexts(hbenc, 1)).toEqual(expect.arrayContaining(["SNORLAX used\nHYPER BEAM!", "SNORLAX got\nan ENCORE!"]));
    // Turn 2: RECHARGE-locked AND Encored (encoredMove HYPER BEAM).
    expect(romTexts(hbenc, 2)[0]).toBe("SNORLAX must\nrecharge!");
    expect(hbenc.rom.turns[1]!.actions[0]).toMatchObject({ attacker: 0, currentMove: MOVE.HYPER_BEAM, chosenMoveByBattler: 0 });
    expect(romCallers(hbenc, 2)).toEqual(["Cmd_accuracycheck", "BattleTurnPassed"]);
    // Turn 3: the lock is gone, the Encore remains -> :111-117 retargets.
    expect(romCallers(hbenc, 3).slice(0, 3)).toEqual(["GetMoveTarget", "GetMoveTarget", "GetMoveTarget"]);
    expect(hbenc.portSitesAtHead.preFix.firstDivergence).toMatchObject({ turn: 2, index: 0 });
  });

  it("c2ice: an Encore landing mid-roll leaves the ICE BALL lock in charge -- no GetMoveTarget on turn 3", () => {
    expect(romTexts(c2ice, 2)).toEqual(expect.arrayContaining(["SEALEO got\nan ENCORE!", "SEALEO used\nICE BALL!"]));
    expect(c2ice.rom.turns[2]!.actions.find((action) => action.attacker === 0))
      .toMatchObject({ currentMove: MOVE.ICE_BALL, chosenMoveByBattler: 0 });
    expect(romCallers(c2ice, 3)).not.toContain("GetMoveTarget");
    expect(c2ice.portSitesAtHead.preFix.firstDivergence).toMatchObject({ turn: 3, index: 1 });
  });

  it("fpenc control: no lock, so the mid-turn Encore takes the :111-117 arm and pays GetMoveTarget", () => {
    expect(fpenc.rom.turns[1]!.actions.find((action) => action.attacker === 0)).toMatchObject({ currentMove: MOVE.TACKLE });
    expect(romCallers(fpenc, 2)).toContain("GetMoveTarget");
    expect(fpenc.portSitesAtHead.preFix.verdict).toBe("PASS");
  });
});

describe("enc160 -- the full-turn kernel replays each receipt draw for draw", () => {
  it.each(RECEIPTS)("%s", (_name, receipt) => {
    const result = verifyReceipt(receipt as unknown as Receipt);
    expect(result.port.stoppedEarly).toBeNull();
    expect(result.comparison.firstDivergence).toBeNull();
    expect(result.comparison.portActiveHp).toEqual(result.comparison.romActiveHp);
    expect(result.comparison.portUsedMoveMessages).toEqual(result.comparison.romMoveDispatches);
    expect(result.pass).toBe(true);
  });
});

describe("enc160 -- actionRetargetsAtExecution honours the lock (staged one-turn kernel)", () => {
  // hbenc's turn-2 state staged directly: SNORLAX Encored into HYPER BEAM,
  // with or without the STATUS2_RECHARGE lock; WOBBUFFET slower (Encore x4).
  const [snorlax] = hbenc.parties.player;
  const [wobbuffet] = hbenc.parties.opponent;
  const staged = (mon: typeof snorlax, extra: Partial<FactoryFullTurnBattlerConfig>): FactoryFullTurnBattlerConfig => ({
    species: mon!.species, moveId: mon!.moves[0]!, moves: mon!.moves as unknown as [number, number, number, number],
    pp: [5, 35, 20, 15], ability: mon!.ability, abilityNum: mon!.abilitySlot, personality: mon!.personality,
    attack: mon!.stats.attack, defense: mon!.stats.defense, spAttack: mon!.stats.spAttack,
    spDefense: mon!.stats.spDefense, speed: mon!.stats.speed, hp: mon!.hp, maxHp: mon!.maxHp,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"], ...extra,
  });
  const encored = { encoredMove: MOVE.HYPER_BEAM, encoredMovePos: 0, encoreTimer: 3, encoreTimerStartValue: 3, lastMove: MOVE.HYPER_BEAM };
  const run = (status2: number) => runPortTurns(
    {
      requestId: 1,
      rngSeed: 0x1234_5678,
      player: staged(snorlax, { ...encored, status2, lockedMove: status2 === 0 ? 0 : MOVE.HYPER_BEAM }),
      trainer: staged(wobbuffet, { pp: [5, 5, 5, 5], types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"] }),
    },
    [{ injectAiDraws: 0, playerMoveSlot: 0, playerTargetBattler: 1 }],
  );

  it("RECHARGE-locked + Encored: 'must recharge', no GetMoveTarget draw", () => {
    const locked = run(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE);
    expect(locked.stoppedEarly).toBeNull();
    expect(locked.events.map((event) => event.id)).toContain("STRINGID_PKMNMUSTRECHARGE");
    expect(locked.draws.map((draw) => draw.reason)).not.toContain(GET_MOVE_TARGET);
  });

  it("control -- the same Encore without the lock retargets at execution", () => {
    const free = run(0);
    expect(free.events.map((event) => event.id)).not.toContain("STRINGID_PKMNMUSTRECHARGE");
    expect(free.draws[0]?.reason).toBe(GET_MOVE_TARGET);
  });
});
