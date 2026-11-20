// pic9 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): the switch-out and send-in lines are picked from the OPPOSING battler's
// HP, as on the ROM. Kyle's battle 1 turn 2 (the planning session's ROM replay, rom-replay/b0/rom.json romText): ELEKID at 26 / 138
// and no switch since battle start, the ROM printed "MAGBY, good! Come back!" / "Go for it, IVYSAUR!"; ours printed "MAGBY, OK! Come
// back!" (from MAGBY's own 65 / 138) and always "Go! IVYSAUR!".
//   STRINGID_RETURNMON (player): hpScale from Cmd_hpthresholds2 (battle_script_commands.c:6286-6306), the damage dealt to the foe since
//     gBattleStruct->hpOnSwitchout (reset for both sides when any switch-in completes, :5276-5280, and at battle start,
//     battle_main.c:3421); lines battle_message.c:2081-2090.
//   STRINGID_SWITCHINMON (player): hpScale from Cmd_hpthresholds (:6258-6283), the foe's current HP percent; lines :2100-2110. Both the
//     voluntary switch (BattleScript_ActionSwitch) and the send-in after a faint (BattleScript_FaintedMonSendOutNew) run it.
// ROM lab tools/integration/fixtures/castform-forms/off/labs/send-in.json (a full-HP MANTINE): "CHANSEY, that's enough! Come back!" /
// "Go! CASTFORM!".
import { describe, expect, it } from "vitest";
import { returnMonHpScale, switchInMonHpScale } from "../src/engine/battleResolutionPresentation.ts";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

describe("pic9: the ROM's hp thresholds", () => {
  it("Kyle's turn: ELEKID 26 / 138, hpOnSwitchout 138 -> good! / Go for it", () => {
    expect(returnMonHpScale(138, 26)).toBe(3);
    expect(switchInMonHpScale(26, 138)).toBe(2);
    // the old rule read the outgoing MAGBY's own 65 / 138 -> OK!
  });

  it("Cmd_hpthresholds: > 69 % or fainted -> 0, > 39 -> 1, > 9 -> 2, else 3 (0 % rounds up to 1)", () => {
    expect([70, 69, 40, 39, 10, 9, 1].map((hp) => switchInMonHpScale(hp, 100))).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(switchInMonHpScale(0, 100)).toBe(0);
    expect(switchInMonHpScale(1, 300)).toBe(3);
  });

  it("Cmd_hpthresholds2: no damage -> 0, <= 29 % -> 1, <= 69 % -> 2, else 3, on the u8-truncated stored HP", () => {
    expect([100, 120, 71, 70, 31, 30, 0].map((hp) => returnMonHpScale(100, hp))).toEqual([0, 0, 1, 2, 2, 3, 3]);
    // hpSwitchout is a u8 local: a foe stored at 300 HP compares against 300 & 0xFF = 44, so 250 HP reads "that's enough"
    expect(returnMonHpScale(300, 250)).toBe(0);
    expect(returnMonHpScale(300, 22)).toBe(2);
  });
});

describe("pic9: every switch line on the real route follows the foe's HP (full-policy soak seeds 0 and 1)", () => {
  it("come-back lines read the foe's HP drop since the last switch-in, send-in lines its current HP", () => {
    const returnLine = ["that’s enough! Come back!", "come back!", "OK! Come back!", "good! Come back!"];
    const sendInLine = (name: string) => [`Go! ${name}!`, `Do it! ${name}!`, `Go for it, ${name}!`, `Your foe’s weak! Get ’em, ${name}!`];
    const seenScales = { back: new Set<number>(), in: new Set<number>() };
    let switches = 0;
    for (const seed of [0, 1]) {
      const seen = new Set<unknown>();
      runSeed(seed, {
        policy: "full", renderEvery: 1, maxFrames: 120_000, stopAtFirstRoundDecision: true,
        drawCheck: { check: (state) => {
          const orchestrator = state.factoryRoundBattleOrchestrator;
          const resolution = orchestrator?.battleResolutionPresentation;
          for (const segment of resolution?.segments ?? []) {
            if (seen.has(segment)) continue;
            seen.add(segment);
            const foe = segment.field.opponent;
            const messages = segment.commands.filter((c) => c.type === "message").map((c) => (c as { lines: readonly string[] }).lines.join(" "));
            const back = messages.find((m) => / Come back!$|, come back!$/.test(m));
            if (back !== undefined) {
              // the voluntary switch runs first in the turn: the foe's HP is the segment's start HP; the ledger is the one before it
              const stored = orchestrator!.battlePresentationBoundaries![1].hpOnSwitchout ?? foe.maxHP;
              const scale = returnMonHpScale(stored, foe.hp);
              expect(back.endsWith(returnLine[scale]!), `${seed}: ${back} (foe ${foe.hp}, stored ${stored})`).toBe(true);
              seenScales.back.add(scale);
              switches += 1;
            }
            const sendIn = segment.commands.find((c) => c.type === "switch-in" && c.battler === 0) as { incoming: { name: string } } | undefined;
            if (sendIn !== undefined) {
              const scale = switchInMonHpScale(foe.hp, foe.maxHP);
              expect(messages, `${seed}: foe ${foe.hp}/${foe.maxHP}`).toContain(sendInLine(sendIn.incoming.name)[scale]);
              seenScales.in.add(scale);
            }
          }
        } },
      });
    }
    expect(switches).toBeGreaterThan(5);
    // flow1 (the move menu opens on the first move after a switch-in) moved the exploring games: they now also reach scale 1
    // ("<MON>, come back!"); every line above still follows Cmd_hpthresholds2. Was [0, 2, 3].
    expect([...seenScales.back].sort()).toEqual([0, 1, 2, 3]);
    expect([...seenScales.in].sort()).toEqual([0, 1, 2, 3]);
  }, 180_000);
});
