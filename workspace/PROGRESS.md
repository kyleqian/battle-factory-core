# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-10 (day) — S10A: ISSUES #159 fixed, 12 production folds, 3 live audits; live share 0..999 91.89 -> 93.79 % of commands (95.82 -> 97.37 % of frames); 239 + 13 + 24

- **State:** local master, production src `4c4fe4c7` (`bf082c6e1`). Census `239+13+24+0+0=276` (no adapter-count change: today widened
  histories and fixed live claims). Supervisor FINAL gates on that code: typecheck, full suite 1,614 files / 13,258 tests, build,
  differential 624 / 624 vs `b50c4dabd` (session start), census seeds 0..299 97.98 % / 98.40 % (start 96.98 / 97.99), seeds 0..999
  **93.79 % of move-animation commands / 97.37 % of frames live** (start 91.89 / 95.82; two runs byte-identical), seeds 50000.. 95.20 / 97.18
  (start 93.07 / 95.47); gameplay command key sequence + battle digest identical at every fold; soak gates: see the follow-up wind-down commit. Preview
  <http://127.0.0.1:5191/> serves the final build (receipt in the follow-up wind-down commit).
- **Did (production, each re-proved by the supervisor from fresh probes / reruns):** hide66 (ISSUES #159: live bodies drew a hidden
  Fly / Bounce / Dig / Dive charger — 90 wrong live commands on 0..999 -> 0) + fly63 re-landed; sw67 (Shock Wave geometry-keyed order plan);
  land68 (Dive words unit + SUBSTITUTE_FADE); fold71 (Magnitude / CASTFORM_CHANGE / Conversion 2 / Needle Arm plans + the kernel's Speed
  Boost animArg1); dive70 (Dive attack body live); ice72 (Ice Ball words unit for any consumer); fix74 (player Light Screen at a hidden
  opponent fails closed); land75 (37 audited net-zero allocator bodies; hidden faint / reshow keep the order host: +154 / +17,256);
  st76 (Dive / Meteor Mash status gates lifted); cf78 (live bodies decline while a Castform is in a weather form — 54 commands honestly
  back to fallback; Needle Arm tie); land79 (Flatter at later bodies); ret80 (Return's order keyed by power level — 123 commands honestly
  back to fallback, see #165).
- **Did (evidence / audits):** plans69, hist73, flat77, doll81 (banked, see Next); live audits 18 (442 windows), 19 (599), 20 (436) —
  each found real issues (Light Screen hidden-phase, Castform weather form, Needle Arm tie, Return plan) that were fixed the same day.
- **Decisions (reversible, in scope):** failing closed instead of shipping known-wrong pixels (Castform weather forms, Return at
  friendship 0, Sky Uppercut / player Light Screen at a hidden battler); Bulk Up's "species defect" refuted by source + 22 ROM windows.
- **Next:** ISSUES #165 FIRST if gameplay changes are in scope for the next run (the ROM Factory has no Return: friendship 0 + Return ->
  Frustration; production keeps Return — a damage / AI / animation divergence, outside S10A's presentation-only mandate). S10A: land the
  banked doll81 (Substitute doll cells) patch; Flatter after a Flatter (words unit) / after Tackle (audit 33); #143 per-form Castform art
  (then lift cf78's decline); post-KO reseed blockers (words-unit order plans); Extrasensory / Memento later bodies; #161 (Dive attack
  age-17 lag); live audit 21 after the next batch.
- **Notes:** no DEFERRED entries. ISSUES: #159 / #160 / #162 / #163 / #164 closed; #161 and #165 new. All worker branches merged,
  worktrees removed; briefs, launcher logs and pruned worker scratch under `.integration/validation/*-20261010/`, transcripts
  `.codex-logs/workers/`.

---

## 2026-10-09 (day) — S10A: histories + live-claim fixes; ordinary-play live share 87.95 -> 91.89 % of commands (92.09 -> 95.82 % of frames); 239 + 13 + 24

- **State:** local master, production src tree `06b791ff` (fly63 REVERTED in `1a0f6e214` after live audit 17 found live bodies drawing the
  hidden Fly / Bounce charger — ISSUES #159). Census `239+13+24+0+0=276` (Light Screen and Sky Attack moved scoped exact -> faithful
  timing by counter-evidenced D4 accounting). Supervisor FINAL gates on the reverted tree: typecheck, full suite 1,597 files / 13,153 tests,
  build, differential 624/624 vs `ccc4774c4`, census seeds 0..299 96.98 % / 97.99 % (start 92.66 / 94.12, 0 regressions). Census seeds 0..999 **91.89 % of move
  animations live by count / 95.82 % by frames** (start 87.95 / 92.09), seeds 50000.. 93.07 / 95.47
  (`final-supervisor-gates-20261009-day.json`). Gameplay command key sequence identical at every fold. Preview <http://127.0.0.1:5191/> serves `897a18dd6` (src `06b791ff`; 4
  samples hash-equal, session export + ON->OFF restart passed, no errors; `playable-preview-897a18dd6-receipt.json`).
- **Did (12 production folds, 11 kept + fly63 reverted; each re-proved by the supervisor from fresh probes / check reruns / census reruns):**
  allocator carries across audited status animations (alloc50, alloc52: SLP / CONFUSION / PSN / PRZ / BRN / FRZ / INFATUATION / CURSED /
  NIGHTMARE + 40 bodies); general / hit / stat animations audited net-zero or fail closed (aud56, #156); order plans Outrage / FOCUS_BAND
  (plans51), Fury Cutter by counter, hail / HAIL_CONTINUES / Blizzard / Water Spout geometry-keyed, Eruption fail-closed (plans54, #155),
  [fly63 Fly / Bounce two-turn plans: REVERTED, #159]; the words-deferred lend replays past faint / send-out / switch units (words57,
  words59: dirt-body species in the marker, trailing RAIN_CONTINUES words); eight moves live at later bodies (later58); D4: Light Screen
  opponent + Blizzard geometry window (lsbz), later-body phase keys + Sky Attack (d4later); Double Team clone phase from the send-out
  animation's data[3] (dt60, #158 — 86 / 214 live Double Teams had been one frame off); Spark opponent side live (spark62).
- **Did (evidence):** prep52 (allocator tail), gates53 (exact case-local census: 77 % was the words lend), live audit 16 (239 windows, no
  species / history defect), prep61 (Dive / Fly / Bounce; the hide toggle never fires with Scene ON), prep64 (SUBSTITUTE_FADE staged:
  the old stagings stalled at a button-wait message) and prep65 (Dive words unit) — both BANKED with supervisor-reproduced receipts; live audit 17 (dt60 prediction == RAM 16 / 16;
  the fly63 DEFECT).
- **Decisions (reversible, in D3 / D4 scope):** kept later58's Sheer Cold / Extrasensory opponent later bodies live while the D4 key was
  added (d4later did it the same session); Sky Attack strike 18 : 18 tie -> tie rule (180 rows); dt60's data[3] table is generated by
  EXECUTING the pret source on the host (source-derived data, not a captured table); Eruption fails closed instead of a geometry model;
  fly63 reverted late (no time for the #159 fix + gates) rather than shipping a known wrong-pixel live claim.
- **Next:** ROADMAP S10A "Next (2026-10-09 evening)": FIRST fix #159 (hide the semi-invulnerable battler in the live view; audit 17's
  patch shape), then re-land fly63 and the banked prep65 (Dive as a words unit, +35 / +5,361) and prep64 (SUBSTITUTE_FADE, +16 / +3,730); then the Dive attack body adapter, Shock Wave reducer timeline, the post-KO reseed, Flatter
  later bodies, #152 / #154 / #157, live audit 18.
- **Notes:** no DEFERRED entries. Soak gates superseded for S10A (ANIMATION_VERIFICATION scoped policy). All worker branches merged,
  worktrees removed; briefs + logs + preserved worker scratch under `.integration/validation/*-20261009b/`, transcripts `.codex-logs/workers/`.

---

## 2026-10-09 (overnight) — S10A: host histories widened; ordinary-play live share 77.7 -> 87.2 % of commands (91.1 % of frames); 241 + 13 + 22

- **State:** local master, production src tree `dde58985` (`c99a40a0a`). Census `241+13+22+0+0=276` (Icy Wind, Blizzard, Confuse
  Ray, Faint Attack moved scoped exact -> faithful timing with counter evidence). Supervisor final gates on that code: typecheck, full suite 1,583 files / 13,039 tests, build, differential 624/624 vs `3fbe30cf7`, census seeds 0..299 92.66 % / 94.12 % (`final-supervisor-gates-20261009.json`).
  Ordinary-play census seeds 0..999 (src `f7cf9a74`, before the last two folds: Faint Attack timing, prep49 +52 / +8,685 on seeds 0..299): **87.23 % of move animations
  live by count, 91.13 % by frames** (session start 77.68 / 78.76), faithful-random history 1.54 % / 1.81 %; seeds 50000..: 88.38
  / 90.47; gameplay command sequence and battle digest identical at every fold. Preview <http://127.0.0.1:5191/> serves `96aaaebbe` (4 samples hash-equal, session export + ON->OFF restart, no errors; `playable-preview-96aaaebbe-receipt.json`).
- **Did (11 production folds, each re-proved by the supervisor from fresh probes / census reruns):** allocator NET-ZERO ids
  (prep44); order plans (prep45: BRN, TURN_TRAP by wrapped move, heals, Hydro Pump, Solar Beam by turn, ...; plans48: FRZ,
  NIGHTMARE, Knock Off item, Ice Punch, Attract, Present, Razor Wind, ...); GEOMETRY-KEYED order from the renderers' timelines
  (Giga / Mega Drain, Dream Eater); Icy Wind / Blizzard at any species geometry; retained locked-action prompt cycle + battle-start
  seeds + opponent recall (prep47); deferred lend after Random2-words units + RAIN_CONTINUES sub-stream with per-command
  faithful-random-history accounting (prep46); Dig / Return later bodies (prep48); Baton Pass / AI switch summary / double-KO reshow (prep49); D4 accounting (d4tails, fa185).
- **Did (evidence):** prep45 / prep46 / prep47 / prep48 / prep49 (landed the same session) / prep50 (status-animation allocator net-zero, banked); live audit 15 (142 chain windows: no species / history defect;
  Light Screen opponent row-59 CPU phase filed in ISSUES #152).
- **Decisions (reversible, in D3 / D4 scope):** RAIN_CONTINUES words are a non-consuming per-event read (no policy bump; the
  80-draw step shortfall is documented in docs/presentation-rng.md); a consumer whose order comes through a words marker counts as
  faithful random per command; Faint Attack renders the dominant phase per attacker side.
- **Next:** ROADMAP S10A "Next (2026-10-09 morning)" — land prep50 first (banked: status-animation allocator net-zero, +55 / +6,302), then the remaining order-host stops,
  FRZ / status2 allocator units, case-local gates (Blizzard impact age), x2-tracker rows, ISSUES #152 remainder.
- **Notes:** no DEFERRED entries. Soak gates superseded for S10A (ANIMATION_VERIFICATION scoped policy). All worker branches
  merged, worktrees removed; briefs + logs under `.integration/validation/*-20261009/`, worker transcripts `.codex-logs/workers/`.
