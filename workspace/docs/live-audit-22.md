# Live audit 22 (S10A main lane, 2026-10-10): the live claims of ret88 (ReturnWeak), land87 (words-occupancy reseed) and land86 (Flatter after a Flatter)

**No production DEFECT found, so there is no temp patch.** ret88's Double Team flag is an **ARTIFACT**: the checker's window alignment, not
the clone phase and not the fixture's personality.
- ret88's 5 windows measured 316,986 / 316,702 / 340,691 px (x 3).
- `audit20Fixtures.py` writes no `ageOffset`. Production's accepted Double Team framing is **age 0 = ROM activation + 1**
  (`dt60Fixtures.py:40` `AGE_OFFSET {104: -1}`; `liveMoveAnimation.ts:451-452` at 9df9b234a).
- Aligned, all 5 windows are **0 px**.
- The census's newly live Double Team users (PONYTA player, BLISSEY opponent) were measured on both sides after a ReturnWeak. Raw: 12 / 12
  non-zero. Aligned: 12 / 12 0 px on the accepted rows.

Every other live claim audited is 0 px on its accepted rows:
- ReturnWeak bodies with other species: 35 / 35 live windows, including the idle-rest RATTATA as the target at its first body.
- Swift / Shock Wave / Water Pulse after a ReturnWeak: 15 / 15.
- land87 reseed routes with other species, including the Flatter route and **two KOs in one pending chain** (the host reseeds twice):
  17 / 17 after a fixture-level ablation.
- land86 Flatter after a Flatter in the census routes' shape: 11 / 11.

Method:
- Base: the FIXED master `9df9b234a`, as a git-archive copy inside the scratch dir. Production src is unpatched.
- Direct mGBA only. Lab seeds are pinned in every scenario (ISSUES #154).
- The check is live audits 19-21's: the history is replayed through the production hosts as the orchestrator does, and the production live
  view (CHAIN lend = the claim; ENTRY = the no-history control) is rendered against two more fresh probe processes, with r1 == r2 per-row
  digests on **every** window.
- No existing tracked file was edited.
- The runner's second run (run B) into fresh dirs reproduced every receipt byte-identically (section 5).

## 1. Results

### 1.1 Defect / verdict table

| Window / unit | Verdict | px before -> after (ablation) | Evidence (`tools/integration/fixtures/audit-22/`) |
|---|---|---|---|
| ret88's Double Team 104 consumer windows after a ReturnWeak (AMPHAROS player c1 / c2, SNORLAX opponent c1 / c3 / c5) | **ARTIFACT** (window alignment) | 316,986 / 316,702 / 340,691 x 3 -> **0** (5 / 5) | `summary-ret88-dt-raw.txt` -> `summary-ret88-dt-aligned.txt` (`audit22Align.py`: `ageOffset -1`) |
| Double Team after a ReturnWeak, the census users PONYTA and BLISSEY on both sides (player natures 3 / 5), first + later bodies | **ARTIFACT** (same) | 199,942..302,074 -> **0** on 12 / 12 (3 keep 1 row, next line) | `summary-a22-raw.txt` -> `summary-a22-aligned.txt` |
| PONYTA (player) -> PIDGEOT (elevated opponent) Double Team: the activation frame (aligned age -1) | **ARTIFACT** (window edge, ISSUES #142 convention) | 200 px on 1 row, 3 windows | Rows 0..157 are 0 px. The ROM still shows the elevated opponent's shadow on its activation frame (`SpriteCB_EnemyShadow` hides it one frame after `gAnimScriptActive`). Production gives that frame to the preceding message command: `LIVE_MOVE_OPPONENT_SHADOW_ROW` "Double Team (104): the first window row is one frame after the activation (row -1): no row" |
| land87 reseed, TWO KOs in one pending chain (Sand-Attack / Rain Dance / Flatter; Swift after the first send-out; Protect / Reflect after the second) | **ARTIFACT** (fixture: no level) | 2,528 / 2,964 / 5,412 -> **0** (8 / 8) | `summary-reseed-raw.txt` -> `summary-reseed-level.txt` (`audit22Level.py`). Every residual row is the opponent healthbox's level digits (x 89..98, y 21..28). `reseed85Fixtures.py` writes no `opponentLevel`, so a L12..18 send-out renders "Lv50" |
| land86 Flatter windows: audit20Check's allocator comparison `alloc=1!` | not a pixel claim: the comparator does not apply | px 0 | audit 20's comparator assumes `[wall, ...sparkles]`; Flatter's input has no wall (-1). The ROM pre-activation allocator state equals the entry state; 0 px |
| ReturnWeak with RATTATA (the only non-ONIX idle-rest species): 5 bodies at it after its own Splash body, 1 later body by it | DECLINE (fail-closed fallback; not a live claim) | n/a | `unclassified (case-local gate)`: ret88's later-body rest gate class (ONIX). ENTRY control: 0 px at RATTATA, 30,720 px on the attacker's later body, so the gate is right to decline there. RATTATA's true FIRST body as the target (`ply-crobat-rattata-c0`: the faster CROBAT's Return comes before RATTATA acts) and as the attacker (`opp-rattata-pichu-c0`) are **live, 0 px** |

### 1.2 The Double Team flag (target 1)

- **It is a one-frame offset of the whole window.** Production renders live age `a`; the checker compares it with the ROM frame at
  activation + `a`. Against ROM activation + `a` + 1 instead, the residual is **0 px on every row 0..157** (ret88 ply c1, full dumps).
  Every other offset leaves >= 338,344 px.
  - The ROM's duplicate-frame pattern is the live one shifted by one.
  - The clones appear one frame later (ROM age 3 vs live 2) and vanish one frame later (131 vs 130).
- **It is not the clone phase.** The RAM probe (`dt60Probe.py`, `ret88-dt/rom-data3.jsonl`) reads the attacker battler sprite's `data[3]`
  before each activation and the clones' `data[0]` / `data[3]` after their first callback:
  - AMPHAROS (player, personality 2349015557, nature 7): `data[3] = 1`, clones `1 / 0` (one call ahead);
  - SNORLAX (opponent): `data[3] = 0`, clones `0 / 1`.
  - Production's step counter on the same fixtures is 1 / 0 (`audit22StepCounter.ts`, `ret88-dt/production-step-counter.jsonl`). The
    fixtures already carry the ROM personality (`attackerPersonality` from `gBattleMons`), so the fixture side is not the cause either.
- **Why ret88 read "rows 2..57":** audit20Check keeps only the first 40 `residualRows`. The residual actually covers rows 2..129 / 130,
  the whole clone lifetime. `audit22Check.ts` keeps every row and its bbox.
- **Why the base tree's ENTRY control showed the same px:** it renders the same misaligned window.
- **Census effect: none.** ret88's newly live Ponyta x 2 (player, census seed 487) and Blissey x 4 (opponent, seed 978) are the classes
  measured above:
  - PONYTA player: step counter >= 1 for every nature;
  - PONYTA opponent: 0;
  - BLISSEY opponent: 120.
  - All are 0 px aligned, on both sides, after a ReturnWeak.
- **ENTRY vs CHAIN on later bodies.** The aligned ENTRY (no-history) control is non-zero on later bodies: 31,028..79,107 px. That is the
  clone tie order (dt60 section 4's class). The CHAIN lend, which is production, is 0 px.
- Fix shape (tools only, not production): `audit20Fixtures.py` should carry dt60's `AGE_OFFSET {104: -1}`, or name the accepted window
  the way audit21Align / audit22Align do. Audit 21 hit the same trap for Ember / Flamethrower / Scary Face.

### 1.3 Coverage (`summary-*.txt`; every window r1 == r2)

| Family | scenarios | windows | live | 0 px (CHAIN) | verdicts |
|---|---|---|---|---|---|
| ret88 DT (ret88's own `pb-ret88-{opp,ply}-double-team`) | 2 | 5 | 5 | raw 0 / **aligned 5** | ARTIFACT 5 (alignment) |
| dt: Double Team after a ReturnWeak: PONYTA (player n3 / opponent), BLISSEY (player n5 / opponent); Return users PIDGEOT / LAPRAS | 4 | 12 | 12 | raw 0 / **aligned 9** + 3 with only the age -1 row | ARTIFACT 12 (alignment); 3 window-edge rows (ISSUES #142) |
| ReturnWeak BODIES (every Return body of the 16 audit-22 lab scenarios, i.e. the dt / dc ones too): attackers EXPLOUD, LAPRAS, PIDGEOT, SNORLAX (big), STEELIX (big), PICHU (small), CROBAT (elevated attacker), RATTATA (idle rest); targets incl. RATTATA (idle rest, first body via CROBAT), PICHU (small), CROBAT (elevated opponent), STEELIX / SNORLAX (big), RATTATA (idle rest); first + later bodies, both sides | (17) | 41 | 35 | **35** | EXACT 35; DECLINE 6 (RATTATA, 1.1) |
| dc: Swift 129 / Shock Wave 351 / Water Pulse 352 after a ReturnWeak (ret88's two shapes) | 6 | 15 | 15 | **15** | EXACT 15 (first + later bodies, both sides) |
| reseed: land87 routes with other species: Sand-Attack / Mud-Slap / Rain Dance (+ RAIN_CONTINUES) / **Flatter** by SPEAROW / PSYDUCK / PIDGEY, KO by SLOWPOKE's Swift (Own Tempo on the Flatter routes), send-out CHANSEY / MR_MIME / PIDGEY / PSYDUCK / SPEAROW; consumers Protect / Reflect / Light Screen / Swift, both sides | 9 | 17 | 17 | raw 9 / **level 17** | EXACT 9; ARTIFACT 8 (level) -> 0. **5 windows reseed TWICE** (`reseeds [true, true]`: two KOs in one pending Sand-Attack / Rain Dance / Flatter chain) |
| ff: Flatter after a Flatter, census shapes (735: player NIDORINO vs WOBBUFFET, Mud-Slap / Safeguard between; 936: opponent NIDORINO vs TOGETIC, Wish / Follow Me between) | 2 | 11 | 11 | **11** | EXACT 11. Flatter later bodies c3 / c4 (735) and c2 / c3 / c5 (936) take deferred lends (`order=1d`), Mud-Slap / Safeguard / Follow Me consumers included |
| **total** | 30 | **101** | **95** | **95 on the accepted rows** (92 every row) | DEFECT 0; ARTIFACT 25 (alignment 17, level 8); window-edge 3 rows; DECLINE 6 |

Census replay (target 4): `liveShareCensus.ts --seeds=735..735 --index-from=735` (streak 0) and `936` (streak 6) on the base. Every
command is live:
- battle 735 has 7 player NIDORINO Flatters (commands 5 / 11 / 16 / 23 / 29 / 35 / 41), each after a Mud-Slap / Safeguard / Rollout;
- battle 936 has the opponent's Flatter at 16 and again at 19, with the player's Wish / Follow Me in between.

The ff lab scenarios stage exactly these two shapes. They are a replay of the shape, not of the census battle's own ROM run; census battles
have no ROM staging.

## 2. Method

- Scenarios:
  - `audit22Stage.py`: the dt / rw / dc families, on ret88ConsumerStage.py's base (audit 20 Part B `pb-fly-wingull-opp-s2`). Lab seed
    305420351; every Return at friendship 0.
  - `audit22FlatterStage.py`: ff, same base.
  - `audit22ReseedProbe.py`: reseed85's words57 machinery. Lab seed 305419897; win A / B in one batch, 9 / 9 A == B.
  - Ids are internal ids. Every species chosen here is < 252, where internal = national; EXPLOUD 372 and the benches come from ret88's base.
    ret88's doc calls its Return user "Shelgon 372", but internal 372 is EXPLOUD (the fixtures' species). EV totals <= 510.
  - The two-KO routes use three DISTINCT opponent species. The fixture derivation detects a KO by a species change, and a first try with
    3 x PSYDUCK hid the second KO.
- Probes and fixtures:
  - `audit20Probes.py` (a crashed probe is rerun once), then `audit20Fixtures.py` and `ret88Rekey.py` (consumers; `--returns` for the
    ReturnWeak bodies at the staged friendship 0).
  - `audit22Align.py` (Double Team `ageOffset -1`; audit 21's Ember / Flamethrower / Scary Face windows).
  - `audit22ReseedFixtures.py` (= reseed85Fixtures.py with a scenario-dir argument), then `audit22Level.py` (the level ablation).
- Checks:
  - `audit22Check.ts`: audit20Check.ts plus untruncated residual rows, per-row bboxes, aligned-window body matching and an optional PPM
    dump.
  - `reseed85Check.ts`: allocator reseeds and the d3 words.
  - Both render production's `renderBattleResolutionLiveView` against two fresh direct-mGBA probe processes per scenario.
- Splash 150 (the rw targets' filler move) has no live adapter, so its windows are not claims and are not checked.

## 3. Not reached / limits

- No ROM staging of the census battles themselves: target 4 replays 735 / 936 through the production orchestrator (status per command)
  and checks pixels on lab routes of the same shape.
- Beyond its first body, a ReturnWeak at the idle-rest RATTATA is a fail-closed decline (ret88's ONIX gate class), so there is no
  later-body RATTATA claim to audit.
- In `a22rs-ko2-ms-opp-spearow-chansey-protect`, the Factory AI sent CHANSEY after the first KO, so it is a single-KO route (still 0 px).
  The two-KO routes are the `ko2-sa` / `ko2-rd` player-consumer routes.
- Only ReturnWeak (power level 0, the kernel's friendship) is reachable. ret88's Strong / Medium remainder is unchanged.

## 4. Reproduction (from workspace/; direct mGBA only, ~4 min)

The runner leaves ~4-6 GB in `<fresh-scratch-dir>`: the base copy plus the probes' RGB frames (`tree/workspace/a22/rs/rgb-*`). Delete
that dir once the comparison is read; the runner never deletes anything itself.

```
sh tools/integration/audit22Run.sh <fresh-receipt-dir> <fresh-scratch-dir>
# -> stages, probes, derives, aligns, checks inside a git-archive copy of 9df9b234a under <fresh-scratch-dir>/tree/workspace (relative
#    output root a22/), then compares every receipt / fixture / scenario byte-for-byte with tools/integration/fixtures/audit-22/
#    ("receipts: N same, M DIFF"; per file in <fresh-scratch-dir>/compare.txt).
python3 tools/integration/audit22Summary.py tools/integration/fixtures/audit-22/a22/aligned        # any check dir
AUDIT22_DUMP=<dir> AUDIT22_DUMP_AGES=2,40 node --experimental-strip-types --no-warnings tools/integration/audit22Check.ts \
  <fixture-dir> pb-ret88-ply-double-team <out.json>                                             # frame dumps (run in the base copy)
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=936..936 --index-from=936 --out=r.json --commands=c.jsonl
```

Run A'' of the runner (run A + the Flatter reseed routes + CROBAT -> RATTATA) is the committed receipt set; every exploratory receipt was byte-identical to it. Run B into fresh dirs:
see section 5.

## 5. Gates

- **Run B** (`audit22Run.sh` into fresh dirs, after run A'' was committed): **291 same, 0 DIFF**. That covers every check JSON, summary,
  derive / rekey log, RAM / step-counter receipt, derived / aligned / levelled fixture and scenario.
  - All 135 window checks (101 windows, raw and ablated renders) have r1 == r2.
  - No ROM drift (ISSUES #154): five runner runs agree byte for byte on every file they share.
    - run A and its run B (before the additions): 261 same, 0 DIFF;
    - run A' (+ the Flatter reseed routes): the 258 shared files the same;
    - run A'' (+ CROBAT -> RATTATA): the 276 shared files the same;
    - run B'': 291 / 291.
  - Every exploratory pre-runner receipt also agrees.
- `npm test` in a git-archive copy of HEAD `a46837da7` (master with this audit's files, inside the scratch dir; never the checkout):
  **1,620 files / 13,297 tests passed** (44 / 223 skipped).
  - `npm run build`: see the final commit message.
  - Only new tools / receipts / this doc changed (no src).
- `git diff --check` clean. `tools/integration/fixtures/audit-22/.gitattributes` (copied from plans69) keeps `*.diff -whitespace`; there
  is no `.diff` here.
- `git status --short` listed only this audit's new files at every commit; paths were staged explicitly.

## 6. Files

- Tools (`tools/integration/`): `audit22Run.sh`, `audit22Stage.py`, `audit22FlatterStage.py`, `audit22ReseedProbe.py`,
  `audit22ReseedFixtures.py`, `audit22Align.py`, `audit22Level.py`, `audit22Check.ts`, `audit22StepCounter.ts`, `audit22Data3.py`,
  `audit22Summary.py`.
- Receipts (`tools/integration/fixtures/audit-22/`):
  - `scenarios/` (30);
  - `fixtures/{dt,a,ff,rs}/` (raw, aligned, rekeyed, levelled);
  - `ret88-dt/`, `a22/`, `ff/`, `reseed/`: check JSONs, derive / rekey logs, `rom-data3.jsonl`, `production-step-counter.jsonl`;
  - `summary-*.txt`.
  - No RGB dumps.
