import { describe, expect, it } from "vitest";
import {
  BATTLE2_TURN1_KERNEL_CONFIG,
  createBattle2CommandAdapterCommand,
  createBattle2CommandAdapterResolution,
  stageBattle2Turn1Kernel,
} from "../src/engine/battle2CommandAdapter.ts";
import { BATTLE2_ACTION_MENU_MODEL } from "../src/engine/battleScene.ts";
import { ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2 } from "../src/engine/battleMenu.ts";

/**
 * ISSUES #39 rank 1 regression pin (docs/battle-scene-retirement-
 * inventory.md's rank-1 row). Formerly a pre-flip equivalence proof
 * (battle2CommandAdapterPreviewEquivalence.test.ts); the flip wired
 * battle2CommandAdapter.ts into `battle2CommandPresentationForRender`/
 * `drawBattle2RockSlideAttack` (battleScene.ts), so this now pins the live
 * production path, not a standalone proof.
 *
 * FORM USED: complete typed-view structural equality at every input-
 * relevant fact, NOT rendered-surface pixel hashing. Why not pixels: the
 * covered command-menu/FIGHT-submenu draw calls
 * (`drawBattle2FightSubmenuWindow`, battleScene.ts) dispatch through the
 * SAME shared generic renderer this adapter feeds
 * (`renderBattleCommandPresentation`, battleCommandPresentationRender.ts) --
 * so once the adapter's `BattleCommandPresentationState` is proven field-
 * for-field identical to what the render call consumes, there is no
 * separate pixel path to independently hash. The ROCK_SLIDE resolution
 * frames (`drawBattle2RockSlideAttack`/`drawBattle2RockSlideTurn1Window`,
 * battleScene.ts) draw through Battle-2-private field-art/rock-sprite
 * primitives (`ONIX_MATERIALIZE_CORNER`, `KABUTO_CORNER`,
 * `drawKabutoHSlideWobble`, `rockSlideRockState`/`drawRockSprite`, etc.)
 * that remain module-private to battleScene.ts -- there is no generic move-
 * visual owner yet (docs/battle-scene-retirement-inventory.md's own
 * "Blocked work" note), so resolution equivalence is proven at the FACT
 * layer (message text, PP, HP, stat change) those private primitives
 * consume -- see the "documented gap" block at the bottom for exactly what
 * remains unproven.
 */
describe("battle2CommandAdapter: #39 rank 1 kernel-to-typed-owner equivalence (production path)", () => {
  describe("command phase: createBattle2CommandAdapterCommand", () => {
    it("reproduces the real kernel legal-decision request, including the real player bench's two switches and SANDSTORM's self-target", () => {
      const command = createBattle2CommandAdapterCommand();
      expect(command.request).toMatchObject({
        kind: "command",
        side: "player",
        battler: 0,
        legalDecisions: [
          { kind: "use-move", moveSlot: 0, targetBattler: 1 },
          { kind: "use-move", moveSlot: 1, targetBattler: 1 },
          { kind: "use-move", moveSlot: 2, targetBattler: 1 },
          // SANDSTORM (slot 3) is a field-effect move: the real kernel
          // resolves it as self-targeting, not opponent-targeting.
          { kind: "use-move", moveSlot: 3, targetBattler: 0 },
          // FINDING 1 (docs/battle2-party-ground-truth.md), fixed: the real
          // player bench (MAGBY partyIndex 1, BAYLEEF partyIndex 2, both
          // alive) makes both switches legal, sourced from
          // BATTLE2_TURN1_KERNEL_CONFIG's playerBenchHp/playerBenchOverride.
          { kind: "switch", partyIndex: 1 },
          { kind: "switch", partyIndex: 2 },
        ],
      });
    });

    it("reproduces BATTLE2_ACTION_MENU_MODEL.player's identity/HP/gender fields, sourced from the kernel party (real RAM-probed personality) instead of a hardcoded model", () => {
      const command = createBattle2CommandAdapterCommand();
      expect(command.field.player).toMatchObject({
        species: BATTLE2_ACTION_MENU_MODEL.player.species,
        name: BATTLE2_ACTION_MENU_MODEL.player.name,
        level: BATTLE2_ACTION_MENU_MODEL.player.level,
        hp: BATTLE2_ACTION_MENU_MODEL.player.hp,
        maxHP: BATTLE2_ACTION_MENU_MODEL.player.maxHP,
        gender: BATTLE2_ACTION_MENU_MODEL.player.gender,
        status: "none",
      });
    });

    it("reproduces BATTLE2_ACTION_MENU_MODEL.opponent's identity/HP/gender fields, sourced from the kernel party (real RAM-probed personality) instead of a hardcoded model", () => {
      const command = createBattle2CommandAdapterCommand();
      expect(command.field.opponent).toMatchObject({
        species: BATTLE2_ACTION_MENU_MODEL.opponent.species,
        name: BATTLE2_ACTION_MENU_MODEL.opponent.name,
        level: BATTLE2_ACTION_MENU_MODEL.opponent.level,
        hp: BATTLE2_ACTION_MENU_MODEL.opponent.hp,
        maxHP: BATTLE2_ACTION_MENU_MODEL.opponent.maxHP,
        gender: BATTLE2_ACTION_MENU_MODEL.opponent.gender,
        status: "none",
      });
    });

    it("FINDING 2 fixed (docs/battle2-party-ground-truth.md): both mons derive 'male' via the real RAM-probed personality, matching BATTLE2_ACTION_MENU_MODEL exactly (not the personality-less default's 'female'/'female')", () => {
      const command = createBattle2CommandAdapterCommand();
      expect(command.field.player.gender).toBe("male");
      expect(command.field.opponent.gender).toBe("male");
      expect(BATTLE2_ACTION_MENU_MODEL.player.gender).toBe("male");
      expect(BATTLE2_ACTION_MENU_MODEL.opponent.gender).toBe("male");
    });

    it("reproduces the opponent moveIds/currentPP the legacy fixture used to hardcode ([72,246,28,182] / [10,5,15,10]), sourced from the kernel trainer config instead of a battleScene.ts literal", () => {
      const command = createBattle2CommandAdapterCommand();
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
      const command = createBattle2CommandAdapterCommand();
      expect(command.field.player.moveIds).toEqual(
        BATTLE2_TURN1_KERNEL_CONFIG.player.moves,
      );
      expect(command.field.player.currentPP).toEqual(
        BATTLE2_TURN1_KERNEL_CONFIG.player.pp,
      );
    });

    it("starts in the action-enter lifecycle phase with a fresh idle-bounce clock, matching a freshly-opened command boundary", () => {
      const command = createBattle2CommandAdapterCommand();
      expect(command.lifecycle).toEqual({ phase: "action-enter", phaseElapsed: 0 });
      expect(command.idleBounceElapsed).toBe(0);
      expect(command.actionCursor).toBe(0);
      expect(command.fightCursor).toBe(0);
    });
  });

  describe("resolution phase: createBattle2CommandAdapterResolution", () => {
    it("emits ROCK_SLIDE_LINE1/LINE2 (battleMenu.ts's shared, already-generic text) as the kickoff message, not a Battle-2-private literal", () => {
      const resolution = createBattle2CommandAdapterResolution();
      const commands = resolution.segments[0]!.commands;
      expect(commands[0]).toMatchObject({
        type: "message",
        lines: [ROCK_SLIDE_LINE1, ROCK_SLIDE_LINE2],
      });
    });

    it("drains KABUTO's HP from 91 to 63 -- the same boundary battleScene.ts's rockSlideOpponentHp draw now reads from this resolution instead of formerly-hardcoded battle2Turn1.ts constants", () => {
      const resolution = createBattle2CommandAdapterResolution();
      const commands = resolution.segments[0]!.commands;
      const hpCommand = commands.find(
        (command) => command.type === "hp" && command.battler === 1,
      );
      expect(hpCommand).toMatchObject({
        type: "hp",
        battler: 1,
        from: 91,
        to: 63,
      });
    });

    it("commits ONIX's ROCK SLIDE PP 10 -> 9 (move slot 0) as a real kernel set-battler-pp-data event", () => {
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

    it("is a non-critical, non-flinching, single-target hit", () => {
      const kernel = stageBattle2Turn1Kernel();
      // There is no dedicated flinch event kind; a flinch surfaces as the
      // "flinched!" message on the flinched mon's action. Assert none printed.
      expect(
        kernel.transition.events.some(
          (event) =>
            event.payload.kind === "message" &&
            event.payload.messageId.includes("FLINCH"),
        ),
      ).toBe(false);
    });
  });

  describe("documented gap: the ROCK_SLIDE move-specific visual has no generic typed owner yet (flip left this open, not papered over)", () => {
    it("the resolution command's hit-animation carries only battler/eventSequence/timing -- no rock-sprite count, throw order, screen-shift, or blink geometry battleScene.ts's drawRockSprite/rockSlideRockState/rockSlideDrawOrder (private, Battle-2-adjacent helpers) draw from", () => {
      const resolution = createBattle2CommandAdapterResolution();
      const commands = resolution.segments[0]!.commands;
      const hitAnimation = commands.find((command) => command.type === "hit-animation");
      expect(hitAnimation).toBeDefined();
      expect(Object.keys(hitAnimation!).sort()).toEqual(
        ["battler", "eventSequence", "timing", "type"].sort(),
      );
      // battleResolutionPresentationRender.ts's generic "hit" render effect
      // (genericHitReactionAtAge) only ever produces a healthbox-shake
      // reaction -- it has no move-identity input at all, so it cannot
      // select ROCK_SLIDE's own rock-throw animation. battleScene.ts keeps
      // its private rock-sprite draw path for this frame family; this
      // adapter does not own it.
    });

    it("the same resolution transition also resolves KABUTO's SAND-ATTACK reply (accuracy stat-stage-change 6 -> 5) -- real kernel content beyond the legacy fixed window's own render range, which stopped at the opponent handoff tick and never rendered it", () => {
      const resolution = createBattle2CommandAdapterResolution();
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
