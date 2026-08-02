# Next-command handoff dispatcher retirement design

## Scope and snapshot

This is a source-census and migration design for the remaining #39
turn-keyed next-command dispatcher. It makes no production change and does
not need an oracle query.

BattleSceneState currently declares thirteen separately typed nullable
handoffs, initializes and copies them, then passes all thirteen positionally
to the FIGHT renderer. See src/engine/battleScene.ts:2514-2546,
2564-2580, 2594-2610, and 17401-17417. The reusable census command is
tools/census-next-command-handoffs.sh.

The assigned main-lane work is expected to remove opponentFaintDismissElapsed
and put its variable dismiss edge in the turn-13 resolution owner. The field
is still visible in this worktree at src/engine/battleScene.ts:2538-2546; this
design assumes it is gone and excludes it from the proposed handoff API.

Current counts:

| Surface | Count |
| --- | ---: |
| Completed-resolution handoff type declarations | 13 |
| Turn-keyed BattleSceneState fields | 13 |
| Positional handoff parameters of drawFightSubmenuWindow | 13 |
| Positional handoff parameters of currentPPForActiveMon | 13 |
| Per-field handoff assignments in src and tests | 289 |

The last count measures fixture cost, not thirteen independent semantic
producers. The renderer repeatedly forwards growing predecessor lists into
drawFightSubmenuChrome at src/engine/battleScene.ts:11555, 11645, 11861,
12672, 13253, 13593, 13839, 13956, 15377, and 15840; the chrome forwards all
thirteen to one PP helper at src/engine/battleScene.ts:7896-7919.

## Field census

### Exact declared fields

Every top-level and nested declared field is listed below. Receipt means
generic completed-command facts. Content means a fact consumed by a field,
window, or bounce presentation.

| Turn | Full declared field list | Classification and source |
| ---: | --- | --- |
| 1 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; hp: Readonly<{ player: number; opponent: number }>; presentationEpoch: Readonly<{ owner: "HandleInputChooseAction"; reset: "DoBounceEffect"; elapsed: number; mon: Readonly<{ seed: 192; delta: 7; amplitude: 1 }>; healthbox: Readonly<{ seed: 128; delta: 7; amplitude: 1 }> }>; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt plus HP and bounce-epoch content. Source: src/engine/turn1ResolutionAdapter.ts:11-35. |
| 2 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 2; hp: Readonly<{ player: number; opponent: number }>; presentationEpoch: Readonly<{ owner: "HandleInputChooseAction"; reset: "DoBounceEffect"; elapsed: number; mon: Readonly<{ seed: 192; delta: 7; amplitude: 1 }>; healthbox: Readonly<{ seed: 128; delta: 7; amplitude: 1 }> }>; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt plus HP and bounce-epoch content. Slot 2 is material. Source: src/engine/turn2ResolutionAdapter.ts:11-32. |
| 3 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; hp: Readonly<{ player: number; opponent: number }>; presentationEpoch: Readonly<{ owner: "HandleInputChooseAction"; reset: "DoBounceEffect"; elapsed: number; mon: Readonly<{ seed: 192; delta: 7; amplitude: 1 }>; healthbox: Readonly<{ seed: 128; delta: 7; amplitude: 1 }> }>; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt plus HP and bounce-epoch content. Source: src/engine/turn3ResolutionAdapter.ts:11-32. |
| 4 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; hp: Readonly<{ player: number; opponent: number }>; presentationEpoch: Readonly<{ owner: "HandleInputChooseAction"; reset: "DoBounceEffect"; elapsed: number; mon: Readonly<{ seed: 192; delta: 7; amplitude: 1 }>; healthbox: Readonly<{ seed: 128; delta: 7; amplitude: 1 }> }>; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt plus HP and bounce-epoch content. Source: src/engine/turn4ResolutionAdapter.ts:11-32. |
| 5 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only; switch and Sitrus content remains in its adapter. Source: src/engine/turn5ResolutionAdapter.ts:352-362. |
| 6 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only. Source: src/engine/turn6ResolutionAdapter.ts:12-22. |
| 7 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only. Source: src/engine/turn7ResolutionAdapter.ts:13-23. |
| 8 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 1; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only; slot 1 is material. Source: src/engine/turn8ResolutionAdapter.ts:12-22. |
| 9 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only. Source: src/engine/turn9ResolutionAdapter.ts:11-21. |
| 10 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only. Source: src/engine/turn10ResolutionAdapter.ts:11-21. |
| 11 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only. Source: src/engine/turn11ResolutionAdapter.ts:11-21. |
| 12 | playerPp: readonly [number, number, number, number]; persistedMoveSlot: 0; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only; the miss owns its exhausted PP result. Source: src/engine/turn12ResolutionAdapter.ts:11-21. |
| 13 | dragonBreathPp: Readonly<{ current: number; max: number }>; persistedMoveSlot: 2; nextCommand: Readonly<{ redraw: "settled"; input: "ready" }> | Receipt only, but not yet a full PP tuple. It is post-DRAGON_BREATH, not the later FLY owner. Source: src/engine/turn13ResolutionAdapter.ts:203-237. |

The expected common PP array is not literally present in all thirteen current
types: turns 1-12 carry playerPp, while turn 13 exposes only dragonBreathPp.
The generic owner must normalize turn 13 from the existing resumed rules
context, which already reads its slot-2 current PP at
src/engine/turn13ResolutionAdapter.ts:221-236. A design that says the source
already has thirteen uniform tuples would be inaccurate.

The shared receipt contract is therefore: a canonical four-slot PP tuple
(literal in turns 1-12 and normalized in turn 13), persistedMoveSlot, and
nextCommand.redraw/input. The exact nextCommand predicates all require both
facts: turn 1 at src/engine/turn1ResolutionAdapter.ts:71-75; turns 2-4 at
turn2ResolutionAdapter.ts:66-70, turn3ResolutionAdapter.ts:66-70, and
turn4ResolutionAdapter.ts:66-70; turns 5-8 at turn5ResolutionAdapter.ts:385-389,
turn6ResolutionAdapter.ts:44-48, turn7ResolutionAdapter.ts:45-49, and
turn8ResolutionAdapter.ts:45-49; turns 9-12 at
turn9ResolutionAdapter.ts:43-47, turn10ResolutionAdapter.ts:43-47,
turn11ResolutionAdapter.ts:44-48, and turn12ResolutionAdapter.ts:44-48; and
turn 13 at turn13ResolutionAdapter.ts:241-245. The only typed per-command
extras are HP plus presentationEpoch on turns 1-4 and the differently shaped
dragonBreathPp source on turn 13; turns 5-12 declare no extra handoff field.

### Field-to-reader map

| Field | Production readers | Migration requirement |
| --- | --- | --- |
| playerPp, turns 1-12 | currentPPForActiveMon reads the tuples and slots at src/engine/battleMenu.ts:2626-2668. FIGHT chrome reaches it through src/engine/battleScene.ts:7896-7919. | Store one full canonical tuple. Do not recover it by counting turn names. |
| dragonBreathPp, turn 13 | Only current is read in production, as the final slot-2 fallback at src/engine/battleMenu.ts:2674-2684. max is constructed but not read in production. | Normalize into the generic tuple and pin tuple slot 2 equal to legacy current. |
| persistedMoveSlot | core opens later FIGHT menus from slots 0, 1, and 2 at src/engine/core.ts:1374-1545. battleMenu reads turns 1-4 slots for early deductions at src/engine/battleMenu.ts:2626-2652. | Use one generic FightSubmenuSlot; a resolved-count or slot-0 default is invalid. |
| hp, turns 1-4 | Generic idle/base selection is at src/engine/battleScene.ts:7316-7367. Later overlay reads are at :7801-7802 and :7850-7851. Dedicated turn-3 and turn-4 readers are at :9213-9215 and :9458-9460. | Keep a content-owned field snapshot, not a PP-derived guess. |
| presentationEpoch, turns 1-4 | Lifecycle predicates compare openElapsed against the epoch at src/engine/turn1ResolutionAdapter.ts:83-98, turn2ResolutionAdapter.ts:77-92, turn3ResolutionAdapter.ts:77-92, and turn4ResolutionAdapter.ts:77-92. Renderer age reads are at src/engine/battleScene.ts:7452-7473, 7781-7837, 8684-8930, 9194, and 9448. | Carry an optional typed epoch. Its presence is content, not a turn-number selector. |
| nextCommand | The exact predicate definitions are listed above. Core calls them in its reopen ladder at src/engine/core.ts:1287-1551; battleScene calls them in the renderer at src/engine/battleScene.ts:7566-7650. The per-receipt call census follows. | Replace with one structural readiness predicate that still requires both settled redraw and input ready. |

The four elapsed-since-reset helpers are direct reader contracts, not merely
test helpers: turn 1 is declared at src/engine/turn1ResolutionAdapter.ts:93-98,
turn 2 at turn2ResolutionAdapter.ts:87-92, turn 3 at
turn3ResolutionAdapter.ts:87-92, and turn 4 at
turn4ResolutionAdapter.ts:87-92. battleScene invokes them at
src/engine/battleScene.ts:7460-7469, 7790-7834, 8688, 8782-8800, 9194, and
9448.

### Ready-predicate call census

This is the named production-call map for the nextCommand field. The core
entries are the actual reopen-chain reads; the renderer entries are all
identity checks outside the predicate definitions themselves.

| Receipt | Core ready-predicate calls | battleScene ready-predicate calls |
| --- | --- | --- |
| 1 | src/engine/core.ts:1291 | src/engine/battleScene.ts:7324, 8684, 8926 |
| 2 | src/engine/core.ts:1313 | src/engine/battleScene.ts:7329-7365, 7802, 7851, 8896 |
| 3 | src/engine/core.ts:1331 | src/engine/battleScene.ts:7327-7365, 7801, 7850, 9245 |
| 4 | src/engine/core.ts:1349 | src/engine/battleScene.ts:7325, 9487 |
| 5 | src/engine/core.ts:1362, 1381 | src/engine/battleScene.ts:7650 |
| 6 | src/engine/core.ts:1382, 1400 | src/engine/battleScene.ts:7642 |
| 7 | src/engine/core.ts:1401, 1420 | src/engine/battleScene.ts:7628 |
| 8 | src/engine/core.ts:1421, 1441 | src/engine/battleScene.ts:7620 |
| 9 | src/engine/core.ts:1442, 1461 | src/engine/battleScene.ts:7611 |
| 10 | src/engine/core.ts:1462, 1483 | src/engine/battleScene.ts:7602 |
| 11 | src/engine/core.ts:1484, 1503 | src/engine/battleScene.ts:7593 |
| 12 | src/engine/core.ts:1504, 1523 | src/engine/battleScene.ts:7569 |
| 13 | src/engine/core.ts:1524, 1547 | src/engine/battleScene.ts:7566 |

## Consumer map

### Sites that branch on handoff identity

| Site | Current branch | Required replacement |
| --- | --- | --- |
| src/engine/battleScene.ts:7324-7367 | Cascades through turns 1-4 for newest HP and player-overlay need. | Read one field snapshot from generic content. |
| src/engine/battleScene.ts:7507-7530 and 7764-7851 | Builds turn-2 through turn-5 lifecycle variables from the four epoch receipts, then selects kickoff and bounce formulas. | Read epoch/content from the generic owner. Do not substitute a previous turn redraw delay. |
| src/engine/battleScene.ts:7566-7659 | Tests turns 13 down through 5 to choose drawTurn13 through drawTurn6. | Replace only after a semantic FightCommandPresentation bridge exists. |
| src/engine/battleScene.ts:7801-7802, 7850-7851, 8684-8930, 9194, 9448 | Direct early-turn HP and epoch branches. | Migrate to generic field/epoch readers. |
| src/engine/battleMenu.ts:2626-2684 | Uses readiness and newest-non-null cascades to reconstruct current PP. | Fold to one latest tuple. |
| src/engine/core.ts:1128-1203 | Publishes four early receipts via predecessor lifecycle and source reset. | Preserve source reset timing while publishing one generic record. |
| src/engine/core.ts:1287-1551 | Thirteen-link predecessor-ready/successor-absent reopen ladder. | Replace with a semantic reopen-guard loop; no turn member or tuple lookup. |

### Threads that only need latest command facts

currentPPForActiveMon takes thirteen positional handoffs at
src/engine/battleMenu.ts:2579-2596 but produces one current four-slot tuple.
The 5-12 values only recover tuple slots at :2630-2669; turn 13 only
supplies the final slot-2 fallback at :2674-2684. drawFightSubmenuChrome
repeats the thirteen parameters solely to call that helper
(src/engine/battleScene.ts:7896-7919).

Eight of thirteen records, turns 5-12, contain only generic receipt fields:
PP, persisted slot, and readiness. Their downstream value threading is only
PP/slot display once a window is already selected. Turn 13 is a ninth compact
receipt after PP normalization, but it also has the retained-FLY owner
invariant. Turns 1-4 are the four contentful records: their HP and epoch are
live renderer inputs. All thirteen are unnecessarily forwarded into the PP
helper today.

## Proposed design

### Generic receipt plus existing content owners

Add one state field:

~~~ts
type CanonicalPlayerPp = readonly [number, number, number, number];

type LatestCompletedCommandHandoff = Readonly<{
  playerPp: CanonicalPlayerPp;
  persistedMoveSlot: 0 | 1 | 2 | 3;
  nextCommand: Readonly<{
    redraw: "settled";
    input: "ready";
  }>;
  content: FightCommandPresentation;
  reopenGuard: NextCommandReopenGuard;
}>;
~~~

BattleSceneState keeps only latestCompletedCommandHandoff. Per-turn move,
switch, text, HP-drain, and field content remains in existing resolution
adapters, staging modules, and BattleSceneResolutionOwner. Its common
FightCommandPresentation interface offers the existing content as field
snapshots, epoch facts, and generic draw layers; it has no turn number or
episode enum. Thus drawFightSubmenuWindow consumes content, rather than
testing the identity of a nullable state field. A PP-value-to-window map is
equally forbidden.

Before any old field is deleted, its adapter must freeze every value that a
later FIGHT frame still reads into that content object (or into the existing
resolution owner it references). The generic renderer may not reach back into
a discarded turnNNextCommandHandoff field. This is the cutover condition that
makes a one-field state safe rather than merely hiding a thirteen-way
dispatcher behind an interface.

NextCommandReopenGuard is a data-only bridge emitted by the semantic content
owner that knows the current command’s real settled action-menu edge. Given a
new A press, confirmation-relative state, and its associated owner, it either
reports not-ready or returns a successor generic handoff and updated
resolution owner. It has no turn member. Its contract preserves the existing
chain: the current handoff owns the guard for the command that follows it;
consuming that guard atomically installs the successor handoff.

Turn 1-4 publication remains distinct: write the generic receipt when
HandleInputChooseAction runs DoBounceEffect, not when a later A opens FIGHT.
That distinction is encoded in the current lifecycle predicates cited above.
A B-close/A-reopen reuses the immutable epoch rather than replacing it.

Turn 13 must produce a complete CanonicalPlayerPp from its existing rules
context. The migration pin is:

~~~ts
expect(generic.playerPp[2]).toBe(legacy.dragonBreathPp.current);
expect(generic.persistedMoveSlot).toBe(legacy.persistedMoveSlot);
~~~

This preserves the post-DRAGON_BREATH receipt and rejects the later FLY
owner’s PP boundary, documented by
docs/rank2-turn13resolved-predecessor-audit.md:10-21.

### Final signatures and core loop

The final renderer takes one handoff:

~~~ts
function drawFightSubmenuWindow(
  fb: Uint8Array,
  t: number,
  submenu: FightSubmenuState,
  latest: LatestCompletedCommandHandoff | null,
  resolutionOwner: BattleSceneResolutionOwner | null,
  trainerPresentation?: FactoryTrainerPresentation,
): void;
~~~

Under the assigned assumption, no opponent-faint tick parameter remains. The
PP helper becomes currentPPForActiveMon(moveset, latest, lockedResolution,
followingResolution), returning latest.playerPp when neither resolution
override applies. The current locked/following precedence remains the one at
src/engine/battleMenu.ts:2674-2684.

The core loop has the following shape:

~~~ts
const latest = battleScene.latestCompletedCommandHandoff ?? null;
const transition = latest === null
  ? publishInitialCompletedCommandFromController(state)
  : consumeNextCommandReopenGuard(
      latest.reopenGuard,
      battleScene.resolutionOwner,
      fightSubmenu,
      newKeys,
      battleScene.elapsed + 1,
    );

if (transition !== null) {
  fightSubmenu = openFightSubmenu(
    battleScene.elapsed + 1,
    activeMonMoveset(draftScreen),
    transition.handoff.persistedMoveSlot,
  );
  battleScene = {
    ...battleScene,
    latestCompletedCommandHandoff: transition.handoff,
    resolutionOwner: transition.resolutionOwner,
  };
}
~~~

Neither operation branches on a completed turn or infers an episode from PP.
The content adapter has already provided its true redraw edge and successor
receipt.

### Named content-routing blocker

The current generic receipt fields cannot by themselves choose every renderer.
The branch at src/engine/battleScene.ts:7569-7659 chooses drawTurn6 through
drawTurn13 by which turn5-12 field is ready, while those eight type
declarations contain only PP, slot, and readiness. The renderer needs
Pidgeotto or Murkrow field state, bounce regime, and upcoming
move/text-presentation content. None is present in a generic 5-12 receipt.

Do not replace that branch with PP tuple matching. It would be a concealed
episode selector. First introduce a FightCommandPresentation bridge supplied
by the existing content/resolution adapters; it must expose semantic
field/bounce/kickoff facts to the generic renderer. Until then, the high-turn
renderer is an explicit blocker rather than an excuse to retain turn-keyed
state.

The retained turn-13 FLY path is a second invariant: battleScene throws when
a turn-13 handoff lacks the retained presentation owner at
src/engine/battleScene.ts:7566-7568, then uses the owner’s charge and strike
segments at :7531-7564. Generic PP and slot facts cannot replace that
relationship.

## Risks and traps

1. The cross-turn bounce bug has already recurred three times. Turn 2
   hardcoded turn 1’s ON-fit delay, turn 3 hardcoded turn 2’s, and turn 4
   hardcoded turn 3’s; the findings and fixes are recorded at
   ISSUES.md:296-303, 348-353, and 394-401. The generic design prevents this
   by passing a semantic reset/settled edge or epoch age from the content
   owner, never a named predecessor delay constant.
2. Handler installation is not input-ready. The early receipt must publish
   on the first HandleInputChooseAction/DoBounceEffect execution, not one
   tick earlier; see docs/turn1-4-epoch-prep.md:281-287.
3. Same-turn B-close/A-reopen is not a new epoch; the same evidence records
   that it keeps the completed turn’s phase
   (docs/turn1-4-epoch-prep.md:285-287).
4. The supervisor history says the turns 1-4 dossier recorded eight
   one-field-worker traps at PROGRESS-archive.md:291-299. The actual trap
   list includes cross-field reset chains, shared HP readers, kickoff
   identity versus monotonic history, nonuniform slots, dead-mirror
   non-equivalence, and adapter presence not being readiness
   (docs/turn1-4-epoch-prep.md:276-307). The owner-chain audit adds the
   same-shape sibling list: early fields are not ordinary predecessor
   mirrors, slots 2 and 1 differ, and move adapters do not imply combined
   completion (docs/turn-resolved-owner-chain-audit.md:221-244).
5. Do not reuse the turn-13 receipt for turn 12 or read the later FLY owner:
   that crosses a command boundary, exactly the trap in
   docs/rank2-turn13resolved-predecessor-audit.md:10-21.

## Slice plan

Every acceptance entry means differential replay of the named committed trace
files against a clean-parent app build with its existing captureFrames list
byte-identical app-vs-app. No slice may thin, edit, or replace a capture list.
Historical trace profiles remain their established insurance profile; the
explicit Scene-OFF names are authority for their listed windows.

| Slice | Exact files touched and bounded result | Differential-replay windows | Out of scope |
| --- | --- | --- | --- |
| 1. Uniform receipt contract, turns 5-13 | Add src/engine/nextCommandHandoff.ts and tests/nextCommandHandoff.test.ts. Touch src/engine/turn5ResolutionAdapter.ts, src/engine/turn6ResolutionAdapter.ts, src/engine/turn7ResolutionAdapter.ts, src/engine/turn8ResolutionAdapter.ts, src/engine/turn9ResolutionAdapter.ts, src/engine/turn10ResolutionAdapter.ts, src/engine/turn11ResolutionAdapter.ts, src/engine/turn12ResolutionAdapter.ts, src/engine/turn13ResolutionAdapter.ts; and tests/turn5ResolutionAdapterEquivalence.test.ts, tests/turn6ResolutionAdapterEquivalence.test.ts, tests/turn7ResolutionAdapterEquivalence.test.ts, tests/turn8ResolutionAdapterEquivalence.test.ts, tests/turn9ResolutionAdapterEquivalence.test.ts, tests/turn10ResolutionAdapterEquivalence.test.ts, tests/turn11ResolutionAdapterEquivalence.test.ts, tests/turn12ResolutionAdapterEquivalence.test.ts, tests/turn13ResolutionAdapterEquivalence.test.ts. Export/normalize generic values, including a full turn-13 tuple; leave state and render callers unchanged. | tools/compare/traces/turn5-rockslide.json 256, turn5-faint.json 110, turn5-switchin.json 241, turn5-sitrus-a/b/c/d.json 110/82/181/133; turn6-menu.json 44 and turn6-rockslide-a/b.json 255/105; turn7-menu.json 93 and turn7-rockslide-a/b/c/d.json 256/256/256/19; turn8-menu.json 88 and turn8-bind-a/b.json 256/66; turn9-quickattack-off.json 233, turn9-quickattack-b-off.json 231, turn9-rockslide-off.json 256; turn10-menu-off.json 83, turn10-aerialace-off.json 206, turn10-rockslide-off.json 255, turn10-rockslide-off-b.json 131; turn11-featherdance-off.json 191, turn11-rockslide-off.json 256; turn12-menu.json 46, turn12-aerialace-off.json 247, turn12-rockslide-miss-off.json 256; turn13-menu.json 57, turn13-dragonbreath-faint.json 141, turn13-switchin.json 242. | BattleSceneState, renderer signatures, and content dispatch. |
| 2. Shadow generic latest and PP | Touch src/engine/nextCommandHandoff.ts, src/engine/battleMenu.ts, src/engine/battleScene.ts, src/engine/core.ts, tests/battleMenu.test.ts, tests/battleSetup.test.ts, tests/fightSubmenu.test.ts, and tests/nextCommandHandoff.test.ts. Write a verified 5-13 shadow latest receipt and prove generic PP agrees with legacy PP. | The complete slice-1 list, especially Scene-OFF reader pairs: turn 9 720, turn 10 675, turn 11 447, turn 12 503. | Delete no legacy fields or imports; change no render route. |
| 3. Pidgeotto content bridge, turns 5-8 | Add src/engine/fightCommandPresentation.ts. Touch src/engine/battleScene.ts, turn5ResolutionAdapter.ts, turn6ResolutionAdapter.ts, turn7ResolutionAdapter.ts, turn8ResolutionAdapter.ts, tests/battleScene.test.ts, tests/fightSubmenu.test.ts, tests/nextCommandHandoff.test.ts. Expose semantic field/bounce/kickoff content without a turn member. | turn5 primary 1,113; turn6-menu 44 plus turn6-rockslide-a/b 255/105; turn7-menu 93 plus turn7-rockslide-a/b/c/d 256/256/256/19; turn8-menu 88 plus turn8-bind-a/b 256/66; turn9 Scene-OFF reader set 720. | Turns 9-13 bridge content and all early epochs. |
| 4. High-chain bridge and retained FLY, turns 9-13 | Touch src/engine/fightCommandPresentation.ts, src/engine/battleScene.ts, turn9ResolutionAdapter.ts, turn10ResolutionAdapter.ts, turn11ResolutionAdapter.ts, turn12ResolutionAdapter.ts, turn13ResolutionAdapter.ts, tests/battleScene.test.ts, tests/fightSubmenu.test.ts, tests/turn13ResolutionAdapterEquivalence.test.ts, tests/nextCommandHandoff.test.ts. Preserve charge/strike ownership as content. | turn9 720; turn10 675; turn11 447; turn12 503; turn13-menu 57, turn13-dragonbreath-faint 141, turn13-switchin 242. | State cut and early receipts. |
| 5. Cut 5-13 state and core ladder | Touch src/engine/nextCommandHandoff.ts, src/engine/fightCommandPresentation.ts, src/engine/core.ts, src/engine/battleScene.ts, src/engine/battleMenu.ts, tests/battleMenu.test.ts, tests/battleScene.test.ts, tests/fightSubmenu.test.ts, tests/turn17.test.ts, tests/nextCommandHandoff.test.ts. Replace 5-13 state/reopen use with the generic guard loop after shadow equivalence passes. | Full slice-1 list with unmodified capture lists. | The four epoch records, all final parameter deletions, and test fixture cleanup. |
| 6. Turn-1 epoch/content fold | Touch src/engine/nextCommandHandoff.ts, src/engine/fightCommandPresentation.ts, turn1ResolutionAdapter.ts, battleScene.ts, core.ts, battleMenu.ts, tests/turn1ResolutionAdapterEquivalence.test.ts, tests/battleScene.test.ts, tests/battleMenu.test.ts, tests/fightSubmenu.test.ts, tests/battleSetup.test.ts, tests/nextCommandHandoff.test.ts. | turn1-kickoff-off 81, turn1-cloneanim-off 230, turn1-rockslide-off 256, turn1-drain-off 102, turn2-endeavor-off 256, turn2-dragonbreath-off 237. | Turns 2-4 and final API cleanup. |
| 7. Turn-2 epoch/content fold | Touch src/engine/nextCommandHandoff.ts, src/engine/fightCommandPresentation.ts, turn2ResolutionAdapter.ts, battleScene.ts, core.ts, battleMenu.ts, tests/turn2ResolutionAdapterEquivalence.test.ts, tests/battleScene.test.ts, tests/battleMenu.test.ts, tests/fightSubmenu.test.ts, tests/battleSetup.test.ts, tests/nextCommandHandoff.test.ts. | turn2-endeavor-off 256, turn2-dragonbreath-off 237, turn3-endeavor-off 255, turn3-rockslide-off 161. | Turns 3-4 and final API cleanup. |
| 8. Turn-3 epoch/content fold | Touch src/engine/nextCommandHandoff.ts, src/engine/fightCommandPresentation.ts, turn3ResolutionAdapter.ts, battleScene.ts, core.ts, battleMenu.ts, tests/turn3ResolutionAdapterEquivalence.test.ts, tests/battleScene.test.ts, tests/battleMenu.test.ts, tests/fightSubmenu.test.ts, tests/battleSetup.test.ts, tests/nextCommandHandoff.test.ts. | turn3-endeavor-off 255, turn3-rockslide-off 161, turn4-doubleteam-off 256, turn4-rockslide-off 256. | Turn 4 and final API cleanup. |
| 9. Turn-4 fold and missing reader bank | Touch src/engine/nextCommandHandoff.ts, src/engine/fightCommandPresentation.ts, turn4ResolutionAdapter.ts, battleScene.ts, core.ts, battleMenu.ts, tests/turn4ResolutionAdapterEquivalence.test.ts, tests/battleScene.test.ts, tests/battleMenu.test.ts, tests/fightSubmenu.test.ts, tests/battleSetup.test.ts, tests/nextCommandHandoff.test.ts, plus newly banked turn-5 Scene-OFF traces. | turn4-doubleteam-off 256, turn4-rockslide-off 256, plus new dense turn-5 readers covering reset 5351/5352, reopen 5926/5927, confirm 5958/5959, completion, and turn-6 first reopen as required by docs/turn1-4-epoch-prep.md:255-272. | Final signature deletion until those new readers are committed. |
| 10. Final interface and fixture cut | Touch src/engine/battleScene.ts, src/engine/battleMenu.ts, src/engine/core.ts, src/engine/nextCommandHandoff.ts, src/engine/fightCommandPresentation.ts, tests/battleMenu.test.ts, tests/battleMenuIdle.test.ts, tests/battleScene.test.ts, tests/battleSetup.test.ts, tests/fightSubmenu.test.ts, tests/turn17.test.ts, tests/nextCommandHandoff.test.ts, and new tests/helpers/battleSceneState.ts. This slice deletes the thirteen TurnNCompletedResolutionNextCommandHandoff imports from battleScene.ts and battleMenu.ts, all thirteen BattleSceneState handoff fields, and the thirteen positional drawFightSubmenuWindow/currentPPForActiveMon handoff parameters. | Union of slices 1 and 6-9 with every capture list unchanged. Rerun tools/census-next-command-handoffs.sh and require state fields 13 to 0, FIGHT parameters 13 to 0, PP parameters 13 to 0, and battleScene.ts/battleMenu.ts per-turn type imports 13 to 0. | New behavior, trace edits, a turn-number selector, or unrelated #39 retirement. |
