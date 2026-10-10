# Live audit 20 (S10A side lane, 2026-10-10): the live claims of land75 (hist73 Part A / Part B) and st76

**No DEFECT in the audited folds.** Every allocator consumer behind the top-8 hist73 Part A bodies is live, 0 px except one shared
1-row baseline, and gets the ROM's allocator state (218 / 218 windows). Part B's hidden-battler faint is 0 px with the hide equal to
the ROM's (44 / 44). Statused Meteor Mash / Dive bodies, and the consumers after them, are 0 px or TIMING-PHASE / ARTIFACT.

**One latent finding outside the folds:** Return 216's sprite-order plan. The order lent after a Return body differs from the ROM's
on 15 / 15 windows, at the battle entry and after a KO, and is 0 px in every observed window. Details in section 1.3.

Method = live audits 18 / 19 (`audit19Check.ts` header), on master `c68111480` (src `d73cf1af`), unpatched:
- battle-lab scenarios with an explicit lab seed (ISSUES #154);
- one probe to derive the consumer fixtures;
- a check that replays the history through the production hosts as the orchestrator does (order host + plans + words lends,
  allocator, semi-invulnerable hide) and renders the production live view (CHAIN and ENTRY lends) against two more fresh direct-mGBA
  probe processes per scenario (r1 == r2 per-row digests);
- no-unit controls.

audit 20 adds:
- **the allocator against the ROM.** `audit20Probe.py` reads every `gSprites[].inUse` flag per frame, so each body has the slots
  `CreateSprite` gave it in creation order. On the frame before activation it also reads inUse, `gOamMatrixAllocBitmap`,
  `sSpritePaletteTags`, `sSpriteTileRangeTags` (0x80 bytes) and `sSpriteTileAllocBitmap`. `audit20Check.ts` compares production's
  `spriteAllocatorInput` `[wall, ...sparkles]` with the ROM's created slots. It also requires the ROM's pre-activation allocator state
  to equal the battle's entry state, which is the known entry the allocator host assumes while its history is known;
- Fury Cutter's kernel 7th argument (the RAM furyCutterCounter) and `Status_Curse`;
- Part B: the postko fixtures' faint / send-in units, and production's `faint` / `switch-in` hide clear.

No shared oracle was touched. No existing tracked file was edited. Evidence is under `tools/integration/fixtures/audit-20/`.

## 1. Results

### 1.1 Defect table

| Unit -> consumer | Verdict | px (before -> after) | Evidence |
|---|---|---|---|
| hist73 Part A (top 8) -> Barrier / Light Screen / Reflect / Protect / Magic Coat / Mirror Coat | **EXACT** | 0 px on 188 / 190 windows (2 = the consumer's own baseline, below) | allocator input == ROM on 190 / 190 (wall + sparkle slots == the ROM creates, pre-activation inUse / OAM matrices / palette tags / tiles == the entry); order lend == ROM 190 / 190 |
| chains of two Part A bodies (pc) -> Barrier / Magic Coat | **EXACT** | 0 px, 28 / 28 | allocator == ROM 28 / 28; up to 3+ Part A bodies before the window (8 windows at depth 3) |
| Part B: the opponent's Fly / Dig user KO'd **while hidden** by Thunder / Earthquake, then the replacement's Return and the hitter's next body | **EXACT** (px), hide == ROM 44 / 44 | 0 px, 44 / 44 (12 strikes at the hidden user) | `receipts-extra/partb/`. The hidden faint and the visible-KO control give the same production lend and the same ROM order (`controls-lends-pi.txt`) |
| st76: statused Meteor Mash (PRZ) -> Barrier / Light Screen; Meteor Mash bodies | **EXACT** 37, **TIMING-PHASE** 5 | 5 windows 279,376..293,584 px in rows 196..211 only | the 5 residual windows have **no** lag frame (`lag.txt`: lag ages `[]`, 214 rows); the 0 px ones have the lag at age 194 (215 rows), st76's documented lag. ENTRY px == CHAIN px, so the history does not cause it. A D4-class lag phase |
| st76: badly poisoned Dive (setup + attack) -> Barrier / Magic Coat; Dive bodies | **EXACT** 56 (20 with the diver hidden), **TIMING-PHASE** 4, **ARTIFACT** 6, FALLBACK 44 | Dive setup (player diver, first body): 284 px (lag at age 67 / 68) or 17,142 px (no lag) | st76's documented Dive setup CPU phase (`lag.txt`) |
| CHANSEY's Toxic 92 bodies (dv windows, not an audit target) | **ARTIFACT** (checker window alignment) | 42,701 / 40,313 -> **0 / 0** | Toxic's accepted window starts at the first `gToxicBubbleSpriteTemplate` creation (activation + 7; `LIVE_MOVE_OPPONENT_SHADOW_ROW`'s note), not at activation. Ablation `receipts-extra/ablation/check-*-toxic-accepted-start.json` (`denseWindow.ageOffset = -7`) |
| Part B fixture: the Fly setup window, and the replacement's healthbox | **ARTIFACT** (fixture) | 27,133 -> 0 (Fly setup with the move banner); 6,768 / 6,288 -> 0 (replacement drawn with the KO'd lead's gender) | `BattleScriptFirstChargingTurn`'s empty box (as Dive, audit 19). The replacement (party member 2) is female. Ablations `check-pb-fly-wingull-opp-s2-{banner,lead-gender}.json` |
| **Return 216 -> any later body** (latent; Part B windows, visible-KO and entry controls) | **latent order finding** (lend != ROM, 0 px in every observed window). Outside the audited folds | 0 -> 0 px (Thunder / Earthquake do not consume the slots) | Below |

### 1.2 Non-defect notes

- **Light Screen as the battle's first body: one row at age 59**, 2,473 px (player) / 2,658 px (opponent). This also shows on the 2
  pa windows right after Fury Cutter, and on 2 mm windows where it is the first body. The Light Screen box is drawn e6f3da by
  production, e3f1d5 by the ROM: one blend step on a single row. The no-unit control has it too (`=CONTROL` in `verdicts.txt`). It is
  the consumer's own baseline, not caused by a unit. Every other Light Screen window is 0 px.
- **44 player Dive bodies after a player-locked turn: FALLBACK** (fail-closed). Production declines: `classifyPresentationDecline`
  gives "unclassified (branch-local gate)", and the host's tracker is invalid with "no EXACT plan: body 291:player". This is audit 19's
  locked-turn class. The opponent CHANSEY's consumers in the same scenarios stay live, at 0 px and allocator == ROM, including 20 with
  the player's diver hidden.
- **Lab entry order for an ARBOK opponent lead**: the ROM entry free order is `[3, 4, ...]`, the lab known entry `[4, 3, ...]`
  (`pb-dig-arbok` c0 / c1, 0 px). This is the battle-lab entry, which the checker seeds; production's Factory entry is not exercised.
  No verdict.

### 1.3 The Return 216 latent finding (outside land75 / st76)

`receipts-extra/partb/lends-pi.txt` and `controls-lends-pi.txt` compare the lends under the post-KO relabel π
(`docs/postko-consumer-audit.md` §3; π is the identity before a KO).

| Window | Lend == ROM |
|---|---|
| Any body before the KO, with no Return earlier in the history | 23 / 29 (the 6 others are the ARBOK lab entry: c0 / c1 × 3 seeds) |
| The replacement's first body (Return) after the send-in | 15 / 15 (12 after a hidden faint + 3 after a visible faint) |
| **Any body with a Return 216 earlier in the history** | **0 / 15** (8 Part B windows + 7 controls) |

The entry controls (`pb-ret-*`, the 255-friendship replacement as the lead, so Return runs at the entry state) show the same failure:
- production lends the start order unchanged, `[4, 3, 21, 20, 5, ...]`;
- the ROM has `[4, 3, 5, 7, 21, 20, ...]`: the 4 slots Return creates (3, 4, 5, 7) come back ahead of 21 / 20.

**The ROM side is measured.** `reproduce/return216-rom-order.txt` comes from the run-2 probes of the entry controls:
- the ROM's Return body (282 frames) creates **31 sprites** into slots 3 / 4 / 5 / 7;
- it ends with `sSpriteOrder` `[..., 2, 3, 4, 5, 7, 21, 20, ...]`;
- it started from `[..., 2, 4, 3, 21, 20, 5, ...]`.

The mechanism on the production side is unverified: the table entry `"216:*": 117` points at plan `Cf;D0;Cf;D1;Cf;Cf;D2;D3`
(`src/engine/spriteOrderProductionPlans.ts:270`). That plan has 4 creates, not the strongest branch's 31, and it leaves 5 / 7 at
their start positions. The checker passes friendship 70 (audit 19's fixture convention) where the Factory kernel passes 255. Production
keys Return's plan on the move id only, so this does not change the lend. This does not touch land75's claims, because the hidden route and the visible route give identical lends. No temp patch was
tested in the time box. The fix shape: re-measure plan 117 from the entry start, or invalidate after 216 as a fail-closed alternative.
It is 0 px in all 15 windows here. An order-dependent consumer (Shock Wave, Water Pulse, Swift ...) after a Return would expose it.

### 1.4 Coverage (`receipts/verdicts.txt`, `receipts/coverage.txt`, `receipts-extra/partb/`)

| Family (scenarios) | windows | live | 0 px | residual (verdict) | fallback | allocator == ROM | order lend == ROM (live) |
|---|---|---|---|---|---|---|---|
| pa: 8 Part A bodies (Curse in 2 branches = 9 families) × 2 species × 5 consumers + Mirror Coat after Psywave, both sides (94) | 190 | 190 | 188 | 2 Light Screen baseline (=CONTROL) | 0 | 190 / 190 | 190 / 190 |
| pc: chains (SCYTHER Fury Cutter + Silver Wind, CHIMECHO Psywave + Heal Bell) × Barrier / Magic Coat × 2 sides (8) | 28 | 28 | 28 | 0 | 0 | 28 / 28 | 28 / 28 |
| mm: st76 Meteor Mash (METAGROSS / CLEFABLE, PRZ by Thunder Wave) × Barrier / Light Screen × 2 sides (8) | 44 | 44 | 37 | 5 TIMING-PHASE + 2 Light Screen baseline | 0 | 14 / 14 | 44 / 44 |
| dv: st76 Dive (CLAMPERL / SEEL, PSN by Toxic) × Barrier / Magic Coat × 2 sides (8) | 110 | 66 | 56 (20 hidden) | 4 TIMING-PHASE, 6 Toxic ARTIFACT | 44 (locked turn) | 40 / 40 | 16 / 16 resolved, 50 deferred |
| ctl: SNORLAX Snore × 5 consumers × 2 sides (10) | 20 | 20 | 18 | 2 Light Screen baseline | 0 | 20 / 20 | 20 / 20 |
| pb: Part B, WINGULL / TAILLOW Fly <- Thunder, JOLTEON / ARBOK Dig <- Earthquake, 3 seeds each (12) | 44 | 44 | 44 (12 hidden) | 0 | 0 | n/a (no allocator consumer) | Return finding (1.3) |
| **total (140)** | **436** | **392** | **371** | | **44** | **292 / 292** | |

By the Part A body immediately before the consumer, all 0 px (`coverage.txt`):

| Body before the consumer | 0 px windows |
|---|---|
| Fury Cutter, both sides | 13, plus 2 Light Screen baseline (counters 1..3) |
| Psywave (incl. Mirror Coat 9) | 23 |
| Curse, both branches | 24 |
| Feather Dance | 15 |
| Silver Wind | 15 |
| Heal Bell | 16 |
| Sweet Scent | 15 |
| Magnitude (15 windows tagged <= 99) | 15 |

The other 52 pa windows have no Part A body directly before them: 36 entry windows (Protect / Magic Coat at +4 priority, turn 0), and 16
windows directly after the consumer's own previous body (Protect / Barrier / Magic Coat).

By the number of Part A bodies in the history:
- pa: 1 body: 92 windows; 2 bodies: 41; 3 or more: 14;
- pc: 1: 8; 2: 8; 3 or more: 8.

### Not reached

- A **player-side** hidden KO, which goes through the forced party menu. A forced party-menu reshow while the opponent is hidden.
  An end-of-turn KO while hidden. The lab has no HP control, and the player-side faint flow needs its own trace.
- A status inflicted **mid-body** on a target that already has a status displayed.
- The opponent CHANSEY's Toxic / Thunder Wave in dv / mm (the AI chose the walls first). The statused Dive / Meteor Mash windows come
  from the player-CHANSEY side and from the opponent side's later turns.

## 2. Reproducibility

- **Main runner** `audit20Run.sh`:
  - run A (15:03..15:15) produced the committed `receipts/`;
  - run B (fresh dirs, separate batch, 15:15..15:26): derived fixtures == committed, and `audit20Compare.py` gives **identical = 392,
    ROM-drift = 0, DIFFERS = 0**. All 128 check files and all 7 other receipt files are byte-identical
    (`reproduce/runB-vs-committed.txt`).
  - The later checker / derivation edits (Part B hide clear, pb-only faint units, setup text for Fly / Dig / Bounce, the gender of the
    member on the field) leave the main fixtures byte-identical: re-derived and `diff -rq` clean. No main fixture has a faint unit.
  - **Run C of the final code** (fresh dirs, 15:40..15:49, concurrent with `npm test`): **identical = 392, ROM-drift = 0,
    DIFFERS = 0**. The whole receipt dir is byte-identical (`reproduce/runC-vs-committed.txt`).
- **Extra runner** `audit20Extra.sh`: run 1 produced `receipts-extra/`. Run 2 (fresh dirs, 15:40..15:44) gives **identical = 44**,
  and the whole receipt dir is byte-identical: partb, ablations, `lag.txt`, the controls and π (`reproduce/extra-run2-vs-committed.txt`).
- No ROM drift was seen between batches.

Gates (evidence only):
- `npm test`: 1,610 files / 13,235 tests passed, 44 files / 223 tests skipped, 0 failed;
- `npm run build`: green;
- `git diff --check c68111480..HEAD`: clean;
- every change since `c68111480` is an added file in the audit20 set (755 files), with no existing tracked file modified.
- No TypeScript was added under `tests/`; `tools/` is outside the `tsc` include.

## 3. Reproduction (from workspace/; direct mGBA only; production src is never patched)

```
sh tools/integration/audit20Run.sh <fresh-receipt-dir> <fresh-scratch-dir>    # ~12 min: stage == committed -> probe -> derive == committed
    # -> check (2 fresh probes / scenario) -> summary / verdicts -> alloc.txt / lends.txt -> coverage -> audit20Compare.py vs receipts/
sh tools/integration/audit20Extra.sh <fresh-receipt-dir> <fresh-scratch-dir>  # ~4 min: Part B (stage / probe / derive / check), ablations,
    # lag counters (issue151Counters.sh), order-lend controls + pi, compare vs receipts-extra/
AUDIT20_ALLOC_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts tools/integration/fixtures/audit-20/fixtures pa-pw-spoink-mirror-coat-ply /dev/null
node --experimental-strip-types --no-warnings tools/integration/audit20Check.ts tools/integration/fixtures/audit-20/partb/fixtures pb-fly-wingull-opp-s2 <out.json>
```

Tools:
- `audit20Stage.py`, `audit20PartBStage.py` (scenarios);
- `audit20Probe.py` / `audit20Probes.py`;
- `audit20Fixtures.py`, `audit20Check.ts`;
- `audit20Summary.py`, `audit20Verdicts.py`, `audit20Coverage.py`, `audit20Compare.py`, `audit20LendsPi.py`;
- `audit20Run.sh`, `audit20Extra.sh`.

Fixtures:
- `scenarios/` (128), `fixtures/` (392);
- `partb/scenarios/` (12), `partb/fixtures/` (44).

Receipts:
- `receipts/`: `check/`, `summary.txt`, `verdicts.txt`, `coverage.txt`, `alloc.txt`, `lends.txt`, `derive.txt`;
- `receipts-extra/`: `partb/`, `ablation/`, `lag.txt`, `controls-*`.

No RGB dumps. There is no `.diff` patch: no production DEFECT needed one. `.gitattributes` carries `*.diff -whitespace` for
consistency.
