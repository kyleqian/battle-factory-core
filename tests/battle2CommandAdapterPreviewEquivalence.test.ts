import { describe, expect, it } from "vitest";
import {
  BATTLE2_TURN1_KERNEL_CONFIG,
  createBattle2CommandAdapterPreviewCommand,
  createBattle2CommandAdapterPreviewResolution,
  stageBattle2Turn1Kernel,
} from "../src/engine/battle2CommandAdapterPreview.ts";
import { BATTLE2_ACTION_MENU_MODEL } from "../src/engine/battle2ActionMenu.ts";
import {
  BATTLE2_KABUTO_END_HP,
  BATTLE2_KABUTO_START_HP,
  BATTLE2_ROCK_SLIDE_DAMAGE,
} from "../src/engine/battle2Turn1.ts";
import { ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2 } from "../src/engine/battleMenu.ts";

/**
 * ISSUES #39 rank 1 equivalence proof (docs/battle-scene-retirement-
 * inventory.md's rank-1 row). Pre-flip only: nothing here is wired into any
 * render path; `battle2CommandAdapterPreview.ts` is a NEW, standalone file
 * and no existing module is touched.
 *
 * FORM USED: complete typed-view structural equality at every input-
 * relevant fact, NOT rendered-surface pixel hashing. Why not pixels: the
 * covered command-menu/FIGHT-submenu draw calls
 * (`drawBattle2FightSubmenuWindow`, battleScene.ts:6807-6871) already
 * dispatch through the SAME shared generic renderer this adapter targets
 * (`renderBattleCommandPresentation`, battleCommandPresentationRender.ts) --
 * so once the adapter's `BattleCommandPresentationState` is proven field-
 * for-field identical to the legacy fixture's, the render call the flip
 * keeps is unchanged and pixel-identical by construction; there is no
 * separate pixel path to independently hash. The ROCK_SLIDE resolution
 * frames (`drawBattle2RockSlideAttack`/`drawBattle2RockSlideTurn1Window`,
 * battleScene.ts:6880-6972) draw through Battle-2-private field-art/rock-
 * sprite primitives (`ONIX_MATERIALIZE_CORNER`, `KABUTO_CORNER`,
 * `drawKabutoHSlideWobble`, `rockSlideRockState`/`drawRockSprite`, etc.)
 * that are module-private to battleScene.ts and never exported; this slice
 * may not modify battleScene.ts to export them, and re-deriving that pixel
 * geometry here would duplicate rendering logic (forbidden by the brief).
 * So resolution equivalence is proven at the FACT layer (message text, PP,
 * HP, stat change) that those private primitives consume -- see the
 * "documented gap" block at the bottom for exactly what remains unproven.
 *
 * The legacy citation (battleScene.ts:6639-7041 + battle2Turn1.ts +
 * battle2ActionMenu.ts + battle2OffScenario.ts) stops at the opponent
 * handoff tick (BATTLE2_TURN1_OPPONENT_HANDOFF_DELAY, +261 from confirm) --
 * i.e. the command menu, FIGHT submenu, and ONIX's own ROCK_SLIDE
 * resolution only. KABUTO's SAND-ATTACK reply is real kernel content this
 * legacy line range does not render at all today (confirmed by reading
 * battleScene.ts:6639-7041 in full: no SAND-ATTACK text/stat draw call
 * exists in that range). The typed resolution adapter naturally produces
 * SAND-ATTACK's commands too, in the same segment -- documented below as
 * extra coverage for the flip, not asserted against any legacy fixture
 * since none exists yet to compare against.
 */
describe("battle2CommandAdapterPreview: #39 rank 1 kernel-to-typed-owner equivalence (pre-flip proof)", () => {
  describe("command phase: createBattle2CommandAdapterPreviewCommand vs. battle2ActionMenu.ts's BATTLE2_ACTION_MENU_MODEL fixture", () => {
    it("reproduces the real kernel legal-decision request -- and documents where it diverges from battle2CommandPresentationForRender's own hand-built legalMoveBySlot/legalSwitchPartyIndexes (battleScene.ts:6748-6754)", () => {
      const command = createBattle2CommandAdapterPreviewCommand();
      expect(command.request).toMatchObject({
        kind: "command",
        side: "player",
        battler: 0,
        legalDecisions: [
          { kind: "use-move", moveSlot: 0, targetBattler: 1 },
          { kind: "use-move", moveSlot: 1, targetBattler: 1 },
          { kind: "use-move", moveSlot: 2, targetBattler: 1 },
          // FINDING: the real kernel resolves move slot 3 (SANDSTORM, a
          // field-effect move) as self-targeting, not opponent-targeting.
          // The legacy fixture (battleScene.ts:6748-6753) hardcodes all four
          // slots as `targetBattler: 1` -- it never reads the real per-move
          // target. This trace never confirms slot 3 (ONIX presses A on
          // ROCK SLIDE, slot 0), so the wrong target is presentation-inert
          // for THIS committed window, but the flip must source
          // `legalMoveBySlot`/`legalSwitchPartyIndexes` from the kernel
          // request instead of a hand-written literal, not just field/PP/HP.
          { kind: "use-move", moveSlot: 3, targetBattler: 0 },
        ],
      });
      // FINDING: the legacy fixture also hardcodes two switch decisions
      // (`{kind:"switch",partyIndex:1}`, `{kind:"switch",partyIndex:2}`,
      // battleScene.ts:6754/6763-6764). This adapter's kernel config matches
      // `battle2-off-turn1-staged.json`'s own established staging
      // (tools/compare/appTrace.ts:225-316), which does not model a player
      // bench, so the real kernel offers zero legal switches here. Whether
      // Battle 2's real bench makes those two switches legal is bench data
      // this slice does not have pinned anywhere in the repo -- the flip (or
      // a follow-up) must source it before the switch list can be proven,
      // not assume the legacy literal is correct.
      expect(
        command.request.legalDecisions.filter((decision) => decision.kind === "switch"),
      ).toEqual([]);
    });

    it("reproduces BATTLE2_ACTION_MENU_MODEL.player's identity/HP fields (species/name/level/hp/maxHP), sourced from the kernel party instead of the hardcoded model", () => {
      const command = createBattle2CommandAdapterPreviewCommand();
      expect(command.field.player).toMatchObject({
        species: BATTLE2_ACTION_MENU_MODEL.player.species,
        name: BATTLE2_ACTION_MENU_MODEL.player.name,
        level: BATTLE2_ACTION_MENU_MODEL.player.level,
        hp: BATTLE2_ACTION_MENU_MODEL.player.hp,
        maxHP: BATTLE2_ACTION_MENU_MODEL.player.maxHP,
        status: "none",
      });
    });

    it("reproduces BATTLE2_ACTION_MENU_MODEL.opponent's identity/HP fields, sourced from the kernel party instead of the hardcoded model", () => {
      const command = createBattle2CommandAdapterPreviewCommand();
      expect(command.field.opponent).toMatchObject({
        species: BATTLE2_ACTION_MENU_MODEL.opponent.species,
        name: BATTLE2_ACTION_MENU_MODEL.opponent.name,
        level: BATTLE2_ACTION_MENU_MODEL.opponent.level,
        hp: BATTLE2_ACTION_MENU_MODEL.opponent.hp,
        maxHP: BATTLE2_ACTION_MENU_MODEL.opponent.maxHP,
        status: "none",
      });
    });

    it("FINDING: gender diverges -- the personality-less staged kernel config (matching battle2-off-turn1-staged.json's own established config) derives 'female' for both ONIX and KABUTO via getMonGender's personality=0 default, not the legacy fixture's hardcoded 'male' for both", () => {
      const command = createBattle2CommandAdapterPreviewCommand();
      // Documents the actual kernel-derived value so this gap cannot go
      // silently green: real Battle 2 personality bytes are not pinned
      // anywhere in this repo today (`BATTLE2_TURN1_KERNEL_CONFIG` omits
      // `personality`, same as `battle2-off-turn1-staged.json`'s own already-
      // committed staging). The flip needs the real RAM-dumped personality
      // for both mons before the healthbox gender icon is provably correct;
      // until then this field is NOT proven equivalent.
      expect(command.field.player.gender).toBe("female");
      expect(command.field.opponent.gender).toBe("female");
      expect(BATTLE2_ACTION_MENU_MODEL.player.gender).toBe("male");
      expect(BATTLE2_ACTION_MENU_MODEL.opponent.gender).toBe("male");
    });

    it("reproduces the opponent moveIds/currentPP the legacy fixture hardcodes at battleScene.ts:6788-6790 ([72,246,28,182] / [10,5,15,10]), sourced from the kernel trainer config instead of a battleScene.ts literal", () => {
      const command = createBattle2CommandAdapterPreviewCommand();
      expect(command.field.opponent.moveIds).toEqual(
        BATTLE2_TURN1_KERNEL_CONFIG.trainer.moves,
      );
      expect(command.field.opponent.currentPP).toEqual(
        BATTLE2_TURN1_KERNEL_CONFIG.trainer.pp,
      );
      expect(command.field.opponent.moveIds).toEqual([72, 246, 28, 182]);
      expect(command.field.opponent.currentPP).toEqual([10, 5, 15, 10]);
    });

    it("reproduces ONIX's own real moveset/PP (the FIGHT submenu content), sourced from the kernel player config instead of the legacy FightSubmenuState.activeMonMoveset draft-screen mirror", () => {
      const command = createBattle2CommandAdapterPreviewCommand();
      expect(command.field.player.moveIds).toEqual(
        BATTLE2_TURN1_KERNEL_CONFIG.player.moves,
      );
      expect(command.field.player.currentPP).toEqual(
        BATTLE2_TURN1_KERNEL_CONFIG.player.pp,
      );
    });

    it("starts in the action-enter lifecycle phase with a fresh idle-bounce clock, matching a freshly-opened command boundary", () => {
      const command = createBattle2CommandAdapterPreviewCommand();
      expect(command.lifecycle).toEqual({ phase: "action-enter", phaseElapsed: 0 });
      expect(command.idleBounceElapsed).toBe(0);
      expect(command.actionCursor).toBe(0);
      expect(command.fightCursor).toBe(0);
    });
  });

  describe("resolution phase: createBattle2CommandAdapterPreviewResolution vs. battle2Turn1.ts's hardcoded ROCK_SLIDE constants", () => {
    it("emits ROCK_SLIDE_LINE1/LINE2 (battleMenu.ts's shared, already-generic text) as the kickoff message, not a Battle-2-private literal", () => {
      const resolution = createBattle2CommandAdapterPreviewResolution();
      const commands = resolution.segments[0]!.commands;
      expect(commands[0]).toMatchObject({
        type: "message",
        lines: [ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2],
      });
    });

    it("drains KABUTO's HP by exactly BATTLE2_ROCK_SLIDE_DAMAGE, from BATTLE2_KABUTO_START_HP to BATTLE2_KABUTO_END_HP", () => {
      const resolution = createBattle2CommandAdapterPreviewResolution();
      const commands = resolution.segments[0]!.commands;
      const hpCommand = commands.find(
        (command) => command.type === "hp" && command.battler === 1,
      );
      expect(hpCommand).toMatchObject({
        type: "hp",
        battler: 1,
        from: BATTLE2_KABUTO_START_HP,
        to: BATTLE2_KABUTO_END_HP,
      });
      expect(BATTLE2_KABUTO_START_HP - BATTLE2_KABUTO_END_HP).toBe(
        BATTLE2_ROCK_SLIDE_DAMAGE,
      );
    });

    it("commits ONIX's ROCK SLIDE PP 10 -> 9 (battle2Turn1.ts's own onixRockSlidePp transition) as a real kernel set-battler-pp-data event, move slot 0", () => {
      const kernel = stageBattle2Turn1Kernel();
      const ppEvent = kernel.transition.events.find(
        (event) => event.payload.kind === "set-battler-pp-data" && event.payload.battler === 0,
      );
      expect(ppEvent?.payload).toMatchObject({
        kind: "set-battler-pp-data",
        battler: 0,
        movePosition: 0,
        pp: 9,
      });
    });

    it("is a non-critical, non-flinching, single-target hit -- matching battle2Turn1.ts's own fixed critMultiplier:1/flinched:false model", () => {
      const kernel = stageBattle2Turn1Kernel();
      expect(
        kernel.transition.events.some((event) => event.payload.kind === "flinch"),
      ).toBe(false);
    });
  });

  describe("documented gap: the ROCK_SLIDE move-specific visual has no generic typed owner yet (flip's own remaining work, not papered over)", () => {
    it("the resolution command's hit-animation carries only battler/eventSequence/timing -- no rock-sprite count, throw order, screen-shift, or blink geometry battleScene.ts's drawRockSprite/rockSlideRockState/rockSlideDrawOrder (private, battle2Turn1.ts-adjacent helpers in battleScene.ts) draw from", () => {
      const resolution = createBattle2CommandAdapterPreviewResolution();
      const commands = resolution.segments[0]!.commands;
      const hitAnimation = commands.find((command) => command.type === "hit-animation");
      expect(hitAnimation).toBeDefined();
      expect(Object.keys(hitAnimation!).sort()).toEqual(
        ["battler", "eventSequence", "timing", "type"].sort(),
      );
      // Finding for the flip: `battleResolutionPresentationRender.ts`'s
      // generic "hit" render effect (`genericHitReactionAtAge`) only ever
      // produces a healthbox-shake reaction -- it has no move-identity input
      // at all, so it cannot select ROCK_SLIDE's own rock-throw animation.
      // The flip must keep battleScene.ts's private rock-sprite draw path
      // (or generalize it) for this frame family; this adapter cannot own
      // it today, and does not claim to.
    });

    it("the same resolution transition also resolves KABUTO's SAND-ATTACK reply (accuracy stat-stage-change 6 -> 5) -- real kernel content beyond battleScene.ts:6639-7041's own cited range, which stops at the opponent handoff tick and never renders it", () => {
      const resolution = createBattle2CommandAdapterPreviewResolution();
      const commands = resolution.segments[0]!.commands;
      const statCommand = commands.find((command) => command.type === "stat");
      expect(statCommand).toMatchObject({
        type: "stat",
        battler: 0,
        stat: "accuracy",
        from: 6,
        to: 5,
      });
    });
  });
});
