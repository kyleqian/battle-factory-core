# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 242 — Supervisor fold (evening session round 1): SAND_ATTACK probe merged — turn 13 is now FULLY pure wiring (last unknown characterized); AERIAL_ACE rung (a) verified landed, rung (b) residual queued for a targeted probe

- **State (supervisor-verified post-merge):** `npm test` **966/966**,
  `npm run build` green, tree clean, no worktrees/unmerged branches.
  `verify-turn13.ts` (now **60 checks**: 46 + 14 SAND_ATTACK) passes from
  the main tree, supervisor-rerun. `turn10-aerialace.json` 23/23
  supervisor-rerun, plus neighbors 220/220, 56/56, 159/159.
- **Did:** verified + merged `worker/wt-20260721-182214` (SAND_ATTACK
  ~90-tick window decomposes into 4 sub-phases, ALL pure wiring: dirt-throw
  via unmodified `AnimDirtScatter`/`SlideMonToOffset` (+1 lag; per-call
  scatter offsets are DEAD script args — all 30 sprites share one origin,
  only `Random2()` target jitter differs; regenerate tables via committed
  `dump-sandattack-anim.py`), silent monbg gap, turn-6-family stat banner
  (0 lag, assets already extracted), "ONIX's accuracy fell!" text — the
  prior "blank 15630-15699" label was WRONG, that sha is the held
  accuracy-fell text). Probe was cap-killed mid-final-message but its
  commit was complete — no salvage needed. Verified #241's engine work
  (see below).
- **Next:** round 2 in flight — main lane wires turn 13 end-to-end;
  worktree probes AERIAL_ACE's overlap residual (#241's handoff) + the
  12371-12437 flicker (rung (c) precondition). Then turn 14+.

---
## 241 — Bounded worker (S7 engine step, AERIAL_ACE excluded-window close-out): rung (a) LANDS 0-diff (mechanisms 1/3's residual - a compositing-ORDER bug, not a bad table), rung (b) wired but NOT 0-diff (mechanism 4's darken - two real bugs fixed, ~48% mismatch down to a small residual); rungs (c)/(d) not attempted

- **State:** `npm test` **966/966**, `npm run build` green, tree clean.
  `turn10-aerialace.json` **23/23** (was 18/18) — extended through render
  12367, 0 diff. Full regression sweep re-verified 0 diff: `turn10-rockslide`
  **220/220**, `turn12-aerialace` **56/56**, `turn12-rockslide-miss`
  **38/38**, `turn9-quickattack` **159/159**, `turn11-menu` **56/56**,
  `turn11-featherdance` **178/178**, `turn11-rockslide` **163/163**.
  `verify-turn10-aerialace.ts` unchanged **20/20**.
- **Did:** (rung a) found the REAL cause of §42/§43's own standing
  "mechanism-3 residual" (renders 12363-12366): the lunge/clone RAM tables
  were already correct (brute-force-confirmed against a fresh oracle
  capture — every neighboring offset scores far worse), the bug was
  `drawTurn10AerialAceLungeAndClones`'s compositing ORDER — drawing the real
  sprite first and blending both clones over it (QUICK_ATTACK's own
  precedent shape) left the moving real silhouette exposed to being
  ghosted-over. Reversing the order (clones blended against the field
  first, real sprite opaque on top last) closes it to 0. Also fixed slot 7's
  own END lag (+2 → ordinary +1, RAM-pixel-bisected). (rung b) wired
  mechanism 4's already-RAM-pinned darken coefficient into the existing
  (previously unused) `darken` render plumbing; found two real bugs along
  the way — `turn10BgDarkPalette` was darkening the wrong LOCAL palette
  index (a hardware-bank-number transcription that doesn't match the
  compact asset's own indexing; every static-bg tile actually uses local
  index 0), and `erasePidgeottoFootprint` never darkened its own erase
  background. Fixed both — darken plateau mismatch dropped from **~48% of
  the whole frame** to a small residual confined to Pidgeotto's own
  silhouette (600-893px, 1.5-2.3%), still not 0-diff, so the trace's
  `captureFrames` stays at the rung (a) boundary rather than claim a false
  pass.
- **Next:** rung (b)'s own remaining residual (600/893px at 12368/12369,
  plus a separate smaller 203px residual at 12370+ whenever real+slot7
  overlap — may share a root cause, see the handoff note below) blocks
  extending `turn10-aerialace.json` past render 12367; once closed, rung
  (c) (the 12371-12437 flicker/hit-flash, RAM-probe fresh first) and rung
  (d) (turn 12's own +2068 mirror, `turn12-aerialace.json`'s own excluded
  14431-14505 gap) are next in this window's own ordering.
- **Notes:** `docs/aerial-ace-notes.md`'s "2026-07-21 rung (a) CLOSES + rung
  (b) partial" section has the full writeup + an explicit handoff note for
  whoever picks up the remaining residual. `docs/battle-turn-notes.md` §46
  mirrors it briefly. No PAPERCUTS beyond the standing mgba-venv-teardown
  one.

---
## 240 — Supervisor wind-down: session end 2026-07-21 ~14:20 — **17 productive worker steps verified and folded** (7 rounds, 6 main-lane engine slices + 9 worktree probes + 2 salvage/dud events); suite **880 → 966/966**; headlines: **turns 9-12 landed end-to-end 0-diff** (turn 9: clones/shake/wobble/flicker/drain/text/hold/ROCK_SLIDE incl. the flicker gap closed at 159/159; turn 10: menu/AERIAL_ACE/ROCK_SLIDE; turn 11: menu/FEATHER_DANCE-blocked/ROCK_SLIDE; turn 12: menu/AERIAL_ACE-reanchor/ROCK_SLIDE-miss), **ISSUES #30 CLOSED by a full crack** (feather draw-order candidate A + the AFFINE_NORMAL box-clip root cause, 425px→0 on all three turns, traces 106/16/33→235/145/162), **ISSUES #31 filed** (hitsplat: 3 hypotheses refuted with committed instruments), and **the probe→wiring pipeline ran at full cadence** — every landed window was pre-probed with a PASS/FAIL verify script and every "pure wiring" verdict held on landing

- **State (verified this minute):** `npm test` **966/966**, `npm run
  build` green, tree clean, no worktrees, no unmerged branches. New/
  extended traces this session (all supervisor-rerun 0 diff):
  turn9-quickattack 112→159, turn9-quickattack-b 77, turn9-rockslide
  130, turn6/7/8-feathers 235/145/162, turn10-menu 83, turn10-aerialace
  18, turn10-rockslide 220, turn11-menu 56, turn11-featherdance 178,
  turn11-rockslide 163, turn12-menu 46, turn12-aerialace 56,
  turn12-rockslide-miss 38; bonus turn2-endeavor-drain 200→201 (rung-c3
  hitsplat fixes closed its last residual). Verify scripts banked:
  turn9-postlunge 108, turn10-aerialace 20, turn10-rockslide 44,
  turn11 52, turn12 20, turn13 46 — all supervisor-rerun post-merge.
- **Next:** (1) wire turn 13 (verify script + dossier corrections
  banked; ONE real unknown: SAND_ATTACK's ~90-tick mid-message
  animation 15540-15629, uncharacterized); (2) AERIAL_ACE mechanisms
  3/4 (§42/§43 handoffs: bisect lunge-table indices 0-2; re-derive the
  live BG palette bank by RAM read); (3) ISSUES #31's two named avenues;
  (4) turn 14 (forced switch) onward — dossiers exist through
  post-WIN; S8 engine slices have complete ground truth.
- **Notes:** zero merge conflicts across 8 merges; no usage-limit
  events. One supervisor launch error (nested-worktree launch needs the
  worktree's OWN script copy invoked relatively — an absolute-path
  main-tree launcher bases on master; the mis-based worker caught it and
  stopped honestly at $0.27) and one 20-min probe cap-kill mid-writeup
  (work salvaged: supervisor reran its uncommitted verify script +
  diagnostics, wrote the dossier append with provenance, committed on
  its branch — the "hit-flash mechanism" it dissolved was folded intact).
  PAPERCUTS: exit-139-teardown entry added and re-confirmed by three
  workers. Interactive session; no escalations needed.
