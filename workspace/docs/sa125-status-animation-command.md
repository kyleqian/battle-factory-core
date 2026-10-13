# sa125 (S10A, ISSUES #168 slices SA1 + SA3): the Scene ON `status-animation` command (ROM durations) and the `status` stand-in cleanup

Base: master `cfe4e26ca` (production src `b4befa039`). Design pack: `docs/sta123-status-animations-design.md` (§4 row model, §5 SA1 / SA3).
Production change: `src/engine/battleResolutionPresentation.ts` (the projection, `STATUS_ANIMATION_ADDED_ROWS`, `sceneOnStatusFrames`),
`battleResolutionPresentationRender.ts` (duration case; field unchanged), `sceneOffPresentation.ts` (the legacy compat projection ignores
the command like the other typed animation commands). **Timing only: no pixels** (renderers are SA4..SA8); the IsBattleSEPlaying gate
is SA2 (flagged here, not modelled). No kernel, RNG, damage, turn order or facility change.

## 1. Results first

__RESULTS__

## 2. The rule

- **SA1.** At each kernel `status-animation` receipt (`battleScriptEvents.ts`: battler, isStatus2, status — emitted only in Scene ON,
  never behind a Substitute or for a semi-invulnerable battler: `prepareRulesStatusAnimation`, unchanged), the builder pushes
  `{ type: "status-animation", eventSequence, battler, animation, timing: { minimumFrames } }` at the receipt's position, where
  `animation = spriteOrderStatusAnimationName(isStatus2, status)` (InitAndLaunchChosenStatusAnimation's priority, reused, not duplicated)
  and `minimumFrames = STATUS_ANIMATION_ADDED_ROWS[animation]` = the §4 controller rows: **PSN 71, CONFUSION 100, BRN 39, INFATUATION
  97, SLP 97, PRZ 39, FRZ 117, CURSED 75, NIGHTMARE 75** (WRAPPED / none: no command; WRAPPED has no table entry and never plays).
  Duration = minimumFrames; the renderer draws the ordinary field (no effect).
- **SA3.** In Scene ON a `status` command (set-battler-status-data) whose battler's status animation runs in the same execution — right
  before the print (infliction: status, statusanimation, print) or right after it (sleep / frozen turn: status, print, waitmessage,
  statusanimation) — lasts off121's Scene OFF value **delta(print) − delta(status)** (`sceneOnStatusFrames`); with the status-animation
  command after it, the ROM status write → animation → print timeline is the Scene OFF one plus exactly the controller rows. Every other
  status write keeps its 32 frames (faint, Rest, wake-up, thaw, item cures: no status animation in their scripts). Scene OFF is untouched
  (no receipt there, and `sceneOffStatusFrames` is unchanged).
- **Gate (SA2), flagged only:** an inflicted-path receipt (its preceding receipt is not a print) after a damaging hit since "X used Y!".
  ROM: FRZ after Ice Beam holds 133 / 134 rows (gate 17 / 18 + 115 active + 1) vs production 117 (16 / 17 rows short).

## 3. Per-path anchors (ROM vs production)

ROM (`tools/integration/fixtures/sta123/receipts/rom-r1.json`, 18 scenarios, both sides, r1 == r2 per sta123): a Scene ON statusanimation
executes in 1 row and the next instruction waits **controllerRows** = active rows + 1 on all 52 non-gated receipts; Scene OFF runs the same
instruction in 1 row with 0 controller rows and the same next label. So, from the statusanimation row, the next instruction (and the next
print's first glyph, 2 rows after its execution in both scenes, off121) lands exactly **controllerRows later in ON than in OFF**.

Production (test `sa125: production routes`, census seeds 7 / 11 / 12 / 18 / 19 / 20 / 60 / 76 / 87, Scene ON vs Scene OFF, identical
prints): for every status-animation command, the frames from its anchor (the latest print before it, or the end of the latest body, the
status command start on the infliction paths) to the command right after it are **ON − OFF = minimumFrames = the ROM controllerRows**,
with every command between the two identical in both scenes. 212 anchored commands, **0 off by any frame**; 1 unanchored (a body in the
span differs by scene). Since Scene OFF's status → print span is ROM-exact (off121: residual 0 per class, absolute F − G anchors on
Toxic / Thunder Wave / Rest), Scene ON's following print lands on the ROM row on every measured path:

| animation | path (prev receipt) | sides covered (production) | ROM controllerRows (rom-r1) | production ON − OFF |
|---|---|---|---|---|
| PSN | inflicted (Toxic / secondary / Poison Point) | player, opponent | 71 | 71 |
| PSN | end-turn tick (STRINGID_PKMNHURTBYPOISON) | player, opponent | 71 | 71 |
| PRZ | inflicted (Thunder Wave / secondary / Static) | player, opponent | 39 | 39 |
| PRZ | can't move (STRINGID_PKMNISPARALYZED) | player, opponent | 39 | 39 |
| SLP | inflicted (Spore / Hypnosis / ...) | player, opponent | 97 | 97 |
| SLP | sleep turn (STRINGID_PKMNFASTASLEEP) | player, opponent | 97 | 97 |
| CONFUSION | inflicted (chosenstatus2animation; after a stat print: Swagger) | player, opponent | 100 | 100 |
| CONFUSION | confusion self-check (STRINGID_PKMNISCONFUSED) | player, opponent | 100 | 100 |
| INFATUATION | in-love check (STRINGID_PKMNINLOVE) | player, opponent | 97 | 97 |
| BRN | inflicted (Will-O-Wisp / secondary) | player, opponent | 39 | 39 |
| BRN | end-turn tick (STRINGID_PKMNHURTBYBURN) | player, opponent | 39 | 39 |
| FRZ | inflicted after a damaging hit (Ice Beam): **gated, flagged** | opponent | **133 / 134** (gate 17 / 18) | 117 (16 / 17 rows short: SA2) |
| FRZ | frozen turn | (none in seeds 0..99) | 117 | 117 by construction (census) |
| CURSED / NIGHTMARE | end-turn tick | (none in seeds 0..99) | 75 / 75 | 75 / 75 by construction (census) |

No measured path fails the anchor except the gated FRZ-after-Ice-Beam class (SA2's).

__CENSUS__
