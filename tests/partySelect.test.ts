import { describe, expect, it } from "vitest";
import { advancePartySelect, CANONICAL_FORCED_SWITCH_PARTY, CANONICAL_FORCED_SWITCH_RENTAL_RECORDS, CANONICAL_FORCED_SWITCH_REQUEST, createPartySelectStateFromForcedSwitch, fullPartyIconFrame, INITIAL_PARTY_SELECT_STATE, onixSelectedHopY2, partyMenuLayers, partySendOutBallPhase, partySendOutBattleFadeBldy, partySendOutBattleMenuReady, partySendOutGoTextVisibleChars, partySendOutHealthboxDx, partySendOutMenuBounceTick, partySendOutPhase, partySendOutReleaseLogicalTick, PARTY_ENTRY_BLACK_START, PARTY_ENTRY_FADE_IN_START, PARTY_ENTRY_FADE_OUT_START, PARTY_ENTRY_SETTLED_START, PARTY_LIST_INPUT_ELAPSED, PARTY_SENDOUT_ACTION_MENU_START, PARTY_SENDOUT_BALL_LAST_VISIBLE, PARTY_SENDOUT_BALL_SPIN_START, PARTY_SENDOUT_BALL_VISIBLE_START, PARTY_SENDOUT_BATTLE_FADE_IN_START, PARTY_SENDOUT_BLACK_START, PARTY_SENDOUT_BLANK_MESSAGE_START, PARTY_SENDOUT_FADE_OUT_START, PARTY_SENDOUT_GO_TEXT, PARTY_SENDOUT_GO_TEXT_START, PARTY_SENDOUT_RELEASE_VISIBLE_START, partySelectEntryPhase, submitPartySelectBattleDecision } from "../src/engine/partySelect.ts";
import { bgFadeY, objFadeY } from "../src/engine/paletteFade.ts";
import { createBattleState, type BattleDecisionReducer } from "../src/engine/battleDecisionBoundary.ts";
import { battlePartySelectStateForForcedParty, renderBattlePartySelect } from "../src/engine/battlePartySelect.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";

describe("forced turn-15 party select", () => {
  const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));
  const record = (setId: number): FactoryRentalRecord => {
    const set = frontierMonsData.entries[setId]!;
    const personality = natureByName.get(set.nature)!;
    const input = {
      setId,
      personality,
      fixedIv: 31,
      abilitySlot: (personality & 1) as 0 | 1,
    };
    return Object.freeze({
      ...input,
      abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
    });
  };

  it("constructs the canonical three-rental state through the request-driven entry point exactly", () => {
    expect(createPartySelectStateFromForcedSwitch(
      CANONICAL_FORCED_SWITCH_REQUEST,
      CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
      CANONICAL_FORCED_SWITCH_PARTY,
    )).toEqual(INITIAL_PARTY_SELECT_STATE);
  });

  it("source-composes arbitrary forced-party rows and SPECIES_* icons", () => {
    const records = [record(664), record(678), record(527)] as const;
    const members = records.map(createFactoryCorpusPartyMember);
    const party = members.map((member, index) => Object.freeze({
      id: member.speciesName.toLowerCase(),
      species: member.speciesName.replace(/^SPECIES_/, ""),
      hp: index === 0 ? 0 : member.maxHP,
      maxHp: member.maxHP,
      status: "none" as const,
    })) as never;
    const forced = createPartySelectStateFromForcedSwitch(
      CANONICAL_FORCED_SWITCH_REQUEST,
      records,
      party,
    );
    const source = battlePartySelectStateForForcedParty(forced);
    expect(source.rows.map((row) => row.speciesKey)).toEqual([
      "SPECIES_GRANBULL",
      "SPECIES_HARIYAMA",
      "SPECIES_MACHAMP",
    ]);
    const fb = createFramebuffer();
    renderBattlePartySelect(fb, source);
    expect(fb.some((channel) => channel !== 0 && channel !== 255)).toBe(true);
  });

  it("submits the confirmed selection as an ordinary forced-switch boundary decision", () => {
    const battle = createBattleState({
      rules: { resumed: false },
      rngSeed: 0x12345678,
      request: CANONICAL_FORCED_SWITCH_REQUEST,
    });
    const reducer: BattleDecisionReducer<{ readonly resumed: boolean }> = ({
      rules,
      request,
      decision,
    }) => {
      expect(request).toEqual(CANONICAL_FORCED_SWITCH_REQUEST);
      expect(decision).toEqual({ kind: "switch", partyIndex: 1 });
      return {
        rules: { ...rules, resumed: true },
        events: [],
        boundary: { kind: "terminal", outcome: "player-win" },
      };
    };
    const presentation = {
      ...INITIAL_PARTY_SELECT_STATE,
      cursor: "magby" as const,
      submenuOpen: true,
    };

    expect(submitPartySelectBattleDecision(
      battle,
      presentation,
      reducer,
    )).toBeNull();

    const submitted = submitPartySelectBattleDecision(
      battle,
      { ...presentation, sendOutElapsed: 0 },
      reducer,
    );
    expect(submitted).toMatchObject({
      kind: "terminal",
      state: {
        revision: 1,
        rules: { resumed: true },
        rng: { value: 0x12345678, calls: 0 },
        boundary: { kind: "terminal", outcome: "player-win" },
      },
    });
  });

  it("ignores list navigation during the fade and defaults to fainted ONIX", () => {
    expect(advancePartySelect({ ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 2 }, new Set(["DOWN"]))).toMatchObject({ cursor: "onix" });
  });

  it("uses press-relative entry phase boundaries for both canonical and delayed dismisses", () => {
    expect(PARTY_ENTRY_FADE_OUT_START).toBe(21);
    expect(PARTY_ENTRY_BLACK_START).toBe(36);
    expect(PARTY_ENTRY_FADE_IN_START).toBe(64);
    expect(PARTY_ENTRY_SETTLED_START).toBe(80);
    for (const dismissTick of [19990, 20020]) {
      expect(partySelectEntryPhase(0)).toBe("battleHold");
      expect(partySelectEntryPhase(20)).toBe("battleHold");
      expect(partySelectEntryPhase(21)).toBe("fadingOut");
      expect(partySelectEntryPhase(35)).toBe("fadingOut");
      expect(partySelectEntryPhase(36)).toBe("black");
      expect(partySelectEntryPhase(63)).toBe("black");
      expect(partySelectEntryPhase(64)).toBe("fadingIn");
      expect(partySelectEntryPhase(79)).toBe("fadingIn");
      expect(partySelectEntryPhase(80)).toBe("settled");
      expect(dismissTick + PARTY_ENTRY_SETTLED_START).toBe(dismissTick + 80);
    }
  });

  it("alternates BG then OBJ coefficients on the first entry-fade VBlank", () => {
    const out = { startDelay: 0, startY: 0, targetY: 16 };
    const backIn = { startDelay: 0, startY: 16, targetY: 0 };
    // The phase begins at rendered elapsed 21, so local 0 is exactly the
    // hardware's BG half; OBJ retains the prior coefficient until local 1.
    expect([bgFadeY(0, out), objFadeY(0, out), bgFadeY(1, out), objFadeY(1, out)]).toEqual([2, 0, 2, 2]);
    expect([bgFadeY(0, backIn), objFadeY(0, backIn), bgFadeY(1, backIn), objFadeY(1, backIn)]).toEqual([14, 16, 14, 14]);
  });

  it("moves DOWN to MAGBY, opens SEND OUT, then confirms it", () => {
    const magby = advancePartySelect({ ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 1 }, new Set(["DOWN"]));
    expect(magby).toEqual({
      ...INITIAL_PARTY_SELECT_STATE,
      elapsed: PARTY_LIST_INPUT_ELAPSED,
      cursor: "magby",
    });
    const submenu = advancePartySelect(magby, new Set(["A"]));
    expect(submenu).toEqual({
      ...INITIAL_PARTY_SELECT_STATE,
      elapsed: PARTY_LIST_INPUT_ELAPSED + 1,
      cursor: "magby",
      submenuOpen: true,
    });
    expect(advancePartySelect(submenu, new Set(["A"])).sendOutElapsed).toBe(0);
  });

  it("prints the source refusal and stays in the forced-switch menu on a fainted row", () => {
    const onixSubmenu = advancePartySelect(
      { ...INITIAL_PARTY_SELECT_STATE, elapsed: PARTY_LIST_INPUT_ELAPSED - 1 },
      new Set(["A"]),
    );
    expect(onixSubmenu).toMatchObject({ cursor: "onix", submenuOpen: true, sendOutElapsed: null });
    const refused = advancePartySelect(onixSubmenu, new Set(["A"]));
    expect(refused.sendOutElapsed).toBeNull();
    expect(refused.submenuOpen).toBe(false);
    expect(refused.message).toBe("ONIX has no energy\nleft to battle!");
    expect(submitPartySelectBattleDecision(
      { boundary: { kind: "forced-switch", request: refused.request } } as never,
      refused,
      (() => { throw new Error("must not reduce"); }) as never,
    )).toBeNull();
    expect(advancePartySelect(refused, new Set()).message)
      .toBe("ONIX has no energy\nleft to battle!");
  });

  it("keeps the SEND OUT exit clock relative to its own confirmation edge", () => {
    expect(PARTY_SENDOUT_FADE_OUT_START).toBe(1);
    expect(PARTY_SENDOUT_BLACK_START).toBe(17);
    expect(PARTY_SENDOUT_BATTLE_FADE_IN_START).toBe(56);
    expect(partySendOutPhase(0)).toBe("submenuHold");
    expect(partySendOutPhase(1)).toBe("fadingOut");
    expect(partySendOutPhase(16)).toBe("fadingOut");
    expect(partySendOutPhase(17)).toBe("black");
    expect(partySendOutPhase(55)).toBe("black");
    expect(partySendOutPhase(56)).toBe("battleFadeIn");
  });

  it("brightens the transferred battle field and types Go! MAGBY! from SEND OUT's edge", () => {
    expect(PARTY_SENDOUT_GO_TEXT).toBe("Go! MAGBY!");
    expect(PARTY_SENDOUT_GO_TEXT_START).toBe(PARTY_SENDOUT_BATTLE_FADE_IN_START + 28);
    expect([partySendOutBattleFadeBldy(56), partySendOutBattleFadeBldy(57), partySendOutBattleFadeBldy(71), partySendOutBattleFadeBldy(72)]).toEqual([15, 14, 0, 0]);
    expect([partySendOutGoTextVisibleChars(83), partySendOutGoTextVisibleChars(84), partySendOutGoTextVisibleChars(93), partySendOutGoTextVisibleChars(94)]).toEqual([0, 1, 10, 10]);
  });

  it("keeps the forced-switch Poké Ball schedule confirmation-relative", () => {
    expect(PARTY_SENDOUT_BALL_VISIBLE_START).toBe(99);
    expect(PARTY_SENDOUT_BALL_SPIN_START).toBe(107);
    expect(PARTY_SENDOUT_BALL_LAST_VISIBLE).toBe(142);
    expect([partySendOutBallPhase(98), partySendOutBallPhase(99), partySendOutBallPhase(106), partySendOutBallPhase(107), partySendOutBallPhase(142), partySendOutBallPhase(143)]).toEqual(["none", "closed", "closed", "spin", "spin", "landed"]);
    // A delayed A edge moves every visual boundary by the same 30 frames.
    expect(20246 + PARTY_SENDOUT_BALL_VISIBLE_START + 30).toBe(20375);
    expect(20246 + PARTY_SENDOUT_BALL_LAST_VISIBLE + 30).toBe(20418);
  });

  it("derives MAGBY release from SEND OUT confirmation rather than battle time", () => {
    expect(PARTY_SENDOUT_RELEASE_VISIBLE_START).toBe(145);
    expect(partySendOutReleaseLogicalTick(144)).toBeNull();
    expect(partySendOutReleaseLogicalTick(145)).toBe(0);
    expect(partySendOutReleaseLogicalTick(160)).toBe(15);
    expect(20246 + PARTY_SENDOUT_RELEASE_VISIBLE_START).toBe(20391);
    expect(20276 + PARTY_SENDOUT_RELEASE_VISIBLE_START).toBe(20421);
  });

  it("derives the populated player healthbox's 110-to-0 slide from SEND OUT", () => {
    expect(partySendOutHealthboxDx(160)).toBeNull();
    expect(partySendOutHealthboxDx(161)).toBeNull();
    expect(partySendOutHealthboxDx(162)).toBe(110);
    expect(partySendOutHealthboxDx(183)).toBe(5);
    expect(partySendOutHealthboxDx(184)).toBe(0);
    expect(partySendOutHealthboxDx(240)).toBe(0);
  });

  it("hands the completed send-out through a six-frame blank into a freshly anchored action menu", () => {
    expect(PARTY_SENDOUT_BLANK_MESSAGE_START).toBe(305);
    expect(PARTY_SENDOUT_ACTION_MENU_START).toBe(311);
    expect(partySendOutPhase(304)).toBe("battleFadeIn");
    expect(partySendOutPhase(305)).toBe("blankMessage");
    expect(partySendOutPhase(310)).toBe("blankMessage");
    expect(partySendOutPhase(311)).toBe("actionMenu");
    expect(partySendOutBattleMenuReady(310)).toBe(false);
    expect(partySendOutBattleMenuReady(311)).toBe(true);
    expect(partySendOutMenuBounceTick(311)).toBe(1748);
    expect(partySendOutMenuBounceTick(312)).toBe(1749);
    // Delaying the confirmation moves the absolute boundary, never this clock.
    expect(20246 + PARTY_SENDOUT_BLANK_MESSAGE_START + 30).toBe(20581);
    expect(20246 + PARTY_SENDOUT_ACTION_MENU_START + 30).toBe(20587);
  });

  it("uses the RAM-derived 30/31 ONIX hop and 7/8 full-icon frame cadence", () => {
    expect(onixSelectedHopY2(153)).toBe(-3);
    expect(onixSelectedHopY2(154)).toBe(1);
    expect(onixSelectedHopY2(184)).toBe(1);
    expect(onixSelectedHopY2(185)).toBe(-3);
    expect(fullPartyIconFrame(160)).toBe(1);
    expect(fullPartyIconFrame(167)).toBe(1);
    expect(fullPartyIconFrame(168)).toBe(0);
    // The documented 2-tick global freeze delays the next f1 phase.
    expect(fullPartyIconFrame(220)).toBe(0);
    expect(fullPartyIconFrame(222)).toBe(1);
  });

  it("selects icon-free chrome and source-icon layers from live menu state", () => {
    const onixHop = partyMenuLayers({ ...INITIAL_PARTY_SELECT_STATE, elapsed: 167 });
    expect(onixHop.chromeKey).toBe("listOnixMidHop");
    expect(onixHop.icons[0]).toMatchObject({ species: "ONIX", frame: 0, selected: true, y2: 1 });
    expect(onixHop.icons[1]).toMatchObject({ species: "MAGBY", frame: 1, selected: false, x2: -4 });
    const magbyState = { ...INITIAL_PARTY_SELECT_STATE, elapsed: 205, cursor: "magby" as const };
    const magbyHop = partyMenuLayers(magbyState);
    expect(magbyHop.chromeKey).toBe("listMagbyMidHop");
    expect(magbyHop.icons[1]).toMatchObject({ species: "MAGBY", frame: 1, selected: true, y2: 1 });
    expect(magbyHop.status).toBe("magby");
    expect(partyMenuLayers({ ...magbyState, submenuOpen: true }).chromeKey).toBe("submenu");
  });

  it("uses the frame-1 icon-free layer once the entry-time OBJ copy becomes visible", () => {
    // Direct oracle VRAM probe: after the dismiss-edge-relative construction,
    // BAYLEEF's source frame-1 bytes own rendered elapsed 70..77 (canonical
    // 20061..20068; delayed trace shifts the same window by +30). Frame 1
    // has transparent texels where frame 0 was opaque, so it must pair with
    // its matching icon-free chrome rather than exposing the frame-0 erase.
    for (const elapsed of [70, 77]) {
      const layers = partyMenuLayers({ ...INITIAL_PARTY_SELECT_STATE, elapsed });
      expect(layers.chromeKey).toBe("listOnixFrame1");
      expect(layers.icons.slice(1)).toEqual([
        expect.objectContaining({ species: "MAGBY", frame: 1 }),
        expect.objectContaining({ species: "BAYLEEF", frame: 1 }),
      ]);
    }
    expect(partyMenuLayers({ ...INITIAL_PARTY_SELECT_STATE, elapsed: 78 }).chromeKey).toBe("listOnix");
  });
});
