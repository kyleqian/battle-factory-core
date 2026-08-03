# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 892 — [supervisor wind-down, 2026-08-03 ~12:40] #70 CLOSED + dossier CLOSED + #71 hookup slices A/B/C landed + typeref slice 1; animation fold; final union green

- **State:** master `3a1e1d8b` = supervisor fold of animation-main
  `32415c02` (18 commits: back-family send-out reducers begin —
  `backSendOutAnim.ts`, 5 families with twice-fresh evidence — plus shrink-
  grow/spring/vibrate/slide docs) onto `98b2287a`. Final independent full
  `npm test`: **659 files / 6,557 passed / 1 skipped**, `npm run build` green
  (the session's ONE supervisor full-suite run per today's new
  judicious-suite directive). DEFERRED.md: no entries. Play-preview rebuilt
  at `3a1e1d8b`, serving :5199.
- **Session (8 workers: 5 main + 3 side, 0 lost, ~4h):**
  1. **ISSUES #70 CLOSED** (was: 47-id presentation-string sweep debt).
     Batch 3 final 12 ids (`8489ca18`), then the INTROSENDOUT extractor gap:
     side-banked hand-mapped intro table `battleIntroStrings.ts` ids 0/1/2/5
     (`a76bb338`) wired into `messageLines` (`49b8c323`) with new
     `introBattler`/`introHpScale`/`introOutcome` event fields. Every
     STRINGID the engine can print now resolves; the crash class from the
     2026-08-02 user playtest is fully retired.
  2. **Species-dossier program CLOSED** (7/7): capstone slice 4 via side
     lane (`90e5a2b2`), differential 144/144.
  3. **Typeref slice 1 landed** (`7ca03a17`, 72 of 144 refs cut,
     differential 7,466/7,466); slice 2 honestly blocked — real shape is
     bigger than the design doc row (9+ Family-R call sites + an HP-overlay
     turn-1 exclusion nuance), documented in ISSUES #39 for re-scoping.
  4. **User directives adopted mid-session:** (a) judicious full-suite
     cadence (SUPERVISOR.md verify step updated; memory banked); (b) #71
     send-out hookup = MAIN lane's job, reprioritized ahead of remaining
     typeref slices (ISSUES #71 sequencing updated; memory banked).
  5. **ISSUES #71 hookup begun — Slices A+B+C landed** on the banked scout
     doc `docs/send-out-live-wiring-consumer-map.md` (`9c6de475`):
     front terminal rest offsets wired at all 5 live settle hooks with the
     real fieldView species threaded (`2ef1c9d8`), RAM-probe-confirmed vs
     the ROM incl. a RATTATA positive case (`32af4030`, `0dce7d73` tests);
     back-side hand-fits documented + loud-guarded, KABUTO 4th hand-fit
     included (`e5bd18dd`). Supervisor-verified scout finding: only
     ONIX+RATTATA of 386 species have nonzero terminal offsets.
  6. **Real latent bug found (NOT yet fixed, next session's top pick):**
     `drawGeneratedPlayerMaterialize` applies ONIX-only offset/tint tables
     to ANY player species on the generated route — reachable today
     (KADABRA lead in `factoryBattleStartIntro.test.ts` at elapsed
     710/714). Details + candidate fix in ISSUES #71. The fold's new
     back-family reducers (`backSendOutAnim.ts`) may supersede the
     candidate fix — re-check that surface before briefing (the scout doc's
     "back surface absent" §3 is now stale).
- **Next (ordered):** (1) the generated-route ONIX-back latent bug;
  (2) #71 remaining: §1e 56-site patch retirement, Slice D + per-tick
  playback (gated on animation-lane rung-3 dispatcher — cross-lane ask in
  ISSUES #71; back reducers now partially banked); (3) typeref slice-2
  re-scope + slices 3/4a/4b/5 (behind #71 per user directive).
- **Notes:** harness repo got a NOTES.md commit (`8850261`, anti-cheat/
  server-stepped-simulation summary, user request) — the oracle freshness
  checker will now flag services older than harness HEAD; it is the KNOWN
  docs-only false positive, no restart needed. animation-main folded at
  `32415c02`; the animation supervisor was still live at fold (same 14:13
  deadline) — any commits it lands after `32415c02` are next session's
  boring fold. PAPERCUTS: +1 new entry (mechanicLab send-out probes inert
  under battle-scene-off). Ledger repair: entry 887 was appended out of
  order by its worker; reordered in `4fe0e206`.
---
## 891 — [bounded MAIN worker, 2026-08-03] ISSUES #71 Slice C LANDED — back-side hand-fit consumers documented + loud-guarded; one real latent bug found, NOT fixed (reported)

- **State:** master `e5bd18dd`. Full `npm test`: **649 files / 6,495 passed /
  1 skipped**. `npm run build` green (tsc -b + vite).
  `compare:differential -- battle-command-generated-off.json --base
  b7dbbe01 --summary`: **PASS — 128/128 byte-identical**.
  `tests/executableFrontierRatchet.test.ts` green, untouched, no barrier
  changes.
- **Did:** `docs/send-out-live-wiring-consumer-map.md` §5 Slice C — no
  dispatcher exists yet (animation lane's rung 3/4), so nothing is deleted
  or retired. At each of the 3 back-side consumer sites, added a code
  comment naming the exact species(+nature) the hand-fit is valid for
  (citing the doc) plus a throw-guard matching the existing §1e pattern:
  `drawPlayerMaterializeSettle` (ONIX back, legacy) guards on `encounter`
  (destin/jenson only — neither it nor its 2 callers carry a species
  value); `drawKabutoHSlideWobble` (KABUTO front, §2's uncatalogued 4th
  hand-fit — treated the same way since it's equally guardable) guards on
  `encounter` too, jenson-only; `drawTurn15ForcedSwitchRelease` (MAGBY
  back, forced-switch) guards on a real `species` param — all 4 current
  call sites already resolve "MAGBY" (3 fixed Turn-15 content, the 4th
  generated-route caller already gated on `view.field.player.name ===
  "MAGBY"`). All three were module-private; exported (Slice A precedent)
  for direct testability.
- **Tests:** 3 new Tier-1 cases in `tests/battleScene.test.ts`, one per
  guard — valid input draws unchanged (repeat calls / both valid encounters
  byte-identical), invalid input throws the named error.
- **Real latent bug found, NOT fixed (per the step's explicit STOP
  instruction):** `drawGeneratedPlayerMaterialize` (ONIX back, **generated**
  route, §1b) applies the same ONIX-only `playerMaterializeSettleY2`/
  `TintCoeff` tables regardless of the real per-round player species —
  confirmed this is reachable **today**, not just hypothetically: the
  already-green `factoryBattleStartIntro.test.ts` "renders every lifecycle
  phase..." case drives a KADABRA-led player party through this exact
  branch at elapsed 710/714. A naive throw guard there would crash that
  passing test. Left documented in place (comment citing this finding),
  deliberately un-guarded — guarding without fixing the underlying
  wrong-table application would only convert a silent bug into a crash on
  ordinary generated-round play. **Needs a real decision/fix, not a guard**
  — candidate: thread `art.speciesSymbol` and skip/zero the ONIX-only
  offsets for non-ONIX species until a real per-species back hand-fit
  exists (mirrors how the already-generic sibling call site at
  `battleScene.ts:34450` handles this via its `canonicalIncoming` check).
- **Next:** ISSUES #71 remaining: fix the `drawGeneratedPlayerMaterialize`
  latent bug above (new, not previously tracked); Slice D (per-tick front
  playback, gated on animation lane's rung-3 dispatcher); §1e's 56/58
  move-window patch-site retirement. Cross-lane dispatcher ask stays open.
- **Notes:** no PAPERCUT this step beyond the reachability analysis time
  itself (worth it — it caught a real bug before a guard would have shipped
  a crash).

---
## 890 — [bounded MAIN worker, 2026-08-03] ISSUES #71 Slices A+B LANDED — front terminal offsets wired at the 5 real settle hooks, RAM-confirmed

- **State:** master `32af4030`. Full `npm test`: **649 files / 6,492 passed /
  1 skipped** (+4 from this step's new suite). `npm run build` green (tsc -b
  + vite). `compare:differential -- battle-command-generated-off.json --base
  30afb56d --summary`: **PASS — 128/128 byte-identical**.
  `tests/executableFrontierRatchet.test.ts` green, untouched, no new
  recording imports, no barrier-count changes.
- **Did:** `docs/send-out-live-wiring-consumer-map.md` §5 Slice A (+ Slice
  B's species-threading acceptance) — wired `speciesFrontIdleRestOffset`
  (already-banked front-family dispatcher, `src/animation/speciesIdleAnim.ts`)
  at the 5 real live settle hooks in `battleScene.ts` (6 call sites):
  `drawGrovyleSettled`, `drawKabutoHSlideWobble`'s settle branch,
  `drawGeneratedOpponentRelease`'s `coeff===0` branch + its duplicate in
  `renderGeneratedBattleStartPlayerRelease`, `drawTurn5PidgeottoSettled`,
  `drawTurn13MurkrowSettled` — offset added directly to each draw's origin
  x/y, reusing the `:1105` import. The generated-route pair (item 3) already
  threaded the real `fieldView.fieldArt.opponent.speciesSymbol` used for
  sprite art/elevation at that exact call site, so Slice B's guard (no
  literal/shared-default species) was satisfied as written, not a separate
  fix. Exported `drawGeneratedOpponentRelease` (was module-private) so it's
  directly unit-testable.
- **Tests:** 4 new Tier-1 cases in `tests/battleScene.test.ts` — GROVYLE and
  MURKROW settled-sprite no-op pins (offset `{0,0}`, via the existing
  `pixelAtSentOut`/turn13-confirm render idioms — no visible change, proving
  the wiring is inert where expected); RATTATA positive case (staged
  `fieldView`, no existing idiom reaches the generated-route settle) —
  settles at `x2=+1` vs. an independently-blitted un-offset reference frame;
  BULBASAUR staged-`fieldView` companion guarding Slice B (settles at the
  plain origin, not a shared/literal default).
- **Oracle acceptance (program doc §7 bar):** extended
  `tools/probe/dump-onix-front-idle-anim.py`'s `SYMBOLS` table
  (`Anim_VerticalStretch`, `Anim_HorizontalSlideWobble`; `nm` addresses on
  the reference ELF). Three new minimal `battle-scene-on` mechanicLab
  scenarios (`tools/battle-lab/send-out-front-idle-{grovyle,pidgeotto,
  rattata}.json`) RAM-probed `gBattlerSpriteIds[1]` at the settled tick:
  GROVYLE `x2=0,y2=0`, PIDGEOTTO `x2=0,y2=0` (same `animNum`/`animCmdIndex`
  as GROVYLE — the §7 sibling-pair spot-check for shared `V_STRETCH`),
  RATTATA `x2=1,y2=0` (the mandatory positive case) — all three match
  `speciesFrontIdleRestOffset`'s output exactly. **Gotcha found along the
  way:** a `battle-scene-off`-profile mechanicLab scenario never dispatches
  the front idle-anim task at all (flat `SpriteCallbackDummy`/`x2=0`/
  `animNum=0` from tick 0) — only `battle-scene-on` fast-forwards through
  the real intro, matching the prior ONIX fixture's own profile, not this
  lane's default oracle. Re-ran the §4 dense-window list twice fresh
  (`battle2-kabuto-sendout-dense` 151/151, `battle2-player-sendout-dense`
  170/170, `sendout` 255/256, `battle2-jenson-sendout-text` 39/39,
  `factory-arbitrary-intro-yoshi-off` 700/751,
  `factory-arbitrary-intro-magneton-off` 703/751) — identical both runs and
  matching each window's own pre-existing accepted baseline exactly (zero
  new diffs; ONIX/RATTATA appear in none of these committed windows, per
  §3's empirical finding).
- **Next:** ISSUES #71 remaining scope: Slices C/D (ONIX-back/MAGBY-back
  hand-fit consumer guards; per-tick front playback) + the §1e 56/58
  move-window patch-site retirement — all still queued, cross-lane ask for
  the animation lane's rung-3 dispatcher stays open (see ISSUES.md #71).
  Typeref retirement slice 2 remainder (Family P+Q turn1-4 fold, see entry
  889 below) is the next queued item after that.
- **Notes:** no PAPERCUT beyond ordinary research time; the `battle-scene-
  off`-vs-`battle-scene-on` mechanicLab fast-forward gotcha above cost
  ~10min to root-cause and is worth remembering for any future front/back
  send-out probe in this codebase.

---
