# Battle-scene retirement inventory

Status: census at `6fe623bb` (2026-07-30), after the #39 retirements in
`e50bf210` (Turn-13 SAND_ATTACK text/stat-down) and `985ec1fa` + `ae94cc4c`
(Turn-17 terminal result/loss). This is a worklist, not a rewrite proposal.
Each slice must preserve its committed dense evidence and replace only its
selection/ownership key with a typed semantic lifecycle.

## Reproducible census

All commands below are run from the repository root. `turn[0-9]+` is
deliberately case-insensitive: it catches `turn13Resolved`, `TURN13_*`,
`drawTurn13*`, and comments that describe their contract. The second pattern
finds the Battle-2 siblings; the species pattern catches the named
per-species entry points rather than pretending that a generic helper is one.

```sh
rg -n -i 'turn[0-9]+|battle2|battle 2' src/engine/battleScene.ts \
  src/engine/battle2Turn1.ts src/engine/battle2ActionMenu.ts \
  src/engine/battle2OffScenario.ts src/engine/turn17.ts
rg -l -i 'turn[0-9]+|battle2|battle 2' src/engine --glob '*.ts' | sort
rg -n 'grovyleFaintSinkRowsAndY2|onixSitrusRotateMatrix|turn5GrantingStarPlacement|dragonBreathGrovyleHp|draw(Grovyle|Kabuto|Turn5Pidgeotto|Turn13Murkrow|Turn15Magby|Turn16PostSwitchField)|onixPlayerHealthboxContentForState|featherDance(OnixOpponent|PidgeottoPlayer)Healthbox|flyMurkrowPlayerHealthbox' src/engine/battleScene.ts
wc -l src/engine/battleScene.ts src/engine/battle2Turn1.ts \
  src/engine/battle2ActionMenu.ts src/engine/battle2OffScenario.ts \
  src/engine/turn17.ts
```

The first command is a *textual debt metric*, not a claim that every matching
comment is executable. It reports 2,381 matching lines in `battleScene.ts`,
42 in `battle2Turn1.ts`, 4 in `battle2ActionMenu.ts`, 4 in
`battle2OffScenario.ts`, and 19 in `turn17.ts` (2,450 total). File LOC is
32,696 + 136 + 69 + 53 + 48 = **33,002**. For comparison, #39's frozen
`856b3b4` baseline was 17,056 `battleScene.ts` LOC / 969 turn-reference
lines. The growth is mostly evidence comments and newly accumulated exact
windows; it is not retirement progress. Future slices should record both
figures with the same commands, and separately delete executable owner
branches.

Delta since the pin: entry 751's turn-13 DRAGON_BREATH retirement (`77cb49d0`)
moves `battleScene.ts` to 2,377 refs / 32,721 LOC — four raw `TURN13_*`
references deleted while evidence comments grew the file by 25 lines. The
other four files are unchanged, so the totals read 2,446 refs / 33,027 LOC.
This is the expected shape of a receipt-driven retirement: the ref count is
the signal, LOC is not.

## The remaining owner chain

`BattleSceneState` still declares the canonical epoch fields at
`battleScene.ts:2280-2482`, initializes/copies them at `2489-2549`, and
passes the fourteen resolution booleans plus the Turn-13 dismiss clock into
the top-level FIGHT dispatcher at `16603-16705`. `drawFightSubmenuWindow`
(`7150-7445`) is the pivotal legacy dispatch: the ordered
`turn14Resolved ... turn5Resolved` chain selects a separate Turn 15 through
Turn 6 renderer, then the earlier flag ladder selects the remaining menu
variants. `drawFightSubmenuChrome` (`7460-7490`) reconstructs PP from all
turn flags through `currentPPForActiveMon`, so moving only a render call will
leave a second canonical owner behind.

The state-field census is complete:

| Fields | Declaration lines | Current coupling |
| --- | --- | --- |
| `turn1Resolved` … `turn4Resolved` | 2280-2286 | first four menu/result epochs; threaded through menu base, bounce, PP and dispatch |
| `turn5KoDismissElapsed`, `turn5Resolved` | 2304, 2317 | opponent KO dismiss and the Pidgeotto/Sitrus replacement boundary |
| `turn6Resolved` … `turn12Resolved` | 2328-2399 | repeated Pidgeotto action/result/menu epochs |
| `turn13KoDismissElapsed`, `turn13Resolved`, `turn14Resolved` | 2415-2436 | Pidgeotto KO, Murkrow switch-in, then FLY charge/strike epochs |
| `turn15PartySelect` | 2482 | old canonical forced-selector mirror; typed selector exists separately |
| `turn16Resolved`, `turn17MenuRedrawElapsed`, `turn17KoDismissElapsed`, `turn17OutcomeDismissElapsed`, `turn17LossDismissElapsed` | 2443-2468 | legacy Fire-Punch/terminal predecessor and **postwin-field mirror**; terminal renderer itself is now typed |

The concrete named species/episode entry points remaining in the same file
are: GROVYLE/KABUTO intro materialize/stretch (`4405-5467`);
`dragonBreathGrovyleHp` (`8235`); `grovyleFaintSinkRowsAndY2` (`9118`);
`onixSitrusRotateMatrix` (`9253`); `turn5GrantingStarPlacement` (`9298`);
Pidgeotto replacement (`10049-10142`); Murkrow replacement
(`10272-10298`); MAGBY selector/send-out/field (`10509`, `15593`,
`15952-16590`); and identity-specific healthbox factories
(`1778-1935`). These are render-entry hardcodings, not merely species names
in comments. The semantic route already has generic field-art/healthbox
catalogs, but its currently extracted Scene-OFF fallback remains ONIX/KABUTO
at `32655-32695`; that is a separate content breadth seam.

## Window inventory and retirement order

Counts in the second column are source-line spans for the window family
(inclusive); they make this census stable even where one function calls a
shared family helper. Trace counts are `captureFrames.length` in the committed
trace. “Kernel” names the producer, not a renderer inference.

| Rank | Legacy window and exact sites | Lines | Dense committed pin(s) | Existing semantic kernel facts | Missing bridge / downstream coupling |
| ---: | --- | ---: | --- | --- | --- |
| 1 | **[RETIRED 2026-07-31, `289fe2c7`]** ~~Battle-2 Scene-OFF command turn~~ — flipped onto `battle2CommandAdapter.ts` (kernel-driven), legacy files deleted, pins 191/191 + 209/209 + 16/16 held. Original row: **Battle-2 Scene-OFF command turn**: fixed action/FIGHT/ROCK_SLIDE family `6639-7041`; `battle2Turn1.ts:10-136`, `battle2ActionMenu.ts:16-69`, `battle2OffScenario.ts:4-53` | 403 + 258 sibling LOC | `battle2-off-turn1.json` **179**, `battle2-turn1-rockslide.json` **191**, staged real-kernel `battle2-off-turn1-staged.json` **16** | request boundary (`factoryBattleScriptFullTurnDecision.ts:1540-1635`), messages/PP/HP/stat events (`battleScriptEvents.ts:52-212`; emitted by `battleScriptHitChainOpcode.ts:2315-2680`, `battleScriptStatBuffs.ts:283-312`) | The typed command/resolution owners exist (`battleCommandPresentation.ts:239`, `battleResolutionPresentation.ts:807`), but the canonical renderer still enters the fixtures. Replace the fixture-to-view adapter, then retire the three fixed scenario files; no user choice. |
| 2 | **[FAINT HALF RETIRED 2026-07-31, `bd1d6beb`]** DRAGON_BREATH→faint now sourced from `turn13ResolutionAdapter.ts` (generic opponent-faint geometry formula, hand constants deleted; pins 141/141 + 242/242 + dense-a 205/256 pre-existing-#23-parked + dense-b 223/223 held). Switch-in half ALSO retired (round 11 2026-07-31): terminal-state exposure landed, real openpartyscreen/switchindataupdate materialize MURKROW, render literals adapter-derived; rank 2 fully done. Original row: **Turn-13 DRAGON_BREATH → faint → Murkrow switch-in**, excluding the already semantic SAND_ATTACK half: `13303-14123`, including `13736-13899`, plus replacement helpers `10272-10470` | 821 + 199 | `turn13-dragonbreath-faint.json` **141**, `turn13-switchin.json` **242**, ground truth `battle1-turn13-dense-a/b.json` **256/223** | HP pair, faint animation/message, forced request, party-summary, switch, switch-in animation and next request (`battleScriptEvents.ts:73-212`; switch emit `battleScriptSwitchinOpcode.ts:300-348,600-644`) | `createBattleResolutionPresentation` already groups this lifecycle (`battleResolutionPresentation.ts:631-796`) and the typed forced selector exists (`partySelect.ts:162`). Missing: wire its generic display/faint geometry to this exact legacy renderer, then remove `turn13KoDismissElapsed`/`turn13Resolved` predecessor. Strongest next full-lifecycle proof. |
| 3 | **[RETIRED 2026-07-31, `5db34996` + `54278249`]** KO/switch-in half (`5db34996`): preview promoted to `turn5ResolutionAdapter.ts`, faint-sink geometry + PIDGEOTTO switch-in literals adapter-derived. Sitrus half (`54278249`): heal HP endpoints/message lines also adapter-derived (`TURN5_SITRUS_HEAL_HP_START/_END`, `TURN5_SITRUS_HEAL_LINE1/_LINE2`), `TURN5_PRESENTATION_TIMING_NOT_STAGED` retired; the presentation-TIMING curves themselves (`turn5SitrusHealTextVisibleChars`, `turn5SitrusOnixHp`'s shape, `turn5SitrusRingMatrix`, `turn5SitrusResettledBounceTick`) are untouched, still their own oracle-pixel-fit closed forms. All nine turn5 pins + five insurance pins held throughout. `turn5KoDismissElapsed`/`turn5Resolved` mirroring intentionally left (see rank 2's own analogous note; `turn5KoDismissElapsed` is state-only, never render-read). Original row: **Turn-5 KO → Pidgeotto switch-in → Sitrus → next menu**: `9027-10470`, chiefly KO/Sitrus `9118-9545` and replacement `10049-10470` | 1,444 | `turn5-rockslide.json` **256**, `turn5-faint.json` **110**, `turn5-switchin.json` **241**, `turn5-sitrus-a/b/c/d.json` **110/82/181/133** | Same faint/forced/switch lifecycle as rank 2; item/HP effects include `health-bar-update`/`hp-change` from `battleScriptHitChainOpcode.ts:2315-2550` | Resolution now owns the knockout/switch handoff AND the held-item/heal presentation content. Remaining: replace `turn5KoDismissElapsed`/`turn5Resolved`'s own mirroring once a downstream consumer can read the typed terminal boundary directly (same shape as rank 2's own still-open mirroring note). |
| 4 | **[FULLY RETIRED 2026-07-31 — all 5 slices, `174cc388`+`441ddf83`+`6aba6662`+`0769ccc6`+`40c969e5`+`ef971686`]** turn-6/7 ROCK_SLIDE HP+attack lines, turn-7/8 FEATHER_DANCE kickoffs (parameterized `turn78FeatherDancePresentationStaging.ts`, LCG-inverted seed carry-forward), and the shared stat-fall banner (each canonical caller passes its own staged stat; animation-lane caller left cited). Slice 5 BIND landed 2026-07-31: kickoff/miss flipped onto staged facts via the new `{message,missMessage}` bridge + additive entryLabel param; on-hit trap-start staged as kernel-only receipt (canonical line always misses). All rank-4 + insurance pins held at every rung. Original row: **Turns 6-8 Pidgeotto loop**: menus/FEATHER_DANCE/ROCK_SLIDE/BIND `10548-11312` | 765 | T6 `turn6-featherdance.json` **90**, `turn6-feathers.json` **235**, `turn6-rockslide-a/b.json` **255/105**; T7 `turn7-rockslide-a/b/c/d.json` **256/256/256/19**; T8 `turn8-bind-a/b.json` **256/66** | message, stat-stage-change, HP/PP and next-request facts already exist; the stat-down bridge precedent is `presentationEventWindowBridge.ts:177-218` | Missing generic Scene-OFF controller presentation for arbitrary stat, no-effect/miss, multi-turn residual and item/turn-end facts. SAND_ATTACK proves only an accuracy-drop subshape; do not jump directly to the whole loop. |
| 5 | **[EVIDENCE BANKED 2026-07-31, `350424ed` — policy PROPOSED, not yet adopted]** `docs/rank5-effect-visibility-scout.md`: source rule (Cmd_attackanimation gates ONLY the move-anim script; hit-reaction + healthbar unconditional), oracle-confirmed zero move-specific visuals on OFF route, and the committed turn9-12 pins are profile-less = Scene-ON (never run against this lane's oracle). Proposed: class-(c) move bodies empty under OFF; real work is re-timing generic choreography against fresh OFF pins. Supervisor endorses as the recommended plan; adoption (it retires/replaces the ON-profile pins) is a next-session start-of-work decision. Original row: **Turns 9-12 AERIAL_ACE/QUICK_ATTACK/ROCK_SLIDE loop**: `11313-13302` | 1,990 | T9 `turn9-quickattack.json` **169** / `turn9-rockslide.json` **130**; T10 `turn10-aerialace.json` **93** / `turn10-rockslide.json` **220**; T11 **178/163**; T12 **131/38** | ordinary message/HP/stat/PP/next-request events exist | Scene OFF has no typed owner for movement/clone/field-darken effect presentation. In scene OFF the visible controller/result shells are available, but exact effect bodies are animation-lane/source-component work. Blocked until the event-to-presentation policy can declare skipped versus controller-visible effects. |
| 6 | **Turns 1-4 initial menu/result chain**: kickoff through Turn-4 result `7515-9026`, with menu base and flag/PP wiring `7041-7514` | 1,986 | T1 `turn1-rockslide.json` **256**; T2 `turn2-dragonbreath.json` **237** / `turn2-endeavor.json` **77**; T3 **192/256**; T4 **250/250** | same basic receipt facts as rank 1 | Semantics exist, but this is entangled with harvested GROVYLE/ONIX command chrome and the `turn1Resolved…turn4Resolved` current-PP reconstruction. Do it after rank 1 proves the command adapter can fully replace flag-based PP and bounce ownership. |
| 7 | **Turn-14 FLY charge/miss and Turn-15 player faint/forced send-out**: `14546-16590` | 2,045 | `turn14-fly-miss.json` **213**; `turn15-fly-strike.json` **256**; selector **200/200**; send-out rungs **43/46/16/144/195** | Faint/forced/switch facts and typed `switch-in-animation` exist; exact generic forced-selector renderer exists at `battleScene.ts:32407-32648` | The command/faint seam covers much of the lifecycle, but FLY’s two-turn charge/strike state and legacy `turn15PartySelect` mirroring remain. Retire only after a typed volatile/two-turn action owner exists. |
| 8 | **Turn 16 FIRE_PUNCH/burn and old Turn-17 prefix**: `15952-16590`, `turn17.ts:7-46` | 1,639 + 48 | Turn-16 rungs **81/221/123/236/155/175**; Turn-17 rungs 1-6 **118/221/143/200/113/255** | HP/message/faint/terminal boundary all exist; terminal receipt is consumed by `battleResolutionPresentation.ts:807` | Missing generic burn/end-turn event projection and a typed pre-terminal menu handoff. The terminal **result/loss dispatch is retired**, but the old clock fields are retained because postwin still mirrors them. |
| 9 | **Turn-17 terminal result/loss/postwin legacy tail**: state/copy `2443-2468`, legacy fade `15290-15415`, `turn17.ts:17-46` | 179 + 48 | `turn17-rung7a/b.json` **255/147**, `turn17-rung8a/b.json` **255/118** | immutable `BattleTerminalBoundary` (`battleDecisionBoundary.ts:78-101`), retained by `factoryRoundBattleOrchestrator.ts` in `985ec1fa`, consumed by resolution presenter | Already retired for knockout/result/loss rendering by `ae94cc4c`. Do **not** reimplement it: remove the remaining field mirroring only when the downstream canonical postwin presenter takes `orchestrator.round`/terminal data directly. |

## Blocked work

- **[RESOLVED 2026-07-31, `54278249`]** ~~Generic item and end-turn
  controller projection~~ — the item-result text path was never missing:
  `resolveBattleStringLines` is already fully generic (365-entry table);
  only two placeholder resolvers (`B_SCR_ACTIVE_NAME_WITH_PREFIX`,
  `B_LAST_ITEM`) needed supplying at the call site, and the Sitrus heal
  facts flow from the already-ported `HOLD_EFFECT_RESTORE_HP` end-turn
  orchestration. Both are now wired into `battleScene.ts`'s
  `TURN5_SITRUS_HEAL_HP_START/_END`/`TURN5_SITRUS_HEAL_LINE1/_LINE2`; the
  presentation-TIMING curves stay their own oracle-pixel-fit closed forms
  (that was never blocked on this item). Original note: **Generic item and
  end-turn controller projection:** required before the Turn-5 Sitrus family
  and several repeated-loop tails can leave their canonical clocks. The
  kernel has HP/item facts, but no source-derived presentation segment that
  binds an item activation/result message to one receipt.
- **Two-turn/volatile action lifecycle:** required for FLY charge/strike
  (and similar MOVEEND-controlled state), before Turn 14/15 can be honestly
  semantic. It must be a rules/event owner, not a Turn-14 identifier.
- **Scene-OFF effect visibility policy:** required before the AERIAL_ACE and
  QUICK_ATTACK render bodies can be retired. The battle facts exist; the
  decision of which controller-visible effect body remains with Battle Scene
  OFF is source/presentation work, not a pixel fit.
- **Postwin owner handoff:** a downstream canonical owner still reads the
  mirrored Turn-17 clocks. Move it to the generated round/terminal boundary
  before deleting these legacy fields; do not sever the result/loss proof.

The recommended next brief is therefore rank 1, then rank 2, then rank 3:
they have real receipt facts today, dense exact pins, and respectively prove
the command seam, its complete faint/switch lifecycle, and its item/heal
extension without inventing user decisions.
