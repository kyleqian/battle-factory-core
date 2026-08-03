# ISSUES #66(b) Part 2 verdict — stat-name capitalization, CONFIRMED and fixed

## The question

3631116d (#66a) flagged that `battleResolutionPresentation.ts`'s
pre-existing `STRINGID_ATTACKERSSTATROSE`/`FELL` and
`STRINGID_DEFENDERSSTATROSE`/`FELL` branches resolve `{B_BUFF1}` from
`lastStatChange.stat` directly — the engine's internal enum-shaped string
("attack", always lowercase) — while the real ROM's `{B_BUFF1}` for every
stat-change message is `ChangeStatBuffs`'s `PREPARE_STAT_BUFFER` copy of
`gStatNamesTable` ("ATTACK", capitalized for the five main stats).
`docs/issue66a-stats-wont-increase-oracle-receipt.md`'s frame 230 is
oracle evidence of the real capitalized text. But two standing
oracle-accepted OFF traces (`turn11-featherdance-off`,
`turn4-doubleteam-off`) pass byte-identical despite this — so the fix was
not applied on faith. This step's brief: determine which render route is
responsible, then produce a discriminating artifact before touching code.

## Step 1: which route renders `messageLines` output to pixels

Two routes draw battle message text in this codebase:

1. **The generic kernel-driven route.** `createBattleResolutionPresentation`
   (`battleResolutionPresentation.ts`) resolves every "message" semantic
   event through `messageLines()`, whose `STRINGID_*STATROSE`/`FELL`
   branches are the ones in question. Its output feeds
   `createBattleResolutionPresentationRenderView`
   (`battleResolutionPresentationRender.ts`), and the render view's
   `message.lines` is drawn verbatim by `renderBattleResolutionSceneOffView`
   (`battleScene.ts:33833`) via `drawBattleMessageTextLines` ->
   `drawText(fb, font, charmap, ...)` (`battleScene.ts:3729-3741`) — no case
   transformation anywhere in that call chain. This is the route every new
   Factory battle (arbitrary species/moves, beyond the retired Battle-2
   hardcoded turns) actually uses.

2. **The legacy turn-owned route.** Per-turn dispatchers in `battleScene.ts`
   (`drawTurn4KickoffText`, `drawTurn6FeatherDanceKickoffText`, etc.) draw
   hardcoded `LINE1`/`LINE2` string *constants*, computed once at module
   load time. Both `turn11-featherdance-off` and `turn4-doubleteam-off`
   render through this route, not route 1.

## Step 2: do the legacy windows actually exercise the bug?

No — confirmed by reading the staging modules that back those constants:

- `turn6FeatherDancePresentationStaging.ts`'s `resolveTurn6AtkFellLines`
  (feeding `TURN6_ATKFELL_KICKOFF_LINE1/2`, reused by turn 11's repeat-use
  window) has its **own local** `statDisplayName()` lookup
  (`turn6FeatherDancePresentationStaging.ts:96-99`) sourced from
  `battleMessageTemplates.statNames`, explicitly **not** the shared
  `battleResolutionPresentation.ts` resolver — the module's own comment
  (`:91-93`) says so directly: "this module's own local `B_BUFF1` resolver,
  NOT added to the shared `battleStringResolver.ts`". So turn 11's ATK-fell
  banner ("ONIX's ATTACK\nharshly fell!") never touches the buggy code
  path at all.
- `turn4DoubleTeamPresentationStaging.ts`'s `resolveTurn4DoubleTeamKickoffLines`
  only supplies the *kickoff* line ("Foe GROVYLE used\nDOUBLE TEAM!",
  `STRINGID_USEDMOVE`), not the stat-rise banner. And EVASION's real name
  ("evasiveness") differs from the internal enum string ("evasion") by
  more than case anyway, so even a shared-path EVASION banner would not
  isolate a pure-capitalization bug the way ATK/DEF/SPD/SPATK/SPDEF do.

Conclusion for step 1: hypothesis 2 from the brief holds. The two standing
traces render through the legacy per-turn route, which independently
reimplements the correct capitalized lookup — they cannot observe the
shared-function bug.

## Step 3: discriminating artifact (pixel-level)

The generic route (route 1 above) **is** real production code — it's what
`tests/battleResolutionStatsWontIncreaseInsurance.test.ts` (#66a) and this
step's own `tests/battleResolutionPreclampMagnitudeInsurance.test.ts`
(#66b Part 1) drive end-to-end via
`createFactoryFullTurnBattleState`/`submitFactoryFullTurnDecision`/
`createBattleResolutionPresentation`. To get pixel evidence without
needing to replicate the oracle trace's exact mechanicLab-derived party
(irrelevant to the message-box region), this step reran the same SWORDS
DANCE turn-1 scenario (ONIX, uncapped 6->8, `STRINGID_ATTACKERSSTATROSE`)
through the real `renderBattleResolutionSceneOffView` and cropped the
message-text-box region (`LINE1_ORIGIN`/`LINE2_ORIGIN`, `battleScene.ts:
3726-3727`, x:[0,240) y:[113,153)) against the oracle-committed
`tools/compare/fixtures/issue66a-swords-dance-cap/frame-00230-attackersstatrose.png`.

**Before the fix** (`before-fix-engine-crop.png`, this directory): engine
prints `["ONIX's attack", "sharply rose!"]` — **162 of 9600 cropped pixels
differ** from the oracle capture (entirely within the word "ATTACK" vs
"attack"; the second line, unaffected by `{B_BUFF1}`, is pixel-identical).

**After the fix** (`after-fix-engine-crop.png`, this directory): engine
prints `["ONIX's ATTACK", "sharply rose!"]` — **0 of 9600 cropped pixels
differ** from `oracle-crop-frame00230.png` (byte-identical).

## Fix applied

`battleResolutionPresentation.ts`'s `STRINGID_ATTACKERSSTATROSE`/`FELL`
and `STRINGID_DEFENDERSSTATROSE`/`FELL` branches now resolve `{B_BUFF1}`
via the same `STAT_DISPLAY_NAME` table 3631116d already added for the
`STATSWONTINCREASE`/`DECREASE` branches, instead of raw
`lastStatChange.stat`. Pinned by the existing
`tests/battleResolutionAttackerStatFellInsurance.test.ts` and
`tests/silverWindAllStatsUpRepro.test.ts` (updated to their now-correct
capitalized expectations) plus this step's own
`tests/battleResolutionPreclampMagnitudeInsurance.test.ts`.

## Reproduce

The pixel probe was a throwaway script (not committed); rebuild it by
driving `createFactoryFullTurnBattleState`/`submitFactoryFullTurnDecision`
with player ONIX knowing SWORDS DANCE (move 14) vs opponent RATTATA
knowing SPLASH (move 150), taking the player's SWORDS DANCE decision on
turn 1, then rendering the `STRINGID_ATTACKERSSTATROSE` message command's
render view through `renderBattleResolutionSceneOffView` and cropping
x:[0,240) y:[113,153) against
`tools/compare/fixtures/issue66a-swords-dance-cap/frame-00230-attackersstatrose.png`.
