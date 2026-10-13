# sa125 (S10A, ISSUES #168 slices SA1 + SA3): the Scene ON `status-animation` command (ROM durations) and the `status` stand-in cleanup

Base: master `cfe4e26ca` (production src `b4befa039`). Design pack: `docs/sta123-status-animations-design.md` (§4 row model, §5 SA1 / SA3).
Production change: `src/engine/battleResolutionPresentation.ts` (the projection, `STATUS_ANIMATION_ADDED_ROWS`, `sceneOnStatusFrames`),
`battleResolutionPresentationRender.ts` (duration case; field unchanged), `sceneOffPresentation.ts` (the legacy compat projection ignores
the command like the other typed animation commands). **Timing only: no pixels** (renderers are SA4..SA8); the IsBattleSEPlaying gate
is SA2 (flagged here, not modelled). No kernel, RNG, damage, turn order or facility change.

## 1. Results first

| Question | Answer |
|---|---|
| The rule (SA1) | Scene ON: each kernel `status-animation` receipt -> a `status-animation` command (battler, animation = InitAndLaunchChosenStatusAnimation's pick, `minimumFrames` = **PSN 71, CONFUSION 100, BRN 39, INFATUATION 97, SLP 97, PRZ 39, FRZ 117, CURSED 75, NIGHTMARE 75**, `STATUS_ANIMATION_ADDED_ROWS`). Timing only; Scene OFF has none (the kernel emits no receipt). |
| ROM receipts | sta123 `rom-r1.json`: all 52 non-gated Scene ON receipts hold the next instruction exactly the table's rows (= active rows + 1), both sides, every path; OFF 0 rows on all 54. The 2 gated receipts (FRZ right after Ice Beam's hit) hold 133 / 134. |
| Per-path anchors | Production ON − OFF (same census battles, identical prints) from the anchor to the command after the status animation = the ROM rows, **212 / 212 anchored commands exact** (9 seeds; PSN / PRZ / SLP / CONFUSION / INFATUATION / BRN / FRZ, infliction and after-print paths, both sides; §3). Fails only on the gated class (FRZ after a damaging hit: 16 / 17 rows short; SA2). |
| The rule (SA3) | Scene ON `status` command followed by its battler's status animation in the same execution lasts **delta(print) − delta(status)** (off121's OFF value): infliction 32 -> 2, sleep / frozen turns 32 -> 1. Others keep 32 (§4). Scene OFF byte-identical. |
| Gate (SA2) flags | __GATE__ |
| Pins moved | 5 pins in 5 files (`tools/integration/fixtures/sa125/pins.json`; + 1 environmental failure of the archive copy): off121's Scene ON guard (SA3 itself), stl109's turn-58 route budget (+3,298 − 1,044 frames: 27,992 -> 30,246 > the replay's 30,000 budget), liveBattlerX2History's body key (+1 command index), liveSpriteOrderHost's sweep (+13 status-animation edges, 0 mismatches), sc106's Tickle route total (+478 − 30 = 9,177 -> 9,625). **No soak pin moved** (the soak plays Scene OFF). |
| Census 0..999 | __CENSUSROW__ |
| Differential | `compare:differential fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base cfe4e26ca`: **PASS, 624 / 624 captures byte-identical** (no capture moved). |

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

## 4. SA3 table (Scene ON `status` command, base -> final; census 0..999, untruncated battles)

Re-derived for ON from off121's ON probes (`tools/integration/fixtures/off121/receipts/rom-r1.json` `on.events`: status row S_exec -> the
print instruction P, the same P − S_exec as OFF: Toxic / Thunder Wave / Will-O-Wisp / Spore 2, sleep turns 1) and sta123's `rom-r1.json`
(the statusanimation between them is 1 row + controllerRows, the latter owned by the status-animation command). Residual = production
status frames − kernel delta(print) − delta(status) = 0 per class.

| class (the print after the status write) | status animation follows (same battler, same execution) | ROM P − S_exec (off121 ON probes) | ON frames base -> final | residual | census 0..999 |
|---|---|---|---|---|---|
| infliction: PKMNWASPARALYZED / WASPARALYZEDBY / FELLASLEEP / MADESLEEP / BADLYPOISONED / WASPOISONED / POISONEDBY / WASBURNED / BURNEDBY / WASFROZEN | yes, before the print | 2 (Toxic, Thunder Wave, Will-O-Wisp, Spore; both sides) | 32 -> **2** | 0 | 463 + 43 + 310 + 3 + 167 + 47 + 47 + 79 + 18 + 43 = **1,220** |
| sleep turn: PKMNFASTASLEEP | yes, after the print | 1 (Spore scenarios, x3 each side) | 32 -> **1** | 0 | **1,483** |
| frozen turn: PKMNISFROZEN | yes, after the print | not staged by off121 (kernel delta 1, as OFF) | 32 -> **1** | 0 (kernel) | **104** |
| sleep turn behind a Substitute (kernel suppresses the animation) | no | — | 32 (kept) | — | 6 |
| faint: TARGETFAINTED / ATTACKERFAINTED | no (1 ATTACKERFAINTED is followed by the OTHER battler's animation) | — | 32 (kept) | — | 3,856 / 466 |
| wake-up PKMNWOKEUP, Rest PKMNWENTTOSLEEP / SLEPTHEALTHY, thaw PKMNWASDEFROSTED(2) | no | — | 32 (kept) | — | 583 / 443 + 24 / 26 |
| item / ability cures: SITEMWOKEIT / SITEMCUREDPROBLEM / SITEMCUREDPARALYSIS / SITEMCUREDPOISON / HEALEDPARALYSIS | no | — | 32 (kept) | — | 133 / 96 / 13 / 1 / 4 |

SA3 frames: 1,220 x −30 + (1,483 + 104) x −31 = **−85,797** (census `statusFramesDelta`). Classes kept at 32: 5,651 status commands (the
stand-in stays wherever the ROM plays no status animation; those classes are a separate fidelity item, not this slice's).

## 5. Pins moved (`tools/integration/fixtures/sa125/pins.json`, `tools/integration/sa125Pins.py`)

Patched copy (git archive `a67a38741` = final production src `9e124ee2f`, pins not yet moved; reference/ linked, artifacts/ copied), full
suite two shards, 4 workers: shard 1 **3 failed / 817 passed files** (7,052 tests passed, 3 failed), shard 2 **3 failed / 817 passed**
(6,483 passed, 3 failed). The 6 failures:

| file | test | moved by | new value |
|---|---|---|---|
| tests/off121StatusCommand.test.ts | Scene ON guard | SA3 itself | "stays 32 unless its status animation follows (then delta(print) − delta(status))" |
| tests/stl109Struggle.test.ts | turn-58 route | +34 status animations (3,298) − 34 SA3 statuses (1,044) = +2,254 frames: 27,992 -> 30,246 (base / final measured) > the replay's 30,000 budget | the route passes 40,000 (new optional `frameBudget` parameter of `generatedCommandAnimationReplay`, default 30,000) |
| tests/liveBattlerX2History.test.ts | seed 110 keys | one status-animation command before the body in segment 1:0 (command index +1) | `1:0:17` -> `1:0:18` (bodies / inputs / parity unchanged) |
| tests/liveSpriteOrderHost.test.ts | 20-battle sweep | + 13 status-animation command edges (10 host-known), 0 mismatches | compared 882 -> 895, hostKnown 788 -> 798 |
| tests/sc106StatsChangeCommand.test.ts | Tickle route total | + 4 CONFUSION + 2 PRZ (478) − 30 (one SA3 status 32 -> 2), all after the anchor | 9,177 -> 9,625 (`tests/helpers/sa125Rows.ts`) |
| tests/appDifferential.test.ts | CLI guard | ENVIRONMENT: the copy is a one-commit repo (`HEAD^`); passes in the worktree | not a pin |

No soak pin moved: `randomRoundSoak` plays Scene OFF (`battleSceneMode` default "off"), where sa125 changes nothing; its decision logs
are therefore identical by construction (and the Scene OFF census is byte-identical).

## 6. Census 0..999 (base `cfe4e26ca` vs final, sa125LiveShareCensus.ts ten shards per tree + hist73Merge; off108Route.ts --scene=off)

__CENSUSBODY__


## 7. Tests (`tests/sa125StatusAnimationCommand.test.ts`, 11 tests)

- ROM receipts: every non-gated ON receipt == the table (and == active rows + 1); the gated set is exactly the two Ice Beam FRZ
  receipts (17 / 133, 18 / 134); OFF 0 rows with the same next label; the table equals the ROM rows per animation.
- Kernel suppression (no receipt, so no command): behind a Substitute, semi-invulnerable, Scene OFF (`prepareRulesStatusAnimation`).
- Production routes (§3): order (between its neighbours' event sequences), length == table, ON − OFF == the ROM rows on every anchored
  command, the coverage set (animation x path x side), OFF has no command; SA3 per class; Scene ON / OFF parity on seeds 12 / 60
  (identical logical events and after-rules incl. RNG, HITMARKER_NO_ANIMATIONS masked).
- **Revert experiments** (recorded): PSN 71 -> 72 in production: **2 / 9 fail** (the two ROM-table tests); SA3 dropped
  (`sceneOnStatusFrames` -> null): **2 / 9 fail** (the route anchor test: seed 7 FRZ inflicted ON − OFF 147 vs 117; the SA3 test:
  seed 7 status 32 vs 2).

## 8. Reproduction (from workspace/)

```
sh tools/integration/sa125Run.sh <fresh-out-dir-inside-the-repo>   # archives cfe4e26ca + HEAD, the test, ON census x2 + delta,
                                                                    # OFF census x2 (byte-identical), receipt == committed
npx vitest run tests/sa125StatusAnimationCommand.test.ts
node --experimental-strip-types --no-warnings tools/integration/sa125LiveShareCensus.ts --seeds=0..99 --index-from=0 --out=r0.json --commands=r0.jsonl --stats=s0.jsonl
python3 tools/integration/sa125CensusDelta.py <base-dir> <final-dir> tools/integration/fixtures/sta123/exposure.json <out.json>
python3 tools/integration/sa125Pins.py <patched-npm-test.log> "<tree>" tools/integration/fixtures/sa125/pins.json
```
