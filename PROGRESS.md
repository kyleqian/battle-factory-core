# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 148 — Supervisor wind-down: session end 2026-07-19 ~20:30 — **14 verified worker steps** (9 main + 5 worktree, every one folded green); suite **648 → 685/685**; headline: **oracle frame cap raised to 45000 (user decision, harness `ccd7554`)** after proving no battle-1 WIN fits 20000 → the full S8 acceptance chain is now ground-truthed (WIN + BOTH swap branches + battle-2 first menus + battle-2 turn 1); turn-2's ENDEAVOR half is engine-green 3000→3060

- **State (verified this minute):** `npm test` **685/685**, `npm run
  build` green, tree clean at `32f1a9e` + this docs commit, no
  worktrees, no unmerged branches, oracle serving `maxFrames: 45000`.
  Committed-trace counts: turn1-rockslide **256/256** (shake residual
  closed #134), turn2-endeavor 76/77, turn2-endeavor-drain **166/167**
  (contiguous dense green 2999-3060; both residuals = ISSUES #19's
  family), all earlier traces at their established counts.
- **Session summary (supervised, ~16:15-20:30):** S7 turn-2 first half
  built from zero across #135/#137/#142/#144/#146/#147 (dynamic
  FONT_NORMAL PP digits, player HP-digit compositor, ENDEAVOR: HP-diff
  core + squish/blend/droplets/hitsplat/shake — each mechanism
  RAM-probed, three distinct render-lag conventions pinned). One failed
  landing (#140, X-axis misfit) recovered by the RAM-probe-first retry
  (#142: wrong-subsystem root cause). S8: §15 scout proved the WIN
  unreachable at 20000 (idle-timing is NOT an in-battle RNG lever;
  best line: Pidgeotto KO 15887, Onix faints 19147, Murkrow untouched)
  → escalated → **user chose raising the cap** (harness `ccd7554`,
  service restarted+verified) → §16 WIN chain (Magby beats Murkrow,
  victory → decline → battle-2 menu at 33031), §17 swap-YES branch
  (full swap screen, GROVYLE swapped in, asset inventory), §18
  battle-2 turn 1 (BATTLE_ARMOR crit short-circuit; rentalMons probe
  fixed+validated; frontier RNG freeze at 33286). ISSUES #21 opened
  from §18's honest damage flag and CLOSED same session (derivation
  omitted the `+2`; engine bit-exact, supervisor-reproduced). ISSUES
  #19's family recurrence pinned at 2906 (now 3 affected frames across
  3 traces, same 99px row-111 fingerprint).
- **Next:** (1) ENDEAVOR tail 3061-3094 (second hitsplat/shake round +
  settle) to close the whole anim window; (2) slice E2: DRAGON_BREATH
  window 3129-3846 (turn-2 second half); (3) faint/forced-switch engine
  slice (§13-§14 ground truth banked); (4) ISSUES #19 root cause, #20
  FONT_NARROW rewire; (5) S8 engine work is fully unblocked
  (ground truth complete end to end); S4 remainder stays deferred.
- **Notes:** no usage-limit events; worker cost ~$5.5-23/step, 14-41
  min/step. One harness change this session (`ccd7554`, cap 45000) —
  recorded in ROADMAP S8 + Domain notes with rationale.

---
## 147 — Bounded worker (session's LAST): S7 slice E1 hitsplat/shake increment — **both remaining ENDEAVOR sub-mechanisms landed green; the 3008-3023/3034-3049 gaps are CLOSED, `turn2-endeavor-drain.json` runs contiguously 3000→3060**; `npm test` **685/685** (+7), `npm run build` green — closes the brief's own acceptance criteria exactly

- **State:** `npm test` **685/685**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` `captureFrames` now covers every tick
  2999-3060 contiguously (grown 135→167); `tools/probe/dump-endeavor-
  hitsplat-shake.py` committed (new).
- **Did:** RAM-probed `gAnimMovePower` (**75** for ENDEAVOR, never confirmed
  before despite three prior sessions flagging it — the move's *listed*
  power is 0 but `GetMovePower`'s real HP-diff placeholder is 75), the
  target's own `sprite->x2` (shake), and both `AnimHitSplatBasic` sprites'
  real position + OAM matrix. First hitsplat probe attempt found zero
  sprites (filtering on `callback==AnimHitSplatBasic`'s address fails since
  that function reassigns its own sprite's callback on its first
  invocation) — fixed by filtering on the stable `affineAnims` field
  instead. Wired `endeavorShakeX2`/`drawEndeavorHitsplats` into
  `drawEndeavorSquish`. First wiring attempt (shake using the same
  `RAM=render-1` lag as blend/droplets) landed round-0 hitsplat exactly but
  half-missed shake on alternating render ticks — pixel-solved the real lag
  as `RAM=render-2` (matching squish's matrix, a THIRD distinct lag
  confirmed in this one window) via a neutral-baseline diff against fresh
  oracle captures; fixed, then the whole 3000-3060 window landed first-try
  with zero further mismatches. Also found the hitsplat's own OAM matrix is
  a RAM-confirmed CONSTANT (372) for its whole visible life, not a ramp —
  corrects this run's own earlier banked asset-doc summary (not edited in
  place, corrected via engine-code doc comment per this run's convention). 7
  new Tier-1 pins, oracle-cross-checked. Full writeup:
  `docs/battle-menu-notes.md` §15e.
- **Next:** OUT of this session's scope but flagged for whoever picks it up:
  renders past 3060 (`3061-3094`) are still red/uncaptured — likely the same
  mechanisms' own tail, never RAM-probed (§15's own original scan called it
  "alternating two distinct shapes", unattributed). Otherwise S7 slice E1
  (ENDEAVOR) is DONE per the brief's own acceptance criteria.
- **Notes:** no papercuts. Session's last main-lane increment — tree is
  resume-ready (clean, green, no worktrees).

---
## 146 — Bounded worker: S7 slice E1d batch-1 increment — **batch-1 droplets confirmed (zero code changes needed) + extended squish/blend table wired (both cycles) + two new "inter-round lull" islands landed green**; the true wall found and pinned exactly: render 3008, gated by an unmodeled hitsplat sprite, not a droplet/squish bug; `npm test` **678/678** (+4), `npm run build` green

- **State:** `npm test` **678/678**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` `captureFrames` grown 114→135 (dense
  3000-3007 unchanged, PLUS two newly-verified-green islands 3024-3033 and
  3050-3060); `ENDEAVOR_SQUISH_TABLE` extended 8→57 rows (`t=3000..3056`,
  both squish/blend cycles). No new probe scripts needed (reused
  `dump-endeavor-squish-blend-ext.py`, re-run since the prior session's own
  dump was scratch/uncommitted).
- **Did:** RAM-probed the full squish+blend window fresh (RAM 2996-3055,
  `gOamMatrices`+`gPlttBufferFaded`/`Unfaded` solved for `coeff` per
  `BlendPalette`'s exact formula — found and fixed a probe bug along the
  way: the blend only touches palette indices 1-15, `numEntries=15`, index
  0 is transparent and was polluting the coeff solve) and wired all 57 rows
  into `ENDEAVOR_SQUISH_TABLE`. Verified batch-1 (upper) droplets need ZERO
  code changes: the existing `RAM=render-1`/`n>=1` convention generalizes
  exactly, confirmed both by a targeted oracle pixel check (render 3018,
  the batch's own first-visible tick — one later than §15c's rough "~3017"
  guess) and by the fact that no diff bbox ever touches the attacker-side
  droplet region across the whole 3008-3049 span. Extended dense captures
  tick-by-tick past 3007 and found the wall immediately at 3008: a discrete
  red-starburst diff confined to `x=41-102` (Onix's own body) — a hitsplat
  sprite's own pop-in, unmodeled, not a squish/blend/droplet defect (the
  attacker side stays 100%-exact through the entire span, proving the
  extended table + droplets are correct). Individually diffing every tick
  (not sampled) also surfaced two real "inter-round lull" islands inside
  what §15's coarser scan called one continuous span — `3024-3033` and
  `3050-3060` both diff exactly zero pixels — landed both as `captureFrames`
  additions per this trace's own established sparse+dense convention; the
  red spans between them (3008-3023, 3034-3049) were left OUT of
  `captureFrames` entirely rather than committed red. 4 new Tier-1 pins,
  all oracle-cross-checked (scratch `bin/oracle run` captures, not this
  engine's own output). Full writeup: `docs/battle-menu-notes.md` §15d.
- **Next:** model `AnimHitSplatBasic` (gfx + affine pop table already
  derived, §15) and `AnimTask_ShakeTargetBasedOnMovePowerOrDmg` (needs
  `gAnimMovePower` for ENDEAVOR RAM-confirmed — still open) to close the
  3008-3023/3034-3049 gaps; once landed, the two islands this session found
  should merge into one contiguous green block through ≥3060.
- **Notes:** no papercuts. Session's last main-lane increment — tree is
  resume-ready (clean, green, no worktrees).
