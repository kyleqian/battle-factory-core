# Battle-scene retirement inventory

Status: census refreshed at `8a73efc3` (2026-08-01), after the typed turn-7
predecessor handoff replaced its resolved mirror.
This is a worklist, not a rewrite proposal.
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

Current reproducible result: only `battleScene.ts` remains from the five-file
command (the other four files are deleted), at **2,530 refs / 33,166 LOC**.
Rank 7 moved **2,526→2,506 refs / 33,135→33,125 LOC**; rank 8 then moved
**2,506→2,496 / 33,125→33,124** while putting the source-owned reducer facts
and presentation-local clocks in small typed modules. Rank 3's dead KO-dismiss
mirror retirement then moved **2,496→2,487 / 33,124→33,103**. The turn-6 and
turn-7 retirements remove their executable boolean owners while this
intentionally broad text metric grows with typed-handoff threading/comments;
the direct field census is the ownership signal.

## The remaining owner chain

`BattleSceneState` still declares earlier canonical epoch fields and threads
them into the top-level FIGHT dispatcher. The newest chain is typed:
`BattleSceneResolutionOwner` carries the immutable charge/strike resolution,
its request-owned selector, and the following immutable full-turn resolution;
the following presentation owns its confirmation-relative redraw edge and
supplies source PP/status/HP facts to the exact window.

The state-field census is complete:

| Fields | Declaration lines | Current coupling |
| --- | --- | --- |
| `turn1Resolved` … `turn4Resolved` | 2280-2286 | first four menu/result epochs; threaded through menu base, bounce, PP and dispatch |
| ~~`turn5Resolved`~~ | **retired `891a44d7`** | typed completed-turn-5/next-command handoff owns PP **[6,20,19,10]**, persisted slot 0, and settled/ready facts; adapter retains switch/Sitrus content |
| ~~`turn6Resolved`~~ | **retired `c6f3cdd4`** | typed completed-turn-6/next-command handoff owns PP **[5,20,19,10]**, persisted slot 0, and settled/ready facts for turn-7 dispatch, PP reconstruction, and the turn-8 reopen guard; its FEATHER_DANCE/ROCK_SLIDE stages remain content-only facts |
| ~~`turn7Resolved`~~ | **retired `8a73efc3`** | typed completed-turn-7/next-command handoff owns PP **[4,20,19,10]**, persisted slot 0, and settled/ready facts for turn-8 dispatch, PP reconstruction, and the turn-9 reopen guard; its FEATHER_DANCE/ROCK_SLIDE stages remain content-only facts |
| ~~`turn8Resolved`~~ | **retired `56d48b80`** | typed completed-turn-8/next-command handoff owns PP **[4,19,19,10]**, persisted slot 1, and settled/ready facts for turn-9 dispatch, PP reconstruction, and the following reopen guard; FEATHER_DANCE/BIND stages remain content-only facts |
| `turn9Resolved` … `turn12Resolved` | 2495-2542 | repeated Pidgeotto action/result/menu epochs |
| `opponentFaintDismissElapsed`, `turn13Resolved` | 2559-2575 | Pidgeotto KO and Murkrow switch-in predecessor; the dismiss edge is live, while the next-command handoff/PP owner is still missing (bounded audit: `rank2-turn13resolved-predecessor-audit.md`) |
| ~~`turn14Resolved`, `turn15PartySelect`~~ | **retired `c0821a65`** | replaced by one retained two-segment resolution identity and its request-owned selector |
| ~~`turn16Resolved`, `FightSubmenuState.menuRedrawElapsed`, and the four old Turn-17 clocks~~ | **retired `3f850e37` + `d410cfe5` / ranks 9 + 8** | following-resolution owner keeps the pre-terminal redraw edge; terminal owner keeps the faint/result/loss clocks |

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
| 3 | **[CONTENT RETIRED 2026-07-31, `5db34996` + `54278249`; DEAD DISMISS MIRROR RETIRED 2026-08-01, `88fd05f6`; PREDECESSOR RETIRED `73cb7455` + `891a44d7` + `97de11a4`]** KO/switch-in content is adapter-derived, as are Sitrus HP/message facts; presentation timing curves remain their exact closed forms. The `turn5KoDismissElapsed` census proved one producer, its own guard as sole consumer, and zero render/continuation/PP/request reads, so the field and branch are deleted. All rank-3 + five insurance pins (**3,021 captures**) and +30 delayed-dismiss variants (**484**) are byte-identical to clean `7d65832d`. Original row: **Turn-5 KO → Pidgeotto switch-in → Sitrus → next menu**: `9027-10470`, chiefly KO/Sitrus `9118-9545` and replacement `10049-10470` | 1,444 | `turn5-rockslide.json` **256**, `turn5-faint.json` **110**, `turn5-switchin.json` **241**, `turn5-sitrus-a/b/c/d.json` **110/82/181/133** | Same faint/forced/switch lifecycle as rank 2; item/HP effects include `health-bar-update`/`hp-change` from `battleScriptHitChainOpcode.ts:2315-2550` | Typed completed-turn-5/next-command handoff owns PP **[6,20,19,10]**, slot 0, and settled/ready facts for all three former consumers; switch/Sitrus content remains in `turn5ResolutionAdapter.ts`. Clean-`feffce4c` app replay held the required **1,742/1,742** captures byte-identical. |
| 4 | **[FULLY RETIRED 2026-07-31 — all 5 slices, `174cc388`+`441ddf83`+`6aba6662`+`0769ccc6`+`40c969e5`+`ef971686`; TURN-6/7/8 PREDECESSORS RETIRED 2026-08-01, `c6f3cdd4` + `8a73efc3` + `56d48b80`]** turn-6/7 ROCK_SLIDE HP+attack lines, turn-7/8 FEATHER_DANCE kickoffs (parameterized `turn78FeatherDancePresentationStaging.ts`, LCG-inverted seed carry-forward), and the shared stat-fall banner (each canonical caller passes its own staged stat; animation-lane caller left cited). Slice 5 BIND landed 2026-07-31: kickoff/miss flipped onto staged facts via the new `{message,missMessage}` bridge + additive entryLabel param; on-hit trap-start staged as kernel-only receipt (canonical line always misses). All rank-4 + insurance pins held at every rung. Original row: **Turns 6-8 Pidgeotto loop**: menus/FEATHER_DANCE/ROCK_SLIDE/BIND `10548-11312` | 765 | T6 `turn6-featherdance.json` **90**, `turn6-feathers.json` **235**, `turn6-rockslide-a/b.json` **255/105**; T7 `turn7-rockslide-a/b/c/d.json` **256/256/256/19**; T8 `turn8-bind-a/b.json` **256/66** | message, stat-stage-change, HP/PP and next-request facts already exist; the stat-down bridge precedent is `presentationEventWindowBridge.ts:177-218` | Typed turn-6/7/8 completed-command handoffs now own **[5,20,19,10]**/**[4,20,19,10]**/**[4,19,19,10]**, persisted slots 0/0/1, settled/ready next-command facts, and all three former predecessor roles without composing stage presence. Missing generic Scene-OFF controller presentation for arbitrary stat, no-effect/miss, multi-turn residual and item/turn-end facts. SAND_ATTACK proves only an accuracy-drop subshape; do not jump directly to the whole loop. |
| 5 | **[FLIPPED 2026-07-31 evening — all four move windows Scene-OFF-owned]** Executed per the adopted user policy: `8802fcb6` (turn 9), `329f8320` (turn 10), `59a3fa7d` (turns 11-12). Class-(c) bodies deleted (turn-10 AERIAL_ACE helper family died with turn 12 as last consumer; ROCK_SLIDE rock-prop loop survives on turns 1-8 ON windows + the generic Scene-ON adapter), class-(b) re-timed against the 13-window fresh OFF ground truth (`docs/rank5-off-ground-truth.md`). OFF pins EXACT: turn9-quickattack-b 231, turn9-rockslide 256, turn10-aerialace 206, turn10-rockslide 255+131, turn10-menu 83, turn11-rockslide 256, turn12-rockslide-miss 256. Residuals all ONE mechanism (idle-bounce PHASE, root-caused `docs/idle-bounce-phase-attribution.md`, closes with ranks 6-8 upstream OFF re-timing): turn9-quickattack 177/233, turn11-featherdance 189/191, turn12-aerialace 246/247. Eleven legacy ON pins retired; turn9-menu.json (111/111) + turn12-menu.json (46/46) stay until the phase family closes and their OFF pins bank. Remaining debt in this row: the turn-keyed DISPATCHER shape itself (turn9-12 clocks/constants are OFF-fit but still per-turn-named), foldable into ranks 6-8 keying retirement. Original row: **Turns 9-12 AERIAL_ACE/QUICK_ATTACK/ROCK_SLIDE loop**: `11313-13302` | 1,990 | T9 `turn9-quickattack.json` **169** / `turn9-rockslide.json` **130**; T10 `turn10-aerialace.json` **93** / `turn10-rockslide.json` **220**; T11 **178/163**; T12 **131/38** | ordinary message/HP/stat/PP/next-request events exist | Scene OFF has no typed owner for movement/clone/field-darken effect presentation. In scene OFF the visible controller/result shells are available, but exact effect bodies are animation-lane/source-component work. Blocked until the event-to-presentation policy can declare skipped versus controller-visible effects. |
| 6 | **[POLICY ADOPTED — user decision 2026-07-31 evening (PROGRESS 799 addendum)]** Scene-OFF retirement authorized for turns 1-4, same Option-A shape as rank 5: acceptance moves to the 10 banked OFF pins in `docs/rank6-off-ground-truth.md` (zero desync, determinism-checked); delete class-(c)/re-time class-(b) on the OFF route; retire legacy ON turns 1-4 pins as rank 6 executes. Execution = next session opener; slice recipe = rank-5 commits `8802fcb6`/`329f8320`/`59a3fa7d`. Executing rank 6 also closes the idle-bounce phase family share owned by turns 1-4 (predicted OFF menu-redraw delays 429/285/525/427 already measured). Original row: **Turns 1-4 initial menu/result chain**: kickoff through Turn-4 result `7515-9026`, with menu base and flag/PP wiring `7041-7514` | 1,986 | T1 `turn1-rockslide.json` **256**; T2 `turn2-dragonbreath.json` **237** / `turn2-endeavor.json` **77**; T3 **192/256**; T4 **250/250** | same basic receipt facts as rank 1 | Semantics exist, but this is entangled with harvested GROVYLE/ONIX command chrome and the `turn1Resolved…turn4Resolved` current-PP reconstruction. Do it after rank 1 proves the command adapter can fully replace flag-based PP and bounce ownership. |
| 7 | **[RETIRED 2026-08-01, `1f276c95` + `c0821a65`]** **Turn-14 FLY charge/miss and Turn-15 player faint/forced send-out**: `14546-16590` | 2,045 | `turn14-fly-miss.json` **213**; `turn15-fly-strike.json` **256**; selector **200/200**; send-out rungs **43/46/16/144/195**, plus all six +30 delayed twins | The canonical adapter now appends the locked strike to the immutable charge resolution exactly like the live retained owner. The exact route carries that resolution plus its request-owned `PartySelectState`; segment ownership replaces dispatch, source PP replaces flag reconstruction, and request 4 owns selector/send-out. Recharge and Bide snapshots are hardened at `8caad013`; merged OFF evidence is `adfb746c`/`49e18075`. | Both legacy fields are deleted. Differential replay against `8caad013` held all 13 ordinary/delayed trace capture lists byte-identical (**1,496 captures**) without querying the ON oracle from this OFF lane. Census **2,526→2,506 refs**, **33,135→33,125 LOC**. |
| 8 | **[RETIRED 2026-08-01, `80c5d6af` + `d410cfe5`]** **Turn 16 FIRE_PUNCH/burn and old Turn-17 prefix**: `15952-16590` | 1,639 | Turn-16 rungs **81/221/123/236/155/175**; Turn-17 rungs 1-6 **118/221/143/200/113/255** | `turn16FirePunchResolutionAdapter.ts` stages the documented Scene-OFF boundary through the production full-turn reducer at the exact eight-call RNG cursor. Its immutable commands own 138→79, 142→75, raw burn, burn text, one-callback status icon, 75→58 residual, PP 14/15, and the genuine next command. The compatibility owner attaches that following resolution after send-out and stores its relative redraw edge. | `turn16Resolved` and `FightSubmenuState.menuRedrawElapsed` are deleted. The exact renderer reads PP/status/HP/text from the resolution/status receipt and hands the stored edge to the existing terminal owner. Clean-prechange differential app replay is byte-identical for the requested **2,041 captures**, plus delayed Turn-16 rung 1 and Turn-17 rung 6b (**2,163 total**). Census **2,506→2,496 refs**, **33,125→33,124 LOC**. OFF authority remains FIRE_PUNCH/burn **42 captures with embedded states** and Toxic→Heal Bell clear **38**; no ON query was made. |
| 9 | **[RETIRED 2026-07-31; redraw gap rehomed by rank 8 `d410cfe5`]** ~~Turn-17 terminal result/loss/postwin legacy tail~~ — `applyTurn17PostwinFastFade` (`battleScene.ts`) reads `state.terminalResolution` (`faintDismissElapsed`/`resultDismissElapsed`/`menuRedrawElapsed`) directly; `advanceBattleScene`'s WIN-flip census also moved off the mirror. The four legacy fields (`turn17MenuRedrawElapsed`, `turn17KoDismissElapsed`, `turn17OutcomeDismissElapsed`, `turn17LossDismissElapsed`) and dead `turn17.ts` are deleted. Rank 8 subsequently moved the pre-confirm redraw gap from the submenu mirror to the immutable following-resolution presentation owner. Original row: **Turn-17 terminal result/loss/postwin legacy tail**: state/copy `2443-2468`, legacy fade `15290-15415`, `turn17.ts:17-46` | 179 + 48 | `turn17-rung7a/b.json` **255/147**, `turn17-rung8a/b.json` **255/118** | immutable `BattleTerminalBoundary` (`battleDecisionBoundary.ts:78-101`), retained by `factoryRoundBattleOrchestrator.ts` in `985ec1fa`, consumed by resolution presenter | Terminal and postwin ownership are typed; rank 8 closes the predecessor redraw mirror without changing this proof. |

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
- **[RESOLVED 2026-08-01, `fea91d54` + `8caad013` + `c0821a65`]** Opponent-
  owned locked-action retention survives the genuine intervening command by
  locked battler/move/PP-slot identity, reclaims the immutable strike receipt,
  and owns the forced selector through send-out. The exact mirrors are gone.
- **Scene-OFF effect visibility policy:** required before the AERIAL_ACE and
  QUICK_ATTACK render bodies can be retired. The battle facts exist; the
  decision of which controller-visible effect body remains with Battle Scene
  OFF is source/presentation work, not a pixel fit.
- **[RESOLVED 2026-07-31]** ~~Postwin owner handoff~~ — the downstream
  postwin fade now reads `state.terminalResolution` directly (see row 9);
  the four mirrored Turn-17 clock fields are deleted and the result/loss
  proof is untouched (dense pins re-verified exact).

Rank 8 is complete. The remaining #39 work is earlier mirror/dispatcher debt
listed above; do not resume the retired canonical Battle-2 march.
