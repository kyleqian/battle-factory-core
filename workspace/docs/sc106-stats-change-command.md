# sc106 (S10A, ISSUES #166 slice c): the `stats-change` presentation command + its duration, both scenes

Base: master `52c181d54` (production src `14d1be159`). The design pack is `docs/stat101-stats-change-design.md` (section 4, slice c). The
reducer is `docs/stat102-stats-change-reducer.md`. This slice adds the command and its DURATION only. It draws no pixels: the renderer is
slice (d).

## 1. Results first

| Question | Answer | Evidence |
|---|---|---|
| The rule | At each kernel STATS_CHANGE `animation` event (Cmd_playanimation B_ANIM_STATS_CHANGE / Cmd_playstatchangeanimation; kernel unchanged), the builder emits `{type "stats-change", eventSequence, battler, argument = animArg, timing.minimumFrames = statsChangeSpan(statsChangeParams(arg)).addedRows}` = **76 non-sharp / 90 sharply**. It emits none when `statsChangeParams` is null. It emits none while the battler is **shown as the Substitute doll at the command's start**: `BattleCommandFieldBattler.substituteDoll` of the segment field after the preceding commands (`battleResolutionFieldBeforeCommand`, the renderer's own `applyCompletedCommand` walk: set after a Substitute body, cleared at the fade / faint / switch-out, a switch-in's incoming snapshot). It emits none **right after a Double Team (104) body of the same battler that has a live duration** (Scene ON; Scene OFF has no such body, so OFF always gets the command). The command is inserted in (position, event) order together with SUBSTITUTE_FADE. The 2-frame `stat` command is unchanged | `battleResolutionPresentation.ts` `statsChangePresented`, the merged insertion |
| Duration / render | `case "stats-change"` in `battleResolutionCommandDuration` returns minimumFrames. There is no effect: both scenes draw the ordinary field and the box as it is. The legacy Scene OFF compat projection (`sceneOffPresentation.ts`) ignores the command like the other typed animation commands, so its canonical command vector is unchanged | `battleResolutionPresentationRender.ts` |
| Per-path anchors (one production route each, base frames pinned) | The following command starts **exactly +76 / +90 later** than on the base, and the new command starts on the base's following-command frame. This holds for every anchor on 8 routes (6 ON + 2 OFF, 50 anchors). The first glyph lands on the message command's first frame in both trees. Paths: status move sharply (seed 0 slot 2, Acid Armor, arg 40: 976 -> 1066), status move non-sharp (seed 3 slot 3, Sand-Attack, arg 27: 641 -> 717), secondary (seed 3 slot 1, Icy Wind, arg 24: 1379 -> 1455), Intimidate (seed 6 slot 0, arg 22: 2694 -> 2770), playstatchangeanimation (seed 13 slot 3, Tickle, arg 57: the following `stat` write 1929 -> 2005), live Double Team (seed 10 slot 2: +0, the message stays on 837). Behind a Substitute: a production segment (seed 0 / slot 2's Acid Armor) projected with the user shown as the doll has no command, and every other command is identical | `tests/sc106StatsChangeCommand.test.ts` (11 tests), receipt `routes` |
| Anchor offset delta vs the ROM | **Added rows: confirmed for every path.** stat101's receipts give playanimation / playstatchangeanimation -> next instruction = 77 / 91 rows on all 10 played scenarios (status: Harden, Agility, Growl, Screech; playstatchangeanimation: Cosmic Power, Tickle, Superpower, Memento; secondary: Icy Wind; Intimidate), both sides, both scenes, and 1 row behind a Substitute. So +76 / +90 is path-independent. **The absolute offset delta is not re-measured here.** It is a property of the base's following-command start (unchanged by this slice), so it is still assumed 0 for the status / secondary / Intimidate / playstatchangeanimation paths. A paired production-vs-ROM route would close it. The one path where the absolute position could be derived (Double Team, below) shows a pre-existing gap | stat101 `receipts/stat-anim.json` |
| Double Team decision | **Option (1)**: no command after a live-duration DT body. `liveMoveAnimationDuration(DT)` is 230 for every field where the user is not the doll, and 244 (swap composite) when it is. So in Scene ON a DT body never lacks a live duration, and the "fallback DT" case cannot occur through duration. A body the renderer declines (1 census case, `dtStatus fallback`) still presents its 230 rows, which contain the stats change's rows. Emitting the command there would double count. Evidence and the gap are in section 2 | test "Double Team: ...", census |
| Pins (patched archive copy, full suite) | **2 exactly-explained pins moved**: `battleTurnPortability` (the projected command vector gains exactly the stats-change command, seq 13 / arg 27 / 76) and `liveSpriteOrderHost` (sweep compared 863 -> 882, hostKnown 772 -> 788 = + the sweep's 19 stats-change command edges, 16 host-known, 0 mismatches; without them 863 / 772). **4 pins NOT moved (reported, section 3)**: `randomRoundSoak` (seven-win, Baton Pass seed 27, full / vanilla two seeds). They are frame-coupled random-driver trajectories, not +76 / +90 offsets. One non-pin: `animationBoundaryRatchet` gains the builder as a reducer consumer (brief-level justification in the test). No timing pin in `battleResolutionPresentation.test.ts` moved: its fixtures carry no STATS_CHANGE events | `tools/integration/fixtures/sc106/pins.json` |
| Census 0..999 (base vs final, 10 shards each) | **0 status changes**. Move-command keys, frames and liveFrames are identical (26,742 compared). Live share is **95.38 % / 98.72 %** on the base. The final tree has the same numerators (26,210 live commands, 3,929,200 live frames); its denominator lost the 2 last commands of 2 battles cut by the 200,000-frame budget (95.39 % / 98.72 %). `battleDigestExcludingFrames` is identical on every shard without a truncated battle. Battles 434, 796 and 881 hit the budget in both trees: the final tree's commands are a prefix of the base's. **Kernel STATS_CHANGE events: 4,552 (== stat101). Inserted stats-change commands: 3,667 = 2,263 non-sharp + 1,404 sharply = stat101's 4,529 played - 862 live-DT exemptions** (861 render-live + 1 render-fallback). Behind a Substitute: 23, identical to stat101's definition (0 disagreements). **+298,348 frames = 363,860 - 862 x 76.** Every unbudgeted battle: frames(final) - frames(base) == its presented stats-change rows | receipt `census` |
| Gameplay parity | Scene ON / OFF on two routes (seed 0 slot 2, seed 13 slot 3): identical boundaries, rules and RNG. OFF gets the command too (7 / 7 and 6 / 6). The census battle digests are identical (above). No kernel, RNG, damage, turn order or facility change | tests |

## 2. Double Team: evidence

- **Window rows** (dt60 `-long` probes, `docs/dt60-double-team-phase.md`): presentation age 0 = the DT activation row. The script ends on row 158.
  `StatsChangeAnimation` runs at row 162, which is stat101's rel 1 (Step1), so the stats change's rise A = age 161. The live
  window's `statsBannerStartAge 163 .. statsBannerEndAge 229` = rel 2 .. 68: Step1's registers become visible on rel 2 and are
  restored on rel 68 (stat101 row model).
- **Canonical ticks** (`docs/battle-move-anim-notes.md` sections 9.1-9.2, canonical turn 1, Foe GROVYLE): BLDCNT 0x3F42 on 2127 = rel 2 (A = 2125); first
  visible banner pixel 2132 = rel 7 (EVA 1); registers zero on 2193 = rel 68; the "evasiveness rose!" textbox opens on 2203 = rel 78. That
  is the ROM's next instruction (rel 77) + 1 row, the same lag as stat102's E+3 box draw.
- **No double counting.** The 230-row window already presents the stats change through rel 68 (A + 68). The full 76-row command after it would put the
  message at rel 145. **But the window is not gap-free.** Production's following message starts at age 230 = rel 69. The ROM's next
  instruction is at rel 77 (box visible at rel 78), so production is **8 rows early (9 to the visible box)**. Base and final are identical
  here, because option (1) changes nothing about DT. The ROM rows rel 69..77 show the ordinary field: the OAM copy is gone at 69, and the
  stat SE is waited on until E = 75. This is a pre-existing DT window-tail timing gap. Closing it needs its own ROM receipt, either
  as an 8-row residual command after a live DT body or as option (2), trimming the window to its body and letting the generic command own
  the banner. It is out of this slice's scope and flagged for the supervisor.
- **Pinned**: the route test (seed 10, slot 2) has 6 DT bodies with no command, and the message comes 230 rows after the body's start. The builder test
  pins the duration 230 / 230 / 244 / 244 over the four doll fields and no command in any of them. A Minimize-shaped body in the same
  segment gets the command, so the exemption is keyed on the body, not on arg 21.
- Side observation (pre-existing, not changed): with the DT user shown as the doll, the swap composite (244) still contains the body's 230
  rows, including the banner rows the ROM does not play behind a Substitute.

## 3. Pins not moved: randomRoundSoak (4 tests)

The soak's RandomPlayer presses A during resolution with an `rng.gap(...)` cooldown drawn on every press. The 76 / 90 added rows
therefore draw extra driver-rng values, and every later random choice shifts. The action logs (`onNote`) are identical in both trees
up to the first stats-change command, then diverge into a different random game:

| Pin | Base | Final | Notes identical for |
|---|---|---|---|
| full seed 0 | 11,955 frames, turn 20, roundLost | 14,186, turn 24, roundLost | 224 notes (frame 2766) |
| full seed 1 | 14,345, turn 29 | 12,272, turn 23 | 165 notes |
| vanilla seed 0 / 1 | 8,499 / 8,550, turn 16 | 8,625 / 8,661, turn 16 | 132 / 121 notes |
| full seed 27 (ISSUES #89 Baton Pass halt) | 64,525, battle 4, roundLost | **28,774, battle 2**: no longer reaches the Baton Pass halt at 30,798 | 483 notes |
| seven-win seed 21 (strong-route) | 37,260, renderCalls 2,671 | 37,499 (+239, odd: not a sum of 76 / 90), 2,679; same 7 wins, turn 3 | (not logged) |

These are not stats-change offsets, so per the brief they are reported, not forced. Re-pinning the frames would be trivial (the
values above). However, **seed 27 would lose the ISSUES #89 regression coverage**: its new trajectory never selects Baton Pass. That pin
needs a new seed or a driver change that decouples the random player from presentation length. Supervisor decision. Until then
`tests/randomRoundSoak.test.ts` is red on this branch (4 / 91).

## 4. Reproduction (from workspace/)

```
npx vitest run tests/sc106StatsChangeCommand.test.ts                          # 11 tests (~30 s)
sh tools/integration/sc106Run.sh <fresh-out-dir-inside-the-repo>               # archives 52c181d54 + HEAD, routes, soak logs,
                                                                                # census 0..999 x2, delta, receipt == committed -> ALL SAME
node --experimental-strip-types --no-warnings tools/integration/sc106RouteScan.ts --seeds=0..0 --route=2,2,2,2,2,2,2,2 --scene=on --out=f.json
node --experimental-strip-types --no-warnings tools/integration/sc106LiveShareCensus.ts --seeds=0..99 --index-from=0 --out=r0.json --commands=r0.jsonl --stats=s0.jsonl
python3 tools/integration/sc106CensusDelta.py <base-dir> <final-dir> tools/integration/fixtures/stat101/exposure.json <out.json>
python3 tools/integration/sc106Pins.py <patched-npm-test.log> "<tree>" tools/integration/fixtures/sc106/pins.json
```

## 5. Gates (final code: production == `563eebd0a`, tests / tools / docs through this commit)

- Targeted (serialized, 4 workers): sc106StatsChangeCommand, battleTurnPortability, liveSpriteOrderHost, animationBoundaryRatchet,
  battleResolutionPresentation, statsChangeReducer, factoryAnimationInventory, playableAnimationIntegration, substituteFadePresentation:
  **9 files / 125 tests passed**.
- `npm run typecheck`: green. `npm run test:smoke`: **448 / 448**.
- Full suite, two foreground shards (4 workers): shard 1 **814 files / 6,992 tests passed**. Shard 2 **813 files passed, 1 failed:
  6,402 tests passed, 4 failed** = the 4 reported `randomRoundSoak` pins (section 3), nothing else.
- `npm run build`: green.
- `npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 52c181d54`:
  **PASS, 624 / 624 captures byte-identical** (both canonical railroad traces and the app-only presentation-rng trace; no capture moved).
- `sh tools/integration/sc106Run.sh <fresh>`: **ALL SAME** (receipt reproduced from fresh archives of 52c181d54 and HEAD, census included).
- Patched-copy enumeration (`fixtures/sc106/pins.json`): 1,625 files / 13,392 tests passed, 6 failed (2 moved, 4 reported).
