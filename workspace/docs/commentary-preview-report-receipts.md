# Commentary ROM ground-truth receipts via `preview_report`

Gate-5 acceptance-audit item 1 (clause (d)): `src/engine/factoryCommentary.ts`
was source-cited and unit-pinned (`tests/factoryCommentary.test.ts`, 35
tests) but had **zero ROM ground truth for any non-canonical party** — every
assertion was a hand-computed literal, and the only real ROM evidence
(`tools/compare/traces/battle1-postwin-scout-a.json`/`-b.json`) covers only
the one fixed canonical opponent (BUTTERFREE/HAUNTER/QUILAVA, sets
153/179/181). This document and `tests/factoryCommentaryRomReceipts.test.ts`
close that gap with real ROM output for ten non-canonical, ROM-generated
parties, using the **non-reversed** workflow PROGRESS entry 755 dispatched:
take whatever party each seed actually generates and verify our commentary
computation against the ROM's own report for that party — no seed search, no
harness change, no attempt to pick a specific opponent.

## Method

### Anchor and call convention

`BattleLab.preview_report(seed=None, capture_frames=None,
capture_all_frames=False)` (`oracle/battle_lab.py:667-759`) replays the
attendant's scouting-report dialogue from a second canonical anchor,
`oracle/bootstrap/factory-pre-report.json` (`../../oracle/BOOTSTRAP.md`
"Pre-report anchor" section), and is a Python method, not an HTTP route — it
requires an oracle constructed directly against that bootstrap file, which
the shared HTTP services on 8012/8014 are not. Per `../../oracle/BATTLE_LAB.md`
"Report preview" and `oracle/report-preview-smoke-test.py`, it is called
in-process. Every seed's data below was produced by
`tools/run-mgba-probe.py <fresh-output.json> -- python3
/tmp/factory-commentary-receipts/probe_seed.py <seed> <output.json> <png_dir>
2292 2412`, **one fresh mGBA process per seed** (per the step brief's
per-case isolation instruction), never touching the shared 8012/8014
services. The probe script (scratch, `/tmp`, not committed) is a ~50-line
adaptation of `oracle/report-preview-smoke-test.py`'s in-process calling
pattern: construct `EmeraldOracle(bootstrap_path=factory-pre-report.json)`,
wrap it in `BattleLab(oracle, "battle-scene-off")`, call
`lab.preview_report(seed=N, capture_frames={2292, 2412})`, and write the
`report` dict plus capture metadata to the probe's output JSON (decoding each
capture's `pngBase64` to a `.png` file for visual inspection). Every one of
the 10 probe runs exited via the documented "known teardown SIGSEGV, output
already valid JSON" path that `tools/run-mgba-probe.py` accepts (exit 0,
~2.2-2.4s wall time each).

### Extraction method: raw dispatch integers, not OCR

`preview_report()`'s response carries a top-level `report` object:
`opponentSetIds` (the three real `gFrontierTempParty` set IDs the ROM
generated) and the raw `typeVar`/`styleVar` — `gSpecialVar_0x8005` and
`gSpecialVar_0x8006` read directly out of RAM after the dialogue's
generation step. Source confirms these are not a derived summary of the
printed text but its literal **dispatch key**: the script switches on them
verbatim —
`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:207-226`
(`call_if_eq VAR_0x8005, TYPE_FIRE, ..._EventScript_OpponentUsesFire`, one
`call_if_eq` per type plus `NUMBER_OF_MON_TYPES` for the no-favorite line)
and `:265-283` (`call_if_eq VAR_0x8006, FACTORY_STYLE_WEAKENING, ...`, one
per style plus `FACTORY_NUM_STYLES` for "flexibly adaptable"). The C side
confirms the encoding is exactly our port's: `FACTORY_STYLE_NONE` is `0` and
`FACTORY_NUM_STYLES` is `8`
(`reference/pokeemerald/include/constants/battle_factory.h:4-12`), matching
`FACTORY_STYLE.NONE`/`FACTORY_STYLE.FLEXIBLE` in
`src/engine/factoryCommentary.ts`; `GetOpponentMostCommonMonType`/
`GetOpponentBattleStyle` (`battle_factory.c:607-654,657-684`) write
`gSpecialVar_Result` (copied to `VAR_0x8005`/`VAR_0x8006` by the calling
script) using the same `0..17` type IDs and `NUMBER_OF_MON_TYPES` (18)
no-favorite sentinel our port uses. So `typeVar`/`styleVar` are used
directly as ground truth here, applied uniformly to all 10 seeds — no PNG
OCR needed to get the values themselves.

**Corroboration, not reliance:** to confirm this dispatch-integer reading
really does correspond to the on-screen sentence (not just to source-code
cross-reading), 6 of the 10 seeds' capture PNGs were read and eyeballed
directly (seeds 1, 2, 3, 4, 13, 20 — type and/or style lines): every one
matched its `typeVar`/`styleVar` exactly, including the no-favorite ("The
TRAINER appears to have no clear favorites when it comes to type.") and
flexible-style ("...flexibly adaptable to the situation.") edge cases. See
"Frame-window derivation" for how the two frame numbers were found, and the
digest table below for the full set.

### Frame-window derivation

`BattleLab.ATTENDANT_DIALOGUE_ROUTE` (`oracle/battle_lab.py:173-190`) is 32
literal `(frames, buttons)` segments totalling 2916 frames from the
pre-report anchor. Its own inline comments claim the type line prints during
step 22's 460-frame wait (cumulative frame 2166) and dismiss during step 24
(cumulative 2292); a live probe (capturing frames 0, 2160, 2166, 2172, 2286,
2292, 2298) showed this is off by one dialogue box — cumulative 2160/2166
is actually the generic lead-in ("I've conducted a little investigation
about your upcoming opponent."), and the type-specific line
("...apparently skilled in the handling of the X type.") is stable at
**2286-2292** (identical raw-RGB sha256 across that span; 2298 has already
begun the next dismiss transition). The same probing found the style line
stable across **2400-2418** (identical hash for all of 2400/2410/2412/2415/
2418); **2292** and **2412** were selected as the two capture frames for
every seed, both safely inside their respective plateaus. This is
independent of the game's line-wrap logic (both report lines are always
exactly two fixed script lines; only their content varies), so the same two
frame numbers apply to every seed — confirmed live: all 10 seeds' 2292/2412
captures show a fully-printed, stable dialogue box.

### Party construction

Commentary only needs `speciesName` and `moves` per party member
(`FactoryCommentaryPartyMember`, `src/engine/factoryCommentary.ts:20-23`),
both of which are static per rental set ID — independent of the
personality/IVs/ability `preview_report()` does not expose. Each sampled
seed's `report.opponentSetIds` was joined against
`src/data/gen/battle-frontier-mons.json` (the same `FRONTIER_MONS` table
`createFactoryCorpusPartyMember` in `src/engine/factoryCorpusParty.ts` reads
its `speciesName`/`moves` fields from) to build the
`FactoryCommentaryParty` the port consumes. `preview_report()` does not
expose a trainer ID (only `opponentSetIds`/`typeVar`/`styleVar`), which the
step brief's "trainer id + 3 set ids **or species**" phrasing anticipates —
trainer identity does not affect commentary, so it is not needed here.

## Sample (10 seeds)

Canonical comparison party: BUTTERFREE/HAUNTER/QUILAVA (sets 153/179/181) →
`typeVar` 18 (no favorite), `styleVar` 5 (weakening) — computed by the port
in `tests/factoryCommentary.test.ts`'s "keeps the canonical upcoming
opponent equivalent to frozen presentation".

| seed | opponentSetIds | species | typeVar | styleVar | both differ from canonical? | port verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 115, 189, 181 | VOLTORB, COMBUSKEN, QUILAVA | 10 FIRE | 5 WEAKENING | no (style matches) | **MATCH** |
| 2 | 154, 125, 155 | BEEDRILL, CACNEA, POLIWHIRL | 18 no-favorite | 5 WEAKENING | no (both match) | **MATCH** |
| 3 | 120, 119, 177 | PHANPY, HOUNDOUR, PARASECT | 18 no-favorite | 0 NONE | no (type matches) | **MATCH** |
| 4 | 137, 175, 121 | FARFETCH'D, CHARMELEON, SPOINK | 18 no-favorite | 1 PREPARATION | no (type matches) | **MATCH** |
| 13 | 152, 121, 185 | MAWILE, SPOINK, WOBBUFFET | 14 PSYCHIC | 8 FLEXIBLE | **yes** | **MATCH** |
| 14 | 199, 110, 145 | FURRET, GRIMER, SPINDA | 0 NORMAL | 0 NONE | **yes** | **MATCH** |
| 17 | 147, 114, 184 | NIDORINO, DROWZEE, MURKROW | 18 no-favorite | 2 SLOW_STEADY | no (type matches) | **MATCH** |
| 19 | 172, 159, 153 | VOLBEAT, LEDIAN, BUTTERFREE | 6 BUG | 0 NONE | **yes** | **MATCH** |
| 20 | 118, 194, 147 | DELIBIRD, MAGCARGO, NIDORINO | 18 no-favorite | 7 WEATHER | no (type matches) | **MATCH** |
| 22 | 153, 195, 122 | BUTTERFREE, PUPITAR, ARON | 5 ROCK | 5 WEAKENING | no (style matches) | **MATCH** |

**Diversity:** 6 distinct `typeVar` values (FIRE, no-favorite, PSYCHIC,
NORMAL, BUG, ROCK — exceeds the "≥2 distinct favorite types" bar); 6
distinct `styleVar` values (WEAKENING, NONE, PREPARATION, FLEXIBLE,
SLOW_STEADY, WEATHER — exceeds "≥2 distinct styles"); seeds 13, 14, 19 all
satisfy "favorite type AND style both differ from the canonical party."

**All 10: port MATCH.** `getFactoryOpponentFavoriteType`/
`getFactoryOpponentBattleStyle`, applied to each seed's actual ROM-generated
party (species/moves joined from `battle-frontier-mons.json` by
`opponentSetIds`), reproduce the ROM's `typeVar`/`styleVar` exactly for
every sampled seed, including the tie/no-favorite fallback (seeds 2, 3, 4,
17, 20) and the >2-qualifying-styles FLEXIBLE fallback (seed 13). No defect
found; no port change made. Pinned hermetically in
`tests/factoryCommentaryRomReceipts.test.ts` (12 tests, no oracle call at
test time).

## Capture digests

`sha256` per AGENTS.md is over the **raw RGB888 framebuffer**
(`captures[].sha256` as returned by `preview_report()`), not a hash of the
on-disk PNG file bytes — PNG encoding is not guaranteed bit-reproducible
across runs even for pixel-identical frames (confirmed: re-hashing the
`.png` files with `shasum` produced different digests than these raw-RGB
values across separate probe invocations of the same seed/frame, despite
the JSON-recorded raw-RGB `sha256` reproducing exactly). These are the
oracle's own per-capture digests, not a re-derived hash of encoded PNG
bytes:

| seed | frame 2292 (type line) sha256 | frame 2412 (style line) sha256 |
| --- | --- | --- |
| 1 | `72dabae4e2579fedc03222ad3848cde58c9866da92e6f4c79967d7df6b6c90fa` | `7de2f5850d25489448bc0a1371dcc8cd75e9374964a24c457448a75f7ab46994` |
| 2 | `b28f2422bb45cb7b0d6036e3ea0bcdcfa87668b34af1e40cdbaf7065c4618653` | `7de2f5850d25489448bc0a1371dcc8cd75e9374964a24c457448a75f7ab46994` |
| 3 | `b28f2422bb45cb7b0d6036e3ea0bcdcfa87668b34af1e40cdbaf7065c4618653` | `0876b5f15bc6e6d5285ecd0fd4e81a147732f6de5e93ecd42fd9be4ebe53da1e` |
| 4 | `b28f2422bb45cb7b0d6036e3ea0bcdcfa87668b34af1e40cdbaf7065c4618653` | `ca04c702e7f1298b6d3eb70f5aa316674e92019816e92f001df36c1427dbf8fc` |
| 13 | `36511df2e233d55cce5e350915a53b04b54eecd325aa0e2fdf5aaf661b8f68c2` | `b6a13533bdfeb09ad10b3f008733701b237b1b3a11f2988514148efb7fd1af4d` |
| 14 | `9a6023221f4b8335a7863773a66486ddc986ec968815ee4e694320af9365bab8` | `0876b5f15bc6e6d5285ecd0fd4e81a147732f6de5e93ecd42fd9be4ebe53da1e` |
| 17 | `b28f2422bb45cb7b0d6036e3ea0bcdcfa87668b34af1e40cdbaf7065c4618653` | `3f26f4c2b5f9c9a492125f891f28541977ff7f70ce12a00f108e0531fbab7c2b` |
| 19 | `dd20b9e49a506c678197e53a4a1f23bb27662367c42ccc208eabe41155d09f14` | `0876b5f15bc6e6d5285ecd0fd4e81a147732f6de5e93ecd42fd9be4ebe53da1e` |
| 20 | `b28f2422bb45cb7b0d6036e3ea0bcdcfa87668b34af1e40cdbaf7065c4618653` | `3469bf06829c55485c0c86bcd4bb533d462e3c6c098b967ad355f8304bfe2fd2` |
| 22 | `f86376c2aef2f519f364e1d0cfc2b2f378949e4c369d6fb581c481a0eda7cb5a` | `7de2f5850d25489448bc0a1371dcc8cd75e9374964a24c457448a75f7ab46994` |

Note the digests cluster exactly along shared printed text: all five
`typeVar=18` seeds (2, 3, 4, 17, 20) share one 2292 digest (identical
"no clear favorites" sentence); the three `styleVar=5` seeds (1, 2, 22)
share one 2412 digest ("weakening the foe to start"); the three
`styleVar=0` seeds (3, 14, 19) share another ("free-spirited and
unrestrained"). This clustering is itself independent corroboration that
the captured pixels really do track the dispatched report content and nothing
incidental (background, cursor blink phase, etc. stayed put across the whole
20-frame capture window per seed).

The anchor frame (0) was independently confirmed once (seed 1, during
bring-up) to match `../../oracle/BOOTSTRAP.md`'s published v2 checkpoint
hash `ebb6ad29cc122f04c1e64217774c784f403d821154fec407cb0166371d44874d`
exactly, and the same seed reproduced identical `report`/capture digests
across two independent probe invocations (bring-up and the final sample
run) — the underlying dialogue replay is fully deterministic.

## Caveats

- **Trainer identity is not covered.** `preview_report()`'s `report` object
  exposes `opponentSetIds`/`typeVar`/`styleVar` only, no trainer ID.
  Commentary does not depend on trainer identity, so this is not a gap for
  this audit item — but it means this receipt set says nothing about
  `getFactoryTrainerPresentation` or similar trainer-identity code (already
  DISCHARGED separately, audit clause (e)).
- **Only 6 of 10 seeds' capture PNGs were eyeballed** for OCR-style
  corroboration (the rest rely on the source-verified dispatch-integer
  reading alone, which is the literal mechanism the ROM itself uses to
  select the line — not a weaker proxy for it).
- **PNGs and raw probe JSON stayed under `/tmp`**, never the repo, per the
  step brief; this document and the sha256 digest table are the durable
  record. The probe scripts
  (`/tmp/factory-commentary-receipts/probe_seed.py`,
  `.../scan_seeds.py`) are not committed either — they are thin, disposable
  adaptations of `oracle/report-preview-smoke-test.py`'s already-documented
  in-process calling convention, reproducible from this document's method
  section by any future session.
- Out of scope (per the step brief): reproducing the seed→party RNG chain
  itself (owned by Gate-5 clauses (a)/(b), which already have their own
  ground truth), any `src/engine` change, and app pixel traces.
