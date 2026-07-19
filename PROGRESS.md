# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 77 — ORACLE BOOTSTRAP v5 (supervisor, harness-level, user preference): Battle Scene ON moved INTO factory.sav itself; v4's runtime poke retired — ground truth proven identical (223/223), all counts unchanged

- **State:** harness commit on the pokebench repo ("bootstrap v5");
  oracle service restarted on v5, smoke test green, this run 454/454 +
  build green. Sweep identical to #76's v4 sweep (18 exact + sendout
  174/256).
- **Did:** per the user's preference for a self-consistent save over
  runtime manipulation: new `oracle/bootstrap/set-battle-scene-on.py`
  (idempotent, layout + checksum from `save.c`, used-size re-derived
  from the file's own verifying checksum rather than hard-coded) edits
  both save slots' SaveBlock2 sectors `0x07→0x03` + recomputed
  checksums; `factory.json` v5 with `pokes: []` again. **Equivalence
  proven, not assumed:** fresh-bootstrap probe bit=0 + anchor sha
  byte-identical; turn-1 groundtruth replay byte-identical to v4's
  manifest (223/223 capture shas) — v5 ≡ v4 ground truth exactly, so
  everything #76 verified carries over unchanged, incl. the
  stale-artifact inventory and the sendout 1462-1543 window.
- **Next:** unchanged from #76 — the two drafted lane briefs (sendout
  re-ground-truth + engine; S7 v4/v5 regeneration) remain HELD per the
  user's standing "don't launch new workers yet" (~17:45). Launch only
  on user go-ahead.
- **Notes:** pristine factory.sav recoverable via pokebench git history;
  v4 section kept in BOOTSTRAP.md as superseded history.

---

## 76 — ORACLE BOOTSTRAP v4 SHIPPED (supervisor, harness-level, user-directed): Battle Scene forced ON via zero-frame poke — anchor byte-identical, 18/19 traces hold exactly, only the send-out window's truth moved (174/256, window 1462-1543)

- **State:** harness commit `aae8b98` (+ template-revert follow-up, per
  user preference the ROADMAPs stay untouched — the oracle speaks for
  itself). Oracle service restarted on v4 (`bin/oracle info` → version 4,
  canonical sha unchanged `9c89c741…`). Smoke test green (version pin
  bumped in lockstep). This run: `npm test` 454/454, build green.
- **Did:** single poke in the bootstrap's previously-unused `pokes` field
  (applied after all 6910 scripted frames, before settle — ZERO frames
  added, RNG stream untouched): `gSaveBlock2Ptr`(deref)+0x15: `0x07→0x03`,
  clearing only `optionsBattleSceneOff` (u16 bit 10). Fixed a latent
  harness bug blocking all pokes (`emerald_core.write_u8` used libmgba-py's
  broken `__setitem__` sugar → now `raw_write`). Full verification chain:
  probe shows bit=0 + anchor sha byte-identical; smoke-test golden hashes
  pass; battle1-turn1 replay vs v3 truth: all pre-battle captures
  identical, first divergence tick 1968, 172/223 differ — animations
  visually confirmed (DOUBLE_TEAM afterimage on screen). Full 19-trace
  sweep: 18 at exact prior counts; `sendout.json` 196→**174/256** with ONE
  contiguous mismatch window **1462-1543** (was 1462-1521) — mechanism
  source-identified: `SpriteCB_OpponentMonFromBall`→`BattleAnimateFrontSprite`
  no longer passes `SKIP_FRONT_ANIM` (`battle_main.c:2837`,
  `pokemon.c:6888`), so the mon front-sprite entrance animation now plays
  post-materialize; settled tail 1544-1555 unchanged.
- **Stale-by-design inventory (v3-truth artifacts to regenerate):**
  `battle1-sendout-dense.json` (1462+), `battle1-turn1.json` + its RAM
  dump + battle-turn-notes.md battle-window tables (first action menu
  itself lands later — player send-out front anim), battle-move-anim-notes
  §4-6 timelines (its Battle-Scene-OFF root-cause finding is historical
  truth of v3; its asset/decode work is now exercised). Two lane briefs
  for exactly this split are DRAFTED but NOT LAUNCHED — the user asked to
  hold new workers (2026-07-18 ~17:45); briefs live in the supervisor
  scratchpad (brief-sendout-v4.txt, brief-s7-v4-regen.txt) and their
  content is re-derivable from this entry alone.
- **Notes:** sibling run `swift-koala` shares this oracle and inherits v4
  (user-directed harness change). `docs/battle-turn-notes.md`/`battle-
  move-anim-notes.md` §-references above are the regen worker's map.

---

## 75 — S7 research questions ALL RESOLVED (parallel worktree lane, merged): one RAM-confirmed root cause — the canonical save has Battle Scene OFF; turn-end RNG cluster fully line-cited + LCG-verified. **USER SCOPE DECISION (2026-07-18, interactive): turn animations ON at the oracle level, incl. the harness template — supervisor implementing next.**

- **State:** merge of `worker/wt-20260718-162513` (base `2ad8b52`):
  `npm test` **454/454**, `npm run build` green. Pure research — no
  engine code.
- **Did (worktree lane, supervisor-verified incl. re-checking all three
  load-bearing source citations verbatim in the decomp):**
  (1) ROOT CAUSE: `gSaveBlock2Ptr->optionsBattleSceneOff == TRUE` +
  `gHitMarker` bit 7 (`HITMARKER_NO_ANIMATIONS`) set all trace —
  `battle_main.c:3084` wires the option to the marker;
  `Cmd_attackanimation` (`battle_script_commands.c:1745`) substitutes a
  generic pause for EVERY move's custom animation (except TRANSFORM/
  SUBSTITUTE). Resolves 3 of the 4 questions: DOUBLE_TEAM's 66-tick
  BLDALPHA ramp is `General_StatsChange` (explicitly exempt in
  `Cmd_playanimation:4009-4018`), ROCK_SLIDE's shake sprite never
  spawns, the "falling rocks" pixels are the ungated generic hit-flash.
  (2) Turn-end RNG cluster (1+2+5): `BattleTurnPassed`'s
  `gRandomTurnNumber` (1), `ShouldSwitch` traced call-by-call (2),
  `BattleAI_SetupAIData` 4×`simulatedRNG` + move tie-break (5) — all
  LCG-value-verified; factory challenge has 0 AI-script flags here.
  Falsifiable bonus prediction: Grovyle's turn-2 move = ENDEAVOR.
  Dossiers updated correction-block style; 2 new probe scripts committed,
  each twice-run byte-identical.
- **Next (user directive, supersedes the OFF status quo):** flip Battle
  Scene ON in the ORACLE's canonical bootstrap via a ZERO-FRAME poke
  (any added input frame would reshuffle the pinned rental pool /
  anchor seed per oracle/BOOTSTRAP.md) + template/doc updates, then
  re-verify: anchor sha unchanged, smoke-test golden hashes, full
  19-trace sweep at exact counts, in-battle `gHitMarker` bit 7 clear.
  S7's turn-1 ground truth (#67 trace/dump/ledger) becomes stale by
  design and must be regenerated under animations-on; #72's move-anim
  assets become exercised, load-bearing groundwork.
- **Notes:** worktree removed, branch deleted after merge. Sibling run
  `swift-koala` shares this oracle — the canonical-state change affects
  it too (user-directed, harness-level).

---
