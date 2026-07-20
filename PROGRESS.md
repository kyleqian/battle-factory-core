# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 149 — Bounded worker: S7 slice E1 tail increment — **ENDEAVOR's animation window CLOSES**: `turn2-endeavor-drain.json` green span now runs contiguously **3000→3094+** (merges into the pre-existing 3095-3120 block); `npm test` **693/693** (+8), `npm run build` green

- **State:** `npm test` **693/693**, `npm run build` green, tree clean.
  `turn2-endeavor-drain.json` `captureFrames` grown 167→201 (every tick
  3061-3094 added, closing the gap between the committed 3000-3060 block
  and the pre-existing dense 3095-3120 block); `tools/probe/dump-endeavor-
  tail.py` committed (new).
- **Did:** RAM-probed the 3061-3094 tail FIRST (mandatory per the brief) by
  extending both §15e-era probes over RAM 3050-3100 - both came back flat
  (shake/hitsplat fields empty, squish matrix neutral, attacker palette
  unchanged), ruling out §15's own "same mechanisms' own tail" guess before
  touching render code. A from-scratch full-sprite-table scan then found
  TWO new, previously-unmodeled mechanisms: (1) the player healthbox's own
  brief post-hit "wobble" - 3 sprites (`gHealthboxSpriteIds[0]` + 2
  lockstep neighbors) alternating `y2=+1/-1` every RAM tick for 20 ticks
  then a hard stop, a different mechanism from `menuIdleBounce`'s own slow
  never-negative sine; (2) Onix's own brief post-hit "flicker" -
  `struct Sprite.invisible` toggling 4-on/4-off for 4 cycles then settling
  visible for good (two other hypotheses - a palette blend, a hardware
  BLDCNT/BLDALPHA flash - were RAM-checked and ruled out first). Both lags
  independently pixel-confirmed at `render=RAM+1` (blend/droplet's family,
  not squish/shake's `render=RAM+2`). Wired into `drawEndeavorSquish`
  (`ENDEAVOR_SQUISH_TABLE` extended with 36 more neutral rows through
  `t=3092` so its primitive-reconstruction path keeps covering the tail);
  `drawMenuHealthboxPlayer` gained an optional `dy` param (default 0, other
  2 call sites unaffected). Landed first-try, zero further mismatches once
  wired. 8 new Tier-1 pins, oracle-cross-checked. True settle tick pinned
  at render 3093 (1-2 ticks earlier than §15's own coarse estimate). Full
  writeup: `docs/battle-menu-notes.md` §15f.
- **Next:** S7's ENDEAVOR slice (§15-§15f) is fully DONE. Remaining S7 work:
  DRAGON_BREATH's own window (~3129+), faint/forced-switch engine slice,
  ISSUES #19 root cause, FONT_NARROW rewire (#20) - all out of this
  session's own scope.
- **Notes:** no papercuts. `tools/compare` full regression check across
  `turn2-endeavor.json` (76/77), `turn1-rockslide.json` (256/256),
  `turn1-cloneanim.json` (230/230), `turn1-drain.json` (102/102) - all
  unchanged, zero regressions.

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
