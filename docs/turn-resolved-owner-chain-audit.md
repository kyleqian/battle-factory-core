# Turn-resolved owner-chain predecessor audit

This is the Battle Scene OFF evidence record for the remaining turn-keyed
resolution-owner chain. It follows
`docs/rank2-turn13resolved-predecessor-audit.md`: this is a producer/consumer
census and retirement plan, not an implementation and not an extension of the
retired canonical Battle-2 march. Citations are against base commit `8d092045`.

`turn13Resolved` is not in this census: `79885140` replaced it with
`Turn13CompletedResolutionNextCommandHandoff`. The replacement is the shape to
preserve: post-boundary PP, persisted move slot, and typed
`{ redraw: "settled", input: "ready" }` facts
(`turn13ResolutionAdapter.ts:198-245`), while the following FLY resolution is a
separate owner.

## Common storage and threading

All twelve booleans are declared in `BattleSceneState`
(`battleScene.ts:2460-2562`), initialized `false`
(`battleScene.ts:2592-2603`), copied unchanged by `advanceBattleScene`
(`battleScene.ts:2622-2633`), read into tick-local variables
(`core.ts:1080-1091`), and written back to state (`core.ts:1492-1503`). The
renderer threads the complete set into `drawFightSubmenuWindow`
(`battleScene.ts:17072-17087`; parameters at `battleScene.ts:7456-7471`). That
storage plumbing is a consumer and a persistence producer for every field; it
does not establish that a resolution completed.

The only semantic `false -> true` producers are the fresh-A reopen edges in
`core.ts`. Each edge requires the prior command's `confirmElapsed`, that
command's redraw-delay gate, and a new A press; it opens the following FIGHT
submenu and sets exactly one monotonic flag on the same tick:

| Field | Declaration / initial value | Semantic producer and edge |
| --- | --- | --- |
| `turn1Resolved` | `battleScene.ts:2461`, `battleScene.ts:2592` | `core.ts:1179-1193`: post-turn-1 ROCK_SLIDE redraw + A opens turn 2; assignment at 1193. |
| `turn2Resolved` | `battleScene.ts:2463`, `battleScene.ts:2593` | `core.ts:1195-1210`: post-turn-2 DRAGON_BREATH redraw + A opens turn 3 at persisted slot 2; assignment at 1210. |
| `turn3Resolved` | `battleScene.ts:2465`, `battleScene.ts:2594` | `core.ts:1212-1225`: post-turn-3 ROCK_SLIDE redraw + A opens turn 4; assignment at 1225. |
| `turn4Resolved` | `battleScene.ts:2467`, `battleScene.ts:2595` | `core.ts:1227-1242`: post-turn-4 ROCK_SLIDE redraw + A opens turn 5; assignment at 1242. |
| `turn5Resolved` | `battleScene.ts:2480`, `battleScene.ts:2596` | `core.ts:1244-1258`: post-turn-5 faint/switch-in/Sitrus redraw + A opens turn 6; assignment at 1258. |
| `turn6Resolved` | `battleScene.ts:2491`, `battleScene.ts:2597` | `core.ts:1260-1273`: post-turn-6 ROCK_SLIDE redraw + A opens turn 7; assignment at 1273. |
| `turn7Resolved` | `battleScene.ts:2503`, `battleScene.ts:2598` | `core.ts:1275-1289`: post-turn-7 ROCK_SLIDE redraw + A opens turn 8; assignment at 1289. |
| `turn8Resolved` | `battleScene.ts:2515`, `battleScene.ts:2599` | `core.ts:1291-1306`: post-turn-8 BIND-miss redraw + A opens turn 9 at persisted slot 1; assignment at 1306. |
| `turn9Resolved` | `battleScene.ts:2527`, `battleScene.ts:2600` | `core.ts:1308-1322`: post-turn-9 redraw + A opens turn 10 at slot 0; assignment at 1322. |
| `turn10Resolved` | `battleScene.ts:2539`, `battleScene.ts:2601` | `core.ts:1324-1340`: post-turn-10 ROCK_SLIDE redraw + A opens turn 11; assignment at 1340. |
| `turn11Resolved` | `battleScene.ts:2551`, `battleScene.ts:2602` | `core.ts:1342-1356`: post-turn-11 ROCK_SLIDE redraw + A opens turn 12; assignment at 1356. |
| `turn12Resolved` | `battleScene.ts:2562`, `battleScene.ts:2603` | `core.ts:1358-1372`: post-turn-12 ROCK_SLIDE-miss redraw + A opens turn 13; assignment at 1372. |

## Per-field consumer census and classification

`currentPPForActiveMon` receives all twelve fields through
`battleScene.ts:7771-7795`. Its cumulative PP consumers are explicit at
`battleMenu.ts:2609-2634`: turns 1, 3-7, and 9-12 decrement slot 0
(`battleMenu.ts:2610-2619`), turn 2 decrements slot 2
(`battleMenu.ts:2624,2633`), and turn 8 decrements slot 1
(`battleMenu.ts:2632`).

For turns 5-12 this PP role is dispatcher-mediated, not a direct pass of the
state variable: the `if (turnNResolved)` branch selects the following
turn-specific function, and that function re-materializes the cumulative
predecessors as `true` arguments to `drawFightSubmenuChrome`. The call sites
are `battleScene.ts:11305,11389,11598,12401,12973,13303,13538,13647` for
turns 5 through 12 respectively. The PP consumer is therefore live, but the
current implementation duplicates rather than threads its ownership fact.

| Field | Following-reopen predecessor guard | Dispatcher / render / bounce consumers | PP consumer | Classification |
| --- | --- | --- | --- | --- |
| `turn1Resolved` | Own one-shot negative guard `core.ts:1179`; positive predecessor for turn 2 at `core.ts:1195`. | Render content: post-turn-1 opponent HP at `battleScene.ts:7347-7354`. Bounce-chain selection at `battleScene.ts:7440-7443`, `7679-7682`, and `7710-7715`; it is also threaded through the fallback/menu render calls at `battleScene.ts:7569-7586,7660-7661,7691-7692`. | Slot 0, `battleMenu.ts:2610`. | **LIVE MULTI-CONSUMER.** It owns HP content and three bounce epochs in addition to the predecessor/PP roles. A typed completed-resolution handoff alone is insufficient; a presentation owner for post-turn-1 opponent HP and menu-bounce phase must exist first. |
| `turn2Resolved` | Negative guard `core.ts:1196`; positive predecessor at `core.ts:1212`. | Render content: opponent HP selection `battleScene.ts:7353`, player-HP overlay `battleScene.ts:7381`, turn-3 kickoff routing `battleScene.ts:7601-7602` and `battleScene.ts:7629-7636`, and overlays `battleScene.ts:7688,7726`. Bounce-chain selection at `battleScene.ts:7438-7443`, `battleScene.ts:7677-7682`, `battleScene.ts:7708-7715`. | Slot 2, `battleMenu.ts:2624,2633`. | **LIVE MULTI-CONSUMER.** The typed owner must own post-turn-2 player/opponent HP, current slot/PP, the next-command readiness edge, and the turn-3 bounce/kickoff epoch. |
| `turn3Resolved` | Negative guard `core.ts:1213`; positive predecessor at `core.ts:1227`. | Render content: opponent/player HP selection at `battleScene.ts:7353,7398`, turn-4 routing at `battleScene.ts:7601` and `battleScene.ts:7621-7626`, and overlays `battleScene.ts:7687,7725`. Bounce-chain selection at `battleScene.ts:7436-7443`, `battleScene.ts:7675-7682`, `battleScene.ts:7706-7715`. | Slot 0, `battleMenu.ts:2611`. | **LIVE MULTI-CONSUMER.** A typed owner must first carry post-turn-3 HP plus the turn-4 DOUBLE_TEAM/ROCK_SLIDE presentation and bounce epoch, not just PP/readiness. |
| `turn4Resolved` | Negative guard `core.ts:1228`; positive predecessor at `core.ts:1244`. | Render content: post-turn-4 opponent HP `battleScene.ts:7348-7354`, turn-5 ENDEAVOR route `battleScene.ts:7613-7619`; bounce-chain selection `battleScene.ts:7432-7443`, `battleScene.ts:7673-7682`, `battleScene.ts:7704-7715`. | Slot 0, `battleMenu.ts:2612`. | **LIVE MULTI-CONSUMER.** The typed owner must first own post-turn-4 HP and the turn-5 menu/kickoff/bounce epoch in addition to the completed-command facts. |
| `turn5Resolved` | Negative guard `core.ts:1245`; positive predecessor for turn 7 at `core.ts:1260`. | Turn-6 dispatcher `battleScene.ts:7560-7567` (plus common threading at `battleScene.ts:17080`). No direct bounce-clock read. | Slot 0, re-materialized at `battleScene.ts:11305`, consumed at `battleMenu.ts:2613`. | **PREDECESSOR-CLASS.** This verifies the inventory's three live roles: turn-6 dispatch, slot-0 PP reconstruction, and the turn-7 reopen predecessor. Replace only with a completed-turn-5/next-command handoff. |
| `turn6Resolved` | Negative guard `core.ts:1261`; positive predecessor at `core.ts:1275`. | Turn-7 dispatcher `battleScene.ts:7553-7558` (threaded at `battleScene.ts:17081`). | Slot 0, `battleScene.ts:11389` -> `battleMenu.ts:2614`. | **PREDECESSOR-CLASS.** Same three-role shape; not dead. |
| `turn7Resolved` | Negative guard `core.ts:1276`; positive predecessor at `core.ts:1291`. | Turn-8 dispatcher `battleScene.ts:7545-7551` (threaded at `battleScene.ts:17082`). | Slot 0, `battleScene.ts:11598` -> `battleMenu.ts:2615`. | **PREDECESSOR-CLASS.** Same three-role shape; not dead. |
| `turn8Resolved` | Negative guard `core.ts:1292`; positive predecessor at `core.ts:1308`. | Turn-9 dispatcher `battleScene.ts:7537-7543` (threaded at `battleScene.ts:17083`). | Slot 1, `battleScene.ts:12401` -> `battleMenu.ts:2632`. | **PREDECESSOR-CLASS.** The different PP slot/persisted slot makes it a non-interchangeable sibling. |
| `turn9Resolved` | Negative guard `core.ts:1309`; positive predecessor at `core.ts:1324`. | Turn-10 dispatcher `battleScene.ts:7528-7535` (threaded at `battleScene.ts:17084`). | Slot 0, `battleScene.ts:12973` -> `battleMenu.ts:2616`. | **PREDECESSOR-CLASS.** Same three-role shape; not dead. |
| `turn10Resolved` | Negative guard `core.ts:1325`; positive predecessor at `core.ts:1342`. | Turn-11 dispatcher `battleScene.ts:7519-7526` (threaded at `battleScene.ts:17085`). | Slot 0, `battleScene.ts:13303` -> `battleMenu.ts:2617`. | **PREDECESSOR-CLASS.** Same three-role shape; not dead. |
| `turn11Resolved` | Negative guard `core.ts:1343`; positive predecessor at `core.ts:1358`. | Turn-12 dispatcher `battleScene.ts:7510-7517` (threaded at `battleScene.ts:17086`). | Slot 0, `battleScene.ts:13538` -> `battleMenu.ts:2618`. | **PREDECESSOR-CLASS.** Same three-role shape; not dead. |
| `turn12Resolved` | Negative guard `core.ts:1359`; positive predecessor for the typed turn-13 successor at `core.ts:1374`. | Turn-13 dispatcher `battleScene.ts:7494-7508` (threaded at `battleScene.ts:17087`). | Slot 0, `battleScene.ts:13647` -> `battleMenu.ts:2619`. | **PREDECESSOR-CLASS.** Its successor happens to create the later turn-13 handoff, but that later handoff cannot represent the earlier post-turn-12 boundary. |

No boolean is a **DEAD MIRROR**: every one has a PP reader, and every one has
either direct render/bounce readers (turns 1-4) or a following-window
dispatcher (turns 5-12), in addition to its core guards.

### Exact handoff facts

For each PREDECESSOR-CLASS field, and for the completed-command half of each
LIVE MULTI-CONSUMER field, the replacement must own the following immutable
boundary facts. These tuples are the current menu's `[ROCK_SLIDE, BIND,
DRAGON_BREATH, SANDSTORM]` PP values, derived by the live formula cited above;
each handoff must also carry `nextCommand: { redraw: "settled", input:
"ready" }` exactly as the rank-2 precedent does.

| Completed turn | Post-boundary PP | Persisted slot | Existing adapter ownership (not a complete handoff) |
| ---: | --- | ---: | --- |
| 1 | `[9,20,20,10]` | 0 | `turn1RockSlidePresentationStaging.ts` owns hit/result content; no next-command or bounce owner. |
| 2 | `[9,20,19,10]` | 2 | `turn2EndeavorPresentationStaging.ts` owns the ENDEAVOR half; no full turn-2 handoff. |
| 3 | `[8,20,19,10]` | 0 | `turn3RockSlidePresentationStaging.ts` owns ROCK_SLIDE result facts; no next-command/bounce owner. |
| 4 | `[7,20,19,10]` | 0 | The two turn-4 staging modules own DOUBLE_TEAM/ROCK_SLIDE facts; no combined completion owner. |
| 5 | `[6,20,19,10]` | 0 | `turn5ResolutionAdapter.ts:246-279,282-339` owns replacement and Sitrus terminal content, but its hit stage explicitly substitutes STRENGTH and starts PP at `[10,0,0,0]` (`turn5ResolutionAdapter.ts:198-234`); it cannot be treated as the real cumulative PP receipt. It also owns no redraw/input edge. |
| 6 | `[5,20,19,10]` | 0 | Turn-6 ROCK_SLIDE staging has real PP-before 6 and move slot 0 (`turn67RockSlidePresentationStaging.ts:109-169,183-190`), but it is a per-move stage, not a completed FEATHER_DANCE + ROCK_SLIDE + next-command owner. |
| 7 | `[4,20,19,10]` | 0 | The sibling staging has real PP-before 5 (`turn67RockSlidePresentationStaging.ts:115-119,193-206`), but no full-turn readiness owner. |
| 8 | `[4,19,19,10]` | 1 | `stageTurn8BindMiss` already exposes real BIND PP-after (`turn8BindPresentationStaging.ts:145-168`); it does not own the preceding FEATHER_DANCE, menu redraw, or input edge. |
| 9 | `[3,19,19,10]` | 0 | No completed-turn-9 handoff is stored in `BattleSceneState`; the direct turn-10 dispatcher remains the owner selector. |
| 10 | `[2,19,19,10]` | 0 | No completed-turn-10 handoff is stored. |
| 11 | `[1,19,19,10]` | 0 | `turn11FeatherDancePresentationStaging.ts` owns only the opponent move's content; no combined turn completion is stored. |
| 12 | `[0,19,19,10]` | 0 | No completed-turn-12 handoff is stored. The existing `Turn13CompletedResolutionNextCommandHandoff` is one command too late. |

For turns 5-12, the typed owner can follow the rank-2 split: a generic
completed-resolution/next-command handoff owns PP, slot, redraw, and input;
the following command's presentation owner remains a separate required
companion. For turns 1-4, a second typed presentation epoch must replace the
HP/bounce/kickoff reads before the boolean can disappear.

## `opponentFaintDismissElapsed`

The field is declared at `battleScene.ts:2569`, initialized `null` at
`battleScene.ts:2604`, and persisted at `battleScene.ts:2634`. Its sole
semantic producer is the one-shot input branch at `core.ts:903-908`: when the
field is still null, a fresh A arrives, and the staged faint-text controller is
eligible (`opponentFaintDismissEligible`, `battleScene.ts:14117-14120`), it
captures the real press-relative `battleScene.elapsed + 1`.

Its consumers are genuinely live and have different roles:

1. **Other / one-shot input gate:** the null guard at `core.ts:904` prevents a
   second write.
2. **Dispatcher threading:** render converts it to an absolute tick and passes
   it into the turn-13 window at `battleScene.ts:17089`; turn-13 dispatch passes
   it onward at `battleScene.ts:7494-7507`, then through the SAND_ATTACK and
   DRAGON_BREATH dispatchers at `battleScene.ts:13603-13639,13917-13931,
   14015-14031`.
3. **Render content / bounce-chain clock:** `drawFaintedOpponentWindow` uses the
   real tick to freeze the wait cursor (`battleScene.ts:14171-14174`).
4. **Continuation:** that same edge starts the icon-bar/Murkrow switch-in
   continuation (`battleScene.ts:14152-14160`).

Classification: **LIVE MULTI-CONSUMER**. A typed opponent-faint presentation
owner must first own (a) the faint text's settled/input-ready epoch, (b) the
actual variable A-dismiss elapsed, (c) the frozen cursor/bounce pose, and (d)
the switch-in continuation attached to that same real edge. The existing
turn-13 adapter owns faint geometry and replacement facts, while the later
completed-resolution handoff owns post-switch PP/slot/readiness; neither owns
the variable dismiss edge. Presence/eligibility time is not a substitute.

## Dense OFF evidence census

Counts below are `captureFrames.length` read from the committed JSON. “Reader
OFF” means at least one capture occurs after the field can be true and thus
exercises its dispatcher/render/PP epoch. This distinction matters: the
producer turn's files often end before the following A reopen.

| Field | Explicit committed OFF producer-window pins | Explicit committed OFF reader-window pins |
| --- | --- | --- |
| `turn1Resolved` | `turn1-kickoff-off.json` 81; `turn1-cloneanim-off.json` 230; `turn1-rockslide-off.json` 256; `turn1-drain-off.json` 102 (**669**) | `turn2-endeavor-off.json` 256; `turn2-dragonbreath-off.json` 237 (**493**) |
| `turn2Resolved` | turn-2 set above (**493**) | `turn3-endeavor-off.json` 255; `turn3-rockslide-off.json` 161 (**416**) |
| `turn3Resolved` | turn-3 set above (**416**) | `turn4-doubleteam-off.json` 256; `turn4-rockslide-off.json` 256 (**512**) |
| `turn4Resolved` | turn-4 set above (**512**) | **None.** No explicit OFF turn-5 capture is committed. |
| `turn5Resolved` | **None.** | **None.** |
| `turn6Resolved` | **None.** | **None.** |
| `turn7Resolved` | **None.** | **None.** |
| `turn8Resolved` | **None.** | `turn9-quickattack-off.json` 233; `turn9-quickattack-b-off.json` 231; `turn9-rockslide-off.json` 256 (**720**) |
| `turn9Resolved` | turn-9 set above (**720**) | `turn10-menu-off.json` 83; `turn10-aerialace-off.json` 206; `turn10-rockslide-off.json` 255; `turn10-rockslide-off-b.json` 131 (**675**) |
| `turn10Resolved` | turn-10 set above (**675**) | `turn11-featherdance-off.json` 191; `turn11-rockslide-off.json` 256 (**447**) |
| `turn11Resolved` | turn-11 set above (**447**) | `turn12-aerialace-off.json` 247; `turn12-rockslide-miss-off.json` 256 (**503**) |
| `turn12Resolved` | turn-12 set above (**503**) | **None.** No explicit OFF turn-13 capture is committed. |
| `opponentFaintDismissElapsed` | **None.** | **None.** |

The familiar turn-5 through turn-8 and turn-13 files are still useful
differential insurance, but they are **not OFF authority**: they omit
`oracleProfile`, so AGENTS.md's historical-trace rule selects Battle Scene ON.
Their current primary sets are:

- Turn 5: `turn5-rockslide.json` 256, `turn5-faint.json` 110,
  `turn5-switchin.json` 241, and `turn5-sitrus-a/b/c/d.json`
  110/82/181/133 (**1,113** primary captures). Additional boundary insurance:
  `turn5-menu.json` 42, `turn5-endeavor.json` 254,
  `turn5-healthbox.json` 55, `turn5-sentout.json` 141.
- Turn 6: `turn6-featherdance.json` 90, `turn6-feathers.json` 235,
  `turn6-rockslide-a/b.json` 255/105; boundary `turn6-menu.json` 44 and
  `turn6-statfall.json` 127.
- Turn 7: `turn7-rockslide-a/b/c/d.json` 256/256/256/19; boundary
  `turn7-menu.json` 93 and `turn7-feathers.json` 145.
- Turn 8: `turn8-bind-a/b.json` 256/66; boundary `turn8-menu.json` 88 and
  `turn8-feathers.json` 162.
- Turn 13/dismiss: `turn13-dragonbreath-faint.json` 141,
  `turn13-switchin.json` 242, and ground-truth
  `battle1-turn13-dense-a/b.json` 256/223. These are legacy ON pins; the
  dense-a result also carries the separately parked historical residual.

## Same-shape sibling traps

1. **Dismiss clocks differ in liveness.** `turn5KoDismissElapsed` was a dead
   mirror: one producer and only its own guard read it, so `88fd05f6` could
   delete it. `opponentFaintDismissElapsed` looks identical in state, but its
   real delayed press freezes the cursor and drives switch-in
   (`battleScene.ts:14152-14174`). It cannot share that retirement.
2. **The first four booleans are not ordinary predecessor mirrors.** Turns
   5-12 have the rank-2 three-role shape. Turns 1-4 additionally select HP,
   kickoff content, and multiple bounce clocks (`battleScene.ts:7345-7443,
   7590-7726`). A handoff-only substitution would leave hidden boolean render
   ownership behind.
3. **PP slots are not uniform.** Turn 2 owns slot 2 and turn 8 owns slot 1;
   the other audited turns own slot 0 (`battleMenu.ts:2609-2634`). A generic
   “number of resolved turns” counter would be wrong even when its total
   decrement happened to match.
4. **Existing adapter presence is not completion readiness.** The turn-5
   adapter reaches a `next-turn` end-turn result, but stages a substituted move
   and non-cumulative PP (`turn5ResolutionAdapter.ts:198-234,288-311`). The
   turn-6/7 and turn-8 stages expose useful PP facts but do not own the combined
   turn or redraw/input edge. Adapter non-nullness is not a safe gate.
5. **The turn-13 handoff is one boundary too late for `turn12Resolved`.** Its
   PP is post-turn-13 DRAGON_BREATH 18/20, not post-turn-12 19/20
   (`turn13ResolutionAdapter.ts:203-236`). Reusing it would move future state
   backward/forward across a command boundary, the exact error the rank-2
   precedent forbids.

## Recommended bounded slice order

0. **OFF-evidence prerequisites (side lane, bounded separately):** one worker
   banks explicit dense producer/reopen/PP/following-guard windows for turns
   5-6; a second does turns 7-8; a third banks turn 13's immediate and delayed
   dismiss routes. Preserve the legacy sets above as differential insurance;
   do not combine workers by thinning capture ranges.
1. **First implementation slice — `turn5Resolved`:** add a typed
   completed-turn-5/next-command handoff with `[6,20,19,10]`, slot 0, settled
   redraw, and input ready; retain the existing switch/Sitrus adapter for its
   content facts; swap the three consumers and delete the boolean. Acceptance:
   the new turn-5/turn-6/turn-7 OFF boundary set from slice 0, plus all turn-5
   legacy primary pins (**1,113**) and `turn6-menu.json` 44 /
   `turn7-menu.json` 93 as ON differential insurance.
2. **Turns 6 and 7, one field per worker:** promote each real staged PP result
   into the same generic handoff shape, then swap dispatcher/PP/next guard.
   Acceptance: newly banked OFF turn-6/7/8 boundaries plus the corresponding
   legacy lists above. Do not batch both deletions in one worker.
3. **`turn8Resolved`:** use the existing BIND PP-after fact, slot 1, and a new
   completed-turn-8 readiness owner. Acceptance: the new turn-8 OFF producer
   pin plus the explicit turn-9 OFF reader set (**720**) and legacy turn-8
   insurance.
4. **Turns 9, 10, and 11, one field per worker:** publish the same handoff with
   PP `[3,...]`, `[2,...]`, then `[1,...]`. Acceptance pairs are turn9+turn10
   OFF (**720 + 675**), turn10+turn11 OFF (**675 + 447**), and turn11+turn12
   OFF (**447 + 503**), respectively.
5. **`turn12Resolved`:** publish the post-turn-12 `[0,19,19,10]`/slot-0
   handoff; do not reuse the post-turn-13 adapter. Acceptance: turn-12 OFF
   (**503**) plus the newly banked turn-13 OFF reopen/reader set and the legacy
   turn-13 differential set.
6. **Turns 1-4, one field per worker in order:** first introduce the typed HP
   and bounce/presentation epoch needed by that field, then install its
   completed-command handoff and delete the boolean. Acceptance pairs are
   turn1+turn2 OFF (**669 + 493**), turn2+turn3 (**493 + 416**), turn3+turn4
   (**416 + 512**), and turn4 plus the newly banked turn-5 OFF reader set.
7. **`opponentFaintDismissElapsed`:** after an opponent-faint presentation
   owner carries the variable dismiss edge and attached switch-in continuation,
   move the producer/render consumers into that owner and delete the flat
   field. Acceptance: the newly banked dense delayed-dismiss OFF pair; retain
   the legacy 141/242/256/223 captures as differential insurance.

The recommended first retirement is therefore **`turn5Resolved`**, but only
after the missing explicit OFF boundary pins are banked. It has exactly the
rank-2 three-consumer shape and the richest existing terminal adapter, while
turns 1-4 and the opponent dismiss edge require additional presentation
ownership.

## Not determinable statically

- The exact Scene-OFF redraw/input-ready ticks and delayed-dismiss visual
  boundary for turns 5-8 and turn 13: no explicit OFF captures exist. They need
  fresh dense OFF traces; the legacy ON timings must not be guessed across
  profiles.
- Whether the separate turn-6/7 FEATHER_DANCE and ROCK_SLIDE stages, and the
  turn-8 FEATHER_DANCE/BIND stages, can be chained into one uninterrupted
  full-turn owner without an RNG/state discontinuity. This needs a staged
  full-turn Tier-1 scenario; module presence alone does not prove composition.
- The source-semantic owner for the first four menu-bounce reset epochs. The
  current pixel clocks are statically visible, but the exact controller task
  boundary needed to replace them requires a RAM probe or a staged controller
  scenario.
- Whether Scene OFF changes the turn-13 variable dismiss-to-icon-bar latency
  relative to the committed legacy ON delayed route. This needs the new OFF
  delayed-dismiss trace or RAM probe.

No claim above fills these gaps by inference.
