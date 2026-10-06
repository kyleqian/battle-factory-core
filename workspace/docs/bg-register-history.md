# BG-register history tracker (S10A side lane; measured evidence + design, new files only)

Goal: make Overheat (315), Silver Wind (318) and Psych Up (244) briefable **after earlier bodies**, not only as first bodies (`docs/next-adapters-prep16.md` §0.3). No `src/` change, no tracked file edited, no ledger edit. Every ROM number is a **direct, independent mGBA run** (Scene ON, fresh process per scenario; shared HTTP oracles never contacted). **The relied-on bulk probe was run twice from fresh processes: 780/780 scenario outputs byte-identical** (`consumer-later-body-cases.json` `determinism`, sha256 of the r1 concatenation `bf04e709...3c`). The two dense Silver Wind captures used in the experiment (§5) were also run twice (196 per-frame RGB sha256 lists identical each).

## 0. Results first

### 0.1 The rule
**State** = the *consumer signature*: every IO/scroll register and software matrix that the three reducers (or their neighbours) can read: `dispcnt, bg0-3cnt, bg1-3hofs/vofs, win0/1h/v, winin, winout, mosaic, bldcnt, bldalpha, bldy, gBattle_BG1-3_X/Y, gOamMatrices sha`. Deliberately excluded: BG0 scroll (battle-text BG, toggles 0/160/320 with menus) and `gOamMatrixAllocBitmap` (the sprite-order tracker's job). 68 distinct states over 2,259 bodies (94 if BG0 scroll and the bitmap are included).

* **Initial state S0** (first body of a battle): `dispcnt 0xbf40, bg0cnt 0x9800, bg1cnt 0x9c00, bg2cnt 0x5e00, bg3cnt 0x5a0b, all scrolls 0, win0h 240, win0v 161, bld* 0, winin/winout 0x3f3f`, identity matrices. **737/762 first bodies are exactly S0.** The 25 others are explained (never "mystery"): 24 scenarios whose battler has **Intimidate** (Ekans, Hitmontop, Arcanine, Masquerain, Gyarados ...): the switch-in stat-drop body ran inside `BattleLab.prepare`, before the probe's frame 0 (the state is S9 = the state the stat body leaves, below); 1 scenario (`mechanic-pursuit-switchout-opponent-beedrill-player-shuckle`) starts after a switch-in and sits in S54 (`dispcnt 0x1f40, bg2cnt 0x5e01`). So **"first body" = "no body of any kind has run, including switch-in ability bodies"**.
* **Per-body effect** (the smallest rule that matched): for each key `(moveId, attacker side [, stat key])` a body applies a **field delta** to the *activation* state: `keep` (default), `set field := v`, or (6 keys) `map prior-value -> value` on one field. Delta tables: `fixtures/bg-register-history/move-effects.json` (614 keys: **107 leave the signature unchanged, 489 set fixed fields (+ keep the rest), 6 depend on the prior value of one field, 12 are mixed**). The deltas relevant to the three consumers' neighbours (`set`, all measured ≥ 12 times):

| Body | Delta on the signature (attacker side = who uses the move) |
|---|---|
| Tackle 33 (and every ordinary damaging body; 489-key family) | player: `bg1cnt:=0x5c02, bg1hofs/vofs:=0, win0h/v:=0, bldcnt/bldalpha:=0`; opponent: `bg2cnt:=0x5e02, win0h/v:=0, bld*:=0` (damaging bodies run the MON_BG of their *target*, i.e. the opposite BG: the attacker side picks bg1 vs bg2) |
| Splash 150 / Hyper Beam 63 / Hail 258 | `win0h/v := 0` only (both sides) |
| Psychic 94 | player: `bg1cnt:=0x5c02, bg1vofs:=0, win0:=0`; opponent: `bg2cnt:=0x5e02, win0:=0` |
| **Overheat 315** | player: `bg1cnt:=0x5c02, bg1vofs:=0, win0:=0`; opponent: `bg2cnt:=0x5e02, win0:=0` (same family as Tackle-type damaging bodies, but bld unchanged) |
| **Psych Up 244** | player: `bg2cnt:=0x5e02, win0:=0`; opponent: `bg1cnt:=0x5c02, bg1vofs:=0, win0:=0` |
| **Silver Wind 318** | player: `bg1cnt:=0x5c01, bg2cnt:=0x5e02, bg1vofs:=0, win0:=0`; opponent: `bg2cnt:=0x5e02, win0:=0` and **`bg1cnt` depends on the prior value** (`0x5c02->0x5c01, 0x1c00->0x1c01, 0x9c00->0x9c01, 0x9c01->0x9c01, 0x5c01->0x5c01`: it ORs priority 1 into the low 2 bits) |
| Swords Dance 14 (move body) | `bg1cnt:=0x1c04, bg1vofs:=63, win0:=0, winout:=0x3f3d, bldcnt:=0x3f42, bldalpha:=0x060a` (+ `bg2cnt:=0x5e02` for the player) |
| Growl 45 / Screech 103 | `bg1cnt:=0x1c04, bg1hofs:=64, bg1vofs:=449, win0:=0, winout:=0x3f3d, bldcnt:=0x3f42, bldalpha:=0x060a` |
| **Stat-change body** (move id 0, script `0x82d7edb`) | keyed by its stat args `gBattleAnimArgs[0..1]` read 4 frames after activation: `(0,0)/(0,3)` (+ stat) -> `dispcnt:=0x3f40, bg1cnt:=0x1c00, bg1vofs:=3` (**S9 family**); `(1,0)/(1,5)` (- stat, e.g. Growl/Screech/Intimidate) -> `dispcnt:=0x3f40, bg1cnt:=0x1c00, bg1vofs:=509`; `(0,1)` also `bg1hofs:=0` |
| other status/weather/field move-0 bodies (`0x82d7d84`, `d88`, `df6`, `e22`, `810b`) | unchanged |

* **The 12 mixed keys** are all two-turn / multi-phase moves (Razor Wind 13, Fly 19, Sky Attack 143, Curse 174, Dive 291, Bounce 340): the charge turn and the strike turn leave different states, so their key needs a phase bit.
* **Chain rule (ROM truth):** next activation == previous body's **end+30** signature when the gap ≥ 30 frames (**1,305/1,308**), == **end+1** when the gap < 30 (the stat body 4 frames after its move body: **189/189**). The three misses are the stockpile family (below). A body's *end+1* and *end+30* differ for move bodies that fade (e.g. Growl 38/45, Swords Dance 27/27 bodies), so the tracker keeps **two** states per body (end+1, end+30) and the host picks by the gap to the next body.

### 0.2 Event table (non-move units between bodies)
Measured as (previous end signature == next activation signature) across the unit that sits between two bodies, by scenario family (`units-by-family.json`):

| Unit between bodies | Effect on the consumer signature | Pairs | Evidence |
|---|---|---|---|
| Action menu, turn gap, end-turn message, HP drain, status/weather text, EXP/ability text | **none** | all pairs below | 1,104/1,104 equal (631 damaging scenarios) |
| Stat-change bodies (own units) | **apply the stat delta (table above)**, then it is "just another body" (activates at previous end+1 when < 30 frames) | 135/135 equal | `status/stat bodies` family |
| Faint, replacement send-in, KO text, (25 pairs with gap ≥ 1,000 frames) | **none**: the signature after a KO/replacement is whatever the last body left; **a send-in does NOT reset it to S0** | 103/103 equal | `postko-*`, `issue84-*`, destiny-bond/perish/explosion families |
| Voluntary / forced switch, Baton Pass, Pursuit, Roar/Whirlwind | none across the unit between two bodies; **a switch-in leaves S54 (`dispcnt 0x1f40, bg2cnt 0x5e01`) when it is the first unit** (1 scenario, not enough for a general switch row) | 16/16 | `switch/baton/pursuit/forced` family |
| Weather/field bodies | `win0h/v := 0` or unchanged | 29/29 | Hail etc. |
| Stockpile family (Stockpile/Spit Up/Swallow with 2-3 stacks) | **3/110 pairs differ**: `dispcnt`/`bg2cnt` (+ `bg1` for Spit Up) change between two bodies 700-3,600 frames apart (the stockpile bar/animation state) | 107/110 | `units-by-family.json` `different` (all three listed) |
| Party menu | not observed in any scenario (no scenario opens it between bodies) | -- | **Open** |
| Battle start | S0 (and S9/S54 if a switch-in ability/body ran before the first move) | 762 first bodies | §0.1 |

**Nothing observed resets the signature to S0 after a body.** Only a new battle does.

### 0.3 Tracker check (rule vs ROM at every later-body activation; `tracker-check.json`)
780 scenarios, 2,259 bodies, **1,497 later bodies** (all later bodies of the lab scenarios, `mechanic-*` + `prep16-*` + `prep11-*` + `gate6/rollout/postko/issue*/prep13` non-`-off`). Rule = the per-key field deltas above learned from the same data (so "in-sample"), plus a **leave-one-scenario-out (LOSO)** run where the rule is rebuilt without the scenario under test (unknown key = unknown, never guessed):

| Mode | exact | wrong | unknown |
|---|---|---|---|
| Chained from S0 with the end+1/end+30 gap rule, in-sample | **1,408** | 54 | 35 |
| Same, **LOSO** | 954 | 97 | 446 |
| One-step (prediction restarts from the ROM state before every body), in-sample / LOSO | 1,304 / 1,036 | 170 / 145 | 23 / 316 |

The 54 in-sample misses (`missesChainedInSample`, each with predecessor and the differing registers) cluster on a handful of bodies whose key is not captured by (move, side): Triple Kick 167 (9: `dispcnt/win0` differ, hit-count context), Strength 70 / Counter 68 / Smelling Salt 265 / Thrash 37 / Double-Edge 38 / Acid 51 / Pursuit 228 (a damaging body that missed or KOs leaves a different state), Recycle 278, and the stockpile family (6). **None is Tackle/Psychic/Hyper Beam/Splash/stat/Overheat/Silver Wind/Psych Up.**

### 0.4 Consumer coverage (`consumers.json`, `consumer-later-body-cases.json`, `route-coverage.json`)
Signature fields each consumer reads (union over its reducer inputs: `overheat.ts`, `silverWind.ts`, `psychUp.ts`; `prep16` §2):

| Consumer | Fields read | Later-body activation values seen in ROM (read fields vs S0) |
|---|---|---|
| Overheat 315 | `dispcnt, bg1cnt, bg1hofs, bg1vofs, win0h/v, bldcnt, bldalpha, bldy, matricesSha` | `bg1cnt 0x1c00, bg1vofs 509, dispcnt 0x3f40, win0 0` (after a Splash/Hyper Beam turn gap) |
| Silver Wind 318 | the same + `bg2cnt` | `bg1cnt` ∈ {0x1c00, 0x5c02, 0x5c01, 0x9c00, 0x9c01}, `bg2cnt` ∈ {0x5e00, 0x5e02}, `bg1vofs` ∈ {0, 3, 509}, `dispcnt` ∈ {0xbf40, 0x3f40}, `win0 0` |
| Psych Up 244 | `dispcnt?, bg1cnt, bg2cnt, bg1hofs/vofs, bld*, matricesSha` | `bg2cnt` ∈ {0x5e00, 0x5e02}, `bg1cnt` ∈ {0x9c00, 0x5c02, 0x1c00}, `bg1vofs` ∈ {0, 3, 509} |

* **In the lab scenarios**: later bodies of the three moves = **72** (Overheat 5 player + 1 opponent, Silver Wind 11 + 20, Psych Up 18 + 17). The chained rule predicts the **read fields exactly for 72/72 (in-sample) and 72/72 under LOSO** (`consumers.json`). Caveat: these later bodies come mostly from the designed `prep16-*` scenarios (predecessors Tackle / Splash / Psychic / Hyper Beam / Growl / Swords Dance / Silver Wind), so this proves the table for those predecessors, not for the whole move list. In-sample and LOSO are equal because every predecessor key has ≥ 5 observations.
* **Ordinary generated routes** (`bgHistoryRouteBodies.ts`, `bgHistoryRouteCoverage.py`; production orchestrator, Scene ON, seeds 100-199 with the x2 route harness's slot patterns; 8 of 100 errored/stalled, whole route treated as one battle): **1,578 presented move bodies, 100 first / 1,478 later; 858 later bodies (58 %) have every earlier move body in a "known" (unchanged/set-only) rule row, 734 of 1,228 later *live* bodies (60 %)**; the rest follow a context-dependent or absent key (Dive 291, Bounce 340, Rollout 205, Protect 182, Razor Wind 13, Bite 44, Feint Attack 185, Ember 52, ...) or a stat body that the replay does not list (route bodies are move-animation commands only; stat bodies sit between them and are *not* in this count, so "known" is an upper bound until stat bodies are fed). **Overheat and Psych Up never occurred in these 100 routes; Silver Wind occurred 30 times: 6 first bodies, 24 later bodies, 13 of them behind a fully-known chain**, 11 behind an unknown one (e.g. seed 110 after Dive/Bounce-type predecessors, seed 133 after Razor Wind 13). Example known later bodies: seed 106 (opponent Rollout-family 154 x2, then player Silver Wind), seed 126 (6 predecessors, then Silver Wind at i=6 and i=13).
* Therefore for the three moves: **exact now (with the rule) for the predecessor set {Tackle-type damaging bodies, Psychic, Splash, Hyper Beam, Hail, Swords Dance, Growl/Screech, stat bodies with known args, own earlier Silver Wind/Overheat/Psych Up}; unknown otherwise** (two-turn moves, Triple Kick, Counter/Strength/..., stockpile, switch-in-first-unit, unmeasured moves).

### 0.5 Three later-body cases per move (expected adapter inputs; ROM-measured, `consumer-later-body-cases.json` lists 39 distinct read-signatures)
| Move / side | Predecessor chain | Expected registers at activation (what the adapter's `registers`/`monbg` should be) | Scenario |
|---|---|---|---|
| Overheat player | foe Splash (turn gap) | `dispcnt 0x3f40, bg1cnt 0x1c00, bg1vofs 509, win0 0` | `prep16-hist-overheat-player-after-splash` |
| Overheat opponent | player Hyper Beam | same | `prep16-hist-overheat-opp-after-hyperbeam` |
| Overheat player (rule prediction) | player Tackle -> opponent Overheat's own predecessor | `bg2cnt 0x5e02, win0 0` after a foe Tackle; Overheat player after foe Tackle leaves `bg1cnt 0x5c02, bg1vofs 0` | rule rows `33/*`, `315/*` |
| Silver Wind opponent | player Tackle | `bg1cnt 0x5c02, win0 0, dispcnt 0xbf40` (the accepted fixture; `splitBg1Cnt 0x5c01`) | `mechanic-silver-wind-opponent-butterfree-player-onix` |
| Silver Wind opponent | player Splash | `bg1cnt 0x9c00, win0 0` (`splitBg1Cnt 0x9c01`) | `prep16-hist-silverwind-opp-after-splash` |
| Silver Wind opponent | own Silver Wind after a foe Tackle | `bg1cnt 0x5c01, bg2cnt 0x5e02, win0 0` | `prep16-hist-silverwind-opp-after-hyperbeam` (`prev 318` rows) |
| Silver Wind player | foe Tackle | `bg1cnt 0x5c01, bg2cnt 0x5e02, win0 0` | `prep16-hist-silverwind-player-after-tackle` |
| Psych Up player | foe Tackle / Psychic | `bg2cnt 0x5e02` (and `bg1cnt 0x9c00 -> 0x5c02`, `bg1vofs 0`, `dispcnt 0xbf40`) | `prep16-hist-psychup-player-after-tackle` |
| Psych Up opponent | foe Tackle | `bg1cnt 0x5c02, bg1vofs 0, bg2cnt 0x5e00, dispcnt 0xbf40` | `prep16-hist-psychup-opp-after-tackle` |
| Psych Up opponent | after Growl (stat body) | `bg1cnt 0x1c00, bg1vofs 509, dispcnt 0x3f40` | `prep16-hist-psychup-opp-after-growl` |

## 1. Proposed production shape (mirrors `liveBattlerX2History.ts`, #148; do not wire without the Open items)

* `src/engine/liveBgRegisterHistory.ts` (new, pure): `type LiveBgSignature` = the consumer-signature field record above (or just the 14 fields the three adapters read: `dispcnt, bg1cnt, bg2cnt, bg1hofs, bg1vofs, win0h, win0v, bldcnt, bldalpha, bldy` + `matricesIdentity: boolean`); `type LiveBgHistory = { readonly known: true; atEnd1: LiveBgSignature; atEnd30: LiveBgSignature } | { readonly known: false }`; `LIVE_BG_INITIAL = S0`; `liveBgHistoryAfterBody(history, {moveId, attacker, statKey?}): LiveBgHistory` applying a table row (`set`/`keep`/`map`) and returning `{known:false}` for a key not in the table or a mixed key (never guess); `liveBgActivationSignature(history, gapFrames)` = `gap < 30 ? atEnd1 : atEnd30`.
* Table: `src/assets/gen/bg-register-deltas.json` generated from `fixtures/bg-register-history/move-effects.json` by a build script (ids/side/stat key -> `{set:{field:v}, map:{field:{prior:next}}}`, e1 and e30 variants), exactly like the x2 per-move class table. Start with the rows ≥ 5 observations and the neighbours of the three consumers; **absent move = unknown** (not "keep").
* Events (the same presentation-host hook points as the x2 tracker and the sprite-order tracker, `liveSpriteOrderHost.ts`): `battle-start` / first `switch-in` before any body -> `S0`; `body-presented(moveId, attacker)` -> apply row; `stat-body-presented(statArgs)` -> apply the stat row (the host must see stat-change commands as bodies; today only move-animation commands are hooked); `intimidate`/switch-in-ability bodies -> apply the stat row **before** the first move body; every non-body unit (menu, text, HP drain, faint, replacement send-in, switch) -> no-op (measured); `unknown-body` -> `{known:false}` until the next battle.
* Gate: `LiveMoveSpriteOrderInput.firstBody` generalises to `bgHistory.known`: first body = `S0`, later body = tracker signature; adapters of 315/318/244 take their `registers`, `monbg.initialBgCnt/initialHardwareScroll/splitBg1Cnt` from the signature (`splitBg1Cnt = (bg1cnt & ~3) | 1` for Silver Wind opponent, from the 318 map row), and decline (faithful-random) on `known:false`.
* Tests to add with the wiring: (1) the 780-scenario table replay as a pinned fixture (this document's §0.3 numbers), (2) per consumer the §0.5 cases through the real reducer vs ROM RGB, (3) stat body + gap < 30 chain, (4) unknown predecessor -> decline.

## 2. Experiment (no `src/` patch; the unmodified reducer through the production presentation path; reverted nothing because nothing in `src/` was edited)
`tools/integration/bgHistoryLaterBodyExperiment.ts`: Silver Wind opponent **after a player Splash** and **after a player Tackle**, dense mGBA capture (`tools/compare/silverWindProbe.py`, 196 frames each, run twice, per-frame sha256 identical) rendered against the ROM RGB with (i) capture-derived inputs, (ii) `background.registers` and `monbg.splitBg1Cnt` rebuilt **only from S0 + the rule delta**, (iii) the first-body S0 registers. Result (`later-body-silver-wind-experiment.json`, `later-body-silver-wind-after-tackle-experiment.json`): the rule-built registers equal the ROM registers in every compared field (`registerFieldsRomDiffersFromRule: {}`; `splitBg1Cnt` 0x9c01 resp. 0x5c01 predicted == ROM) and all three renders are 196/196 with 0 residual pixels. **This does not discriminate**: a sanity run that overrides `bg1cnt:=0, win0h/v:=5` is also 196/196, i.e. in this render path (`silverWindConfigFor` capture config -> `createSceneOnMovePresentation`) the register override did not move any pixel, so it is evidence for "rule == ROM registers", not for "registers matter to the pixels". I could not establish in the time box whether the override is ignored by the config path or the register fields are immaterial to the Silver Wind pixels for these predecessors; the prep16 residual 1,568 px (opponent first-body vs post-Tackle inputs) came from a whole-config swap, so it is also not attributable to registers alone. **Do not cite this as pixel proof; the register effect on pixels is still unproven (Open #1).**

## 3. Open
1. Pixel-level effect of the history registers is unproven (§2): derive a discriminating case (a reducer input that provably moves pixels, e.g. `monbg.splitBg1Cnt` priority bit or `win0h/v` for Overheat's window) before wiring.
2. Party menu, switch-out/in of the *player* (3 scenarios only reach one switch-in), and Baton-Pass-style chains are not observed between two bodies.
3. Context-dependent keys (12 mixed: two-turn moves; Triple Kick; Counter/Strength/Acid/Pursuit style bodies whose state depends on hit/miss/KO) need a phase/outcome bit; until then they are `known:false`.
4. Stat bodies are not presented as move-animation commands in the route harness, so route coverage (§0.4) is an upper bound; the production host must feed them (their args `gBattleAnimArgs[0..1]` are the key).
5. Routes were analysed as a single battle; a multi-battle route must reset to S0 at battle start (the lab scenarios are single battles).
6. Overheat and Psych Up are absent from 100 ordinary routes; their later-body counts in routes are 0 (only the 6 lab-designed Overheat later bodies and 35 Psych Up ones exist).

## 4. Files / reproduction
`tools/integration/`: `bgHistoryProbe.py` (per-body signature at activation/end+1/end+30 + stat args + between-body changes), `bgHistoryRun.sh` (bulk, direct mGBA), `bgHistoryAnalyze.py` (states, move deltas, tracker check, consumers), `bgHistoryUnits.py`, `bgHistoryCases.py` (r1==r2 receipt, per-consumer cases, per-body table), `bgHistoryRouteBodies.ts` + `bgHistoryRouteCoverage.py`, `bgHistoryLaterBodyExperiment.ts`, `bgHistoryRepro.sh` (everything). Receipts: `tools/integration/fixtures/bg-register-history/` (`states.json`, `move-effects.json`, `tracker-check.json`, `units-by-family.json`, `consumers.json`, `consumer-later-body-cases.json`, `bodies-table.json`, `route-coverage.json`, the two experiment JSONs). Raw per-scenario probe output stays in `/tmp/bgh/r1|r2` (not committed).
