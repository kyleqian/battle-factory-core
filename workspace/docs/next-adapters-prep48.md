# S10A prep48 — the later-body gates: Dig 91 (setup + unleash) and Return 216

Evidence only (side lane, new files only). Census baseline: master `024efddfd` (production src tree `0ee75849`), seeds 0..299, the
ordinary census driver. Temporary production patches are kept as `.diff` and were reverted before every commit.

## Results

| consumer | protected state (what the first-body gate stands for) | at a later body (ROM, direct mGBA) | verdict | windows (two fresh runs) | census |
|---|---|---|---|---|---|
| **Dig 91 setup** | (1) the monbg layer's BGxCNT before age 8 (`monBg.inactiveCnt` = S0 `0x9c00` / `0x5e00`); (2) the retained scanline lines above the attacker's band and `srcBuffer`; (3) the lent order; (4) battler x2 rests; (5) the allocator constants (tiles 305 / 310, banks 7 / 8, matrix bitmap 6, task slots) | (1) and (2) are history (BGxCNT ∈ {`0x5c02`, `0x1c00`, `0x5e02`}; 160/160 displayed scanline lines differ from S0), but **the renderer reads neither**. (5) is the same as at the first body in every activation. | **(a)**: the pixels read only the order-host lend + the x2 tracker | 17 later setups + 4 first: **21/21 0 px** | +60 cmds / +11,700 frames |
| **Dig 91 unleash** | the `afterDigSetup` lend (`DIG_POST_SETUP_FREE`) = "setup first, nothing since" | the setup writes the unleash's own state (BGxCNT = the setup's active `0x5c02` / `0x5e02`; the scanline band is rewritten). After a later setup the replayed order lend equals the ROM `sSpriteOrder` 17/17. | **(a)**: production order host | 17 after a later setup + 4 after the first: **21/21 0 px** | +44 / +2,992 |
| **Return 216** | (1) S0 BG registers; (2) the known-entry allocator (IMPACT tile 305, palette slot 7, matrices other than 1 and 2 free); (3) the battler x2 rests | (1) `win0h/v`, `bg1cnt`, `bg2cnt`, `dispcnt`, `bg1vofs` differ from S0, but no pixel reads them. (2) is identical to the first body at every activation. (3): an **opponent ONIX** at rest x2 = 1 is at **x2 = 0** after its own Quick Attack, a Return on it, or its Splash / Growl turn. The x2 tracker reads these as keep / unknown, i.e. the rest. | **(a)** while both battlers' species rest is {0,0}; **unbounded until the tracker rows are fixed** for ONIX / RATTATA (declines) | 21 later + 8 first **29/29 0 px**; 7 ONIX later 214/282 → declined | +27 / +7,614 |

Census delta, seeds 0..299 (`census-delta-{dig,all}-seeds0-299.json`):
- 7970 paired commands, **0 pairing mismatches**.
- **0 live → fallback regressions** in both patched runs.
- The battle digest `bb30f5726abc…` is identical in all three runs.

| src | live by count | live by frames |
|---|---|---|
| master | 6959 / 7970 = **87.31 %** | 1027127 / 1168273 = **87.92 %** |
| `prep48-temp-src-dig.diff` | 7063 = **88.62 % (+104)** | 1041819 = **89.18 % (+14,692)** |
| `prep48-temp-src-all.diff` (Dig + Return) | 7090 = **88.96 % (+131)** | 1049433 = **89.83 % (+22,306)** |

The "later-body" stop goes from 161 commands / 26,289 frames to **30 / 3,983**. The 30 that remain are the consumers not reached
(below). Every Dig and Return later-body decline on seeds 0..299 goes live. The x2-rest guard declines none of them: no ONIX or RATTATA
fights in those battles.

**Accounting.**
- The two adapters keep their **exact** status, but the claim's scope widens from "first body (plus the setup → unleash pair)" to
  "any known order lend, both battlers with a {0,0} species rest".
- This is **not** a D4 case: no CPU-phase parameter is involved. The relied-on state is deterministic and comes from trackers
  production already has (`liveSpriteOrderHost` lend, `liveBattlerX2History`).
- No new adapter is counted.

## (1) Instrument: the later-body declines and their real preceding units

`prep48OrderCensus.ts` is `prep47OrderCensus.ts` plus a per-battle **unit log**. The log records every order event the production
order host consumed, the prompt cycles (`P`) and the battle start, using compact tokens: `B<move><p|o>` (Dig unleash = `B10091`), `H`
hit, `S<arg>` stat, `st:` / `g:` status / general animations, `F` faint, switch units. Every command of a gated consumer gets the log
as `history`. `prep48Gates.py` folds this into `gates-*-seeds0-299.json`. Its own-token check (the log's last body is the command's
own body) passes 0 mismatches over all gated commands.

Later-body declines on master: **161 / 26,289** (the union fixture's 100 / 18,650 predates the prep47 fold).

| consumer | later-body cmds / frames | preceding body (top) |
|---|---|---|
| Dig opponent setup | 38 / 7410 | Wish 273p 5, own unleash 10091o 3, Feint Attack 185p 3, Earthquake 89p, Leech Life… (23 kinds) |
| Dig player setup | 22 / 4290 | Sludge 124o 3, Sandstorm 201p 2, … (19 kinds) |
| Dig opponent unleash | 31 / 2108 | the own setup 28 (the setup was a later body: after 1..67 bodies; units since: none / WISH_HEAL / Acid Armor + S40 / SLP) |
| Dig player unleash | 13 / 884 | the own setup 10 |
| Return player | 23 / 6486 | Sleep Powder 79p 8, own Return 5, Curse 174o, Yawn 281o, Double-Edge 38o, … |
| Return opponent | 4 / 1128 | Psychic 94p, Psych Up… |
| Signal Beam, Sheer Cold, Mach Punch, Memento, Extrasensory, Sky Attack, Bonemerang, Fury Cutter | 30 / 3983 | not reached |

## (2) ROM probes (direct mGBA, Scene ON, every scenario twice fresh: **20/20 r1 == r2**, `probes.json`)

`prep48Scenarios.py` derives the scenarios from the accepted prep18 / Return lab scenarios. Only the foe lead's move list and the
trace length change; the ROM computes every outcome.

- **Dig.** VIBRAVA vs CHANSEY and FLYGON vs GOLEM, both attacker sides, Dig x4 over 4 turns (8 scenarios):
  - `first4`: the foe uses Growl. Setup 2 follows the unleash, the Growl body and its stat-down body.
  - `qa4`: the foe uses Quick Attack. Each setup follows a damaging body + hit.
  - The player scenarios run 3-4 Dig cycles, because a locked player gets no prompt.
- **Return.** DRAGONAIR vs ONIX and SNORLAX vs GOLEM, both sides, Return x3 (12 scenarios), with the foe using Splash (`x3`), Growl
  (`growl3`) or Quick Attack (`qa3`).

`prep48Probe.py` records every animation body (the `gAnimScriptActive` edge up to the first inactive frame). At activation it reads:
- the IO BG / window / blend registers and `gBattle_BG*`;
- `gScanlineEffect` and both 320-word banks;
- `sSpriteOrder`;
- `gOamMatrixAllocBitmap`, the palette tags, tile tags and tile bitmap, and the live tasks;
- the BG map digests;
- the battler sprites' x2 / y2 and the battlers' HP.

It writes RGB only for the dense windows. Measured at every Dig / Return activation (42 Dig, 36 Return), with each item a single value
across all of them:
- tile bitmap, palette tags, matrix bitmap 6, the empty task list and the BG map digests (screenblocks 26-31);
- `scanline.state` 0.

Varying with history:
- the monbg layer's BGxCNT;
- `win0h/v` (0 after any body);
- `dispcnt`, `bg1vofs`;
- the scanline banks: after the first unleash, 112-160 of the 160 displayed lines differ from S0;
- `sSpriteOrder` (tracked by the order host);
- the opponent ONIX's x2.

## (3) Production-renderer windows (`dig-check-after.json`, `return-check-after.json`)

`prep48DigCheck.ts` drives `verifyLiveAdapterFramebuffer` (liveAdapterFramebuffer.ts) over the fixtures that `prep48DigFixtures.py`
derives from the probe:
- `denseWindow` = activation .. first inactive frame;
- HP / maxHP from the ROM `gBattleMons` at activation;
- `precedingBodies` = the probe's earlier bodies, with the order lend and x2 input through the harness's production replay.

Each fixture runs two fresh probe processes; the per-run digests are identical in 78/78.

| body | first body | later body | with the `all` patch |
|---|---|---|---|
| Dig setup | 4: 195/195 0 px ×2 | 17 (after QA + hit, the own unleash, Growl + S22) | **17/17 195/195 0 px ×2** |
| Dig unleash | 4 (after a first setup): 68/68 | 17 (after a later setup) | **17/17 68/68 0 px ×2** |
| Return | 8: 282/282 | 21 with no non-zero-rest battler | **21/21 282/282 0 px ×2** |
| Return, player DRAGONAIR → opponent ONIX | — | 7 | declined (guard). Unguarded (v1): **214/282, 1091 px/row at ages 0..67** = the ONIX sprite one pixel right (box x 149..204, y 12..71) |

**Why the Dig history does not reach the pixels** (source, `battle_anim_ground.c`):
- `AnimTask_DigBounceMovement` (:300-330) bands the scanline at `[y-32, y+32)` of the attacker's elevated y. `SetDigScanlineEffect`
  (:458-495) writes that band and everything below it (the band offset, then the off-screen `bgX + 240`) in **both** banks. Lines
  above the band keep the history values, and the monbg copy (the 64×64 attacker) never rises above `y - 32`. So the retained lines
  and the bank choice are invisible.
- The battle renderer's Dig branch (`battleScene.ts:36594`) reads only `scanline.state / srcBuffer / buffers[0..159]`,
  `hardwareScroll` and the order. It never reads `registers.hardwareCnt`. The monbg layer is blank outside the monbg window: the BG
  map digests are the same at every activation.
- The unleash's state is written by its own setup.

**Return.** The renderer reads only the registers the body writes (the monbg layer's `cnt` from age 5, the scroll, `setalpha` and
the ages-1..279 window). The 21 later bodies have `win0`, `bg1cnt`, `bg2cnt`, `dispcnt` and `bg1vofs` ≠ S0 at activation and are
0 px.

**Order.** `lentOrderEqualsRom` compares the lend the harness replays with the ROM's `sSpriteOrder`:
- It equals the ROM in all 21 Dig unleashes, the 4 first setups and the 10 later setups that do not follow Growl + S22.
- It differs in the 7 setups after Growl + S22, and in 24 Return bodies (the harness's `precedingBodies` replay has no prompt cycles),
  yet every one of these is 0 px. In these windows the pixels do not depend on the order beyond what the census's production host
  lends.

**x2 (the one real history).** `liveBattlerX2History.ts`:
- QA 98 is absent from the attacker rows (`:100` fallback `keep`). The ROM zeroes the attacker: ONIX 1 → 0.
- Return 216's target row is `mixed` (`:74` → unknown → the species rest). The ROM zeroes the strong-branch target.
- The tracker's input cannot say "unknown" (`liveMoveBattlerX2Input` keeps only `zeroed`).

So a later body is safe only where the rest is {0,0}. That covers every species except opponent ONIX and RATTATA (the tracker header
lists them as the non-zero rests). This applies to every rest-reading consumer at a later body, not only to Return.

## Patch shape (temporary; `fixtures/prep48/*.diff`, `*.diff -whitespace`)

- `src/engine/liveMoveAnimation.ts:603` (before `liveBattlerAnchors`): `liveBattlersRestFree(art)`, true when both sides'
  species front-idle rest is {0,0}.
- **Dig** `:3105`: `!spriteOrderInput || (unleash ? !afterDigSetup : !firstBody)` →
  `!spriteOrderInput?.known || (!firstBody && !afterDigSetup && !liveBattlersRestFree(art))`. The unleash then lends
  `spriteOrderInput.free`: the tracker's lend after a later setup, `DIG_POST_SETUP_FREE` after a first setup.
- **Return** `:3400`: `!spriteOrderInput?.known || !firstBody` → `!spriteOrderInput?.known || (!firstBody && !liveBattlersRestFree(art))`.

Typecheck is green with `-all`. The full suite was not run (the brief forbids it).

A production fold should:
- reword the case comments (`:3099-3103`, `:3397-3399`) and the `digUnleashLend` / `DIG_POST_SETUP_FREE` doc
  (`liveSpriteOrderHost.ts:482-494`). The constant survives only as the first-setup case. Folding it into the tracker lend is
  possible, since the tracker equals the ROM after a later setup;
- pin the 42 + 36 fixtures (or a subset per side) as Tier-2 receipts;
- add Tier-1 cases: a later setup / unleash and a later Return are live with a known lend, and decline with an ONIX / RATTATA on the
  field.

Fixing the x2 rows (QA attacker → zeroed; Return strong-branch target → zeroed) and adding an `unknown` channel would lift the guard.
That is x2-tracker work, not done here.

## Not reached / caveats

- **The other later-body consumers** (30 commands / 3983 frames): Signal Beam 6 / 869, Sheer Cold 5 / 953, Mach Punch 5 / 550,
  Memento 2 / 357, Extrasensory 4 / 644 (the prep30 scanline split), Sky Attack 2 / 296, Bonemerang 2 / 142, Fury Cutter 4 / 172.
  The gates and histories are listed in `gates-after-all-seeds0-299.json`; none was probed.
- **Predecessor coverage.**
  - Probed predecessors: a damaging body + hit (QA), a status move + stat body (Growl + S22), Splash, the own Dig / Return.
  - Census predecessors not probed: switch-ins, the WISH_HEAL / INGRAIN_HEAL / SANDSTORM_CONTINUES animations, status animations
    (PSN / SLP), Sleep Powder.
  - The pixel argument for Dig (source band rule + blank monbg map + renderer inputs) and for Return (renderer reads only
    body-written registers) does not depend on the predecessor. Only the order lend and the x2 rest do, and both are production
    trackers: the order host's correctness is its own receipts' claim, and x2 is guarded.
- **Reproduction.** Every receipt reproduced byte-identically in a second independent pass:
  - the census receipts in two full `prep48Run.sh` census passes;
  - `probes.json`, `*-check-{before,after}.json` and the 78 fixtures in two probe passes into fresh `OUT` directories.
  - Within each pass every scenario ran twice fresh (20/20 r1 == r2), and every fixture's two fresh check runs agree (78/78).
- An earlier `/tmp/p48` scratch directory collided with a sibling worker's files. Every receipt here comes from the unique scratch
  `/tmp/p48side-031528`.

## Reproduce

    OUT=/tmp/p48-out REC=/tmp/p48-rec sh tools/integration/prep48Run.sh                 # ~15 min; prints same/DIFF per receipt
    OUT=/tmp/p48-out REC=/tmp/p48-rec SKIP_CENSUS=1 sh tools/integration/prep48Run.sh   # probes + pixel checks (~8 min)
    OUT=/tmp/p48-out REC=/tmp/p48-rec2 SKIP_PROBES=1 sh tools/integration/prep48Run.sh  # census x3 + deltas + gates (~6 min; needs $OUT/r1)

Files (`tools/integration/`):
- `prep48OrderCensus.ts` — census instrument.
- `prep48Gates.py`, `prep48Scenarios.py`, `prep48Probe.py`, `prep48Probes.py`, `prep48DigFixtures.py`, `prep48DigCheck.ts`,
  `prep48Run.sh`.
- `prep43CensusDelta.py` — reused, unchanged.

Receipts (`fixtures/prep48/`):
- `census-{before,after-dig,after-all}-seeds0-299.json`, `census-delta-{dig,all}-seeds0-299.json`
- `gates-{before,after-all}-seeds0-299.json`
- `probes.json`
- `{dig,return}-check-{before,after}.json`
- `dig-live/` (42 fixtures), `return-live/` (36), `scenarios/` (20)
- the three `.diff` files

No RGB and no mGBA logs.
