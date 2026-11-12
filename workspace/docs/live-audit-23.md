# Live audit 23 (S10A side lane, 2026-10-11): the live claims of ctl95, doll90, land96 and fury99

**No production DEFECT found, so there is no temp patch.** Every live claim of tonight's last batch audited here is 0 px on every row
of its accepted window: other species, both sides where live, first and later bodies, and after the intervening bodies and switches the
folds did not stage. The non-zero windows are one fixture **ARTIFACT** class per family, each closed by an ablation (below), one
unchanged **DECLINE**, and two classes that are not claims.

| fold | claim audited | windows (CHAIN, r1 == r2) | result |
|---|---|---|---|
| ctl95 | GrassWhistle 320: restore blend 2 rows after the last on-screen note + the elevated opponent's shadow rows 221..224 | 10 | **10 / 10 0 px** (225 rows each) |
| ctl95 | Iron Tail 231: the metal band masked by the attacker from the first step | 6 | **6 / 6 0 px** |
| ctl95 | Recover 105 doll cell, both sides | 8 swap composites | **8 / 8 0 px**, incl. 2 later bodies after the swap-back |
| doll90 | Psych Up 244 doll cells (both sides) | 4 doll tests + 4 controls | **8 / 8 0 px** |
| doll90 | Double Team 104 self-target swap cell | 9 swap composites | **9 / 9 0 px**, incl. 5 later bodies after the swap-back |
| doll90 | Sing 47 opponent (note-geometry body length) | 4 swap composites | **4 / 4 0 px** (body 235 vs 244 rows by pair), 2 later bodies |
| land96 | Memento 262 later bodies (scanline history) | 4 | **4 / 4 0 px**: after an Extrasensory (both sides) and after Growl / Swift |
| fury99 | Fury Cutter 210 counters 2..5 at later bodies | 14 live at counters 2..5 (+ 3 at counter 1) | **16 / 16 live windows 0 px** after the level ablation; 1 DECLINE (unchanged counter-1 rest rule) |

Method:
- Base: the FIXED master `853642606` (tonight's folds merged; src tree `47b5b0c8`), as a git-archive copy inside the scratch dir.
  Production src is unpatched.
- Direct mGBA only. A lab seed is pinned in every scenario (ISSUES #154): `305420351` for the chain labs, `305419897` for the doll labs.
- **Every window is the production ACCEPTED window** (`audit23Align.py`, audit21Align / audit22Align's method):
  - GrassWhistle runs 225 rows from the activation. The probe body is 220 rows, so the shadow-return rows 221..224 need ROM frames past
    the body: `audit23Probe.py` is audit20Probe.py with an 8-frame RGB tail (was 3).
  - Iron Tail (135), Fury Cutter (43) and Memento (the reducer length, the first inactive row included) ARE the probe body window.
  - Double Team's plain bodies are framed at activation + 1 (dt60 / audit 22).
  - The doll composites use production's own `LIVE_SUBSTITUTE_SWAP_BODY_FRAMING` (attdollLiveCheck.ts).
- **The RAM-read party personality is fed** wherever a renderer reads it:
  - chain fixtures: `attackerPersonality` from `gBattleMons` at activation;
  - doll labs: `doll90Personality.py` (twice, r1 == r2) -> `attdollLiveCheck.ts --personalities`.
- The chain check is live audits 19..22's (`audit23Check.ts` = audit22Check.ts + two changes):
  - the history is replayed through the production hosts as the orchestrator does;
  - CHAIN = the production lend (the claim); ENTRY = the no-history control (the last unit only);
  - rendered against two more fresh probe processes, with r1 == r2 per-row digests on every window.
  - Change 1: the check probes are `audit23Probe.py`.
  - Change 2: **the consumer request is the orchestrator's**: `battleMoveAnimationRequest(battler, target, arguments)` of the consumer's
    own kernel event, which includes Fury Cutter's 7th argument (`rolloutCounter`).
    - audit20Fixtures.py writes only turn / target / power.
    - Ablation `AUDIT23_FIXTURE_REQUEST=1`: every counter-2..5 window declines (section 1.2).
- The doll cells use doll90 / ctl95's instruments:
  - `speciesAudit14SwapCheck.ts` (attdollLiveCheck.ts) for the swap composites, with tail rows k+1 / k+2;
  - `prep38Check.ts` for the Psych Up doll tests at the control's shift.
- No existing tracked file was edited.

## 1. Results

### 1.1 Defect / verdict table

| Window / unit | Verdict | px before -> after (ablation) | Evidence (`tools/integration/fixtures/audit-23/`) |
|---|---|---|---|
| Fury Cutter SANDSLASH -> L16 CLEFFA: counter 1 (first body) and counter 2 | **ARTIFACT** (fixture: no level) | 1,419 / 1,419 -> **0 / 0** | `summary-m-check.txt` -> `summary-m-level.txt` (`audit22Level.py`). 33 px on every row 0..42, all in bbox x 89..98, y 21..28: the opponent healthbox's level digits. audit20Fixtures.py writes no `opponentLevel`, so the L16 target renders "Lv50" (audit 22's class). The counter-3..5 windows at the L50 send-out MILTANK are 0 px raw |
| Fury Cutter SCIZOR -> RATTATA, counter 1 (the cutter's first body; RATTATA = front idle rest x2 1) | DECLINE (fail-closed; not a claim) | n/a (fallback 12,648 px) | `unclassified (case-local gate)`: fury99's unchanged first-body / counter-1 species-rest rule (its ONIX first body declines the same way) |
| Double Team opponent plain (doll-free) first bodies in the doll labs: SNEASEL -> MAGCARGO, elevated YANMA -> SNORLAX | **ARTIFACT** (window alignment) | attdoll 233,602 / 244,928; `ctl95ControlCheck --shift=0` 269,791 / 288,808 -> **0 / 0 at `--shift=1`** (230 / 230 rows) | `d/dt-plain-shift{0,1}.txt`. attdollLiveCheck frames a plain body at the activation. Production's accepted framing is activation + 1 (dt60 `AGE_OFFSET {104: -1}`, audit 22 section 1.2). The elevated YANMA attacker's row 0 is exact at shift 1 too |
| Doll composites' tail row k+1 (the NEXT command's first row, outside the composite) = 200 px: player attackers with an elevated opponent foe (TAUROS -> YANMA Double Team x3, MILTANK -> AERODACTYL Recover x4) | not a claim (pre-existing tail class) | 200 (production latch; 800 without it) | doll90 section 1 "Tail": its GENGAR -> GOLBAT player cell had the same 200 px. **New: it follows the elevated foe, not GENGAR.** Every other player-attacker composite (SNEASEL -> MAGCARGO x3, GIRAFARIG -> MAGCARGO) has k+1 = 0. 200 px is the elevated opponent's shadow size (ctl95: "200 px/row"). Not measured by bbox here |
| Sandstorm 201 plain windows of the foe in the `-sandstorm` Recover labs | not a claim; not classified | 259,163..428,271 | attdollLiveCheck lists every plain body of the trace. Sandstorm is not one of tonight's folds and these windows are `presented false`. The labs exist only to make later Recovers play behind the doll |

### 1.2 The claims, per fold

- **ctl95 GrassWhistle** (`m/gw-restore.txt`, `audit23GwRestore.ts`). The restore blend's first colour steps (BG(5,5), restore start + 6 /
  + 12, from the production render, whose every row is the ROM's here):

  | pair | restore steps | the per-side constant it replaced |
  |---|---|---|
  | opponent BUTTERFREE (elevated attacker) -> SNORLAX | **159 / 165** | 172 / 178 |
  | opponent PICHU -> STEELIX | 172 / 178 | 172 / 178 |
  | player PICHU -> KANGASKHAN | 169 / 175 | 169 / 175 |
  | player SNORLAX -> AERODACTYL (elevated target) | 169 / 175 | 169 / 175 |

  - BUTTERFREE's restore is 13 rows before the old opponent constant, and all 225 rows are 0 px on all 3 of its bodies (first + 2
    later). This is the position-dependent restore at work, on a species ctl95 never probed.
  - The two elevated-opponent pairs are exact on rows 221..224, the shadow-return rows.
  - The player side stays at the constant, as ctl95's scan predicts (player 160..161).
- **ctl95 Iron Tail**: opponent PICHU (small) -> SNORLAX x4 bodies; player STEELIX (big) -> PIDGEOT (elevated target) x2 bodies. All 135
  rows 0 px.
- **land96 Memento later bodies**: each is a later body.
  - After an Extrasensory: opponent MISDREAVUS (elevated; its first Memento turn was lost to a flinch, so two Extrasensory bodies
    precede it) and player DROWZEE (after XATU's Extrasensory).
  - After a non-scanline body: opponent MURKROW after RAICHU's Growl + stat-down; player HOUNDOUR after JOLTEON's Swift.
  - 179..182 rows, all 0 px.
  - The ENTRY control is also 0 px. Its one-unit history is a first body, so it does not discriminate here.
- **fury99 Fury Cutter**, counters from the RAM `furyCutterCounter`:
  - **PINSIR (opponent) -> SNORLAX, Extrasensory between every pair**: counters 1..5, 5 / 5 0 px. The counter, the slice direction and the
    blend survive an intervening scanline body.
  - **SCIZOR -> RATTATA (idle rest), Tackle ON the cutter between every pair**:
    - counters 2 / 3 / 4 at RATTATA: 0 px CHAIN, while **the ENTRY control declines** (69,034 / 151,375 / 151,308 px fallback). That is
      fury99's "rest zeroed by the previous hit" working through the history, and it survives the Tackle's shake of the cutter itself.
    - RATTATA is then KO'd: counter 5 at the send-out EXPLOUD (**after a switch**) and the capped counter 5 again: 0 px.
  - **SANDSLASH -> CLEFFA (L16), Growl + stat-down between**: CLEFFA is KO'd at counter 2. Counters 3 / 4 / 5 / 5 at the send-out MILTANK
    (after the switch) are 0 px. The CLEFFA windows are the level ARTIFACT above.
  - Ablation `AUDIT23_FIXTURE_REQUEST=1` (`summary-m-fixreq.txt`): without the orchestrator's 7th argument every counter-2..5 window
    declines (`unclassified (case-local gate)`, 68,009..160,211 px fallback). So the check exercises the counter payload, as the
    orchestrator does.
- **Doll cells** (`summary-doll.tsv`; personalities from RAM, every probe r1 == r2):
  - Psych Up (def):
    - player RAICHU -> STEELIX (big doll) and HITMONTOP -> BUTTERFREE (elevated doll);
    - opponent ESPEON -> SNORLAX and elevated YANMA -> PICHU;
    - controls and doll tests 179 rows, 0 / 0.
  - Double Team (self), 240 / 244-row composites:
    - player SNEASEL -> MAGCARGO (3 swaps), player TAUROS -> YANMA (3 swaps);
    - opponent SNEASEL -> MAGCARGO (2), opponent elevated YANMA -> SNORLAX (1);
    - all 0 / 0.
  - Sing opponent, geometry-derived body: JIGGLYPUFF -> WOBBUFFET (body 244, composite 326 rows) and elevated BUTTERFREE -> PICHU (body
    235, 317 rows). 2 swaps each (first + after the swap-back), 0 / 0.
  - Recover (self, `{184, -10}` framing):
    - player MILTANK -> AERODACTYL, GIRAFARIG -> MAGCARGO; opponent AERODACTYL -> MAGCARGO, RAICHU -> SNORLAX: 265 / 269 rows, 0 / 0;
    - **later bodies after the swap-back**: the `-sandstorm` labs. MILTANK has 3 swaps, the 2nd and 3rd after a swap-back. RAICHU ->
      STEELIX has 1, after three Sandstorm bodies. All 0 / 0.

### 1.3 Coverage (every window r1 == r2)

| Family | scenarios | windows | live | 0 px | verdicts |
|---|---|---|---|---|---|
| gw: GrassWhistle 320 (opp elevated BUTTERFREE -> SNORLAX big, opp PICHU small -> STEELIX big, ply PICHU -> KANGASKHAN, ply SNORLAX -> elevated AERODACTYL), first + later bodies after Splash / Status_Sleep units | 4 | 10 | 10 | **10** | EXACT 10 |
| it: Iron Tail 231 (opp PICHU -> SNORLAX, ply STEELIX -> elevated PIDGEOT), first + later bodies | 2 | 6 | 6 | **6** | EXACT 6 |
| fc: Fury Cutter 210 counters 1..5, Extrasensory / Tackle-on-the-cutter / Growl between, 2 target switches | 3 | 17 | 16 | raw 14 / **level 16** | EXACT 14; ARTIFACT 2 (level); DECLINE 1 |
| mm: Memento 262 later bodies after Extrasensory (both sides) / Growl / Swift | 4 | 4 | 4 | **4** | EXACT 4 |
| doll Psych Up 244 (def): controls + doll tests | 4 | 8 | 8 | **8** | EXACT 8 |
| doll Double Team 104 (self): swap composites (+ 2 plain first bodies) | 4 | 9 (+2) | 9 | **9** (+2 at shift 1) | EXACT 9; ARTIFACT 2 (alignment, plain) |
| doll Sing 47 opponent: swap composites | 2 | 4 | 4 | **4** | EXACT 4 |
| doll Recover 105 (self): swap composites | 6 | 8 | 8 | **8** | EXACT 8 |
| **total** | 29 | **66** (+2 plain) | **65** | **63 raw / 65 after the ablations** | DEFECT 0; ARTIFACT 4 (level 2, alignment 2); DECLINE 1; not-a-claim: k+1 tails, Sandstorm plain windows |

## 2. Method / files

- Stage:
  - `audit23Stage.py`: the gw / it / fc / mm labs on audit 22's base (audit 20 Part B `pb-fly-wingull-opp-s2`; `pb-` = every body
    windowed). The trace is extended to 3 / 4 / 7 / 8 turns.
  - `audit23DollStage.py`: species-substituted doll81 labs (doll81's traces). Species are internal ids, all < 252. EV totals <= 510.
- Staging lessons, kept as notes in the stage tools:
  - Extrasensory does not affect a Dark-type Memento user (no body). MISDREAVUS / DROWZEE replace MURKROW / UMBREON on the Extrasensory
    routes.
  - A Static PICHU paralysed the cutter and reset its chain. The KO'd target is a L16 CLEFFA.
  - SNORLAX's Tackle broke JIGGLYPUFF's doll every turn, so no Sing played behind it. The foe is WOBBUFFET.
  - The doll81 Recover trace's later Recovers fail at full HP. The `-sandstorm` labs fix that.
- Probe -> fixtures -> windows -> checks:
  - `audit23Probes.py` / `audit23Probe.py`, then `audit20Fixtures.py`, then `audit23Align.py --moves=...` (the accepted windows; the
    folds' moves only; Splash 150 has no adapter), then `audit22Level.py`.
  - `audit23Check.ts`, then `audit22Summary.py`.
  - `audit23GwRestore.ts`.
- Doll cells:
  - probes: prep40Probe.py / prep38Probe.py, twice;
  - `doll90Personality.py`, twice;
  - checks: `speciesAudit14SwapCheck.ts --personalities`, `audit23DollDefFixtures.py` + `prep38Check.ts`, `ctl95ControlCheck.ts`;
  - summary: `doll90Summary.py`.

## 3. Not reached / limits

- The Recover-opponent AI (RAICHU) played one Recover behind the doll. The after-swap-back Recover evidence is the player MILTANK
  (swaps 2 and 3).
- Psych Up's doll test is prep38's first body on the displayed doll. The def family has no swap-back (the doll stays), so it has no
  "after the swap-back" body.
- An attacker switch (which resets the counter in RAM) was not staged. Both switches here are TARGET switches, which leave the counter alive.
- GrassWhistle's player-side restore stays at the constant for every species (ctl95's scan: 160..161), so the player pairs exercise the
  shadow and the note geometry, not a moved restore.
- The k+1 tail's elevated-foe attribution is a correlation over 7 + 4 windows plus doll90's GENGAR -> GOLBAT. It is not measured by bbox.

## 4. Reproduction (from workspace/; direct mGBA only, ~5 min)

```
sh tools/integration/audit23Run.sh <fresh-receipt-dir> <fresh-scratch-dir>
# -> stages, probes, derives, aligns, checks inside a git-archive copy of 853642606 under <fresh-scratch-dir>/tree/workspace (relative
#    output root a23/), then compares every receipt / fixture / scenario byte-for-byte with tools/integration/fixtures/audit-23/
#    ("receipts: N same, M DIFF"; per file in <fresh-scratch-dir>/compare.txt). Both dirs INSIDE the repo; nothing is deleted.
python3 tools/integration/audit22Summary.py tools/integration/fixtures/audit-23/m/check      # any m/ check dir
python3 tools/integration/doll90Summary.py tools/integration/fixtures/audit-23/d/rec
node --experimental-strip-types --no-warnings tools/integration/audit23GwRestore.ts tools/integration/fixtures/audit-23/fixtures/chk
```

The runner leaves the probes' doll RGB frames (~0.5 GB) in `<fresh-scratch-dir>/tree/workspace/a23/d/probes`. Delete that dir once the
comparison is read.

## 5. Gates

- **Run B** (`audit23Run.sh` into fresh dirs, after run A' was committed as `f397f23ae`): **142 same, 0 DIFF**. That covers every check
  JSON, summary, derive log, GrassWhistle restore rows, doll receipt / personality / Psych Up fixture and scenario.
  - All window checks have r1 == r2, and the doll probes are 16 / 16 r1 == r2 in both runs.
  - No ROM drift (ISSUES #154). Every exploratory receipt (before the runner) agrees with run A' on the same windows.
  - Run A (the first runner invocation) died with a shell syntax error: the runner file was edited while `sh` was still reading it. It
    left no receipts; A' / B are clean runs of the committed runner.
- `npm test`, in a git-archive copy of `17d20b641` (this audit's tools; the receipts / doc commits change no code) inside the scratch dir,
  three foreground `--shard` runs: **1,624 files / 13,343 tests passed** (44 / 223 skipped).
  - The copy needs a git history: `tests/appDifferential.test.ts` resolves `HEAD` / `HEAD^`. With only `git init`, it failed 2 guard
    tests ("fatal: Needed a single revision"); after two scratch commits in the copy, it passes (shard 2 rerun in full).
  - `npm run build` in the same copy: green (exit 0; only vite's usual chunk-size warning).
  - Final-HEAD rerun, a fresh git-archive copy of `8917636f3` (tools + receipts + this doc) with the same two scratch commits: **1,624 files /
    13,343 tests passed** (44 / 223 skipped) in three foreground shards; `npm run build` exit 0.
- `git diff --check 853642606` is clean. `tools/integration/fixtures/audit-23/.gitattributes` (plans69's `*.diff -whitespace`) also keeps
  `d/dt-plain-shift*.txt -whitespace`: ctl95ControlCheck.ts prints `bad ` with a trailing space, and the receipt stays byte-for-byte. There is no
  `.diff` (no temp patch).
- `git status --short` listed only this audit's new files at every commit; paths were staged explicitly. No existing tracked file was
  edited.
