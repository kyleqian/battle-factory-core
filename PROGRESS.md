# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 150 — Supervisor: round 1 folded — **ENDEAVOR window fully CLOSED (S7 slice E1 done end to end)** + DRAGON_BREATH window scouted/ground-truthed (slice E2 unblocked); suite **693/693**, build green, scout branch merged clean, no worktrees

- **State (supervisor-verified this minute):** `npm test` **693/693**,
  `npm run build` green, tree clean at merge `6f8b005`, no worktrees or
  stray branches. `turn2-endeavor-drain.json` **200/201** (supervisor-rerun;
  sole residual = tick 2906, ISSUES #19 family, pre-attributed);
  regression spot-checks `turn1-drain.json` 102/102,
  `turn1-rockslide.json` 256/256.
- **Did:** Round 1 = two 45-min workers in parallel. Main lane (#149,
  `f6a53da`): ENDEAVOR tail 3061-3094 landed via RAM-probe-first — two NEW
  mechanisms (player-healthbox post-hit wobble ±1px/20 ticks; Onix
  post-hit invisible-flicker 4-on/4-off ×4), both `render=RAM+1`,
  §15's "same mechanisms' tail" guess disproven by probe before any code.
  Worktree lane (`5cdff4b`, merged): DRAGON_BREATH ground truth —
  corrected window boundary (**3137→3846 pixel-visible**; 3095-3136 is
  ENDEAVOR's own HP-drain tail through ~3116 + handoff), §12 RNG ledger
  re-verified 0 corrections, per-tick task/sprite inventory committed
  (8 fire projectiles @4-tick spawn/20-tick life, target red-fade
  `AnimTask_BlendBattleAnimPal`, `AnimTask_ShakeMon2` ±2px, hit-flash
  sprite), dense every-tick trace 3095-3346 (252 caps, verbatim 50-segment
  prefix — supervisor-verified byte-equal), only `small_ember.png` needs
  extraction. Docs: `docs/dragon-breath-notes.md` (new).
- **Next:** Round 2: main = DRAGON_BREATH engine slice E2a (ember
  extraction + kickoff text + projectile mechanism vs the banked ground
  truth); worktree = ISSUES #20 FONT_NARROW rewire (real glyph pipeline for
  the FIGHT submenu, unblocks S8 battle-2 menus). Then: E2b (blend/shake/
  flash + HP drain + turn end), faint/forced-switch slice, #19 root cause.
- **Notes:** worker costs $8.75 + $4.73, 24.6 + 15.2 min. Zero merge
  conflicts, zero regressions.

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
