import { describe, expect, it } from "vitest";
import { collectSoundTick } from "../src/audio/soundEvents.ts";
import { createBattleCommandPresentation } from "../src/engine/battleCommandPresentation.ts";
import { initializeFreshFactoryBattle } from "../src/engine/factoryBattleStart.ts";
import { createFactoryBattleStartEntry, type FactoryBattleStartEntryState } from "../src/engine/factoryBattleStartEntry.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { advanceFactoryRoundBattleStartIntro } from "../src/engine/factoryRoundBattleOrchestrator.ts";
import type { BattleScriptPartyState } from "../src/engine/battleScriptRulesContext.ts";
import { createInitialState } from "../src/engine/core.ts";
import { emitTickSounds } from "../src/engine/tickSounds.ts";
import { APP_STAGES } from "../tools/compare/appTrace.ts";

// wbh1 (docs/wbh1-battle-start-white-herb.md): the battle-start White Herb (BattleScript_WhiteHerbEnd2 after an Intimidate, run by
// TryDoEventsBeforeFirstTurn's ITEMEFFECT_ON_SWITCH_IN loop) is presented between the Intimidate print and the first action menu.
// The parties are the frame catcher's s17-on-wc battle 3 (MASQUERAIN, Intimidate, vs LEWIS's PIDGEOTTO holding the WHITE HERB);
// "player" swaps the two sides.

const OT = 416_049_562;
const member = (setId: number, personality: number) =>
  createFactoryCorpusPartyMember({ setId, personality, fixedIv: 3, abilitySlot: 0, otId: OT });
const party = (members: ReturnType<typeof member>[]): BattleScriptPartyState =>
  Object.freeze([...members, ...members]) as unknown as BattleScriptPartyState;
const MASQUERAIN_SIDE = () => party([member(198, 2_946_218_182), member(190, 5_515_650), member(174, 4_039_037_521)]);
const PIDGEOTTO_SIDE = () => party([member(135, 1_734_097_699), member(115, 4_087_535_881), member(188, 1_403_107_857)]);

function start(scene: "on" | "off", herb: "foe" | "player") {
  const masquerain = MASQUERAIN_SIDE();
  const pidgeotto = PIDGEOTTO_SIDE();
  const initialized = initializeFreshFactoryBattle({
    requestId: 1,
    rngSeed: 2_874_401_369,
    battleScene: scene,
    playerParty: herb === "foe" ? masquerain : pidgeotto,
    opponentParty: herb === "foe" ? pidgeotto : masquerain,
  });
  const request = initialized.state.boundary.kind === "decision-required" ? initialized.state.boundary.request : null;
  if (request === null || request.kind !== "command") throw new Error("no first command");
  const command = createBattleCommandPresentation(request, initialized.state.rules.rulesContext, 0);
  const entry = createFactoryBattleStartEntry(initialized.entryScripts, ["Go! X!"], initialized.state, command)!;
  return { initialized, entry };
}

/** Each scheduled command's first entry frame (entry frame 0 = the Intimidate script's set-up frame). */
function starts(entry: FactoryBattleStartEntryState): Map<number, number> {
  const out = new Map<number, number>();
  let at = 0;
  for (const item of entry.schedule) {
    if (!out.has(item.commandIndex)) out.set(item.commandIndex, at);
    at += item.length;
  }
  return out;
}

// ROM rows (tools/integration/sta6mIntroProbe.py on the factoryLegal labs wbh1-{foe,player}-{on,off}: challenge 0, battle 3, trainer 48,
// the s17 sets), frames after BattleScript_IntimidateActivatesEnd3's set-up frame: the Intimidate print, the playanimation row
// (gAnimScriptActive's first row), the White Herb print, and the first frame of HandleTurnActionSelectionState (the blank box; the
// action menu is drawn 6 frames later, s17-on-wc ROM 22953 -> 22959). foe-on is the s17-on-wc catcher run: ROM 22379 + these.
const ROM = {
  "foe-on": { intimidatePrint: 121, herbAnim: 245, herbPrint: 458, blank: 574 },
  "foe-off": { intimidatePrint: 121, herbAnim: null, herbPrint: 279, blank: 395 },
  "player-on": { intimidatePrint: 121, herbAnim: 245, herbPrint: 458, blank: 570 },
  "player-off": { intimidatePrint: 121, herbAnim: null, herbPrint: 279, blank: 391 },
} as const;

describe("wbh1 battle-start White Herb", () => {
  for (const herb of ["foe", "player"] as const) {
    for (const scene of ["on", "off"] as const) {
      it(`${herb} holder, Scene ${scene.toUpperCase()}: the White Herb block lands on the ROM's rows`, () => {
        const { initialized, entry } = start(scene, herb);
        const holder = herb === "foe" ? 1 : 0;
        expect(initialized.entryScripts.map((script) => [script.label, script.popRows])).toEqual([
          ["BattleScript_IntimidateActivatesEnd3", 0],
          ["BattleScript_WhiteHerbEnd2", 1],
        ]);
        const commands = entry.base.segments[0]!.commands;
        const types = commands.map((command) => command.type);
        expect(types).toEqual(scene === "on"
          ? ["message", "stat", "stats-change", "message", "general-animation", "message"]
          : ["message", "stat", "stats-change", "message", "message"]);
        const herbMessage = commands.at(-1)!;
        expect(herbMessage.type === "message" && herbMessage.lines).toEqual([
          herb === "foe" ? "Foe PIDGEOTTO’s WHITE HERB" : "PIDGEOTTO’s WHITE HERB",
          "restored its status!",
        ]);
        const at = starts(entry);
        const rom = ROM[`${herb}-${scene}`];
        expect(at.get(3)).toBe(rom.intimidatePrint);
        if (scene === "on") {
          const animation = commands[4]!;
          expect(animation).toMatchObject({ type: "general-animation", animation: "HELD_ITEM_EFFECT", battler: holder, timing: { minimumFrames: 213 } });
          expect(at.get(4)).toBe(rom.herbAnim);
        }
        expect(at.get(commands.length - 1)).toBe(rom.herbPrint);
        expect(at.get(commands.length)).toBe(rom.blank);
        expect(entry.total).toBe(rom.blank + 6);
        // Presentation only: the herb is consumed and the stage restored at the first command, as before.
        const battler = initialized.state.rules.rulesContext.battlers[holder];
        expect(battler.item).toBe(0);
        expect(battler.statStages).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
      });
    }
  }

  it("Scene ON plays General_HeldItemEffect's SEs at the s17-on-wc ROM frames; Scene OFF plays none", () => {
    // s17-on-wc ROM: SE_M_STAT_DECREASE 22426, SE_M_TAKE_DOWN 22631 / 22663 / 22695, SE_M_MORNING_SUN 22727, SE_SHINY 22799, all pan 63
    // (the foe's side); entry frame 0 = ROM 22379.
    const heard = (scene: "on" | "off") => {
      const { entry } = start(scene, "foe");
      const rows: string[] = [];
      for (let elapsed = 0; elapsed < entry.total; elapsed += 1) {
        const next = { battleScene: undefined, factoryRoundBattleOrchestrator: {
          battleStartIntro: { entry: { ...entry, elapsed } }, battleResolutionPresentation: null, battleForcedPartySelect: null,
          battle: {}, round: { rules: { currentOpponent: {} } },
        } };
        const { events } = collectSoundTick(elapsed, () => emitTickSounds({ battleScene: undefined, factoryRoundBattleOrchestrator: null } as never, next as never));
        for (const event of events) if (event.kind === "se") rows.push(`${event.id}@${22_379 + elapsed}(${event.pan})`);
      }
      return rows;
    };
    expect(heard("on")).toEqual(["245@22426(64)", "152@22631(63)", "152@22663(63)", "152@22695(63)", "228@22727(63)", "102@22799(63)"]);
    expect(heard("off")).toEqual(["245@22426(64)"]);
  });

  it("a later entry script starts on its own rows after the previous one's pop: Trace after Intimidate (ROM sta6m-both-off)", () => {
    // ROM rows: BattleScript_IntimidateActivatesEnd3 set up 1848, TraceActivates set up 2088 (the frame after the Intimidate pop), its print
    // 2121 = 2088 + 33, HandleTurnActionSelectionState 2229. Entry frame 0 = 1848.
    let o = APP_STAGES["sta6m-intro-both-off"]!(createInitialState()).factoryRoundBattleOrchestrator!;
    let entry: FactoryBattleStartEntryState | null = null;
    for (let frame = 0; entry === null; frame += 1) {
      if (frame > 20_000 || o.battleStartIntro === null) throw new Error("no entry phase");
      o = advanceFactoryRoundBattleStartIntro(o, new Set(frame % 16 === 0 ? ["A" as const] : []));
      entry = o.battleStartIntro?.entry ?? null;
    }
    const at = starts(entry);
    expect(entry.base.segments[0]!.commands.map((command) => command.type)).toEqual(["message", "stat", "stats-change", "message", "message"]);
    expect(at.get(3)).toBe(1969 - 1848);
    expect(at.get(4)).toBe(2121 - 1848);
    expect(at.get(5)).toBe(2229 - 1848);
  });
});
