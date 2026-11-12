# Live audit 16 (S10A side lane, 2026-10-09): CHAIN routes that went live THIS SESSION

This audit renders a consumer's complete dense window (activation through cleanup) after a UNIT that today's folds made lend a known
allocator / order host, and compares every row with fresh ROM frames. The folds are:
- `8e72343a7` alloc50 + `2fb7ccc62` alloc52: status animations SLP / CONFUSION / PSN / PRZ / BRN / FRZ / INFATUATION / CURSED / NIGHTMARE
  no longer invalidate the allocator, and 40 more move bodies are allocator net-zero (Seismic Toss, Ice Ball, Future Sight + its delayed
  hit, Pursuit, Perish Song, ...);
- `f038cc861` plans51: Outrage 200 and FOCUS_BAND (+ its carried slide sprite) are EXACT order units;
- `8f2a2974f` later58: Signal Beam / Bonemerang / Outrage (and others) render at LATER bodies when both idle rests are {0,0}.

Master is 8f2a2974f (production src tree 64e91f1d). Every run was direct mGBA (`prep48Probe.py`); no shared oracle was touched. No src
edit was made (no DEFECT needed a patch proof). Evidence is in `tools/integration/fixtures/audit-16/`.

**Totals.** 122 scenarios (120 with a consumer window), **239 consumer windows**, 239 live, 0 declined. Every window ran in two fresh probe processes with identical
per-row digests (chain AND entry-lend renders). A from-scratch reproduction (`audit16Run.sh`: stage == committed, derive == committed,
two more fresh runs) gave the same digests and px on 236 windows (the 3 INFATUATION windows, added last, ran once: `receipts/repro-check.txt`).
- **214 / 239 windows are 0 px on every row.**
- **No SPECIES- or HISTORY-DEFECT was found in any chain.** Every non-zero chain row is either a documented D4 BLDALPHA phase with
  counter evidence (9 Light Screen windows, both species pairs, both sides), a checker-framing ARTIFACT (2 Blaze Kick rows), or the consumer's OWN first-body residual,
  reproduced exactly by its no-unit control (Double Team on CHANSEY / ARBOK, 14 windows: UNRESOLVED, not chain-related).
- **ISSUES #152 is answered:** the ARBOK -> CATERPIE static 133-px residual is a **fixture artifact** (the geoice control fixture's
  full-HP `fieldProfile`), not a field-composite defect and not Blizzard-specific. Blizzard itself is 0 px on all 362 rows at the ROM's HP.

## 1. Results first

### Defect table

| Unit -> consumer | Side / species | px before -> after patch | Mechanism | file:line | Fix shape |
|---|---|---|---|---|---|
| — | — | — | — | — | **none**: no chain row differs from its no-unit control except by a counter-evidenced D4 phase |

### TIMING-PHASE (counter evidence: `receipts/vblank/table.txt` + `run-digests.txt`, 2 fresh runs each, identical; `lag-counters.txt`)

| Consumer | Windows / rows | Counter evidence | Verdict |
|---|---|---|---|
| **Light Screen 113, PLAYER attacker** (CHANSEY -> SNORLAX) | **3 windows, 2,473 px on one row each** (bbox x 91..132 y 48..111): CONFUSION chain (Confuse Ray + 2 x Status_Confusion + self-hit) row 59; Future Sight setup chain row 59; PRZ chain (Thunder Wave + 2 x Status_Paralysis) **row 19**. The entry-lend control has the same 2,473 px on the same row (the lend is not involved). | `audit15VblankProbe.py` IO vs buffered BLDALPHA: in all 3 residual windows the residual row is exactly the frame whose BLDALPHA write was **buffered** (row 59: IO 0x0709, buffer 0x0808, waiting [0x52]; row 19: IO 0x060a, buffer 0x050b, waiting [0x52]). The 0-px player windows measured (no-unit control rows 19 + 59; SLP chain rows 19 + 59) write directly (IO == buffer, list empty). Lag ages are [68, 69] in all 5 windows measured (so it is not a lag frame). | **TIMING-PHASE** (D4 VBlank-write class of audit 15 / lsbz). New facts: the PLAYER side has the hold phase too (audit 15 measured it direct in 3 / 3), and at a second step (row 19). Player-side production renders the direct phase (dominant: 15 / 20 player Light Screen windows over both pairs are 0 px). |
| **Light Screen 113, OPPONENT attacker** | SNORLAX / CHANSEY no-unit control: 2,658 px row 59. EXEGGCUTE / ONIX (the accepted pair): Future Sight and Seismic Toss chains 2,658 px row 59; the CONFUSION chain (Confuse Ray + Status_Confusion + the berry's HELD_ITEM_EFFECT) **5,343 px = row 19 (2,685) + row 59 (2,658)** | Every residual row is buffered (row 59: IO 0x0709 / buffer 0x0808; row 19: IO 0x060a / buffer 0x050b; waiting [0x52]); the 0-px EXEGGCUTE / ONIX control is direct on rows 19 and 59; the SNORLAX / CHANSEY CONFUSION chain is direct on row 59. Opponent Light Screen: 10 / 14 windows direct and 0 px | **TIMING-PHASE**: lsbz's D4 policy (`28f1f1ee4`, no hold) renders the dominant direct phase; the hold appears on the first body of one pair and after some units of the other, so it is not keyed on the history |
| **Light Screen 113, PLAYER attacker, EXEGGCUTE / ONIX** | no-unit control and the SLP chain: 2,571 px on row 59 | Row 59 buffered in both; the PRZ chain's row 59 direct (0 px) | **TIMING-PHASE** (same class; player Light Screen over both pairs: 15 / 20 windows direct and 0 px) |

### Non-defect table

| Row(s) | Residual | Evidence | Verdict |
|---|---|---|---|
| **#152: Blizzard 59, opponent ARBOK -> player CATERPIE** (geoice control field, lab seed 305419897) | 0 px, 362 / 362 rows (r1 == r2) through this audit's fixture path | The ROM's gBattleMons at activation: CATERPIE **24 / 120**, ARBOK **161 / 167**. The geoice control fixture says 120 / 120 and 167 / 167. Ablation (`receipts/i152/check-i152-ablation.json`, 4 variants, 2 fresh runs each): ROM HP -> 0 px; geoice HP -> **133 px on every row, bbox x 98..221 y 33..103, ROM 4a425a vs live 5ad684** (exactly the ISSUES #152 numbers); dropping the attacker personality changes nothing. The residual colours are the HP bar's empty vs green fill. Swift (80 rows) and Thunderbolt (237 rows) on the same field are 0 px too | **ARTIFACT** (fixture `fieldProfile`). The Blizzard program and the field composite are exact. Fix shape (fixture only): take HP from the ROM at activation in `tools/integration/fixtures/geoice/controls/blizzard-opponent-arbok-caterpie.json` |
| **Double Team 104 on CHANSEY**, both sides: no-unit controls c0 / c1 and every Outrage chain (5 + 4) | 188,618 / 188,775 (player) and 236,200 / 236,281 (opponent) px, rows 5..57 | At the ACCEPTED framing (prep7: production age 0 = ROM activation + 1; the accepted ONIX -> GROVYLE route through this checker: **0 px**, `receipts/onix-dt/`). CHANSEY's clone motion is one frame AHEAD of production: framed at activation it is exact except row 2 (1,809 / 1,566 px; `receipts/dt-offset-1/` keeps that trial). Lag ages are [133, 134] for CHANSEY, ARBOK and ONIX alike; the monbg BG writes are buffered at row 1 in all of them (waiting [12, 24, 26] / [10, 20, 22]). The chain rows equal their no-unit control (to within 157 px between the first-body and later-body lends); the entry-lend control is 200,690 / 245,755 px, so the chain lend is the better one | **UNRESOLVED**, the consumer's own first-body residual (not a chain defect). Species-dependent 1-frame phase of the clone program with no lag-frame or BLDALPHA counter explaining it. Production renders it live (`liveMoveAnimation.ts:2805`, no side / species gate) |
| **Double Team on ARBOK** (opponent, first body, #152 field) | 49,405 px, ages 6..45 (393,765 at the activation framing) | Same counters as CHANSEY (lag [133, 134]) | **UNRESOLVED**, same class as above (not chain-related) |
| **Blaze Kick 299, player holder CATERPIE after FOCUS_BAND** (seeds 12, 13) | 200 px on **age −10 only** (bbox x 160..191 y 65..72, ROM 526b63 vs live bdbd9c) | Age −10 is the ROM activation row, 10 rows before Blaze Kick's accepted window (the checker's ageOffset −10 framing, audit 15). The bbox is the opponent DRAGONITE's shadow strip; Blaze Kick lists no shadow row (its window starts after activation). The entry control has the same row; the 4 opponent-holder windows (DRAGONITE on the player side: no opponent shadow) are 0 px | **ARTIFACT** (checker window starts before the adapter's window) |
| Status chains -> Light Screen / Reflect / Protect, both sides | 0 px (27 of 31 windows; the other 4 are the Light Screen phase above) | The audit-15 harness (`postkoHostReplay.ts`) still invalidates the allocator on EVERY status animation: it would have DECLINED all 31 (`harnessAllocator: false`). This audit's replay follows today's orchestrator (`factoryRoundBattleOrchestrator.ts:2329`) | **EXACT** (newly live routes). Harness note: `replayPostKoTurnsThroughHost` is stale for alloc50 / alloc52 and has no geometry callback |
| Every chain on an allocator consumer (Light Screen / Reflect / Protect) | 0 px, entry-lend control also 0 | A net-zero unit leaves the allocator equal to the first-body entry by construction, so the entry control cannot discriminate; the rows prove the post-unit render (status icon, HP bar, x2, message box, BG, the lent allocator) | **EXACT, lend-neutral** |

## 2. Coverage (`receipts/coverage-grid.md`; `python3 tools/integration/audit16Coverage.py <receipts>`)

Unless named otherwise the unit side is SNORLAX (faster, one move x4) and the consumer side CHANSEY. "x / y" = 0-px windows / windows
AFTER the unit; "discr" = 0-px windows whose entry-lend control is non-zero.

| Unit (today's fold) | Consumer, side: cell |
|---|---|
| **CONFUSION** (Confuse Ray + infliction / attempt Status_Confusion, self-hit) | Light Screen opp 1/1, ply 0/1 (PHASE r59); Reflect ply 1/1, opp 1/1; Protect ply 1/1 |
| **SLP** (Spore + Status_Sleep x2, wake) | Light Screen ply 1/1; Reflect ply 1/1. Opponent side: the AI switched the sleeping CHANSEY out on all 24 swept seeds (not reached) |
| **PRZ** (Thunder Wave + Status_Paralysis) | Light Screen opp 1/1, ply 0/1 (PHASE r19); Reflect ply 1/1; Protect ply 1/1 |
| **PSN** (Sludge Bomb + Status_Poison; seeds 1 / 3) | Light Screen ply 1/1; Reflect ply 1/1; Protect ply 3/3 (after 1..3 end-turn PSN animations) |
| **FRZ** (Ice Beam + Status_Freeze x7, thaw; seed 3) | Light Screen ply 1/1; Reflect ply 1/1 |
| **INFATUATION** (Attract + Status_Infatuation x1..3) | Light Screen ply 1/1, opp 1/1; Reflect ply 1/1 |
| **BRN** (Will-O-Wisp + Status_Burn) | Light Screen opp 1/1 (a DECLINE in audit 15); Reflect ply 1/1 |
| Seismic Toss (net-zero, prep52) | Light Screen ply 1/1, opp 1/1; Reflect ply 1/1; Protect ply 1/1 |
| Ice Ball (body 1) | Light Screen ply 1/1; Reflect ply 1/1 |
| Future Sight setup | Light Screen opp 1/1, ply 0/1 (PHASE r59); Reflect ply 1/1; Protect ply 3/3; Thunderbolt ply 5/5, opp 5/5 |
| **General_FutureSightHit** (FUTURE_SIGHT_HIT) | Thunderbolt ply 2/2, opp 2/2 (no ROM route put Protect / a wall after the hit) |
| Pursuit; Perish Song | Light Screen ply 1/1 each; Reflect ply 1/1 each |
| **Outrage** (plans51; + HIT, fatigue Status_Confusion) | Thunderbolt ply 4/4, opp 5/5; Ice Beam ply 4/4; **Blaze Kick ply 4/4, opp 5/5; Heal Bell ply 4/4 (discr 3), opp 4/4 (discr 2)**; Double Team ply 0/4, opp 0/5 (UNRESOLVED, = control) |
| **FOCUS_BAND** (plans51; Dragonite Outrage OHKO, CATERPIE holder survives, carried slide sprite) | Swift ply 3/3, opp 4/4; Thunderbolt ply 3/3, opp 4/4; **Heal Bell ply 3/3 (discr 3), opp 4/4 (discr 4)**; Blaze Kick opp 4/4, ply 0/2 (ARTIFACT age −10) |
| **later58 LATER bodies** after a predecessor outside its probe set | Signal Beam after Thunder Wave + PRZ, Double Team + stat, Sunny Day + SUN_CONTINUES: ply 5/5, opp 6/6. Bonemerang hit 1 + hit 2 after the same: ply 8/8, opp 11/11. Outrage after Thunderbolt / Ice Beam / Blaze Kick / Heal Bell / Double Team + their hits and Status_Confusion: 20/20 (both sides) |
| **Second pair, EXEGGCUTE / ONIX** (ONIX plays the unit; accepted lab seeds) | Light Screen after CONFUSION (+ HELD_ITEM_EFFECT): ply 1/1, opp 0/1 (PHASE r19 + r59); PRZ ply 1/1, opp 1/1; BRN ply 1/1, opp 1/1; **SLP opp 1/1** (the opponent side reached here), ply 0/1 (PHASE r59); Seismic Toss ply 1/1, opp 0/1 (PHASE); Future Sight ply 1/1, opp 0/1 (PHASE); Perish Song ply 1/1, opp 1/1; controls opp 1/1, ply 0/1 (PHASE) |
| #152 ARBOK -> CATERPIE (first body) | Blizzard 1/1, Swift 1/1, Thunderbolt 1/1; Double Team 0/1 (UNRESOLVED) |
| controls (first body; c1 = after the consumer's own earlier body) | Light Screen ply 1/1, opp 0/1 (PHASE); Reflect 2/2; Protect 1/1; Thunderbolt 4/4; Ice Beam 2/2; Blaze Kick 3/3 (discr 1); Heal Bell 4/4; Double Team 0/4 (UNRESOLVED) |

Headlines: allocator consumer after a status animation **31 windows, 27 exact, 4 PHASE** (SLP, CONFUSION, PSN, PRZ, BRN, FRZ,
INFATUATION); after a newly net-zero body **29 / 32** (3 PHASE); after Outrage **55 / 66** (9 Double Team UNRESOLVED, 2 Blaze Kick ARTIFACT);
after FOCUS_BAND **25 / 27** (2 ARTIFACT); later58 later bodies **50 / 50**. Species pairs: SNORLAX / CHANSEY, EXEGGCUTE / ONIX (the accepted Light Screen pairs, both sides), DRAGONITE / CATERPIE,
ARBOK / CATERPIE (+ the accepted ONIX / GROVYLE Double Team route as framing reference).

### Not reached (time-boxed)

- **words57** (Rain Dance + an opponent KO + summary + send-out -> an order-dependent consumer): not staged. It needs the words-deferred
  lend (pinned Random2 words) and the faint / summary / send-out events in this audit's replay; `audit16Check.ts` models neither.
- **SLP on the opponent side with CHANSEY**: the AI switches it out (24 seeds swept); reached with EXEGGCUTE / ONIX instead.
- **CURSED / NIGHTMARE** status animations and **Magic Coat / Mirror Coat / Barrier** consumers.
- **later58 after a switch-in** predecessor, and Mach Punch / Sheer Cold / Extrasensory / Sky Attack / Fury Cutter at later bodies.
- **Two species pairs for the chains** (the second only for Light Screen), + two for the special rows. Consumers were chosen by priority / order sensitivity; the census
  was not consulted per unit.
- The Double Team CHANSEY / ARBOK phase mechanism (needs an OAM / sprite-callback probe of the clone sprites).

## 3. Method

1. `audit16Stage.py` builds 122 battle-lab scenarios (explicit lab seed in each; ISSUES #154): the audit-15 SNORLAX / CHANSEY leads, the
   unit / consumer one move x4 each, 2..6 prompt cycles; FOCUS_BAND reuses plans51's Outrage stagings and seeds with the holder's move
   replaced; `audit16Sweep.py` picked the PSN / FRZ seeds; the #152 rows reuse the geoice control scenario with ARBOK's move replaced.
2. `audit16Probes.sh` runs `prep48Probe.py` once per scenario; `audit16Fixtures.py` turns the history up to each consumer body into
   kernel payloads, one turn per action prompt (audit 15's recipe plus: Status_Sleep / Poison / Freeze / Infatuation, the confusion self-hit,
   FUTURE_SIGHT_HIT, FOCUS_BAND, SUN_CONTINUES, HELD_ITEM_EFFECT; later58 moves as consumers at every body, `-cu<k>`; Double Team framed at activation + 1
   and Blaze Kick at −10 as the accepted fixtures frame them; Bonemerang hit 2 with the blank message box).
3. `audit16Check.ts` (one scenario per process) replays the history through the production hosts AS THE ORCHESTRATOR DOES TODAY:
   `beginLiveSpriteOrderTurn` per prompt, `advanceLiveSpriteOrderHost` before / after each event with the geometry-plan callback,
   `prepareLiveMoveSpriteAllocator` per body, and the allocator invalidated only by a status animation outside
   `LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS` or a general animation that is not `liveSpriteAllocatorAnimationNetZero`. It renders
   `liveAdapterFramebuffer.ts`'s `liveView` (field, healthboxes + status icons, message box, x2 history from the same history) with only
   the order / allocator lends replaced, for the CHAIN history and for the ENTRY history (the body alone), against two fresh probe
   processes; `live` is `liveMoveAnimationPresentation(...) !== null` at age 0.
4. `audit16Vblank.sh` / `audit16VblankTable.py` record IO vs buffered BLDCNT / BLDALPHA and `sGpuRegWaitingList` around each residual
   row and the same row of a 0-px window (`audit15VblankProbe.py`, two fresh runs each).

## 4. Reproduction (run from workspace/; direct mGBA only)

```
sh tools/integration/audit16Run.sh <receipt-dir> [scratch-dir]      # ~4 min: stage (== committed) -> probe -> derive (== committed) -> check
python3 tools/integration/audit16Coverage.py <receipt-dir>           # coverage grid + totals
sh tools/integration/audit16Vblank.sh <dir> && python3 tools/integration/audit16VblankTable.py <dir>     # BLDALPHA IO vs buffer, 2 runs each
sh tools/integration/issue151Counters.sh <dir> 8 tools/integration/fixtures/audit-16/fixtures/{ctl,prz,conf}-light-screen-ply-c0.json   # lag ages
node --experimental-strip-types --no-warnings tools/integration/audit16Check.ts tools/integration/fixtures/audit-16/ablation i152-ablation <out.json>   # #152 ablation
node --experimental-strip-types --no-warnings tools/integration/audit16Check.ts tools/integration/fixtures/audit-16/ablation onix-dt <out.json>        # DT framing reference
python3 tools/integration/audit16Sweep.py <dir> 1 24 psn-light-screen-ply ...   # seed sweep (then audit16Probes.sh <probe-dir> <dir>/*.json)
```

## 5. Receipts (`tools/integration/fixtures/audit-16/`)

`scenarios/` (122; `slp-light-screen-opp` and `fb-blaze-kick-pla-s17` yield no consumer window: AI switch-out / no holder body after the band within the trace), `fixtures/` (239 windows, `precedingTurns`), `ablation/` (the #152 HP / personality variants; the ONIX Double Team
reference at both framings), and `receipts/`:
- `main/`: per-scenario check JSON (chain + entry: live / order / allocator, rows, px, r1 / r2 digests, residual rows with bbox and a
  ROM / live colour sample, the audit-15 harness's allocator decision), `summary.txt`;
- `repro-check.txt`, `coverage-grid.md`, `derive.txt`;
- `vblank/table.txt`, `run-digests.txt`, `lag-counters.txt`;
- `i152/`, `onix-dt/`, `dt-offset-1/`.

No RGB dumps, no mGBA logs, no patches (no DEFECT).
