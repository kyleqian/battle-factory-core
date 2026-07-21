# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 209 — Worktree scout (supervisor-folded): turn 17 + the WIN ground truth BANKED — **battle 1 is now ground-truthed turn-by-turn from anchor through the victory text**, a gapless prefix-verified dense-trace chain (turns 6-17 dossiers + winline); Murkrow faints at 22418, **`gBattleOutcome` flips 0→1 at tick 22818** (16 ticks after the dismiss press, while the OLD text still shows — §16's "instant the screen appears" corrected at this fold), DESTIN's loss quote "PLEASE I NEED / SOME WATER" held un-dismissed at trace end 23601; `battle1-turn17-dense.json` (256 captures) + `docs/turn17-notes.md`; merged, suite 837/837 on the merged tree

- **State:** merged into master post-rung-(b), `npm test` 837/837 +
  build green post-merge, worktree/branch cleaned. Supervisor
  re-verified independently: prefix chain re-flattened (turn16 ⊂ turn17
  ⊂ winline-b-swap, script-exact), fresh rerun reproduced 11/11 cited
  shas at exact ticks, 2 climax labels PNG-read ("Player defeated BUG
  CATCHER DESTIN!♥" at 22885; the held quote + trainer sprite at 23601).
- **Did (the 7 briefed questions, all answered):** burn roll STILL
  FIRES vs an already-burned+fainted target (`Cmd_seteffectwithchance`
  unconditional; `SetMoveEffect`'s hp==0 gate short-circuits after the
  roll — both source-cited); burn residual absent this turn
  (`ENDTURN_BURN` gates on hp!=0); BRN badge rides with the healthbox
  (both vanish at 22508, same tick status1 clears); faint sink VERBATIM
  vs turns 13/15, novelty = post-dismiss branches to the win sequence
  (last mon); MAGBY exits 27/138, FIRE_PUNCH PP 13. ISSUES **#27 filed
  at this fold**: the unattributed Random() at HP-write+5 has now
  appeared twice at the IDENTICAL offset (21152, 22173) — upgraded from
  "tail noise" to suspected fixed mechanism, one probe step owed.
- **Next:** engine: turns 7-13 as parameterizations (turn 6 is complete
  end to end per #208), then turn-14+ (FLY halves, player switch, win
  seq — all ground-truthed); probes: ISSUES #27 (RNG attribution), #26
  (Sitrus ring), feather residual 7421-7549; scout territory: the
  post-WIN scene transition (§17's swap screen is next unscouted dense
  ground).
- **Notes:** scout in contract (16.0 of 40 min); 1 PAPERCUT noted in
  the dossier (256-capture budget forced an uncommitted stride-2
  side-probe for the faint-sink boundary — an accepted convention, not
  tooling friction; no PAPERCUTS.md change).

---
## 208 — Bounded worker (S7 slice N-4 rung (b)): Onix's ROCK_SLIDE vs. PIDGEOTTO landed in full — turn 6 resolved END TO END — `turn6-rockslide-a.json` **255/255**, `turn6-rockslide-b.json` **105/105**, both 0 diff, first-attempt on the mechanics half; a pure parameterization, no new HP-drain formula needed after all (S7 bounded worker session, hard 60-minute cap)

- **State:** `npm test` **837/837** (+6), `npm run build` green, tree
  clean. `turn6-rockslide-{a,b}.json` 0 diff (7765-8124 contiguous).
  Zero regressions: `turn6-statfall.json` 127/127, `turn6-feathers.json`
  106/106, `turn6-featherdance.json` 90/90, `turn6-menu.json` 33/33,
  `turn5-rockslide.json` 256/256, `turn3-rockslide.json` 256/256,
  `turn1-rockslide.json` 256/256.
- **Did:** rung (a) first — fresh dense oracle capture of the full
  7765-8124 window (360 frames), which RESOLVED §30's own flagged
  "8039-8114 uncaptured gap": it's not a second unmodeled mechanism, it's
  the flat hold of "It's super effective!" (ROCK-vs-FLYING), whose own
  message-box swap starts at 8018, 21 ticks earlier than §30's gap
  boundary. Rung (b): every existing ROCK_SLIDE mechanism (rocks/shake/
  hit-flash/drain) reused UNCHANGED behind a synthetic press anchor
  (`TURN6_ROCKSLIDE_PRESS_TICK=7372`) that reproduces the fresh capture's
  own transition ticks exactly by hand-arithmetic before any code was
  written. The brief's flagged "fresh HP-drain pixel formula" turned out
  to be unnecessary — `calcBarFilledPixels` was already maxHp-agnostic
  and `rockSlideOpponentHp` was already value-agnostic; Pidgeotto's own
  156-max bar just needed `pidgeottoHealthboxContentForHp(hp)`, a direct
  copy of the existing per-HP memoization. New: "It's super effective!"
  text (curly-apostrophe fix caught by `npm run compare`'s 14px diff),
  and the turn-end settled-menu function (a missing base-background paint
  caught by a 47%-diff `npm run compare` failure, despite looking correct
  in a side-by-side PNG glance — fixed immediately).
- **Next:** turn 7 as a parameterization of turn 6's own mechanisms
  (turn7-notes.md's dossier already exists), or turns 8-13; scout
  territory: turn 17+ (Murkrow faints 22418 → the WIN arc, per §16);
  ISSUES #26 probe; feather residual 7421-7549 (§29's named leads, still
  open, low priority).
- **Notes:** no papercuts. `npm run compare`'s pixel-diff caught both real
  bugs immediately and precisely (apostrophe glyph, missing bg paint) —
  hand-verifying the mechanism-reuse arithmetic BEFORE writing render code
  (per §30's own mandate, extended to pixels not just RAM) meant the
  mechanics half (255 frames) passed compare on the very first attempt.

---
## 207 — Worktree scout (supervisor-folded): turn 16 ground truth BANKED — the first MAGBY-vs-MURKROW turn: speed order pinned (MURKROW 97 > MAGBY 89, acts first), FAINT_ATTACK skips accuracy entirely (source: `.accuracy=0`), FIRE_PUNCH rolls accuracy even at 100% AND **its 10% burn proc SUCCEEDS** (`status1` 0→16 at tick 21411, burn residual `floor(142/8)=17` at turn-end) — **the run's FIRST status-condition ground truth**, BRN badge PNG-pinned (absent 21540 → present 21548); `battle1-turn16-dense.json` (256 captures) + `docs/turn16-notes.md`; merged, suite 831/831 on the merged tree

- **State:** merged into master post-N-4, `npm test` 831/831 + build
  green post-merge, worktree/branch cleaned. Supervisor re-verified
  independently: prefix chain re-flattened myself (turn15-dense ⊂
  turn16-dense ⊂ winline-b-swap, script-exact), fresh oracle rerun
  reproduced 15/15 cited shas at exact ticks, 3 label PNGs read directly
  (MAGBY's first-ever FIGHT submenu — FIRE PUNCH/SMOKESCREEN/CONFUSE
  RAY/SMOG, PP 15/15, TYPE/FIRE — and the BRN absent→present pair).
  ISSUES #16 trimmed at this fold: ground truth exists now; the engine's
  own status-icon compositor path is the open remainder.
- **Did:** 8 Random() calls in 20745-21773 (crit+dmg for FAINT_ATTACK —
  no accuracy roll; acc+crit+dmg+burn for FIRE_PUNCH; 1 unattributed
  mid-turn at 21152 — FLAME_BODY hypothesis RULED OUT by source,
  FAINT_ATTACK has no contact flag in this ROM; 2-step tail cluster
  21719/21724 matching the "AI-prescoring" shape, first time seen
  mid-battle). Damage: 59 (MAGBY 138→79), 67 (MURKROW 142→75), burn 17
  (75→58). Both new move animations sketched coarse-only (open items).
- **Next:** main lane — N-4 rung (b), Onix's ROCK_SLIDE vs Pidgeotto
  (§30's sha-sweep handoff); scout — turn 17 (§16's "turn 2": Murkrow
  faints 22418 → the WIN sequence); then ISSUES #26 probe, feather
  residual 7421-7549, turns 7-13 parameterizations.
- **Notes:** scout in contract (15.7 of 40 min); no papercuts; its
  proposed "close #16" was corrected to a trim at the fold (ground truth
  ≠ engine validation).

---
